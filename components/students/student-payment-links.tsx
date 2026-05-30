"use client"

// Student payment link history — shows all invite/payment links
// sent to this student across all courses, with status, dates,
// amounts, and copy-link action.

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Mail,
  Send,
  XCircle,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  getStudentPaymentHistory,
  type StudentInviteHistory,
  type InviteStatus,
} from "@/lib/invite-client"
import { toast } from "sonner"

interface Props {
  studentId: number
  studentName: string
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700" },
  viewed: { label: "Viewed", color: "bg-indigo-100 text-indigo-700" },
  payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700" },
  claimed: { label: "Claimed", color: "bg-emerald-100 text-emerald-800" },
  expired: { label: "Expired", color: "bg-red-100 text-red-600" },
  revoked: { label: "Revoked", color: "bg-red-100 text-red-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
}

function formatINR(n: number): string {
  if (n <= 0) return "Free"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n)
}

function formatDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function StudentPaymentLinks({ studentId, studentName }: Props) {
  const [invites, setInvites] = useState<StudentInviteHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const result = await getStudentPaymentHistory(studentId)
      if (cancelled) return
      if ("error" in result) {
        setError(result.error)
      } else {
        setInvites(result.invites)
      }
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [studentId])

  // Group by course
  const byCourse = useMemo(() => {
    const map = new Map<string, { title: string; invites: StudentInviteHistory[] }>()
    for (const inv of invites) {
      const key = inv.course_id
      if (!map.has(key)) {
        map.set(key, { title: inv.course_title, invites: [] })
      }
      map.get(key)!.invites.push(inv)
    }
    return [...map.entries()]
  }, [invites])

  const totalPaid = invites.filter((i) => i.status === "paid" || i.status === "claimed").length
  const totalPending = invites.filter((i) => !["paid", "claimed", "expired", "revoked", "failed"].includes(i.status)).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Payment Links
        </CardTitle>
        <CardDescription>
          {loading ? (
            "Loading..."
          ) : invites.length === 0 ? (
            "No payment links sent to this student yet."
          ) : (
            <>
              {invites.length} link{invites.length !== 1 ? "s" : ""} across{" "}
              {byCourse.length} course{byCourse.length !== 1 ? "s" : ""}
              {totalPaid > 0 && (
                <> · <strong className="text-emerald-600">{totalPaid} paid</strong></>
              )}
              {totalPending > 0 && (
                <> · <strong className="text-amber-600">{totalPending} pending</strong></>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <XCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Send className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Send a payment link from any course&apos;s Payment Links tab.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {byCourse.map(([courseId, { title, invites: courseInvites }]) => (
              <div key={courseId} className="rounded-lg border">
                <div className="border-b bg-muted/30 px-4 py-2">
                  <p className="text-sm font-medium">{title}</p>
                </div>
                <ul className="divide-y">
                  {courseInvites.map((inv) => {
                    const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.draft
                    return (
                      <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] px-1.5 py-0", badge.color)}
                            >
                              {badge.label}
                            </Badge>
                            <span className="text-sm font-semibold">
                              {formatINR(inv.final_price)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Created {formatDate(inv.created_at)}
                            {inv.sent_at && <> · Sent {formatDate(inv.sent_at)}</>}
                            {inv.sent_via && <> via {inv.sent_via}</>}
                            {inv.paid_at && (
                              <span className="text-emerald-600"> · Paid {formatDate(inv.paid_at)}</span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(inv.url).then(() => {
                              toast.success("Payment link copied!")
                            }).catch(() => {})
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Copy Link
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
