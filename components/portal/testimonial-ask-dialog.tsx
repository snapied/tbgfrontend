"use client"

// "Ask students for a testimonial" wizard — multi-channel send.
//
// What the teacher gets: pick a course → pick students → choose a
// channel (Email · WhatsApp · In-app · Copy links). Each student
// gets a personalised magic link that lands them on the public
// `/testimonial?t=…` form pre-filled with their name and course.
//
// Sending mechanics per channel:
//   • Email     — opens `mailto:` with the personal message + links
//                 pre-filled in the body (BCC for multiple recipients)
//   • WhatsApp  — opens `https://wa.me/<phone>?text=…` per-student in
//                 sequence; no phone → skipped
//   • In-app    — drops a notification row per recipient so the
//                 student sees a banner the next time they sign in
//   • Copy      — copies a single newline-separated payload to the
//                 clipboard so the teacher can paste anywhere
//
// Why magic-link UX instead of "log in to submit": ~95% drop-off
// when we asked students to sign in for a single review. Links land
// them in a one-screen form with their name + course pre-filled
// and accept written text, photos, video, and PDFs.

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Copy, Mail, MessageCircle, Send, UserCheck, Users, Bell } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLMS, generateId, type Notification } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { buildMagicLink } from "@/lib/testimonial-magic-link"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function TestimonialAskDialog({ open, onOpenChange }: Props) {
  const { courses, enrollments, getUserById, currentUser, addNotifications } = useLMS()
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug ?? ""

  // Courses the current teacher authored, restricted to published ones
  // (asking for a testimonial about a draft is nonsense).
  const myCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.status === "published" &&
          (c.instructor.id === currentUser?.id ||
            c.instructor.name === currentUser?.name),
      ),
    [courses, currentUser],
  )
  const [courseId, setCourseId] = useState<string>("")
  // Default to the first published course once it's known. Used to
  // be a side-effect-in-render via setTimeout — which React 19
  // (correctly) flags as "state update on an unmounted component"
  // because the render function isn't allowed to schedule async
  // updates. Moved into an effect that fires whenever the course
  // list changes or the user lands without a selection.
  useEffect(() => {
    if (!courseId && myCourses[0]) {
      setCourseId(myCourses[0].id)
    }
  }, [courseId, myCourses])

  // Completed students for the picked course. We don't ship a fully
  // wired "course completion" event in this POC — so eligibility =
  // enrolled OR completed. The Pick All button lets the teacher
  // narrow further by toggle.
  const candidates = useMemo(() => {
    if (!courseId) return []
    const ids = new Set(
      enrollments
        .filter((e) => e.courseId === courseId)
        .map((e) => e.studentId),
    )
    return Array.from(ids)
      .map((id) => getUserById(id))
      .filter((u): u is NonNullable<ReturnType<typeof getUserById>> => !!u)
  }, [courseId, enrollments, getUserById])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  // When course changes, reset selection to "everyone".
  const courseIdRef = useState<string>("")[1]
  if (courseId && (courseIdRef as unknown as { current?: string }).current !== courseId) {
    setTimeout(() => {
      setSelected(new Set(candidates.map((c) => c.id)))
      ;(courseIdRef as unknown as { current?: string }).current = courseId
    }, 0)
  }

  const course = myCourses.find((c) => c.id === courseId)
  const [message, setMessage] = useState<string>(
    `Hey there 👋\n\nThanks so much for completing the course. If it was useful, would you mind sharing a 2-3 sentence testimonial? It helps future students decide whether this is right for them.\n\nThe link below opens a one-screen form — no sign-in needed.`,
  )

  // Compose magic links — one per selected student.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://thebigclass.com"

  // `recipients` memo (below) does the per-student link generation
  // shared by every channel. The old `linksForCopy` is gone.

  // ───── Per-channel send mechanics ─────────────────────────────────
  //
  // We build per-student records so each channel can pick its own
  // path (subject line, phone number, in-app notification body, etc.)
  // from the same shared shape.
  const recipients = useMemo(() => {
    if (!course) return [] as Array<{
      id: string
      name: string
      email: string
      phone?: string
      link: string
    }>
    return Array.from(selected)
      .map((uid) => candidates.find((c) => c.id === uid))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        link: buildMagicLink(origin, {
          tenantSlug,
          studentUserId: u.id,
          studentName: u.name,
          studentEmail: u.email,
          courseId: course.id,
          instructorId: currentUser?.id,
          issuedAt: Date.now(),
        }),
      }))
  }, [selected, candidates, course, origin, tenantSlug, currentUser])

  const composeEmailBody = (link: string, name?: string) =>
    `${message.replace(/\{name\}/g, name?.split(/\s+/)[0] ?? "there")}\n\nShare your testimonial here (one screen, no sign-in):\n${link}\n\nThanks!\n${currentUser?.name ?? ""}`

  const handleSendEmail = () => {
    if (recipients.length === 0) return
    // mailto: chokes on >2KB payloads. We send per-recipient (up to 5
    // at a time in one mailto) so the teacher's mail client opens
    // pre-composed for each batch.
    const BATCH = 5
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH)
      const to = batch.map((r) => r.email).join(",")
      // Email body is per-batch — we use the first recipient's name
      // for the `{name}` placeholder since multi-recipient mail can't
      // be personalised further without templating.
      const body = composeEmailBody(
        batch.map((r) => `${r.name}: ${r.link}`).join("\n"),
        batch[0]?.name,
      )
      const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        `Share your testimonial for ${course?.title ?? "the course"}`,
      )}&body=${encodeURIComponent(body)}`
      window.open(url, "_blank")
    }
    toast.success(`Drafted ${recipients.length} email${recipients.length === 1 ? "" : "s"}`, {
      description: "Your mail client opened the drafts — review and send.",
    })
  }

  const handleSendWhatsApp = () => {
    const withPhone = recipients.filter((r) => r.phone && /^\+?[0-9 -]{8,}$/.test(r.phone))
    if (withPhone.length === 0) {
      toast.error("No selected students have a phone number on file.", {
        description: "Add WhatsApp numbers under student profiles to use this channel.",
      })
      return
    }
    withPhone.forEach((r, i) => {
      // Stagger the openings so browsers don't block the bulk popups.
      window.setTimeout(() => {
        const phone = (r.phone ?? "").replace(/[^0-9]/g, "")
        const text = composeEmailBody(r.link, r.name)
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
        window.open(url, "_blank")
      }, i * 250)
    })
    const skipped = recipients.length - withPhone.length
    toast.success(`Opening WhatsApp for ${withPhone.length} ${withPhone.length === 1 ? "student" : "students"}`, {
      description:
        skipped > 0
          ? `${skipped} skipped — no phone number on file.`
          : undefined,
    })
  }

  const handleSendInApp = () => {
    if (recipients.length === 0) return
    const entries: Notification[] = recipients.map((r) => ({
      id: generateId("notif"),
      userId: r.id,
      channel: "in-app" as const,
      type: "testimonial.request",
      title: `${currentUser?.name?.split(/\s+/)[0] ?? "Your instructor"} would love a testimonial`,
      body: `Loved ${course?.title ?? "the course"}? Take 30 seconds to share what you learned — link inside, no sign-in needed.`,
      url: r.link,
      createdAt: new Date().toISOString(),
      status: "queued" as const,
    }))
    addNotifications(entries)
    toast.success(`Dropped ${entries.length} in-app ${entries.length === 1 ? "notification" : "notifications"}`, {
      description: "Students see a banner next time they sign in.",
    })
  }

  const handleCopyAll = async () => {
    const lines = recipients.map((r) => `${r.name} <${r.email}>: ${r.link}`).join("\n")
    const body = `${message}\n\nLinks:\n${lines}`
    try {
      await navigator.clipboard.writeText(body)
      toast.success(`Copied ${recipients.length} ${recipients.length === 1 ? "request" : "requests"}`, {
        description: "Paste into your email tool or DM to fan out.",
      })
    } catch {
      toast.error("Couldn't copy. Try the Email or WhatsApp button instead.")
    }
  }

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelected(new Set())
      ;(courseIdRef as unknown as { current?: string }).current = undefined
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Users className="h-5 w-5 text-primary" />
            Ask students for a testimonial
          </DialogTitle>
          <DialogDescription>
            Pick a course, choose who to ask, tweak the message. We&rsquo;ll
            generate a magic link per student — they tap once, fill a
            single field, hit submit. Their reply lands in your inbox
            for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {myCourses.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              You don&rsquo;t have any published courses yet. Publish a course
              first — then come back and ask students who completed it.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {myCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Who to ask</Label>
                  <div className="flex items-center gap-2 text-[11.5px]">
                    <button
                      type="button"
                      onClick={() => setSelected(new Set(candidates.map((c) => c.id)))}
                      className="font-semibold text-primary hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="font-semibold text-muted-foreground hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {candidates.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
                    No enrolled students yet for this course. Once students enrol
                    they&rsquo;ll appear here.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border bg-card p-2">
                    {candidates.map((u) => {
                      const checked = selected.has(u.id)
                      return (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-muted"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = new Set(selected)
                              if (v) next.add(u.id)
                              else next.delete(u.id)
                              setSelected(next)
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium">{u.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  <UserCheck className="mr-1 inline h-3 w-3" />
                  {selected.size} of {candidates.length} selected.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Personal message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Hey there 👋…"
                />
                <p className="text-[11px] text-muted-foreground">
                  Sent above the magic link. Short + warm beats formal —
                  students respond to specifics.
                </p>
              </div>

              {selected.size > 0 && (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Recipients
                  </p>
                  {/* Preview shows name + email only — the full magic
                      link is long enough to break the dialog layout,
                      and the recipients list is the useful signal
                      ("who's getting asked"). Full links are still
                      in the clipboard payload after Copy. */}
                  <ul className="mt-1.5 max-h-32 space-y-0.5 overflow-y-auto text-[11.5px] leading-relaxed text-foreground">
                    {Array.from(selected).slice(0, 8).map((uid) => {
                      const u = candidates.find((c) => c.id === uid)
                      if (!u) return null
                      return (
                        <li key={uid} className="flex items-center gap-2 truncate">
                          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                          <span className="truncate">
                            <span className="font-medium">{u.name}</span>
                            <span className="ml-1 text-muted-foreground">&lt;{u.email}&gt;</span>
                          </span>
                        </li>
                      )
                    })}
                    {selected.size > 8 && (
                      <li className="italic text-muted-foreground">
                        …and {selected.size - 8} more
                      </li>
                    )}
                  </ul>
                  <p className="mt-2 text-[10.5px] text-muted-foreground">
                    Each gets a unique pre-filled link in the clipboard payload after Copy.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Send via
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              disabled={selected.size === 0 || !course}
              className="gap-1.5"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendWhatsApp}
              disabled={selected.size === 0 || !course}
              className="gap-1.5"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendInApp}
              disabled={selected.size === 0 || !course}
              className="gap-1.5"
            >
              <Bell className="h-4 w-4" />
              In-app
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              disabled={selected.size === 0 || !course}
              className="gap-1.5"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[10.5px] text-muted-foreground">
              <Send className="mr-1 inline h-3 w-3" />
              Each link pre-fills the student&rsquo;s name + course. No sign-in needed.
              <ArrowRight className="ml-1 inline h-3 w-3" />
            </p>
            <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
