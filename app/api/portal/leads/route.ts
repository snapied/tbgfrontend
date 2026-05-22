// Lead-capture endpoint. Used as a backstop for the contact form when
// a future backend lands; today the form ALSO writes the lead directly
// to the tenant's localStorage via PortalProvider, so even if this
// endpoint is unreachable the lead still shows up in the dashboard
// inbox. The endpoint exists so a real backend can swap in without
// changing the form's POST shape.

import { NextResponse, type NextRequest } from "next/server"

interface LeadPayload {
  tenant: string
  formId: string
  pageSlug: string
  name?: string
  email: string
  phone?: string
  message?: string
  fields?: Record<string, string>
  source?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<LeadPayload>
    if (!body.email || !body.tenant) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 })
    }
    // No real persistence here — the client writes to localStorage and
    // optionally fires /api/email/send. This is a stable POST shape for
    // a future backend.
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "Bad request" },
      { status: 400 },
    )
  }
}
