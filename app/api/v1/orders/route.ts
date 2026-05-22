// GET /api/v1/orders
//
// Lists storefront orders for the authenticated workspace. The
// payload mirrors what /dashboard/store and /dashboard/billing
// reconcile against — gross / gateway-fee / platform-fee (0%) / net
// per order — so accounting integrations have everything they need
// to match against their books and Razorpay statements.
//
// Scope: read:orders.

import { type NextRequest } from "next/server"
import {
  authorize,
  listOk,
  readCursorPagination,
} from "@/lib/api-v1-helpers"

export const runtime = "nodejs"

interface ApiOrder {
  id: string
  product_id: string
  product_label: string
  customer_email: string
  customer_name: string | null
  gross_paise: number
  /** What Razorpay deducted at checkout (~2% domestic UPI/cards). */
  gateway_fee_paise: number
  /** Always 0 — we don't take a commission. Kept in the shape for
   *  symmetry with the dashboard table the API mirrors. */
  platform_fee_paise: number
  /** What landed in the creator's bank (gross − gateway − platform). */
  net_paise: number
  currency: string
  status: "paid" | "refunded" | "pending" | "failed"
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  created_at: string
  settled_at: string | null
}

// POC dataset — production reads PayoutRecord rows from the backend.
const SAMPLE: ApiOrder[] = Array.from({ length: 8 }).map((_, i) => {
  const gross = (i + 1) * 50_000 // ₹500, ₹1000, …
  const gatewayFee = Math.round(gross * 0.02)
  return {
    id: `ord_${(i + 1).toString().padStart(6, "0")}`,
    product_id: `prod_${(i % 3) + 1}`,
    product_label: ["Intro to the platform", "Advanced cohort", "Single download"][i % 3],
    customer_email: `student${i + 1}@example.com`,
    customer_name: `Student ${i + 1}`,
    gross_paise: gross,
    gateway_fee_paise: gatewayFee,
    platform_fee_paise: 0,
    net_paise: gross - gatewayFee,
    currency: "INR",
    status: i === 0 ? "refunded" : "paid",
    razorpay_payment_id: `pay_${(Math.random() * 1e16).toString(36).slice(0, 14)}`,
    razorpay_order_id: `order_${(Math.random() * 1e16).toString(36).slice(0, 14)}`,
    created_at: new Date(Date.now() - i * 86400_000).toISOString(),
    settled_at:
      i === 0 ? null : new Date(Date.now() - (i - 1) * 86400_000).toISOString(),
  }
})

export async function GET(req: NextRequest) {
  const auth = authorize(req, "read:orders")
  if (!auth.ok) return auth.response
  const { cursor, limit } = readCursorPagination(req)
  const offset = cursor ? Number(cursor) : 0
  const page = SAMPLE.slice(offset, offset + limit)
  const nextCursor = offset + limit < SAMPLE.length ? String(offset + limit) : null
  return listOk(page, nextCursor, nextCursor !== null, auth.headers)
}
