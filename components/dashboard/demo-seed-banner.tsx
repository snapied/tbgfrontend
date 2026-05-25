"use client"

// Demo-seed banner. Visible ONLY when the current tenant is
// "renu-rawat" — the dedicated demo academy. Offers a one-click
// "Seed sample data" action so the dashboard, store, portal,
// community, and analytics are immediately populated.
//
// Idempotent — the seed itself skips if data already exists.
// A "Reseed (wipes existing)" option is offered when data is
// already present so the demo can be reset to pristine state
// between recordings / pitches.

import { useEffect, useState } from "react"
import { Sparkles, Loader2, Database, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTenant } from "@/lib/tenant-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { seedRenuRawat, clearRenuRawat } from "@/lib/seed/renu-rawat"

const DEMO_TENANT_SLUG = "renu-rawat"
const DISMISS_KEY = "thebigclass.demo-seed-banner.dismissed.renu-rawat"

export function DemoSeedBanner() {
  const { currentTenant } = useTenant()
  const confirm = useConfirm()
  const [hasData, setHasData] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Detect existing data on mount + persist a per-browser dismiss
  // so the seeded demo doesn't keep nagging the operator. Reseed
  // remains available via the row that surfaces after data exists.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const usersKey = `thebigclass.t.${DEMO_TENANT_SLUG}.lms.users.v1`
      const raw = window.localStorage.getItem(usersKey)
      const parsed = raw ? JSON.parse(raw) : null
      setHasData(Array.isArray(parsed) && parsed.length > 0)
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      setHasData(false)
    }
  }, [])

  // Only show on the renu-rawat tenant.
  if (currentTenant?.slug !== DEMO_TENANT_SLUG) return null
  if (dismissed && hasData) return null
  if (hasData == null) return null

  async function handleSeed() {
    setBusy(true)
    try {
      const result = seedRenuRawat()
      if (result.seeded) {
        toast.success("Demo data seeded — reloading dashboard…", {
          duration: 2000,
        })
        setTimeout(() => window.location.reload(), 800)
      } else {
        toast.info(result.reason ?? "Nothing to seed.")
        setBusy(false)
      }
    } catch (err) {
      console.warn("[demo-seed] failed:", err)
      toast.error("Couldn't seed — see console.")
      setBusy(false)
    }
  }

  async function handleReseed() {
    const ok = await confirm({
      title: "Wipe + reseed Renu Rawat demo?",
      description:
        "This deletes ALL existing data on the renu-rawat tenant (courses, students, orders, portal, docs) and replaces it with the fresh demo seed. Useful before a pitch.",
      destructive: true,
      confirmLabel: "Wipe + reseed",
    })
    if (!ok) return
    setBusy(true)
    try {
      clearRenuRawat()
      const result = seedRenuRawat({ force: true })
      if (result.seeded) {
        toast.success("Wiped + reseeded — reloading…", { duration: 2000 })
        setTimeout(() => window.location.reload(), 800)
      }
    } catch (err) {
      console.warn("[demo-seed] reseed failed:", err)
      toast.error("Reseed failed — see console.")
      setBusy(false)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    try { window.localStorage.setItem(DISMISS_KEY, "1") } catch { /* ignore */ }
  }

  // Two visual states:
  //   1. No data → big inviting "Seed sample data" call-to-action
  //   2. Has data → small status row with a "Reseed" affordance
  if (!hasData) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-background p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-primary">
                Demo tenant · renu-rawat
              </p>
              <p className="mt-1 text-base font-bold sm:text-lg">
                Seed this academy with realistic K12 demo data.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                One click populates 25 students, 5 courses (Class 6–10), 6 quizzes, live
                classes, assignments, products, a branded portal, blog posts, certificates,
                and the community feed. Takes ~2 seconds. Safe to re-run.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            <Button onClick={handleSeed} disabled={busy} className="gap-2">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Seed demo data
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Has data — quiet "demo seeded · reseed" row.
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
      <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="h-3.5 w-3.5 text-primary" />
        <span>
          Demo data seeded on the <span className="font-semibold text-foreground">renu-rawat</span> tenant.
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReseed}
          disabled={busy}
          className="gap-1.5 text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Reseed (wipes existing)
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
