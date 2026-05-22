"use client"

// Tenant-scoped product detail page. Mirrors /store/[slug] but lives
// inside the portal layout (so it inherits the portal header, footer,
// announcement bar, theme), and "Back to store" / "Library" links stay
// scoped to /p/[tenant]/* instead of escaping into the global routes.

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  ShoppingCart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  formatPrice,
  money,
  useStore,
} from "@/lib/store-store"
import { videoEmbedUrl } from "@/lib/lesson-utils"
import { KindBadge } from "@/app/dashboard/store/page"
import { useLMS } from "@/lib/lms-store"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"

export default function PortalProductDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>
}) {
  const { tenant, slug } = use(params)
  const router = useRouter()
  const { getProductBySlug, hasProductAccess } = useStore()
  const { currentUser } = useLMS()
  const brand = useTenantBrand()

  const product = getProductBySlug(slug)
  const storeHref = `/p/${encodeURIComponent(tenant)}/store`

  if (!product || product.status !== "published") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <Package className="h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-2xl font-bold">Product not available</h1>
        <p className="mt-1 text-muted-foreground">It may have been removed or unpublished.</p>
        <Button asChild className="mt-4">
          <Link href={storeHref}><ArrowLeft className="mr-2 h-4 w-4" /> Back to store</Link>
        </Button>
      </main>
    )
  }

  const owns = currentUser ? hasProductAccess(currentUser.id, product.id) : false
  const soldOut = product.inventoryLimit !== undefined && product.inventorySold >= product.inventoryLimit
  const compareAt = product.pricing.type === "one-time" ? product.pricing.comparePrice : undefined
  const videoEmbed = product.previewVideoUrl ? videoEmbedUrl(product.previewVideoUrl) : null
  // Description is authored with the rich-text editor; if it contains
  // any HTML tags render via dangerouslySetInnerHTML inside a `prose`
  // block. Otherwise treat as plain text. stripRichTextTags is a cheap
  // detector — if the stripped text differs from the raw, it has markup.
  const descIsHtml = !!product.description && stripRichTextTags(product.description) !== product.description
  const productDescPlain = stripRichTextTags(product.description ?? "")
  const productMetaDescription =
    product.subtitle ||
    (productDescPlain ? productDescPlain.slice(0, 160).trim() + (productDescPlain.length > 160 ? "…" : "") : undefined)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <DynamicMeta
        title={product.title}
        titleTemplate={`%s · ${brand.name}`}
        description={productMetaDescription}
        image={product.coverImageUrl || brand.logoUrl}
        type="product"
        siteName={brand.name}
      />
      <Link
        href={storeHref}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to store
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left — preview + sales copy */}
        <article className="space-y-6">
          {/* Cover or video */}
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            {videoEmbed ? (
              <iframe
                src={videoEmbed}
                title={product.title}
                className="aspect-video w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : product.previewVideoUrl ? (
              <video src={product.previewVideoUrl} controls className="aspect-video w-full bg-black" />
            ) : product.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.coverImageUrl} alt={product.title} className="aspect-[1200/630] w-full object-cover" />
            ) : (
              <div className="aspect-[1200/630] w-full" />
            )}
          </div>

          {/* Title row */}
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={product.kind} />
              {product.tags?.map(t => <Badge key={t} variant="outline">{t}</Badge>)}
            </div>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight sm:text-4xl">
              {product.title}
            </h1>
            {product.subtitle && (
              <p className="text-lg text-muted-foreground">{product.subtitle}</p>
            )}
          </header>

          {/* Description */}
          {product.description && (
            descIsHtml ? (
              <section
                className="prose prose-sm max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <section className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {product.description}
              </section>
            )
          )}

          {/* Outcomes */}
          {(product.outcomes?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                What you&apos;ll get out of it
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.outcomes!.map((o, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Features */}
          {(product.features?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                What&apos;s included
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.features!.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* FAQ */}
          {(product.faq?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">FAQ</h2>
              <div className="space-y-3">
                {product.faq!.map(q => (
                  <div key={q.id} className="rounded-md border border-border/60 p-3">
                    <p className="text-sm font-medium">{q.question}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{q.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Right — buy card */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-3xl font-bold tabular-nums">{formatPrice(product.pricing)}</p>
                {compareAt && (
                  <p className="mt-0.5 text-sm text-muted-foreground line-through">
                    {money(compareAt, product.pricing.type === "one-time" ? product.pricing.currency : "USD")}
                  </p>
                )}
              </div>

              {owns ? (
                <Button asChild className="w-full" size="lg">
                  <Link href={`/p/${tenant}/library`}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    You own this — open library
                  </Link>
                </Button>
              ) : soldOut ? (
                <Button disabled className="w-full" size="lg">
                  Sold out
                </Button>
              ) : (
                <Button
                  onClick={() => router.push(`/checkout/${product.id}?back=${encodeURIComponent(storeHref)}`)}
                  className="w-full"
                  size="lg"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {product.pricing.type === "free" ? "Get for free" : "Buy now"}
                </Button>
              )}

              {product.refundPolicy && (
                <p className="text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {product.refundPolicy}
                </p>
              )}
              {product.inventoryLimit !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {Math.max(0, product.inventoryLimit - product.inventorySold)} of {product.inventoryLimit} left
                </p>
              )}
            </CardContent>
          </Card>

          {/* Testimonials */}
          {(product.testimonials?.length ?? 0) > 0 && (
            <Card>
              <CardContent className="space-y-3 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  People who took this
                </h3>
                {product.testimonials!.map(t => (
                  <figure key={t.id} className="space-y-1.5">
                    <blockquote className="text-sm italic">&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="text-xs text-muted-foreground">
                      — {t.author}{t.role && `, ${t.role}`}
                    </figcaption>
                  </figure>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </main>
  )
}
