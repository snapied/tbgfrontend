"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Filter,
  Loader2,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBag,
} from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/lib/use-confirm"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { money, useStore, type OrderStatus } from "@/lib/store-store"
import { useTenant } from "@/lib/tenant-store"

export default function OrdersPage() {
  const { orders, products, refundOrder } = useStore()
  const { currentTenant } = useTenant()
  const confirm = useConfirm()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all")
  // Per-row "refund in flight" state so the spinner sits on the
  // clicked row instead of locking the whole table.
  const [refundingId, setRefundingId] = useState<string | null>(null)

  async function handleRefund(orderId: string) {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    if (order.status !== "paid") {
      toast.error(`Can't refund an order in status "${order.status}".`)
      return
    }
    const ok = await confirm({
      title: "Refund this order?",
      description: `Refunds ${money(order.total, order.currency)} to ${order.customerEmail || "the buyer"} and immediately revokes their access. Razorpay processes the refund within 5–7 business days. This can't be undone here — you'd need to re-checkout to grant access back.`,
      destructive: true,
      confirmLabel: "Refund + revoke access",
    })
    if (!ok) return
    setRefundingId(orderId)
    try {
      // Only call the gateway when this order was actually charged
      // through Razorpay AND we have a Razorpay payment id stamped on
      // it. Test purchases, stub-mode orders, and manually-created
      // rows fall through to the local-only refund path.
      const isGatewayOrder =
        order.paymentMethod === "razorpay" &&
        typeof order.paymentReference === "string" &&
        order.paymentReference.startsWith("pay_")
      let gatewayRefundId: string | undefined
      if (isGatewayOrder) {
        const res = await fetch("/api/payments/razorpay/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: order.paymentReference,
            // Full refund — omit amount.
            reason: "Refunded from dashboard",
            // Stash the tenant slug + local order id so the
            // refund.processed webhook can route back to the right
            // tenant in O(1) (without walking every tenant's orders
            // for a matching paymentReference).
            notes: {
              orderId: order.id,
              ...(currentTenant?.slug ? { tenant: currentTenant.slug } : {}),
            },
          }),
        })
        const body = (await res.json().catch(() => null)) as
          | { ok: true; refund: { id: string; status: string } }
          | { ok: false; error: string }
          | null
        if (!body || !body.ok) {
          const errMsg = body && "error" in body ? body.error : "Refund failed"
          toast.error(errMsg)
          return
        }
        gatewayRefundId = body.refund.id
      }
      const r = refundOrder(orderId, {
        reason: "Refunded from dashboard",
        gatewayRefundId,
      })
      if (!r.ok) {
        toast.error(r.reason)
        return
      }
      toast.success(
        isGatewayOrder
          ? `Refund queued at Razorpay (${gatewayRefundId}). Access revoked.`
          : "Order marked refunded. Access revoked.",
      )
    } catch (err) {
      toast.error((err as Error).message || "Refund failed")
    } finally {
      setRefundingId(null)
    }
  }

  const rows = useMemo(() => {
    return [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter(o => {
        if (statusFilter !== "all" && o.status !== statusFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return o.customerEmail.toLowerCase().includes(q) ||
                 o.customerName.toLowerCase().includes(q) ||
                 o.productSnapshot.title.toLowerCase().includes(q) ||
                 o.id.toLowerCase().includes(q)
        }
        return true
      })
  }, [orders, search, statusFilter])

  const paid = orders.filter(o => o.status === "paid")
  const gross = paid.reduce((acc, o) => acc + o.total, 0)
  const refunds = orders.filter(o => o.status === "refunded").length
  const currency = paid[0]?.currency ?? "USD"
  // Average order value
  const aov = paid.length > 0 ? gross / paid.length : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/store"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">Every purchase, in one place.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Gross sales" value={money(gross, currency)} />
        <Tile label="Paid orders" value={`${paid.length}`} />
        <Tile label="Avg order value" value={money(aov, currency)} />
        <Tile label="Refunds" value={`${refunds}`} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer, product, or order id…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | OrderStatus)}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No orders yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                When someone buys, you&apos;ll see it here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(o => {
                  const product = products.find(p => p.id === o.productId)
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <p className="text-sm">{new Date(o.createdAt).toLocaleString()}</p>
                        <p className="text-xs font-mono text-muted-foreground">{o.id.slice(-8)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{o.customerName || "Guest"}</p>
                        <p className="text-xs text-muted-foreground">{o.customerEmail}</p>
                      </TableCell>
                      <TableCell>
                        {product ? (
                          <Link href={`/dashboard/store/${product.id}`} className="hover:underline">
                            {o.productSnapshot.title}
                          </Link>
                        ) : o.productSnapshot.title}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium tabular-nums">{money(o.total, o.currency)}</p>
                        {o.discount > 0 && (
                          <p className="text-xs text-muted-foreground">−{money(o.discount, o.currency)} coupon</p>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {o.status === "paid" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefund(o.id)}
                              disabled={refundingId === o.id}
                              title={
                                o.paymentMethod === "razorpay" && o.paymentReference?.startsWith("pay_")
                                  ? "Refund via Razorpay + revoke access"
                                  : "Mark refunded locally + revoke access (no gateway call — this order wasn't charged through Razorpay)"
                              }
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              {refundingId === o.id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              )}
                              Refund
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/order/${o.id}`} target="_blank">
                              <Receipt className="mr-1 h-3.5 w-3.5" />
                              Receipt
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map = {
    paid: { class: "bg-success text-success-foreground", label: "Paid" },
    pending: { class: "bg-muted text-muted-foreground", label: "Pending" },
    refunded: { class: "bg-destructive/15 text-destructive border border-destructive/30", label: "Refunded" },
    failed: { class: "bg-destructive text-destructive-foreground", label: "Failed" },
    canceled: { class: "bg-muted text-muted-foreground border border-border", label: "Canceled" },
  } as const
  const m = map[status]
  return <Badge className={m.class}>{m.label}</Badge>
}
