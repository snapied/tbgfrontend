// Server-side meta extractor — pulls title, description, logo, theme color,
// and og:image from a user-supplied URL during onboarding so a new tenant
// can land in the app with their existing brand already filled in.
//
// Why server-side: the browser can't fetch arbitrary cross-origin HTML
// because of CORS. A Next.js Route Handler runs on our server and can.
//
// This is conservative on purpose:
//   - 5-second timeout so a slow target site doesn't hang the onboarding
//   - 1 MB body cap to avoid an attacker pointing us at a 10 GB file
//   - http/https only (no file://, ftp://, etc.)
//   - returns best-effort fields; missing fields are simply absent

import { NextResponse, type NextRequest } from "next/server"

interface SiteMeta {
  url: string
  title?: string
  description?: string
  siteName?: string
  themeColor?: string
  logoUrl?: string  // best guess — prefers apple-touch / og:image / favicon
  faviconUrl?: string
}

export const runtime = "nodejs"

const MAX_BYTES = 1_000_000
const TIMEOUT_MS = 5_000

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")
  if (!raw) return NextResponse.json({ error: "Missing ?url= parameter" }, { status: 400 })

  let target: URL
  try {
    target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 })
  }

  let html = ""
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some sites serve different markup to bots; pretend to be a desktop
        // browser so we land on the same homepage a human would.
        "User-Agent": "Mozilla/5.0 (compatible; TheBigClass-Bot/1.0; +https://thebigclass.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    })
    clearTimeout(t)
    if (!res.ok) {
      return NextResponse.json({ error: `Site responded with ${res.status}` }, { status: 502 })
    }
    // Stream and cap.
    const reader = res.body?.getReader()
    if (!reader) {
      return NextResponse.json({ error: "Empty response body" }, { status: 502 })
    }
    const decoder = new TextDecoder("utf-8", { fatal: false })
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > MAX_BYTES) {
        try { await reader.cancel() } catch { /* ignore */ }
        break
      }
      html += decoder.decode(value, { stream: true })
      // We only need the <head> to extract meta, so bail early once we see
      // </head>. That keeps even huge home pages fast.
      if (html.includes("</head>")) {
        try { await reader.cancel() } catch { /* ignore */ }
        break
      }
    }
  } catch (err) {
    const msg = (err as Error).name === "AbortError"
      ? "The site took too long to respond"
      : (err as Error).message
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const meta = extractMeta(html, target)
  return NextResponse.json(meta, {
    headers: {
      // Cache briefly so repeated onboarding clicks don't hammer the target.
      "Cache-Control": "public, max-age=120, s-maxage=600",
    },
  })
}

// ---------------- HTML parsing ----------------
// Tiny regex-based extractor — robust enough for the common case and avoids
// pulling in cheerio / jsdom. Doesn't try to handle pathological HTML.

function extractMeta(html: string, base: URL): SiteMeta {
  const title = matchTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.trim()
  const description =
    metaContent(html, ["description", "og:description", "twitter:description"])
  const siteName =
    metaContent(html, ["og:site_name", "application-name", "apple-mobile-web-app-title"])
  const themeColor = metaContent(html, ["theme-color"])
  const ogImage = metaContent(html, ["og:image", "og:image:url", "twitter:image"])
  const appleTouch = linkHref(html, ["apple-touch-icon", "apple-touch-icon-precomposed"])
  const iconLink = linkHref(html, ["icon", "shortcut icon", "mask-icon"])
  const faviconFromLink = iconLink ? resolve(base, iconLink) : undefined

  // Prefer high-resolution sources for the logo guess: Apple touch (180×180)
  // > og:image (often 1200×630 but works) > favicon.
  const logoUrl =
    (appleTouch && resolve(base, appleTouch)) ??
    (ogImage && resolve(base, ogImage)) ??
    faviconFromLink

  const faviconUrl = faviconFromLink ?? resolve(base, "/favicon.ico")

  return {
    url: base.toString(),
    title: title ? decode(title) : undefined,
    description: description ? decode(description) : undefined,
    siteName: siteName ? decode(siteName) : undefined,
    themeColor: themeColor || undefined,
    logoUrl,
    faviconUrl,
  }
}

function matchTag(html: string, re: RegExp): string | null {
  const m = html.match(re)
  return m ? m[1] : null
}

function metaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${escapeRe(name)}["'][^>]*content=["']([^"']+)["']`,
      "i",
    )
    const m = html.match(re)
    if (m) return m[1]
    // Some emitters put content= before the name.
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${escapeRe(name)}["']`,
      "i",
    )
    const m2 = html.match(re2)
    if (m2) return m2[1]
  }
  return null
}

function linkHref(html: string, rels: string[]): string | null {
  for (const rel of rels) {
    const re = new RegExp(
      `<link[^>]+rel=["']${escapeRe(rel)}["'][^>]*href=["']([^"']+)["']`,
      "i",
    )
    const m = html.match(re)
    if (m) return m[1]
    const re2 = new RegExp(
      `<link[^>]+href=["']([^"']+)["'][^>]*rel=["']${escapeRe(rel)}["']`,
      "i",
    )
    const m2 = html.match(re2)
    if (m2) return m2[1]
  }
  return null
}

function resolve(base: URL, href: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim()
}
