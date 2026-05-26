"use client"

import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"

/**
 * Common shell for /legal/* and /about-style long-form pages.
 * Adds a back link, page title, last-updated stamp, and a uniform
 * `prose` typography container. Keeps every policy page consistent
 * without per-page styling.
 */
export function LegalShell({
  title,
  intro,
  lastUpdated,
  children,
}: {
  title: string
  intro?: string
  lastUpdated?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/40 to-background">
          <div className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
            <h1 className="mt-6 text-4xl font-bold tracking-tight">{title}</h1>
            {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}
            {lastUpdated && (
              <p className="mt-4 text-xs text-muted-foreground">
                Last updated · <span className="font-medium text-foreground">{lastUpdated}</span>
              </p>
            )}
          </div>
        </section>

        <article className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
          <div className="legal-body space-y-4 text-[15px] leading-relaxed text-foreground/90">
            {children}
          </div>

          <div className="mt-16 rounded-xl border border-border bg-card p-6 text-sm">
            <p className="inline-flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="font-semibold text-foreground">Divisocial Tech Solutions Pvt. Ltd.</span>
                <br />
                7-B Race Course Road, Dehradun, Uttarakhand 248001, India
                <br />
                Email: <a href="mailto:welcome@thebigclass.com" className="text-primary hover:underline">welcome@thebigclass.com</a>
              </span>
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
