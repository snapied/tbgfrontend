"use client"

// Friendly empty state for dashboard pages that hit the real backend
// (billing / payouts / webhooks). Shown when there's no access token
// in localStorage — i.e. the user is in the legacy demo-login session
// where most of the dashboard works but anything calling the real
// Express API would 401 with "Missing or malformed Authorization
// header". We surface this as a clean "sign in to manage" card
// instead of dumping the cryptic backend error.

import Link from "next/link"
import { Lock, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  title: string
  description: string
  /** Optional list of bullet-style benefits shown under the description. */
  bullets?: string[]
}

export function SignInRequired({ title, description, bullets }: Props) {
  return (
    <Card className="mx-auto max-w-2xl border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="space-y-4 p-8">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {bullets && bullets.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild className="gap-1.5">
            <Link href="/login">
              Sign in <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/signup">Create workspace</Link>
          </Button>
        </div>
        <p className="pt-1 text-xs text-muted-foreground">
          Tip: you signed in via the demo path (phone or unrecognised email).
          That gets you into the dashboard, but features like Billing,
          Payouts, and Webhooks talk to the real backend and need a
          server-side account.
        </p>
      </CardContent>
    </Card>
  )
}
