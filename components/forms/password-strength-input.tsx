"use client"

// Password input + zxcvbn-backed strength meter.
//
// Wraps the standard <Input type=password> with a live strength score
// (0-4, Dropbox's zxcvbn) and surface-level feedback. Enforces a
// minimum acceptable score — defaults to 3 ("good — reasonably safe
// against unthrottled attacks"). Anything below the minimum disables
// the parent form's submit by exposing `valid` via onChange.
//
// Three properties make this work for both new-password and
// confirm-password flows in the same component:
//   • The visible/typed value is owned by the parent.
//   • `confirmValue` mirrors the new password into a second input
//     when set — same component, no flicker.
//   • `userInputs` lets the call site pass extra context (name,
//     email, brand name) to zxcvbn so passwords that contain the
//     user's own name score lower.
//
// IMPORTANT: zxcvbn is intentionally loaded via dynamic import so
// the ~800 KB dictionary doesn't ship in the first-load JS for
// every page; only the surfaces that mount this component pay the
// cost.

import { useEffect, useId, useMemo, useState } from "react"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export const MIN_PASSWORD_SCORE = 3

export interface PasswordStrengthInputProps {
  value: string
  onChange: (next: string, valid: boolean) => void
  // Optional confirm field. When `confirmValue` is undefined the
  // second input is hidden; pass a state setter to enable the
  // confirm flow. `valid` only goes true when both fields match.
  confirmValue?: string
  onConfirmChange?: (next: string) => void
  // Free-form context that should NOT appear in the password —
  // name, email, brand. Lowers the score when matched.
  userInputs?: string[]
  // Label override.
  label?: string
  // Disabled state (e.g. while submitting).
  disabled?: boolean
  // Min required score. Default is 3 (good).
  minScore?: number
  // Auto-focus the first input.
  autoFocus?: boolean
  // Class hook for the outer wrapper.
  className?: string
}

interface ScoreData {
  score: 0 | 1 | 2 | 3 | 4
  feedback: { warning: string; suggestions: string[] }
}

// Lazy zxcvbn loader. Returns the same module reference on
// subsequent calls so the dictionary parse happens once per tab.
// @types/zxcvbn uses `export =` so the module's default-style
// callable is reached via `.default` on the dynamic-import wrapper
// (or the namespace itself in some bundler outputs); we cast to
// the callable signature directly to side-step the ambient type
// gymnastics.
type ZxcvbnFn = (password: string, userInputs?: string[]) => {
  score: 0 | 1 | 2 | 3 | 4
  feedback: { warning: string; suggestions: string[] }
}
let zxcvbnModulePromise: Promise<ZxcvbnFn> | null = null
function loadZxcvbn(): Promise<ZxcvbnFn> {
  if (!zxcvbnModulePromise) {
    zxcvbnModulePromise = import("zxcvbn").then((m) => {
      const mod = m as unknown as { default?: ZxcvbnFn } & ZxcvbnFn
      return (mod.default ?? mod) as ZxcvbnFn
    })
  }
  return zxcvbnModulePromise
}

const SCORE_LABEL = ["Too weak", "Weak", "Okay", "Good", "Strong"] as const
const SCORE_COLOR = [
  "bg-destructive",
  "bg-destructive/70",
  "bg-amber-500",
  "bg-success/80",
  "bg-success",
] as const

export function PasswordStrengthInput({
  value,
  onChange,
  confirmValue,
  onConfirmChange,
  userInputs = [],
  label = "Password",
  disabled,
  minScore = MIN_PASSWORD_SCORE,
  autoFocus,
  className,
}: PasswordStrengthInputProps) {
  const id = useId()
  const [show, setShow] = useState(false)
  const [score, setScore] = useState<ScoreData | null>(null)

  // Score the password whenever it (or the relevant user context)
  // changes. Debounce-free — zxcvbn runs in a few ms on modern
  // hardware and React batches the resulting state update.
  useEffect(() => {
    if (!value) {
      setScore(null)
      return
    }
    let cancelled = false
    loadZxcvbn().then((zxcvbn) => {
      if (cancelled) return
      const result = zxcvbn(value, userInputs.filter(Boolean).map((s) => s.toLowerCase()))
      setScore({
        score: result.score as 0 | 1 | 2 | 3 | 4,
        feedback: result.feedback,
      })
    })
    return () => {
      cancelled = true
    }
  }, [value, userInputs.join("|")])

  const confirmShown = onConfirmChange !== undefined
  const confirmMismatch =
    confirmShown && !!confirmValue && !!value && confirmValue !== value
  const meetsScore = !!score && score.score >= minScore
  const valid =
    !!value &&
    meetsScore &&
    (!confirmShown || (!!confirmValue && confirmValue === value))

  // Propagate validity outward whenever it could have changed. We
  // re-fire onChange with the same value so the parent always knows
  // the current valid state — without forcing the parent to mirror
  // every internal field into its own state.
  useEffect(() => {
    onChange(value, valid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid])

  const bars = useMemo(() => {
    const filled = score?.score ?? -1
    return [0, 1, 2, 3, 4].map((i) => ({
      filled: i <= filled,
      color: SCORE_COLOR[Math.max(0, filled)],
    }))
  }, [score])

  const warning = score?.feedback.warning
  const suggestion = score?.feedback.suggestions?.[0]

  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input
            id={id}
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value, false)}
            autoFocus={autoFocus}
            autoComplete="new-password"
            disabled={disabled}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Strength meter — five bars; coloured up to the score */}
        <div className="flex items-center gap-1.5">
          {bars.map((b, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition",
                b.filled ? b.color : "bg-muted",
              )}
            />
          ))}
        </div>

        {value && score ? (
          <div className="space-y-1 text-xs">
            <p className={cn("font-medium", meetsScore ? "text-success" : "text-muted-foreground")}>
              {meetsScore ? (
                <>
                  <ShieldCheck className="mr-1 inline h-3 w-3" />
                  {SCORE_LABEL[score.score]} — accepted.
                </>
              ) : (
                <>
                  {SCORE_LABEL[score.score]} — need at least <span className="font-semibold">{SCORE_LABEL[minScore]}</span> to continue.
                </>
              )}
            </p>
            {!meetsScore && warning && (
              <p className="text-destructive">{warning}</p>
            )}
            {!meetsScore && suggestion && (
              <p className="text-muted-foreground">{suggestion}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Use {minScore >= 4 ? "a strong" : "a good"} password — a long random phrase or
            generator output is ideal.
          </p>
        )}
      </div>

      {confirmShown && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-c`}>Confirm password</Label>
          <Input
            id={`${id}-c`}
            type={show ? "text" : "password"}
            value={confirmValue ?? ""}
            onChange={(e) => onConfirmChange!(e.target.value)}
            autoComplete="new-password"
            disabled={disabled}
          />
          {confirmMismatch && (
            <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
          )}
        </div>
      )}
    </div>
  )
}
