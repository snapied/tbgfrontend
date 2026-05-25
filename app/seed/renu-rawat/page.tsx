"use client"

// /seed/renu-rawat — the page the `npm run seed:renu-rawat` script
// opens. Auto-runs the seed on mount, shows a progress UI, and
// offers a "Reseed (wipes existing)" + "Open dashboard" shortcut.
//
// Why a page (not a pure script): the seed writes to the BROWSER's
// localStorage. A node script can't reach that. So the npm command
// just opens the page; the page does the actual work in the
// browser, exactly like the dashboard banner — just on a dedicated
// URL so it's CLI-shareable.

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Database, Loader2, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import {
  clearRenuRawat,
  seedRenuRawat,
  type SeedResult,
} from "@/lib/seed/renu-rawat"

export default function SeedRenuRawatPage() {
  const confirm = useConfirm()
  const [state, setState] = useState<"running" | "done" | "skipped" | "error">("running")
  const [result, setResult] = useState<SeedResult | null>(null)

  // Run once on mount. Idempotent — `seedRenuRawat` skips when the
  // tenant already has data so a re-open from the npm command
  // doesn't blow away in-flight demos.
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      try {
        const r = seedRenuRawat()
        if (cancelled) return
        setResult(r)
        setState(r.seeded ? "done" : "skipped")
        if (r.seeded) {
          toast.success("Demo data seeded for renu-rawat")
        } else {
          toast.info(r.reason ?? "Already seeded.")
        }
      } catch (err) {
        if (cancelled) return
        console.error("[seed cli] failed:", err)
        setState("error")
        toast.error("Seed failed — see browser console.")
      }
    }, 200) // tiny delay so the running spinner is visible
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  async function reseed() {
    const ok = await confirm({
      title: "Wipe + reseed Renu Rawat demo?",
      description:
        "Deletes every record on the renu-rawat tenant (courses, students, orders, portal, docs, certificates) and replaces it with the fresh demo seed. Useful before a pitch.",
      destructive: true,
      confirmLabel: "Wipe + reseed",
    })
    if (!ok) return
    setState("running")
    setResult(null)
    try {
      clearRenuRawat()
      const r = seedRenuRawat({ force: true })
      setResult(r)
      setState("done")
      toast.success("Wiped + reseeded")
    } catch (err) {
      console.error("[seed cli] reseed failed:", err)
      setState("error")
      toast.error("Reseed failed — see console.")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3 w-3" />
          Seed CLI · renu-rawat demo tenant
        </div>
        <h1 className="mt-5 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {state === "running" && "Seeding the renu-rawat demo…"}
          {state === "done" && "Demo data seeded."}
          {state === "skipped" && "Tenant already has data."}
          {state === "error" && "Seed failed."}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {state === "running" && "Hold on a second — writing 28 users, 5 courses, 8 products, portal pages, blog posts, certificates and a community feed to your browser storage."}
          {state === "done" && "Every dashboard surface is now populated with realistic K12 data. Open the dashboard or the public portal to demo end-to-end."}
          {state === "skipped" && "Use 'Reseed' below to wipe the existing data and start fresh."}
          {state === "error" && "Open the browser console for the error trace. The most common cause is a localStorage quota issue — clear site data and retry."}
        </p>

        <div className="mt-8">
          {state === "running" && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Writing data…</span>
            </div>
          )}

          {result && state === "done" && result.counts && (
            <div className="rounded-2xl border border-success/30 bg-success/[0.04] p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="font-bold">What landed</p>
              </div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px]">
                {Object.entries(result.counts).map(([k, v]) => (
                  <li key={k} className="flex items-baseline justify-between border-b border-border/40 py-1">
                    <span className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-mono font-bold">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/dashboard">
              <Database className="mr-1.5 h-4 w-4" />
              Open dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/p/renu-rawat">Open public portal</Link>
          </Button>
          <Button variant="ghost" onClick={reseed} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reseed (wipes existing)
          </Button>
        </div>

        <div className="mt-12 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-[12.5px]">
            <p className="font-bold">Run from your shell · browser storage</p>
            <pre className="mt-2 overflow-x-auto rounded bg-card px-3 py-2 font-mono text-[11px]">
              cd web && npm run seed:renu-rawat
            </pre>
            <p className="mt-2 text-muted-foreground">
              Opens this page and writes the seed to your browser's localStorage.
              Great for quick UI demos. Idempotent — safe to re-run.
            </p>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4 text-[12.5px]">
            <p className="font-bold text-primary">Persist to real Postgres database</p>
            <pre className="mt-2 overflow-x-auto rounded bg-card px-3 py-2 font-mono text-[11px]">
              cd backend && npm run seed:renu-rawat
            </pre>
            <p className="mt-2 text-muted-foreground">
              Writes directly to Postgres: ensures the renu-rawat tenant on user
              <span className="font-mono"> renur46@gmail.com</span>, populates
              Students/Batches/Certificates/LiveRooms/Whiteboards in their own
              tables and stores the rest as PortalState blobs that the web app
              hydrates from <span className="font-mono">/api/portal-state/renu-rawat</span>.
              Idempotent — re-running upserts and refreshes the demo.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
