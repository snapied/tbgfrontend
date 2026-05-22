"use client"

// Per-course detail under the tenant portal. For now this is a tenant-
// chromed summary + CTA that links into the canonical /courses/[slug]
// page for the full curriculum / reviews UI. (Re-skinning the full
// course page under the portal layout is a Phase 4 follow-up.)

import { use, useMemo } from "react"
import Link from "next/link"
import { ArrowRight, Clock, Star, Users } from "lucide-react"
import { EmailTeacherDialog } from "@/components/learn/email-teacher-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLMS } from "@/lib/lms-store"
import { formatMoney } from "@/lib/currency"
import { stripRichTextTags } from "@/components/editor/rich-text-content"

export default function PortalCourseDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>
}) {
  const { tenant, slug } = use(params)
  const { courses, getUserById } = useLMS()
  const course = useMemo(() => courses.find((c) => c.slug === slug), [courses, slug])
  if (!course) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Course not found</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link href={`/p/${tenant}/courses`}>← Back to courses</Link>
        </Button>
      </section>
    )
  }
  const instructor = getUserById(course.instructor.id) ?? course.instructor

  return (
    <div>
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {course.category && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                  {course.category}
                </span>
              )}
              <span className="capitalize text-muted-foreground">{course.level}</span>
            </div>
            <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              {stripRichTextTags(course.description).slice(0, 240)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-5 text-sm">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-semibold">{course.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({course.reviewCount} reviews)</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                {course.enrolledCount.toLocaleString()} enrolled
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {Math.round(course.totalDuration / 60)} hours
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Taught by{" "}
              <Link
                href={`/p/${tenant}/teachers/${instructor.id}`}
                className="font-medium text-primary hover:underline"
              >
                {instructor.name}
              </Link>
            </p>
          </div>

          <Card className="overflow-hidden py-0">
            <div className="aspect-video bg-muted">
              <img
                src={course.thumbnail || "/placeholder.svg?height=400&width=600"}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            </div>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {course.price > 0 ? formatMoney(course.price, course.currency) : "Free"}
                </span>
                {course.originalPrice && course.originalPrice > course.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatMoney(course.originalPrice, course.currency)}
                  </span>
                )}
              </div>
              <Button asChild className="w-full" size="lg">
                {/* Portal-scoped details route — wraps the global
                    rich course page and keeps the URL inside the
                    tenant namespace. */}
                <Link href={`/p/${tenant}/courses/details/${course.slug}`}>
                  See full curriculum & enroll <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {course.totalLessons} lessons &middot; lifetime access
              </p>
              {/* Pre-sale enquiry. Same dialog as the rich detail
                  page so the question lands in the dashboard inbox
                  and fires owner notifications. Surfaces here too
                  because a hesitant buyer might bounce off this
                  teaser without ever opening the detail page. */}
              <EmailTeacherDialog
                courseId={course.id}
                courseTitle={course.title}
                instructor={{
                  id: instructor.id,
                  name: instructor.name,
                  email: instructor.email,
                }}
                variant="ghost"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
