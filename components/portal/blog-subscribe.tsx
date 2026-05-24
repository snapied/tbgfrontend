"use client"

// "Subscribe to the next post" inline form rendered at the end of
// every blog post. Free list-building for the instructor: every
// blog reader becomes a marketable email lead without extra setup.
//
// Persistence: writes into the existing PortalLead store with
// formId = "blog-subscribe", source = post slug. The dashboard
// inbox surfaces all leads in one place, so a teacher seeing 12
// new subscribers in a week gets the same triage UX they already
// know.

import { useState } from "react"
import { Mail, Send, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { toast } from "sonner"

interface Props {
  /** Slug of the post the subscriber is reading. Stored on the lead
   *  so the teacher knows which post hooked which reader. */
  postSlug: string
  /** Workspace name — drops into the success copy so it reads as
   *  the teacher's voice, not the platform's. */
  workspaceName: string
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function BlogSubscribe({ postSlug, workspaceName }: Props) {
  const { addLead } = usePortal()
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <Card className="mt-12 border-primary/20 bg-primary/[0.04]">
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:text-left">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
          <p className="text-sm">
            <span className="font-semibold">You&apos;re on the list.</span>{" "}
            <span className="text-muted-foreground">
              We&apos;ll email you when {workspaceName} publishes next — no
              spam, no resold lists.
            </span>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-12 border-primary/20 bg-primary/[0.04]">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-bold leading-tight tracking-tight">
              Get the next post in your inbox
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              One short email when {workspaceName} publishes something new.
              Unsubscribe with a single click.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const clean = email.trim().toLowerCase()
                if (!EMAIL_RE.test(clean)) {
                  toast.error("Need a valid email address.")
                  return
                }
                setSubmitting(true)
                try {
                  addLead({
                    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    formId: "blog-subscribe",
                    pageSlug: `/blog/${postSlug}`,
                    email: clean,
                    source: postSlug,
                    status: "new",
                    createdAt: new Date().toISOString(),
                  })
                  setDone(true)
                } finally {
                  setSubmitting(false)
                }
              }}
              className="mt-3 flex flex-col gap-2 sm:flex-row"
            >
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={submitting || !email.trim()}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {submitting ? "Subscribing…" : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
