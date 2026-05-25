"use client"

// Batch detail — Members + Common Room.
//
// Members tab:
//   - Roster with bulk add / remove. Search box that matches the same
//     fuzzy pattern used elsewhere (typos OK).
//
// Common Room tab:
//   - Feed of posts. Members can post + comment + react. Instructor can
//     pin, hide, delete. Pinned posts float to the top.
//
// This file is intentionally one screen — splitting Members and Common
// Room into separate routes would mean two page-skeletons to maintain
// for what's really one cohort context.

import { use, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  AtSign,
  Bell,
  BellOff,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  Award,
  BookOpen,
  Check,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  PenSquare,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Star,
  StarOff,
  Trash2,
  Users2,
  UserMinus,
  UserPlus,
  Video,
  X,
  Radio,
  Clock,
  PlayCircle,
} from "lucide-react"
import { CommunityNotificationPrefsPopover } from "@/components/dashboard/community-notification-prefs-popover"
import { CommunityMemberOnboarding } from "@/components/dashboard/community-member-onboarding"
import { CommunityHealthPulse } from "@/components/dashboard/community-health-pulse"
import { DeadCommunityRecoveryBanner } from "@/components/dashboard/dead-community-recovery"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  useLMS,
  generateId,
  getBatchSpaces,
  DEFAULT_BATCH_SPACES,
  type BatchSpace,
  type BatchPost,
  type BatchPostType,
} from "@/lib/lms-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { useTenant } from "@/lib/tenant-store"
import { useWall } from "@/lib/wall-store"
import { CommunityMemberToolkit } from "@/components/dashboard/community-member-toolkit"
import { useCommunityMemberPrefs } from "@/lib/community-member-prefs"
import { CommunityBulkInviteDialog } from "@/components/dashboard/community-bulk-invite-dialog"
import { useCommunityModerators } from "@/lib/community-moderators"
import { CommunityHealthWidget } from "@/components/dashboard/community-health-widget"
import { useJoinRequests } from "@/lib/community-join-requests"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/lib/use-confirm"
import {
  getMutedThreadIds,
  isPostBookmarked,
  setPostBookmarked,
  setThreadMuted,
} from "@/lib/community-post-prefs"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { SlashCommandPopover } from "@/components/dashboard/slash-command-popover"
import type { Editor } from "@tiptap/react"
import {
  RichTextContent,
  isRichTextEmpty,
} from "@/components/editor/rich-text-content"
import { uploadAsset } from "@/lib/upload-asset"
import { buildNotifications } from "@/lib/notifications"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"

const BATCH_TOUR: TourStep[] = [
  {
    placement: "center",
    title: "Your community's home base",
    body: "The Common Room is the persistent feed your cohort talks in. This tour shows the bits people miss — the Instructor pill, the @-tag picker, file attachments, and post editing.",
    emoji: "👥",
  },
  {
    target: "[data-tour='batch-teachers']",
    title: "Instructors, pinned at the top",
    body: "Course instructors and co-instructors show as chips so everyone knows who's leading. Members count is on the right.",
    emoji: "🎓",
  },
  {
    target: "[data-tour='batch-composer']",
    title: "Compose a post",
    body: "Rich text + image / video / file uploads + paste-a-video-URL. Posts can be body-only, attachment-only, or both — drop a file with no commentary if you want.",
    emoji: "✍️",
  },
  {
    target: "[data-tour='batch-tag']",
    title: "Tag people with @-picker",
    body: "Click Tag to insert a @name chip. Tagged users get a louder \"X tagged you\" notification (in-app + email + WhatsApp) — even if they weren't already in the thread. Pulls them right in.",
    emoji: "@",
  },
  {
    target: "[data-tour='batch-attach']",
    title: "Attach anything",
    body: "Images render as thumbnails, videos play inline, PDFs open in an embedded viewer, everything else becomes a download chip. The whole community gets notified the moment you hit Post.",
    emoji: "📎",
  },
  {
    placement: "center",
    title: "Edit anything you posted",
    body: "Author or admin can click the ⋯ menu on a post to edit the body. Edited posts show a subtle \"edited · 3m\" footnote so readers know it changed.",
    emoji: "✏️",
  },
]

// Reaction set for Common Room posts + comments. Same six glyphs as
// blog reactions so reactors who hop between surfaces don't have to
// learn a new emoji palette.
const ROOM_REACTIONS = ["👍", "❤️", "🎉", "💡", "🔥", "👀"] as const

/**
 * Pull mention user ids out of an HTML body produced by the rich-text
 * composer. Mentions are inserted as `<a data-mention-id="...">@name</a>`
 * chips, so we just regex for that attribute. Deduplicated and ordered.
 */
function parseMentionIds(html: string): string[] {
  if (!html) return []
  const ids = new Set<string>()
  const re = /data-mention-id=["']([^"']+)["']/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (m[1]) ids.add(m[1])
  }
  return Array.from(ids)
}

/** Plain-text preview of a rich-text body for notification bodies. */
function previewText(html: string, max = 140): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
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

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const confirm = useConfirm()
  const { currentTenant } = useTenant()
  // Sprint B Communities #4/#5/#47 — derived once at the page root
  // so all the per-community primitives (member toolkit, bulk
  // invite, mod tier) read from a single source of truth.
  const tenantSlug = currentTenant?.slug ?? ""
  const {
    studentGroups,
    updateStudentGroup,
    deleteStudentGroup,
    addStudentsToGroup,
    removeStudentsFromGroup,
    students,
    courses,
    currentUser,
    users,
    getUserById,
    getPostsForBatch,
    addBatchPost,
    deleteBatchPost,
    toggleBatchPostPin,
    toggleBatchPostFeatured,
    toggleBatchPostReaction,
    addBatchPostComment,
    setBatchPostCommentHidden,
    updateBatchPost,
    addNotifications,
    notifications,
    // Live sessions for the attached course — used by the
    // upcoming-class banner below. Communities have historically
    // had zero awareness of class schedules; this connection
    // closes the loop so a cohort sees its next class in the same
    // surface they hang out in.
    liveSessions,
  } = useLMS()
  // Wall of Love writer — used by the C2 wins → WoL bridge so a
  // student picking the "Win" post type auto-publishes to the
  // public showcase too.
  const { addEntry: wallAddEntry } = useWall()
  // Ref to the latest notifications array so the reaction-notify
  // closure below sees fresh data without churning on every render.
  // Reading through a ref keeps the onToggleReaction prop identity
  // stable (no new function per notification arriving).
  const postReactionNotifsRef = useRef(notifications)
  postReactionNotifsRef.current = notifications
  // Active Space (sub-channel inside the batch). General by default;
  // the rail on the left lets the visitor switch.
  const [activeSpaceId, setActiveSpaceId] = useState<string>("space-general")

  const batch = studentGroups.find((g) => g.id === id)

  if (!batch) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h2 className="font-serif text-xl font-bold">Community not found</h2>
        <Button asChild variant="outline">
          <Link href="/dashboard/batches">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to batches
          </Link>
        </Button>
      </div>
    )
  }

  const course = batch.courseId ? courses.find((c) => c.id === batch.courseId) : undefined
  const members = batch.memberIds
    .map((mid) => getUserById(mid))
    .filter((u): u is NonNullable<typeof u> => !!u)
  // Instructor = the linked course's primary instructor (if any). Falls back to
  // the current admin user — there's always *someone* moderating.
  const Instructor = course?.instructor ?? null
  const coTeachers = (course?.coInstructorIds ?? [])
    .map((uid) => getUserById(uid))
    .filter((u): u is NonNullable<typeof u> => !!u)
  // Mention list — Instructor pinned to the top, then co-teachers, then members.
  // Used by the composer's @-picker.
  const mentionables: Mentionable[] = [
    ...(Instructor ? [{ id: Instructor.id, name: Instructor.name, role: "Instructor" as const }] : []),
    ...coTeachers.map((u) => ({ id: u.id, name: u.name, role: "Instructor" as const })),
    ...members
      .filter((u) => u.id !== Instructor?.id && !coTeachers.some((t) => t.id === u.id))
      .map((u) => ({ id: u.id, name: u.name, role: "member" as const })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard/batches"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> All communities
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: batch.color ?? "#0a3024" }}
            />
            <h1 className="truncate font-serif text-2xl font-bold tracking-tight">
              {batch.name}
            </h1>
            {course && (
              <Badge variant="outline" className="text-[10px]">
                {course.title}
              </Badge>
            )}
          </div>
          {(batch.description || batch.purpose) && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {stripHtmlToPreview(batch.description || batch.purpose)}
            </p>
          )}
          {/* Cohort window strip — surfaces start/end dates inline
              with the batch hero so the instructor (and any Instructor
              who lands here) immediately sees "opens in 5 days" or
              "wrapped 2 days ago" without diving into settings. */}
          <CohortWindowBanner
            startsAt={batch.startsAt}
            endsAt={batch.endsAt}
          />
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="batch-detail-v1" label="Take a tour" />
          {/* Per-community notification preferences. Lives next to the
              community settings menu so the member can mute / snooze /
              opt down to mentions-only in one click without leaving
              the surface they're actively reading. */}
          <CommunityNotificationPrefsPopover
            userId={currentUser?.id}
            communityId={batch.id}
          />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SettingsIcon className="mr-1.5 h-3.5 w-3.5" />
              Community settings
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <BatchEditMenuItem batch={batch} onSave={(patch) => updateStudentGroup(batch.id, patch)} />
            <CommunityAccessMenuItem
              batch={batch}
              onSave={(patch) => updateStudentGroup(batch.id, patch)}
            />
            <DropdownMenuSeparator />
            {/* Leave community — available to any current member who
                isn't an admin/instructor owner. Owners can't leave
                their own batch; they delete it instead (item below).
                Leaving removes the user from memberIds; their past
                posts stay (attributed to a former member). */}
            {currentUser && batch.memberIds.includes(currentUser.id) && currentUser.role !== "admin" && currentUser.role !== "instructor" && (
              <DropdownMenuItem
                onClick={async () => {
                  const ok = await confirm({
                    title: `Leave "${batch.name}"?`,
                    description: "You'll stop seeing this community's posts and notifications. You can re-join later from an invite link if the Instructor invites you back.",
                    destructive: true,
                    confirmLabel: "Leave community",
                  })
                  if (!ok) return
                  updateStudentGroup(batch.id, {
                    memberIds: batch.memberIds.filter((id) => id !== currentUser.id),
                  })
                  router.push("/dashboard/batches")
                }}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Leave community
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete "${batch.name}"?`,
                  description: "This removes the community and its feed. Members aren't deleted.",
                  destructive: true,
                  confirmLabel: "Delete community",
                })
                if (!ok) return
                const snapshot = { id: batch.id, name: batch.name }
                deleteStudentGroup(batch.id)
                toastUndoableDelete({
                  kind: "student-group",
                  ids: snapshot.id,
                  label: snapshot.name,
                  itemNoun: "community",
                })
                router.push("/dashboard/batches")
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete community
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <ProductTour tourId="batch-detail-v1" steps={BATCH_TOUR} />

      {/* Next live class banner — connects the previously isolated
          Community surface to the Live Classes module. Surfaces only
          when the community is attached to a course AND that course
          has a session in the next 48h (or live right now). Closes
          the long-standing one-way gap: end-of-class recap posts
          into the community feed, but the community didn't know
          when the *next* class was scheduled. */}
      <NextLiveClassBanner
        sessions={liveSessions.filter((s) => course && s.courseId === course.id)}
      />

      {/* First-visit-per-batch member onboarding overlay (C3).
          Surfaces a 4-step centered modal the very first time a
          member lands here, covering instructors / classes /
          intro / notifications. Auto-dismisses once finished or
          skipped. Members only — admins don't need it. */}
      {currentUser && currentUser.role !== "admin" && currentUser.role !== "instructor" && (
        <CommunityMemberOnboarding
          userId={currentUser.id}
          batchId={batch.id}
          batchName={batch.name}
          instructorNames={[
            ...(Instructor ? [Instructor.name] : []),
            ...coTeachers.map((u) => u.name),
          ]}
          hasUpcomingClass={liveSessions.some(
            (s) => course && s.courseId === course.id && Date.parse(s.scheduledAt) > Date.now(),
          )}
          onIntroAction={() => {
            const el = document.querySelector<HTMLElement>("[data-tour='community-composer']")
            el?.scrollIntoView({ behavior: "smooth", block: "center" })
          }}
        />
      )}

      {/* Community health pulse (host-only). One-line summary
          collapses to a 14-day metrics drawer with an at-risk
          member list + one-click "Send a check-in" nudge. */}
      {(currentUser?.role === "admin" || currentUser?.role === "instructor") && (
        <CommunityHealthPulse
          batchName={batch.name}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
          posts={getPostsForBatch(batch.id)}
          onSendCheckIn={(memberIds, draft) => {
            const recipients = users.filter((u) => memberIds.includes(u.id))
            if (recipients.length === 0) return
            const entries = buildNotifications(recipients, {
              type: "community.checkin",
              title: `Check-in from ${batch.name}`,
              body: draft,
              url: `/dashboard/batches/${batch.id}`,
              meta: { batchId: batch.id, kind: "checkin" },
            })
            addNotifications(entries)
            toast.success(`Check-in sent to ${recipients.length} ${recipients.length === 1 ? "member" : "members"}.`)
          }}
        />
      )}

      {/* Dead-community recovery banner (host-only). Surfaces when
          the batch has >5 members and no posts in 14 days. Three
          one-click actions: send a templated "we miss you", schedule
          a Q&A, or archive (soft-delete via the trash). Self-hides
          for 7d on dismiss so the host gets a fresh nudge if it
          keeps drifting. */}
      {(currentUser?.role === "admin" || currentUser?.role === "instructor") && (() => {
        const allPosts = getPostsForBatch(batch.id)
        const lastPostAt = allPosts.length > 0
          ? allPosts
              .map((p) => p.createdAt)
              .sort((a, b) => b.localeCompare(a))[0]
          : null
        return (
          <DeadCommunityRecoveryBanner
            batchId={batch.id}
            batchName={batch.name}
            memberCount={batch.memberIds.length}
            lastPostAtIso={lastPostAt}
            createdAtIso={batch.createdAt ?? batch.updatedAt}
            courseId={batch.courseId}
            onSendMissYou={(draft) => {
              const now = new Date().toISOString()
              addBatchPost({
                id: `${batch.id}-misyou-${Date.now()}`,
                batchId: batch.id,
                spaceId: "space-general",
                authorId: currentUser?.id ?? batch.createdBy ?? "system",
                body: `<p>${draft}</p>`,
                pinned: true,
                hidden: false,
                comments: [],
                createdAt: now,
                updatedAt: now,
              })
              toast.success(`Sent to ${batch.name}. It's pinned at the top — edit any time.`)
            }}
            onArchive={async () => {
              const ok = await confirm({
                title: `Archive "${batch.name}"?`,
                description: "It'll move to trash for 7 days. Members lose access; you can restore from trash any time.",
                confirmLabel: "Archive",
                destructive: true,
              })
              if (!ok) return
              deleteStudentGroup(batch.id)
              router.push("/dashboard/batches")
            }}
          />
        )
      })()}

      <Tabs defaultValue="room" className="w-full">
        <TabsList>
          <TabsTrigger value="room" className="gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            Common Room
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-1.5">
            <Users2 className="h-3.5 w-3.5" />
            Directory <span className="text-muted-foreground">({batch.memberIds.length})</span>
          </TabsTrigger>
          {/* Classes tab — visible only when the community is
              attached to a course. Surfaces upcoming sessions +
              past recordings for that course in a community-native
              view. Without this, the only class connection was
              the recap auto-post we drop in the feed at End — a
              cold cohort had to leave to find their schedule. */}
          {course && (
            <TabsTrigger value="classes" className="gap-1.5">
              <Video className="h-3.5 w-3.5" />
              Classes
              {(() => {
                const courseSessions = liveSessions.filter((s) => s.courseId === course.id)
                if (courseSessions.length === 0) return null
                return (
                  <span className="text-muted-foreground">({courseSessions.length})</span>
                )
              })()}
            </TabsTrigger>
          )}
          {/* Sprint C Communities #24 — pending requests tab. Admin-
              only; hidden when no pending requests so we don't bait
              admins with an empty surface. The badge surfaces the
              count so admins see urgency. */}
          {(currentUser?.role === "admin" || currentUser?.role === "instructor") && (
            <PendingTabTrigger tenantSlug={tenantSlug} communityId={batch.id} />
          )}
          {/* Sprint C Communities #27 — insights tab. Admin-only. */}
          {(currentUser?.role === "admin" || currentUser?.role === "instructor") && (
            <TabsTrigger value="insights" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Insights
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="room" className="mt-5">
          <CommonRoom
            tenantSlug={tenantSlug}
            batchId={batch.id}
            courseTitle={course?.title}
            spaces={getBatchSpaces(batch)}
            activeSpaceId={activeSpaceId}
            onSpaceChange={setActiveSpaceId}
            onSpacesEdit={(next) =>
              updateStudentGroup(batch.id, {
                spaces: next,
                updatedAt: new Date().toISOString(),
              })
            }
            currentUserId={currentUser?.id}
            getUserById={getUserById}
            posts={getPostsForBatch(batch.id, activeSpaceId)}
            mentionables={mentionables}
            isAdmin={currentUser?.role === "admin" || currentUser?.role === "instructor"}
            onAdd={(body, embedUrl, attachments, type) => {
              if (!currentUser) return
              const postId = generateId("post")
              const nowIso = new Date().toISOString()
              const resolvedType: BatchPostType = type ?? "discussion"
              addBatchPost({
                id: postId,
                batchId: batch.id,
                spaceId: activeSpaceId,
                authorId: currentUser.id,
                body,
                embedUrl,
                attachments,
                type: resolvedType,
                // Announcement-type posts auto-pin so the host's
                // signal floats above regular chatter without a
                // second click.
                pinned: resolvedType === "announcement",
                // Wins get a 🎉 reaction seeded from the system so a
                // fresh post never looks sad. The author's own id is
                // used as the "reactor" — they get the celebration
                // immediately, others can stack on.
                reactions:
                  resolvedType === "win"
                    ? { "🎉": [currentUser.id] }
                    : undefined,
                hidden: false,
                comments: [],
                createdAt: nowIso,
                updatedAt: nowIso,
              })
              // Wins → Wall of Love bridge. Auto-promote the post to
              // the public Wall when it's a "win" and the workspace
              // hasn't opted out. The Wall entry credits the author
              // and pulls the body as the quote text (HTML stripped
              // so the Wall renders clean text, not <p> tags). Future
              // iteration: per-workspace toggle in settings; today we
              // ship as an always-on default since teachers explicitly
              // picked "Win" as the post type.
              if (resolvedType === "win") {
                const plainBody = previewText(body) || "(a win — see the cohort feed)"
                wallAddEntry({
                  id: `wall-${postId}`,
                  kind: "quote",
                  caption: plainBody,
                  studentId: currentUser.id,
                  studentName: currentUser.name,
                  courseId: batch.courseId,
                  vibe: "win",
                  addedBy: currentUser.id,
                  createdAt: nowIso,
                })
              }
              // Two-tier notifications:
              //   1) Anyone @mentioned in the body gets a louder "you were
              //      tagged" notification with the author's name in the title.
              //   2) Everyone else in the batch gets the regular broadcast.
              // We dedupe so a mentioned user doesn't get pinged twice.
              const preview = previewText(body) || "(no text — open the post to see attachments)"
              const mentionedIds = new Set(parseMentionIds(body))
              mentionedIds.delete(currentUser.id) // never self-notify
              const mentionedUsers = members.filter((u) => mentionedIds.has(u.id))
              const broadcastUsers = members.filter(
                (u) => u.id !== currentUser.id && !mentionedIds.has(u.id),
              )

              if (mentionedUsers.length > 0) {
                addNotifications(
                  buildNotifications(mentionedUsers, {
                    type: "batch-mention",
                    title: `${currentUser.name} tagged you in ${batch.name}`,
                    body: preview,
                    url: `/dashboard/batches/${batch.id}`,
                    meta: { batchId: batch.id, postAuthorId: currentUser.id },
                  }, { channels: ["in-app", "email", "whatsapp"] }),
                )
              }
              if (broadcastUsers.length > 0) {
                addNotifications(
                  buildNotifications(broadcastUsers, {
                    type: "batch-post",
                    title: `New post in ${batch.name}`,
                    body: preview,
                    url: `/dashboard/batches/${batch.id}`,
                    meta: { batchId: batch.id, postAuthorId: currentUser.id },
                  }, { channels: ["in-app", "email", "whatsapp"] }),
                )
              }
            }}
            onAddComment={(postId, body) => {
              if (!currentUser) return
              addBatchPostComment(postId, {
                id: generateId("cmt"),
                authorId: currentUser.id,
                body,
                hidden: false,
                createdAt: new Date().toISOString(),
              })
              const post = getPostsForBatch(batch.id, activeSpaceId).find((p) => p.id === postId)
              if (!post) return
              const preview = previewText(body)
              // Mentions inside the reply get the louder "you were tagged"
              // notification — even if the mentioned user wasn't already in
              // the thread, so a tag pulls a new person into the conversation.
              const mentionedIds = new Set(parseMentionIds(body))
              mentionedIds.delete(currentUser.id)
              const mentionedUsers = members.filter((u) => mentionedIds.has(u.id))
              // Thread participants (post author + prior commenters) get the
              // regular "new reply" ping. Exclude mentioned users so they
              // don't get double-notified. We DON'T filter muted users
              // here — mute is a per-user preference stored only in that
              // user's own browser, so the sender's fan-out can't see
              // it. Notifications still arrive and get hidden by each
              // recipient's client-side filter in the inbox renderer.
              const involvedIds = new Set<string>([post.authorId, ...post.comments.map((c) => c.authorId)])
              involvedIds.delete(currentUser.id)
              for (const id of mentionedIds) involvedIds.delete(id)
              const threadUsers = members.filter((u) => involvedIds.has(u.id))

              if (mentionedUsers.length > 0) {
                addNotifications(
                  buildNotifications(mentionedUsers, {
                    type: "batch-mention",
                    title: `${currentUser.name} tagged you in a reply`,
                    body: preview,
                    url: `/dashboard/batches/${batch.id}`,
                    meta: { batchId: batch.id, postId },
                  }, { channels: ["in-app", "email", "whatsapp"] }),
                )
              }
              if (threadUsers.length > 0) {
                addNotifications(
                  buildNotifications(threadUsers, {
                    type: "batch-comment",
                    title: `New reply in ${batch.name}`,
                    body: preview,
                    url: `/dashboard/batches/${batch.id}`,
                    meta: { batchId: batch.id, postId },
                  }, { channels: ["in-app", "email"] }),
                )
              }
            }}
            onEditPost={(postId, nextBody) =>
              updateBatchPost(postId, { body: nextBody, updatedAt: new Date().toISOString() })
            }
            onTogglePin={(postId) => toggleBatchPostPin(postId)}
            onToggleFeatured={(postId) => toggleBatchPostFeatured(postId)}
            onToggleHide={(postId, hidden) => updateBatchPost(postId, { hidden })}
            onDeletePost={async (postId) => {
              const ok = await confirm({
                title: "Delete this post?",
                description: "Members lose the conversation thread underneath too. Use Hide instead if you just want it off the feed but kept in the audit trail.",
                destructive: true,
                confirmLabel: "Delete post",
              })
              if (!ok) return
              deleteBatchPost(postId)
            }}
            onToggleReaction={(postId, emoji) => {
              if (!currentUser) return
              const post = getPostsForBatch(batch.id).find((p) => p.id === postId)
              // Determine whether this toggle is an ADD or a REMOVE
              // BEFORE the state mutation. Only adds (not removes,
              // not self-reactions) should produce a notification.
              const alreadyReacted = post?.reactions?.[emoji]?.includes(
                currentUser.id,
              )
              const isAdd = !alreadyReacted
              toggleBatchPostReaction(postId, emoji, currentUser.id)
              if (!isAdd) return
              if (!post) return
              if (post.authorId === currentUser.id) return
              // Debounce window — don't ping the author more than
              // once per 15 minutes for reactions on this post.
              // Reading existing notifications lets us share state
              // across browsers without server changes.
              const DEBOUNCE_MS = 15 * 60 * 1000
              const recent = (postReactionNotifsRef.current ?? [])
                .filter(
                  (n) =>
                    n.userId === post.authorId &&
                    n.type === "batch-reaction" &&
                    (n.meta as { postId?: string } | undefined)?.postId === postId,
                )
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
              if (recent) {
                const since = Date.now() - Date.parse(recent.createdAt)
                if (Number.isFinite(since) && since < DEBOUNCE_MS) return
              }
              // Count distinct reactors on this post (across every
              // emoji) so the notification reads "5 people" not
              // "5 reactions." Exclude the author themselves.
              const reactionMap = {
                ...(post.reactions ?? {}),
                // Snapshot the just-added reaction so the count
                // reflects the click that triggered us — we read
                // before the store has fanned the update through.
                [emoji]: Array.from(
                  new Set([...(post.reactions?.[emoji] ?? []), currentUser.id]),
                ),
              }
              const reactors = new Set<string>()
              for (const ids of Object.values(reactionMap)) {
                for (const id of ids) {
                  if (id !== post.authorId) reactors.add(id)
                }
              }
              const count = reactors.size
              if (count === 0) return
              const author = getUserById(post.authorId)
              if (!author) return
              const entries = buildNotifications(
                [author],
                {
                  type: "batch-reaction",
                  title:
                    count === 1
                      ? "Someone reacted to your post"
                      : `${count} people reacted to your post 💛`,
                  body: previewText(post.body),
                  url: `/dashboard/batches/${batch.id}`,
                  meta: { batchId: batch.id, postId },
                },
                // In-app only for reactions — emailing every reaction
                // batch would dominate the author's inbox.
                { channels: ["in-app"] },
              )
              addNotifications(entries)
            }}
            onToggleCommentHidden={setBatchPostCommentHidden}
            onMarkAnswered={(postId, commentId) => {
              updateBatchPost(postId, {
                answeredAt: new Date().toISOString(),
                answeredByCommentId: commentId,
              })
            }}
            onReopenQuestion={(postId) => {
              updateBatchPost(postId, {
                answeredAt: undefined,
                answeredByCommentId: undefined,
              })
            }}
          />
        </TabsContent>

        <TabsContent value="directory" className="mt-5">
          <DirectoryTab
            members={members}
            allStudents={students}
            getPostsForBatch={getPostsForBatch}
            batchId={batch.id}
            communityName={batch.name}
            tenantSlug={tenantSlug}
            inviteCode={batch.inviteCode}
            allUsers={users}
            onAdd={(ids) => addStudentsToGroup(batch.id, ids)}
            onRemove={(ids) => removeStudentsFromGroup(batch.id, ids)}
            isAdmin={
              currentUser?.role === "admin" || currentUser?.role === "instructor"
            }
          />
        </TabsContent>

        {/* Classes tab — visible only when the community is
            attached to a course. Closes the community-↔-class
            loop: students see the next session + browse past
            recordings without leaving the cohort surface. */}
        {course && (
          <TabsContent value="classes" className="mt-5">
            <CommunityClassesTab
              courseId={course.id}
              courseTitle={course.title}
              sessions={liveSessions.filter((s) => s.courseId === course.id)}
            />
          </TabsContent>
        )}

        {/* Sprint C Communities #24 — pending requests panel.
            Admin-only TabsContent; the TabsTrigger above is also
            admin-gated so a non-admin opening this URL via deep-link
            sees nothing. The component is its own self-contained
            unit so adding it elsewhere later is mechanical. */}
        {(currentUser?.role === "admin" || currentUser?.role === "instructor") && (
          <TabsContent value="pending" className="mt-5">
            <PendingMembersPanel
              tenantSlug={tenantSlug}
              communityId={batch.id}
              communityName={batch.name}
              users={users}
              onApprove={(uid) => addStudentsToGroup(batch.id, [uid])}
            />
          </TabsContent>
        )}

        {/* Sprint C Communities #27 — insights tab. Charts derived
            from the posts + members we already have in memory; no
            extra fetches needed. */}
        {(currentUser?.role === "admin" || currentUser?.role === "instructor") && (
          <TabsContent value="insights" className="mt-5">
            <CommunityInsightsPanel
              posts={getPostsForBatch(batch.id)}
              members={members}
              getUserById={getUserById}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* First-visit intro ritual for non-admin members. Pulls them
          into the room by writing a real intro post (not just a
          dialog they dismiss). Skip-able, one-shot per (member,
          community), and silent for teachers / non-members. */}
      <CommunityIntroPrompt
        batchId={batch.id}
        batchName={batch.name}
        memberIds={batch.memberIds}
        currentUser={currentUser}
        existingPosts={getPostsForBatch(batch.id)}
        activeSpaceId={activeSpaceId}
        onPost={(html) => {
          if (!currentUser) return
          addBatchPost({
            id: generateId("post"),
            batchId: batch.id,
            spaceId: activeSpaceId,
            authorId: currentUser.id,
            body: html,
            pinned: false,
            hidden: false,
            reactions: {},
            comments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }}
      />
    </div>
  )
}

// First-visit "introduce yourself" ritual.
//
// Why this exists: lurkers in a community are the silent killer of
// engagement. Once a student has posted once, they're 4x more likely
// to post again — but staring at a feed of veterans without saying
// anything is paralysing. The intro prompt does the heavy lift of
// the first post for them: pre-filled scaffold, one textarea, two
// buttons, done.
//
// Fires only when:
//   • The current user is a non-admin member of THIS community
//   • They haven't posted here before (we check existingPosts)
//   • They haven't dismissed or completed the prompt previously
//     (per-(community, user) localStorage flag)
//
// Storage: `thebigclass.community.intro.<batchId>.<userId>` with
// values "posted" | "dismissed". Absence = "should prompt".
function CommunityIntroPrompt({
  batchId,
  batchName,
  memberIds,
  currentUser,
  existingPosts,
  activeSpaceId,
  onPost,
}: {
  batchId: string
  batchName: string
  memberIds: string[]
  currentUser?: { id: string; name: string; role?: string } | null
  existingPosts: BatchPost[]
  activeSpaceId: string
  onPost: (html: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [intro, setIntro] = useState("")
  // The decision to show the sheet runs once on mount per
  // (batchId, userId) — we deliberately don't re-evaluate on every
  // post add, because that would re-fire the prompt the instant
  // the user posts something else and then revisits.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!currentUser) return
    if (currentUser.role === "admin" || currentUser.role === "instructor") return
    if (!memberIds.includes(currentUser.id)) return
    const alreadyPosted = existingPosts.some((p) => p.authorId === currentUser.id)
    if (alreadyPosted) return
    const key = `thebigclass.community.intro.${batchId}.${currentUser.id}`
    try {
      if (window.localStorage.getItem(key)) return
    } catch {
      return
    }
    // Slight delay so the prompt doesn't slam into the page before
    // the rest of the UI has painted — feels less aggressive when
    // it eases in.
    const t = window.setTimeout(() => setOpen(true), 600)
    return () => window.clearTimeout(t)
    // Intentional: re-run only on identity change, not post change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, currentUser?.id])

  const markFlag = (value: "posted" | "dismissed") => {
    if (typeof window === "undefined" || !currentUser) return
    try {
      window.localStorage.setItem(
        `thebigclass.community.intro.${batchId}.${currentUser.id}`,
        value,
      )
    } catch { /* private mode — best effort */ }
  }

  const handlePost = () => {
    const trimmed = intro.trim()
    if (!trimmed) return
    // Convert plain text → minimal HTML (one paragraph per blank-
    // line block). Tiptap renders paragraphs fine; this keeps line
    // breaks visible without exposing the user to a rich editor in
    // what should be a 30-second flow.
    const html = trimmed
      .split(/\n{2,}/)
      .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
      .join("")
    onPost(html)
    markFlag("posted")
    setOpen(false)
    toast.success("Welcome! Your intro is live in the room.")
  }

  const handleSkip = () => {
    markFlag("dismissed")
    setOpen(false)
  }

  if (!currentUser) return null

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleSkip())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to {batchName} 👋</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Two sentences about you — the community sees this so they
            know who you are. Don&rsquo;t overthink it.
          </p>
          <Textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder={`Hey everyone — I'm ${currentUser.name.split(" ")[0]}. I joined to learn ${batchName.toLowerCase()}. Excited to be here!`}
            rows={4}
            autoFocus
            className="resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Posts into <span className="font-medium">#{activeSpaceId.replace(/^space-/, "")}</span> — you can edit or delete anytime.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handlePost} disabled={!intro.trim()}>
            Post my intro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Lightweight HTML escape for the intro post body. We don't need
// full sanitisation here — the body goes through the existing
// RichTextContent renderer on display, which strips dangerous tags.
// This guard just stops accidental "<" + "script" patterns from
// inadvertently rendering as markup.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// ---------------------------------------------------------------
// Next-live-class banner. Surfaces the upcoming class for the
// course this community is attached to. Three states:
//   • Live now    → "🟢 Class is live · Join" (primary action,
//                   pulse indicator)
//   • Upcoming    → "⏰ Next class · Tomorrow 10:00" (with countdown
//                   when within 6h)
//   • Nothing     → renders null
// Lookahead window is 48h so a Thursday cohort planning their week
// catches Monday's class too. Cancelled sessions are skipped.
// ---------------------------------------------------------------
function NextLiveClassBanner({
  sessions,
}: {
  sessions: Array<{
    id: string
    title: string
    scheduledAt: string
    durationMinutes?: number
    status?: string
    roomCode?: string | null
  }>
}) {
  const now = Date.now()
  const lookahead = now + 48 * 3_600_000
  const candidate = sessions
    .filter((s) => s.status !== "cancelled")
    .filter((s) => {
      const start = Date.parse(s.scheduledAt)
      if (!Number.isFinite(start)) return false
      const end = start + (s.durationMinutes ?? 60) * 60_000
      // Include sessions that JUST started (within the duration
      // window + 30 min grace) so a late visitor sees "Join now".
      return start <= lookahead && end + 30 * 60_000 > now
    })
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0]
  // Dismissal state — once dismissed for this candidate, the bar
  // stays hidden until the page is reloaded OR a different session
  // takes the "next live" slot. We key by session id so dismissing
  // today's class doesn't suppress tomorrow's.
  const [dismissedId, setDismissedId] = useState<string | null>(null)

  if (!candidate) return null
  if (dismissedId === candidate.id) return null
  const start = Date.parse(candidate.scheduledAt)
  const diffMs = start - now
  const isLive = diffMs <= 0
  const minsUntil = Math.round(diffMs / 60_000)
  const hoursUntil = Math.round(diffMs / 3_600_000)
  // "Starting soon" = within 15 min. Promotes the lobby join CTA so a
  // student lands warm rather than discovering the class half-started.
  const startingSoon = !isLive && diffMs > 0 && diffMs <= 15 * 60_000
  const label = isLive
    ? "Live now"
    : startingSoon
      ? `Starting in ${Math.max(1, minsUntil)} min`
      : minsUntil < 60
        ? `Starts in ${minsUntil} min`
        : hoursUntil < 24
          ? `Starts in ${hoursUntil}h`
          : new Date(start).toLocaleString(undefined, {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
  // Live + starting-soon get the sticky treatment so they ride the
  // scroll. Further-out scheduled classes render in-flow (the bar
  // doesn't need to chase the reader when the class is hours away).
  const stickyEligible = isLive || startingSoon
  return (
    <div
      className={
        stickyEligible
          ? "sticky top-0 z-30 -mx-4 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          : ""
      }
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
          isLive
            ? "border-emerald-500/40 bg-emerald-500/[0.08]"
            : startingSoon
              ? "border-amber-500/40 bg-amber-500/[0.06]"
              : "border-primary/30 bg-primary/5"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
            {isLive && (
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                isLive ? "bg-emerald-500" : startingSoon ? "bg-amber-500" : "bg-primary"
              }`}
            />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {isLive ? "Live now" : startingSoon ? "Starting soon" : "Next class"}
            </p>
            <p className="truncate text-sm font-semibold">
              {candidate.title}{" "}
              <span className="font-normal text-muted-foreground">· {label}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" variant={isLive ? "default" : startingSoon ? "default" : "outline"}>
            <Link href={`/dashboard/classes/${candidate.id}`}>
              {isLive ? "Join now" : startingSoon ? "Hop into the lobby" : "View class"}
            </Link>
          </Button>
          <button
            type="button"
            aria-label="Hide for now"
            title="Hide for now"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
            onClick={() => setDismissedId(candidate.id)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Classes tab — community-native view of the attached course's
// live classes. Two stacked sections:
//   • Upcoming — scheduled + not yet ended, soonest first.
//                Each row deep-links to /dashboard/classes/<id>
//                where the host opens the room.
//   • Past     — sessions with a recording, newest first. Click
//                a row to play inline (jumps to /dashboard/
//                recordings?q=<title>) — for now we deep-link so
//                the existing player handles auth / progress. A
//                future iteration mounts RecordingPlayerDialog
//                inline.
// Cancelled sessions are dropped. Empty state explains the link
// to the course so the gap is obvious if a teacher attached the
// community without scheduling anything yet.
// ---------------------------------------------------------------
function CommunityClassesTab({
  courseId,
  courseTitle,
  sessions,
}: {
  courseId: string
  courseTitle: string
  sessions: Array<{
    id: string
    title: string
    scheduledAt: string
    durationMinutes?: number
    status?: string
    roomState?: string
    roomEndedAt?: string
    recordingUrl?: string
    summary?: string
  }>
}) {
  void courseId
  const now = Date.now()
  const upcoming = sessions
    .filter((s) => s.status !== "cancelled")
    .filter((s) => {
      const start = Date.parse(s.scheduledAt)
      if (!Number.isFinite(start)) return false
      const end = start + (s.durationMinutes ?? 60) * 60_000
      // "Upcoming" = scheduled in the future OR currently live
      // (within the duration window + 30 min grace).
      return end + 30 * 60_000 > now || s.roomState === "live" || s.roomState === "open"
    })
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
  const past = sessions
    .filter((s) => s.status !== "cancelled")
    .filter((s) => !!s.recordingUrl)
    .sort((a, b) => (b.roomEndedAt ?? b.scheduledAt).localeCompare(a.roomEndedAt ?? a.scheduledAt))

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Video className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">No classes yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {courseTitle} has no scheduled classes. Once the instructor schedules
              one, it&apos;ll show up here so this cohort can join from inside the
              community.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/classes/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Schedule a class
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Upcoming</h2>
            <span className="text-xs text-muted-foreground">· {upcoming.length}</span>
          </div>
          <div className="space-y-2">
            {upcoming.map((s) => {
              const start = Date.parse(s.scheduledAt)
              const isLive = s.roomState === "live" || s.roomState === "open" || (start <= now && start + (s.durationMinutes ?? 60) * 60_000 + 30 * 60_000 > now)
              const startsIn = Math.round((start - now) / 60_000)
              const label = isLive
                ? "Live now"
                : startsIn < 60
                  ? `Starts in ${Math.max(1, startsIn)} min`
                  : startsIn < 1440
                    ? `Starts in ${Math.round(startsIn / 60)}h`
                    : new Date(start).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/classes/${s.id}`}
                  className="group block"
                >
                  <Card className={cn(
                    "transition-shadow group-hover:shadow-md",
                    isLive && "border-emerald-500/40 bg-emerald-500/5",
                  )}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                          {isLive && (
                            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
                          )}
                          <span className={cn(
                            "relative inline-flex h-2.5 w-2.5 rounded-full",
                            isLive ? "bg-emerald-500" : "bg-primary",
                          )} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold group-hover:text-primary">
                            {s.title}
                          </p>
                          <p className="text-[11.5px] text-muted-foreground">
                            <span className="font-medium text-foreground">{label}</span>
                            {s.durationMinutes && <> · {s.durationMinutes} min</>}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isLive ? "default" : "outline"}
                        className="shrink-0"
                      >
                        {isLive ? "Join" : "Details"}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Past recordings */}
      {past.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Recordings</h2>
            <span className="text-xs text-muted-foreground">· {past.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {past.map((s) => {
              const when = new Date(s.roomEndedAt ?? s.scheduledAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/recordings?q=${encodeURIComponent(s.title)}`}
                  className="group block"
                >
                  <Card className="h-full transition-shadow group-hover:shadow-md">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <PlayCircle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                            {s.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            <Clock className="-mt-0.5 mr-1 inline h-3 w-3" />
                            {when}
                            {s.durationMinutes && <> · {s.durationMinutes} min</>}
                          </p>
                        </div>
                      </div>
                      {s.summary && (
                        <p className="line-clamp-2 text-[12px] text-muted-foreground">
                          {s.summary}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Cohort window banner — visible to anyone on the batch detail page
// when startsAt / endsAt are set. Three states:
//   • Pre-launch  → "Cohort begins in N days" (amber, anticipatory)
//   • In window   → "Wraps in N days" or "Cohort is live" (primary)
//   • Past        → "Wrapped on <date>" (muted, archived feel)
// Always-on batches (no dates set) render nothing.
// ---------------------------------------------------------------
function CohortWindowBanner({
  startsAt,
  endsAt,
}: {
  startsAt?: string
  endsAt?: string
}) {
  if (!startsAt && !endsAt) return null
  const now = Date.now()
  const start = startsAt ? new Date(startsAt).getTime() : null
  const end = endsAt ? new Date(endsAt).getTime() : null
  const startInFuture = start !== null && start > now
  const endInPast = end !== null && end < now
  const inWindow =
    (start === null || start <= now) && (end === null || end >= now)

  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  const days = (ms: number) =>
    Math.max(0, Math.ceil((ms - now) / (24 * 60 * 60 * 1000)))

  let tone: "amber" | "primary" | "muted"
  let label: string
  if (startInFuture && start !== null) {
    tone = "amber"
    label = `Cohort begins in ${days(start)} day${days(start) === 1 ? "" : "s"} · ${fmt(start)}`
  } else if (endInPast && end !== null) {
    tone = "muted"
    label = `Cohort wrapped on ${fmt(end)}`
  } else if (inWindow && end !== null) {
    tone = "primary"
    label = `Cohort live · wraps in ${days(end)} day${days(end) === 1 ? "" : "s"} (${fmt(end)})`
  } else {
    tone = "primary"
    label = startsAt
      ? `Cohort live since ${fmt(start ?? now)}`
      : `Cohort wraps on ${fmt(end ?? now)}`
  }

  const toneClasses =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
      : tone === "muted"
        ? "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
        : "border-primary/30 bg-primary/10 text-primary"
  return (
    <div
      className={`mt-2 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium ${toneClasses}`}
    >
      <CalendarClock className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------
// Batch edit menu — name / description / course / colour, all in
// one inline dialog rather than a separate edit page.
// ---------------------------------------------------------------
function BatchEditMenuItem({
  batch,
  onSave,
}: {
  batch: ReturnType<typeof useLMS>["studentGroups"][number]
  onSave: (patch: Partial<typeof batch>) => void
}) {
  const { courses } = useLMS()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(batch.name)
  const [description, setDescription] = useState(batch.description ?? batch.purpose ?? "")
  const [courseId, setCourseId] = useState<string>(batch.courseId ?? "none")
  const [color, setColor] = useState<string>(batch.color ?? "#0a3024")
  // Cohort dates use the native date input (YYYY-MM-DD). We strip
  // any time portion off the stored ISO so the picker doesn't show
  // a stale value, then re-stamp midnight UTC on save.
  const [startsAt, setStartsAt] = useState(batch.startsAt ? batch.startsAt.slice(0, 10) : "")
  const [endsAt, setEndsAt] = useState(batch.endsAt ? batch.endsAt.slice(0, 10) : "")

  function save() {
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      purpose: description.trim() || undefined,
      courseId: courseId !== "none" ? courseId : undefined,
      color,
      startsAt: startsAt ? new Date(`${startsAt}T00:00:00Z`).toISOString() : undefined,
      endsAt: endsAt ? new Date(`${endsAt}T23:59:59Z`).toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    })
    setOpen(false)
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
      >
        <Pin className="mr-2 h-3.5 w-3.5" />
        Edit community
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit community</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-batch-name">Name *</Label>
              <Input
                id="edit-batch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-batch-desc">Description</Label>
              <Textarea
                id="edit-batch-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-batch-course">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="edit-batch-course">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded border border-border bg-transparent"
              />
            </div>
            {/* Cohort window — both optional. Time-boxed cohorts set
                both; rolling cohorts set just startsAt; always-on
                groups leave both blank. The hero banner reacts to
                whatever's filled. */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-batch-startsAt">Cohort starts</Label>
                <Input
                  id="edit-batch-startsAt"
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-batch-endsAt">Cohort ends</Label>
                <Input
                  id="edit-batch-endsAt"
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
              <p className="col-span-2 text-[11px] text-muted-foreground">
                Leave both blank for an always-on community. Set just &quot;starts&quot; for a rolling cohort.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!name.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------
// Community access settings — visibility (open / closed / invite-link
// / tag-gated), rotatable invite code, required tags, teachers-only
// flag. Mirrors the WhatsApp-group mental model the user asked for.
// ---------------------------------------------------------------
function CommunityAccessMenuItem({
  batch,
  onSave,
}: {
  batch: ReturnType<typeof useLMS>["studentGroups"][number]
  onSave: (patch: Partial<typeof batch>) => void
}) {
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug ?? ""
  const [open, setOpen] = useState(false)
  const initialVisibility = (batch.visibility ?? "closed") as
    | "open"
    | "closed"
    | "invite-link"
    | "tag-gated"
  const [visibility, setVisibility] = useState<typeof initialVisibility>(initialVisibility)
  const [inviteCode, setInviteCode] = useState<string>(batch.inviteCode ?? "")
  const [tagsInput, setTagsInput] = useState<string>((batch.requiredTags ?? []).join(", "))
  const [teachersOnly, setTeachersOnly] = useState<boolean>(!!batch.teachersOnly)

  // Auto-mint an invite code the first time someone flips to
  // invite-link mode. Stays stable until the user clicks "Rotate".
  function ensureInviteCode(): string {
    if (inviteCode) return inviteCode
    const fresh = Math.random().toString(36).slice(2, 10)
    setInviteCode(fresh)
    return fresh
  }

  function rotateCode() {
    const fresh = Math.random().toString(36).slice(2, 10)
    setInviteCode(fresh)
  }

  async function copyInviteUrl() {
    const code = inviteCode || ensureInviteCode()
    if (!tenantSlug) {
      toast.error("Couldn't find your workspace slug — refresh and try again.")
      return
    }
    const url = `${window.location.origin}/p/${tenantSlug}/join/${code}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Invite link copied to clipboard.")
    } catch {
      toast.error("Couldn't copy — copy manually: " + url)
    }
  }

  function save() {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    onSave({
      visibility,
      inviteCode: visibility === "invite-link" ? inviteCode || ensureInviteCode() : undefined,
      requiredTags: visibility === "tag-gated" && tags.length > 0 ? tags : undefined,
      teachersOnly,
      updatedAt: new Date().toISOString(),
    })
    toast.success("Community access settings saved.")
    setOpen(false)
  }

  const VISIBILITY_LABEL: Record<typeof visibility, string> = {
    open: "Open — anyone in your workspace can join",
    closed: "Closed — owner adds people manually",
    "invite-link": "Invite link — anyone with the link can join",
    "tag-gated": "Tag-gated — only users with a matching tag can join",
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
      >
        <Shield className="mr-2 h-3.5 w-3.5" />
        Access &amp; invites
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Community access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-sm">
            <div className="space-y-1.5">
              <Label>Who can join?</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open — anyone in your workspace</SelectItem>
                  <SelectItem value="closed">Closed — owner adds manually</SelectItem>
                  <SelectItem value="invite-link">Invite link</SelectItem>
                  <SelectItem value="tag-gated">Tag-gated</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{VISIBILITY_LABEL[visibility]}</p>
            </div>

            {visibility === "invite-link" && (
              <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3">
                <Label className="text-xs">Invite link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={
                      inviteCode
                        ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${tenantSlug}/join/${inviteCode}`
                        : "click Generate to mint a code"
                    }
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={copyInviteUrl}>
                    Copy
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={rotateCode} className="text-xs">
                  {inviteCode ? "Rotate code" : "Generate code"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Anyone with this link can join. Rotate to invalidate every share you&apos;ve sent so far.
                </p>
              </div>
            )}

            {visibility === "tag-gated" && (
              <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3">
                <Label className="text-xs">Required tags</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="scholarship, alumni, batch-2024"
                />
                <p className="text-[11px] text-muted-foreground">
                  Comma-separated. Users with at least one matching tag on their profile can join. Case-insensitive.
                </p>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
              <input
                type="checkbox"
                checked={teachersOnly}
                onChange={(e) => setTeachersOnly(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">Instructors-only community</span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Only users with admin or instructor role can join. Use this for staff rooms — students are blocked even if visibility is open.
                </p>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save access settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------
// Directory tab — peer-discovery view + admin roster controls.
// ---------------------------------------------------------------
type DirectoryUser = ReturnType<typeof useLMS>["users"][number]

function DirectoryTab({
  members,
  allStudents,
  getPostsForBatch,
  batchId,
  // Sprint B Communities #5 — bulk invite needs the community name +
  // invite URL to render the share message. tenantSlug + inviteCode
  // build the URL; allUsers powers the email-to-known-user matching.
  communityName,
  tenantSlug,
  inviteCode,
  allUsers,
  onAdd,
  onRemove,
  isAdmin,
}: {
  members: DirectoryUser[]
  allStudents: DirectoryUser[]
  getPostsForBatch: ReturnType<typeof useLMS>["getPostsForBatch"]
  batchId: string
    communityName: string
    tenantSlug: string
    inviteCode?: string
    allUsers: DirectoryUser[]
  onAdd: (ids: string[]) => void
  onRemove: (ids: string[]) => void
  isAdmin: boolean
}) {
  const [search, setSearch] = useState("")
  // Sprint B Communities #7 — moderator promotion store. Per-
  // community list of user ids tagged as moderators. Workspace
  // admin/instructor remain implicit teachers (top tier).
  const mods = useCommunityModerators(tenantSlug, batchId)
  // Sprint B Communities #5 — bulk invite dialog state. Kept local
  // to DirectoryTab (instead of bubbling up) because this is the
  // only surface that opens it.
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false)
  // Sprint B Communities #6 — active-in-last-7d filter. We compute
  // a Set of authorIds with a post in the last 7 days once per
  // render so per-card checks stay O(1).
  const [activeOnly, setActiveOnly] = useState(false)
  const recentActiveIds = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const ids = new Set<string>()
    for (const p of getPostsForBatch(batchId)) {
      if (new Date(p.createdAt).getTime() >= sevenDaysAgo) ids.add(p.authorId)
    }
    return ids
  }, [getPostsForBatch, batchId])
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [profileMemberId, setProfileMemberId] = useState<string | null>(null)

  // Collect unique cities + countries for the filter dropdown. Lets
  // a member find peers from "Bangalore" or "India" with one click
  // rather than scrolling.
  const locations = useMemo(() => {
    const set = new Set<string>()
    for (const m of members) {
      if (m.city) set.add(m.city)
      else if (m.country) set.add(m.country)
    }
    return Array.from(set).sort()
  }, [members])

  const filtered = useMemo(() => {
    const base = members.filter((m) => {
      if (locationFilter !== "all" && m.city !== locationFilter && m.country !== locationFilter) {
        return false
      }
      // Sprint B Communities #6 — active-in-last-7d filter.
      if (activeOnly && !recentActiveIds.has(m.id)) return false
      return true
    })
    return fuzzySearch(base, search, (m) => [
      m.name,
      m.email,
      m.bio ?? "",
      m.city ?? "",
      m.country ?? "",
      m.college ?? "",
      m.school ?? "",
    ])
  }, [members, search, locationFilter, activeOnly, recentActiveIds])

  const profileMember = profileMemberId
    ? members.find((m) => m.id === profileMemberId) ?? null
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search peers — name, bio, city, college"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {locations.length > 0 && (
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All locations</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </div>
        {/* Sprint B Communities #6 — active filter chip. Hidden when
            no one's been active recently (filter would be useless). */}
        {recentActiveIds.size > 0 && (
          <button
            type="button"
            onClick={() => setActiveOnly((v) => !v)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
              activeOnly
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
            title="Show only members who posted in the last 7 days"
          >
            Active 7d · {recentActiveIds.size}
          </button>
        )}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Sprint B Communities #5 — bulk invite. Sits beside
                the existing one-at-a-time Add students button so
                admins discover the bulk path without losing the
                familiar single-add affordance. */}
            <Button variant="outline" onClick={() => setBulkInviteOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Bulk invite
            </Button>
            <Button onClick={() => setPickerOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Add students
            </Button>
          </div>
        )}
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users2 className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">No members yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {isAdmin
                ? "Add students from your roster to give this community a Common Room people will actually visit."
                : "This community doesn't have any members yet."}
            </p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setPickerOpen(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" /> Add students
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const postCount = getPostsForBatch(batchId).filter(
              (p) => p.authorId === m.id,
            ).length
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => setProfileMemberId(m.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setProfileMemberId(m.id)
                  }
                }}
                className="group w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar user={m} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold flex items-center gap-1.5">
                          {m.name}
                          {/* Sprint B Communities #7 — moderator pill.
                              Only renders for promoted members
                              who aren't already workspace teachers
                              (the "Instructor" label below conveys that
                              tier). */}
                          {mods.isModerator(m.id) && m.role !== "admin" && m.role !== "instructor" && (
                            <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                              Mod
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.role === "admin" || m.role === "instructor"
                            ? "Instructor"
                            : mods.isModerator(m.id)
                              ? "Moderator"
                              : "Member"}
                          {(m.city || m.country) && (
                            <span> · {m.city || m.country}</span>
                          )}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                          {/* Sprint B Communities #7 — toggle moderator
                              for non-Instructor members. Workspace
                              teachers are already top-tier so we
                              skip the affordance for them. */}
                          {m.role !== "admin" && m.role !== "instructor" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                mods.toggle(m.id)
                              }}
                              title={mods.isModerator(m.id) ? "Demote moderator" : "Promote to moderator"}
                              className={cn(
                                "rounded p-1 text-muted-foreground hover:bg-purple-500/10 hover:text-purple-600",
                                mods.isModerator(m.id) && "text-purple-600",
                              )}
                            >
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                {mods.isModerator(m.id) ? "Demote" : "Mod"}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemove([m.id])
                            }}
                            title="Remove from batch"
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {m.bio && (
                      <p className="line-clamp-2 text-xs text-foreground/80">
                        {m.bio}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {postCount} post{postCount === 1 ? "" : "s"}
                      </span>
                      {m.linkedInUrl && (
                        <SocialDot label="LinkedIn" url={m.linkedInUrl} />
                      )}
                      {m.twitterUrl && (
                        <SocialDot label="Twitter" url={m.twitterUrl} />
                      )}
                      {m.githubUrl && <SocialDot label="GitHub" url={m.githubUrl} />}
                      {m.instagramUrl && (
                        <SocialDot label="Instagram" url={m.instagramUrl} />
                      )}
                      {m.portfolioUrl && (
                        <SocialDot label="Portfolio" url={m.portfolioUrl} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {isAdmin && (
        <AddMembersDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          allStudents={allStudents}
          existingMemberIds={new Set(members.map((m) => m.id))}
          onAdd={(ids) => {
            onAdd(ids)
            setPickerOpen(false)
          }}
        />
      )}

      <MemberProfileSheet
        member={profileMember}
        onOpenChange={(v) => !v && setProfileMemberId(null)}
        postsByThisMember={
          profileMember
            ? getPostsForBatch(batchId).filter((p) => p.authorId === profileMember.id)
            : []
        }
      />

      {/* Sprint B Communities #5 — bulk invite dialog. Renders only
          on demand; the existing per-batch invite-code lifecycle is
          owned by the access-settings dialog and remains intact. */}
      <CommunityBulkInviteDialog
        open={bulkInviteOpen}
        onOpenChange={setBulkInviteOpen}
        communityName={communityName}
        inviteUrl={
          inviteCode
            ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${tenantSlug}/join/${inviteCode}`
            : `${typeof window !== "undefined" ? window.location.origin : ""}/p/${tenantSlug}/batches/${batchId}`
        }
        knownUsers={allUsers.map((u) => ({ id: u.id, email: u.email, name: u.name }))}
        existingMemberIds={members.map((m) => m.id)}
        onAddKnown={(ids) => onAdd(ids)}
      />
    </div>
  )
}

function Avatar({ user, size }: { user: DirectoryUser; size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        initials(user.name)
      )}
    </div>
  )
}

function SocialDot({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold uppercase text-muted-foreground hover:bg-primary/15 hover:text-primary"
      title={label}
    >
      {label[0]}
    </a>
  )
}

// ---------------------------------------------------------------
// MemberProfileSheet — slide-in panel with the full profile.
// ---------------------------------------------------------------
function MemberProfileSheet({
  member,
  onOpenChange,
  postsByThisMember,
}: {
  member: DirectoryUser | null
  onOpenChange: (v: boolean) => void
  postsByThisMember: ReturnType<typeof useLMS>["batchPosts"]
}) {
  return (
    <Sheet open={!!member} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
        {member && (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>{member.name}</SheetTitle>
            </SheetHeader>
            {/* Cover band — stretches the full width of the sheet because
                the SheetContent above no longer applies padding. */}
            <div className="relative h-24 bg-gradient-to-br from-primary/15 via-accent/10 to-background">
              {member.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute -bottom-8 left-6">
                <div className="rounded-full border-4 border-card shadow-sm">
                  <Avatar user={member} size={64} />
                </div>
              </div>
            </div>
            <div className="space-y-5 px-6 pb-6 pt-12">
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold leading-tight">
                  {member.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {member.role === "admin"
                    ? "Instructor · workspace owner"
                    : member.role === "instructor"
                      ? "Instructor"
                      : "Member"}
                  {member.city && ` · ${member.city}`}
                  {member.country && ` · ${member.country}`}
                </p>
              </div>
              {member.bio && (
                <p className="text-sm leading-relaxed text-foreground/85">{member.bio}</p>
              )}
              {/* Education + role chips */}
              {(member.college ||
                member.school ||
                member.collegeDegree ||
                member.highestQualification) && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                  <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">
                    Background
                  </p>
                  <ul className="space-y-0.5 text-foreground/85">
                    {member.college && <li>🎓 {member.college}</li>}
                    {member.collegeDegree && (
                      <li>📜 {member.collegeDegree}{member.collegeMajor ? ` · ${member.collegeMajor}` : ""}</li>
                    )}
                    {member.school && <li>🏫 {member.school}</li>}
                    {member.highestQualification && (
                      <li>📚 {member.highestQualification}</li>
                    )}
                  </ul>
                </div>
              )}
              {/* Social links */}
              {(member.linkedInUrl ||
                member.twitterUrl ||
                member.githubUrl ||
                member.instagramUrl ||
                member.portfolioUrl ||
                member.youtubeUrl) && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    On the web
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {member.linkedInUrl && (
                      <SocialButton label="LinkedIn" url={member.linkedInUrl} />
                    )}
                    {member.twitterUrl && (
                      <SocialButton label="Twitter" url={member.twitterUrl} />
                    )}
                    {member.githubUrl && (
                      <SocialButton label="GitHub" url={member.githubUrl} />
                    )}
                    {member.instagramUrl && (
                      <SocialButton label="Instagram" url={member.instagramUrl} />
                    )}
                    {member.portfolioUrl && (
                      <SocialButton label="Portfolio" url={member.portfolioUrl} />
                    )}
                    {member.youtubeUrl && (
                      <SocialButton label="YouTube" url={member.youtubeUrl} />
                    )}
                  </div>
                </div>
              )}
              {/* Recent posts in this community */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Posts in this community ({postsByThisMember.length})
                </p>
                {postsByThisMember.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    Hasn&apos;t posted in this community yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {postsByThisMember.slice(0, 5).map((p) => (
                      <li
                        key={p.id}
                        className="rounded-md border border-border bg-card/60 p-2.5"
                      >
                        <p className="text-[10px] text-muted-foreground">
                          {timeAgo(p.createdAt)}
                        </p>
                        <p className="line-clamp-3 text-xs text-foreground/85">
                          {p.body.replace(/<[^>]+>/g, "")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Joined the platform on{" "}
                {new Date(member.createdAt).toLocaleDateString()}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SocialButton({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/[0.05] hover:text-foreground"
    >
      {label}
    </a>
  )
}

function AddMembersDialog({
  open,
  onOpenChange,
  allStudents,
  existingMemberIds,
  onAdd,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  allStudents: Array<{ id: string; name: string; email: string }>
  existingMemberIds: Set<string>
  onAdd: (ids: string[]) => void
}) {
  const [search, setSearch] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set())

  // Students who aren't already in the batch — the dialog only ever
  // surfaces candidates, not the current roster.
  const candidates = useMemo(
    () => allStudents.filter((s) => !existingMemberIds.has(s.id)),
    [allStudents, existingMemberIds],
  )
  const filtered = useMemo(
    () =>
      fuzzySearch(candidates, search, (s) => [s.name, s.email]),
    [candidates, search],
  )

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function selectAllVisible() {
    setPicked((prev) => {
      const next = new Set(prev)
      filtered.forEach((s) => next.add(s.id))
      return next
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setPicked(new Set())
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add students to this community</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} candidate{filtered.length === 1 ? "" : "s"} ·{" "}
              {picked.size} picked
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllVisible}
              disabled={filtered.length === 0}
              className="text-xs"
            >
              Select all visible
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-md border border-border">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {candidates.length === 0
                  ? "Every student is already in this batch."
                  : "No students match your search."}
              </p>
            ) : (
              <ul>
                {filtered.map((s) => {
                  const checked = picked.has(s.id)
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 border-b border-border p-3 last:border-b-0 hover:bg-muted/40",
                        checked && "bg-primary/[0.04]",
                      )}
                      onClick={() => toggle(s.id)}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials(s.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onAdd(Array.from(picked))} disabled={picked.size === 0}>
            <Plus className="mr-1.5 h-4 w-4" /> Add {picked.size || ""}
            {picked.size > 0 && (picked.size === 1 ? " student" : " students")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------
// Common Room — left rail of Spaces + active space's feed.
// ---------------------------------------------------------------
type Attachment = NonNullable<ReturnType<typeof useLMS>["batchPosts"][number]["attachments"]>[number]
type Mentionable = { id: string; name: string; role?: "Instructor" | "member" }

type CommonRoomProps = {
  /** Tenant slug — scopes the member-prefs storage so different
   *  workspaces in the same browser don't clobber each other's
   *  onboarding state. */
  tenantSlug: string
  batchId: string
  /** Title of the linked course (if any). Used to localise starter
   *  prompts so they reference the cohort the community belongs to. */
  courseTitle?: string
  spaces: BatchSpace[]
  activeSpaceId: string
  onSpaceChange: (spaceId: string) => void
  onSpacesEdit: (next: BatchSpace[]) => void
  currentUserId?: string
  isAdmin: boolean
  getUserById: ReturnType<typeof useLMS>["getUserById"]
  posts: ReturnType<typeof useLMS>["batchPosts"]
  /** People available for @mention — Instructor first, then members. */
  mentionables: Mentionable[]
  onAdd: (body: string, embedUrl?: string, attachments?: Attachment[], type?: BatchPostType) => void
  onAddComment: (postId: string, body: string) => void
  onEditPost: (postId: string, nextBody: string) => void
  onTogglePin: (postId: string) => void
  onToggleFeatured: (postId: string) => void
  onToggleHide: (postId: string, hidden: boolean) => void
  onDeletePost: (postId: string) => void
  onToggleReaction: (postId: string, emoji: string) => void
  onToggleCommentHidden: (postId: string, commentId: string, hidden: boolean) => void
  /** Mark a question-type post as answered. Optional commentId credits
   *  the resolver — used by the helpfulness signal. */
  onMarkAnswered?: (postId: string, commentId?: string) => void
  /** Re-open an answered question. */
  onReopenQuestion?: (postId: string) => void
}

// localStorage key for the composer draft. Scoped per (community,
// space) so each space keeps its own in-progress post — switching
// space mid-write doesn't clobber the other space's draft.
/** Sprint C Communities #25 — per-channel composer prompt. The
 *  placeholder shifts to match the channel's expected vibe. We key
 *  on space id (stable for shipped defaults) and fall back to the
 *  generic prompt for custom / renamed spaces — admins who renamed
 *  "Q&A" to "Help" still get the question-shaped placeholder if
 *  they kept the underlying space id. */
function composerHintForSpace(spaceId: string | undefined, name: string | undefined): string {
  const fallback = `Share something in ${name ?? "the room"}…`
  if (!spaceId) return fallback
  if (spaceId === "space-announcements") {
    return "Pin an update — keep it under 280 characters so it reads at a glance."
  }
  if (spaceId === "space-qa") {
    return "Ask a question. Be specific — paste the error, screenshot, or exact moment."
  }
  if (spaceId === "space-wins") {
    return "Brag a little. Something you shipped, figured out, or got proud of this week."
  }
  if (spaceId === "space-resources") {
    return "Drop a link — article, tool, video. Add one line on why it's worth a click."
  }
  if (spaceId === "space-off-topic") {
    return "Anything goes here. Memes, life, the lounge."
  }
  return fallback
}

function draftKey(batchId: string, spaceId: string): string {
  return `thebigclass.community.draft.${batchId}.${spaceId}.v1`
}

// Starter prompts shown when a space has zero posts. Each one drops
// a pre-filled HTML draft into the composer; the user can edit or
// post as-is. Course-linked communities get an extra prompt that
// references the cohort's content. We keep the list short (4) on
// purpose — too many "pick one" choices defeat the point.
interface StarterPrompt {
  label: string
  emoji: string
  hint: string
  draft: string
}
function getStarterPrompts(courseTitle?: string): StarterPrompt[] {
  const baseline: StarterPrompt[] = [
    {
      label: "Introduce yourself",
      emoji: "👋",
      hint: "Name, what you're learning, one goal — two sentences.",
      draft:
        "<p>Hey everyone — I&rsquo;m <strong>[your name]</strong>. I joined to <em>[your goal]</em>. Looking forward to learning with you all!</p>",
    },
    {
      label: "Share a win",
      emoji: "🎉",
      hint: "Something small you shipped, learned, or figured out this week.",
      draft:
        "<p>Small win this week: <em>[what happened]</em>. Took me <em>[how long]</em>, learned <em>[what you learned]</em>.</p>",
    },
    {
      label: "Ask a question",
      emoji: "🤔",
      hint: "Don't suffer alone — ask the room. Specifics help.",
      draft:
        "<p>Stuck on something — <em>[what you tried so far]</em>. Anyone hit this and figured it out?</p>",
    },
    {
      label: "Drop a resource",
      emoji: "🔗",
      hint: "Article, video, tool — something the cohort would love.",
      draft:
        "<p>Found this useful: <em>[link or title]</em>.</p><p>Why it&rsquo;s good: <em>[one sentence]</em>.</p>",
    },
  ]
  if (courseTitle) {
    // Course-aware nudge replaces the generic "Drop a resource" slot
    // because cohort-specific prompts get better engagement than
    // generic ones (tested in the audit — see item C44).
    baseline[3] = {
      label: `What clicked in ${courseTitle}?`,
      emoji: "💡",
      hint: "One thing from the course that finally made sense — others will recognise it.",
      draft: `<p>Something from <strong>${courseTitle}</strong> that clicked for me: <em>[the concept]</em>. The way it&rsquo;s framed makes <em>[your takeaway]</em> obvious.</p>`,
    }
  }
  return baseline
}
interface ComposerDraft {
  body: string
  embedUrl: string
  savedAt: string
}

/** Sprint C Communities #23 — admin bulk-moderation panel.
 *  Collapsible. Four actions:
 *    1. Bulk-hide stale unpinned (>30d, no comments) — sweep
 *    2. Unpin all — when too many pins clutter the top
 *    3. Bulk-hide by author — spam control. Picks a name, then
 *       hides every visible post that user authored in this space.
 *    4. (implicit) restore — admins can unhide from per-post kebab.
 *  Each destructive action confirms before firing. */
function AdminBulkModPanel({
  posts,
  onHideMany,
  onUnpinAll,
  getUserById,
}: {
  posts: ReturnType<typeof useLMS>["batchPosts"]
  onHideMany: (ids: string[]) => void
  onUnpinAll: (ids: string[]) => void
  getUserById: ReturnType<typeof useLMS>["getUserById"]
}) {
  const [open, setOpen] = useState(false)
  const [authorPickerOpen, setAuthorPickerOpen] = useState(false)
  // Materialise the target sets once per render so the buttons can
  // show counts ("Hide 12 stale posts") without recomputing on click.
  const stalePostIds = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return posts
      .filter((p) => !p.hidden && !p.pinned && (p.comments?.length ?? 0) === 0)
      .filter((p) => new Date(p.createdAt).getTime() < cutoff)
      .map((p) => p.id)
  }, [posts])
  const pinnedPostIds = useMemo(
    () => posts.filter((p) => p.pinned).map((p) => p.id),
    [posts],
  )
  // Per-author post counts among visible posts — drives the
  // "Hide all from author" picker. Author rows are sorted by post
  // count descending so the most active (= most spammy candidates)
  // surface first.
  const postsByAuthor = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of posts) {
      if (p.hidden) continue
      map.set(p.authorId, (map.get(p.authorId) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([authorId, count]) => ({
        authorId,
        count,
        name: getUserById(authorId)?.name ?? "Unknown",
      }))
  }, [posts, getUserById])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-md border border-dashed border-border bg-card px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground"
      >
        ⚙ Bulk mod tools
      </button>
    )
  }
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-semibold">Bulk moderation</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close mod panel"
        >
          ×
        </button>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Two-tap cleanup for the most common admin tasks.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={stalePostIds.length === 0}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm(
                `Hide ${stalePostIds.length} stale posts (no comments, not pinned, > 30 days old)?`,
              )
            ) {
              onHideMany(stalePostIds)
            }
          }}
          className={cn(
            "rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition",
            stalePostIds.length === 0
              ? "border-border bg-card text-muted-foreground"
              : "border-amber-500/40 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300",
          )}
        >
          Hide {stalePostIds.length} stale posts
        </button>
        <button
          type="button"
          disabled={pinnedPostIds.length === 0}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm(`Unpin all ${pinnedPostIds.length} pinned posts?`)
            ) {
              onUnpinAll(pinnedPostIds)
            }
          }}
          className={cn(
            "rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition",
            pinnedPostIds.length === 0
              ? "border-border bg-card text-muted-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          Unpin all {pinnedPostIds.length} pinned
        </button>
        {/* Sprint C Communities #23 — per-author bulk-hide. The
            picker opens a small inline panel rather than a modal —
            the candidates are typed-ahead-shortable and the action
            is always the same (hide). Confirm dialog enforces a
            deliberate-action gate. */}
        <button
          type="button"
          disabled={postsByAuthor.length === 0}
          onClick={() => setAuthorPickerOpen((v) => !v)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition",
            postsByAuthor.length === 0
              ? "border-border bg-card text-muted-foreground"
              : authorPickerOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          Hide by author…
        </button>
      </div>
      {authorPickerOpen && postsByAuthor.length > 0 && (
        <div className="mt-2.5 max-h-48 overflow-y-auto rounded-md border border-border bg-card p-1.5">
          <p className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Top posters · pick a name
          </p>
          {postsByAuthor.slice(0, 12).map((row) => (
            <button
              key={row.authorId}
              type="button"
              onClick={() => {
                const idsToHide = posts
                  .filter((p) => !p.hidden && p.authorId === row.authorId)
                  .map((p) => p.id)
                if (idsToHide.length === 0) return
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    `Hide all ${idsToHide.length} posts from ${row.name}? Use "Mute" on the directory tab for ongoing suppression.`,
                  )
                ) {
                  onHideMany(idsToHide)
                  setAuthorPickerOpen(false)
                }
              }}
              className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1 text-left text-[12px] hover:bg-muted"
            >
              <span className="truncate font-medium">{row.name}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                {row.count} {row.count === 1 ? "post" : "posts"}
              </span>
            </button>
          ))}
          {postsByAuthor.length > 12 && (
            <p className="px-2 pt-1 text-[10.5px] text-muted-foreground">
              +{postsByAuthor.length - 12} more — open Directory tab for full roster.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Sprint C Communities #24 — pending-tab trigger. Hidden when the
 *  queue is empty so admins don't see a dead tab; visible with a
 *  count badge when there's work. Mounted inside <TabsList> so it
 *  participates in the same keyboard-arrow navigation as the others. */
function PendingTabTrigger({
  tenantSlug,
  communityId,
}: {
  tenantSlug: string
  communityId: string
}) {
  const { requests } = useJoinRequests(tenantSlug, communityId)
  if (requests.length === 0) return null
  return (
    <TabsTrigger value="pending" className="gap-1.5">
      <UserPlus className="h-3.5 w-3.5" />
      Pending
      <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
        {requests.length}
      </span>
    </TabsTrigger>
  )
}

/** Sprint C Communities #24 — pending requests panel. Lists pending
 *  join requests with the user's "why I want to join" message;
 *  individual approve/reject + bulk "approve all". Each approve
 *  delegates membership to the parent so the existing addStudents
 *  pipeline still owns the source of truth. */
function PendingMembersPanel({
  tenantSlug,
  communityId,
  communityName,
  users,
  onApprove,
}: {
  tenantSlug: string
  communityId: string
  communityName: string
  users: ReturnType<typeof useLMS>["users"]
  onApprove: (userId: string) => void
}) {
  const joins = useJoinRequests(tenantSlug, communityId)

  if (joins.requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Users2 className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">All caught up</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            No pending requests to join {communityName}.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold">
            {joins.requests.length} {joins.requests.length === 1 ? "person" : "people"}{" "}
            waiting to join
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const ids = joins.approveAll()
              for (const uid of ids) onApprove(uid)
              toast.success(`Approved ${ids.length}.`)
            }}
          >
            Approve all
          </Button>
        </div>
        <ul className="space-y-2">
          {joins.requests.map((r) => {
            const u = users.find((x) => x.id === r.userId)
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {(u?.name ?? "?")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u?.name ?? "Unknown user"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {u?.email ?? r.userId} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                  {r.message && (
                    <p className="mt-1.5 line-clamp-3 text-[12.5px] text-foreground/90">
                      &ldquo;{r.message}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      const uid = joins.approve(r.id)
                      if (uid) {
                        onApprove(uid)
                        toast.success(`${u?.name ?? "Member"} added.`)
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => joins.reject(r.id)}>
                    Reject
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

/** Sprint C Communities #27 — insights panel. Compact metrics
 *  visualisation. Pure derived data, no extra fetches: posts +
 *  members already loaded for the community. */
function CommunityInsightsPanel({
  posts,
  members,
  getUserById,
}: {
  posts: ReturnType<typeof useLMS>["batchPosts"]
  members: ReturnType<typeof useLMS>["users"]
  getUserById: ReturnType<typeof useLMS>["getUserById"]
}) {
  // Posts per week (last 8 weeks) for the trend.
  const weeklyPosts = useMemo(() => {
    const now = Date.now()
    const buckets: Array<{ label: string; count: number }> = []
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 24 * 3600 * 1000
      const end = now - i * 7 * 24 * 3600 * 1000
      const count = posts.filter((p) => {
        const t = new Date(p.createdAt).getTime()
        return t >= start && t < end
      }).length
      buckets.push({ label: `w-${i}`, count })
    }
    return buckets
  }, [posts])
  const maxWeek = Math.max(1, ...weeklyPosts.map((w) => w.count))

  // Top 5 contributors by post + comment count.
  const topContributors = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of posts) {
      counts.set(p.authorId, (counts.get(p.authorId) ?? 0) + 1)
      for (const c of p.comments ?? []) {
        counts.set(c.authorId, (counts.get(c.authorId) ?? 0) + 0.5)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, score]) => ({
        userId,
        name: getUserById(userId)?.name ?? "Unknown",
        score: Math.round(score * 2) / 2,
      }))
  }, [posts, getUserById])

  // Median time-to-first-reply (in hours). We only consider posts
  // that have at least one comment. Skip when N<3 to avoid a
  // misleading "median" of 1.
  const medianReplyHours = useMemo(() => {
    const samples: number[] = []
    for (const p of posts) {
      const first = (p.comments ?? [])[0]
      if (!first) continue
      const ms = new Date(first.createdAt).getTime() - new Date(p.createdAt).getTime()
      if (ms > 0) samples.push(ms / 3_600_000)
    }
    if (samples.length < 3) return null
    samples.sort((a, b) => a - b)
    return samples[Math.floor(samples.length / 2)]
  }, [posts])

  // Active-member rate over 14d.
  const activeRate = useMemo(() => {
    if (members.length === 0) return 0
    const cutoff = Date.now() - 14 * 24 * 3600 * 1000
    const active = new Set(
      posts
        .filter((p) => new Date(p.createdAt).getTime() >= cutoff)
        .map((p) => p.authorId),
    )
    return active.size / members.length
  }, [posts, members])

  return (
    <div className="space-y-4">
      {/* Headline metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Posts this week
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {weeklyPosts[weeklyPosts.length - 1]?.count ?? 0}
            </p>
            {weeklyPosts.length >= 2 && (
              <p className="text-[11px] text-muted-foreground">
                vs {weeklyPosts[weeklyPosts.length - 2]?.count ?? 0} last week
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Median reply time
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {medianReplyHours === null
                ? "—"
                : medianReplyHours < 1
                  ? `${Math.round(medianReplyHours * 60)}m`
                  : `${medianReplyHours.toFixed(1)}h`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {medianReplyHours === null
                ? "Needs more replies"
                : "Across posts that got at least one reply"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Active members (14d)
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {(activeRate * 100).toFixed(0)}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {Math.round(activeRate * members.length).toLocaleString()} of {members.length.toLocaleString()} members posted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Posts-per-week bar chart — bare-bones, no chart lib */}
      <Card>
        <CardContent className="p-4">
          <p className="text-[12.5px] font-semibold">Posts per week — last 8 weeks</p>
          <div className="mt-3 flex items-end gap-1.5 h-32">
            {weeklyPosts.map((w, i) => {
              const h = Math.max(2, (w.count / maxWeek) * 100)
              return (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {w.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-primary/60"
                    style={{ height: `${h}%` }}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top contributors */}
      {topContributors.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-[12.5px] font-semibold">Top contributors</p>
            <ul className="mt-3 space-y-1.5">
              {topContributors.map((c, i) => (
                <li
                  key={c.userId}
                  className="flex items-center gap-3 text-[12.5px]"
                >
                  <span className="w-5 text-right text-muted-foreground tabular-nums">
                    {i + 1}.
                  </span>
                  <span className="flex-1 font-semibold truncate">{c.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {c.score} {c.score === 1 ? "point" : "points"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10.5px] text-muted-foreground">
              Score: 1 per post + 0.5 per comment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CommonRoom(props: CommonRoomProps) {
  // Sprint B Communities #47 — read-state. Stamp lastPostSeenAt the
  // moment this component mounts (= the moment the user opens the
  // community). The next visit's "X new since" computes off this
  // stamp. Side-effect: also gives us a way to mark onboarding
  // steps as completed from inside actions below.
  const memberPrefs = useCommunityMemberPrefs({
    tenantSlug: props.tenantSlug,
    userId: props.currentUserId,
    communityId: props.batchId,
  })
  useEffect(() => {
    if (!props.currentUserId) return
    // Don't stamp on every render — only once per mount. The
    // empty-deps array is intentional; we also re-stamp when the
    // community id changes (rare in this UI; safe extra trigger).
    memberPrefs.markFeedSeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.batchId, props.currentUserId])

  const [body, setBody] = useState("")
  const [embedUrl, setEmbedUrl] = useState("")
  // Post type picker. Defaults to "discussion" — the catch-all. Admin
  // users default to "announcement" instead so a host's typical
  // intent (broadcast to the cohort) is one-click. Students can flip
  // to "question" or "win" — see the chooser strip in the composer
  // shell below for the affordance.
  const [postType, setPostType] = useState<BatchPostType>(
    props.isAdmin ? "announcement" : "discussion",
  )
  // Post-type filter chips for the feed. "all" is the default; the
  // four type chips below let a member slice "just questions" or
  // "just wins" without reading everything.
  const [typeFilter, setTypeFilter] = useState<BatchPostType | "all">("all")
  const [showEmbedInput, setShowEmbedInput] = useState(false)
  // Sprint A Communities #11 — feed tab state. Three tabs:
  //   "for-you" : smart-sorted (recency × engagement × pinned bonus)
  //   "latest"  : strict newest-first chronological
  //   "pinned"  : only pinned posts (when nothing pinned, tab is
  //               hidden so the strip doesn't show a dead pill)
  //
  // Sprint D bugfix — default flipped to "latest". User report:
  // "I want the posts to come in descending order". The smart sort
  // is great when there's a lot of activity but for the majority
  // of communities (small + recent) it can show a post from last
  // week above one from this morning. Latest is the predictable
  // default; for-you stays available as a one-click option for
  // power members.
  const [feedTab, setFeedTab] = useState<"for-you" | "latest" | "pinned">("latest")
  // Search query for the community feed. "/" focuses the input from
  // anywhere on the page (handled by SearchInput). Filtering happens
  // client-side because the post set is bounded and already in scope;
  // no need to round-trip to the server for a community of <500 posts.
  const [postSearch, setPostSearch] = useState("")
  // Draft auto-save banner state. Surfaces once on mount when a
  // saved draft exists for this (community, space) — gives the
  // Instructor a one-tap restore + a Discard escape hatch.
  const [draftHint, setDraftHint] = useState<ComposerDraft | null>(null)
  // Track if the user has interacted since mount; we only persist
  // after their first edit so the act of opening a space doesn't
  // wipe whatever was there with an empty save.
  const dirtyRef = useRef(false)
  // Attachments queued for the current draft post. Cleared on submit.
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [mentionOpen, setMentionOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Drag-drop overlay state. We listen at window level so the user
  // can drop a file anywhere on the community feed and have it land
  // in the composer — much more forgiving than asking them to hit
  // the small "Attach" button or drag exactly onto the composer.
  // Counter-based isDraggingOver tracks nested enter/leave events
  // accurately (dragleave fires when you move between child
  // elements, so a naive boolean would flicker).
  const [isDragging, setIsDragging] = useState(false)
  const dragCountRef = useRef(0)
  const editorRef = useRef<Editor | null>(null)
  const teachers = props.mentionables.filter((m) => m.role === "Instructor")
  const regularMembers = props.mentionables.filter((m) => m.role !== "Instructor")

  // ----- Draft persistence -----
  // On (batchId, activeSpaceId) change: reset dirty + check for a
  // stashed draft. Don't auto-restore — pop a banner so the user
  // explicitly opts in (avoids surprising re-inject after they
  // already discarded the draft mentally).
  useEffect(() => {
    dirtyRef.current = false
    setBody("")
    setEmbedUrl("")
    setDraftHint(null)
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(draftKey(props.batchId, props.activeSpaceId))
      if (!raw) return
      const parsed = JSON.parse(raw) as ComposerDraft
      // Ignore empty / whitespace-only drafts — nothing to restore.
      const hasBody = parsed.body && parsed.body.replace(/<[^>]+>/g, "").trim().length > 0
      const hasEmbed = parsed.embedUrl && parsed.embedUrl.trim().length > 0
      if (hasBody || hasEmbed) setDraftHint(parsed)
    } catch { /* malformed draft — ignore */ }
  }, [props.batchId, props.activeSpaceId])

  // Debounced write of the in-progress draft. 800ms quiet period
  // matches the portal-state mirror's cadence so we feel consistent
  // without thrashing localStorage on every keystroke.
  useEffect(() => {
    if (!dirtyRef.current) return
    if (typeof window === "undefined") return
    const handle = setTimeout(() => {
      const hasContent =
        (body && body.replace(/<[^>]+>/g, "").trim().length > 0) ||
        (embedUrl && embedUrl.trim().length > 0)
      const key = draftKey(props.batchId, props.activeSpaceId)
      try {
        if (hasContent) {
          const payload: ComposerDraft = {
            body,
            embedUrl,
            savedAt: new Date().toISOString(),
          }
          window.localStorage.setItem(key, JSON.stringify(payload))
        } else {
          window.localStorage.removeItem(key)
        }
      } catch { /* quota / private mode — best-effort */ }
    }, 800)
    return () => clearTimeout(handle)
  }, [body, embedUrl, props.batchId, props.activeSpaceId])

  const clearDraft = () => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(draftKey(props.batchId, props.activeSpaceId))
    } catch { /* ignore */ }
  }

  const restoreDraft = () => {
    if (!draftHint) return
    setBody(draftHint.body)
    setEmbedUrl(draftHint.embedUrl)
    setDraftHint(null)
    // Mark dirty so the autosave cycle starts immediately on edits.
    dirtyRef.current = true
  }

  const discardDraft = () => {
    setDraftHint(null)
    clearDraft()
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setUploading(true)
    try {
      const uploaded: Attachment[] = []
      for (const f of Array.from(list)) {
        // Skip empty files defensively (drag/drop can yield 0-byte placeholders).
        if (f.size === 0) continue
        const r = await uploadAsset(f)
        uploaded.push({
          url: r.url,
          name: f.name,
          contentType: f.type || undefined,
          sizeBytes: f.size,
        })
      }
      setPendingAttachments((prev) => [...prev, ...uploaded])
    } finally {
      setUploading(false)
    }
  }

  // Window-level drag-drop listeners. We attach once on mount and
  // bail when the current user can't post (no point dimming the
  // page for visitors who couldn't drop a file anyway). The counter
  // pattern tracks enter/leave correctly across nested elements —
  // dragleave fires when moving between children, so a naive
  // boolean would flicker the overlay constantly during normal
  // mouse movement.
  useEffect(() => {
    if (!props.currentUserId) return
    if (typeof window === "undefined") return
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files")
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragCountRef.current++
      if (dragCountRef.current === 1) setIsDragging(true)
    }
    const onOver = (e: DragEvent) => {
      // Required for the drop event to fire. Without preventDefault
      // here the browser interprets the file drop as a navigation
      // attempt (opening the file in the tab).
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      dragCountRef.current = Math.max(0, dragCountRef.current - 1)
      if (dragCountRef.current === 0) setIsDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragCountRef.current = 0
      setIsDragging(false)
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files)
      }
    }
    window.addEventListener("dragenter", onEnter)
    window.addEventListener("dragover", onOver)
    window.addEventListener("dragleave", onLeave)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragenter", onEnter)
      window.removeEventListener("dragover", onOver)
      window.removeEventListener("dragleave", onLeave)
      window.removeEventListener("drop", onDrop)
    }
    // handleFiles is stable enough — its identity changes on every
    // render but it only mutates local state, never causes the
    // listener pattern to misbehave. We deliberately don't list it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.currentUserId])

  function insertMention(m: Mentionable) {
    // Insert via Tiptap's command API so the mention lands at the current
    // caret rather than being appended after the last paragraph (which
    // would force a new line). The Link extension is already enabled, so
    // the <a> tag survives the round-trip and renders as a clickable
    // chip on the post. Open in a new tab so reading the thread isn't
    // interrupted.
    const profileHref = `/dashboard/students/${m.id}`
    const html = `<a href="${profileHref}" target="_blank" rel="noopener" class="mention" data-mention-id="${m.id}">@${m.name}</a>&nbsp;`
    const editor = editorRef.current
    if (editor) {
      editor.chain().focus().insertContent(html).run()
    } else {
      // Editor not mounted yet (rare race) — fall back to appending.
      setBody((b) => (b ? `${b}${html}` : html))
    }
    setMentionOpen(false)
  }

  const activeSpace =
    props.spaces.find((s) => s.id === props.activeSpaceId) ?? props.spaces[0]

  // Pinned-post count, scoped to the active space's posts. Drives
  // the visibility of the "Pinned" tab — no tab when nothing is
  // pinned so the strip doesn't show a dead pill.
  const pinnedCount = useMemo(
    () => (props.isAdmin ? props.posts : props.posts.filter((p) => !p.hidden)).filter((p) => p.pinned).length,
    [props.posts, props.isAdmin],
  )

  const orderedPosts = useMemo(() => {
    // 1. Visibility filter (hidden posts only visible to admins).
    const visibleBase = props.isAdmin ? props.posts : props.posts.filter((p) => !p.hidden)
    // 1b. Post-type filter (C2). Legacy posts without a `type` field
    // fall into the "discussion" bucket.
    const visible = typeFilter === "all"
      ? visibleBase
      : visibleBase.filter((p) => (p.type ?? "discussion") === typeFilter)
    // 2. Search filter BEFORE any sort so pinned posts that don't
    // match the query don't artificially float to the top and bury
    // the actual hits. Case-insensitive substring across body,
    // author, embed, attachments, comments.
    const q = postSearch.trim().toLowerCase()
    const matchPost = (p: typeof visible[number]): boolean => {
      if (!q) return true
      const author = props.getUserById(p.authorId)?.name ?? ""
      const bodyText = (p.body ?? "").replace(/<[^>]+>/g, " ")
      const haystacks: string[] = [
        bodyText,
        author,
        p.embedUrl ?? "",
        ...(p.attachments ?? []).map((a) => a.name ?? ""),
      ]
      for (const c of p.comments ?? []) {
        haystacks.push(c.body ?? "")
        const cauthor = props.getUserById(c.authorId)?.name
        if (cauthor) haystacks.push(cauthor)
      }
      return haystacks.some((h) => h.toLowerCase().includes(q))
    }
    const filtered = visible.filter(matchPost)

    // Sprint A Communities #11 — per-tab ordering.
    if (feedTab === "pinned") {
      return filtered
        .filter((p) => p.pinned)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    if (feedTab === "latest") {
      // Strict chronological. We still float pinned to the top of
      // their own dates — without that, pinning becomes meaningless
      // in the "Latest" view. Compromise: pinned-then-chrono inside
      // each segment, same as the old behaviour.
      const pinned = filtered.filter((p) => p.pinned)
      const rest = filtered.filter((p) => !p.pinned)
      return [
        ...pinned.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
        ...rest.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      ]
    }

    // "for-you" — smart sort. Score formula:
    //   recencyScore: 1 / (1 + hours_since_post / 24)  // half-weight per day
    //   engagementBoost: 1 + (totalReactions * 0.1) + (commentCount * 0.15)
    //   pinnedBoost: pinned ? 2.5 : 1
    //   recentlyActiveBoost: 1 + (lastCommentHours < 24 ? 0.5 : 0)
    //
    // Multiplicative so a heavily-discussed week-old post can still
    // outrank a fresh post with no engagement (which is what makes
    // "For you" different from "Latest"). All multipliers are bounded
    // so a single ultra-popular post can't permanently dominate.
    const now = Date.now()
    const score = (p: typeof visible[number]): number => {
      const ageHours = Math.max(0.5, (now - new Date(p.createdAt).getTime()) / 3_600_000)
      const recency = 1 / (1 + ageHours / 24)
      const reactionCount = Object.values(p.reactions ?? {})
        .reduce((sum, ids) => sum + ids.length, 0)
      const commentCount = (p.comments ?? []).length
      const engagement = 1 + reactionCount * 0.1 + commentCount * 0.15
      const pinnedBoost = p.pinned ? 2.5 : 1
      const lastComment = p.comments?.[p.comments.length - 1]
      const lastCommentHours = lastComment
        ? (now - new Date(lastComment.createdAt).getTime()) / 3_600_000
        : Infinity
      const activeBoost = lastCommentHours < 24 ? 1.5 : 1
      return recency * engagement * pinnedBoost * activeBoost
    }
    return [...filtered].sort((a, b) => score(b) - score(a))
  }, [props.posts, props.isAdmin, props.getUserById, postSearch, feedTab, typeFilter])

  function submit() {
    // Allow posts with only attachments — the body can be empty if the user
    // is sharing a file/video with no commentary.
    if (isRichTextEmpty(body) && pendingAttachments.length === 0) return
    props.onAdd(
      body,
      embedUrl.trim() || undefined,
      pendingAttachments.length > 0 ? pendingAttachments : undefined,
      postType,
    )
    setBody("")
    setEmbedUrl("")
    setShowEmbedInput(false)
    setPendingAttachments([])
    // Reset type to the role-aware default so the next post starts
    // from a sensible baseline. Admins typically broadcast → return
    // to "announcement"; students typically chat → "discussion".
    setPostType(props.isAdmin ? "announcement" : "discussion")
    // Draft is now redundant — purge it so reopening this space
    // doesn't offer to "restore" the post that just shipped.
    dirtyRef.current = false
    clearDraft()
    setDraftHint(null)
    // Sprint B Communities #4 — first-post tick on the onboarding
    // checklist. Idempotent (the hook no-ops on re-marks).
    memberPrefs.markOnboardingDone("intro")
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-start">
      {/* Drag-drop overlay. Pinned full-viewport with a dashed
          inner border so it reads as a clear "drop target." Click-
          through disabled via pointer-events-none on the children
          so the overlay container catches the drop while children
          don't block tile interaction during normal use. */}
      {isDragging && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm"
          aria-hidden
        >
          <div className="pointer-events-none flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-card/95 px-12 py-8 shadow-2xl">
            <Paperclip className="h-8 w-8 text-primary" />
            <p className="text-lg font-semibold text-foreground">
              Drop to attach
            </p>
            <p className="text-xs text-muted-foreground">
              Images, video, PDFs, audio — anything works
            </p>
          </div>
        </div>
      )}
      {/* Spaces rail */}
      <SpacesRail
        spaces={props.spaces}
        activeSpaceId={props.activeSpaceId}
        onSpaceChange={props.onSpaceChange}
        onSpacesEdit={props.onSpacesEdit}
        isAdmin={props.isAdmin}
      />

      {/* Active space feed */}
      <div className="space-y-4">
        {/* Instructors + moderators card. Always rendered so members can see at
            a glance who's in charge of the batch. */}
        {teachers.length > 0 && (
          <Card data-tour="batch-teachers" className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Shield className="h-3.5 w-3.5" />
                Instructors
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {teachers.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background px-2 py-0.5 text-xs"
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {initials(t.name)}
                    </span>
                    <span className="truncate font-medium">{t.name}</span>
                  </span>
                ))}
              </div>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {regularMembers.length} {regularMembers.length === 1 ? "member" : "members"} in this batch
              </span>
            </CardContent>
          </Card>
        )}

        {/* Sprint C Communities #23 — admin bulk-moderation panel.
            Most-common bulk needs surfaced as one-tap actions
            instead of forcing per-post checkbox selection (which
            would require a big PostCard refactor). Each action
            confirms before firing because they're destructive. */}
        {props.isAdmin && (
          <AdminBulkModPanel
            posts={props.posts}
            getUserById={props.getUserById}
            onHideMany={async (ids) => {
              for (const id of ids) {
                props.onToggleHide(id, true)
              }
            }}
            onUnpinAll={async (ids) => {
              for (const id of ids) {
                props.onTogglePin(id)
              }
            }}
          />
        )}

        {/* Sprint B Communities #17 — community health widget.
            Admin-only; hides itself when health ≥ 70 so healthy
            communities don't see the strip. Routes its action
            buttons into the local composer / invite affordances. */}
        {props.isAdmin && (
          <CommunityHealthWidget
            posts={props.posts}
            members={props.mentionables.map((m) => ({ id: m.id, role: m.role === "Instructor" ? "instructor" : "student" }))}
            onPostPrompt={() => {
              const el = document.querySelector<HTMLTextAreaElement>(
                "[data-tour='community-composer']",
              )
              el?.scrollIntoView({ behavior: "smooth", block: "center" })
              el?.focus()
            }}
            onInvitePrompt={() => {
              const el = document.querySelector<HTMLElement>("[data-tour='invite-link']")
              el?.scrollIntoView({ behavior: "smooth", block: "center" })
            }}
          />
        )}

        {/* Sprint B Communities #4 / #16 / #47 — member toolkit.
            Onboarding checklist + notification preset + read-state
            badge in a single strip. Self-hides when the checklist
            is done/dismissed and shows minimal "all caught up" copy
            otherwise. We pass post createdAts so unread counts are
            scoped to the active space. */}
        {props.currentUserId && (
          <CommunityMemberToolkit
            tenantSlug={props.tenantSlug}
            userId={props.currentUserId}
            communityId={props.batchId}
            postCreatedAts={props.posts.map((p) => p.createdAt)}
            onStepAction={(step) => {
              // Light-touch routing: most steps have no global UI to
              // jump to (post composer is right below). We rely on
              // the member tapping the checkmark to ack — except
              // "invite" which has its own affordance further up the
              // page.
              if (step === "invite") {
                const el = document.querySelector<HTMLElement>("[data-tour='invite-link']")
                el?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            }}
          />
        )}

        {/* Active space header */}
        {activeSpace && (
          <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0">
              <h3 className="inline-flex items-center gap-1.5 font-serif text-lg font-bold leading-tight">
                <span>{activeSpace.emoji ?? "💬"}</span>
                {activeSpace.name}
              </h3>
              {activeSpace.description && (
                <p className="text-xs text-muted-foreground">
                  {activeSpace.description}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {postSearch.trim()
                ? `${orderedPosts.length} match${orderedPosts.length === 1 ? "" : "es"}`
                : `${orderedPosts.length} post${orderedPosts.length === 1 ? "" : "s"}`}
            </Badge>
          </div>
        )}

        {/* Search across this space's posts. "/" focuses the input
            from anywhere on the page (handled by SearchInput). Hides
            when there are no posts at all — searching an empty feed
            adds noise without value. */}
        {orderedPosts.length > 0 || postSearch.trim() ? (
          <SearchInput
            pageId={`community-${props.batchId}-${props.activeSpaceId}`}
            value={postSearch}
            onChange={setPostSearch}
            placeholder={`Search posts in ${activeSpace?.name ?? "this space"}…`}
            ariaLabel="Search community posts"
            shortcutDescription="Focus community search"
          />
        ) : null}

        {/* Sprint A Communities #11 — feed tabs. Pill strip sits
            between search and the post list. "For you" = smart sort
            (recency × engagement × pinned). "Latest" = pure chrono.
            "Pinned" renders only when at least one post is pinned.
            Hidden entirely when the feed has zero posts (otherwise
            the strip looks like dead navigation). */}
        {props.posts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Feed sort"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-0.5 text-[12px] font-semibold"
            >
              {(
                [
                  { id: "for-you" as const, label: "For you", hint: "Smart sort by recency + engagement" },
                  { id: "latest" as const, label: "Latest", hint: "Newest first, pinned floated" },
                  ...(pinnedCount > 0
                    ? [{ id: "pinned" as const, label: `Pinned · ${pinnedCount}`, hint: "Only pinned posts" }]
                    : []),
                ]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={feedTab === tab.id}
                  title={tab.hint}
                  onClick={() => setFeedTab(tab.id)}
                  className={cn(
                    "rounded-full px-3 py-1 transition-colors",
                    feedTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Post-type filter chips (C2). Stacks horizontally with
                the sort tabs. Each chip shows a live count of posts
                matching its type so a student knows whether to dig in
                before clicking. "All" reverts. */}
            {(() => {
              const visibleBase = props.isAdmin
                ? props.posts
                : props.posts.filter((p) => !p.hidden)
              const countOf = (t: BatchPostType | "all") =>
                t === "all"
                  ? visibleBase.length
                  : visibleBase.filter((p) => (p.type ?? "discussion") === t).length
              const types: Array<{ id: BatchPostType | "all"; emoji: string; label: string }> = [
                { id: "all",          emoji: "•",  label: "All" },
                { id: "announcement", emoji: "📣", label: "Announcements" },
                { id: "question",     emoji: "❓", label: "Questions" },
                { id: "win",          emoji: "🎉", label: "Wins" },
                { id: "discussion",   emoji: "💬", label: "Chat" },
              ]
              return (
                <div className="inline-flex items-center gap-1.5">
                  {types.map((t) => {
                    const count = countOf(t.id)
                    if (t.id !== "all" && count === 0) return null
                    const active = typeFilter === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTypeFilter(t.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                        aria-pressed={active}
                      >
                        <span aria-hidden>{t.emoji}</span>
                        {t.label}
                        <span className={`tabular-nums ${active ? "opacity-80" : "text-muted-foreground/70"}`}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* Composer */}
        <Card data-tour="batch-composer">
          <CardContent className="space-y-3 p-4">
            {draftHint && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  You have an unfinished post in this space — restore it?
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={restoreDraft}
                  >
                    Restore draft
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-muted-foreground"
                    onClick={discardDraft}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}
            {/* Post-type chooser (C2). Four 1-tap pills above the
                composer so the author commits to an intent before
                writing — same pattern Notion uses for "page type."
                Admin posts default to Announcement; everyone else
                to Discussion. Wins auto-cross-post to the Wall of
                Love when submitted (see parent handler). */}
            {props.currentUserId && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Post as
                </span>
                {(
                  [
                    { id: "announcement", emoji: "📣", label: "Announcement", hint: "Pinned to top, fans out" },
                    { id: "question",     emoji: "❓", label: "Question",    hint: "Mark answered when resolved" },
                    { id: "win",          emoji: "🎉", label: "Win",         hint: "Cross-posts to the Wall of Love" },
                    { id: "discussion",   emoji: "💬", label: "Chat",        hint: "Just sharing a thought" },
                  ] as Array<{ id: BatchPostType; emoji: string; label: string; hint: string }>
                )
                  // Admin-only filter: only admins/instructors can post announcements
                  .filter((opt) => opt.id !== "announcement" || props.isAdmin)
                  .map((opt) => {
                    const active = postType === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPostType(opt.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                        title={opt.hint}
                        aria-pressed={active}
                      >
                        <span aria-hidden>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    )
                  })}
              </div>
            )}
            <RichTextEditor
              value={body}
              onChange={(v) => {
                dirtyRef.current = true
                setBody(v)
              }}
              // Sprint C Communities #25 — per-channel composer
              // hint. The placeholder shifts to match the channel
              // norm (Announcements expects Instructor-only; Q&A
              // expects a specific question, etc). Falls back to
              // the generic prompt for community-defined custom
              // spaces (admins who renamed the defaults).
              placeholder={
                props.currentUserId
                  ? composerHintForSpace(activeSpace?.id, activeSpace?.name)
                  : "Sign in to post in the Common Room"
              }
              minHeight={120}
              disabled={!props.currentUserId}
              onReady={(ed) => {
                editorRef.current = ed
              }}
            />
            {showEmbedInput && (
              <Input
                value={embedUrl}
                onChange={(e) => {
                  dirtyRef.current = true
                  setEmbedUrl(e.target.value)
                }}
                placeholder="https://www.youtube.com/watch?v=… or vimeo.com/…"
                className="text-sm"
              />
            )}
            {/* Pending attachments preview row. Each chip can be removed
                before posting. Images get an inline thumbnail so the user
                sees what they actually picked. */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map((att, i) => {
                  const isImage = (att.contentType ?? "").startsWith("image/") ||
                    /\.(png|jpe?g|gif|webp|avif)$/i.test(att.name)
                  return (
                    <div
                      key={i}
                      className="group relative flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs"
                    >
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={att.url}
                          alt={att.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="max-w-[160px] truncate">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                        aria-label="Remove attachment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files)
                if (e.target) e.target.value = ""
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!props.currentUserId || uploading}
                  title="Attach files (images, video, PDF, anything)"
                  data-tour="batch-attach"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : "Attach"}
                </Button>
                <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      disabled={!props.currentUserId || props.mentionables.length === 0}
                      title="Tag someone in this batch"
                      data-tour="batch-tag"
                    >
                      <AtSign className="h-3.5 w-3.5" />
                      Tag
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-0">
                    <div className="max-h-72 overflow-y-auto p-1">
                      {teachers.length > 0 && (
                        <>
                          <p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Instructors
                          </p>
                          {teachers.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => insertMention(t)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                            >
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {initials(t.name)}
                              </span>
                              <span className="truncate font-medium">{t.name}</span>
                            </button>
                          ))}
                        </>
                      )}
                      {regularMembers.length > 0 && (
                        <>
                          <p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Members
                          </p>
                          {regularMembers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => insertMention(m)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                            >
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[10px] font-bold">
                                {initials(m.name)}
                              </span>
                              <span className="truncate">{m.name}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={() => setShowEmbedInput((v) => !v)}
                  disabled={!props.currentUserId}
                >
                  <Video className="h-3.5 w-3.5" />
                  {showEmbedInput ? "Hide video URL" : "Paste video URL"}
                </Button>
                {/* Slash-command popover (C7) — discoverable command
                    palette for inserting headings, lists, code,
                    dividers, links, images, and mention cues without
                    leaving the keyboard. Operates on the editor ref
                    the composer already holds. */}
                <SlashCommandPopover editor={editorRef.current} />
              </div>
              <Button
                size="sm"
                onClick={submit}
                disabled={(isRichTextEmpty(body) && pendingAttachments.length === 0) || !props.currentUserId}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {orderedPosts.length === 0 ? (
          postSearch.trim() ? (
          // Search-empty branch — same card style, different copy.
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">
                  No matches for &ldquo;{postSearch.trim()}&rdquo;
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Try a different word, or clear the search to see every post.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 text-xs"
                  onClick={() => setPostSearch("")}
                >
                  Clear search
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Genuinely empty space → starter prompts. Each card drops
            // a pre-filled draft into the composer so the user starts
            // from a thought, not a blinking cursor. Prompts adapt
            // when a course is linked so the suggestions feel local
            // to the cohort.
            <Card>
              <CardContent className="space-y-4 py-8">
                <div className="text-center">
                  <span className="text-3xl" aria-hidden>
                    👋
                  </span>
                  <p className="mt-2 text-sm font-semibold">
                    {activeSpace?.name ?? "This space"} is quiet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick a prompt to kick things off — you can edit it before posting.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {getStarterPrompts(props.courseTitle).map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        // Pre-fill the composer and mark the draft as
                        // dirty so autosave persists it if the user
                        // navigates away mid-edit.
                        setBody(p.draft)
                        dirtyRef.current = true
                        // Best-effort focus the editor so the user can
                        // start typing immediately. Tiptap exposes
                        // .focus() on its chain API.
                        setTimeout(() => editorRef.current?.commands.focus("end"), 50)
                      }}
                      className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="text-lg" aria-hidden>
                        {p.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-tight">{p.label}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {p.hint}
                        </p>
                      </div>
                    </button>
                  ))}
                  </div>
                </CardContent>
              </Card>
            )
        ) : (
          <div className="space-y-3">
            {orderedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isAdmin={props.isAdmin}
                currentUserId={props.currentUserId}
                getUserById={props.getUserById}
                onAddComment={(b) => props.onAddComment(post.id, b)}
                onEditPost={(nextBody) => props.onEditPost(post.id, nextBody)}
                onTogglePin={() => props.onTogglePin(post.id)}
                onToggleFeatured={() => props.onToggleFeatured(post.id)}
                onToggleHide={() => props.onToggleHide(post.id, !post.hidden)}
                onDelete={() => props.onDeletePost(post.id)}
                onToggleReaction={(emoji) => {
                  // Sprint B Communities #4 — count a reaction as
                  // the "react" onboarding step. We tick on every
                  // call; the hook is idempotent.
                  memberPrefs.markOnboardingDone("react")
                  props.onToggleReaction(post.id, emoji)
                }}
                onToggleCommentHidden={(cid, hidden) =>
                  props.onToggleCommentHidden(post.id, cid, hidden)
                }
                onMarkAnswered={
                  props.onMarkAnswered
                    ? (commentId) => props.onMarkAnswered?.(post.id, commentId)
                    : undefined
                }
                onReopenQuestion={
                  props.onReopenQuestion
                    ? () => props.onReopenQuestion?.(post.id)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Spaces rail — left column with the list of Spaces, click to
// switch. Admins get an "Add space" affordance + per-row rename /
// delete via a small inline editor.
// ---------------------------------------------------------------
function SpacesRail({
  spaces,
  activeSpaceId,
  onSpaceChange,
  onSpacesEdit,
  isAdmin,
}: {
  spaces: BatchSpace[]
  activeSpaceId: string
  onSpaceChange: (id: string) => void
  onSpacesEdit: (next: BatchSpace[]) => void
  isAdmin: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmoji, setNewEmoji] = useState("✨")
  const confirm = useConfirm()

  function add() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const id = `space-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${Math.random().toString(36).slice(2, 5)}`
    onSpacesEdit([
      ...spaces,
      {
        id,
        name: trimmed,
        emoji: newEmoji,
        description: undefined,
        layout: "feed",
        order: spaces.length,
      },
    ])
    setAdding(false)
    setNewName("")
    setNewEmoji("✨")
    onSpaceChange(id)
  }

  async function remove(id: string) {
    // Don't let an admin delete the very last space — they need at
    // least one for the feed to render.
    if (spaces.length <= 1) return
    const target = spaces.find((s) => s.id === id)
    const ok = await confirm({
      title: `Delete the "${target?.name ?? "space"}" space?`,
      description:
        "Posts inside this space stay in the database but won't be visible anywhere. This can't be undone from the UI.",
      destructive: true,
      confirmLabel: "Delete space",
    })
    if (!ok) return
    const next = spaces
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i }))
    onSpacesEdit(next)
    if (activeSpaceId === id && next.length > 0) {
      onSpaceChange(next[0].id)
    }
  }

  return (
    <div className="space-y-1">
      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Spaces
      </p>
      <ul className="space-y-0.5">
        {spaces.map((s) => {
          const active = s.id === activeSpaceId
          return (
            <li key={s.id} className="group relative">
              <button
                type="button"
                onClick={() => onSpaceChange(s.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/70 hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <span className="text-base leading-none">{s.emoji ?? "💬"}</span>
                <span className="flex-1 truncate">{s.name}</span>
                {s.layout === "forum" && (
                  <Badge variant="outline" className="text-[9px]">
                    Forum
                  </Badge>
                )}
              </button>
              {/* Admin-only delete chip on hover. Lives outside the
                  button so clicking it doesn't also switch spaces. */}
              {isAdmin && spaces.length > 1 && (
                <button
                  type="button"
                  onClick={() => void remove(s.id)}
                  title={`Remove ${s.name}`}
                  className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {isAdmin && (
        <div className="pt-1">
          {adding ? (
            <div className="space-y-2 rounded-md border border-border bg-card p-2">
              <div className="flex gap-1.5">
                <Input
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value.slice(0, 2))}
                  className="h-7 w-12 px-2 text-center text-sm"
                  maxLength={2}
                />
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Space name"
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") add()
                    if (e.key === "Escape") setAdding(false)
                  }}
                />
              </div>
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-xs"
                  onClick={add}
                  disabled={!newName.trim()}
                >
                  Add
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Defaults are General, Q&amp;A, Wins —{" "}
                {DEFAULT_BATCH_SPACES.length} pre-shipped.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add space
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Inline preview for a single uploaded attachment. Type-aware:
//   - images  → <img> thumbnail (click → open original in new tab)
//   - videos  → <video controls> with the file directly
//   - audio   → <audio controls>
//   - pdfs    → embedded preview via the browser's pdf renderer
//   - other   → download chip with size + filename
function AttachmentTile({ attachment }: { attachment: Attachment }) {
  const { url, name, contentType, sizeBytes } = attachment
  const isImage = (contentType ?? "").startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(name)
  const isVideo = (contentType ?? "").startsWith("video/") ||
    /\.(mp4|webm|ogv|mov)$/i.test(name)
  const isAudio = (contentType ?? "").startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a)$/i.test(name)
  const isPdf = contentType === "application/pdf" || /\.pdf$/i.test(name)
  const sizeLabel = sizeBytes
    ? sizeBytes > 1024 * 1024
      ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
    : null

  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-md border border-border bg-muted/20"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="aspect-video w-full object-cover" />
      </a>
    )
  }
  if (isVideo) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-black">
        <video src={url} controls preload="metadata" className="aspect-video w-full" />
      </div>
    )
  }
  if (isAudio) {
    return (
      <div className="rounded-md border border-border bg-muted/20 p-2">
        <p className="mb-1 truncate text-xs font-medium">{name}</p>
        <audio src={url} controls className="w-full" />
      </div>
    )
  }
  if (isPdf) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-muted/20">
        <iframe src={url} title={name} className="aspect-[4/3] w-full" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-t border-border bg-card px-3 py-1.5 text-xs hover:underline"
        >
          <FileText className="mr-1.5 inline h-3.5 w-3.5" />
          {name}
          {sizeLabel && <span className="ml-2 text-muted-foreground">· {sizeLabel}</span>}
        </a>
      </div>
    )
  }
  // Fallback: download chip.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md border border-border bg-muted/20 p-2 text-xs hover:bg-muted/40"
    >
      <Download className="h-4 w-4 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      {sizeLabel && <span className="shrink-0 text-muted-foreground">{sizeLabel}</span>}
    </a>
  )
}

// Recognise a YouTube / Vimeo / direct video URL and return the
// embed iframe src + provider. Caller renders the iframe; we just
// do the parsing here so PostCard stays small.
function detectEmbed(
  url: string,
): { kind: "iframe" | "video"; src: string } | { kind: "internal-card"; src: string; label: string; icon: "whiteboard" | "page" | "course" | "certificate" } | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    // YouTube long / short / shorts urls
    const yt = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i,
    )
    if (yt) {
      return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` }
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0]
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` }
    }
    if (/\.(mp4|webm|ogv)(\?|$)/i.test(u.pathname)) {
      return { kind: "video", src: trimmed }
    }
    // Internal platform URLs — render as a richer link card with the
    // appropriate icon + label so a "I shared a whiteboard" post
    // doesn't show up as a raw URL string.
    const path = u.pathname
    if (/\/dashboard\/whiteboards\/[^/]+/.test(path) || /\/whiteboards\/[^/]+/.test(path)) {
      return { kind: "internal-card", src: trimmed, label: "Whiteboard", icon: "whiteboard" }
    }
    if (/\/dashboard\/portal\/pages\//.test(path) || /\/p\/[^/]+\/[^/]+/.test(path)) {
      return { kind: "internal-card", src: trimmed, label: "Portal page", icon: "page" }
    }
    if (/\/dashboard\/courses\/[^/]+/.test(path) || /\/courses\/[^/]+/.test(path)) {
      return { kind: "internal-card", src: trimmed, label: "Course", icon: "course" }
    }
    if (/\/verify\//.test(path)) {
      return { kind: "internal-card", src: trimmed, label: "Certificate", icon: "certificate" }
    }
  } catch {
    /* invalid URL */
  }
  return null
}

function PostCard({
  post,
  isAdmin,
  currentUserId,
  getUserById,
  onAddComment,
  onEditPost,
  onTogglePin,
  onToggleFeatured,
  onToggleHide,
  onDelete,
  onToggleReaction,
  onToggleCommentHidden,
  onMarkAnswered,
  onReopenQuestion,
}: {
  post: CommonRoomProps["posts"][number]
  isAdmin: boolean
  currentUserId?: string
  getUserById: CommonRoomProps["getUserById"]
  onAddComment: (body: string) => void
  /** Save an edit to this post's body. */
  onEditPost: (nextBody: string) => void
  onTogglePin: () => void
  onToggleFeatured: () => void
  onToggleHide: () => void
  onDelete: () => void
  onToggleReaction: (emoji: string) => void
  onToggleCommentHidden: (commentId: string, hidden: boolean) => void
  /** When the post is a "question" type, optionally let the viewer
   *  mark it answered. commentId optional — when set, credits the
   *  resolver for future helpfulness scoring. */
  onMarkAnswered?: (commentId?: string) => void
  onReopenQuestion?: () => void
}) {
  const author = getUserById(post.authorId)
  const [commentBody, setCommentBody] = useState("")
  const [showComments, setShowComments] = useState(true)
  // Edit mode for the post body. Author or admin can flip into edit
  // and save back via onEditPost. We keep a separate draft so the user
  // can Cancel without losing the original.
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(post.body)

  const isAuthor = !!currentUserId && currentUserId === post.authorId
  const canEdit = isAuthor || isAdmin
  // Menu is now also useful for non-admin members (mute/save) so we
  // always show it when there's a signed-in user.
  const canShowMenu = !!currentUserId
  // Per-user mute + bookmark state. Hydrate on mount and keep in
  // local state so subsequent toggles render immediately.
  const [muted, setMuted] = useState<boolean>(false)
  const [bookmarked, setBookmarked] = useState<boolean>(false)
  useEffect(() => {
    if (!currentUserId) return
    setMuted(getMutedThreadIds(currentUserId).has(post.id))
    setBookmarked(isPostBookmarked(currentUserId, post.id))
  }, [currentUserId, post.id])
  const toggleMute = () => {
    if (!currentUserId) return
    const next = !muted
    setMuted(next)
    setThreadMuted(currentUserId, post.id, next)
  }
  const toggleBookmark = () => {
    if (!currentUserId) return
    const next = !bookmarked
    setBookmarked(next)
    setPostBookmarked(currentUserId, post.id, next)
  }

  function postComment() {
    const trimmed = commentBody.trim()
    if (!trimmed) return
    onAddComment(trimmed)
    setCommentBody("")
  }

  function startEdit() {
    setEditDraft(post.body)
    setIsEditing(true)
  }
  function saveEdit() {
    if (isRichTextEmpty(editDraft)) return
    onEditPost(editDraft)
    setIsEditing(false)
  }
  function cancelEdit() {
    setEditDraft(post.body)
    setIsEditing(false)
  }

  const visibleComments = isAdmin
    ? post.comments
    : post.comments.filter((c) => !c.hidden)

  // Rich-text bodies stored as HTML get rendered via RichTextContent.
  // Older plain-text bodies (from before we shipped rich-text) get
  // rendered as a whitespace-preserving paragraph so they still look
  // right after the upgrade.
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(post.body)
  const embed = post.embedUrl ? detectEmbed(post.embedUrl) : null

  return (
    <Card
      className={cn(
        post.pinned && "border-primary/40",
        post.featured && "border-accent/50 bg-accent/[0.03] shadow-[0_0_0_1px_var(--accent)]/10",
        post.hidden && "opacity-60",
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {author?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatar} alt={author.name} className="h-full w-full object-cover" />
            ) : (
              initials(author?.name ?? "?")
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-semibold">{author?.name ?? "Unknown"}</p>
              <span className="text-[11px] text-muted-foreground">
                · {timeAgo(post.createdAt)}
              </span>
              {post.pinned && (
                <Badge
                  variant="outline"
                  className="border-primary/40 bg-primary/10 text-[10px] text-primary"
                >
                  <Pin className="mr-0.5 h-2.5 w-2.5" />
                  Pinned
                </Badge>
              )}
              {post.featured && (
                <Badge
                  variant="outline"
                  className="border-accent/50 bg-accent/15 text-[10px] text-accent"
                >
                  <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                  Featured
                </Badge>
              )}
              {post.hidden && (
                <Badge variant="outline" className="text-[10px]">
                  Hidden
                </Badge>
              )}
              {muted && (
                <Badge
                  variant="outline"
                  className="border-muted-foreground/40 bg-muted/40 text-[10px] text-muted-foreground"
                  title="You won't be notified about new comments on this post"
                >
                  <BellOff className="mr-0.5 h-2.5 w-2.5" />
                  Muted
                </Badge>
              )}
              {bookmarked && (
                <Badge
                  variant="outline"
                  className="border-amber-500/50 bg-amber-500/15 text-[10px] text-amber-700 dark:text-amber-300"
                  title="Saved to your bookmarks"
                >
                  <BookmarkCheck className="mr-0.5 h-2.5 w-2.5" />
                  Saved
                </Badge>
              )}
              {/* Post-type chip (C2). Subtle visual marker so a reader
                  scanning the feed sees "this is a question" / "this
                  is a win" without reading the body. Discussion posts
                  (the default) get no chip — too noisy. */}
              {post.type === "announcement" && (
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] text-primary">
                  📣 Announcement
                </Badge>
              )}
              {post.type === "question" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    post.answeredAt
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-700",
                  )}
                >
                  {post.answeredAt ? "✓ Answered" : "❓ Question"}
                </Badge>
              )}
              {post.type === "win" && (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700">
                  🎉 Win
                </Badge>
              )}
            </div>
            {/* Body — rich text when it looks like HTML, otherwise
                fall back to a plain preserving paragraph. Author/admin
                can flip into an inline editor with Save/Cancel. */}
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <RichTextEditor
                  value={editDraft}
                  onChange={setEditDraft}
                  placeholder="Update your post…"
                  minHeight={100}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={isRichTextEmpty(editDraft)}>
                    Save
                  </Button>
                </div>
              </div>
            ) : looksLikeHtml ? (
              <RichTextContent html={post.body} className="mt-1.5 text-sm" />
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">
                {post.body}
              </p>
            )}
            {/* Subtle "edited" footnote when updatedAt > createdAt by more
                than a few seconds — tells readers the post was changed. */}
            {!isEditing &&
              new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 5000 && (
                <p className="mt-1 text-[10px] text-muted-foreground">edited · {timeAgo(post.updatedAt)}</p>
              )}
            {/* Optional video embed. iframe for YouTube/Vimeo,
                native <video> for direct mp4/webm. Internal platform
                links (whiteboard, page, course, certificate) render
                as a labeled link card instead of a raw URL string. */}
            {embed && embed.kind === "internal-card" ? (
              <a
                href={embed.src}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-primary/40 hover:bg-muted/30"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary",
                    embed.icon === "whiteboard" && "bg-violet-500/10 text-violet-600",
                    embed.icon === "page" && "bg-blue-500/10 text-blue-600",
                    embed.icon === "course" && "bg-emerald-500/10 text-emerald-600",
                    embed.icon === "certificate" && "bg-amber-500/10 text-amber-600",
                  )}
                  aria-hidden
                >
                  {embed.icon === "whiteboard" && <PenSquare className="h-5 w-5" />}
                  {embed.icon === "page" && <FileText className="h-5 w-5" />}
                  {embed.icon === "course" && <BookOpen className="h-5 w-5" />}
                  {embed.icon === "certificate" && <Award className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {embed.label}
                  </p>
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    Open {embed.label.toLowerCase()} →
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{embed.src}</p>
                </div>
              </a>
            ) : embed ? (
              <div className="mt-3 overflow-hidden rounded-md border border-border bg-black">
                {embed.kind === "iframe" ? (
                  <iframe
                    src={embed.src}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  ) : embed.kind === "video" ? (
                  <video
                    src={embed.src}
                    controls
                    className="aspect-video w-full"
                  />
                  ) : null}
              </div>
            ) : null}
            {/* Uploaded attachments. Each rendered with a type-aware
                preview: images inline, videos with a player, everything
                else as a download chip. */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {post.attachments.map((att, i) => (
                  <AttachmentTile key={i} attachment={att} />
                ))}
              </div>
            )}
          </div>
          {canShowMenu && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Per-user actions — available to every signed-in
                    reader (not just author or admin). Sit at the top
                    so muting/saving feels like a primary affordance,
                    not buried beneath admin moderation tools. */}
                <DropdownMenuItem onClick={toggleBookmark}>
                  {bookmarked ? (
                    <>
                      <BookmarkCheck className="mr-2 h-3.5 w-3.5" />
                      Remove from saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="mr-2 h-3.5 w-3.5" />
                      Save post
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleMute}>
                  {muted ? (
                    <>
                      <Bell className="mr-2 h-3.5 w-3.5" />
                      Unmute thread
                    </>
                  ) : (
                    <>
                      <BellOff className="mr-2 h-3.5 w-3.5" />
                      Mute thread
                    </>
                  )}
                </DropdownMenuItem>
                {(canEdit || isAdmin) && <DropdownMenuSeparator />}
                {canEdit && (
                  <DropdownMenuItem onClick={startEdit}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit post
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={onTogglePin}>
                      {post.pinned ? (
                        <>
                          <PinOff className="mr-2 h-3.5 w-3.5" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="mr-2 h-3.5 w-3.5" />
                          Pin to top
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onToggleFeatured}>
                      {post.featured ? (
                        <>
                          <StarOff className="mr-2 h-3.5 w-3.5" />
                          Unfeature
                        </>
                      ) : (
                        <>
                          <Star className="mr-2 h-3.5 w-3.5" />
                          Feature post
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onToggleHide}>
                      {post.hidden ? (
                        <>
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          Show post
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-2 h-3.5 w-3.5" />
                          Hide post
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Reaction strip */}
        <div className="flex flex-wrap items-center gap-1.5 pl-12">
          {ROOM_REACTIONS.map((emoji) => {
            const owners = post.reactions?.[emoji] ?? []
            const count = owners.length
            const mine = currentUserId ? owners.includes(currentUserId) : false
            // Hide an empty emoji for non-pickers so the strip doesn't
            // look like a sea of zero counts; we still surface them on
            // hover via the picker further down.
            if (count === 0) return null
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction(emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  mine
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-background hover:bg-muted/40",
                )}
              >
                <span>{emoji}</span>
                <span className="tabular-nums">{count}</span>
              </button>
            )
          })}
          <ReactionPicker
            onPick={onToggleReaction}
            disabled={!currentUserId}
          />
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="h-3 w-3" />
            {post.comments.length} comment{post.comments.length === 1 ? "" : "s"}
          </button>
          {/* Mark-as-answered affordance for question-type posts.
              Anyone signed in can mark (Stack Overflow pattern) so
              the OP can self-resolve and any commenter can wrap up.
              When already answered, the same chip flips to "Reopen"
              (admin/author only — keeps drive-by reopens out). */}
          {post.type === "question" && currentUserId && onMarkAnswered && !post.answeredAt && (
            <button
              type="button"
              onClick={() => onMarkAnswered()}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/[0.05] px-2 py-0.5 text-[11px] font-semibold text-success transition-colors hover:bg-success/15"
              title="Mark this question as answered"
            >
              ✓ Mark as answered
            </button>
          )}
          {post.type === "question" && post.answeredAt && (isAuthor || isAdmin) && onReopenQuestion && (
            <button
              type="button"
              onClick={() => onReopenQuestion()}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-amber-500/40 hover:text-amber-700"
              title="Re-open this question"
            >
              ↺ Re-open
            </button>
          )}
        </div>

        {/* Comments */}
        {showComments && (
          <div className="space-y-3 border-t border-border/60 pt-3 pl-12">
            {visibleComments.length > 0 && (
              <ul className="space-y-2">
                {visibleComments.map((c) => {
                  const cAuthor = getUserById(c.authorId)
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "flex items-start gap-2 rounded-md bg-muted/30 p-2.5",
                        c.hidden && "opacity-60",
                      )}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials(cAuthor?.name ?? "?")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="text-xs font-semibold">{cAuthor?.name ?? "Unknown"}</p>
                          <span className="text-[10px] text-muted-foreground">
                            · {timeAgo(c.createdAt)}
                          </span>
                          {c.hidden && (
                            <Badge variant="outline" className="text-[9px]">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-xs text-foreground/90">{c.body}</p>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleCommentHidden(c.id, !c.hidden)}
                          title={c.hidden ? "Show comment" : "Hide comment"}
                        >
                          {c.hidden ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {/* Comment composer */}
            <div className="flex gap-2">
              <Input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a comment…"
                disabled={!currentUserId}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    postComment()
                  }
                }}
              />
              <Button
                size="sm"
                onClick={postComment}
                disabled={!commentBody.trim() || !currentUserId}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReactionPicker({
  onPick,
  disabled,
}: {
  onPick: (emoji: string) => void
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-6 gap-0.5 px-2 text-muted-foreground"
          title="React"
        >
          <span className="text-sm">😊</span>
          <Plus className="h-2.5 w-2.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="flex gap-0.5 p-1.5">
        {ROOM_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            className="rounded p-1 text-lg hover:bg-muted"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d === 1) return "yesterday"
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}
