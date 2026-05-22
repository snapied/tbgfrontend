// Per-tenant sitemap. Since this POC stores pages/posts/courses on the
// client, the server can't enumerate them — so we emit a minimal
// sitemap with the well-known portal routes. When a real backend lands
// this becomes a fanout over the tenant's published pages.

import type { NextRequest } from "next/server"

const STATIC_PATHS = ["/", "/about", "/teachers", "/courses", "/blog", "/contact"]

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await context.params
  const origin = request.nextUrl.origin
  const base = `${origin}/p/${tenant}`
  const today = new Date().toISOString().slice(0, 10)
  const urls = STATIC_PATHS.map(
    (p) => `  <url>\n    <loc>${base}${p === "/" ? "" : p}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
  ).join("\n")
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
