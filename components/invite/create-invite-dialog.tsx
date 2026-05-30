"use client"

// Admin dialog for creating invite/payment links.
//
// Supports three invite types:
//   - Personal   — sent to a specific person (name, email, phone)
//   - Reusable   — a generic link that anyone can use
//   - Negotiated — personal with an overridden (negotiated) price

import { useState } from "react"
import {
  Check,
  Copy,
  Link as LinkIcon,
  Loader2,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import {
  createInvite,
  type InviteCreateResult,
  type InviteType,
} from "@/lib/invite-client"

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n)
}

interface CreateInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  coursePrice: number
  onCreated?: (invite: InviteCreateResult) => void
}

type ExpiryOption = "7" | "14" | "30" | "custom"

export function CreateInviteDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  coursePrice,
  onCreated,
}: CreateInviteDialogProps) {
  // Form state
  const [inviteType, setInviteType] = useState<InviteType>("personal")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [overridePrice, setOverridePrice] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>("7")
  const [customDays, setCustomDays] = useState("")

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [createdInvite, setCreatedInvite] = useState<InviteCreateResult | null>(null)
  const [copied, setCopied] = useState(false)

  const isPersonal = inviteType === "personal" || inviteType === "negotiated"
  const showPriceOverride = inviteType === "negotiated"

  const expiryDays = expiryOption === "custom"
    ? parseInt(customDays, 10) || 7
    : parseInt(expiryOption, 10)

  const effectivePrice = showPriceOverride && overridePrice !== ""
    ? parseFloat(overridePrice)
    : coursePrice

  function resetForm() {
    setInviteType("personal")
    setRecipientName("")
    setRecipientEmail("")
    setRecipientPhone("")
    setOverridePrice("")
    setAdminNote("")
    setExpiryOption("7")
    setCustomDays("")
    setCreatedInvite(null)
    setCopied(false)
    setSubmitting(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  async function handleCreate(via: "email" | "copy_link" | "whatsapp") {
    setSubmitting(true)
    try {
      const input: Parameters<typeof createInvite>[0] = {
        type: inviteType,
        course_id: courseId,
        course_price: coursePrice,
        expires_in_days: expiryDays,
        sent_via: via,
      }
      if (isPersonal) {
        if (recipientName.trim()) input.recipient_name = recipientName.trim()
        if (recipientEmail.trim()) input.recipient_email = recipientEmail.trim()
        if (recipientPhone.trim()) input.recipient_phone = recipientPhone.trim()
      }
      if (showPriceOverride && overridePrice !== "") {
        input.override_price = parseFloat(overridePrice)
      }
      if (adminNote.trim()) {
        input.admin_note = adminNote.trim()
      }

      const result = await createInvite(input)
      if ("error" in result) {
        toast.error(result.error)
        return
      }

      setCreatedInvite(result)
      onCreated?.(result)

      if (via === "email") {
        toast.success("Invite sent by email!")
      } else if (via === "whatsapp") {
        toast.success("Invite link created! Share via WhatsApp.")
      } else {
        toast.success("Invite link created!")
      }
    } catch {
      toast.error("Failed to create invite")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyLink() {
    if (!createdInvite) {
      // Create first, then copy
      await handleCreate("copy_link")
      return
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/i/${createdInvite.token}`)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  function handleWhatsApp() {
    if (!createdInvite) return
    const text = encodeURIComponent(
      `You're invited to enroll in "${courseTitle}"!\n\n` +
      (adminNote ? `${adminNote}\n\n` : "") +
      `Enroll here: ${`${typeof window !== "undefined" ? window.location.origin : ""}/i/${createdInvite.token}`}`,
    )
    const phone = recipientPhone.replace(/\D/g, "")
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(url, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Create Invite
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {courseTitle} &mdash; {formatINR(coursePrice)}
          </DialogDescription>
        </DialogHeader>

        {/* ── Created state: show link + share actions ──────── */}
        {createdInvite ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Invite Link</span>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/i/${createdInvite.token}`}
                  onFocus={(e) => e.currentTarget.select()}
                  className="text-xs"
                />
                <Button
                  variant={copied ? "default" : "outline"}
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <><Check className="mr-1 h-3.5 w-3.5" /> Copied</>
                  ) : (
                    <><Copy className="mr-1 h-3.5 w-3.5" /> Copy</>
                  )}
                </Button>
              </div>
              {recipientName.trim() && (
                <p className="text-xs text-muted-foreground">
                  For: {recipientName.trim()}
                  {recipientEmail.trim() ? ` (${recipientEmail.trim()})` : ""}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Expires: {new Date(createdInvite.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {" "}&middot;{" "}Price: {formatINR(overridePrice !== "" ? Number(overridePrice) : coursePrice)}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="mr-1.5 h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => resetForm()}
              >
                Create Another
              </Button>
            </div>
          </div>
        ) : (
          /* ── Form state ─────────────────────────────────────── */
          <div className="space-y-5">
            {/* Invite type */}
              {/* <div className="space-y-2">
              <Label>Invite type</Label>
              <RadioGroup
                value={inviteType}
                onValueChange={(v) => setInviteType(v as InviteType)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="personal" id="type-personal" />
                  <Label htmlFor="type-personal" className="font-normal cursor-pointer">
                    Personal &mdash; for a specific person
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="reusable" id="type-reusable" />
                  <Label htmlFor="type-reusable" className="font-normal cursor-pointer">
                    Reusable &mdash; generic link for anyone
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="negotiated" id="type-negotiated" />
                  <Label htmlFor="type-negotiated" className="font-normal cursor-pointer">
                    Negotiated price &mdash; custom price for a person
                  </Label>
                </div>
              </RadioGroup>
            </div> */}

            {/* Recipient fields (hidden for reusable) */}
            {isPersonal && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recipient
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Name</Label>
                  <Input
                    id="invite-name"
                    placeholder="Jane Doe"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-phone">Phone (optional)</Label>
                  <Input
                    id="invite-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Price section */}
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pricing
              </p>
              <div className="flex justify-between text-sm">
                <span>Course price</span>
                <span className="font-medium">{formatINR(coursePrice)}</span>
              </div>
              {showPriceOverride && (
                <div className="space-y-1.5">
                  <Label htmlFor="invite-override-price">Override price</Label>
                  <Input
                    id="invite-override-price"
                    type="number"
                    min="0"
                    step="1"
                    placeholder={String(coursePrice)}
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.value)}
                  />
                </div>
                )}
              {(showPriceOverride && overridePrice !== "") && (
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>Final price</span>
                  <span>{formatINR(effectivePrice)}</span>
                </div>
              )}
            </div>

            {/* Admin note */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-note">Note to recipient (optional)</Label>
              <Textarea
                id="invite-note"
                placeholder="Hi! I'd love for you to join this course..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
              />
            </div>

            {/* Expiry selector */}
            <div className="space-y-1.5">
              <Label>Link expiry</Label>
              <div className="flex gap-2">
                <Select
                  value={expiryOption}
                  onValueChange={(v) => setExpiryOption(v as ExpiryOption)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {expiryOption === "custom" && (
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="Days"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="w-24"
                  />
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2">
              {isPersonal && recipientEmail.trim() && (
                <Button
                  onClick={() => handleCreate("email")}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send by Email
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await handleCreate("whatsapp")
                    // WhatsApp share happens after createdInvite is set
                  }}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  )}
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
