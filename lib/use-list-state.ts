"use client"

// useListState — composable state hook that bundles the four moves
// every dashboard list page does today, badly, by hand:
//
//   1. fuzzy search over a configurable set of fields
//   2. categorical filters with default-elision (`?status=all` doesn't
//      show up in the URL because it's the default)
//   3. sort by a named comparator
//   4. multi-select with toggle + clear + select-all
//
// The whole thing is URL-backed via `useUrlState` so refresh, back, and
// shareable links Just Work — that's the part each list page kept
// reinventing.
//
// Usage:
//
//   const list = useListState({
//     pageId: "blog-list",
//     items: posts,
//     searchFields: (p) => [p.title, p.excerpt, ...(p.tags ?? [])],
//     filters: {
//       status: {
//         defaultValue: "all",
//         match: (p, v) => v === "all" || p.status === v,
//       },
//     },
//     sorts: {
//       recent: { label: "Newest", cmp: (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt) },
//       title:  { label: "A → Z",  cmp: (a, b) => a.title.localeCompare(b.title) },
//     },
//     defaultSort: "recent",
//     getItemId: (p) => p.id,
//   })
//
//   list.filtered      // T[]
//   list.search        // string
//   list.setSearch
//   list.getFilter("status") / list.setFilter("status", "draft")
//   list.sort          // keyof sorts
//   list.setSort
//   list.selectedIds   // Set<string>
//   list.toggleSelect(id) / list.clearSelection / list.selectAll
//   list.isAllSelected / list.isSomeSelected

import { useCallback, useMemo, useState } from "react"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"

export interface FilterConfig<T, V extends string = string> {
  /** Default value — stripped from the URL when active. Usually `"all"`. */
  defaultValue: V
  /** Predicate that decides whether an item passes this filter at the
   *  current value. Should fast-return true when value is default. */
  match: (item: T, value: V) => boolean
}

export interface SortConfig<T> {
  label: string
  cmp: (a: T, b: T) => number
}

interface Config<T, FilterKeys extends string, SortKeys extends string> {
  /** Stable id used to namespace URL search params. Different list
   *  pages can share the URL by using different `pageId` prefixes. */
  pageId?: string
  items: T[]
  /** How to extract searchable strings from an item. Returns either
   *  one string or an array of strings (e.g. title + tags). */
  searchFields?: (item: T) => string | string[]
  /** Map of filter slot → config. */
  filters?: Record<FilterKeys, FilterConfig<T>>
  /** Map of sort key → config. */
  sorts?: Record<SortKeys, SortConfig<T>>
  /** Initial sort key. Falls back to the first key in `sorts`.
   *  NoInfer keeps `defaultSort` from collapsing SortKeys to the
   *  single literal it holds — without it, TS would narrow SortKeys
   *  to "recent" given `defaultSort: "recent"` and reject every
   *  other key in `sorts` as excess. */
  defaultSort?: NoInfer<SortKeys>
  /** Unique id extractor for selection. */
  getItemId?: (item: T) => string
  /** Whether to thread filter/sort/search state through the URL.
   *  Default `true` for top-level pages; flip to `false` for dialogs. */
  syncUrl?: boolean
}

export interface ListState<T, FilterKeys extends string, SortKeys extends string> {
  // Filtered + sorted view.
  filtered: T[]
  /** Pre-filter count for "X of Y" copy. */
  totalCount: number
  /** Post-filter count. */
  visibleCount: number
  /** True when ANY filter or search is active vs defaults. */
  hasActiveFilters: boolean
  resetFilters: () => void

  // Search.
  search: string
  setSearch: (v: string) => void

  // Filters.
  getFilter: <K extends FilterKeys>(key: K) => string
  setFilter: <K extends FilterKeys>(key: K, value: string) => void
  filterValues: Record<FilterKeys, string>

  // Sort.
  sort: SortKeys
  setSort: (v: SortKeys) => void
  sortOptions: Array<{ key: SortKeys; label: string }>

  // Selection.
  selectedIds: Set<string>
  isSelected: (id: string) => boolean
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  isAllSelected: boolean
  isSomeSelected: boolean
}

export function useListState<
  T,
  FilterKeys extends string = never,
  SortKeys extends string = never,
>({
  pageId,
  items,
  searchFields,
  filters,
  sorts,
  defaultSort,
  getItemId = (i) => (i as unknown as { id: string }).id,
  syncUrl = true,
}: Config<T, FilterKeys, SortKeys>): ListState<T, FilterKeys, SortKeys> {
  // URL-backed slots when syncUrl. The pageId namespaces keys so two
  // useListState instances on the same page don't collide.
  const ns = pageId ? `${pageId}.` : ""

  // Search — URL-backed or local depending on `syncUrl`. Both paths
  // expose identical signatures.
  const urlSearch = useUrlState<string>(syncUrl ? `${ns}q` : "_q_noop", {
    defaultValue: "",
  })
  const localSearch = useState<string>("")
  const [search, setSearch] = syncUrl ? urlSearch : localSearch

  // Filters — single URL slot holding a JSON-encoded `{ key: value }`
  // map. Avoids the Rules-of-Hooks violation of one useUrlState per
  // filter; tradeoff is one re-render per any-filter-change instead
  // of one per affected filter, which is fine since lists are cheap
  // to re-derive.
  const filterKeys = useMemo(
    () => (filters ? (Object.keys(filters) as FilterKeys[]) : []),
    [filters],
  )
  const defaultFilterMap = useMemo(() => {
    const out = {} as Record<string, string>
    for (const k of filterKeys) out[k as string] = filters![k].defaultValue
    return out
  }, [filterKeys, filters])

  const [rawFilterMap, setRawFilterMap] = useUrlState<string>(
    syncUrl ? `${ns}f` : "_filters_noop",
    { defaultValue: "" },
  )
  // Parse on read; bail to defaults on any malformed slot.
  const currentFilterMap = useMemo<Record<string, string>>(() => {
    if (!rawFilterMap) return defaultFilterMap
    try {
      const parsed = JSON.parse(rawFilterMap) as Record<string, string>
      return { ...defaultFilterMap, ...parsed }
    } catch {
      return defaultFilterMap
    }
  }, [rawFilterMap, defaultFilterMap])

  const updateFilterMap = useCallback(
    (next: Record<string, string>) => {
      // Strip default-valued keys before serialising so a "no
      // filters" state encodes as an empty string in the URL.
      const trimmed: Record<string, string> = {}
      for (const [k, v] of Object.entries(next)) {
        if (v !== defaultFilterMap[k]) trimmed[k] = v
      }
      const enc = Object.keys(trimmed).length === 0 ? "" : JSON.stringify(trimmed)
      setRawFilterMap(enc)
    },
    [defaultFilterMap, setRawFilterMap],
  )

  // Sort.
  const sortKeys = useMemo(
    () => (sorts ? (Object.keys(sorts) as SortKeys[]) : []),
    [sorts],
  )
  const firstSort = (defaultSort ?? sortKeys[0]) as SortKeys
  const [sort, setSort] = useUrlState<string>(syncUrl ? `${ns}sort` : "_sort_noop", {
    defaultValue: firstSort,
  })

  // Selection — always local; URL-backing wouldn't survive navigation
  // anyway and we don't want refresh to repopulate.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ───── Derived view ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let out = items

    // Filters first (cheapest, narrows the search input set).
    if (filters) {
      for (const k of filterKeys) {
        const v = currentFilterMap[k as string]
        const cfg = filters[k]
        if (v === cfg.defaultValue) continue
        out = out.filter((i) => cfg.match(i, v))
      }
    }

    // Fuzzy search.
    if (search.trim() && searchFields) {
      out = fuzzySearch(out, search, (item) => {
        const r = searchFields(item)
        return Array.isArray(r) ? r : [r]
      })
    }

    // Sort. fuzzySearch already returns ranked-by-relevance when a
    // search is active, so we only re-sort when there's no search.
    if (sorts && (!search.trim() || !searchFields)) {
      const cfg = sorts[sort as SortKeys]
      if (cfg) out = [...out].sort(cfg.cmp)
    }

    return out
  }, [items, search, searchFields, sorts, sort, filters, filterKeys, currentFilterMap])

  // ───── Helpers ────────────────────────────────────────────────────
  const filterValues = useMemo(() => {
    const out = {} as Record<FilterKeys, string>
    for (const k of filterKeys) out[k] = currentFilterMap[k as string]
    return out
  }, [filterKeys, currentFilterMap])

  const hasActiveFilters = useMemo(() => {
    if (search.trim()) return true
    if (!filters) return false
    return filterKeys.some((k) => currentFilterMap[k as string] !== filters[k].defaultValue)
  }, [search, filters, filterKeys, currentFilterMap])

  const resetFilters = useCallback(() => {
    setSearch("")
    updateFilterMap(defaultFilterMap)
  }, [setSearch, updateFilterMap, defaultFilterMap])

  const getFilter = useCallback(
    <K extends FilterKeys>(key: K): string => {
      return currentFilterMap[key as string] ?? filters?.[key].defaultValue ?? ""
    },
    [currentFilterMap, filters],
  )
  const setFilter = useCallback(
    <K extends FilterKeys>(key: K, value: string) => {
      updateFilterMap({ ...currentFilterMap, [key as string]: value })
    },
    [updateFilterMap, currentFilterMap],
  )

  // Selection actions.
  const toggleSelect = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [],
  )
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((i) => getItemId(i))))
  }, [filtered, getItemId])
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const isAllSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(getItemId(i)))
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected

  const sortOptions = useMemo(
    () =>
      sorts
        ? (Object.entries(sorts) as Array<[SortKeys, SortConfig<T>]>).map(([k, v]) => ({
            key: k,
            label: v.label,
          }))
        : [],
    [sorts],
  )

  return {
    filtered,
    totalCount: items.length,
    visibleCount: filtered.length,
    hasActiveFilters,
    resetFilters,
    search,
    setSearch,
    getFilter,
    setFilter,
    filterValues,
    sort: sort as SortKeys,
    setSort: setSort as (v: SortKeys) => void,
    sortOptions,
    selectedIds,
    isSelected: (id: string) => selectedIds.has(id),
    toggleSelect,
    selectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  }
}
