// POST /api/v1/enrollments
//
// Enrols a student in a course. Used by external CRMs / Zapier / your
// own automation to grant access after some out-of-band event ("this
// person paid via UPI offline → enrol them").
//
// Idempotent on (student_id, course_id) — re-running with the same
// pair returns the existing enrolment, never creates a duplicate.
//
// Scope: write:enrollments.

import { type NextRequest } from "next/server"
import { authorize, itemOk, errorResponse } from "@/lib/api-v1-helpers"

export const runtime = "nodejs"

interface ApiEnrollment {
  id: string
  student_id: string
  course_id: string
  /** Where the enrolment came from — useful for support triage. */
  source: "api" | "checkout" | "manual" | "import"
  /** Optional human-readable note, often a CRM record id. */
  note: string | null
  /** Defaults to "active". "revoked" hides the course without losing the row. */
  status: "active" | "revoked"
  created_at: string
}

// POC store. Production: backend table `enrollments` with UNIQUE
// (organisation_id, student_id, course_id).
const SAMPLE: ApiEnrollment[] = []

export async function POST(req: NextRequest) {
  const auth = authorize(req, "write:enrollments")
  if (!auth.ok) return auth.response

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return errorResponse(
      "invalid_request",
      "Request body must be valid JSON.",
      422,
      undefined,
      auth.headers,
    )
  }
  const student_id = typeof body.student_id === "string" ? body.student_id.trim() : ""
  const course_id = typeof body.course_id === "string" ? body.course_id.trim() : ""
  const note = typeof body.note === "string" ? body.note.trim() : null
  const sourceIn = typeof body.source === "string" ? body.source : "api"
  const source: ApiEnrollment["source"] =
    sourceIn === "checkout" || sourceIn === "manual" || sourceIn === "import" ? sourceIn : "api"

  if (!student_id || !course_id) {
    return errorResponse(
      "invalid_request",
      "student_id and course_id are required.",
      422,
      undefined,
      auth.headers,
    )
  }

  const existing = SAMPLE.find(
    (e) => e.student_id === student_id && e.course_id === course_id,
  )
  if (existing) {
    // Idempotency: identical request returns the same row + 200.
    // Note + source are not overwritten on a no-op; clients that
    // need to update those should DELETE + re-POST.
    return itemOk(existing, auth.headers, 200)
  }

  const created: ApiEnrollment = {
    id: `enr_${Date.now().toString(36)}`,
    student_id,
    course_id,
    source,
    note,
    status: "active",
    created_at: new Date().toISOString(),
  }
  SAMPLE.unshift(created)
  return itemOk(created, auth.headers, 201)
}
