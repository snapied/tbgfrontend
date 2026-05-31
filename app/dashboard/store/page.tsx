"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Briefcase,
  CalendarClock,
  Copy,
  IndianRupee,
  Download,
  ExternalLink,
  Filter,
  Key,
  MoreHorizontal,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { generateId } from "@/lib/lms-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { PlanLimitWarning } from "@/components/dashboard/plan-lock"
import { RazorpayConnectionCard } from "@/components/store/razorpay-connection-card"
import { usePlan } from "@/lib/use-plan"
import {
  formatPrice,
  money,
  useStore,
  type ProductKind,
} from "@/lib/store-store"
import { useTenant } from "@/lib/tenant-store"
import { tenantPublicUrl } from "@/lib/tenant-resolver"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

const STORE_TOUR: TourStep[] = [
  {
    title: "Your storefront",
    body: "Sell anything digital: course access, downloads, 1-on-1 sessions, memberships, paid webinars, license keys, bundles.",
    emoji: "🛍️",
    placement: "center",
  },
  {
    target: "[data-tour='store-new']",
    title: "Add a product",
    body: "Pick a kind (course/download/session/etc), set pricing (free / one-time / subscription), upload a cover and preview video. Auto-syncs to your public Shop.",
    emoji: "➕",
    placement: "left",
  },
  {
    target: "[data-tour='store-view']",
    title: "View your live storefront",
    body: "Opens the public Shop page in a new tab. Share this link in newsletters, social, anywhere you sell.",
    emoji: "🌐",
    placement: "bottom",
  },
  {
    target: "[data-tour='store-orders']",
    title: "Orders",
    body: "Every paid order with fulfillment status, refunds, and customer detail.",
    emoji: "📦",
    placement: "bottom",
  },
  {
    target: "[data-tour='store-filters']",
    title: "Filter products",
    body: "Slice by kind or status. Searching is fuzzy so typos still find the product.",
    emoji: "🎛️",
    placement: "top",
  },
  {
    title: "Tip: pricing is flexible",
    body: "Switch between Free, One-time and Subscription. Optional refund policy, inventory limit, testimonials, FAQ — everything in one editor.",
    emoji: "💸",
    placement: "center",
  },
]

// Hard-gate state for "New product". Storefront-product cap is
// surfaced separately from the publishedCourses cap because a course
// can be sold as a product but they aren't the same axis (you can
// have downloads, memberships, 1-on-1s too). Pulled to module scope
// so the unused-vars hint stays quiet — usage is in the component.
function useStorefrontCap(productCount: number) {
  const { usageRemaining, limits, hydrated } = usePlan()
  const remaining = usageRemaining("storefrontProducts", productCount)
  return {
    atCap: hydrated && remaining !== Infinity && remaining <= 0,
    cap: limits.storefrontProducts,
  }
}

export default function StoreOverviewPage() {
  const { products, orders, addProduct, isSlugAvailable } = useStore()
  const { currentTenant } = useTenant()
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState<"all" | ProductKind>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all")

  // Duplicate from the row dropdown. Mirrors the editor-header
  // duplicate: reset sales counters, force draft, bump the slug to
  // "<slug>-copy" so the public URL doesn't collide.
  function duplicateProduct(productId: string) {
    const src = products.find((p) => p.id === productId)
    if (!src) return
    let candidate = src.slug ? `${src.slug}-copy` : ""
    let n = 2
    while (candidate && !isSlugAvailable(candidate)) {
      candidate = `${src.slug}-copy-${n}`
      n++
    }
    const now = new Date().toISOString()
    addProduct({
      ...src,
      id: generateId("prod"),
      title: `${src.title} (copy)`,
      slug: candidate,
      status: "draft",
      publishedAt: undefined,
      inventorySold: 0,
      createdAt: now,
      updatedAt: now,
    })
    toast.success("Duplicated.", {
      description: `"${src.title} (copy)" is a draft — edit it any time.`,
    })
  }

  const filtered = useMemo(() => {
    const base = [...products]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter(p => {
        if (kindFilter !== "all" && p.kind !== kindFilter) return false
        if (statusFilter !== "all" && p.status !== statusFilter) return false
        return true
      })
    return fuzzySearch(base, search, (p) => [p.title, p.slug])
  }, [products, search, kindFilter, statusFilter])

  // Sales rollup
  const paidOrders = orders.filter(o => o.status === "paid")
  const last30 = paidOrders.filter(o => Date.now() - new Date(o.paidAt ?? o.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000)
  const gross = paidOrders.reduce((acc, o) => acc + o.total, 0)
  const gross30 = last30.reduce((acc, o) => acc + o.total, 0)
  const primaryCurrency = paidOrders[0]?.currency ?? "USD"

  const storefrontUrl = currentTenant ? `${tenantPublicUrl(currentTenant.slug)}/store` : "/store"

  return (
    <div className="space-y-6">
      <ProductTour tourId="store-v1" steps={STORE_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Storefront</h1>
          <p className="text-muted-foreground">Sell courses, downloads, sessions, memberships — anything digital.</p>
          <PlanLimitWarning metric="storefrontProducts" current={products.length} className="mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TakeATourButton tourId="store-v1" />
          <Button variant="outline" asChild data-tour="store-view">
            <a href={storefrontUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View storefront
            </a>
          </Button>
          <Button variant="outline" asChild data-tour="store-orders">
            <Link href="/dashboard/store/orders">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Orders
            </Link>
          </Button>
          <NewProductButton productCount={products.length} />
        </div>
      </div>

      {/* Sales rollup. Hidden on a truly empty workspace — a wall
          of $0 / 0 / 0 tiles on the first visit reads as "this
          product is broken" instead of "you haven't sold anything
          yet". The kind quick-start cards take their place below. */}
      {products.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={<IndianRupee />} label="Gross sales (all time)" value={money(gross, primaryCurrency)} />
          <StatTile icon={<TrendingUp />} label="Gross (last 30 days)" value={money(gross30, primaryCurrency)} />
          <StatTile icon={<ShoppingBag />} label="Orders" value={`${paidOrders.length}`} />
          <StatTile icon={<Package />} label="Products" value={`${products.length}`} />
        </div>
      )}

      {/* Kind quick-start — only on first-time empty store. Drops
          the user one click away from a kind-prefilled editor,
          skipping the "what am I selling" decision when they
          already know. */}
      {products.length === 0 && <KindQuickStart />}

      {/* Razorpay connection + webhook URL. Shows up regardless so
          the admin sees the URL to paste even while still in stub
          mode — wiring the webhook BEFORE switching on real
          charges saves a lot of "where are my renewals?" debugging. */}
      <RazorpayConnectionCard />

      {/* Filters */}
      <Card data-tour="store-filters">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              pageId="storefront"
              value={search}
              onChange={setSearch}
              placeholder="Search products by title or slug…"
              ariaLabel="Search products"
              shortcutDescription="Focus product search"
              className="flex-1"
            />
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as "all" | ProductKind)}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="course">Course access</SelectItem>
                <SelectItem value="download">Download</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
                <SelectItem value="membership">Membership</SelectItem>
                <SelectItem value="session">Session</SelectItem>
                <SelectItem value="webinar">Webinar</SelectItem>
                <SelectItem value="license">License key</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "draft" | "published" | "archived")}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">
                {products.length === 0 ? "Your store is empty" : "Nothing matches those filters"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {products.length === 0
                  ? "Add your first product — a paid course, a PDF download, a bundle, anything."
                  : "Loosen the search or filters."}
              </p>
              {products.length === 0 && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/store/new">
                    <Plus className="mr-2 h-4 w-4" /> New product
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/store/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">/{p.slug}</p>
                    </TableCell>
                    <TableCell>
                      <KindBadge kind={p.kind} />
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">{formatPrice(p.pricing)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell>
                      <span className="font-medium tabular-nums">{p.inventorySold}</span>
                      {p.inventoryLimit !== undefined && (
                        <span className="text-muted-foreground">/{p.inventoryLimit}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {p.status === "published" && (
                          <Button variant="ghost" size="sm" asChild title="Open sales page">
                            <a
                              // The store is tenant-only now; build a
                              // direct portal URL when a workspace is
                              // active, fall back to the legacy /store
                              // redirect stub otherwise.
                              href={currentTenant?.slug ? `/p/${currentTenant.slug}/store/${p.slug}` : `/store/${p.slug}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/store/${p.id}`}>Edit</Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label="More actions">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onSelect={() => duplicateProduct(p.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            {p.status === "published" && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={currentTenant?.slug ? `/p/${currentTenant.slug}/store/${p.slug}` : `/store/${p.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open sales page
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/store/${p.id}`}>
                                Edit
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Plan-aware variant of the New-product CTA. Flips to "Upgrade to add
// a product" when the workspace is at the storefrontProducts cap; the
// /dashboard/store/new page also re-checks so a direct URL doesn't
// bypass. Same shape as the courses + faculty hard gates.
function NewProductButton({ productCount }: { productCount: number }) {
  const { atCap, cap } = useStorefrontCap(productCount)
  if (atCap) {
    return (
      <Button asChild variant="outline" data-tour="store-new" title={`You're at the ${cap}-product cap on your current plan. Upgrade to add another.`}>
        <Link href="/dashboard/billing">
          <Plus className="mr-2 h-4 w-4" />
          Upgrade to add a product
        </Link>
      </Button>
    )
  }
  return (
    <Button asChild data-tour="store-new">
      <Link href="/dashboard/store/new">
        <Plus className="mr-2 h-4 w-4" />
        New product
      </Link>
    </Button>
  )
}

// Onboarding rail surfaced only when the workspace has zero
// products. Each card deep-links into /new?kind=... so the first
// section of the editor is already filled in — the teacher just
// types a title and presses Save.
const QUICK_START_KINDS: Array<{
  kind: ProductKind
  label: string
  hint: string
  example: string
  icon: React.ReactNode
  gradient: string
}> = [
  { kind: "course",     label: "Course access",    hint: "Sell access to a course you've built.",        example: "e.g. React Fundamentals",       icon: <BookOpen className="h-5 w-5" />,       gradient: "from-violet-500/15 to-fuchsia-500/15" },
  { kind: "community",  label: "Paid community",   hint: "Subscription-gated cohort feed. Auto-joins buyers.", example: "e.g. The Founders Circle",      icon: <Users className="h-5 w-5" />,          gradient: "from-rose-500/15 to-fuchsia-500/15" },
  { kind: "membership", label: "Membership",       hint: "Recurring access to a set of products.",       example: "e.g. The Maker Club",           icon: <Sparkles className="h-5 w-5" />,       gradient: "from-amber-500/15 to-rose-500/15" },
  { kind: "session",    label: "1-on-1 session",   hint: "Coaching call with a booking link.",           example: "e.g. 30-min strategy call",     icon: <CalendarClock className="h-5 w-5" />,  gradient: "from-emerald-500/15 to-lime-500/15" },
  { kind: "webinar",    label: "Paid webinar",     hint: "Charge for a live class.",                     example: "e.g. Friday Q&A",               icon: <Video className="h-5 w-5" />,          gradient: "from-blue-500/15 to-indigo-500/15" },
  { kind: "download",   label: "Digital download", hint: "PDF, audio, video, ZIP — one or many files.",  example: "e.g. The Notion Templates Pack", icon: <Download className="h-5 w-5" />,       gradient: "from-sky-500/15 to-cyan-500/15" },
  { kind: "bundle",     label: "Bundle",           hint: "Combine products at a special price.",         example: "e.g. Year-end bundle",          icon: <Package className="h-5 w-5" />,        gradient: "from-orange-500/15 to-red-500/15" },
  { kind: "license",    label: "License key",      hint: "Templates / software with serial keys.",       example: "e.g. Lifetime license",         icon: <Key className="h-5 w-5" />,            gradient: "from-slate-500/15 to-zinc-500/15" },
]

function KindQuickStart() {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Spin up your first product</h2>
            <p className="text-sm text-muted-foreground">
              Pick what you&apos;re selling — we&apos;ll skip you past the &quot;what kind?&quot; screen.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/store/new">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Not sure yet — start blank
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {QUICK_START_KINDS.map((k) => (
            <Link
              key={k.kind}
              href={`/dashboard/store/new?kind=${k.kind}`}
              className={cn(
                "group relative overflow-hidden rounded-lg border border-border bg-gradient-to-br p-4 transition hover:-translate-y-0.5 hover:shadow-md",
                k.gradient,
              )}
            >
              <div className="flex items-center gap-2 text-primary">
                {k.icon}
                <p className="font-semibold text-foreground">{k.label}</p>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{k.hint}</p>
              <p className="mt-2 text-[11px] italic text-muted-foreground/80">{k.example}</p>
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                Start <Plus className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function KindBadge({ kind }: { kind: ProductKind }) {
  const map = {
    course:     { icon: <BookOpen     className="h-3 w-3" />, label: "Course"     },
    community:  { icon: <Users        className="h-3 w-3" />, label: "Community"  },
    download:   { icon: <Download     className="h-3 w-3" />, label: "Download"   },
    bundle:     { icon: <Package      className="h-3 w-3" />, label: "Bundle"     },
    membership: { icon: <Sparkles     className="h-3 w-3" />, label: "Membership" },
    session:    { icon: <CalendarClock className="h-3 w-3" />, label: "Session"   },
    webinar:    { icon: <Video        className="h-3 w-3" />, label: "Webinar"    },
    license:    { icon: <Key          className="h-3 w-3" />, label: "License"    },
  } as const
  const meta = map[kind] ?? { icon: <Briefcase className="h-3 w-3" />, label: kind }
  return <Badge variant="secondary" className="gap-1">{meta.icon}{meta.label}</Badge>
}

function StatusBadge({ status }: { status: "draft" | "published" | "archived" }) {
  if (status === "published") return <Badge className="bg-success text-success-foreground">Published</Badge>
  if (status === "archived")  return <Badge variant="outline">Archived</Badge>
  return <Badge variant="secondary">Draft</Badge>
}
