"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Filter,
  Receipt,
  Search,
  ShoppingBag,
} from "lucide-react"
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

export default function OrdersPage() {
  const { orders, products } = useStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all")

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
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/order/${o.id}`} target="_blank">
                            <Receipt className="mr-1 h-3.5 w-3.5" />
                            Receipt
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
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
