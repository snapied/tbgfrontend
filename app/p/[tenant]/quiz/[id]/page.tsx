"use client"

// Tenant-scoped quiz player. When a non-logged-in user opens a shared
// quiz link, they see a guest entry form (name + email) before the
// quiz. If the quiz isn't in localStorage (guest on another device),
// it's fetched from the public-quiz API.

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileQuestion, Loader2, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QuizPlayer } from "@/components/quiz/quiz-player"
import { useLMS, type Quiz } from "@/lib/lms-store"
import { useTenantBrand } from "@/lib/tenant-brand"

const GUEST_KEY = "thebigclass.quiz.guest"

interface GuestInfo {
  id: string
  name: string
  email: string
}

function loadGuest(): GuestInfo | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(GUEST_KEY)
    return raw ? (JSON.parse(raw) as GuestInfo) : null
  } catch {
    return null
  }
}

function saveGuest(info: GuestInfo) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(info))
  } catch { /* ignore */ }
}

export default function TenantQuizPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant, id } = use(params)
  const { getQuizById, currentUser, getCourseById } = useLMS()
  const brand = useTenantBrand()
  const localQuiz = getQuizById(id)

  // If the quiz isn't in localStorage (guest on another device),
  // fetch it from the public-quiz API.
  const [remoteQuiz, setRemoteQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(!localQuiz)
  useEffect(() => {
    if (localQuiz) { setLoading(false); return }
    let cancelled = false
    fetch(`/api/public-quiz/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok && data.quiz) setRemoteQuiz(data.quiz)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, localQuiz])

  const quiz = localQuiz ?? remoteQuiz
  const course = quiz?.courseId ? getCourseById(quiz.courseId) : undefined

  const [guest, setGuest] = useState<GuestInfo | null>(null)
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")

  useEffect(() => {
    if (!currentUser) {
      const saved = loadGuest()
      if (saved) setGuest(saved)
    }
  }, [currentUser])

  const studentId = currentUser?.id ?? guest?.id ?? "guest"
  const isReady = !!currentUser || !!guest
  const homeHref = currentUser ? `/p/${tenant}/my` : `/p/${tenant}`

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimName = guestName.trim()
    const trimEmail = guestEmail.trim().toLowerCase()
    if (!trimName || !trimEmail) return
    const info: GuestInfo = {
      id: `guest-${trimEmail.replace(/[^a-z0-9]/g, "").slice(0, 12)}-${Date.now().toString(36)}`,
      name: trimName,
      email: trimEmail,
    }
    saveGuest(info)
    setGuest(info)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Quiz not found</h1>
          <p className="mt-1 text-muted-foreground">
            This quiz may have been removed or the link is incorrect.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/p/${tenant}/courses`}>Browse courses</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={homeHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentUser ? "My dashboard" : "Home"}
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                {brand.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="font-semibold">{brand.name}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {course && (
          <p className="mb-4 text-sm text-muted-foreground">
            Part of <span className="font-medium text-foreground">{course.title}</span>
          </p>
        )}

        {quiz.questions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-3 text-lg font-semibold">This quiz has no questions yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The creator hasn&apos;t added any questions. Check back later.
              </p>
            </CardContent>
          </Card>
        ) : !isReady ? (
          <Card className="mx-auto max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{quiz.title}</CardTitle>
              <CardDescription>
                Enter your details to start the quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGuestSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="guest-name">Your name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="guest-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Aanya Sharma"
                      className="pl-9"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="guest-email"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="aanya@example.com"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg">
                  Continue to quiz
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link href={`/p/${tenant}/login?next=/p/${tenant}/quiz/${id}`} className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        ) : (
          <QuizPlayer quiz={quiz} studentId={studentId} />
        )}
      </main>
    </div>
  )
}
