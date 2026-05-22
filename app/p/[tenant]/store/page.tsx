"use client"

// Public storefront for a tenant — every published product (course
// access, downloads, memberships, 1-on-1 sessions, paid webinars,
// license keys, bundles) in one shoppable grid. Pulls from
// store-store; checkout still goes through the existing /store/[slug]
// route which already handles cart + payment.

import { use, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Box,
  Calendar,
  Crown,
  Download,
  Key,
  Search,
  Video as VideoIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useStore, type Product, type ProductKind } from "@/lib/store-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { formatMoney } from "@/lib/currency"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"

const KIND_META: Record<ProductKind, { label: string; icon: typeof BookOpen }> = {
  course:     { label: "Course", icon: BookOpen },
  download:   { label: "Download", icon: Download },
  bundle:     { label: "Bundle", icon: Box },
  membership: { label: "Membership", icon: Crown },
  session:    { label: "1-on-1 session", icon: Calendar },
  webinar:    { label: "Paid webinar", icon: VideoIcon },
  license:    { label: "License", icon: Key },
}

export default function PortalStorePage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const { products } = useStore()
  const brand = useTenantBrand()
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState<ProductKind | "all">("all")

  const published = useMemo(
    () => products.filter((p) => p.status === "published"),
    [products],
  )
  const counts = useMemo(() => {
    const out: Record<ProductKind, number> = {
      course: 0, download: 0, bundle: 0,
      membership: 0, session: 0, webinar: 0, license: 0,
    }
    for (const p of published) out[p.kind]++
    return out
  }, [published])
  const visibleKinds = (Object.keys(counts) as ProductKind[]).filter((k) => counts[k] > 0)

  const filtered = useMemo(() => {
    const byKind = kindFilter === "all" ? published : published.filter((p) => p.kind === kindFilter)
    return fuzzySearch(byKind, search, (p) => [p.title, p.subtitle ?? "", p.description.slice(0, 200)])
  }, [published, search, kindFilter])

  return (
    <div>
      <DynamicMeta
        title="Shop"
        titleTemplate={`%s · ${brand.name}`}
        description={`Courses, downloads, 1-on-1 sessions, webinars, memberships and more — everything ${brand.name} sells.`}
        image={brand.logoUrl}
        siteName={brand.name}
        type="website"
      />
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12">
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Shop</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
            Courses, downloads, 1-on-1 sessions, webinars, memberships and more — everything we sell.
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products — typos OK"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-full pl-12 text-base shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        {visibleKinds.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <KindChip
              active={kindFilter === "all"}
              onClick={() => setKindFilter("all")}
              label="All"
              count={published.length}
            />
            {visibleKinds.map((k) => {
              const meta = KIND_META[k]
              return (
                <KindChip
                  key={k}
                  active={kindFilter === k}
                  onClick={() => setKindFilter(k)}
                  label={meta.label}
                  count={counts[k]}
                  Icon={meta.icon}
                />
              )
            })}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nothing to show yet. The teacher hasn&apos;t published any products in this category.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} tenant={tenant} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function KindChip({
  active,
  onClick,
  label,
  count,
  Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  Icon?: typeof BookOpen
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span className={cn("text-[10px] font-normal", active ? "opacity-80" : "text-muted-foreground")}>
        {count}
      </span>
    </button>
  )
}

function ProductCard({ product, tenant }: { product: Product; tenant: string }) {
  const meta = KIND_META[product.kind]
  const Icon = meta.icon
  // Pricing display — products carry a discriminated union on `type`.
  const priceLabel = (() => {
    const pr = product.pricing
    if (pr.type === "free") return "Free"
    if (pr.type === "one-time") return formatMoney(pr.amount, pr.currency)
    if (pr.type === "subscription") {
      const period =
        pr.intervalDays === 30 ? "month" :
        pr.intervalDays === 90 ? "quarter" :
        pr.intervalDays === 180 ? "6 mo" : "year"
      return `${formatMoney(pr.amount, pr.currency)} / ${period}`
    }
    if (pr.type === "pay-what-you-want")
      return `From ${formatMoney(pr.minAmount, pr.currency)}`
    return "—"
  })()

  return (
    <Link
      href={`/p/${encodeURIComponent(tenant)}/store/${product.slug}`}
      className="group block"
    >
      <Card className="h-full overflow-hidden py-0 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {product.coverImageUrl ? (
            <img
              src={product.coverImageUrl}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              <Icon className="h-12 w-12" />
            </div>
          )}
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
            <Icon className="h-3 w-3" />
            {meta.label}
          </div>
        </div>
        <CardContent className="p-5">
          <h3 className="line-clamp-2 font-semibold text-foreground group-hover:text-primary">
            {product.title}
          </h3>
          {product.subtitle && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.subtitle}</p>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-lg font-bold">{priceLabel}</span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              View <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
