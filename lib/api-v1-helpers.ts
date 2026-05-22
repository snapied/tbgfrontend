// Shared scaffolding for every /api/v1/* route handler.
//
// Every endpoint follows the same pattern:
//   1. Extract bearer token (Authorization header or ?api_key=).
//   2. Validate shape — POC stub: prefix `tbc_` + length ≥ 24.
//      Production: backend lookup against hashed-secret table.
//   3. Enforce a scope (every endpoint declares which it needs).
//   4. Rate-limit per key (60/min, 1k/day — defined in
//      lib/api-rate-limit).
//   5. Return either an error envelope `{ error: { code, message } }`
//      or a data envelope `{ data, pagination? }` with the
//      standard X-RateLimit-* headers.
//
// The helpers below collapse steps 1–4 into one `authorize(req,
// scope)` call so route handlers focus on the data fetch + shape.

import { NextResponse, type NextRequest } from "next/server"
import { checkAndIncrement, rateLimitHeaders, type RateCheck } from "@/lib/api-rate-limit"
import type { ApiScope } from "@/lib/api-keys"

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "invalid_request"
  | "internal_error"

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
  headers?: Headers,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(extra ?? {}) } },
    { status, headers },
  )
}

export interface AuthOk {
  ok: true
  /** First 12 chars of the secret — used as the rate-limit bucket key. */
  bucketKey: string
  /** Rate-limit snapshot to attach to the response headers. */
  rate: RateCheck
  /** Same response headers the caller should pass through to NextResponse. */
  headers: Headers
}

export type AuthResult = AuthOk | { ok: false; response: NextResponse }

/**
 * One-call gate at the top of every route handler. Returns either an
 * `AuthOk` to proceed with, or a pre-built error `NextResponse` the
 * caller just returns straight through.
 */
export function authorize(req: NextRequest, requiredScope: ApiScope): AuthResult {
  // 1. Extract bearer
  const authHeader = req.headers.get("authorization") ?? ""
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : ""
  const querySecret = req.nextUrl.searchParams.get("api_key") ?? ""
  const secret = bearer || querySecret
  if (!secret) {
    return {
      ok: false,
      response: errorResponse(
        "unauthorized",
        "Missing API key. Pass it as `Authorization: Bearer tbc_…` or `?api_key=tbc_…`.",
        401,
      ),
    }
  }

  // 2. Shape check. POC stand-in for backend key lookup. Production
  //    swaps this block for `verifyApiKey(secret, requiredScope)`
  //    against the server-side keys table.
  if (!secret.startsWith("tbc_") || secret.length < 24) {
    return {
      ok: false,
      response: errorResponse(
        "unauthorized",
        "That key isn't valid. Generate a new one in /dashboard/developer.",
        401,
      ),
    }
  }
  // 3. Scope: every well-formed key currently authorizes every scope
  //    on the POC. The required-scope value still threads through so
  //    every endpoint declares its intent — when the backend keys
  //    table lands, the enforcement is one line.
  void requiredScope

  // 4. Rate limit. Bucket by the secret prefix; production buckets
  //    by the key's stable id so rotation doesn't reset the window.
  const bucketKey = secret.slice(0, 12)
  const rate = checkAndIncrement(bucketKey)
  const headers = rateLimitHeaders(rate)
  if (!rate.ok) {
    const reason =
      rate.reason === "minute"
        ? `Per-minute rate limit reached. Retry after ${rate.retryAfterSeconds}s.`
        : `Daily rate limit reached. Retry after ${rate.retryAfterSeconds}s.`
    return {
      ok: false,
      response: errorResponse(
        "rate_limited",
        reason,
        429,
        { retryAfterSeconds: rate.retryAfterSeconds },
        headers,
      ),
    }
  }
  return { ok: true, bucketKey, rate, headers }
}

/** Wraps a successful payload in the standard list envelope. */
export function listOk<T>(
  items: T[],
  cursor: string | null,
  hasMore: boolean,
  headers: Headers,
): NextResponse {
  return NextResponse.json(
    {
      data: items,
      pagination: { cursor, has_more: hasMore, page_size: items.length },
    },
    { status: 200, headers },
  )
}

/** Wraps a single resource. */
export function itemOk<T>(item: T, headers: Headers, status = 200): NextResponse {
  return NextResponse.json({ data: item }, { status, headers })
}

/**
 * Reads `?cursor=` + `?limit=` with sensible defaults. Returns null
 * cursor when not present, clamps limit to [1, 100].
 */
export function readCursorPagination(req: NextRequest): { cursor: string | null; limit: number } {
  const cursor = req.nextUrl.searchParams.get("cursor")
  const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? "25")
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 25
  return { cursor, limit }
}
