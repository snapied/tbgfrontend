// /api/v1/students
//
//   GET  — list students (scope: read:students)
//   POST — create a student (scope: write:students)
//
// Cursor pagination — `?cursor=` opaque token, `?limit=` 1–100. The
// stub uses array indices as the cursor; production swaps to row id.
//
// POST body shape mirrors what the backend's /api/students endpoint
// accepts (email, display_name, phone?). Idempotent on email within
// the workspace — duplicate POSTs return the existing student.

import { type NextRequest } from "next/server"
import {
  authorize,
  itemOk,
  listOk,
  errorResponse,
  readCursorPagination,
} from "@/lib/api-v1-helpers"

export const runtime = "nodejs"

interface ApiStudent {
  id: string
  email: string
  display_name: string
  phone: string | null
  status: "active" | "inactive" | "invited"
  enrolled_courses: string[]
  last_seen_at: string | null
  created_at: string
}

// POC sample dataset. Real backend reads from the Student table per
// req.user.organisation_id. Pagination here just slices the array.
const SAMPLE: ApiStudent[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `stu_${(i + 1).toString().padStart(6, "0")}`,
  email: `student${i + 1}@example.com`,
  display_name: `Student ${i + 1}`,
  phone: null,
  status: i % 5 === 0 ? "invited" : "active",
  enrolled_courses: i % 3 === 0 ? ["course-sample-1"] : [],
  last_seen_at: i < 6 ? new Date(Date.now() - i * 86400_000).toISOString() : null,
  created_at: new Date(Date.now() - (i + 1) * 86400_000).toISOString(),
}))

export async function GET(req: NextRequest) {
  const auth = authorize(req, "read:students")
  if (!auth.ok) return auth.response
  const { cursor, limit } = readCursorPagination(req)
  const offset = cursor ? Number(cursor) : 0
  const page = SAMPLE.slice(offset, offset + limit)
  const nextCursor = offset + limit < SAMPLE.length ? String(offset + limit) : null
  return listOk(page, nextCursor, nextCursor !== null, auth.headers)
}

export async function POST(req: NextRequest) {
  const auth = authorize(req, "write:students")
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
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const display_name =
    typeof body.display_name === "string"
      ? body.display_name.trim()
      : typeof body.name === "string"
        ? body.name.trim()
        : ""
  const phone = typeof body.phone === "string" ? body.phone.trim() : null
  if (!email.includes("@") || !display_name) {
    return errorResponse(
      "invalid_request",
      "email (valid) and display_name are required.",
      422,
      undefined,
      auth.headers,
    )
  }

  // Idempotency: return the existing record when email already exists
  // in the sample. Production hits the (organisation_id, email)
  // UNIQUE index on the students table the same way.
  const existing = SAMPLE.find((s) => s.email === email)
  if (existing) {
    return itemOk(existing, auth.headers, 200)
  }

  const created: ApiStudent = {
    id: `stu_${Date.now().toString(36)}`,
    email,
    display_name,
    phone,
    status: "active",
    enrolled_courses: [],
    last_seen_at: null,
    created_at: new Date().toISOString(),
  }
  // POC: stores in-memory for the lifetime of this Node process.
  // Refresh + the entry's gone. Production persists to the backend
  // students table.
  SAMPLE.unshift(created)
  return itemOk(created, auth.headers, 201)
}
