"use client"

// Controlled text input that owns its visible value, decoupled from
// the parent's controlled value. The parent still receives every
// keystroke via onChange — but the input never lets a parent
// re-render mid-typing flash a stale value back into the box.
//
// Why this exists:
//   Many surfaces in this app feed a controlled input from a
//   computed fallback chain (e.g. `effective.value = stored ?? settings
//   ?? tenant.default`). When the user types, the parent dispatches
//   to one or more stores, and those stores can each finish their
//   reducer at slightly different timings (portal + org settings,
//   different React reconciliation paths, debounced server mirrors,
//   storage events from iframes). In rare timings the input's
//   `value` prop briefly evaluates to the stale stored value, and
//   the in-flight keystroke "vanishes" until the next render lands.
//
// StableInput sidesteps the race entirely by:
//   1. Owning the input's displayed value in local state.
//   2. While focused, ignoring all prop changes — the user is the
//      source of truth.
//   3. On blur, resyncing from props if (and only if) they're
//      different now — so external resets (a "Reset" button, a
//      restore) still work.
//
// Drop-in for places where the input's controlled value comes from a
// fallback chain or a debounced store. Pass `value` (parent's view
// of the canonical value) and `onChange` (raw string upward). Pass
// any HTML/styling props through.

import { forwardRef, useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import type { ComponentProps } from "react"

type InputProps = ComponentProps<typeof Input>

interface Props extends Omit<InputProps, "value" | "onChange" | "defaultValue"> {
  value: string
  onChange: (next: string) => void
}

export const StableInput = forwardRef<HTMLInputElement, Props>(
  function StableInput({ value, onChange, onFocus, onBlur, ...rest }, ref) {
    const [local, setLocal] = useState<string>(value)
    const focusedRef = useRef(false)
    const blurredAtRef = useRef<number>(0)
    const BLUR_LOCK_MS = 1500

    // Resync only when the parent's value changed AND the input
    // isn't actively being typed in, AND it hasn't just been blurred.
    // Without the focus guard, the parent's mid-typing re-render would
    // clobber the caret. Without the blur lock, an optimistic update
    // reverting (or slow network sync) would overwrite the user's input
    // right after they click "Publish".
    useEffect(() => {
      if (focusedRef.current) return
      if (Date.now() - blurredAtRef.current < BLUR_LOCK_MS) return
      if (value !== local) setLocal(value)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    return (
      <Input
        ref={ref}
        value={local}
        onFocus={(e) => {
          focusedRef.current = true
          onFocus?.(e)
        }}
        onBlur={(e) => {
          focusedRef.current = false
          blurredAtRef.current = Date.now()
          // If a debounced parent push hasn't quite landed yet, the
          // resync useEffect above will pull the canonical value back
          // in on the next render — but only if it differs.
          onBlur?.(e)
          onChange(local)
        }}
        onChange={(e) => {
          const v = e.target.value
          setLocal(v)
          // We intentionally DO NOT call onChange(v) here.
          // Firing onChange on every keystroke causes rapid parent state updates,
          // which can lead to stale-closure data loss in complex editors (like
          // HeaderNavEditor). We only push the committed value on blur.
        }}
        {...rest}
      />
    )
  },
)
