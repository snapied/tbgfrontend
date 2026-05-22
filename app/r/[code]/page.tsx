"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Gift, Heart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"

/**
 * Public landing for a referral code. We pop a friendly "you've been
 * invited" splash, stash the code in localStorage so the signup page
 * picks it up even after a tab restart, and then bounce to /signup
 * with ?ref=<code> appended for explicit attribution.
 */
export default function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const router = useRouter()

  useEffect(() => {
    try {
      window.localStorage.setItem("thebigclass.global.pendingRef.v1", code)
    } catch { /* ignore */ }
  }, [code])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex">
            <Logo size="sm" />
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <Heart className="h-3 w-3 fill-current" /> You&apos;ve been invited
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Welcome to The Big Class
          </h1>
          <p className="mt-3 text-muted-foreground">
            A friend referred you. When you sign up with this link, they get a thank-you reward — and you get the same product everyone else does, except faster.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1 font-mono text-xs">
            Invite code <span className="font-bold text-foreground">{code}</span>
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <PerkCard icon={<Sparkles className="h-5 w-5" />} title="Free workspace" body="Start without a card." />
          <PerkCard icon={<CheckCircle2 className="h-5 w-5" />} title="60-second signup" body="No sales call required." />
          <PerkCard icon={<Gift className="h-5 w-5" />} title="They get a reward" body="Your friend gets a month free when you join." />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" onClick={() => router.push(`/signup?ref=${code}`)}>
            Continue to signup →
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Already have an account? Sign in
          </Link>
        </div>
      </section>
    </div>
  )
}

function PerkCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}
