"use client"

// Small "All systems normal" pill rendered in the landing footer.
// Mirrors the pattern most SaaS landing pages use (Linear, Vercel,
// Stripe, etc.) — a green dot that tells visitors the platform is up
// before they sign up. Links to /dashboard/status for the full
// per-service breakdown.
//
// The pill probes a single signal — backend reachability — on a 60s
// cadence. Anonymous visitors don't need to know about auth / AI /
// recording: those are dashboard concerns gated behind sign-in. A
// landing-page visitor just wants to know "is this thing online?"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Health = "ok" | "fail" | "checking"

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

export function SystemStatusPill({ className }: { className?: string }) {
  const [health, setHealth] = useState<Health>("checking")

  useEffect(() => {
    let cancelled = false
    const probe = async () => {
      try {
        // /api/auth/me is the safest signal: it's always mounted,
        // always sends CORS headers, and returns *something* (401
        // when anon, 200 when signed in). Either way the backend is
        // alive. Network reject = outage.
        const res = await fetch(`${apiBase()}/api/auth/me`, {
          credentials: "include",
        })
        if (cancelled) return
        setHealth(res.status >= 500 ? "fail" : "ok")
      } catch {
        if (!cancelled) setHealth("fail")
      }
    }
    void probe()
    // 60s cadence — too fast burns API hits from public visitors,
    // too slow misses brief outages. One probe a minute is what
    // most landing pills do.
    const t = setInterval(probe, 60_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const { dot, label } = (() => {
    if (health === "ok")
      return {
        dot: "bg-emerald-500",
        label: "All systems normal",
      }
    if (health === "fail")
      return {
        dot: "bg-rose-500",
        label: "Service disruption",
      }
    return {
      dot: "bg-slate-400",
      label: "Checking status…",
    }
  })()

  return (
    <Link
      href="/dashboard/status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground",
        className,
      )}
      title="System status — live probes of the platform's services"
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        {health === "ok" && (
          <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", dot)} />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dot)} />
      </span>
      {label}
    </Link>
  )
}
