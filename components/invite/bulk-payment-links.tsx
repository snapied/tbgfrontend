"use client"

// Bulk payment links panel for a specific course.
//
// Data sources:
//   - Students & enrollments: from useLMS() (frontend store)
//   - Invites: from GET /api/invites?course_id=X (backend)
//
// Lets the instructor:
//   - See paid/unpaid/pending status for every student
//   - Fuzzy search by name, email, phone
//   - Multi-select + "select all filtered"
//   - Bulk send payment links via Email / WhatsApp

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCcw,
  Search,
  Send,
  Users,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  listInvites,
  bulkCreateInvites,
  type InviteListItem,
  type BulkInviteResponse,
} from "@/lib/invite-client"
import { useLMS, type User } from "@/lib/lms-store"
import { cn } from "@/lib/utils"

type PaymentFilter = "all" | "paid" | "unpaid" | "pending" | "expired" | "never_invited"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
  unpaid: { label: "Unpaid", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Clock },
  pending: { label: "Pending", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  expired: { label: "Expired", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  never_invited: { label: "Not Invited", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", icon: Users },
}

function formatINR(n: number): string {
  if (n <= 0) return "Free"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n)
}

interface StudentRow {
  id: string
  name: string
  email: string
  phone?: string
  enrolled: boolean
  paymentStatus: PaymentFilter
  invite: InviteListItem | null
}

interface BulkPaymentLinksProps {
  courseId: string
  courseTitle: string
  coursePrice: number
}

export function BulkPaymentLinks({ courseId, courseTitle, coursePrice }: BulkPaymentLinksProps) {
  const { students, enrollments } = useLMS()

  // Invites from backend
  const [invites, setInvites] = useState<InviteListItem[]>([])
  const [invitesLoading, setInvitesLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<PaymentFilter>("all")

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Bulk send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendChannel, setSendChannel] = useState<"email" | "whatsapp" | "both">("email")
  const [adminNote, setAdminNote] = useState("")
  const [expiryDays, setExpiryDays] = useState("7")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<BulkInviteResponse | null>(null)

  const fetchInvites = useCallback(async () => {
    setInvitesLoading(true)
    const result = await listInvites(courseId)
    if (!("error" in result)) {
      setInvites(result.invites)
    }
    setInvitesLoading(false)
  }, [courseId])

  useEffect(() => { void fetchInvites() }, [fetchInvites])

  // Build merged rows: students + enrollments + invites
  const rows = useMemo(() => {
    const courseEnrollments = enrollments.filter((e) => e.courseId === courseId)
    const enrolledStudentIds = new Set(courseEnrollments.map((e) => e.studentId))

    // Build invite lookup by email (latest per email)
    const inviteByEmail = new Map<string, InviteListItem>()
    for (const inv of invites) {
      if (inv.recipient_email) {
        const email = inv.recipient_email.toLowerCase()
        if (!inviteByEmail.has(email)) inviteByEmail.set(email, inv)
      }
    }

    return students.map((s): StudentRow => {
      const enrolled = enrolledStudentIds.has(s.id)
      const invite = s.email ? inviteByEmail.get(s.email.toLowerCase()) ?? null : null

      let paymentStatus: PaymentFilter = "never_invited"
      if (enrolled) {
        paymentStatus = "paid"
      } else if (invite) {
        if (invite.status === "paid" || invite.status === "claimed") paymentStatus = "paid"
        else if (invite.status === "payment_pending") paymentStatus = "pending"
        else if (invite.status === "expired" || invite.status === "revoked") paymentStatus = "expired"
        else paymentStatus = "unpaid"
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        enrolled,
        paymentStatus,
        invite,
      }
    })
  }, [students, enrollments, invites, courseId])

  // Summary counts
  const summary = useMemo(() => {
    const s: Record<string, number> = { total: rows.length, paid: 0, unpaid: 0, pending: 0, expired: 0, never_invited: 0 }
    for (const r of rows) {
      s[r.paymentStatus] = (s[r.paymentStatus] || 0) + 1
    }
    return s
  }, [rows])

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = rows

    if (filter !== "all") {
      result = result.filter((r) => r.paymentStatus === filter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((r) => {
        const haystack = [r.name, r.email, r.phone].filter(Boolean).join(" ").toLowerCase()
        return q.split(/\s+/).every((word) => haystack.includes(word))
      })
    }

    return result
  }, [rows, filter, search])

  // Selection helpers
  const selectableRows = useMemo(
    () => filteredRows.filter((r) => r.paymentStatus !== "paid"),
    [filteredRows],
  )
  const selectableIds = useMemo(() => new Set(selectableRows.map((r) => r.id)), [selectableRows])
  const allSelectableSelected = selectableIds.size > 0 && [...selectableIds].every((id) => selected.has(id))

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelectableSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const id of selectableIds) next.delete(id)
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const id of selectableIds) next.add(id)
        return next
      })
    }
  }

  async function handleBulkSend() {
    if (selected.size === 0) return
    setSending(true)
    setSendResult(null)

    // Get selected students' details
    const selectedStudents = rows.filter((r) => selected.has(r.id))

    const result = await bulkCreateInvites({
      course_id: courseId,
      course_price: coursePrice,
      students: selectedStudents.map((s) => ({
        name: s.name,
        email: s.email,
        phone: s.phone,
      })),
      send_via: sendChannel,
      admin_note: adminNote.trim() || undefined,
      expires_in_days: parseInt(expiryDays, 10) || 7,
    })

    if ("error" in result) {
      toast.error(result.error)
    } else {
      setSendResult(result)
      toast.success(
        `${result.summary.created} created, ${result.summary.resent} resent, ${result.summary.skipped} skipped. ${result.summary.emails_sent} emails sent.`,
      )
      void fetchInvites()
      setSelected(new Set())
    }
    setSending(false)
  }

  function handleCopyLinks() {
    const links = filteredRows
      .filter((r) => selected.has(r.id) && r.invite)
      .map((r) => `${r.name}: ${window.location.origin}${r.invite!.url}`)
      .join("\n")
    if (!links) {
      toast.error("No existing links to copy. Send payment links first.")
      return
    }
    navigator.clipboard.writeText(links).then(() => {
      toast.success(`${links.split("\n").length} links copied.`)
    }).catch(() => toast.error("Failed to copy"))
  }

  if (students.length === 0 && !invitesLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No students in your workspace yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add students first, then come back to send payment links.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {([
          { key: "all" as const, label: "Total", value: summary.total, color: "text-foreground" },
          { key: "paid" as const, label: "Paid", value: summary.paid, color: "text-emerald-600" },
          { key: "unpaid" as const, label: "Unpaid", value: summary.unpaid, color: "text-amber-600" },
          { key: "pending" as const, label: "Pending", value: summary.pending, color: "text-blue-600" },
          { key: "expired" as const, label: "Expired", value: summary.expired, color: "text-red-600" },
          { key: "never_invited" as const, label: "Not Invited", value: summary.never_invited, color: "text-slate-500" },
        ]).map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
              filter === s.key && "ring-2 ring-primary bg-primary/5",
            )}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Search + actions bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button variant="outline" size="sm" onClick={fetchInvites} title="Refresh invites">
              <RefreshCcw className={cn("h-4 w-4", invitesLoading && "animate-spin")} />
            </Button>

            {selected.size > 0 && (
              <div className="flex items-center gap-2 rounded-lg border bg-primary/5 px-3 py-1.5">
                <span className="text-sm font-medium">
                  {selected.size} selected
                </span>
                <Button
                  size="sm"
                  onClick={() => setSendDialogOpen(true)}
                  className="h-7"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Send Payment Links
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLinks}
                  className="h-7"
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Links
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student table */}
      <Card>
        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {search ? "No students match your search." : "No students in this category."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="w-10 p-3">
                      <Checkbox
                        checked={allSelectableSelected && selectableIds.size > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Student</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Contact</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Invite</th>
                    <th className="w-10 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => {
                    const cfg = STATUS_CONFIG[r.paymentStatus] || STATUS_CONFIG.never_invited
                    const isPaid = r.paymentStatus === "paid"
                    const Icon = cfg.icon

                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/20",
                          selected.has(r.id) && "bg-primary/5",
                        )}
                      >
                        <td className="p-3">
                          {!isPaid ? (
                            <Checkbox
                              checked={selected.has(r.id)}
                              onCheckedChange={() => toggleSelect(r.id)}
                            />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{r.name}</p>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            {r.email && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" /> {r.email}
                              </span>
                            )}
                            {r.phone && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MessageCircle className="h-3 w-3" /> {r.phone}
                              </span>
                            )}
                            {!r.email && !r.phone && (
                              <span className="text-xs text-muted-foreground italic">No contact info</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className={cn("text-xs gap-1", cfg.color)}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {r.invite ? (
                            <div className="space-y-0.5">
                              <p className="text-xs">
                                {formatINR(r.invite.final_price)}
                                {r.invite.sent_via && (
                                  <span className="ml-1 text-muted-foreground">
                                    via {r.invite.sent_via}
                                  </span>
                                )}
                              </p>
                              {r.invite.sent_at && (
                                <p className="text-[11px] text-muted-foreground">
                                  Sent {new Date(r.invite.sent_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </p>
                              )}
                              {r.invite.paid_at && (
                                <p className="text-[11px] text-emerald-600">
                                  Paid {new Date(r.invite.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {r.invite && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const url = `${window.location.origin}${r.invite!.url}`
                                navigator.clipboard.writeText(url).then(() => {
                                  toast.success("Link copied!")
                                }).catch(() => {})
                              }}
                              title="Copy payment link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

      {/* Bulk send dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={(open) => {
        if (!open) { setSendResult(null) }
        setSendDialogOpen(open)
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Payment Links
            </DialogTitle>
            <DialogDescription>
              {selected.size} student{selected.size !== 1 ? "s" : ""} selected for {courseTitle}
            </DialogDescription>
          </DialogHeader>

          {sendResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-emerald-50 p-4 dark:bg-emerald-900/20">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Done!
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>{sendResult.summary.created} new invites created</li>
                  <li>{sendResult.summary.resent} existing invites resent</li>
                  <li>{sendResult.summary.skipped} skipped (already enrolled or no email)</li>
                  <li>{sendResult.summary.emails_sent} emails sent</li>
                </ul>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSendDialogOpen(false); setSendResult(null) }}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Send via</Label>
                <Select value={sendChannel} onValueChange={(v) => setSendChannel(v as typeof sendChannel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</span>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</span>
                    </SelectItem>
                    <SelectItem value="both">
                      <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Email + WhatsApp</span>
                    </SelectItem>
                    <SelectItem value="none">
                      <span className="flex items-center gap-2"><Copy className="h-4 w-4" /> Create links only</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Note to students (optional)</Label>
                <Textarea
                  placeholder="Hi! We'd love for you to join this course..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Link expiry</Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex justify-between text-sm">
                  <span>Course price</span>
                  <span className="font-semibold">{formatINR(coursePrice)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Students with existing active invites get a reminder. Already-enrolled students are skipped.
                </p>
              </div>

              <Button
                onClick={handleBulkSend}
                disabled={sending || selected.size === 0}
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending to {selected.size} student{selected.size !== 1 ? "s" : ""}...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to {selected.size} student{selected.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
