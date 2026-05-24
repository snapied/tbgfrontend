"use client"

// "Share invite link" page. Students self-onboard by clicking the
// workspace URL — there's no opt-in code or seat-allocation flow
// for students (unlike faculty, who get an /api/auth/invite-request
// email). The workspace's public portal is the invite: anyone with
// the URL can sign up and browse courses.
//
// Why a dedicated page instead of a dialog: the empty-state link
// (/dashboard/students?mode=invite) used to drop people into the
// generic create-student form, which didn't actually surface a
// URL. This is the missing piece — a place that shows the link,
// gives one-click copy, and provides templated share messages for
// the channels teachers actually use (WhatsApp, email).

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Copy,
  Mail,
  MessageCircle,
  Send,
  Share2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-store"
import { useLMS } from "@/lib/lms-store"

export default function StudentInvitePage() {
  const router = useRouter()
  const { currentTenant } = useTenant()
  const { currentUser } = useLMS()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // The shareable URL. In dev we surface the local origin so the
  // teacher can test the flow before going to prod; in prod the
  // origin is whatever the page is served from. Falls back to the
  // tenant slug path if the window isn't available (SSR — though
  // this page is "use client").
  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    const origin = window.location.origin
    const slug = currentTenant?.slug
    if (!slug) return `${origin}/signup`
    // The "/courses" deep-link drops the visitor straight into the
    // catalog rather than the marketing root — most teachers want
    // the share recipient to see enrollable courses immediately, not
    // a hero banner.
    return `${origin}/p/${slug}/courses`
  }, [currentTenant?.slug])

  const workspaceName = currentTenant?.name ?? "our workspace"

  const whatsappTemplate = `Hey! I'm teaching on ${workspaceName} and would love for you to join. Browse the courses and enrol here: ${inviteUrl}`
  const emailSubjectTemplate = `You're invited to join ${workspaceName}`
  const emailBodyTemplate = `Hi,\n\nI'm running my courses on ${workspaceName}. You can browse what I'm offering and sign up here:\n\n${inviteUrl}\n\nLet me know if you have any questions.\n\n${currentUser?.name ?? "Your instructor"}`

  async function copy(value: string, field: string, label = "Link") {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      toast.success(`${label} copied to clipboard.`)
      setTimeout(() => setCopiedField((cur) => (cur === field ? null : cur)), 2000)
    } catch {
      toast.error("Copy failed — long-press the field and copy manually.")
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappTemplate)}`
  const mailtoHref = `mailto:?subject=${encodeURIComponent(emailSubjectTemplate)}&body=${encodeURIComponent(emailBodyTemplate)}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/students")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to students
        </Button>
        <Link
          href="/help/students"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          How student onboarding works
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Share an invite link</h1>
        <p className="text-sm text-muted-foreground">
          Paste this link in WhatsApp, email, or anywhere your students hang out.
          Anyone who opens it lands on your course catalog and can sign up themselves —
          no seat allocation needed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4" />
            Your workspace invite link
          </CardTitle>
          <CardDescription>
            One link, infinite invitees. Students self-onboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-url" className="text-xs">Link</Label>
            <div className="flex gap-2">
              <Input
                id="invite-url"
                value={inviteUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => copy(inviteUrl, "url")}
              >
                {copiedField === "url" ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="secondary" className="w-full">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                Share on WhatsApp
              </a>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <a href={mailtoHref}>
                <Mail className="mr-1.5 h-4 w-4" />
                Share via email
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pre-written share copy</CardTitle>
          <CardDescription>
            Copy-paste ready. Edit before sending if you like.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="wa-template" className="text-xs">WhatsApp message</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => copy(whatsappTemplate, "wa", "Message")}
              >
                {copiedField === "wa" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Textarea
              id="wa-template"
              value={whatsappTemplate}
              readOnly
              rows={3}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-template" className="text-xs">Email body</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => copy(emailBodyTemplate, "email", "Email body")}
              >
                {copiedField === "email" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Textarea
              id="email-template"
              value={emailBodyTemplate}
              readOnly
              rows={7}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prefer to add students yourself?</CardTitle>
          <CardDescription>
            Two other ways to bring people in.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {/* Card-style links — not <Button>, because Button collapses
              children to a single line / center-aligns them. A plain
              Link wrapping a flex column gives the multi-line hint
              room to wrap naturally. */}
          <Link
            href="/dashboard/students/new"
            className="group flex flex-col gap-1 rounded-md border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-accent/5"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium group-hover:text-primary">
              <Users className="h-4 w-4" /> Add one manually
            </span>
            <span className="text-[11.5px] font-normal leading-snug text-muted-foreground">
              Quick name + email form. They get an account but you set their password.
            </span>
          </Link>
          <Link
            href="/dashboard/students/import"
            className="group flex flex-col gap-1 rounded-md border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-accent/5"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium group-hover:text-primary">
              <Send className="h-4 w-4" /> Import CSV
            </span>
            <span className="text-[11.5px] font-normal leading-snug text-muted-foreground">
              Bulk-add a whole cohort from a spreadsheet.
            </span>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
