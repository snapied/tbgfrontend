"use client"

// Persistent filter/view state synced to URL query params.
//
// Why: list-page filters (search, course, status, view mode) reset
// every time the user navigates away and back — making it feel like
// the tool "forgets" their context. Mirroring state into ?q=&course=…
// makes refresh, back/forward, and link-sharing all preserve the view.
//
// Design notes:
//   • Uses router.replace, not router.push — every keystroke pushed to
//     history would break the back button. replace mutates the current
//     entry in place.
//   • Defaults are NOT written to the URL. If the value equals the
//     default we strip the param so /dashboard/quizzes stays clean
//     unless the user actually changed something.
//   • Reads from useSearchParams on every render so a back/forward
//     navigation (which mutates the URL but doesn't unmount the page)
//     re-syncs the local state. This is the bit a naive
//     `useState(initialFromUrl)` pattern misses.
//   • Multiple useUrlState calls on the same page coalesce: each
//     update reads the current params, swaps just its key, and writes
//     the full string back. No batching needed for our cardinality.

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type Serializable = string | number | boolean

interface Options<T extends Serializable> {
  /** Default value. When state === defaultValue, the param is removed
   *  from the URL so the URL stays clean. */
  defaultValue: T
  /** Optional parser. Defaults: string passthrough; number via Number;
   *  boolean via "true"/"1". */
  parse?: (raw: string) => T
  /** Optional serializer. Defaults to String(value). */
  serialize?: (value: T) => string
}

function defaultParse<T extends Serializable>(raw: string, fallback: T): T {
  if (typeof fallback === "number") {
    const n = Number(raw)
    return (Number.isFinite(n) ? n : fallback) as T
  }
  if (typeof fallback === "boolean") {
    return ((raw === "true" || raw === "1") as unknown) as T
  }
  return raw as T
}

export function useUrlState<T extends Serializable>(
  key: string,
  opts: Options<T>,
): [T, (next: T) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  // Local state mirrors the URL so React renders are cheap (we don't
  // want every component reading useSearchParams every tick). Initial
  // read happens lazily — same param value across SSR + first client
  // render avoids hydration mismatch.
  const readFromUrl = useCallback((): T => {
    const raw = params.get(key)
    if (raw === null) return opts.defaultValue
    try {
      return opts.parse ? opts.parse(raw) : defaultParse(raw, opts.defaultValue)
    } catch {
      return opts.defaultValue
    }
    // We intentionally exclude opts from deps — callers usually pass
    // an inline object that would change identity each render. The
    // key/params pair is what matters for correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, key])

  const [value, setValue] = useState<T>(readFromUrl)

  // Re-sync from URL when params change (back/forward navigation, or
  // another useUrlState on the same page writing concurrently).
  useEffect(() => {
    const next = readFromUrl()
    setValue((prev) => (Object.is(prev, next) ? prev : next))
  }, [readFromUrl])

  const update = useCallback(
    (next: T) => {
      setValue(next)
      // Build the new query string from the latest params snapshot.
      const usp = new URLSearchParams(params.toString())
      const serialized = opts.serialize ? opts.serialize(next) : String(next)
      const isDefault = Object.is(next, opts.defaultValue)
      if (isDefault || serialized === "") {
        usp.delete(key)
      } else {
        usp.set(key, serialized)
      }
      const qs = usp.toString()
      // router.replace, not push — typing in a search box shouldn't
      // bloat the history stack. `scroll: false` keeps the page from
      // jumping to the top on every keystroke.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    // Same rationale as readFromUrl: opts identity is unstable on
    // purpose; depend on the stable pieces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, key, pathname, router],
  )

  return [value, update]
}
