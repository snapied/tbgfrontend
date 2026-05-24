"use client"

// Sprint B Brand #38 — CourseTestimonialsInline.
//
// Surfaces published portal testimonials on the course detail page
// (filtered by courseId or by aboutInstructorId via the course's
// instructor). The Wall of Love stays as the dedicated browsing
// surface; this component plants social proof exactly where the
// purchase decision is being made.
//
// Behaviour:
//   • Renders nothing when fewer than 2 testimonials match — a
//     single isolated quote reads as cherry-picked.
//   • Picks max 6, prefers featured > rating > recency.
//   • Quote-card grid, 2 cols on lg+. Compact card style; the full
//     Wall of Love handles long-form browsing.

import { useMemo } from "react"
import Link from "next/link"
import { ArrowRight, Heart, Quote, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { cn } from "@/lib/utils"

interface Props {
  courseId: string
  instructorId?: string
  /** Public link to /wall so visitors can browse the full set. Falls
   *  back to a generic "/wall" when no tenant prefix is provided. */
  wallHref?: string
}

export function CourseTestimonialsInline({
  courseId,
  instructorId,
  wallHref = "/wall",
}: Props) {
  const { testimonials } = usePortal()

  const matches = useMemo(() => {
    return testimonials
      .filter((t) => {
        if (t.status && t.status !== "published") return false
        if (t.courseId === courseId) return true
        if (instructorId && t.aboutInstructorId === instructorId) return true
        return false
      })
      .sort((a, b) => {
        // featured > higher rating > newer
        if ((b.featured ? 1 : 0) !== (a.featured ? 1 : 0)) {
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
        }
        if ((b.rating ?? 0) !== (a.rating ?? 0)) {
          return (b.rating ?? 0) - (a.rating ?? 0)
        }
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
      })
      .slice(0, 6)
  }, [testimonials, courseId, instructorId])

  if (matches.length < 2) return null

  return (
    <Card id="testimonials" className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Why students love this
          </CardTitle>
          <Link
            href={wallHref}
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
          >
            See all on the Wall of Love
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((t) => (
            <article
              key={t.id}
              className={cn(
                "relative flex flex-col gap-2 rounded-lg border bg-card p-4",
                t.featured ? "border-amber-500/30 bg-amber-500/[0.04]" : "border-border",
              )}
            >
              <Quote className="h-4 w-4 text-primary/40" />
              <p className="line-clamp-5 text-[13px] italic leading-relaxed">
                &ldquo;{stripTags(t.quote)}&rdquo;
              </p>
              <div className="mt-1 flex items-center gap-2">
                {t.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.avatar}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {t.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold">{t.authorName}</p>
                  {t.authorRole && (
                    <p className="truncate text-[11px] text-muted-foreground">{t.authorRole}</p>
                  )}
                </div>
                {t.rating ? (
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < Math.round(t.rating ?? 0)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Quotes can be authored as rich text via the testimonials editor;
 *  this surface is intentionally a compact card, so we strip tags
 *  before rendering. Whitespace is also collapsed. */
function stripTags(html: string): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
