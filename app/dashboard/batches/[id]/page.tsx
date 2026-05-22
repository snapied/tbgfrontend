"use client"

// Batch detail — Members + Common Room.
//
// Members tab:
//   - Roster with bulk add / remove. Search box that matches the same
//     fuzzy pattern used elsewhere (typos OK).
//
// Common Room tab:
//   - Feed of posts. Members can post + comment + react. Teacher can
//     pin, hide, delete. Pinned posts float to the top.
//
// This file is intentionally one screen — splitting Members and Common
// Room into separate routes would mean two page-skeletons to maintain
// for what's really one cohort context.

import { use, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  AtSign,
  Check,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
} from "@/lib/lms-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { useTenant } from "@/lib/tenant-store"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/lib/use-confirm"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
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
    title: "Your batch's home base",
    body: "The Common Room is the persistent feed your cohort talks in. This tour shows the bits people miss — the teacher pill, the @-tag picker, file attachments, and post editing.",
    emoji: "👥",
  },
  {
    target: "[data-tour='batch-teachers']",
    title: "Teachers, pinned at the top",
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
    body: "Images render as thumbnails, videos play inline, PDFs open in an embedded viewer, everything else becomes a download chip. Whole batch gets notified the moment you hit Post.",
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

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const confirm = useConfirm()
  const {
    studentGroups,
    updateStudentGroup,
    deleteStudentGroup,
    addStudentsToGroup,
    removeStudentsFromGroup,
    students,
    courses,
    currentUser,
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
  } = useLMS()
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
  // Teacher = the linked course's primary instructor (if any). Falls back to
  // the current admin user — there's always *someone* moderating.
  const teacher = course?.instructor ?? null
  const coTeachers = (course?.coInstructorIds ?? [])
    .map((uid) => getUserById(uid))
    .filter((u): u is NonNullable<typeof u> => !!u)
  // Mention list — teacher pinned to the top, then co-teachers, then members.
  // Used by the composer's @-picker.
  const mentionables: Mentionable[] = [
    ...(teacher ? [{ id: teacher.id, name: teacher.name, role: "teacher" as const }] : []),
    ...coTeachers.map((u) => ({ id: u.id, name: u.name, role: "teacher" as const })),
    ...members
      .filter((u) => u.id !== teacher?.id && !coTeachers.some((t) => t.id === u.id))
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
            <ArrowLeft className="h-3 w-3" /> All batches
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
              {batch.description || batch.purpose}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="batch-detail-v1" label="Take a tour" />
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
                    description: "You'll stop seeing this community's posts and notifications. You can re-join later from an invite link if the teacher invites you back.",
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
        </TabsList>

        <TabsContent value="room" className="mt-5">
          <CommonRoom
            batchId={batch.id}
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
            onAdd={(body, embedUrl, attachments) => {
              if (!currentUser) return
              addBatchPost({
                id: generateId("post"),
                batchId: batch.id,
                spaceId: activeSpaceId,
                authorId: currentUser.id,
                body,
                embedUrl,
                attachments,
                pinned: false,
                hidden: false,
                comments: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
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
              // don't get double-notified.
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
              toggleBatchPostReaction(postId, emoji, currentUser.id)
            }}
            onToggleCommentHidden={setBatchPostCommentHidden}
          />
        </TabsContent>

        <TabsContent value="directory" className="mt-5">
          <DirectoryTab
            members={members}
            allStudents={students}
            getPostsForBatch={getPostsForBatch}
            batchId={batch.id}
            onAdd={(ids) => addStudentsToGroup(batch.id, ids)}
            onRemove={(ids) => removeStudentsFromGroup(batch.id, ids)}
            isAdmin={
              currentUser?.role === "admin" || currentUser?.role === "instructor"
            }
          />
        </TabsContent>
      </Tabs>
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

  function save() {
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      purpose: description.trim() || undefined,
      courseId: courseId !== "none" ? courseId : undefined,
      color,
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
                <span className="font-medium">Teachers-only community</span>
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
  onAdd,
  onRemove,
  isAdmin,
}: {
  members: DirectoryUser[]
  allStudents: DirectoryUser[]
  getPostsForBatch: ReturnType<typeof useLMS>["getPostsForBatch"]
  batchId: string
  onAdd: (ids: string[]) => void
  onRemove: (ids: string[]) => void
  isAdmin: boolean
}) {
  const [search, setSearch] = useState("")
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
      if (locationFilter === "all") return true
      return m.city === locationFilter || m.country === locationFilter
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
  }, [members, search, locationFilter])

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
        {isAdmin && (
          <Button onClick={() => setPickerOpen(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Add students
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users2 className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">No members yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {isAdmin
                ? "Add students from your roster to give this batch a Common Room people will actually visit."
                : "This batch doesn't have any members yet."}
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
                        <p className="truncate text-sm font-semibold">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.role === "admin" || m.role === "instructor"
                            ? "Teacher"
                            : "Member"}
                          {(m.city || m.country) && (
                            <span> · {m.city || m.country}</span>
                          )}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemove([m.id])
                          }}
                          title="Remove from batch"
                          className="rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
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
                    ? "Teacher · workspace owner"
                    : member.role === "instructor"
                      ? "Teacher"
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
              {/* Recent posts in this batch */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Posts in this batch ({postsByThisMember.length})
                </p>
                {postsByThisMember.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    Hasn&apos;t posted in this batch yet.
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
          <DialogTitle>Add students to this batch</DialogTitle>
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
type Mentionable = { id: string; name: string; role?: "teacher" | "member" }

type CommonRoomProps = {
  batchId: string
  spaces: BatchSpace[]
  activeSpaceId: string
  onSpaceChange: (spaceId: string) => void
  onSpacesEdit: (next: BatchSpace[]) => void
  currentUserId?: string
  isAdmin: boolean
  getUserById: ReturnType<typeof useLMS>["getUserById"]
  posts: ReturnType<typeof useLMS>["batchPosts"]
  /** People available for @mention — teacher first, then members. */
  mentionables: Mentionable[]
  onAdd: (body: string, embedUrl?: string, attachments?: Attachment[]) => void
  onAddComment: (postId: string, body: string) => void
  onEditPost: (postId: string, nextBody: string) => void
  onTogglePin: (postId: string) => void
  onToggleFeatured: (postId: string) => void
  onToggleHide: (postId: string, hidden: boolean) => void
  onDeletePost: (postId: string) => void
  onToggleReaction: (postId: string, emoji: string) => void
  onToggleCommentHidden: (postId: string, commentId: string, hidden: boolean) => void
}

function CommonRoom(props: CommonRoomProps) {
  const [body, setBody] = useState("")
  const [embedUrl, setEmbedUrl] = useState("")
  const [showEmbedInput, setShowEmbedInput] = useState(false)
  // Attachments queued for the current draft post. Cleared on submit.
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [mentionOpen, setMentionOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const teachers = props.mentionables.filter((m) => m.role === "teacher")
  const regularMembers = props.mentionables.filter((m) => m.role !== "teacher")

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

  const orderedPosts = useMemo(() => {
    // Pinned first (most recent pin at top of pinned block), then
    // chronological for the rest. Featured posts get the highlighted
    // card treatment but stay in place, so a featured-but-not-pinned
    // post sits in chronological order with a glow rather than being
    // shoved to the top.
    const visible = props.isAdmin ? props.posts : props.posts.filter((p) => !p.hidden)
    const pinned = visible.filter((p) => p.pinned)
    const rest = visible.filter((p) => !p.pinned)
    return [
      ...pinned.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      ...rest.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    ]
  }, [props.posts, props.isAdmin])

  function submit() {
    // Allow posts with only attachments — the body can be empty if the user
    // is sharing a file/video with no commentary.
    if (isRichTextEmpty(body) && pendingAttachments.length === 0) return
    props.onAdd(
      body,
      embedUrl.trim() || undefined,
      pendingAttachments.length > 0 ? pendingAttachments : undefined,
    )
    setBody("")
    setEmbedUrl("")
    setShowEmbedInput(false)
    setPendingAttachments([])
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-start">
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
        {/* Teachers + moderators card. Always rendered so members can see at
            a glance who's in charge of the batch. */}
        {teachers.length > 0 && (
          <Card data-tour="batch-teachers" className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Shield className="h-3.5 w-3.5" />
                Teachers
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
              {orderedPosts.length} post{orderedPosts.length === 1 ? "" : "s"}
            </Badge>
          </div>
        )}

        {/* Composer */}
        <Card data-tour="batch-composer">
          <CardContent className="space-y-3 p-4">
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder={
                props.currentUserId
                  ? `Share something in ${activeSpace?.name ?? "the room"}…`
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
                onChange={(e) => setEmbedUrl(e.target.value)}
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
                            Teachers
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">
                No posts in {activeSpace?.name ?? "this space"} yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Kick off the conversation — ask a question, share a win, or set the tone.
              </p>
            </CardContent>
          </Card>
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
                onToggleReaction={(emoji) => props.onToggleReaction(post.id, emoji)}
                onToggleCommentHidden={(cid, hidden) =>
                  props.onToggleCommentHidden(post.id, cid, hidden)
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
function detectEmbed(url: string): { kind: "iframe" | "video"; src: string } | null {
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
  const canShowMenu = canEdit || isAdmin

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
                native <video> for direct mp4/webm. */}
            {embed && (
              <div className="mt-3 overflow-hidden rounded-md border border-border bg-black">
                {embed.kind === "iframe" ? (
                  <iframe
                    src={embed.src}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={embed.src}
                    controls
                    className="aspect-video w-full"
                  />
                )}
              </div>
            )}
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
