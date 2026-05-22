"use client"

// Dashboard webhooks page — list, create, test, drill into delivery
// logs. Mirrors Stripe's / Razorpay's webhook console:
//
//   - Active rows show URL, event count, last delivery state.
//   - Disabled rows still appear so the creator can re-enable.
//   - Create flow surfaces the signing secret ONCE on success; we
//     never show it again (lost = revoke + reissue, same as GitHub).
//   - Per-row "Test fire" sends a synthetic `webhook.test` event so
//     the creator can verify their endpoint without waiting for a
//     real action.
//   - Click a row → drill in for the last 100 delivery attempts with
//     response status, body excerpt, and error message.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  listEvents,
  listWebhooks,
  createWebhook,
  patchWebhook,
  deleteWebhook,
  testWebhook,
  listDeliveries,
  type WebhookRow,
  type DeliveryRow,
} from "@/lib/webhooks-client"
import { ensureAuthed } from "@/lib/billing-client"
import { SignInRequired } from "@/components/dashboard/signin-required"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"

// Webhooks share the same apiAccess (Institute-only) plan flag as the
// Developer / API-keys console. Pro/Studio see the configured-hooks
// list dimmed as a preview behind the upgrade card.
export default function WebhooksPage() {
  return (
    <PlanFeatureGate feature="apiAccess">
      <WebhooksPageInner />
    </PlanFeatureGate>
  )
}

function WebhooksPageInner() {
  const [hooks, setHooks] = useState<WebhookRow[] | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [drilledId, setDrilledId] = useState<number | null>(null)
  const [revealedSecret, setRevealedSecret] = useState<{ id: number; value: string } | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)

  const [unauthed, setUnauthed] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    const authed = await ensureAuthed()
    if (!authed) {
      setUnauthed(true)
      setHooks(null)
      setLoading(false)
      return
    }
    setUnauthed(false)
    const [hooksResult, eventsResult] = await Promise.all([listWebhooks(), listEvents()])
    if (Array.isArray(hooksResult)) setHooks(hooksResult)
    else setErr(hooksResult.error)
    if (Array.isArray(eventsResult)) setEvents(eventsResult)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleCreate = async (input: { url: string; label: string; events: string[] }) => {
    setErr(null)
    setCreating(true)
    const result = await createWebhook(input)
    setCreating(false)
    if ("error" in result) {
      setErr(result.error)
      return
    }
    setRevealedSecret({ id: result.webhook.id, value: result.secret })
    setSecretVisible(true)
    setShowCreate(false)
    await reload()
  }

  if (loading && !hooks) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading webhooks…
      </div>
    )
  }

  if (unauthed) {
    return (
      <SignInRequired
        title="Sign in to manage webhooks"
        description="Webhooks let your CRM, Slack, accounting, or data pipeline react to events in your workspace as they happen."
        bullets={[
          "13 event types — student signups, orders, recordings, certificates, …",
          "HMAC-SHA256 signed payloads — verify they're from us, not a spoof",
          "Built-in retry with delivery logs you can drill into",
        ]}
      />
    )
  }

  if (drilledId !== null) {
    const hook = hooks?.find((h) => h.id === drilledId)
    return (
      <DeliveryDrilldown
        webhook={hook}
        onBack={() => setDrilledId(null)}
        onChange={reload}
      />
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get notified when something happens in your workspace.{" "}
            <Link href="/developers#webhooks" className="text-primary hover:underline">
              Signature + payload spec →
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New webhook
          </Button>
        </div>
      </header>

      {err && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {/* One-time secret reveal */}
      {revealedSecret && (
        <Card className="border-primary/40 ring-1 ring-primary/20">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Webhook created — copy the signing secret now.
            </div>
            <p className="text-sm text-muted-foreground">
              This is the only time we&apos;ll show this secret. Store it in
              your secret manager — losing it means revoking + reissuing.
              Verify our signature with this key on every incoming POST.
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2 font-mono text-xs">
              <span className="flex-1 break-all">
                {secretVisible ? revealedSecret.value : revealedSecret.value.replace(/./g, "•")}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setSecretVisible((v) => !v)}
              >
                {secretVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => void navigator.clipboard.writeText(revealedSecret.value)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRevealedSecret(null)
                setSecretVisible(false)
              }}
            >
              I&apos;ve copied it — dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateForm
          events={events}
          busy={creating}
          onCancel={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* List */}
      {hooks && hooks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No webhooks yet. Click <strong>New webhook</strong> above to
              receive event POSTs at your URL.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hooks?.map((h) => (
            <WebhookRowCard
              key={h.id}
              hook={h}
              onOpen={() => setDrilledId(h.id)}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Per-webhook card
// ────────────────────────────────────────────────────────────────────

function WebhookRowCard({
  hook, onOpen, onChanged,
}: {
  hook: WebhookRow
  onOpen: () => void
  onChanged: () => void | Promise<void>
}) {
  const [busy, setBusy] = useState<"test" | "toggle" | "delete" | null>(null)
  const isDisabled = hook.status === "disabled"
  const recentFailing = hook.consecutiveFailures >= 3
  return (
    <Card className={cn(isDisabled && "opacity-70", recentFailing && !isDisabled && "border-amber-500/40")}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  isDisabled
                    ? "bg-muted-foreground"
                    : recentFailing
                      ? "bg-amber-500"
                      : "bg-success",
                )}
              />
              <code className="truncate font-mono text-sm">{hook.url}</code>
            </div>
            {hook.label && <p className="mt-1 text-xs text-muted-foreground">{hook.label}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {hook.events.slice(0, 4).map((e) => (
                <code key={e} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{e}</code>
              ))}
              {hook.events.length > 4 && (
                <span className="text-[10px] text-muted-foreground">+{hook.events.length - 4} more</span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {hook.lastDeliveryAt
                ? `Last delivery ${new Date(hook.lastDeliveryAt).toLocaleString()}`
                : "No deliveries yet"}
              {hook.consecutiveFailures > 0 && (
                <span className="ml-2 text-amber-600">· {hook.consecutiveFailures} consecutive failures</span>
              )}
              {isDisabled && (
                <span className="ml-2 font-semibold text-destructive">· DISABLED</span>
              )}
            </p>
          </button>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy !== null || isDisabled}
              onClick={async () => {
                setBusy("test")
                await testWebhook(hook.id)
                setBusy(null)
                await onChanged()
              }}
              className="gap-1"
            >
              {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Test
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy !== null}
              onClick={async () => {
                setBusy("toggle")
                await patchWebhook(hook.id, { status: isDisabled ? "active" : "disabled" })
                setBusy(null)
                await onChanged()
              }}
            >
              {isDisabled ? "Enable" : "Disable"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={busy !== null}
              onClick={async () => {
                if (!window.confirm(`Delete webhook ${hook.url}? Past delivery logs go with it.`)) return
                setBusy("delete")
                await deleteWebhook(hook.id)
                setBusy(null)
                await onChanged()
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────
// Create form
// ────────────────────────────────────────────────────────────────────

function CreateForm({
  events, busy, onCancel, onSubmit,
}: {
  events: string[]
  busy: boolean
  onCancel: () => void
  onSubmit: (input: { url: string; label: string; events: string[] }) => Promise<void>
}) {
  const [url, setUrl] = useState("")
  const [label, setLabel] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleEvent = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }
  const selectAll = () => setSelected(new Set(events))
  const clearAll = () => setSelected(new Set())

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-semibold">New webhook</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Point us at a URL. We&apos;ll POST a signed JSON payload
            every time one of your selected events fires.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs">URL <span className="text-destructive">*</span></Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/webhooks/tbc"
              type="url"
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Zapier integration"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs">Events <span className="text-destructive">*</span></Label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-primary hover:underline"
              >
                Select all
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-muted-foreground hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid gap-1.5 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-2">
            {events.map((name) => (
              <label key={name} className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox
                  checked={selected.has(name)}
                  onCheckedChange={() => toggleEvent(name)}
                />
                <code className="rounded bg-muted px-1.5 py-0.5">{name}</code>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy || !/^https?:\/\//.test(url) || selected.size === 0}
            onClick={() => onSubmit({ url, label, events: Array.from(selected) })}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create webhook
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────
// Delivery drill-down
// ────────────────────────────────────────────────────────────────────

function DeliveryDrilldown({
  webhook, onBack, onChange,
}: {
  webhook: WebhookRow | undefined
  onBack: () => void
  onChange: () => void | Promise<void>
}) {
  const [rows, setRows] = useState<DeliveryRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!webhook) return
    const r = await listDeliveries(webhook.id)
    if (Array.isArray(r)) setRows(r)
    else setErr(r.error)
  }, [webhook])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!webhook) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to webhooks
        </Button>
        <p className="text-sm text-muted-foreground">Webhook not found.</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to webhooks
      </Button>
      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <code className="font-mono text-sm">{webhook.url}</code>
              <p className="mt-1 text-xs text-muted-foreground">{webhook.label}</p>
            </div>
            <a
              href={webhook.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open endpoint <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {webhook.events.map((e) => (
              <code key={e} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{e}</code>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await testWebhook(webhook.id)
                await reload()
                await onChange()
              }}
              className="gap-1"
            >
              <Send className="h-3.5 w-3.5" />
              Send test event
            </Button>
            <Button variant="ghost" size="sm" onClick={reload} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh log
            </Button>
          </div>
        </CardContent>
      </Card>

      {err && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {/* Delivery log */}
      {rows === null ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading deliveries…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No deliveries yet. Hit <strong>Send test event</strong> above to verify your endpoint.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((d) => (
            <DeliveryRowCard key={d.id} row={d} />
          ))}
        </div>
      )}
    </div>
  )
}

function DeliveryRowCard({ row }: { row: DeliveryRow }) {
  const [expanded, setExpanded] = useState(false)
  const isSuccess = row.status === "success"
  const isAbandoned = row.status === "abandoned"
  return (
    <Card>
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 text-left"
        >
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          ) : isAbandoned ? (
            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <code className="font-mono text-xs">{row.eventType}</code>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                attempt {row.attempt}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {new Date(row.createdAt).toLocaleString()}
              {row.responseStatus !== null && (
                <span className="ml-2">→ HTTP {row.responseStatus}</span>
              )}
              {row.nextAttemptAt && (
                <span className="ml-2">
                  · next retry {new Date(row.nextAttemptAt).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </button>
        {expanded && (
          <div className="mt-2 space-y-2 rounded-md bg-muted/30 p-2 text-xs">
            <p className="text-muted-foreground">
              Event id: <code className="font-mono">{row.eventId}</code>
            </p>
            {row.errorMessage && (
              <p className="text-destructive">Error: {row.errorMessage}</p>
            )}
            {row.responseBodyExcerpt && (
              <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-[11px]">
                {row.responseBodyExcerpt}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
