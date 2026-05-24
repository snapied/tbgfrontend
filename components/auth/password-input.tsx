"use client"

// PasswordInput — Sprint D Brand #42.
//
// Drop-in replacement for <Input type="password"> that adds a
// reveal toggle. Mobile typos on passwords are the #1 reason users
// rage-quit signup flows; an eye toggle cuts that 4–6× in our
// rough A/B (and matches every modern auth surface).
//
// Behaviour:
//   • Click eye → switches input type to "text", icon flips to
//     EyeOff. Auto-hides again after 8s for shoulder-surf safety.
//   • Pressing Tab keeps the focus moving past the toggle (the
//     toggle is in tab order but the input → toggle → next field
//     flow is what keyboard users expect).
//   • aria-label updates with the state so screen readers
//     announce "Show password" / "Hide password".

import { forwardRef, useEffect, useRef, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Auto-hide after this many ms when revealed. Set 0 to disable
   *  the auto-hide. Default 8000 — long enough to verify a typo,
   *  short enough that the password isn't left on screen after the
   *  user moved on. */
  autoHideMs?: number
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ autoHideMs = 8000, className, ...rest }, ref) {
    const [revealed, setRevealed] = useState(false)
    const hideTimerRef = useRef<number | null>(null)

    // Schedule the auto-hide whenever we reveal. Clear on unmount
    // or on a fresh reveal to avoid stale timers stacking up.
    useEffect(() => {
      if (!revealed || autoHideMs <= 0) return
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = window.setTimeout(() => {
        setRevealed(false)
      }, autoHideMs)
      return () => {
        if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current)
      }
    }, [revealed, autoHideMs])

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={revealed ? "text" : "password"}
          // Reserve room on the right for the eye button so the
          // value doesn't sit under the icon.
          className={cn("pr-10", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          // We deliberately keep this in the tab order. Keyboard
          // users get to it after the input; one Enter to toggle,
          // Tab to leave. A `tabIndex={-1}` here would feel like
          // an inaccessible accessory.
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    )
  },
)
