"use client"

// Tiny event bus for "localStorage write failed" events. Used by every
// store provider that persists state — they wrap setItem in a try/catch
// because private browsing and the ~5 MB quota are real, and they emit
// here when something goes wrong so the UI can surface a toast/banner
// instead of silently dropping the user's data.
//
// Why a bus, not a context: persistence happens inside non-React
// utilities and effects that may run before a provider is mounted. A
// module-scope emitter avoids the chicken-and-egg.

import { useEffect, useState } from "react"

export interface StorageError {
  // Which slice failed. Free-form; lets the UI say "your profile photo
  // didn't save" instead of a generic message.
  slice: string
  // The original error from the catch — usually a DOMException with
  // name=QuotaExceededError on the storage path. May be undefined on
  // platforms (Safari private) that throw differently.
  error?: unknown
  // True when we identified this as a quota / storage-full failure (vs
  // some other persistence problem). Used to show the user a more
  // actionable message ("the file was too big to fit") instead of a
  // generic "something went wrong".
  quotaExceeded: boolean
  // True when the writer caught the failure and managed to persist a
  // reduced version (e.g. stripped data: URLs). The save technically
  // succeeded but with caveats — UI should show a soft warning, not
  // an alarming "save failed" banner.
  recovered: boolean
  at: number
}

type Listener = (err: StorageError) => void

const listeners = new Set<Listener>()

export function isQuotaError(err: unknown): boolean {
  if (!err) return false
  // Browsers throw QuotaExceededError (Chrome, Firefox, Edge) or
  // NS_ERROR_DOM_QUOTA_REACHED (older Firefox). Some Safari versions
  // throw a plain Error with code 22.
  const e = err as { name?: string; code?: number; message?: string }
  if (e.name === "QuotaExceededError") return true
  if (e.name === "NS_ERROR_DOM_QUOTA_REACHED") return true
  if (e.code === 22 || e.code === 1014) return true
  if (typeof e.message === "string" && /quota/i.test(e.message)) return true
  return false
}

export function reportStorageError(
  slice: string,
  err: unknown,
  opts?: { recovered?: boolean },
): void {
  const event: StorageError = {
    slice,
    error: err,
    quotaExceeded: isQuotaError(err),
    recovered: !!opts?.recovered,
    at: Date.now(),
  }
  for (const fn of listeners) {
    try {
      fn(event)
    } catch {
      /* listener bugs shouldn't poison the bus */
    }
  }
}

export function onStorageError(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// React hook — returns the most recent storage error (or null) for a
// given slice prefix. Pass slicePrefix="users" to only see errors that
// involved persisting the users array; omit to see every error.
export function useStorageError(slicePrefix?: string): StorageError | null {
  const [latest, setLatest] = useState<StorageError | null>(null)
  useEffect(() => {
    return onStorageError((e) => {
      if (!slicePrefix || e.slice.startsWith(slicePrefix)) setLatest(e)
    })
  }, [slicePrefix])
  return latest
}

// Safe setItem — write to localStorage; on failure, emit on the bus so
// callers don't need to repeat the try/catch boilerplate. Returns true
// when the write succeeded.
export function safeSetItem(slice: string, key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (err) {
    reportStorageError(slice, err)
    return false
  }
}
