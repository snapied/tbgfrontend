"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Gift,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
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
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import {
  DEFAULT_REFERRAL_REWARD,
  generateReferralCode,
  useReferrals,
  type Referral,
} from "@/lib/referral-store"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { PhoneInput } from "@/components/forms/phone-input"
import { DIAL_CODES } from "@/lib/phone-utils"

// Refer & Earn is free on every plan — referrals are a basic
// community/growth lever, not a paid marketing-toolkit feature.
export default function ReferralsPage() {
  const { referrals, addReferral, deleteReferral, stats } = useReferrals()
  const confirm = useConfirm()
  const { currentUser } = useLMS()
  const { currentTenant } = useTenant()
  const [search, setSearch] = useState("")
  const [composerOpen, setComposerOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Build the absolute invite URL for a given referral code. We use
  // window.location.origin client-side so it works in dev + prod + previews.
  const inviteUrl = (code: string): string => {
    const origin = typeof window === "undefined" ? "" : window.location.origin
    const tenant = currentTenant ? `&tenant=${currentTenant.slug}` : ""
    return `${origin}/r/${code}?ref=${code}${tenant}`
  }

  const filtered = useMemo(() => {
    if (!search) return referrals
    const q = search.toLowerCase()
    return referrals.filter(
      (r) =>
        r.inviteeName.toLowerCase().includes(q) ||
        r.inviteePhone.includes(q) ||
        r.code.toLowerCase().includes(q),
    )
  }, [referrals, search])

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code))
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Refer &amp; Earn</h1>
          <p className="text-muted-foreground">
            Invite a friend — when they join, you get <span className="font-semibold text-foreground">{DEFAULT_REFERRAL_REWARD}</span>.
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Refer a friend
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile icon={<Send className="h-5 w-5" />} label="Invites sent" value={stats.sent} />
        <StatTile icon={<CheckCircle2 className="h-5 w-5" />} label="Friends joined" value={stats.joined} accent />
        <StatTile icon={<Gift className="h-5 w-5" />} label="Rewards earned" value={stats.rewarded} />
        <StatTile icon={<Sparkles className="h-5 w-5" />} label="Pending" value={stats.pending} muted />
      </div>

      {/* Reward callout */}
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Gift className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Your reward</p>
            <p className="text-sm text-muted-foreground">
              Each friend who completes signup unlocks <span className="font-medium text-foreground">{DEFAULT_REFERRAL_REWARD}</span> on your workspace. No cap. Stackable.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your invites</CardTitle>
          <CardDescription>
            {referrals.length === 0
              ? "You haven't referred anyone yet."
              : `${referrals.length} invite${referrals.length === 1 ? "" : "s"} sent so far.`}
          </CardDescription>
          {referrals.length > 0 && (
            <div className="relative mt-2 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {referrals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <UserPlus className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-semibold">Bring a friend on board.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tell us their name, country, and WhatsApp number — we&apos;ll give you a personal share link.
              </p>
              <Button onClick={() => setComposerOpen(true)} className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" /> Refer your first friend
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <ReferralRow
                  key={r.id}
                  referral={r}
                  inviteUrl={inviteUrl(r.code)}
                  copied={copied === r.code}
                  onCopy={() => copyLink(r.code)}
                  onDelete={async () => {
                    const ok = await confirm({
                      title: `Remove invite for ${r.inviteeName}?`,
                      destructive: true,
                      confirmLabel: "Remove",
                    })
                    if (!ok) return
                    deleteReferral(r.id)
                    toast.success("Invite removed.")
                  }}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onSubmit={(input) => {
          const code = generateReferralCode()
          const ref: Referral = {
            id: `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            code,
            referrerId: currentUser?.id ?? "owner",
            referrerName: currentUser?.name ?? currentTenant?.name ?? "Owner",
            referrerEmail: currentUser?.email ?? currentTenant?.ownerEmail ?? "",
            inviteeName: input.name,
            inviteeCountry: input.country,
            inviteePhone: input.phone,
            status: "pending",
            rewardLabel: DEFAULT_REFERRAL_REWARD,
            createdAt: new Date().toISOString(),
            notes: input.notes,
          }
          addReferral(ref)
          setComposerOpen(false)
          setCopied(code)
          // Auto-copy the freshly generated link so the user can paste it immediately.
          setTimeout(() => {
            const url = inviteUrl(code)
            navigator.clipboard?.writeText(url).catch(() => {})
            setTimeout(() => setCopied(null), 2000)
          }, 60)
        }}
      />
    </div>
  )
}

function ReferralRow({
  referral, inviteUrl, copied, onCopy, onDelete,
}: {
  referral: Referral
  inviteUrl: string
  copied: boolean
  onCopy: () => void
  onDelete: () => void
}) {
  const whatsappMessage = `Hey ${referral.inviteeName}! I think you'd love this — join me on ${inviteUrl}`
  const waLink = `https://wa.me/${referral.inviteePhone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <li className="space-y-2 px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {referral.inviteeName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{referral.inviteeName}</p>
          <p className="text-xs text-muted-foreground">
            {referral.inviteeCountry} · <span className="font-mono">{referral.inviteePhone}</span> · Code <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{referral.code}</span>
          </p>
        </div>
        <StatusBadge status={referral.status} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <code className="flex-1 truncate rounded bg-muted/60 px-2 py-1 font-mono text-[11px]">{inviteUrl}</code>
        <Button size="sm" variant="outline" onClick={onCopy}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> {copied ? "Copied" : "Copy link"}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={waLink} target="_blank" rel="noreferrer">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`mailto:?subject=Join%20me&body=${encodeURIComponent(whatsappMessage)}`}>
            <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
          </a>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          title="Remove invite"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  )
}

function StatusBadge({ status }: { status: Referral["status"] }) {
  if (status === "joined") {
    return (
      <Badge className="gap-1 bg-success text-success-foreground">
        <CheckCircle2 className="h-3 w-3" /> Joined
      </Badge>
    )
  }
  if (status === "rewarded") {
    return (
      <Badge className="gap-1 bg-primary text-primary-foreground">
        <Gift className="h-3 w-3" /> Rewarded
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Send className="h-3 w-3" /> Pending
    </Badge>
  )
}

function StatTile({
  icon, label, value, accent, muted,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: boolean
  muted?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            accent ? "bg-success/15 text-success"
              : muted ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Composer dialog
// ============================================================

function ComposerDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (input: { name: string; country: string; phone: string; notes?: string }) => void
}) {
  const [name, setName] = useState("")
  const [country, setCountry] = useState<string>("IN")
  const [phone, setPhone] = useState("")
  const [phoneValid, setPhoneValid] = useState(false)
  const [notes, setNotes] = useState("")

  const reset = () => {
    setName(""); setCountry("IN"); setPhone(""); setPhoneValid(false); setNotes("")
  }
  const canSubmit = !!name.trim() && !!country && phoneValid

  const countryName = DIAL_CODES.find((c) => c.iso === country)?.name ?? country

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refer a friend</DialogTitle>
          <DialogDescription>
            We&apos;ll generate a personal share link. When your friend signs up, you get the reward automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ref-name">Friend&apos;s name *</Label>
            <Input
              id="ref-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Sharma"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref-country">Country *</Label>
            <select
              id="ref-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              {DIAL_CODES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp number *</Label>
            <PhoneInput
              value={phone}
              onChange={(e164, valid) => { setPhone(e164); setPhoneValid(valid) }}
              required
              whatsapp
              placeholder="98765 43210"
            />
            {!phoneValid && phone && (
              <p className="inline-flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> Enter a valid WhatsApp number for {countryName}.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref-notes">Note (optional)</Label>
            <Textarea
              id="ref-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="A private note for yourself, e.g. 'Met at Bangalore design jam'."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!canSubmit) return
              onSubmit({
                name: name.trim(),
                country: countryName,
                phone,
                notes: notes.trim() || undefined,
              })
              reset()
            }}
            disabled={!canSubmit}
          >
            <Plus className="mr-2 h-4 w-4" /> Generate share link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
