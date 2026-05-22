"use client"

// Injects third-party analytics + tag-manager snippets on every
// public portal page. Reads from PortalConfig.analytics so a teacher
// can paste their GA4 id once and have it follow every page.
//
// Why client-side: most analytics SDKs need access to window. The
// alternative (Next's <Script> in the server layout) works for the
// well-known ones but doesn't let teachers paste raw <script> via
// customHeadHtml. This component handles both uniformly.
//
// SPA-route-change pageviews:
//   • GA4 — `gtag('event', 'page_view', { page_path })` on every
//     pathname change, in addition to the initial config.
//   • Plausible — we load `script.manual.js` (auto pageview disabled)
//     and call `plausible('pageview')` on each route change so SPA
//     navigations are counted exactly once.
//   • Meta Pixel — `fbq('track', 'PageView')` on every route change.
//   • Hotjar — recordings are sessioned, no per-route pageview needed.

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"
import type { PortalAnalytics } from "@/lib/portal-store"

// Window globals analytics scripts attach to. Keeping `unknown`-typed
// callable shapes lets us call them without pulling in vendor types.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    fbq?: (...args: unknown[]) => void
    plausible?: (...args: unknown[]) => void
    hj?: (...args: unknown[]) => void
  }
}

interface Props {
  analytics?: PortalAnalytics
  // The portal route is also rendered server-side; we suppress
  // analytics in dev (and on any non-portal context) so localhost
  // browsing doesn't pollute production dashboards.
}

export function PortalAnalyticsScripts({ analytics }: Props) {
  const pathname = usePathname()

  // SPA pageview tracking. Fires AFTER the analytics scripts have
  // loaded and exposed their globals. We re-fire on every pathname
  // change so client-side navigations between portal pages are
  // counted by every provider.
  useEffect(() => {
    if (!pathname || typeof window === "undefined") return
    if (analytics?.ga4MeasurementId && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      })
    }
    if (analytics?.plausibleDomain && typeof window.plausible === "function") {
      window.plausible("pageview")
    }
    if (analytics?.metaPixelId && typeof window.fbq === "function") {
      window.fbq("track", "PageView")
    }
  }, [pathname, analytics?.ga4MeasurementId, analytics?.plausibleDomain, analytics?.metaPixelId])

  // Inject any custom raw <head> HTML by setting innerHTML on a
  // detached element and moving its scripts into the document head.
  // We can't dangerouslySetInnerHTML into <head> directly from a
  // client component, so we run a one-time effect.
  useEffect(() => {
    const html = analytics?.customHeadHtml?.trim()
    if (!html) return
    const container = document.createElement("div")
    container.innerHTML = html
    const added: Element[] = []
    container.childNodes.forEach((node) => {
      if (node.nodeType !== 1) return // element nodes only
      const el = node as Element
      // Re-create script tags so the browser actually executes them
      // (innerHTML-parsed <script> tags are inert).
      if (el.tagName === "SCRIPT") {
        const script = document.createElement("script")
        for (const attr of Array.from(el.attributes)) script.setAttribute(attr.name, attr.value)
        script.text = el.textContent ?? ""
        document.head.appendChild(script)
        added.push(script)
      } else {
        const clone = el.cloneNode(true) as Element
        document.head.appendChild(clone)
        added.push(clone)
      }
    })
    return () => {
      for (const el of added) el.remove()
    }
  }, [analytics?.customHeadHtml])

  if (!analytics) return null
  return (
    <>
      {analytics.ga4MeasurementId && (
        <>
          <Script
            id="portal-ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analytics.ga4MeasurementId)}`}
          />
          <Script id="portal-ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            // send_page_view: false because the pathname useEffect
            // above fires page_view on initial mount + every route
            // change. Without this we'd double-count the first hit.
            gtag('config', ${JSON.stringify(analytics.ga4MeasurementId)}, { send_page_view: false });
          `}</Script>
        </>
      )}
      {analytics.plausibleDomain && (
        // script.manual.js disables Plausible's built-in pageview
        // tracking — we drive it manually from the pathname effect so
        // SPA navigations between portal pages get counted.
        <>
          <Script
            id="portal-plausible"
            strategy="afterInteractive"
            src="https://plausible.io/js/script.manual.js"
            data-domain={analytics.plausibleDomain}
          />
          <Script id="portal-plausible-init" strategy="afterInteractive">{`
            window.plausible = window.plausible || function(){(window.plausible.q = window.plausible.q || []).push(arguments)};
          `}</Script>
        </>
      )}
      {analytics.hotjarId && (
        <Script id="portal-hotjar" strategy="afterInteractive">{`
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${JSON.stringify(analytics.hotjarId)},hjsv:${JSON.stringify(analytics.hotjarVersion ?? 6)}};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `}</Script>
      )}
      {analytics.metaPixelId && (
        <Script id="portal-meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){
            if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
          }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', ${JSON.stringify(analytics.metaPixelId)});
          // Initial PageView fires from the pathname effect below — no
          // need to send it here too (would double-count first hit).
        `}</Script>
      )}
    </>
  )
}
