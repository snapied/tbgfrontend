"use client"

// Student read-only view of a single whiteboard. Mounts the same
// Excalidraw-backed <WhiteboardCanvas /> the teacher uses but pins
// readOnly=true so students can pan / zoom / read without altering
// the board.
//
// Access gate: public boards open for anyone in the workspace;
// private boards only render when the student is in `invitedUserIds`.
// The lookup happens via the LMS store which is already
// tenant-scoped, so cross-tenant id collisions aren't possible.

import { use, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock3, Lock, PenSquare, Pencil, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useLMS } from "@/lib/lms-store"
import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas"
import { buildNotifications, whiteboardAccessRequestedNotification } from "@/lib/notifications"
import { useConfirm } from "@/lib/use-confirm"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { toast } from "sonner"

function initials(name?: string): string {
  if (!name) return "?"
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

export default function StudentWhiteboardPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant, id } = use(params)
  const router = useRouter()
  const confirm = useConfirm()
  const {
    whiteboards,
    currentUser,
    getUserById,
    whiteboardAccessRequests,
    requestWhiteboardEditAccess,
    addNotifications,
    deleteWhiteboard,
  } = useLMS()

  const board = useMemo(
    () => whiteboards.find((b) => b.id === id),
    [whiteboards, id],
  )
  const owner = board ? getUserById(board.createdBy) : undefined

  const accessible = useMemo(() => {
    if (!board || !currentUser) return false
    // Owner always — students who create their own private board
    // still need to open it themselves. Same gate as the list page:
    // undefined visibility is treated as private (safe default).
    if (board.createdBy === currentUser.id) return true
    if (board.visibility === "public") return true
    return board.invitedUserIds?.includes(currentUser.id) ?? false
  }, [board, currentUser])

  if (!board) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/p/${tenant}/my/whiteboards`}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            All whiteboards
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <PenSquare className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Whiteboard not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have been removed or the link is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!accessible) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/p/${tenant}/my/whiteboards`}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            All whiteboards
          </Link>
        </Button>
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">This board is private</p>
            <p className="text-sm text-muted-foreground">
              Ask the instructor for an invite to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Owner edits their own board freely. Everyone else lands in
  // read-only so they can pan/zoom without altering the canvas. The
  // request-to-edit flow runs through a separate gate (notification +
  // instructor approval before being added to invitedUserIds).
  const isOwner = board.createdBy === currentUser?.id
  const isInvitedEditor = !!(
    currentUser && board.invitedUserIds?.includes(currentUser.id)
  )
  const canEdit = isOwner || isInvitedEditor

  // Is there already an open request from this student for this board?
  // Used to flip the button into "Requested" mode so the student
  // doesn't pile on duplicate notifications when the instructor hasn't
  // decided yet.
  const myPendingRequest = useMemo(() => {
    if (!currentUser || isOwner || isInvitedEditor) return undefined
    return whiteboardAccessRequests.find(
      (r) =>
        r.boardId === board.id &&
        r.studentId === currentUser.id &&
        r.status === "pending",
    )
  }, [whiteboardAccessRequests, board.id, currentUser, isOwner, isInvitedEditor])

  const handleRequestEdit = () => {
    if (!currentUser || !owner) return
    const req = requestWhiteboardEditAccess(board.id, currentUser.id)
    if (!req) return
    const payload = whiteboardAccessRequestedNotification({
      studentName: currentUser.name ?? "A student",
      boardTitle: board.title,
      boardId: board.id,
      requestId: req.id,
    })
    const entries = buildNotifications([owner], payload)
    setTimeout(() => addNotifications(entries), 0)
    toast.success("Edit access requested — your instructor was notified.")
  }

  // Owner-only soft delete. Goes through the same trash pipeline the
  // list view uses; navigates back to the list so the user lands
  // somewhere coherent after the row is gone.
  const handleDelete = async () => {
    if (!isOwner) return
    const ok = await confirm({
      title: `Delete "${board.title}"?`,
      description:
        "Moves the board to your Trash — restore it within 7 days from /my/trash. The canvas content stays on this device.",
      destructive: true,
      confirmLabel: "Delete",
    })
    if (!ok) return
    deleteWhiteboard(board.id)
    toastUndoableDelete({
      kind: "whiteboard",
      ids: board.id,
      label: board.title || "Whiteboard",
      itemNoun: "whiteboard",
      recoverPath: `/p/${tenant}/my/trash`,
    })
    router.push(`/p/${tenant}/my/whiteboards`)
  }

  // Fixed-position overlay that fills the viewport area to the right
  // of the student sidebar (lg+) and below the mobile header (below lg).
  // Mirrors the teacher's /dashboard/whiteboards/<id> chrome so the
  // canvas reaches every edge — the Excalidraw toolbar then sits
  // flush against the bottom of the viewport instead of stranded mid-
  // page by the layout's padding.
  return (
    <div className="fixed inset-0 top-16 lg:top-0 lg:left-64 z-30 flex flex-col bg-background overflow-hidden">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-1">
            <Link href={`/p/${tenant}/my/whiteboards`}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Whiteboards
            </Link>
          </Button>
          <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="truncate text-sm font-semibold">{board.title}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                {owner?.avatar ? (
                  <AvatarImage src={owner.avatar} alt={owner.name ?? ""} />
                ) : null}
                <AvatarFallback className="text-[9px]">
                  {initials(owner?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {isOwner ? "You" : owner?.name ?? "Instructor"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 px-2 text-destructive hover:text-destructive"
              title="Move to Trash"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          )}
          {!canEdit && (
            myPendingRequest ? (
              <Badge variant="outline" className="gap-1">
                <Clock3 className="h-3 w-3" />
                Edit request pending
              </Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={handleRequestEdit} className="h-7 px-2">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Request edit access
              </Button>
            )
          )}
          <Badge variant={canEdit ? "default" : "secondary"}>
            {canEdit ? (
              <>
                <Pencil className="mr-1 h-3 w-3" />
                Editing
              </>
            ) : (
              <>
                <Lock className="mr-1 h-3 w-3" />
                Read-only
              </>
            )}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <WhiteboardCanvas
          persistenceKey={board.persistenceKey}
          readOnly={!canEdit}
          className="h-full w-full"
        />
      </div>
    </div>
  )
}
