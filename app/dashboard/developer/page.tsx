"use client"

// Developer console — API keys.
//
// Creator-facing page for generating, scoping, listing, and
// revoking API keys. The dashboard is the only place a fresh
// secret is ever shown — once a key is created the secret is
// hashed-only, the UI shows just the last 4 chars from then on.
//
// The page is intentionally framed as "your keys" + "what you
// can do with them" because the API surface itself is documented
// publicly at /developers (footer link). This page is the place
// where you turn that public spec into keys you actually call
// with — keep it focused on key lifecycle, not endpoint catalogs.

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Key,
  KeyRound,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ALL_SCOPES,
  createApiKey,
  revokeApiKey,
  useApiKeys,
  type ApiScope,
} from "@/lib/api-keys"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"

// API keys + the REST surface are Institute-only per the pricing
// copy. Pro/Studio see the key-management UI dimmed as a preview
// underneath the upgrade card — defence-in-depth alongside any
// backend rejection of API requests from non-Institute orgs.
export default function DeveloperPage() {
  return (
    <PlanFeatureGate feature="apiAccess">
      <DeveloperPageInner />
    </PlanFeatureGate>
  )
}

function DeveloperPageInner() {
  const { keys, refresh } = useApiKeys()
  const confirm = useConfirm()
  const [createOpen, setCreateOpen] = useState(false)
  const [freshlyMinted, setFreshlyMinted] = useState<
    | { name: string; secret: string }
    | null
  >(null)

  const liveKeys = useMemo(() => keys.filter((k) => !k.revokedAt), [keys])
  const revokedKeys = useMemo(() => keys.filter((k) => !!k.revokedAt), [keys])

  const onRevoke = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Revoke "${name}"?`,
      description:
        "Calls using this key will start failing immediately. This is not reversible — generate a new key if needed.",
      destructive: true,
    })
    if (!ok) return
    revokeApiKey(id)
    refresh()
    toast.success("Key revoked.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Developer</h1>
          <p className="text-muted-foreground">
            API keys for the public REST API. Every key is scoped — grant only what an integration needs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/developers" target="_blank">
              API docs <ExternalLink className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            New API key
          </Button>
        </div>
      </div>

      {/* Rate-limit primer card */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4 text-sm">
          <p className="font-semibold">
            <ShieldAlert className="mr-1 inline h-4 w-4 text-accent" /> Every key has a rate limit.
          </p>
          <p className="mt-1 text-muted-foreground">
            60 requests / minute and 1,000 requests / day per key. Every response includes <code className="rounded bg-muted px-1 text-[11px]">X-RateLimit-*</code> headers so your client can throttle proactively.{" "}
            <Link href="/developers#rate-limits" className="font-medium text-primary hover:underline">
              See full limits →
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Live keys */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Active keys ({liveKeys.length})</CardTitle>
          <CardDescription>
            We never store your secret in plaintext — only the last 4 chars are shown after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liveKeys.length === 0 ? (
            <div className="rounded-md border border-dashed border-border py-10 text-center">
              <Key className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">No keys yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Create one to start calling the API. You&apos;ll see the secret exactly once.
              </p>
              <Button onClick={() => setCreateOpen(true)} className="mt-4" size="sm">
                <KeyRound className="mr-2 h-4 w-4" />
                Generate your first key
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {liveKeys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{k.name}</p>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        tbc_…{k.lastFour}
                      </code>
                      <code className="text-[11px] text-muted-foreground">{k.id}</code>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt && (
                        <>
                          {" · "}
                          last used {new Date(k.lastUsedAt).toLocaleString()}
                        </>
                      )}
                      {k.note && <span className="ml-1">· {k.note}</span>}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevoke(k.id, k.name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Revoked keys — keep visible for audit; they can't be re-enabled */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revoked ({revokedKeys.length})</CardTitle>
            <CardDescription>
              Kept here for audit so you can match an old log line back to the key that produced it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {revokedKeys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="line-through">{k.name}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      tbc_…{k.lastFour}
                    </code>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Revoked {k.revokedAt ? new Date(k.revokedAt).toLocaleDateString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Fresh-secret reveal dialog */}
      <RevealDialog
        minted={freshlyMinted}
        onClose={() => setFreshlyMinted(null)}
      />
      {/* Create dialog */}
      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(secret, name) => {
          refresh()
          setCreateOpen(false)
          setFreshlyMinted({ name, secret })
        }}
      />
    </div>
  )
}

function CreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (secret: string, name: string) => void
}) {
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [scopes, setScopes] = useState<ApiScope[]>(["read:courses"])
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setName("")
    setNote("")
    setScopes(["read:courses"])
  }

  const submit = async () => {
    if (!name.trim() || scopes.length === 0 || busy) return
    setBusy(true)
    try {
      const { secret } = await createApiKey({
        name: name.trim(),
        scopes,
        note: note.trim() || undefined,
      })
      onCreated(secret, name.trim())
      reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New API key</DialogTitle>
          <DialogDescription>
            Give the key a name you&apos;ll recognise in logs. Scopes are enforced server-side.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Name *</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Zapier integration, Mobile app v1, Internal CRM…"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scopes *</Label>
            <div className="space-y-1.5">
              {ALL_SCOPES.map((s) => {
                const checked = scopes.includes(s.id)
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setScopes((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, s.id]))
                            : prev.filter((x) => x !== s.id),
                        )
                      }
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{s.id}</p>
                      <p className="text-[11px] text-muted-foreground">{s.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>
            {scopes.length === 0 && (
              <p className="inline-flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> Pick at least one scope.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="key-note">Note (optional)</Label>
            <Textarea
              id="key-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="What is this key for?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || scopes.length === 0 || busy}>
            <KeyRound className="mr-2 h-4 w-4" />
            Generate key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RevealDialog({
  minted,
  onClose,
}: {
  minted: { name: string; secret: string } | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Dialog open={!!minted} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{minted?.name} — save this now</DialogTitle>
          <DialogDescription>
            This is the only time we&apos;ll show the full secret. Copy it into your secret store, then close this window.
          </DialogDescription>
        </DialogHeader>
        {minted && (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <p className="font-mono break-all">{minted.secret}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(minted.secret)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                } catch {
                  /* clipboard blocked — user can long-press */
                }
              }}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-success" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy secret
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Lost it? Revoke this key and generate a new one — there&apos;s no recovery path by design.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            I&apos;ve saved it <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
