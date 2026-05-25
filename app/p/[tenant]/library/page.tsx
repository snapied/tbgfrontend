"use client"

// Tenant-scoped "My library" — every purchase the visitor has made
// on this workspace's store, grouped by product kind. Mirrors the
// (now-removed) platform /library page but lives inside the tenant
// layout so it picks up the workspace's brand, header, and footer.
//
// Authentication shape: still the email-stash POC pattern. A
// signed-in student resolves directly; an anonymous buyer types
// the email the receipt was sent to and we stash it in
// localStorage. Real auth slots in here once the per-tenant login
// machinery is wired end-to-end (the page also surfaces the
// /p/[tenant]/login link as the primary path now).

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  CalendarClock,
  Download,
  ExternalLink,
  Key,
  LibraryBig,
  Lock,
  Receipt,
  ShoppingBag,
  Sparkles,
  Users,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useStore,
  type Entitlement,
  type EntitlementType,
} from "@/lib/store-store"
import { useLMS } from "@/lib/lms-store"

const LIBRARY_EMAIL_KEY = "thebigclass.library.email.v1"

// Same email→customerId derivation as checkout so the library
// finds the buyer's entitlements regardless of how they signed in.
function customerIdFor(email: string): string {
  let h = 5381
  const s = email.toLowerCase()
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return `cust-${(h >>> 0).toString(36)}`
}

export default function PortalLibraryPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const basePath = `/p/${tenant}`
  const { entitlements, orders } = useStore()
  const { currentUser, getCourseById } = useLMS()
  const [emailInput, setEmailInput] = useState("")
  const [identifiedEmail, setIdentifiedEmail] = useState("")

  useEffect(() => {
    if (currentUser?.email) {
      setIdentifiedEmail(currentUser.email.toLowerCase())
      return
    }
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(LIBRARY_EMAIL_KEY)
      if (stored) setIdentifiedEmail(stored.toLowerCase())
    } catch {
      /* ignore */
    }
  }, [currentUser])

  const customerId = identifiedEmail
    ? currentUser?.email?.toLowerCase() === identifiedEmail
      ? currentUser!.id
      : customerIdFor(identifiedEmail)
    : null

  const ents = useMemo(() => {
    if (!customerId) return []
    return entitlements.filter(
      (e) =>
        e.customerId === customerId &&
        (!e.expiresAt || new Date(e.expiresAt).getTime() > Date.now()),
    )
  }, [entitlements, customerId])

  const orderHistory = useMemo(() => {
    if (!customerId) return []
    return orders
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [orders, customerId])

  const grouped = useMemo(() => {
    const g: Record<EntitlementType, Entitlement[]> = {
      course: [],
      download: [],
      session: [],
      webinar: [],
      license: [],
      membership: [],
      community: [],
    }
    for (const e of ents) g[e.type].push(e)
    return g
  }, [ents])

  const totalItems = ents.length

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            <LibraryBig className="mr-1 inline h-3 w-3" />
            My library
          </p>
          <h1 className="mt-1 font-serif text-3xl font-extrabold tracking-tight">
            {identifiedEmail ? "Welcome back" : "Find your library"}
          </h1>
          {identifiedEmail && (
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{identifiedEmail}</span> · {totalItems} item{totalItems === 1 ? "" : "s"}
              {!currentUser && (
                <>
                  {" · "}
                  <button
                    className="underline"
                    onClick={() => {
                      try {
                        window.localStorage.removeItem(LIBRARY_EMAIL_KEY)
                      } catch {
                        /* ignore */
                      }
                      setIdentifiedEmail("")
                    }}
                  >
                    Switch
                  </button>
                </>
              )}
            </p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`${basePath}/store`}>
            <ShoppingBag className="mr-2 h-4 w-4" /> Browse store
          </Link>
        </Button>
      </header>

      {!identifiedEmail ? (
        <Card>
          <CardContent className="max-w-md space-y-3 p-5">
            <Label>Email used at checkout</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
              />
              <Button
                onClick={() => {
                  const e = emailInput.trim().toLowerCase()
                  if (!e) return
                  try {
                    window.localStorage.setItem(LIBRARY_EMAIL_KEY, e)
                  } catch {
                    /* ignore */
                  }
                  setIdentifiedEmail(e)
                }}
                disabled={!emailInput.trim()}
              >
                Open
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll show every purchase tied to this email. Already have an account?{" "}
              <Link href={`${basePath}/login`} className="font-medium text-primary hover:underline">
                Sign in
              </Link>
              {" "}— your library follows your account.
            </p>
          </CardContent>
        </Card>
      ) : ents.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <LibraryBig className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">Nothing here yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              When you buy from the store, your purchases show up here automatically.
            </p>
            <Button asChild className="mt-4">
              <Link href={`${basePath}/store`}>Browse the store</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {grouped.course.length > 0 && (
            <Section title="Courses">
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped.course.map((e) => (
                  <CourseTile key={e.id} entitlement={e} basePath={basePath} />
                ))}
              </div>
            </Section>
          )}
          {grouped.community.length > 0 && (
            <Section title="Communities">
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped.community.map((e) => (
                  <CommunityTile key={e.id} entitlement={e} basePath={basePath} />
                ))}
              </div>
            </Section>
          )}
          {grouped.membership.length > 0 && (
            <Section title="Memberships">
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped.membership.map((e) => (
                  <MembershipTile key={e.id} entitlement={e} />
                ))}
              </div>
            </Section>
          )}
          {grouped.download.length > 0 && (
            <Section title="Downloads">
              <div className="grid gap-3">
                {grouped.download.map((e) => (
                  <DownloadTile key={e.id} entitlement={e} />
                ))}
              </div>
            </Section>
          )}
          {grouped.session.length > 0 && (
            <Section title="Sessions">
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped.session.map((e) => (
                  <SessionTile key={e.id} entitlement={e} />
                ))}
              </div>
            </Section>
          )}
          {grouped.webinar.length > 0 && (
            <Section title="Webinars">
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped.webinar.map((e) => (
                  <WebinarTile key={e.id} entitlement={e} />
                ))}
              </div>
            </Section>
          )}
          {grouped.license.length > 0 && (
            <Section title="License keys">
              <div className="grid gap-3">
                {grouped.license.map((e) => (
                  <LicenseTile key={e.id} entitlement={e} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {identifiedEmail && orderHistory.length > 0 && (
        <Section title="Order history">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {orderHistory.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {o.productSnapshot.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {o.status}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/order/${o.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Section>
      )}

      <CourseFallback courseLookup={getCourseById} />
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

function CourseTile({ entitlement, basePath }: { entitlement: Entitlement; basePath: string }) {
  const { products } = useStore()
  const { getCourseById } = useLMS()
  const product = products.find((p) => p.id === entitlement.productId)
  const course = entitlement.reference ? getCourseById(entitlement.reference) : undefined
  return (
    <Tile
      icon={<BookOpen className="h-4 w-4" />}
      title={course?.title ?? product?.title ?? "Course"}
      action={course ? { label: "Start", href: `${basePath}/learn/${course.slug}` } : undefined}
      hint={course ? `${course.totalLessons} lessons · ${course.totalDuration} min` : "Course unavailable"}
      cover={product?.coverImageUrl ?? course?.thumbnail}
    />
  )
}

function MembershipTile({ entitlement }: { entitlement: Entitlement }) {
  const { products } = useStore()
  const product = products.find((p) => p.id === entitlement.productId)
  return (
    <Tile
      icon={<Sparkles className="h-4 w-4" />}
      title={product?.title ?? "Membership"}
      hint={entitlement.expiresAt ? `Renews ${new Date(entitlement.expiresAt).toLocaleDateString()}` : "Active"}
      cover={product?.coverImageUrl}
    />
  )
}

function CommunityTile({
  entitlement,
  basePath,
}: {
  entitlement: Entitlement
  basePath: string
}) {
  const { products } = useStore()
  const { studentGroups } = useLMS()
  const product = products.find((p) => p.id === entitlement.productId)
  // entitlement.reference points at the StudentGroup id
  const group = studentGroups.find((g) => g.id === entitlement.reference)
  const expires = entitlement.expiresAt
    ? `Renews ${new Date(entitlement.expiresAt).toLocaleDateString()}`
    : "Member"
  const memberCount = group?.memberIds.length ?? 0
  return (
    <Tile
      icon={<Users className="h-4 w-4" />}
      title={group?.name ?? product?.title ?? "Community"}
      hint={`${expires} · ${memberCount} ${memberCount === 1 ? "member" : "members"}`}
      cover={product?.coverImageUrl}
      action={
        group
          ? {
              label: "Open community",
              href: `${basePath}/my/communities/${group.id}`,
            }
          : undefined
      }
    />
  )
}

function DownloadTile({ entitlement }: { entitlement: Entitlement }) {
  const { products } = useStore()
  const product = products.find((p) => p.id === entitlement.productId)
  if (!product || product.delivery.kind !== "file-download") {
    return <Tile icon={<Download className="h-4 w-4" />} title={product?.title ?? "Download"} hint="Files unavailable" />
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Download className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{product.title}</p>
            <ul className="mt-2 space-y-1">
              {product.delivery.files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 rounded border border-border/60 px-2 py-1 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{f.filename}</span>
                  <a
                    href={f.url}
                    download={f.filename}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Download <Download className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SessionTile({ entitlement }: { entitlement: Entitlement }) {
  const { products } = useStore()
  const product = products.find((p) => p.id === entitlement.productId)
  const bookingUrl = product?.delivery.kind === "session" ? product.delivery.bookingUrl : undefined
  return (
    <Tile
      icon={<CalendarClock className="h-4 w-4" />}
      title={product?.title ?? "Session"}
      action={bookingUrl ? { label: "Book time", href: bookingUrl, external: true } : undefined}
      hint={product?.delivery.kind === "session" ? `${product.delivery.durationMinutes} min` : undefined}
    />
  )
}

function WebinarTile({ entitlement }: { entitlement: Entitlement }) {
  const { products } = useStore()
  const product = products.find((p) => p.id === entitlement.productId)
  const meeting = product?.delivery.kind === "webinar" ? product.delivery.meetingUrl : undefined
  const when = product?.delivery.kind === "webinar" ? product.delivery.scheduledAt : undefined
  return (
    <Tile
      icon={<Video className="h-4 w-4" />}
      title={product?.title ?? "Webinar"}
      action={meeting ? { label: "Join", href: meeting, external: true } : undefined}
      hint={when ? new Date(when).toLocaleString() : "Link arriving"}
    />
  )
}

function LicenseTile({ entitlement }: { entitlement: Entitlement }) {
  const { products } = useStore()
  const product = products.find((p) => p.id === entitlement.productId)
  const copy = async () => {
    if (!entitlement.reference) return
    try {
      await navigator.clipboard.writeText(entitlement.reference)
    } catch {
      /* ignore */
    }
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Key className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{product?.title ?? "License"}</p>
            <code className="mt-1 inline-block rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {entitlement.reference}
            </code>
          </div>
          <Button size="sm" variant="outline" onClick={copy}>
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Tile({
  icon,
  title,
  hint,
  action,
  cover,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
  action?: { label: string; href: string; external?: boolean }
  cover?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-14 w-20 rounded object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{title}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          {action ? (
            action.external ? (
              <Button size="sm" variant="outline" asChild>
                <a href={action.href} target="_blank" rel="noreferrer">
                  {action.label} <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            )
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Quiets the "getCourseById is declared but not used" hint when no
// course tiles render. The lookup is invoked deep in CourseTile via
// useLMS() — this prop-drilled stub just keeps the linter quiet.
function CourseFallback({ courseLookup: _courseLookup }: { courseLookup: unknown }) {
  return null
}
