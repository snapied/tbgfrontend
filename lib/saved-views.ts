"use client"

// Saved filter views — Sprint C Brand #15.
//
// Lets a visitor save up to 5 named filter combinations per (tenant,
// surface) so they can return to "Beginner Design under $30" without
// reconfiguring the filters each visit. Anonymous visitors get the
// same primitive — the storage key uses the anon-id the experiments
// + attribution + wishlist hooks already share, so a signup later
// can promote the views into the new account.
//
// Storage shape (per tenant, per surface, per visitor):
//   `thebigclass.t.<slug>.savedViews.<surface>.<visitorId>` →
//     { views: Array<{ id, label, query, createdAt }> }
//
// `query` is opaque — we serialise/deserialise outside the hook, so
// the same primitive powers Courses today, Recordings or Wall later
// without schema changes. Capped at MAX_VIEWS so the list stays
// scannable.

import { useCallback, useEffect, useMemo, useState } from "react"

const ANON_ID_KEY = "thebigclass.experiments.anonId"
const MAX_VIEWS = 5

export interface SavedView {
  id: string
  label: string
  /** Free-form serialized query — typically the search params string,
   *  or a JSON-encoded blob the caller controls. Opaque to this hook. */
  query: string
  createdAt: string
}

interface SavedViewsRecord {
  views: SavedView[]
}

function visitorId(): string {
  if (typeof window === "undefined") return "ssr"
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY)
    if (existing) return existing
    const id = `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(ANON_ID_KEY, id)
    return id
  } catch {
    return "anon-fallback"
  }
}

function storageKey(tenantSlug: string, surface: string, vid: string): string {
  return `thebigclass.t.${tenantSlug || "default"}.savedViews.${surface}.${vid}`
}

function readRecord(key: string): SavedViewsRecord {
  if (typeof window === "undefined") return { views: [] }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { views: [] }
    const parsed = JSON.parse(raw) as Partial<SavedViewsRecord>
    return { views: Array.isArray(parsed.views) ? parsed.views : [] }
  } catch {
    return { views: [] }
  }
}

function writeRecord(key: string, record: SavedViewsRecord): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(record))
    window.dispatchEvent(new CustomEvent("saved-views-changed"))
  } catch {
    /* best-effort */
  }
}

export interface UseSavedViewsApi {
  views: SavedView[]
  /** Save the supplied query under `label`. Returns the new view, or
   *  null when the cap is hit (caller can prompt the user to delete
   *  one before saving another). */
  save: (label: string, query: string) => SavedView | null
  /** Update an existing view's query in place — useful for "update
   *  this view" after the user tweaks an active filter set. */
  update: (id: string, patch: Partial<Pick<SavedView, "label" | "query">>) => void
  /** Remove a view. Idempotent. */
  remove: (id: string) => void
  /** Find the view whose query matches the current one, if any. Used
   *  by callers to highlight the active view in their UI. */
  findByQuery: (query: string) => SavedView | undefined
}

export function useSavedViews(tenantSlug: string, surface: string): UseSavedViewsApi {
  const key = useMemo(
    () => storageKey(tenantSlug, surface, visitorId()),
    [tenantSlug, surface],
  )
  const [record, setRecord] = useState<SavedViewsRecord>({ views: [] })

  useEffect(() => {
    const refresh = () => setRecord(readRecord(key))
    refresh()
    window.addEventListener("saved-views-changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("saved-views-changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [key])

  const save = useCallback(
    (label: string, query: string): SavedView | null => {
      const trimmed = label.trim()
      if (!trimmed) return null
      if (record.views.length >= MAX_VIEWS) return null
      const view: SavedView = {
        id: `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        label: trimmed,
        query,
        createdAt: new Date().toISOString(),
      }
      const next = { views: [view, ...record.views] }
      writeRecord(key, next)
      setRecord(next)
      return view
    },
    [key, record.views],
  )

  const update = useCallback(
    (id: string, patch: Partial<Pick<SavedView, "label" | "query">>) => {
      const next = {
        views: record.views.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      }
      writeRecord(key, next)
      setRecord(next)
    },
    [key, record.views],
  )

  const remove = useCallback(
    (id: string) => {
      const next = { views: record.views.filter((v) => v.id !== id) }
      writeRecord(key, next)
      setRecord(next)
    },
    [key, record.views],
  )

  const findByQuery = useCallback(
    (query: string) => record.views.find((v) => v.query === query),
    [record.views],
  )

  return { views: record.views, save, update, remove, findByQuery }
}

export const MAX_SAVED_VIEWS = MAX_VIEWS
