"use client"

// Shared message composer — single student, group, or workspace-wide
// blast. Used from the student detail page (Send email button), the
// students list (bulk message), and anywhere else the teacher needs to
// send something to one or many recipients across one or many channels.
//
// What it does on send:
//   1. Writes a Message record to lms-store so the dashboard can show
//      "what was sent" history per student + per send.
//   2. For each recipient × channel combo, posts the appropriate
//      delivery — in-app notifications via lms-store, emails via
//      /api/email/send, WhatsApp via the same /api/email/send route
//      (best-effort, will no-op gracefully when no provider is wired).
//   3. Closes the dialog and bubbles the saved Message up via onSent.

import { useMemo, useState } from "react"
import {
  Bell,
  Eye,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { RichTextContent, isRichTextEmpty } from "@/components/editor/rich-text-content"
import { uploadAsset } from "@/lib/upload-asset"
import {
  generateId,
  useLMS,
  type Message,
  type MessageAttachment,
  type MessageChannel,
  type Notification,
  type User,
} from "@/lib/lms-store"
import { formatBytes } from "@/lib/lesson-utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The students this message will go to. Pass one for single-recipient,
  // many for bulk. Empty array shows "no recipients" empty state.
  recipients: User[]
  // Optional starter subject — e.g. "Live class tomorrow" or
  // "Reminder: assignment due Friday" — saves a few keystrokes.
  defaultSubject?: string
  // Optional starter body (Tiptap HTML).
  defaultBody?: string
  // Optional starter category (drives copy + small UI hint).
  defaultCategory?: string
  // Fires after a successful send with the saved Message.
  onSent?: (message: Message) => void
}

const CATEGORY_OPTIONS = [
  { value: "custom", label: "Custom message" },
  { value: "reminder", label: "Reminder" },
  { value: "live-class", label: "Live class link" },
  { value: "marketing", label: "Marketing / promo" },
  { value: "announcement", label: "Announcement" },
]

export function MessageComposer({
  open,
  onOpenChange,
  recipients,
  defaultSubject = "",
  defaultBody = "",
  defaultCategory = "custom",
  onSent,
}: Props) {
  const { currentUser, addMessage, addNotifications } = useLMS()
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [category, setCategory] = useState(defaultCategory)
  const [channels, setChannels] = useState<Record<MessageChannel, boolean>>({
    "in-app": true,
    email: true,
    whatsapp: false,
  })
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withEmail = recipients.filter((r) => !!r.email).length
  const withPhone = recipients.filter((r) => !!r.phone).length

  const canSend =
    recipients.length > 0 &&
    !!subject.trim() &&
    !isRichTextEmpty(body) &&
    (channels["in-app"] || channels.email || channels.whatsapp)

  const reset = () => {
    setSubject(defaultSubject)
    setBody(defaultBody)
    setCategory(defaultCategory)
    setChannels({ "in-app": true, email: true, whatsapp: false })
    setAttachments([])
    setError(null)
  }

  const handleAttach = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploaded: MessageAttachment[] = []
      for (const file of Array.from(files)) {
        const result = await uploadAsset(file)
        uploaded.push({
          url: result.url,
          filename: file.name,
          size: file.size,
          mime: file.type,
        })
      }
      setAttachments((prev) => [...prev, ...uploaded])
    } catch (e) {
      setError((e as Error).message ?? "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!canSend || !currentUser) return
    setSending(true)
    setError(null)
    try {
      const chosenChannels = (Object.keys(channels) as MessageChannel[]).filter((c) => channels[c])
      const now = new Date().toISOString()
      const message: Message = {
        id: generateId("msg"),
        senderId: currentUser.id,
        recipientIds: recipients.map((r) => r.id),
        channels: chosenChannels,
        subject: subject.trim(),
        body,
        attachments: attachments.length > 0 ? attachments : undefined,
        category,
        createdAt: now,
      }
      addMessage(message)

      // Fan-out: in-app notifications first (cheap, never fails).
      if (chosenChannels.includes("in-app")) {
        const entries: Notification[] = recipients.map((r) => ({
          id: generateId("notif"),
          userId: r.id,
          channel: "in-app" as const,
          type: `message.${category}`,
          title: subject.trim(),
          body: stripTags(body).slice(0, 200),
          createdAt: now,
          sentAt: now,
          status: "sent" as const,
          meta: { messageId: message.id, attachments: attachments.length },
        }))
        addNotifications(entries)
      }

      // Email: one POST per recipient (best-effort). Subject + HTML
      // both come from the composer; attachments are sent inline as
      // URLs because the basic /api/email/send shape takes only HTML.
      if (chosenChannels.includes("email")) {
        const attachmentHtml =
          attachments.length === 0
            ? ""
            : `<p style="margin-top:16px;font-size:13px;color:#6b7280"><strong>Attachments:</strong></p>
               <ul style="font-size:13px;color:#1f2937;padding-left:20px">${attachments
                 .map(
                   (a) =>
                     `<li><a href="${escapeHtml(a.url)}" style="color:#0a3024">${escapeHtml(a.filename)}</a>${a.size ? ` <span style="color:#9ca3af">(${formatBytes(a.size)})</span>` : ""}</li>`,
                 )
                 .join("")}</ul>`
        const html = `${body}${attachmentHtml}`
        await Promise.allSettled(
          recipients
            .filter((r) => !!r.email)
            .map((r) =>
              fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: r.email,
                  subject: subject.trim(),
                  html,
                  replyTo: currentUser.email,
                }),
              }),
            ),
        )
      }

      // WhatsApp: stub — sends a small JSON payload to the same email
      // route under a different "channel" hint. The backend can route
      // these to a WhatsApp provider when wired; until then it's a
      // no-op + a Message record on the dashboard.
      if (chosenChannels.includes("whatsapp")) {
        await Promise.allSettled(
          recipients
            .filter((r) => !!r.phone)
            .map((r) =>
              fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: r.email || `${r.phone}@whatsapp.local`,
                  subject: `[WhatsApp] ${subject.trim()}`,
                  text: `WhatsApp message to ${r.phone}:\n\n${stripTags(body)}`,
                }),
              }),
            ),
        )
      }

      onSent?.(message)
      onOpenChange(false)
      reset()
    } catch (e) {
      setError((e as Error).message ?? "Send failed")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="flex max-h-[120vh] max-w-3xl sm:max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            {recipients.length > 1 ? `Message ${recipients.length} students` : "Send message"}
          </DialogTitle>
          <DialogDescription>
            {recipients.length === 0
              ? "No recipients selected."
              : recipients.length === 1
              ? `To ${recipients[0].name} <${recipients[0].email}>`
              : `${recipients.length} recipients · ${withEmail} with email · ${withPhone} with phone`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="compose" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full shrink-0 grid-cols-2">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview" disabled={!subject.trim() || isRichTextEmpty(body)}>
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            {/* Recipients chip */}
            {recipients.length > 1 && (
              <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-sm">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {recipients.length} recipients
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {recipients.slice(0, 8).map((r) => r.name).join(", ")}
                    {recipients.length > 8 && ` + ${recipients.length - 8} more`}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="msg-subject">Subject *</Label>
                <Input
                  id="msg-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    category === "live-class"
                      ? "Live class tomorrow at 6pm"
                      : category === "reminder"
                      ? "Reminder: assignment due Friday"
                      : "What's this about?"
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Body *</Label>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Write your message — links, formatting, embedded video all work."
                minHeight={200}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-muted/40">
                  <Paperclip className="h-3.5 w-3.5" />
                  {uploading ? "Uploading…" : "Add files"}
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => handleAttach(e.target.files)}
                  />
                </label>
                <span className="text-[11px] text-muted-foreground">
                  PDFs, images, video — sent as inline links in the email body.
                </span>
              </div>
              {attachments.length > 0 && (
                <ul className="space-y-1.5">
                  {attachments.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{a.filename}</span>
                      {a.size && (
                        <span className="text-[11px] text-muted-foreground">{formatBytes(a.size)}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <Label>Send via</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                <ChannelToggle
                  icon={<Bell className="h-4 w-4 text-primary" />}
                  label="In-app"
                  count={recipients.length}
                  checked={channels["in-app"]}
                  onChange={(v) => setChannels((c) => ({ ...c, "in-app": v }))}
                />
                <ChannelToggle
                  icon={<Mail className="h-4 w-4 text-primary" />}
                  label="Email"
                  count={withEmail}
                  checked={channels.email}
                  onChange={(v) => setChannels((c) => ({ ...c, email: v }))}
                />
                <ChannelToggle
                  icon={<MessageSquare className="h-4 w-4 text-primary" />}
                  label="WhatsApp"
                  count={withPhone}
                  checked={channels.whatsapp}
                  onChange={(v) => setChannels((c) => ({ ...c, whatsapp: v }))}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="border-b border-border pb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {category} — subject
                </p>
                <h3 className="mt-1 font-serif text-xl font-bold tracking-tight">
                  {subject || "—"}
                </h3>
              </div>
              <div className="mt-4">
                <RichTextContent html={body} />
              </div>
              {attachments.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Attachments
                  </p>
                  <ul className="mt-2 space-y-1">
                    {attachments.map((a, i) => (
                      <li key={i} className="text-sm">
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {a.filename}
                        </a>
                        {a.size && <span className="ml-2 text-[11px] text-muted-foreground">{formatBytes(a.size)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              This is what each recipient sees in their inbox / notification tray.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend || sending}>
            {sending ? (
              "Sending…"
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Send to {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChannelToggle({
  icon,
  label,
  count,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  count: number
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const disabled = count === 0
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground">{count} can receive</p>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim()
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Also expose a thin trigger-button helper so callers don't have to
// manage open state when they just want a one-line "Message" button.
export function MessageButton({
  recipients,
  label = "Send message",
  ...rest
}: {
  recipients: User[]
  label?: string
  defaultSubject?: string
  defaultBody?: string
  defaultCategory?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={recipients.length === 0}>
        <Send className="mr-1.5 h-4 w-4" />
        {label}
      </Button>
      <MessageComposer open={open} onOpenChange={setOpen} recipients={recipients} {...rest} />
    </>
  )
}
