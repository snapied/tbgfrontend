"use client"

// Client-side meta tag injector for pages that can't use the Next.js
// `export const metadata` API — every tenant route is a client
// component reading tenant data from a browser-local store, so the
// server has no way to know which tenant is being viewed at build
// time. This component takes the SEO values the page can compute,
// writes them into <head> via useEffect, and restores the previous
// values on unmount so navigation between pages doesn't leak stale
// titles or share images.
//
// The component renders nothing. Mount it anywhere inside the page
// tree (typically near the top) and it patches <head> when its props
// change. Multiple instances nest cleanly because each tag is keyed
// by `(name|property|rel|itemprop)` and the most recently mounted
// instance for that key wins; on unmount it pops back to the prior
// value.

import { useEffect, useRef } from "react"

export interface DynamicMetaProps {
  // Page <title>. Composed with `titleTemplate` when supplied.
  title?: string
  // When set, the final title becomes titleTemplate.replace("%s", title).
  // The tenant layout uses this to standardize "<page> · <brand>".
  titleTemplate?: string
  description?: string
  // Absolute or relative URL of the share image (OpenGraph + Twitter).
  image?: string
  // Used for og:url / twitter:url / canonical when supplied. Falls
  // back to window.location.href when omitted.
  url?: string
  // og:type — "website" for index pages, "article" for blog posts.
  type?: "website" | "article" | "product" | "profile"
  // Tenant-scoped favicon override. Tenant layout sets this so each
  // portal feels like its own site in the browser tab.
  faviconUrl?: string
  // Twitter card style. "summary_large_image" when an image is set,
  // "summary" otherwise.
  twitterCard?: "summary" | "summary_large_image"
  // Robots — when true, emits "noindex,nofollow". Draft posts use this.
  noindex?: boolean
  // Optional brand/site name (og:site_name).
  siteName?: string
  // Optional author byline — surfaces in article cards on some
  // social platforms.
  author?: string
  // Free-form keywords. Joined with ", " for the legacy keywords meta.
  keywords?: string[]
  // Raw JSON-LD structured-data payload. Inserted as a
  // <script type="application/ld+json"> tag and removed on unmount.
  jsonLd?: string
}

// Internal: ensure a tag exists in <head>, set its attribute(s), and
// return a cleanup that restores whatever was there before.
function setMetaTag(
  selector: string,
  attrs: Record<string, string>,
): () => void {
  if (typeof document === "undefined") return () => {}
  const head = document.head
  let el = head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null
  // Snapshot previous attributes so we can roll back precisely.
  const created = !el
  const previous: Record<string, string | null> = {}
  if (el) {
    for (const k of Object.keys(attrs)) previous[k] = el.getAttribute(k)
  } else {
    el = document.createElement(selector.startsWith("link") ? "link" : "meta")
    // Carry across the identifying attribute(s) so subsequent reads
    // find it. We parse the selector for those instead of guessing.
    for (const m of selector.matchAll(/\[([^=]+)="([^"]+)"\]/g)) {
      el.setAttribute(m[1], m[2])
    }
    head.appendChild(el)
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return () => {
    if (!el) return
    if (created) {
      el.remove()
      return
    }
    for (const [k, prev] of Object.entries(previous)) {
      if (prev == null) el.removeAttribute(k)
      else el.setAttribute(k, prev)
    }
  }
}

export function DynamicMeta(props: DynamicMetaProps) {
  // Track the cleanups for each render so we tear them down before
  // applying the next set when props change.
  const cleanupsRef = useRef<Array<() => void>>([])

  useEffect(() => {
    const cleanups: Array<() => void> = []

    const {
      title,
      titleTemplate,
      description,
      image,
      url,
      type = "website",
      faviconUrl,
      twitterCard,
      noindex,
      siteName,
      author,
      keywords,
      jsonLd,
    } = props

    // ---- <title> ----
    if (title) {
      const composed = titleTemplate ? titleTemplate.replace("%s", title) : title
      const prev = document.title
      document.title = composed
      cleanups.push(() => {
        document.title = prev
      })
    }

    // ---- canonical URL ----
    const canonicalUrl =
      url ?? (typeof window !== "undefined" ? window.location.href : undefined)

    // ---- standard meta ----
    if (description) {
      cleanups.push(setMetaTag(`meta[name="description"]`, { content: description }))
    }
    if (keywords && keywords.length > 0) {
      cleanups.push(setMetaTag(`meta[name="keywords"]`, { content: keywords.join(", ") }))
    }
    if (author) {
      cleanups.push(setMetaTag(`meta[name="author"]`, { content: author }))
    }
    if (noindex) {
      cleanups.push(setMetaTag(`meta[name="robots"]`, { content: "noindex,nofollow" }))
    }

    // ---- OpenGraph ----
    if (title) {
      const composed = titleTemplate ? titleTemplate.replace("%s", title) : title
      cleanups.push(setMetaTag(`meta[property="og:title"]`, { content: composed }))
    }
    if (description) {
      cleanups.push(setMetaTag(`meta[property="og:description"]`, { content: description }))
    }
    if (image) {
      cleanups.push(setMetaTag(`meta[property="og:image"]`, { content: image }))
    }
    if (canonicalUrl) {
      cleanups.push(setMetaTag(`meta[property="og:url"]`, { content: canonicalUrl }))
      cleanups.push(setMetaTag(`link[rel="canonical"]`, { href: canonicalUrl }))
    }
    if (siteName) {
      cleanups.push(setMetaTag(`meta[property="og:site_name"]`, { content: siteName }))
    }
    cleanups.push(setMetaTag(`meta[property="og:type"]`, { content: type }))

    // ---- Twitter ----
    const card = twitterCard ?? (image ? "summary_large_image" : "summary")
    cleanups.push(setMetaTag(`meta[name="twitter:card"]`, { content: card }))
    if (title) {
      const composed = titleTemplate ? titleTemplate.replace("%s", title) : title
      cleanups.push(setMetaTag(`meta[name="twitter:title"]`, { content: composed }))
    }
    if (description) {
      cleanups.push(setMetaTag(`meta[name="twitter:description"]`, { content: description }))
    }
    if (image) {
      cleanups.push(setMetaTag(`meta[name="twitter:image"]`, { content: image }))
    }

    // ---- favicon ----
    if (faviconUrl) {
      cleanups.push(setMetaTag(`link[rel="icon"]`, { href: faviconUrl }))
    }

    // ---- JSON-LD ----
    if (jsonLd) {
      const script = document.createElement("script")
      script.type = "application/ld+json"
      script.text = jsonLd
      script.setAttribute("data-dynamic-meta", "1")
      document.head.appendChild(script)
      cleanups.push(() => script.remove())
    }

    cleanupsRef.current = cleanups
    return () => {
      // Roll back in reverse order so dependent tags unwind cleanly.
      for (let i = cleanups.length - 1; i >= 0; i--) cleanups[i]()
    }
  }, [
    props.title,
    props.titleTemplate,
    props.description,
    props.image,
    props.url,
    props.type,
    props.faviconUrl,
    props.twitterCard,
    props.noindex,
    props.siteName,
    props.author,
    props.keywords?.join(","),
    props.jsonLd,
  ])

  return null
}
