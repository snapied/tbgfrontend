"use client"

// Invoices / payment history pulled from store-store. Every order
// where the student is the customer surfaces here with status, paid
// amount, currency, and a "view receipt" link. Teachers running the
// workspace can see what they've sold to this student at a glance.

import { useMemo } from "react"
import Link from "next/link"
import { ExternalLink, IndianRupee, Receipt } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useStore, type Order } from "@/lib/store-store"
import { formatMoney } from "@/lib/currency"
import type { User } from "@/lib/lms-store"

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

  const totalPaid = studentOrders
    .filter((o) => o.status === "paid")
    .reduce((acc, o) => acc + o.total, 0)
  const primaryCurrency = studentOrders[0]?.currency ?? "USD"

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
              {studentOrders.length} order{studentOrders.length === 1 ? "" : "s"} ·{" "}
              <strong className="text-foreground">
                {formatMoney(totalPaid, primaryCurrency)}
              </strong>{" "}
              paid lifetime
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
              <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {o.productSnapshot.title}
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
                <Link
                  href={`/order/${o.id}`}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                  title="View receipt"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
