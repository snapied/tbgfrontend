"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  Send,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Assignment,
  type AssignmentResource,
  type Doubt,
} from "@/lib/lms-store"
import { videoEmbedUrl } from "@/lib/lesson-utils"
import { uploadAsset } from "@/lib/upload-asset"
import { useTenantBasePath } from "@/lib/tenant-path"
import { useOrgSettings } from "@/lib/org-settings"
import { useTenant } from "@/lib/tenant-store"
import { MessageCircleQuestion } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { buildNotifications, type DispatchPayload } from "@/lib/notifications"
import { toast } from "sonner"

const GUEST_ID_KEY = "thebigclass.assignment.guestId"
function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "guest"
  try {
    const existing = window.localStorage.getItem(GUEST_ID_KEY)
    if (existing) return existing
    const id = `guest-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(GUEST_ID_KEY, id)
    return id
  } catch {
    return "guest"
  }
}
// Assignment descriptions come from the WYSIWYG editor as HTML.  For the
// table preview we want plain text — strip tags + collapse whitespace.
// Server-rendered, no DOM; a small regex is enough since we're not parsing
// for security, just stripping decoration.
function stripHtmlToPreview(html: string | undefined, max = 140): string {
  if (!html) return ""
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

export default function PublicAssignmentPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const {
    getAssignmentByToken,
    getAssignmentById,
    getCourseById,
    currentUser,
    users,
    addDoubt,
    addNotifications,
    submissions,
    submitAssignment,
    recordAssignmentView,
  } = useLMS()
  const { basePath, inTenant } = useTenantBasePath()
  const { settings } = useOrgSettings()
  const { currentTenant } = useTenant()
  const homeHref = inTenant ? basePath : "/"
  const browseCoursesHref = inTenant ? `${basePath}/courses` : "/courses"
  // When the visitor lands here from their student dashboard, sending
  // them "back to courses" loses the list they were just looking at.
  // Route the back link to /my/assignments instead so the breadcrumb
  // is "Assignments → this assignment → Assignments" rather than
  // bouncing them to the public catalog.
  const backHref =
    inTenant && currentUser ? `${basePath}/my/assignments` : browseCoursesHref
  const backLabel =
    inTenant && currentUser ? "Back to assignments" : "Back to courses"
  // Brand name + logo shown in the slim header. When inside a tenant
  // portal we prefer the tenant's own branding so the page feels like
  // part of their site (the tenant layout already wraps us in
  // PortalThemeProvider, so colours match too). Outside a tenant we
  // fall back to the platform brand.
  const brandName = inTenant
    ? (settings.organisationName || currentTenant?.name || "The Big Class")
    : "The Big Class"
  const brandLogoUrl = inTenant
    ? (settings.logoUrl || currentTenant?.branding?.logoUrl)
    : undefined

  // Accept either a shareToken or a raw assignment id (older links).
  const assignment: Assignment | undefined = getAssignmentByToken(token) ?? getAssignmentById(token)
  const course = assignment ? getCourseById(assignment.courseId) : undefined

  const [studentId, setStudentId] = useState<string>("guest")
  // Doubt composer state — students can ping the instructor with an
  // assignment-specific question without needing to navigate to a
  // course first. Pre-fills the title with the assignment title so
  // the recipient sees the right thread context in the inbox.
  const [askDoubtOpen, setAskDoubtOpen] = useState(false)
  const [doubtTitle, setDoubtTitle] = useState("")
  const [doubtBody, setDoubtBody] = useState("")
  useEffect(() => {
    setStudentId(currentUser?.id ?? getOrCreateGuestId())
  }, [currentUser])

  // Record open-tracking once per (assignment, student).
  useEffect(() => {
    if (!assignment || studentId === "guest") return
    recordAssignmentView(assignment.id, studentId)
    // intentionally one-shot per assignment; the store dedupes by pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?.id, studentId])

  const existingSubmission = useMemo(
    () => assignment ? submissions.find(s => s.assignmentId === assignment.id && s.studentId === studentId) : undefined,
    [assignment, submissions, studentId],
  )

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Follow-up not found</h1>
          <p className="mt-1 text-muted-foreground">
            The link may be expired or the assignment was removed.
          </p>
          <Button asChild className="mt-6">
            <Link href={browseCoursesHref}>Browse courses</Link>
          </Button>
        </div>
      </div>
    )
  }

  const KindIcon = assignment.kind === "project" ? Briefcase : assignment.kind === "test" ? FileText : ClipboardList

  return (
    <div className="min-h-screen bg-background">
      {/* Slim chrome.
          Inside a tenant the layout already paints the tenant's site
          header, so we drop our own bar and only render an inline
          "Back to courses" button above the assignment content. */}
      {inTenant ? (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      ) : (
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={homeHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-sm">
              {brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandLogoUrl} alt={brandName} className="h-5 w-auto" />
              ) : (
                <GraduationCap className="h-4 w-4 text-primary" />
              )}
              <span className="font-semibold">{brandName}</span>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:py-10">
        {/* Header card */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KindIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <Badge variant="secondary" className="mb-1 capitalize">{assignment.kind}</Badge>
                <h1 className="text-2xl font-bold tracking-tight">{assignment.title}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {course?.title ?? "Coursework"}
                  {assignment.dueAt && (
                    <> · Due {new Date(assignment.dueAt).toLocaleString()}</>
                  )}
                  {" · "}{assignment.maxScore} pts
                </p>
              </div>
            </div>
            {assignment.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {stripHtmlToPreview(assignment.description)}
              </p>
            )}
            {currentUser && currentUser.role === "student" && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDoubtTitle(`About ${assignment.title}`)
                    setAskDoubtOpen(true)
                  }}
                >
                  <MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" />
                  Ask a doubt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resources */}
        {(assignment.resources?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resources</CardTitle>
              <CardDescription>Everything you need to complete this follow-up.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignment.resources!.map((r) => (
                <ResourceRow key={r.id} resource={r} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submission */}
        <SubmissionPanel
          assignment={assignment}
          existing={existingSubmission}
          onSubmit={(payload) => {
            submitAssignment({
              id: generateId("sub"),
              assignmentId: assignment.id,
              studentId,
              submittedAt: new Date().toISOString(),
              contentUrl: payload.contentUrl,
              notes: payload.notes,
              status: "submitted",
            })
          }}
        />
      </main>

      <Dialog
        open={askDoubtOpen}
        onOpenChange={(v) => {
          setAskDoubtOpen(v)
          if (!v) {
            setDoubtTitle("")
            setDoubtBody("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Ask a doubt about this assignment</DialogTitle>
            <DialogDescription>
              Your teacher gets pinged immediately (in-app, email, and
              WhatsApp if configured). The thread lives in your Doubts page
              so you can follow up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ad-title">Title</Label>
              <Input
                id="ad-title"
                value={doubtTitle}
                onChange={(e) => setDoubtTitle(e.target.value)}
                placeholder={`About ${assignment.title}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Question</Label>
              <RichTextEditor
                value={doubtBody}
                onChange={setDoubtBody}
                placeholder="What's blocking you? Paste code, links, screenshots."
                minHeight={140}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAskDoubtOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!doubtTitle.trim() || !doubtBody.trim() || !currentUser}
              onClick={() => {
                if (!currentUser) return
                const doubt: Doubt = {
                  id: generateId("doubt"),
                  studentId: currentUser.id,
                  courseId: assignment.courseId,
                  title: doubtTitle.trim(),
                  body: doubtBody,
                  replies: [],
                  status: "open",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
                addDoubt(doubt)

                // Route the ping to this course's instructor + co-
                // instructors. Falls back to every admin/instructor in
                // the workspace if the course record is unreachable so
                // the question never falls on a silent inbox.
                const recipientIds = new Set<string>()
                const courseRow = getCourseById(assignment.courseId)
                if (courseRow) {
                  recipientIds.add(courseRow.instructor.id)
                  courseRow.coInstructorIds?.forEach((id) => recipientIds.add(id))
                }
                const recipients =
                  recipientIds.size > 0
                    ? users.filter((u) => recipientIds.has(u.id))
                    : users.filter(
                        (u) => u.role === "admin" || u.role === "instructor",
                      )
                const payload: DispatchPayload = {
                  type: "doubt.created",
                  title: `New doubt from ${currentUser.name}`,
                  body: `${doubtTitle.trim()} — on “${assignment.title}”`,
                  url: `/dashboard/doubts/${doubt.id}`,
                  meta: { doubtId: doubt.id, assignmentId: assignment.id },
                }
                const entries = buildNotifications(recipients, payload)
                addNotifications(entries)

                toast.success("Doubt sent · your teacher just got pinged.")
                setAskDoubtOpen(false)
                setDoubtTitle("")
                setDoubtBody("")
              }}
            >
              Send doubt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== Resource row =====================

function ResourceRow({ resource }: { resource: AssignmentResource }) {
  if (resource.type === "note") {
    return (
      <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{resource.label}</p>
        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{resource.note}</p>
      </div>
    )
  }
  if (resource.type === "video") {
    const embed = videoEmbedUrl(resource.url ?? "")
    return (
      <div className="overflow-hidden rounded-md border border-border/60">
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2 text-xs">
          <Video className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{resource.label}</span>
          {resource.url && (
            <a href={resource.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3 w-3" /> Open
            </a>
          )}
        </div>
        {embed ? (
          <iframe
            src={embed}
            title={resource.label}
            className="aspect-video w-full"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : resource.url ? (
          <video src={resource.url} controls className="aspect-video w-full bg-black" />
        ) : null}
      </div>
    )
  }
  // file or link
  const Icon = resource.type === "file" ? Paperclip : LinkIcon
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-md border border-border/60 p-3 text-sm hover:bg-muted/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{resource.label}</p>
        <p className="truncate text-xs text-muted-foreground">{resource.url}</p>
      </div>
      {resource.type === "file" ? (
        <Download className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </a>
  )
}

// ===================== Submission =====================

function SubmissionPanel({
  assignment,
  existing,
  onSubmit,
}: {
  assignment: Assignment
  existing?: ReturnType<typeof useLMS>["submissions"][number]
  onSubmit: (payload: { contentUrl?: string; notes?: string }) => void
}) {
  const [contentUrl, setContentUrl] = useState(existing?.contentUrl ?? "")
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadAsset(file, "assignments")
      setContentUrl(result.url)
      setUploadedFilename(file.name)
    } finally {
      setUploading(false)
    }
  }

  const isGraded = existing?.status === "graded"

  if (isGraded) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Graded — {existing!.score}/{assignment.maxScore}
          </CardTitle>
          <CardDescription>
            Submitted {new Date(existing!.submittedAt).toLocaleString()}
            {existing!.gradedAt && <> · graded {new Date(existing!.gradedAt).toLocaleString()}</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {existing!.feedback && (
            <p className="whitespace-pre-wrap rounded-md border border-border/60 bg-background/60 p-3 text-sm">
              <span className="font-semibold">Teacher feedback: </span>
              {existing!.feedback}
            </p>
          )}
          {existing!.contentUrl && (
            <a
              href={existing!.contentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Your submission <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {existing ? "Update submission" : "Submit your work"}
        </CardTitle>
        <CardDescription>
          {existing
            ? `Submitted ${new Date(existing.submittedAt).toLocaleString()} — you can resubmit until it's graded.`
            : "Upload a file or paste a link. Add notes if there's anything Your instructor should know."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Submission link or upload</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={contentUrl}
              onChange={(e) => {
                setContentUrl(e.target.value)
                setUploadedFilename(null)
              }}
              placeholder="https://… (Drive, GitHub, file URL)"
              className="flex-1"
            />
            <label
              className={cn(
                "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40",
                uploading && "pointer-events-none opacity-60",
              )}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Upload file"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </label>
          </div>
          {uploadedFilename && (
            <p className="text-xs text-muted-foreground">
              Uploaded <span className="font-medium text-foreground">{uploadedFilename}</span>
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything Your instructor should know…"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            disabled={(!contentUrl && !notes) || submitting}
            onClick={() => {
              setSubmitting(true)
              onSubmit({ contentUrl: contentUrl || undefined, notes: notes || undefined })
              setTimeout(() => setSubmitting(false), 400)
            }}
          >
            {existing ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Resubmit
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Submit
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
