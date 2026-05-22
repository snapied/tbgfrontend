"use client"

// Discussions has been folded into Communities.
//
// Why: course-level discussion threads and community feeds were two
// surfaces doing roughly the same job — "members talk under a topic".
// Keeping both made the dashboard feel duplicated and forced teachers
// to pick the "right" one. The merge keeps the more powerful surface
// (Communities = members + access controls + feeds + spaces + posts +
// reactions) and routes any old "/dashboard/discussions" bookmark
// here so the URL doesn't 404.
//
// Existing Discussion records in lms-store are untouched — they still
// appear in the Inbox rollup. Future product decision: migrate them
// into per-course communities on first open.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users2, ArrowRight, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const REDIRECT_AFTER_MS = 1800

export default function DiscussionsMovedPage() {
  const router = useRouter()

  // Soft auto-redirect so users with the old bookmark land on the
  // right page without an extra click. The visible card explains the
  // change for the second-or-two they see it.
  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard/batches"), REDIRECT_AFTER_MS)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="mx-auto max-w-xl pt-16">
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Discussions moved into Communities</h1>
            <p className="text-sm text-muted-foreground">
              We folded discussion threads into Communities so every conversation lives next to its people, access rules, and feed. You&apos;ll find course-level discussions inside the community that owns the course.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button asChild className="gap-1.5">
              <Link href="/dashboard/batches">
                <Users2 className="h-4 w-4" />
                Open Communities
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/inbox">See Inbox</Link>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Redirecting to Communities…</p>
        </CardContent>
      </Card>
    </div>
  )
}
