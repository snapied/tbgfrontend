"use client"

// Hook that warns the user before they leave a page with unsaved work.
//
// Two channels:
//   1. Browser navigation (refresh, close tab, type new URL) — handled by
//      a `beforeunload` listener. Modern browsers show a generic prompt;
//      the custom message argument is ignored, but setting returnValue
//      is enough to trigger the dialog.
//   2. In-app navigation (your own "Back" / "Cancel" buttons, Link clicks
//      you control) — call the returned `confirmLeave()` helper before
//      calling router.push / router.back. It pops a native confirm() so
//      we don't depend on a modal system, and returns true if the user
//      chose to leave.
//
// Set `when` to false (e.g. when the form is clean or has just been
// saved) to disable both channels — the listener is detached and
// confirmLeave returns true unconditionally.

import { useCallback, useEffect } from "react"

const DEFAULT_MESSAGE =
  "You have unsaved changes. Are you sure you want to leave? Your changes will be lost."

export function useUnsavedChangesGuard(when: boolean, message: string = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!when) return
    const handler = (e: BeforeUnloadEvent) => {
      // Both required for cross-browser support (Chrome ignores returnValue
      // assignment without preventDefault; Safari needs returnValue set).
      e.preventDefault()
      e.returnValue = message
      return message
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [when, message])

  const confirmLeave = useCallback((): boolean => {
    if (!when) return true
    return window.confirm(message)
  }, [when, message])

  return { confirmLeave }
}
