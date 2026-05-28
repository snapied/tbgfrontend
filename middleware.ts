import { NextRequest, NextResponse } from "next/server"

// Tenant subdomain routing middleware.
//
// Rewrites `gaurav.thebigclass.com/courses/math` to
// `/p/gaurav/courses/math` internally so all existing /p/{slug}/...
// pages work without duplicating routes.
//
// Does NOT redirect — the user sees `gaurav.thebigclass.com/courses/math`
// in the browser, but Next.js renders `/p/gaurav/courses/math`.

const PLATFORM_HOST = process.env.NEXT_PUBLIC_PLATFORM_HOST || "thebigclass.com"

// Paths that should never be rewritten (platform routes, not tenant routes)
const SKIP_PREFIXES = [
  "/api/",
  "/dashboard/",
  "/login",
  "/signup",
  "/p/",           // already a tenant path
  "/i/",           // invite pages
  "/onboard/",
  "/pricing",
  "/about",
  "/features/",
  "/solutions/",
  "/use-cases/",
  "/help",
  "/legal/",
  "/guides",
  "/updates",
  "/alternatives/",
  "/brand",
  "/verify",
  "/superadmin",
  "/_next/",
  "/static/",
  "/images/",
  "/favicon",
  "/robots.txt",
  "/sitemap",
]

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase()
  const pathname = req.nextUrl.pathname

  // Also check x-forwarded-host (Render/Vercel proxy sets this)
  const forwardedHost = (req.headers.get("x-forwarded-host") || "").toLowerCase()
  const effectiveHost = forwardedHost || host

  // Skip if not a subdomain of the platform host
  const suffix = `.${PLATFORM_HOST}`
  if (!effectiveHost.endsWith(suffix)) return NextResponse.next()

  // Extract subdomain — strip port if present
  const hostWithoutPort = effectiveHost.split(":")[0]
  const sub = hostWithoutPort.slice(0, -suffix.length)
  if (!sub || sub.includes(".") || sub === "www") return NextResponse.next()

  // Skip platform routes
  for (const prefix of SKIP_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next()
  }

  // Rewrite: gaurav.thebigclass.com/courses/math → /p/gaurav/courses/math
  const url = req.nextUrl.clone()
  url.pathname = `/p/${sub}${pathname === "/" ? "" : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Run on all paths except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
