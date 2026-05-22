"use client"

// Refer & Earn — student edition. Reuses the existing referrals
// store and code generator; surfaces:
//   • Your shareable invite link (`/r/<code>`) — copy + WhatsApp.
//   • Per-referral stats (sent / joined / rewarded).
//   • A history list of who you've invited and where they are in the
//     funnel. Same Referral records the teacher's /dashboard/referrals
//     page reads, just filtered to ones the student themselves sent.
//
// Submit form is intentionally minimal (name + WhatsApp) — anything
// more becomes friction. The invitee picks up the rest at signup.

import { useMemo, useState } from "react"
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Share2,
  Sparkles,
  UserPlus,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  useReferrals,
  generateReferralCode,
  DEFAULT_REFERRAL_REWARD,
  type Referral,
} from "@/lib/referral-store"
import { useLMS } from "@/lib/lms-store"
import { toast } from "sonner"

export default function MyReferralsPage() {
  const { currentUser } = useLMS()
  const { referrals, addReferral } = useReferrals()

  // The student's own referrals — filter the workspace pool down to
  // ones where they're the referrer.
  const mine = useMemo<Referral[]>(() => {
    if (!currentUser) return []
    return referrals
      .filter((r) => r.referrerId === currentUser.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [referrals, currentUser])

  const stats = useMemo(
    () => ({
      sent: mine.length,
      joined: mine.filter((r) => r.status === "joined" || r.status === "rewarded").length,
      rewarded: mine.filter((r) => r.status === "rewarded").length,
      pending: mine.filter((r) => r.status === "pending").length,
    }),
    [mine],
  )

  // Shareable code. We reuse the most-recent code so the student has
  // ONE link to share everywhere — every new manual invite adds a
  // pending record under the same code's "shape" but with its own
  // generated code, while the share-link control just points at the
  // student's first generated code. Simpler mental model.
  const shareCode = mine[0]?.code
  const shareUrl =
    typeof window !== "undefined" && shareCode
      ? `${window.location.origin}/r/${shareCode}`
      : ""

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const submit = async () => {
    if (!currentUser) return
    if (!name.trim() || !phone.trim()) {
      toast.error("Add a name and a WhatsApp number first.")
      return
    }
    setSubmitting(true)
    try {
      const code = generateReferralCode()
      const ref: Referral = {
        id: `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        code,
        referrerId: currentUser.id,
        referrerName: currentUser.name,
        referrerEmail: currentUser.email,
        inviteeName: name.trim(),
        inviteeCountry: currentUser.country ?? "",
        inviteePhone: phone.trim(),
        status: "pending",
        rewardLabel: DEFAULT_REFERRAL_REWARD,
        createdAt: new Date().toISOString(),
      }
      addReferral(ref)
      setName("")
      setPhone("")
      toast.success(`Invite ready for ${ref.inviteeName} — copy the link to share.`)
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Link copied.")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy. Long-press the field to copy manually.")
    }
  }

  const whatsappShare = (phoneE164: string, url: string, inviteeName: string) => {
    const message = `Hi ${inviteeName}, joining ${window.location.host} via my invite gets us both a small reward 🎁\n\n${url}`
    const cleaned = phoneE164.replace(/[^0-9+]/g, "")
    return `https://wa.me/${cleaned.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to invite friends.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Refer & earn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {DEFAULT_REFERRAL_REWARD}. Send your friends an invite link — when they join, you both get the reward.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="Invites sent" value={stats.sent} />
        <StatTile label="Joined" value={stats.joined} accent="emerald" />
        <StatTile label="Pending" value={stats.pending} accent="amber" />
        <StatTile label="Rewards earned" value={stats.rewarded} accent="violet" />
      </div>

      {/* Share-link block — only shown once the student has generated
          at least one invite (so the link is real and trackable). */}
      {shareUrl && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              Your invite link
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={shareUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button size="sm" onClick={() => copyLink(shareUrl)}>
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Same link for every friend — we attribute joins back to you automatically.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Invite a friend
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Their name</Label>
              <Input
                id="r-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rohan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-phone">WhatsApp number</Label>
              <Input
                id="r-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              Generate invite
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {mine.length === 0 ? (
            <div className="py-12 text-center">
              <UserPlus className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">No invites yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a friend above and we&apos;ll give you a sharable link.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {mine.map((r) => {
                const inviteUrl =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/r/${r.code}`
                    : `/r/${r.code}`
                return (
                  <li key={r.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{r.inviteeName}</p>
                        <Badge
                          variant={
                            r.status === "rewarded"
                              ? "default"
                              : r.status === "joined"
                                ? "secondary"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.inviteePhone} · code <code className="font-mono">{r.code}</code>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(inviteUrl)}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy link
                      </Button>
                      {r.inviteePhone && (
                        <Button size="sm" asChild>
                          <a
                            href={whatsappShare(r.inviteePhone, inviteUrl, r.inviteeName)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
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

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: "emerald" | "amber" | "violet"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-1 text-2xl font-bold tabular-nums ${
            accent === "emerald"
              ? "text-emerald-600"
              : accent === "amber"
                ? "text-amber-600"
                : accent === "violet"
                  ? "text-violet-600"
                  : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
