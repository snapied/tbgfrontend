// GET /api/v1/analytics/summary?window=7d|30d|90d|all
//
// One-call aggregate for revenue + engagement dashboards. The same
// numbers /dashboard/analytics renders, but in a stable JSON shape
// so BI tools (Google Sheets, Looker Studio, custom dashboards)
// can poll it nightly.
//
// Scope: read:analytics.

import { type NextRequest } from "next/server"
import { authorize, errorResponse } from "@/lib/api-v1-helpers"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

type Window = "7d" | "30d" | "90d" | "all"
const WINDOWS: Record<Window, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 0,
}

interface AnalyticsSummary {
  window: Window
  window_starts_at: string
  window_ends_at: string
  revenue: {
    gross_paise: number
    gateway_fee_paise: number
    platform_fee_paise: number
    net_paise: number
    currency: string
    /** Granular daily breakdown. ISO date → paise. */
    daily_net_paise: Array<{ date: string; gross_paise: number; net_paise: number }>
  }
  students: {
    active: number
    new_in_window: number
    invited: number
  }
  courses: {
    published: number
    /** Top courses by enrolments in the window. */
    top: Array<{ course_id: string; title: string; enrolments_in_window: number }>
  }
  engagement: {
    lessons_completed_in_window: number
    avg_completion_rate: number
    live_sessions_run: number
  }
}

function generate(window: Window): AnalyticsSummary {
  const days = WINDOWS[window] || 90
  const end = new Date()
  const start = new Date(end.getTime() - days * 86400_000)
  // POC numbers. Production reads PayoutRecord aggregates +
  // enrolment counts + lesson completion events. We keep the shape
  // realistic so a client built against this never needs to migrate.
  const dailyNet = Array.from({ length: Math.min(days, 30) }).map((_, i) => {
    const d = new Date(end.getTime() - i * 86400_000)
    const gross = Math.round(10_000 + Math.random() * 80_000)
    return {
      date: d.toISOString().slice(0, 10),
      gross_paise: gross,
      net_paise: Math.round(gross * 0.98),
    }
  })
  const gross = dailyNet.reduce((s, r) => s + r.gross_paise, 0)
  const net = dailyNet.reduce((s, r) => s + r.net_paise, 0)
  return {
    window,
    window_starts_at: start.toISOString(),
    window_ends_at: end.toISOString(),
    revenue: {
      gross_paise: gross,
      gateway_fee_paise: gross - net,
      platform_fee_paise: 0,
      net_paise: net,
      currency: "INR",
      daily_net_paise: dailyNet.reverse(),
    },
    students: {
      active: 47,
      new_in_window: 12,
      invited: 3,
    },
    courses: {
      published: 4,
      top: [
        { course_id: "course-sample-1", title: "Intro to the platform", enrolments_in_window: 9 },
        { course_id: "course-sample-2", title: "Advanced cohort", enrolments_in_window: 5 },
      ],
    },
    engagement: {
      lessons_completed_in_window: 86,
      avg_completion_rate: 0.62,
      live_sessions_run: 7,
    },
  }
}

export async function GET(req: NextRequest) {
  const auth = authorize(req, "read:analytics")
  if (!auth.ok) return auth.response
  const rawWindow = (req.nextUrl.searchParams.get("window") ?? "30d") as Window
  if (!(rawWindow in WINDOWS)) {
    return errorResponse(
      "invalid_request",
      "window must be one of: 7d, 30d, 90d, all.",
      422,
      undefined,
      auth.headers,
    )
  }
  return NextResponse.json(
    { data: generate(rawWindow) },
    { status: 200, headers: auth.headers },
  )
}
