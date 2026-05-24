"use client"

// Password gate shown when a course's visibility is "password" and
// the visitor hasn't yet entered the right code in this session.
// Renders a focused full-page card with the gate form; on a correct
// match we drop a sessionStorage breadcrumb (via rememberPasswordOk)
// and the parent component re-renders with the actual content.
//
// Wrong attempts add a short delay so brute-force is awkward, but
// this is a POC — the password lives plain on the Course row, so
// the real defence is "make a strong password" + the rate limit on
// the wrapping screen.

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Eye, EyeOff, Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { rememberPasswordOk } from "@/lib/course-visibility"

interface Props {
  courseId: string
  courseTitle: string
  /** Plain-text password from the Course row. The component does the
   *  comparison locally; we don't want the caller to leak it into
   *  the DOM beyond this gate. */
  expectedPassword: string
  /** Called after a correct attempt — the host page re-renders. */
  onUnlock: () => void
  /** "Back" affordance, defaults to the catalogue. */
  backHref?: string
}

export function CoursePasswordGate({
  courseId,
  courseTitle,
  expectedPassword,
  onUnlock,
  backHref = "/courses",
}: Props) {
  const [value, setValue] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) {
      setError("Enter the password the instructor shared with you.")
      return
    }
    setBusy(true)
    // Tiny artificial delay — three-attempts-per-second is enough to
    // make casual guessing tedious without being annoying for the
    // legitimate visitor who got the password right first try.
    await new Promise((r) => setTimeout(r, 300))
    setBusy(false)
    if (value.trim() === (expectedPassword ?? "").trim()) {
      rememberPasswordOk(courseId)
      onUnlock()
      return
    }
    setError("That password doesn't match. Double-check the link the instructor sent.")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 py-12">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-serif text-xl font-bold">{courseTitle}</h1>
            <p className="text-sm text-muted-foreground">
              This course is password-protected. Enter the password your instructor shared to continue.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-pw">Course password</Label>
              <div className="relative">
                <Input
                  id="course-pw"
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="Enter the password"
                  autoFocus
                  autoComplete="off"
                  aria-invalid={!!error}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && (
                <p className="text-[11px] text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                "Unlock course"
              )}
            </Button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground">
            Don&apos;t have the password? Contact the instructor for the
            shareable link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
