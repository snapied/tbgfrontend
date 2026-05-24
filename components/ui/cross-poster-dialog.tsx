"use client"

// CrossPosterDialog — picks channels + composes a quick caption,
// then invokes `postToChannels`. Replaces the per-row "Pin to
// community" dialogs across Blog, Pages, Testimonials, Whiteboard.
//
// Layout: header + artifact preview card on top, channel toggles
// + per-channel detail panels below, action footer at the bottom.

import { useMemo, useState } from "react"
import {
  Bell,
  CheckCircle2,
  Linkedin,
  Mail,
  MessageCircle,
  Send,
  Twitter,
  Users2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useLMS, generateId } from "@/lib/lms-store"
import {
  postToChannels,
  type ChannelSelections,
  type CrossPosterArtifact,
} from "@/lib/cross-poster"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  artifact: CrossPosterArtifact
  /** Optional channels the host wants to suppress (e.g. "no
   *  WhatsApp for this artifact"). When omitted, all channels show. */
  disabledChannels?: Set<keyof ChannelSelections>
  /** Default selection — by default we tick "communities" since
   *  that's the most-used path for course-creator artifacts. */
  defaultSelections?: ChannelSelections
}

export function CrossPosterDialog({
  open,
  onOpenChange,
  artifact,
  disabledChannels,
  defaultSelections,
}: Props) {
  const { studentGroups, users, addBatchPost, currentUser } = useLMS()

  const [linkedin, setLinkedin] = useState(!!defaultSelections?.linkedin)
  const [x, setX] = useState(!!defaultSelections?.x)
  const [whatsappOn, setWhatsappOn] = useState(!!defaultSelections?.whatsapp)
  const [whatsappBroadcast, setWhatsappBroadcast] = useState(true)
  const [whatsappNumbers, setWhatsappNumbers] = useState("")
  const [communities, setCommunities] = useState<Set<string>>(
    new Set(defaultSelections?.communities ?? (studentGroups[0]?.id ? [studentGroups[0].id] : [])),
  )
  const [emailOn, setEmailOn] = useState(!!defaultSelections?.email)
  const [emailRecipients, setEmailRecipients] = useState<string>(
    defaultSelections?.email?.to.join(", ") ?? "",
  )
  const [caption, setCaption] = useState<string>(
    `Just published ${artifact.title} — link below 👇`,
  )
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{ succeeded: string[]; failed: { channel: string; reason: string }[] } | null>(null)

  const hidden = useMemo(() => disabledChannels ?? new Set<keyof ChannelSelections>(), [disabledChannels])

  const anySelected =
    linkedin ||
    x ||
    whatsappOn ||
    communities.size > 0 ||
    (emailOn && emailRecipients.trim().length > 0)

  const handleSubmit = async () => {
    setSubmitting(true)
    setLastResult(null)
    // Compose per-channel messages from the same caption + URL. The
    // postToChannels primitive lets callers override per channel; we
    // keep it simple here.
    const composedArtifact: CrossPosterArtifact = {
      ...artifact,
      description: caption.trim() || artifact.description,
    }
    const channels: ChannelSelections = {
      linkedin: linkedin || undefined,
      x: x || undefined,
      whatsapp: whatsappOn
        ? whatsappBroadcast
          ? { broadcast: true }
          : { numbers: whatsappNumbers.split(/[,\s]+/).filter(Boolean) }
        : undefined,
      communities: communities.size > 0 ? Array.from(communities) : undefined,
      email:
        emailOn && emailRecipients.trim()
          ? {
              to: emailRecipients.split(/[,\s]+/).filter((s) => s.includes("@")),
              subject: artifact.title,
            }
          : undefined,
    }
    const result = await postToChannels({
      artifact: composedArtifact,
      channels,
      deps: { addBatchPost, generateId, currentUser: currentUser ?? undefined },
    })
    setLastResult({ succeeded: result.succeeded, failed: result.failed })
    setSubmitting(false)
    if (result.failed.length === 0) {
      toast.success(`Posted to ${result.succeeded.length} ${result.succeeded.length === 1 ? "channel" : "channels"}.`)
      onOpenChange(false)
    } else {
      toast.warning(`Posted to ${result.succeeded.length}, failed on ${result.failed.length}`, {
        description: result.failed.map((f) => `${f.channel}: ${f.reason}`).join(" · "),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Send className="h-5 w-5 text-primary" />
            Share to channels
          </DialogTitle>
          <DialogDescription>
            One submission, multiple destinations. We don&rsquo;t auto-post anywhere — channels that need user confirmation open in a new tab.
          </DialogDescription>
        </DialogHeader>

        {/* Artifact preview */}
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {artifact.kind}
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold">{artifact.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{artifact.url}</p>
        </div>

        {/* Caption */}
        <div className="space-y-1.5">
          <Label>Caption</Label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="Short + warm. Specifics beat formal copy."
          />
          <p className="text-[11px] text-muted-foreground">
            Same caption goes to every channel. Each channel appends the link automatically.
          </p>
        </div>

        {/* Channel toggles */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Channels
          </p>
          <div className="grid grid-cols-2 gap-2">
            {!hidden.has("linkedin") && (
              <ChannelToggle
                icon={<Linkedin className="h-4 w-4" />}
                label="LinkedIn"
                hint="Opens the LinkedIn share dialog"
                checked={linkedin}
                onChange={setLinkedin}
              />
            )}
            {!hidden.has("x") && (
              <ChannelToggle
                icon={<Twitter className="h-4 w-4" />}
                label="X"
                hint="Opens the tweet composer"
                checked={x}
                onChange={setX}
              />
            )}
            {!hidden.has("whatsapp") && (
              <ChannelToggle
                icon={<MessageCircle className="h-4 w-4" />}
                label="WhatsApp"
                hint="Opens wa.me with the caption pre-filled"
                checked={whatsappOn}
                onChange={setWhatsappOn}
              />
            )}
            {!hidden.has("email") && (
              <ChannelToggle
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                hint="Drafts a mailto with BCC"
                checked={emailOn}
                onChange={setEmailOn}
              />
            )}
          </div>
        </div>

        {/* WhatsApp details */}
        {whatsappOn && (
          <div className="space-y-2 rounded-md border border-border bg-card p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              WhatsApp
            </p>
            <label className="flex items-center gap-2 text-[12px]">
              <Checkbox
                checked={whatsappBroadcast}
                onCheckedChange={(v) => setWhatsappBroadcast(!!v)}
              />
              Open the share-anywhere screen (lets you pick recipients in WhatsApp)
            </label>
            {!whatsappBroadcast && (
              <div className="space-y-1.5">
                <Label className="text-[12px]">Recipient numbers</Label>
                <Textarea
                  value={whatsappNumbers}
                  onChange={(e) => setWhatsappNumbers(e.target.value)}
                  rows={2}
                  placeholder="+91 98765 43210, +44 7700 900123"
                />
                <p className="text-[10.5px] text-muted-foreground">
                  We open wa.me per number with a 250ms stagger so the browser doesn&rsquo;t block the popups.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Communities */}
        {!hidden.has("communities") && (
          <div className="space-y-2 rounded-md border border-border bg-card p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Users2 className="h-3 w-3" />
              Communities
            </p>
            {studentGroups.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                No communities yet.
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {studentGroups.map((g) => {
                  const checked = communities.has(g.id)
                  return (
                    <label
                      key={g.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12.5px] hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = new Set(communities)
                          if (v) next.add(g.id)
                          else next.delete(g.id)
                          setCommunities(next)
                        }}
                      />
                      {g.name}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Email */}
        {emailOn && (
          <div className="space-y-2 rounded-md border border-border bg-card p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Email recipients
            </p>
            <Textarea
              value={emailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
              rows={2}
              placeholder="a@example.com, b@example.com"
            />
            <p className="text-[10.5px] text-muted-foreground">
              Goes via your mail client as BCC — comma-separated.
            </p>
            {users.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[11px]"
                onClick={() =>
                  setEmailRecipients(
                    users
                      .filter((u) => u.role === "student" && !!u.email)
                      .map((u) => u.email)
                      .join(", "),
                  )
                }
              >
                <Bell className="mr-1 h-3 w-3" />
                Fill with all students
              </Button>
            )}
          </div>
        )}

        {/* Last result */}
        {lastResult && (
          <div
            className={cn(
              "rounded-md border p-2 text-[11.5px]",
              lastResult.failed.length === 0
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
            )}
          >
            <p className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {lastResult.succeeded.length} of {lastResult.succeeded.length + lastResult.failed.length} sent
            </p>
            {lastResult.failed.length > 0 && (
              <p className="mt-0.5">
                Failed: {lastResult.failed.map((f) => f.channel).join(", ")}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!anySelected || submitting} className="gap-1.5">
            <Send className="h-4 w-4" />
            {submitting ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChannelToggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
          {icon}
          {label}
        </span>
        <span className="block text-[10.5px] text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}
