// Per-tenant robots.txt. Defaults to "everything indexable" — the
// privatePortal toggle on PortalConfig will flip this in a follow-up
// once the server can read tenant config.

import type { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await context.params
  const origin = request.nextUrl.origin
  const body = `User-agent: *\nAllow: /p/${tenant}/\n\nSitemap: ${origin}/p/${tenant}/sitemap.xml\n`
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
