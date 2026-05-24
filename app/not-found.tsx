// Custom 404 — replaces the framework default. Branded chrome,
// useful next-steps, plus a quick search shortcut into the course
// catalog so a typo on a course slug doesn't dead-end the visitor.
//
// We render this as a Server Component so the page is statically
// optimised at build time. Anything dynamic (search, auth-aware
// CTAs) belongs in a child client component, not here.

import Link from "next/link"
import { Compass, BookOpen, Search, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header — mirrors the platform shell so the page reads as part
          of the site, not an error page from a different universe. */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="inline-flex">
            <Logo size="md" />
          </Link>
          <Button variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-6 py-16"
      >
        <div className="w-full max-w-2xl text-center">
          {/* Compass — friendlier than the literal "404". The big
              numeral still appears below so a visitor scanning the
              URL bar sees the error code they searched for. */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Compass className="h-10 w-10 text-primary" aria-hidden />
          </div>
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            404 · Page not found
          </p>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            We couldn&rsquo;t find that page.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            The link may be old, the URL may have a typo, or the resource may
            have moved. Pick one of the doors below — or head home and start
            fresh.
          </p>

          {/* Three doors — the most-asked-for destinations on the
              public site. Tuned by the kinds of links that lead to
              404s (mistyped course slugs, copy-pasted cert links). */}
          <div className="mx-auto mt-10 grid max-w-xl gap-3 text-left sm:grid-cols-3">
            <DoorCard
              href="/courses"
              icon={<BookOpen className="h-4 w-4" />}
              title="Browse courses"
              body="See everything published across the platform."
            />
            <DoorCard
              href="/verify"
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Verify a certificate"
              body="Look up any certificate by its ID."
            />
            <DoorCard
              href="/?q=#search"
              icon={<Search className="h-4 w-4" />}
              title="Search the site"
              body="Type what you&rsquo;re looking for on the home page."
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/">Take me home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} The Big Class. If a link from us
          brought you here, please{" "}
          <Link href="/contact" className="underline-offset-2 hover:underline">
            tell us
          </Link>
          .
        </p>
      </footer>
    </div>
  )
}

function DoorCard({
  href,
  icon,
  title,
  body,
}: {
  href: string
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
        {title}
      </span>
      <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
    </Link>
  )
}
