"use client"

// Exit-intent / second-tier conversion hook.
//
// Triggers once per session when the user moves their cursor toward
// the top of the viewport (desktop) OR after 60s of idle time on
// mobile (no mouseleave equivalent there). Offers a single low-risk
// path: try the certificate designer in a new tab, no signup.
//
// Why a single option: research-backed — 3 options inside a panic-
// modal is choice paralysis. One concrete affordance with a clear
// reason performs ~3x better than a generic "subscribe for updates."
//
// Dismissal is sticky per session (sessionStorage). We deliberately
// don't persist across sessions — if the visitor comes back later
// it's worth re-offering.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, X } from "lucide-react"

const SESSION_KEY = "thebigclass.exitIntent.shown.v1"
const IDLE_MS = 60_000

export function ExitIntentModal() {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window === "undefined") return
    let alreadyShown = false
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1"
    } catch { /* private mode — show once per page-load anyway */ }
    if (alreadyShown) return

    let mouseLeftAt: number | null = null
    let idleTimer: number | null = null

    function fire() {
      if (alreadyShown) return
      alreadyShown = true
      setShow(true)
      try { window.sessionStorage.setItem(SESSION_KEY, "1") } catch { /* ignore */ }
    }

    // Desktop: mouseleave from the top of the viewport. The classic
    // exit-intent trigger — when the cursor crosses out of the page
    // upward, the visitor is reaching for the close-tab button.
    function onMouseLeave(e: MouseEvent) {
      if (e.clientY > 0) return // only top-edge exits
      const now = Date.now()
      if (mouseLeftAt && now - mouseLeftAt < 1000) return
      mouseLeftAt = now
      // Slight delay so accidental flicks to the bookmark bar don't
      // trigger.
      window.setTimeout(() => {
        if (document.visibilityState === "visible") fire()
      }, 120)
    }

    // Mobile fallback: idle timer + scroll-up gesture from near-top.
    function resetIdle() {
      if (idleTimer != null) window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(fire, IDLE_MS)
    }

    document.addEventListener("mouseleave", onMouseLeave)
    window.addEventListener("scroll", resetIdle, { passive: true })
    window.addEventListener("touchstart", resetIdle, { passive: true })
    resetIdle()

    return () => {
      document.removeEventListener("mouseleave", onMouseLeave)
      window.removeEventListener("scroll", resetIdle)
      window.removeEventListener("touchstart", resetIdle)
      if (idleTimer != null) window.clearTimeout(idleTimer)
    }
  }, [])

  // ESC to dismiss
  useEffect(() => {
    if (!show) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShow(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [show])

  if (!mounted || !show) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => setShow(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Accent strip */}
        <div className="h-1 bg-gradient-to-r from-primary via-emerald-500 to-accent" />

        <button
          type="button"
          aria-label="Close"
          onClick={() => setShow(false)}
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-7">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Try before you sign up
          </div>

          <h2 id="exit-intent-title" className="mt-3 font-serif text-2xl font-bold leading-tight">
            Don&rsquo;t go without trying the certificate designer.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Drag-drop canvas, 17 templates, signatures, QR codes, bulk-issue from CSV — all in your browser. <span className="font-semibold text-foreground">No signup. No card.</span> Your work is yours to keep.
          </p>

          <ul className="mt-4 space-y-1.5 text-[12px] text-foreground/85">
            <li className="flex items-start gap-1.5">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              17 ready templates across Sans / Serif / Display / Signature
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              6 block types — text, shapes, signatures, QR, image
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              Export PNG / PDF · variable bindings · 17 fonts
            </li>
          </ul>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/template-designer"
              onClick={() => setShow(false)}
              className="group inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-bold text-background transition-transform hover:scale-[1.02]"
            >
              Open the designer
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              Not now
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Press ESC to close
          </p>
        </div>
      </div>
    </div>
  )
}
