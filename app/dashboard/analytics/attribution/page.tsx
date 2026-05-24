"use client"

// Attribution dashboard — answers "where did our visitors / conversions
// come from?" using the lib/attribution.ts capture chain.
//
// Layout:
//   • Headline metrics: visitors, conversions, conversion rate, revenue
//   • Channel breakdown table (first-touch visitors + conversions +
//     revenue, with last-touch conversion as a secondary column)
//   • Campaign table (only campaigns with at least one visitor)
//   • Recent visitor list with first/last touch detail (good for
//     debugging "why is this visitor attributed to Twitter?")
//
// We re-derive the report on every render rather than caching — the
// per-tenant attribution corpus is < 5K records by design and the
// localStorage scan is cheap. If we ever push this server-side this
// becomes an API call with the same shape.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BarChart3,
  ChevronLeft,
  Globe,
  Mail,
  MousePointerClick,
  Network,
  Search,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTenant } from "@/lib/tenant-store"
import {
  buildAttributionReport,
  listAttributionRecords,
  type AttributionChannel,
  type AttributionRecord,
  type AttributionReport,
} from "@/lib/attribution"

const CHANNEL_META: Record<AttributionChannel, { label: string; tone: string; Icon: typeof Globe }> = {
  direct: { label: "Direct", tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300", Icon: MousePointerClick },
  "organic-search": { label: "Organic search", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", Icon: Search },
  "paid-search": { label: "Paid search", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", Icon: Search },
  social: { label: "Social", tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300", Icon: Network },
  "paid-social": { label: "Paid social", tone: "bg-purple-500/15 text-purple-700 dark:text-purple-300", Icon: Network },
  email: { label: "Email", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300", Icon: Mail },
  referral: { label: "Referral", tone: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300", Icon: Globe },
  affiliate: { label: "Affiliate", tone: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300", Icon: Globe },
  unknown: { label: "Unknown", tone: "bg-muted text-muted-foreground", Icon: Globe },
}

export default function AttributionPage() {
  const { currentTenant } = useTenant()
  const slug = currentTenant?.slug ?? ""

  // Hydrate the report client-side only. The hook touches
  // localStorage so we can't compute it on the server pass.
  const [report, setReport] = useState<AttributionReport | null>(null)
  const [records, setRecords] = useState<AttributionRecord[]>([])
  useEffect(() => {
    setReport(buildAttributionReport(slug))
    setRecords(listAttributionRecords(slug))
  }, [slug])

  const totals = report ?? {
    totalVisitors: 0,
    totalConversions: 0,
    totalRevenue: 0,
    byChannel: [],
    byCampaign: [],
    topReferrers: [],
  }

  const conversionRate = useMemo(() => {
    if (totals.totalVisitors === 0) return null
    return totals.totalConversions / totals.totalVisitors
  }, [totals])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link href="/dashboard/analytics">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Back to analytics
            </Link>
          </Button>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Advanced
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">Attribution</h1>
          <p className="text-muted-foreground">
            How visitors found you, classified by channel. First-touch unless noted.
          </p>
        </div>
      </div>

      {/* Headline metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Visitors captured"
          value={totals.totalVisitors.toLocaleString()}
          Icon={Users}
        />
        <MetricCard
          label="Conversions logged"
          value={totals.totalConversions.toLocaleString()}
          Icon={MousePointerClick}
        />
        <MetricCard
          label="Conversion rate"
          value={conversionRate === null ? "—" : `${(conversionRate * 100).toFixed(2)}%`}
          Icon={BarChart3}
        />
        <MetricCard
          label="Attributed revenue"
          value={`$${totals.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          Icon={BarChart3}
          hint="Sum of conversion values across captured visitors"
        />
      </div>

      {/* Channel breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>By channel</CardTitle>
          <CardDescription>
            First-touch attribution — visitors are credited to the channel that brought them in
            initially. The last-touch column shows where the closing visit came from for
            multi-step journeys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totals.byChannel.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 pr-3 text-right">Visitors</th>
                    <th className="py-2 pr-3 text-right">Conversions</th>
                    <th className="py-2 pr-3 text-right">CVR</th>
                    <th className="py-2 pr-3 text-right">Revenue</th>
                    <th className="py-2 pl-3 text-right">Last-touch closes</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.byChannel.map((row) => {
                    const m = CHANNEL_META[row.channel] ?? CHANNEL_META.unknown
                    const cvr = row.visitors === 0 ? null : row.conversions / row.visitors
                    return (
                      <tr key={row.channel} className="border-b border-border/50">
                        <td className="py-2.5 pr-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.tone}`}>
                            <m.Icon className="h-3 w-3" />
                            {m.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{row.visitors.toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{row.conversions.toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {cvr === null ? "—" : `${(cvr * 100).toFixed(1)}%`}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          ${row.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground">
                          {row.lastTouchConversions.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign + Referrer side by side on wide screens */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By campaign</CardTitle>
            <CardDescription>
              UTM <code className="rounded bg-muted px-1 font-mono text-[11px]">utm_campaign</code> values
              captured on first touch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totals.byCampaign.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No campaigns yet — tag your links with <code className="rounded bg-muted px-1 font-mono text-[11px]">?utm_campaign=launch</code> and they&rsquo;ll roll up here.
              </p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Campaign</th>
                    <th className="py-2 pr-3 text-right">Visitors</th>
                    <th className="py-2 pr-3 text-right">Conv.</th>
                    <th className="py-2 pl-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.byCampaign.slice(0, 12).map((c) => (
                    <tr key={c.campaign} className="border-b border-border/50">
                      <td className="py-2.5 pr-3 font-mono text-[12px]">{c.campaign}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.visitors.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.conversions.toLocaleString()}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums">
                        ${c.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top referrers</CardTitle>
            <CardDescription>
              Hosts that sent the most first-touch visitors. Internal nav and same-host clicks excluded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totals.topReferrers.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No external referrers captured yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {totals.topReferrers.map((r) => (
                  <li key={r.host} className="flex items-center justify-between text-[13px]">
                    <span className="font-mono">{r.host}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                      {r.visitors.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent visitor list — surfaces raw touches for debugging.
          Showing the most recent N keeps the page manageable; future
          versions add filter + paging when the dataset warrants. */}
      <Card>
        <CardHeader>
          <CardTitle>Recent visitors</CardTitle>
          <CardDescription>
            Each visitor shows their first-touch channel and the chain of subsequent touches.
            Useful for sanity-checking why a visitor was attributed to a particular source.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul className="space-y-3">
              {records.slice(0, 20).map((rec) => {
                const ft = CHANNEL_META[rec.firstTouch.channel] ?? CHANNEL_META.unknown
                const lt = CHANNEL_META[rec.lastTouch.channel] ?? CHANNEL_META.unknown
                return (
                  <li key={rec.visitorId} className="rounded-md border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                      <code className="font-mono text-[11px] text-muted-foreground">{rec.visitorId}</code>
                      <span className="text-[10.5px] text-muted-foreground">
                        First seen {new Date(rec.firstTouch.at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ft.tone}`}>
                        First: {ft.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${lt.tone}`}>
                        Last: {lt.label}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold">
                        {rec.touches.length} {rec.touches.length === 1 ? "touch" : "touches"}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold">
                        {rec.conversions.length} conv.
                      </span>
                    </div>
                    {(rec.firstTouch.utm.campaign || rec.firstTouch.referrerHost) && (
                      <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                        {rec.firstTouch.utm.campaign && (
                          <>Campaign <code className="rounded bg-muted px-1 font-mono text-[10.5px]">{rec.firstTouch.utm.campaign}</code>{" "}</>
                        )}
                        {rec.firstTouch.referrerHost && <>via {rec.firstTouch.referrerHost}</>}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  Icon,
  hint,
}: {
  label: string
  value: string
  Icon: typeof Globe
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            {hint && <p className="mt-1 text-[10.5px] text-muted-foreground">{hint}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyHint() {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">No attribution data yet.</p>
      <p className="mt-1">
        Mount the <code className="rounded bg-muted px-1 font-mono text-[11px]">useAttributionCapture</code> hook
        on your public portal layout (already wired) and start sending traffic — visits with{" "}
        <code className="rounded bg-muted px-1 font-mono text-[11px]">utm_*</code> params or foreign
        referrers will land here.
      </p>
    </div>
  )
}
