"use client"

// "More courses by <Instructor>" rail. Pulls every published course
// authored by the same instructor (excluding the one currently being
// viewed) and renders compact link cards with thumbnail, title, price,
// and rating. Renders nothing when the instructor has only this course.

import Link from "next/link"
import { Star, Users } from "lucide-react"
import { useMemo } from "react"
import { useLMS } from "@/lib/lms-store"
import { formatMoney } from "@/lib/currency"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  currentCourseId: string
  instructorId: string
  instructorName: string
}

export function InstructorOtherCourses({
  currentCourseId,
  instructorId,
  instructorName,
}: Props) {
  const { courses } = useLMS()
  const items = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.instructor.id === instructorId &&
          c.id !== currentCourseId &&
          c.status === "published",
      ),
    [courses, instructorId, currentCourseId],
  )

  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>More courses by {instructorName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.slug}`}
              className="group overflow-hidden rounded-md border border-border bg-card transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="aspect-video bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.thumbnail || "/placeholder.svg?height=400&width=600"}
                  alt={c.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1.5 p-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
                  {c.title}
                </p>
                {c.subtitle && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {c.subtitle || stripRichTextTags(c.description)}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {c.price > 0 ? formatMoney(c.price, c.currency) : "Free"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {c.reviewCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        {c.rating}
                      </span>
                    )}
                    {c.enrolledCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {c.enrolledCount.toLocaleString()}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {items.length > 4 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            +{items.length - 4} more from this instructor.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
