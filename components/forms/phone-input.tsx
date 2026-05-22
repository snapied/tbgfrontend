"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, MessageCircle, Phone as PhoneIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  DEFAULT_DIAL,
  DIAL_CODES,
  digitsOnly,
  parsePhone,
  type DialCode,
  validatePhone,
} from "@/lib/phone-utils"

interface PhoneInputProps {
  /** Current value, stored as E.164 (`+919876543210`). */
  value: string
  /** Receives E.164 on change, or "" if cleared. */
  onChange: (e164: string, valid: boolean) => void
  placeholder?: string
  required?: boolean
  /** Show the WhatsApp glyph instead of the phone glyph. */
  whatsapp?: boolean
  id?: string
  className?: string
  /** Force display of the validation error even if the user hasn't blurred. */
  forceError?: boolean
}

/**
 * Phone-number field with a dialing-code dropdown next to a national-digits
 * input. Emits a fully E.164 string (e.g. `+919876543210`) plus a `valid`
 * flag so the form can disable Submit without re-implementing the check.
 *
 * Used on signup and Add Student — anywhere we ask for a WhatsApp number.
 */
export function PhoneInput({
  value,
  onChange,
  placeholder = "98765 43210",
  required,
  whatsapp,
  id,
  className,
  forceError,
}: PhoneInputProps) {
  // Initial parse from the inbound value (so an "edit" form reading from
  // storage doesn't lose the code).
  const initial = useMemo(() => parsePhone(value), [value])
  const [code, setCode] = useState<DialCode>(initial.code ?? DEFAULT_DIAL)
  const [national, setNational] = useState<string>(initial.national)
  const [touched, setTouched] = useState(false)

  // Keep internal state in sync if the parent resets the value externally.
  useEffect(() => {
    const next = parsePhone(value)
    if (next.code) setCode(next.code)
    if (next.national !== national) setNational(next.national)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const v = validatePhone(code, national)
  const showError = (touched || forceError) && !v.ok

  // Emit upward whenever either part changes — but only the final E.164.
  useEffect(() => {
    if (v.ok) onChange(v.e164, true)
    else onChange(national ? `${code.code}${national}` : "", false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code.code, national])

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className={cn(
        "flex items-stretch overflow-hidden rounded-md border bg-background",
        showError ? "border-destructive" : "border-input focus-within:ring-2 focus-within:ring-ring/30",
      )}>
        {/* Country code dropdown */}
        <Select value={code.iso} onValueChange={(iso) => setCode(DIAL_CODES.find(c => c.iso === iso) ?? DEFAULT_DIAL)}>
          <SelectTrigger className="h-auto w-[110px] shrink-0 rounded-none border-0 border-r border-border bg-muted/60 text-xs font-mono focus:ring-0">
            <SelectValue>
              <span className="inline-flex items-center gap-1">
                {whatsapp ? <MessageCircle className="h-3 w-3 text-success" /> : <PhoneIcon className="h-3 w-3 text-muted-foreground" />}
                {code.code}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DIAL_CODES.map(c => (
              <SelectItem key={c.iso} value={c.iso}>
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="font-mono">{c.code}</span>
                  <span className="text-muted-foreground">{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* National number input */}
        <Input
          id={id}
          inputMode="tel"
          value={national}
          onChange={(e) => setNational(digitsOnly(e.target.value))}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          aria-required={required}
          className="rounded-none border-0 focus-visible:ring-0"
        />
      </div>
      {showError ? (
        <p className="inline-flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" /> {v.ok ? "" : v.reason}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {whatsapp
            ? "We use this for class reminders and account recovery via WhatsApp."
            : "Used for SMS / calls when something needs your attention."}
        </p>
      )}
    </div>
  )
}
