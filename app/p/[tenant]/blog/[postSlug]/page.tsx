"use client"

// Blog post detail. Renders the Tiptap body via the shared content
// renderer so the same typography rules used everywhere else apply.

import { use, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePortal } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { RichTextContent, stripRichTextTags } from "@/components/editor/rich-text-content"
import { BlogComments } from "@/components/portal/blog-comments"
import { BlogReactions } from "@/components/portal/blog-reactions"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ tenant: string; postSlug: string }>
}) {
  const { tenant, postSlug } = use(params)
  const { posts } = usePortal()
  const { getUserById } = useLMS()
  const brand = useTenantBrand()
  const post = useMemo(() => posts.find((p) => p.slug === postSlug), [posts, postSlug])

  if (!post || post.status !== "published") {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Post not found</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link href={`/p/${tenant}/blog`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> All posts
          </Link>
        </Button>
      </section>
    )
  }

  const author = getUserById(post.authorId)
  // Rough reading time — 220 wpm against the stripped body.
  const minutes = Math.max(1, Math.round(post.body.replace(/<[^>]+>/g, "").split(/\s+/).length / 220))
  // SEO inputs.
  // Title precedence: post.seo.title → post.title (the editor lets
  // teachers override the share/search title independently of the
  // on-page H1). Description falls back through post.seo.description
  // → post.excerpt → an auto-trim of the first ~160 chars of the
  // body, so even a post without explicit SEO copy ships with a
  // useful share preview.
  const metaTitle = post.seo?.title || post.title
  const autoExcerpt = stripRichTextTags(post.body).slice(0, 160).trim()
  const metaDescription =
    post.seo?.description || post.excerpt || (autoExcerpt ? autoExcerpt + "…" : undefined)
  const metaImage = post.seo?.ogImage || post.coverImage
  const articleJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: metaDescription,
    image: metaImage,
    datePublished: post.publishedAt ?? undefined,
    author: author ? { "@type": "Person", name: author.name } : undefined,
    keywords: post.tags?.join(", "),
  })

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
      <DynamicMeta
        title={metaTitle}
        titleTemplate={`%s · ${brand.name}`}
        description={metaDescription}
        image={metaImage || brand.logoUrl}
        type="article"
        siteName={brand.name}
        author={author?.name}
        keywords={post.tags}
        noindex={post.seo?.noindex || post.status !== "published"}
        jsonLd={articleJsonLd}
      />
      <Link
        href={`/p/${tenant}/blog`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Blog
      </Link>
      <header className="mt-6">
        {post.tags && post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {t}
              </span>
            ))}
          </div>
        )}
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-3 text-xl text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-5 flex items-center gap-4 text-sm text-muted-foreground">
          {author && (
            <div className="flex items-center gap-2">
              {author.avatar ? (
                <img src={author.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {author.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
              )}
              <span className="font-medium text-foreground">{author.name}</span>
            </div>
          )}
          <span>·</span>
          <span>{new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {minutes} min read
          </span>
        </div>
      </header>

      {post.coverImage && (
        <img
          src={post.coverImage}
          alt=""
          className="mt-8 aspect-video w-full rounded-xl object-cover"
        />
      )}

      <RichTextContent html={post.body} className="mt-8" />

      <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
        <Link
          href={`/p/${tenant}/blog`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All posts
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.share) {
              navigator.share({ title: post.title, url: window.location.href }).catch(() => {})
            } else if (typeof navigator !== "undefined") {
              navigator.clipboard?.writeText(window.location.href)
            }
          }}
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
        </Button>
      </div>

      {/* Reactions strip — six curated emojis, one tap to toggle.
          Hidden only when the author explicitly turned off "allow
          likes" on the post (the closest config flag to "reactions"
          we currently expose in the editor). */}
      {post.allowLikes !== false && <BlogReactions post={post} />}

      {/* Comments — hidden only when the author explicitly disabled
          them on the post. Default is "on". */}
      {post.allowComments !== false && <BlogComments post={post} />}
    </article>
  )
}
