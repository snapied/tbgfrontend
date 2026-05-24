"use client"

// Invoices / payment history pulled from store-store. Every order
// where the student is the customer surfaces here with status, paid
// amount, currency, and a "view receipt" link. Instructors running the
// workspace can see what they've sold to this student at a glance.

import { useMemo, useState } from "react"
import Link from "next/link"
import { Download, ExternalLink, IndianRupee, Loader2, Mail, Receipt } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStore, type Order } from "@/lib/store-store"
import { formatMoney } from "@/lib/currency"
import type { User } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { toast } from "sonner"

interface Props {
  student: User
}

const STATUS_COLOR: Record<Order["status"], string> = {
  paid: "bg-success/15 text-success",
  pending: "bg-accent/15 text-accent",
  failed: "bg-destructive/15 text-destructive",
  refunded: "bg-destructive/15 text-destructive",
  canceled: "bg-muted text-muted-foreground",
}

export function StudentInvoices({ student }: Props) {
  const { orders } = useStore()
  const { currentTenant } = useTenant()
  // Track which receipt is currently emailing — per row so multiple
  // sends in parallel each show their own spinner.
  const [emailingId, setEmailingId] = useState<string | null>(null)

  // Open a print-friendly receipt in a new tab. We build the HTML on
  // the fly (so /order/[id] doesn't need a print branch) and trigger
  // window.print() once it loads, letting the browser save-as-PDF
  // through its native print dialog. No external library, no PDF
  // codegen on the server — works in every browser that can print.
  const downloadReceipt = (o: Order) => {
    const html = receiptHtml({
      order: o,
      tenantName: currentTenant?.name ?? "Workspace",
      tenantEmail: currentTenant?.ownerEmail,
      studentName: student.name,
      studentEmail: student.email,
    })
    const win = window.open("", "_blank", "noopener,width=820,height=900")
    if (!win) {
      toast.error("Couldn't open print window — check your browser's popup blocker.")
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    // Some browsers race the print() call against the document
    // ready state. Defer one tick + use addEventListener as backup.
    win.addEventListener("load", () => {
      setTimeout(() => win.print(), 250)
    })
  }

  // Mail the receipt to the student's address on file. Reuses the
  // same HTML the print path produces so the student gets the same
  // visual the teacher would print.
  const emailReceipt = async (o: Order) => {
    const to = student.email
    if (!to) {
      toast.error("This student has no email on file.")
      return
    }
    setEmailingId(o.id)
    try {
      const html = receiptHtml({
        order: o,
        tenantName: currentTenant?.name ?? "Workspace",
        tenantEmail: currentTenant?.ownerEmail,
        studentName: student.name,
        studentEmail: student.email,
        forEmail: true,
      })
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: `Receipt · ${o.productSnapshot.title}`,
          html,
          replyTo: currentTenant?.ownerEmail,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Receipt sent.", { description: to })
    } catch (err) {
      toast.error("Couldn't send the receipt.", {
        description: err instanceof Error ? err.message : "Try again in a moment.",
      })
    } finally {
      setEmailingId(null)
    }
  }

  // Match by customerId first, fall back to email so manually-recorded
  // (storefront) orders that didn't have a user record at the time
  // still attribute correctly.
  const studentOrders = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            o.customerId === student.id ||
            (!!student.email && o.customerEmail.toLowerCase() === student.email.toLowerCase()),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders, student.id, student.email],
  )

  // Lifetime paid totals — bucketed by currency. The prior code summed
  // every paid order into one number and labelled it with the FIRST
  // order's currency, which produced misleading figures the moment a
  // student bought one INR course and one USD course on the same
  // workspace. Now we render each currency separately.
  const totalsByCurrency = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of studentOrders) {
      if (o.status !== "paid") continue
      m.set(o.currency, (m.get(o.currency) ?? 0) + o.total)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [studentOrders])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Fees &amp; invoices
        </CardTitle>
        <CardDescription>
          {studentOrders.length === 0 ? (
            "No purchases yet."
          ) : (
            <>
                {studentOrders.length} order{studentOrders.length === 1 ? "" : "s"}
                {totalsByCurrency.length > 0 && (
                  <>
                    {" · "}
                    {totalsByCurrency.map(([cur, amt], i) => (
                      <span key={cur}>
                        <strong className="text-foreground">{formatMoney(amt, cur)}</strong>
                        {i < totalsByCurrency.length - 1 ? " + " : ""}
                      </span>
                    ))}{" "}
                    paid lifetime
                  </>
                )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {studentOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <IndianRupee className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              When the student buys a course or product, their receipts appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {studentOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {o.productSnapshot.title}
                    {o.testMode && (
                      <span
                        className="ml-1.5 inline-flex items-center rounded-sm border border-amber-500/40 bg-amber-500/10 px-1 py-0 align-middle font-mono text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300"
                        title="Test purchase — not a real customer order"
                      >
                        Test
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString()} · {o.paymentMethod}
                    {o.couponCode ? ` · coupon ${o.couponCode}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    STATUS_COLOR[o.status] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {o.status}
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {formatMoney(o.total, o.currency)}
                </span>
                {/* Per-row actions: download a printable receipt and
                    optionally email it to the student. Both reuse a
                    single inline-rendered HTML so visual stays
                    consistent across surfaces. */}
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => downloadReceipt(o)}
                    title="Open a printable receipt (Save as PDF from the print dialog)"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Receipt
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => void emailReceipt(o)}
                    disabled={emailingId === o.id || !student.email}
                    title={
                      student.email
                        ? "Email this receipt to the student"
                        : "Add an email on file first"
                    }
                  >
                    {emailingId === o.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Mail className="mr-1 h-3 w-3" />
                    )}
                    Email
                  </Button>
                  <Link
                    href={`/order/${o.id}`}
                    className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Open the order page"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// Build a self-contained printable receipt as an HTML string. The
// same payload is used by both the print path (open + window.print)
// and the email path (POSTed to /api/email/send as the HTML body).
//
// We inline all styles via a <style> block so the print view doesn't
// depend on the app's Tailwind build, and so the email client's
// CSS sandbox renders something readable even when modern selectors
// get stripped.
function receiptHtml({
  order,
  tenantName,
  tenantEmail,
  studentName,
  studentEmail,
  forEmail = false,
}: {
  order: Order
  tenantName: string
  tenantEmail?: string
  studentName: string
  studentEmail?: string
  forEmail?: boolean
}): string {
  const total = formatMoney(order.total, order.currency)
  const subtotal = formatMoney(order.subtotal, order.currency)
  const discount = order.discount
    ? formatMoney(order.discount, order.currency)
    : null
  const date = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const paid = order.paidAt
    ? new Date(order.paidAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : null

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Receipt · ${escapeHtml(order.productSnapshot.title)}</title>
<style>
  * { box-sizing: border-box }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    color: #1c1c1c; max-width: 720px; margin: 0 auto; padding: 32px;
    background: #fafaf7;
  }
  .card { background: #fff; border: 1px solid #e5e3da; border-radius: 12px; padding: 32px; }
  .hdr { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #e5e3da; padding-bottom: 16px; margin-bottom: 24px; }
  .hdr h1 { font-size: 18px; margin: 0; letter-spacing: 0.04em; text-transform: uppercase; color: #6b6b6b; }
  .hdr .total { font-size: 28px; font-weight: 700; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 13px; }
  .meta dt { color: #6b6b6b; margin-bottom: 4px; }
  .meta dd { margin: 0 0 12px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #f0eee6; }
  th { color: #6b6b6b; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  tfoot td { font-weight: 600; border-bottom: none; padding-top: 16px; }
  .right { text-align: right; }
  .status {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .status.paid { background: #e6f5ee; color: #036b3a; }
  .status.pending { background: #fff4d6; color: #8a6200; }
  .status.failed, .status.refunded { background: #fde8e8; color: #aa1f1f; }
  footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e3da; color: #6b6b6b; font-size: 12px; }
  ${forEmail ? "" : "@media print { body { background: #fff; padding: 0; } .card { border: none; padding: 0; } }"}
</style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <h1>Receipt</h1>
      <span class="total">${total}</span>
    </div>
    <dl class="meta">
      <div>
        <dt>From</dt>
        <dd>${escapeHtml(tenantName)}${tenantEmail ? `<br/><span style="color:#6b6b6b;font-weight:400">${escapeHtml(tenantEmail)}</span>` : ""}</dd>
        <dt>For</dt>
        <dd>${escapeHtml(studentName)}${studentEmail ? `<br/><span style="color:#6b6b6b;font-weight:400">${escapeHtml(studentEmail)}</span>` : ""}</dd>
      </div>
      <div>
        <dt>Order ID</dt>
        <dd style="font-family: ui-monospace, monospace; font-size: 12px;">${escapeHtml(order.id)}</dd>
        <dt>Date</dt>
        <dd>${escapeHtml(date)}</dd>
        ${paid ? `<dt>Paid on</dt><dd>${escapeHtml(paid)}</dd>` : ""}
        <dt>Status</dt>
        <dd><span class="status ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></dd>
      </div>
    </dl>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(order.productSnapshot.title)}</td>
          <td class="right">${subtotal}</td>
        </tr>
        ${discount ? `<tr><td>Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}</td><td class="right">−${discount}</td></tr>` : ""}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td class="right">${total}</td>
        </tr>
      </tfoot>
    </table>
    <footer>
      Payment method: ${escapeHtml(order.paymentMethod)}${order.paymentReference ? ` · ref ${escapeHtml(order.paymentReference)}` : ""}
      ${tenantEmail ? `<br/>Questions? Reply to ${escapeHtml(tenantEmail)}` : ""}
    </footer>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

