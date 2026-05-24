"use client"

// Blog post detail. Renders the Tiptap body via the shared content
// renderer so the same typography rules used everywhere else apply.

import { use, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BookOpen, Clock, Share2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { RichTextContent, stripRichTextTags } from "@/components/editor/rich-text-content"
import { BlogComments } from "@/components/portal/blog-comments"
import { BlogReactions } from "@/components/portal/blog-reactions"
import { BlogSubscribe } from "@/components/portal/blog-subscribe"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ tenant: string; postSlug: string }>
}) {
  const { tenant, postSlug } = use(params)
  const { posts } = usePortal()
  const { getUserById, courses } = useLMS()
  const brand = useTenantBrand()
  const post = useMemo(() => posts.find((p) => p.slug === postSlug), [posts, postSlug])

  // Sprint B Brand #34 — related-content engine.
  //   Related posts: tag overlap > category overlap > recency. We
  //   pick up to 3, exclude the current post + drafts.
  //   Related course: pick the published course with the highest
  //   tag/category overlap with this post. Falls back to highest-
  //   rated course when the post has no tags/category at all.
  const { relatedPosts, relatedCourse } = useMemo(() => {
    if (!post) return { relatedPosts: [], relatedCourse: null }
    const tagSet = new Set((post.tags ?? []).map((t) => t.toLowerCase()))
    const catSet = new Set((post.categories ?? []).map((c) => c.toLowerCase()))
    const scorePost = (p: typeof posts[number]): number => {
      if (p.id === post.id || p.status !== "published") return -1
      const tagOverlap = (p.tags ?? []).filter((t) => tagSet.has(t.toLowerCase())).length
      const catOverlap = (p.categories ?? []).filter((c) => catSet.has(c.toLowerCase())).length
      const recency = p.publishedAt ? new Date(p.publishedAt).getTime() / 1e12 : 0
      return tagOverlap * 3 + catOverlap * 2 + recency
    }
    const relatedPosts = [...posts]
      .filter((p) => p.id !== post.id && p.status === "published")
      .sort((a, b) => scorePost(b) - scorePost(a))
      .slice(0, 3)

    const scoreCourse = (c: typeof courses[number]): number => {
      if (c.status !== "published") return -1
      const cTags = new Set((c.tags ?? []).map((t) => t.toLowerCase()))
      const tagOverlap = [...tagSet].filter((t) => cTags.has(t)).length
      const catOverlap = c.category && catSet.has(c.category.toLowerCase()) ? 1 : 0
      const titleOverlap = post.title.toLowerCase().split(/\s+/).filter((w) =>
        w.length > 3 && c.title.toLowerCase().includes(w),
      ).length
      // Ratings + enrolment count provide a tie-break that biases
      // toward proven courses when overlap is thin.
      return tagOverlap * 5 + catOverlap * 3 + titleOverlap * 2 + (c.rating ?? 0) + (c.enrolledCount ?? 0) / 1000
    }
    const relatedCourse = [...courses]
      .filter((c) => c.status === "published")
      .sort((a, b) => scoreCourse(b) - scoreCourse(a))[0] ?? null
    return { relatedPosts, relatedCourse }
  }, [post, posts, courses])

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
  // Sprint D SEO — richer Article JSON-LD as an @graph. Adds:
  //   • Organization (provider identity; cross-referenced via @id)
  //   • BreadcrumbList (Google SERP renders a breadcrumb trail
  //     above the result instead of the raw URL — measurably lifts
  //     CTR on category-style content like blog posts)
  //   • mainEntityOfPage (Google's preferred pointer back to the
  //     canonical URL when the article is reused elsewhere)
  //   • wordCount + timeRequired (powers "X min read" rich
  //     features Google has been rolling out)
  const pageUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/p/${tenant}/blog/${post.slug}`
  const wordCount = post.body.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length
  const articleJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${pageUrl}#article`,
        headline: post.title,
        description: metaDescription,
        image: metaImage,
        datePublished: post.publishedAt ?? undefined,
        dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
        author: author ? { "@type": "Person", name: author.name } : undefined,
        publisher: { "@id": `${pageUrl}#org` },
        mainEntityOfPage: pageUrl,
        keywords: post.tags?.join(", "),
        articleSection: post.categories?.[0],
        wordCount,
        // 200 wpm is the SEO-typical reading speed Google uses.
        timeRequired: `PT${Math.max(1, Math.round(wordCount / 200))}M`,
        inLanguage: "en",
      },
      {
        "@type": "Organization",
        "@id": `${pageUrl}#org`,
        name: brand.name,
        url: `/p/${tenant}`,
        logo: brand.logoUrl,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `/p/${tenant}` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `/p/${tenant}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: pageUrl },
        ],
      },
    ],
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
            // Byline links to the author's public instructor profile
            // so a reader who liked the post can find the rest of
            // their work in one click.
            <Link
              href={`/p/${tenant}/instructors/${(author.email ?? "").split("@")[0]}`}
              className="flex items-center gap-2 transition-colors hover:text-foreground"
            >
              {author.avatar ? (
                <img
                  src={author.avatar}
                  alt={`${author.name} avatar`}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {author.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
              )}
              <span className="font-medium text-foreground hover:underline">
                {author.name}
              </span>
            </Link>
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

      {/* Sprint B Brand #34 — related-content engagement loop.
          Two side-by-side blocks on lg, stacked on mobile:
            • "Keep reading" — 3 related posts by tag/category overlap.
            • "Take it further" — 1 related course to convert blog
              readers into enrollees. This is the canonical blog-to-
              course funnel that didn't exist before.
          Each block hides individually when there's nothing to show
          (small tenant, sole post, etc). */}
      {(relatedPosts.length > 0 || relatedCourse) && (
        <section className="mt-12 grid gap-4 border-t border-border pt-8 lg:grid-cols-[2fr_1fr]">
          {relatedPosts.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Keep reading
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {relatedPosts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/p/${tenant}/blog/${p.slug}`}
                    className="group block"
                  >
                    <Card className="h-full overflow-hidden py-0 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                      {p.coverImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.coverImage}
                          alt=""
                          className="aspect-[4/3] w-full object-cover"
                        />
                      )}
                      <CardContent className="p-3">
                        <p className="line-clamp-3 text-[13px] font-semibold group-hover:text-primary">
                          {p.title}
                        </p>
                        {p.excerpt && (
                          <p className="mt-1 line-clamp-2 text-[11.5px] text-muted-foreground">
                            {p.excerpt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {relatedCourse && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="-mt-0.5 mr-1 inline h-3 w-3" />
                Take it further
              </p>
              <Link
                href={`/p/${tenant}/courses/details/${relatedCourse.slug}`}
                className="group mt-3 block"
              >
                <Card className="overflow-hidden border-primary/30 bg-primary/[0.04] py-0 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                  {relatedCourse.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={relatedCourse.thumbnail}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <CardContent className="p-4">
                    <p className="line-clamp-2 text-[13px] font-semibold group-hover:text-primary">
                      {relatedCourse.title}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                      <BookOpen className="h-3 w-3" />
                      Open course
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Subscribe rail — every blog reader is a marketable lead.
          Writes through to the portal-store's `leads` slice so the
          teacher sees subscribers in the same Inbox they already
          triage contact-form submissions in. */}
      <BlogSubscribe postSlug={postSlug} workspaceName={brand.name} />

      {/* Comments — hidden only when the author explicitly disabled
          them on the post. Default is "on". */}
      {post.allowComments !== false && <BlogComments post={post} />}
    </article>
  )
}
