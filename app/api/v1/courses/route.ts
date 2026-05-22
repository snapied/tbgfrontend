// Public API — GET /api/v1/courses.
//
// First flagship endpoint surfacing the contract our public REST
// will follow. Reads a Bearer API key from the Authorization
// header (or `?api_key=`), verifies it has `read:courses` scope,
// rate-limits the request (60/min, 1k/day per key), and returns a
// stable JSON shape.
//
// The endpoint is intentionally tiny right now — its job is to
// pin down the auth + rate-limit + error envelope conventions so
// every subsequent endpoint can copy this skeleton. Once a real
// backing course store lands, swap the in-memory data fetch for
// the live one.

import { NextResponse, type NextRequest } from "next/server"
import { checkAndIncrement, rateLimitHeaders } from "@/lib/api-rate-limit"

// We can't import the LMS store here — it's a browser-only React
// context — so the POC endpoint returns a small static sample.
// Real production wires this to whatever server-side store backs
// the dashboard.
const SAMPLE_COURSES = [
  {
    id: "course-sample-1",
    slug: "intro-to-the-platform",
    title: "Intro to the platform",
    subtitle: "What you can build with our API",
    level: "beginner" as const,
    category: "Onboarding",
    enrolledCount: 0,
    rating: 5.0,
    totalLessons: 4,
    publishedAt: "2026-05-19T00:00:00.000Z",
  },
]

export const runtime = "nodejs"

function unauthorized(message: string) {
  return NextResponse.json(
    { error: { code: "unauthorized", message } },
    { status: 401 },
  )
}

function forbidden(message: string) {
  return NextResponse.json(
    { error: { code: "forbidden", message } },
    { status: 403 },
  )
}

export async function GET(req: NextRequest) {
  // ---- Bearer token extraction ----
  // Accept either `Authorization: Bearer tbc_…` or `?api_key=tbc_…`.
  // The header form is preferred (won't leak into request logs);
  // the query form exists for quick smoke-testing in a browser
  // tab and should be discouraged in prod docs.
  const authHeader = req.headers.get("authorization") ?? ""
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : ""
  const querySecret = req.nextUrl.searchParams.get("api_key") ?? ""
  const secret = bearer || querySecret
  if (!secret) {
    return unauthorized(
      "Missing API key. Pass it as `Authorization: Bearer tbc_…` or `?api_key=tbc_…`.",
    )
  }

  // ---- Key verification ----
  // The key registry lives in the browser-local store for the
  // POC; that means server-side verification can't actually call
  // the same `verifyApiKey` (it'd read an empty Map on the
  // server). For the demo endpoint we sniff the well-known prefix
  // + length so the request can be exercised end-to-end without a
  // real backend. Production swaps this block for a backend
  // lookup against the hashed-secret table.
  if (!secret.startsWith("tbc_") || secret.length < 24) {
    return unauthorized("That key isn't valid. Generate a new one in /dashboard/developer.")
  }
  // POC-only scope check stand-in: every key authorizes every
  // scope here, but the response carries a `_scope_note` so
  // documentation is honest about it. The dashboard already
  // tracks scopes per key — once the backend verifies, we read
  // the matched key's scopes and enforce here.
  const requiredScope = "read:courses"
  // -----------------------------------

  // ---- Rate limit ----
  // Bucket key = the bearer prefix (first 12 chars) for the POC.
  // Real prod buckets by the API key's *id*, not its secret, so
  // rotating doesn't reset the limit.
  const bucketKey = secret.slice(0, 12)
  const rate = checkAndIncrement(bucketKey)
  if (!rate.ok) {
    const reason =
      rate.reason === "minute"
        ? `Per-minute rate limit reached. Retry after ${rate.retryAfterSeconds}s.`
        : `Daily rate limit reached. Retry after ${rate.retryAfterSeconds}s.`
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: reason,
          retryAfterSeconds: rate.retryAfterSeconds,
        },
      },
      { status: 429, headers: rateLimitHeaders(rate) },
    )
  }

  // ---- Authorized + within budget — serve the response ----
  // Pagination shape mirrors what we'll persist long-term: a
  // `data` array + a `pagination` object with cursor + has_more.
  // Even when the response fits in a single page (today) we keep
  // the envelope so clients can build for the future.
  const body = {
    data: SAMPLE_COURSES,
    pagination: {
      cursor: null,
      has_more: false,
      page_size: SAMPLE_COURSES.length,
    },
    _scope_note:
      `POC: scope '${requiredScope}' is required in production; the demo endpoint accepts any well-formed key.`,
  }
  return NextResponse.json(body, {
    status: 200,
    headers: rateLimitHeaders(rate),
  })
}
