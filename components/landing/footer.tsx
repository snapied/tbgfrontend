"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { SystemStatusPill } from "@/components/landing/system-status-pill"

interface Column {
  title: string
  links: Array<{ label: string; href: string }>
}

const COLUMNS: Column[] = [
  {
    title: "Product",
    links: [
      { label: "Live classes",   href: "/features/live-classes" },
      { label: "Courses",        href: "/features/courses" },
      { label: "Storefront",     href: "/features/storefront" },
      { label: "Community",      href: "/features/community" },
      { label: "Certificates",   href: "/features/certificates" },
      { label: "Refer & Earn",   href: "/features/refer-and-earn" },
      { label: "Pricing",        href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About",                 href: "/about" },
      { label: "Founder Bill of Rights", href: "/founder-bill-of-rights" },
      { label: "Use cases",             href: "/use-cases" },
      { label: "User guides",           href: "/guides" },
      { label: "Affiliate terms",       href: "/legal/affiliate" },
      { label: "Refund policy",         href: "/legal/refund" },
      { label: "Take-down policy",      href: "/legal/takedown" },
      { label: "Updates",               href: "/updates" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service",            href: "/legal/terms" },
      { label: "Privacy Policy",              href: "/legal/privacy" },
      { label: "Data Processing Addendum",    href: "/legal/dpa" },
      { label: "Cookies Policy",              href: "/legal/cookies" },
      { label: "UK Privacy Representation",   href: "/legal/uk-privacy" },
      { label: "GDPR Representation",         href: "/legal/gdpr" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Verify a certificate",   href: "/verify" },
      { label: "Use cases",              href: "/use-cases" },
      { label: "Help & support",         href: "/help" },
      { label: "Status & changelog",     href: "/updates" },
    ],
  },
  // Developers — the API surface is explicitly a wedge (the
  // incumbent creator platforms famously do not ship one). The link
  // belongs here, in the same footer that lists Pricing + Verify, so
  // prospective integrators can find it from any marketing page
  // without us needing to add a separate top-nav entry.
  {
    title: "Developers",
    links: [
      { label: "API & integrations",  href: "/developers" },
      { label: "Endpoints",           href: "/developers#endpoints" },
      { label: "Rate limits",         href: "/developers#rate-limits" },
      { label: "Get an API key",      href: "/dashboard/developer" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_3fr]">
          {/* Brand + address */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex">
              <Logo size="md" />
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              Everything a teaching brand needs — courses, live classes, storefront, certificates, community — under one login.
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="inline-flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold text-foreground">Divisocial Tech Solutions Pvt. Ltd.</span>
                  <br />
                  7-B Race Course Road, Dehradun
                  <br />
                  Uttarakhand 248001, India
                </span>
              </p>
              <p className="pl-5">Made in India · for educators worldwide.</p>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {col.title}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} Divisocial Tech Solutions Pvt. Ltd. The Big Class is a product of Divisocial.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {/* Live status indicator — links to /dashboard/status
                for the full per-service breakdown. Sits next to the
                legal links so it reads as quiet reassurance, not as
                a feature ad. */}
            <SystemStatusPill />
            <p>
              <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
              <span className="mx-2">·</span>
              <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
              <span className="mx-2">·</span>
              <Link href="/legal/cookies" className="hover:text-foreground">Cookies</Link>
            </p>
          </div>
        </div>

        {/* "Made with love in India" sits below the legal line as a
            warmth signal. The tricolour stripe to the left makes the
            sentiment unmistakable — soft patriotism, not flag-waving. */}
        <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground sm:flex-row">
          <span className="inline-flex h-1.5 w-12 overflow-hidden rounded-full ring-1 ring-border/60">
            <span className="flex-1 bg-orange-500" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-green-600" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            Built with <span className="text-red-500" aria-hidden>&hearts;</span>
            <span className="sr-only">love</span>
            in India — for the next generation of teachers.
          </span>
        </div>
      </div>
    </footer>
  )
}
