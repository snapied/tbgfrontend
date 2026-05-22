"use client"

// /dashboard/status — single page that runs every health probe the
// dashboard already does in pieces (host page auth check, LiveKit
// token mint, AI status, recording egress) and shows them in one
// place. Saves the "is the backend even up?" detective work when
// something feels off.
//
// Probes:
//   1. Backend reachable         — plain GET to the API base.
//   2. Signed in                 — /api/auth/me with Bearer; falls
//                                  back to /api/auth/refresh once.
//   3. LiveKit token service     — POST /api/live-sessions/livekit-token
//                                  with a sentinel; 200 = healthy,
//                                  400/401/403 = route up (validation
//                                  rejected our probe shape, expected),
//                                  5xx / network = down.
//   4. Recording egress          — derived: healthy when LiveKit is
//                                  healthy AND no recent session has
//                                  a `recordingError` flag.
//   5. AI provider               — /api/ai/status. Optional probe —
//                                  hidden when the workspace isn't on
//                                  a plan that includes AI.
//
// Each row has its own refresh button so the user can poke a single
// signal without re-running the whole sweep. The top-level refresh
// re-runs all probes; auto-refresh every 30s keeps the page live.

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import { useLMS } from "@/lib/lms-store"
import { ensureAuthed } from "@/lib/billing-client"
import { fetchAIStatus } from "@/lib/ai-client"
import { cn } from "@/lib/utils"

const ACCESS_TOKEN_KEY = "thebigclass.accessToken"
function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
    /\/$/,
    "",
  )
}
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type Health = "ok" | "warn" | "fail" | "checking" | "idle"

interface ProbeResult {
  status: Health
  /** Round-trip latency in milliseconds. Null when not measured. */
  latencyMs: number | null
  /** Short, user-facing detail. e.g. "Responded in 142 ms" or
   *  "Refresh cookie expired — sign in again". */
  detail: string
  /** ISO timestamp of when this probe last ran. */
  ranAt: string | null
}

const blankResult = (): ProbeResult => ({
  status: "idle",
  latencyMs: null,
  detail: "Not run yet.",
  ranAt: null,
})

// Probe runners — each returns a ProbeResult. They all swallow errors
// so a single bad probe never bricks the page.

// "Failed to fetch" from the browser is almost always one of: backend
// process not running, NEXT_PUBLIC_API_URL pointing at the wrong host,
// or CORS preflight failure on the probed route. Translate the bare
// DOMException into something the user can act on.
function humanizeNetworkError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) {
    return `Couldn't reach ${apiBase()} — check the backend is running and NEXT_PUBLIC_API_URL points at it. CORS misconfiguration also surfaces here.`
  }
  return `Network error: ${raw}`
}

async function probeBackend(): Promise<ProbeResult> {
  const t0 = performance.now()
  try {
    // Hit a known route on the API rather than `/` — the root path
    // often lacks CORS allow headers and returns "Failed to fetch"
    // even when the backend is up. `/api/auth/me` is the most stable
    // signal: it's always mounted, always returns *something* (200
    // when signed in, 401 when not), and always sends CORS headers
    // because it's under the `/api` prefix that the backend's CORS
    // middleware blanket-covers.
    const res = await fetch(`${apiBase()}/api/auth/me`, {
      credentials: "include",
    })
    const latency = Math.round(performance.now() - t0)
    if (res.status >= 500) {
      return {
        status: "fail",
        latencyMs: latency,
        detail: `Backend returned ${res.status}.`,
        ranAt: new Date().toISOString(),
      }
    }
    // Any HTTP response (including 401) proves the backend is alive
    // and CORS is configured. Auth-row will tell us whether the user
    // is actually signed in.
    return {
      status: "ok",
      latencyMs: latency,
      detail: `Reachable in ${latency} ms (HTTP ${res.status}).`,
      ranAt: new Date().toISOString(),
    }
  } catch (err) {
    const latency = Math.round(performance.now() - t0)
    return {
      status: "fail",
      latencyMs: latency,
      detail: humanizeNetworkError(err),
      ranAt: new Date().toISOString(),
    }
  }
}

async function probeAuth(): Promise<ProbeResult> {
  const t0 = performance.now()
  try {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    const fire = () =>
      fetch(`${apiBase()}/api/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
    let res = await fire()
    if (res.status === 401) {
      // Same recovery path the host page uses: try /api/auth/refresh
      // once and re-probe. Surfaces "refresh cookie also dead" as a
      // distinct failure mode below.
      const refreshed = await ensureAuthed()
      if (refreshed) res = await fire()
    }
    const latency = Math.round(performance.now() - t0)
    if (res.ok) {
      return {
        status: "ok",
        latencyMs: latency,
        detail: `Signed in (verified in ${latency} ms).`,
        ranAt: new Date().toISOString(),
      }
    }
    if (res.status === 401) {
      return {
        status: "fail",
        latencyMs: latency,
        detail:
          "Session expired. Both your access token and refresh cookie are dead — sign in again to fix.",
        ranAt: new Date().toISOString(),
      }
    }
    return {
      status: "fail",
      latencyMs: latency,
      detail: `Auth endpoint returned ${res.status}.`,
      ranAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      status: "fail",
      latencyMs: null,
      detail: humanizeNetworkError(err),
      ranAt: new Date().toISOString(),
    }
  }
}

async function probeLiveKit(): Promise<ProbeResult> {
  const t0 = performance.now()
  try {
    // Sentinel payload — designed to be obviously a probe so we don't
    // accidentally consume a real LiveKit room slot. The backend's
    // validation will either accept the room name (in which case we
    // get a token and the route is healthy) or reject the payload
    // (4xx — the route is alive, validation worked, no token issued).
    const res = await fetch(`${apiBase()}/api/live-sessions/livekit-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({
        roomName: "status-probe",
        user: { id: "status-probe", name: "status-probe" },
        moderator: false,
      }),
    })
    const latency = Math.round(performance.now() - t0)
    if (res.ok) {
      return {
        status: "ok",
        latencyMs: latency,
        detail: `LiveKit token minted in ${latency} ms.`,
        ranAt: new Date().toISOString(),
      }
    }
    // 401 means we're not signed in — surface that as a warn, not a
    // fail, because the auth row covers the real cause and this row
    // alone can't fix it.
    if (res.status === 401 || res.status === 403) {
      return {
        status: "warn",
        latencyMs: latency,
        detail: "Sign in to verify LiveKit fully — endpoint is reachable.",
        ranAt: new Date().toISOString(),
      }
    }
    if (res.status >= 500) {
      return {
        status: "fail",
        latencyMs: latency,
        detail: `LiveKit token service returned ${res.status}.`,
        ranAt: new Date().toISOString(),
      }
    }
    // 4xx (other) = route alive, validation rejected our sentinel.
    // That's fine — it means the service is up and processing requests.
    return {
      status: "ok",
      latencyMs: latency,
      detail: `Route healthy (HTTP ${res.status} on sentinel payload).`,
      ranAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      status: "fail",
      latencyMs: null,
      detail: humanizeNetworkError(err),
      ranAt: new Date().toISOString(),
    }
  }
}

async function probeAI(): Promise<ProbeResult> {
  const t0 = performance.now()
  try {
    const status = await fetchAIStatus()
    const latency = Math.round(performance.now() - t0)
    // This row is system health, not personal entitlement. The plan
    // gate is a per-user UX concern (it controls whether the
    // "Generate with AI" buttons render); it doesn't belong on the
    // status page because the platform is perfectly healthy when a
    // Starter user hits it. We report only on `configured`. The
    // plan gate, when relevant, shows up as a passive footnote.
    if (status.configured) {
      const planNote = status.planAllowed
        ? ""
        : " Your current plan doesn't include AI buttons in the editor — that's separate from this health check."
      return {
        status: "ok",
        latencyMs: latency,
        detail: `Provider key configured and reachable.${planNote}`,
        ranAt: new Date().toISOString(),
      }
    }
    return {
      status: "warn",
      latencyMs: latency,
      detail:
        "Backend has no AI key. Set OPENAI_API_KEY or GROQ_API_KEY in backend/.env and restart the server.",
      ranAt: new Date().toISOString(),
    }
  } catch {
    return {
      status: "fail",
      latencyMs: null,
      detail: "Couldn't reach AI status endpoint.",
      ranAt: new Date().toISOString(),
    }
  }
}

const ROWS = [
  { key: "backend", label: "Backend reachable", run: probeBackend },
  { key: "auth", label: "Signed in", run: probeAuth },
  { key: "livekit", label: "LiveKit token service", run: probeLiveKit },
  { key: "ai", label: "AI provider", run: probeAI, optional: true },
] as const
type RowKey = (typeof ROWS)[number]["key"] | "egress"

export default function StatusPage() {
  const { liveSessions } = useLMS()
  const [results, setResults] = useState<Record<string, ProbeResult>>({
    backend: blankResult(),
    auth: blankResult(),
    livekit: blankResult(),
    ai: blankResult(),
    egress: blankResult(),
  })
  const [refreshing, setRefreshing] = useState(false)

  // Recording-egress derived state. There's no dedicated probe — egress
  // runs inside LiveKit, so "healthy" means LiveKit is up AND no
  // session in the last 24 h has `recordingError` set.
  const recentRecordingError = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    return liveSessions.find((s) => {
      // We don't have updatedAt on every session, so use the latest of
      // roomEndedAt / scheduledAt as the timestamp.
      const t = new Date(s.roomEndedAt ?? s.scheduledAt).getTime()
      return Number.isFinite(t) && t > dayAgo && (s as { recordingError?: unknown }).recordingError
    })
  }, [liveSessions])

  const computeEgress = useCallback(
    (livekit: ProbeResult): ProbeResult => {
      const ranAt = new Date().toISOString()
      if (livekit.status === "fail") {
        return {
          status: "fail",
          latencyMs: null,
          detail: "LiveKit is down — egress runs through LiveKit, so recording will fail.",
          ranAt,
        }
      }
      if (recentRecordingError) {
        const err = (recentRecordingError as { recordingError?: string }).recordingError
        return {
          status: "warn",
          latencyMs: null,
          detail: `A recent class hit an egress error: "${err ?? "unknown"}". The next class should still work — re-test if you want to be sure.`,
          ranAt,
        }
      }
      if (livekit.status === "warn") {
        return {
          status: "warn",
          latencyMs: null,
          detail: "LiveKit needs sign-in to verify; egress depends on it.",
          ranAt,
        }
      }
      return {
        status: "ok",
        latencyMs: null,
        detail: "Egress pipeline is healthy.",
        ranAt,
      }
    },
    [recentRecordingError],
  )

  const runOne = useCallback(
    async (key: RowKey) => {
      if (key === "egress") {
        // Egress is derived — recompute from the current livekit result.
        setResults((r) => ({ ...r, egress: computeEgress(r.livekit) }))
        return
      }
      setResults((r) => ({
        ...r,
        [key]: { ...r[key], status: "checking" },
      }))
      const row = ROWS.find((rr) => rr.key === key)
      if (!row) return
      const next = await row.run()
      setResults((r) => ({
        ...r,
        [key]: next,
        // Recompute egress whenever livekit changes.
        ...(key === "livekit" ? { egress: computeEgress(next) } : {}),
      }))
    },
    [computeEgress],
  )

  const runAll = useCallback(async () => {
    setRefreshing(true)
    setResults((r) => {
      const copy = { ...r }
      for (const row of ROWS) copy[row.key] = { ...copy[row.key], status: "checking" }
      copy.egress = { ...copy.egress, status: "checking" }
      return copy
    })
    // Run probes in parallel — they're independent. Egress derives
    // after LiveKit lands, so we await before computing.
    const [backend, auth, livekit, ai] = await Promise.all(
      ROWS.map((r) => r.run()),
    )
    setResults({
      backend,
      auth,
      livekit,
      ai,
      egress: computeEgress(livekit),
    })
    setRefreshing(false)
  }, [computeEgress])

  // Initial run + auto-refresh every 30 seconds.
  useEffect(() => {
    void runAll()
    const t = setInterval(() => {
      void runAll()
    }, 30_000)
    return () => clearInterval(t)
  }, [runAll])

  // Overall summary — fail if anything's failed, warn if anything's
  // warning, ok when all good. Drives the colour of the top chip.
  const overall: Health = useMemo(() => {
    const list = Object.values(results)
    if (list.some((r) => r.status === "fail")) return "fail"
    if (list.some((r) => r.status === "checking")) return "checking"
    if (list.some((r) => r.status === "warn")) return "warn"
    return "ok"
  }, [results])

  // Diagnostic: when the three network-dependent probes (backend,
  // auth, livekit) all fail in the same way, it's almost always one
  // root cause (wrong API URL, backend not running, or CORS blanket-
  // blocking the origin). Show a single callout instead of three
  // identical red rows that scare the user into thinking everything
  // independently broke.
  const allNetworkDown =
    results.backend.status === "fail" &&
    results.auth.status === "fail" &&
    results.livekit.status === "fail"

  // Resolved API base — read once so the user can verify which host
  // the browser is trying to reach. SSR safe via the apiBase() helper.
  const resolvedApiBase = apiBase()

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs crumbs={[{ label: "Workspace" }, { label: "Status" }]} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">System status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live probes of the services this dashboard depends on. Auto-refreshes every 30 seconds.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Connecting to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              {resolvedApiBase}
            </code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SummaryPill status={overall} />
          <Button
            variant="outline"
            size="sm"
            onClick={runAll}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh all
          </Button>
        </div>
      </div>

      {allNetworkDown && (
        // Most teachers don't have three independently failing
        // services — when every backend probe trips with "Failed to
        // fetch", it's one underlying cause. Surface the likely
        // suspects here so the user has somewhere to act, rather
        // than reading the same red copy on every row.
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-destructive">
              Browser can&apos;t reach{" "}
              <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono text-[12px]">
                {resolvedApiBase}
              </code>
            </p>
            <p className="text-muted-foreground">
              Three independent probes all failed the same way, which is almost always one of these:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>
                The backend isn&apos;t running. Most of the dashboard works off cached data in
                localStorage, so the rest of the UI feels fine even when the API is down.
              </li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  NEXT_PUBLIC_API_URL
                </code>{" "}
                points at a different host than where the backend is actually serving. Check{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">.env.local</code>.
              </li>
              <li>
                CORS misconfiguration: the backend isn&apos;t sending an
                <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  Access-Control-Allow-Origin
                </code>
                header that includes this browser&apos;s origin.
              </li>
            </ul>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60">
            {ROWS.map((row) => (
              <StatusRow
                key={row.key}
                label={row.label}
                result={results[row.key] ?? blankResult()}
                onRefresh={() => runOne(row.key)}
              />
            ))}
            {/* Egress is derived from the LiveKit row — it has its own
                refresh that just recomputes from current state, no
                network call. */}
            <StatusRow
              label="Recording egress"
              result={results.egress ?? blankResult()}
              onRefresh={() => runOne("egress")}
            />
          </ul>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Probes run from your browser. A red row here is something you can act on — usually a
        sign-in, a refresh, or a wait. Anything beyond that is on the backend and outside the
        dashboard&apos;s control.
      </p>
    </div>
  )
}

function StatusRow({
  label,
  result,
  onRefresh,
}: {
  label: string
  result: ProbeResult
  onRefresh: () => void
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <StatusIcon status={result.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{result.detail}</p>
      </div>
      <div className="hidden text-[11px] text-muted-foreground sm:block">
        {result.ranAt && (
          <span title={new Date(result.ranAt).toISOString()}>
            {new Date(result.ranAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onRefresh}
        title={`Re-run ${label} probe`}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", result.status === "checking" && "animate-spin")} />
      </Button>
    </li>
  )
}

function StatusIcon({ status }: { status: Health }) {
  if (status === "ok")
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="OK" />
  if (status === "fail")
    return <XCircle className="h-5 w-5 shrink-0 text-destructive" aria-label="Fail" />
  if (status === "warn")
    return (
      <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" aria-label="Warning" />
    )
  if (status === "checking")
    return (
      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-label="Checking" />
    )
  return <span className="block h-5 w-5 shrink-0 rounded-full border border-border" aria-label="Idle" />
}

function SummaryPill({ status }: { status: Health }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        status === "ok" && "bg-success/10 text-success",
        status === "warn" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        status === "fail" && "bg-destructive/10 text-destructive",
        status === "checking" && "bg-muted text-muted-foreground",
      )}
    >
      <StatusIcon status={status} />
      {status === "ok" && "All systems normal"}
      {status === "warn" && "Some issues"}
      {status === "fail" && "Outage detected"}
      {status === "checking" && "Checking"}
    </span>
  )
}
