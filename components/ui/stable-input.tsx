"use client"

// Controlled text input that owns its visible value. Saves to the
// parent store on blur only — no debounce, no keystroke-level writes.

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

    // Sync from parent when not focused
    const prev = useRef(value)
    if (value !== prev.current) {
      prev.current = value
      if (!focusedRef.current) setLocal(value)
    }

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
          onBlur?.(e)
          if (local !== value) onChange(local)
        }}
        onChange={(e) => setLocal(e.target.value)}
        {...rest}
      />
    )
  },
)
