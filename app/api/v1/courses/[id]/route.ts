// GET /api/v1/courses/{id}
//
// Returns a single course with its modules + lessons metadata, so an
// external app can render the course outline without parsing the
// public storefront HTML. Scope: read:courses.
//
// Data shape mirrors what /api/v1/courses list returns for the
// summary fields, plus the curriculum array. Stays compatible with
// the list shape so a client can use one type for both.

import { type NextRequest } from "next/server"
import { authorize, itemOk, errorResponse } from "@/lib/api-v1-helpers"

export const runtime = "nodejs"

// POC stub data — production reads from the backend course store.
// The shape matches what /dashboard course-edit produces, so a real
// fetch is a swap, not a refactor.
function sampleCourse(id: string) {
  return {
    id,
    slug: "intro-to-the-platform",
    title: "Intro to the platform",
    subtitle: "What you can build with our API",
    description:
      "A 4-lesson primer on running cohorts, courses, a storefront and a community from one workspace.",
    level: "beginner" as const,
    category: "Onboarding",
    coverUrl: null as string | null,
    priceInPaise: 0,
    currency: "INR",
    enrolledCount: 0,
    rating: 5.0,
    publishedAt: "2026-05-19T00:00:00.000Z",
    instructor: {
      id: "user-owner",
      name: "Course owner",
    },
    modules: [
      {
        id: "module-1",
        title: "Welcome",
        order: 1,
        lessons: [
          { id: "lesson-1", title: "Why we built this", order: 1, durationSeconds: 180 },
          { id: "lesson-2", title: "Your first 60 seconds", order: 2, durationSeconds: 300 },
        ],
      },
      {
        id: "module-2",
        title: "Setting up your storefront",
        order: 2,
        lessons: [
          { id: "lesson-3", title: "Domain + branding", order: 1, durationSeconds: 240 },
          { id: "lesson-4", title: "Your first product", order: 2, durationSeconds: 360 },
        ],
      },
    ],
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = authorize(req, "read:courses")
  if (!auth.ok) return auth.response
  const { id } = await ctx.params
  if (!id || id.length < 3) {
    return errorResponse(
      "invalid_request",
      "Course id is missing or malformed.",
      422,
      undefined,
      auth.headers,
    )
  }
  // POC: returns the sample course for ANY id so the contract is
  // verifiable end-to-end. Production replaces this with a real
  // lookup that returns 404 for unknown ids.
  return itemOk(sampleCourse(id), auth.headers)
}
