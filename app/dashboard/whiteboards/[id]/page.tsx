"use client"

// Full-screen tldraw editor for a single whiteboard. Routes here from the
// whiteboards index card. The canvas autosaves via tldraw's IndexedDB
// persistence keyed by board.persistenceKey — we only handle metadata
// (title, updatedAt).

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Globe, Lock, Pencil, UserPlus, X, Sparkles } from "lucide-react"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import { WHITEBOARD_EDITOR_TOUR, WHITEBOARD_EDITOR_TOUR_ID } from "@/components/dashboard/tours"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas"
import { WhiteboardInviteDialog } from "@/components/whiteboard/whiteboard-invite-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  buildNotifications,
  whiteboardAccessDecidedNotification,
} from "@/lib/notifications"
import { toast } from "sonner"

// Push whiteboard metadata changes (visibility + invitees) to the
// backend so the ACL is a real boundary, not just localStorage. The
// backend enforces "owner-only" on this route, so even if a hostile
// client called it for a board they don't own, it'd 403. Failures
// are swallowed — the local change still applies (the editor stays
// optimistic) and the next save round-trip will retry the metadata.
function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}
// Same Bearer-token pattern as billing-client / live-room-state.
// Backend PATCH /api/whiteboards/<key>/meta is auth + owner gated;
// without the header it silently 401s and the backend ACL never
// updates — meaning "make private" / "invite users" toggles on the
// frontend don't actually restrict anyone server-side.
const ACCESS_TOKEN_KEY = "thebigclass.accessToken"
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}
async function syncBoardMeta(
  key: string,
  patch: { visibility?: "private" | "public"; invitedUserIds?: number[]; title?: string },
): Promise<void> {
  try {
    const res = await fetch(`${apiBase()}/api/whiteboards/${encodeURIComponent(key)}/meta`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[whiteboard syncBoardMeta] PATCH failed ${res.status} for key=${key}`)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[whiteboard syncBoardMeta] network error for key=${key}:`, err)
  }
}

export default function WhiteboardEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const {
    getWhiteboardById,
    updateWhiteboard,
    currentUser,
    whiteboardAccessRequests,
    decideWhiteboardAccessRequest,
    getUserById,
    addNotifications,
  } = useLMS()
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug ?? ""
  const board = getWhiteboardById(id)

  // Pending edit requests for this board. Only meaningful to the
  // owner; we hide the panel for everyone else even though the store
  // is workspace-wide.
  const pendingRequests = useMemo(() => {
    if (!board || !currentUser || board.createdBy !== currentUser.id) return []
    return whiteboardAccessRequests
      .filter((r) => r.boardId === board.id && r.status === "pending")
      .map((r) => ({ req: r, student: getUserById(r.studentId) }))
  }, [whiteboardAccessRequests, board, currentUser, getUserById])

  const handleDecide = (requestId: string, studentId: string, approved: boolean) => {
    if (!board) return
    decideWhiteboardAccessRequest(requestId, approved)
    const student = getUserById(studentId)
    if (student) {
      const payload = whiteboardAccessDecidedNotification({
        boardTitle: board.title,
        boardId: board.id,
        tenantSlug,
        approved,
      })
      const entries = buildNotifications([student], payload)
      setTimeout(() => addNotifications(entries), 0)
    }
    if (approved) {
      // Mirror invitee list to backend ACL — same path the invite
      // dialog uses, so server-side gating stays in sync.
      const nextInvited = Array.from(
        new Set([...(board.invitedUserIds ?? []), studentId]),
      )
      const numericIds = nextInvited
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n))
      void syncBoardMeta(board.persistenceKey, { invitedUserIds: numericIds })
      toast.success(
        `${student?.name ?? "Student"} can now edit this board.`,
      )
    } else {
      toast.success(`Request denied — board stays read-only for them.`)
    }
  }

  const [titleDraft, setTitleDraft] = useState(board?.title ?? "")
  const [editingTitle, setEditingTitle] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Acceptance is implicit — if a private board is opened by a user
  // who's neither the owner nor already invited, we'd block them at
  // render. But if they DO belong (notification link landed them
  // here) we still need to record acceptance so the invite list
  // stays accurate. Currently we trust the in-app notification flow
  // to gate access; this effect is the lightweight "log that I
  // opened it" hook so the owner can see who's actually using it.
  useEffect(() => {
    if (!board || !currentUser) return
    if (currentUser.id === board.createdBy) return
    if (board.visibility !== "private") return
    const invited = board.invitedUserIds ?? []
    if (!invited.includes(currentUser.id)) return
    // already invited — nothing to do
  }, [board, currentUser])
  useEffect(() => {
    if (board) setTitleDraft(board.title)
  }, [board])

  // Debounced updatedAt bump on canvas edits. Excalidraw fires onChange often, so
  // we coalesce to one persistence write per 2s while the user is drawing.
  const [pendingBump, setPendingBump] = useState(false)
  const [pendingThumbnail, setPendingThumbnail] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingBump || !board) return
    const t = setTimeout(() => {
      updateWhiteboard(board.id, pendingThumbnail ? { thumbnail: pendingThumbnail } : {})
      setPendingBump(false)
    }, 2000)
    return () => clearTimeout(t)
  }, [pendingBump, board, pendingThumbnail, updateWhiteboard])

  const handleChange = useCallback((thumbnail: string | null) => {
    setPendingBump(true)
    if (thumbnail) {
      setPendingThumbnail(thumbnail)
    }
  }, [])

  if (!board) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h2 className="font-serif text-xl font-bold">Whiteboard not found</h2>
        <Button asChild variant="outline">
          <Link href="/dashboard/whiteboards">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to whiteboards
          </Link>
        </Button>
      </div>
    )
  }

  const commitTitle = () => {
    const next = titleDraft.trim()
    if (next && next !== board.title) {
      updateWhiteboard(board.id, { title: next })
      toast.success("Renamed")
    } else {
      setTitleDraft(board.title)
    }
    setEditingTitle(false)
  }

  return (
    // Fixed-position overlay that fills the viewport area to the right of the
    // dashboard sidebar (on lg+ screens) and below the mobile header (below lg).
    // This bypasses the dashboard's main padding entirely — the canvas reaches
    // every edge, the grid extends to the bottom of the screen, and there's
    // no page scrollbar.
    <div className="fixed inset-0 top-16 lg:top-0 lg:left-64 z-30 flex flex-col bg-background overflow-hidden">
      <ProductTour tourId={WHITEBOARD_EDITOR_TOUR_ID} steps={WHITEBOARD_EDITOR_TOUR} />
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-card px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/whiteboards")}
          className="-ml-2"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Whiteboards
        </Button>
        <div className="flex items-center gap-2" data-tour="wb-title">
          {editingTitle ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle()
                if (e.key === "Escape") {
                  setTitleDraft(board.title)
                  setEditingTitle(false)
                }
              }}
              className="h-7 w-64 text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="inline-flex items-center gap-2 rounded px-2 py-1 text-sm font-medium hover:bg-muted/60"
              title="Click to rename"
            >
              <span className="truncate">{board.title}</span>
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Visibility pill. Click to flip private ↔ public. New
              boards default to private (lib/lms-store.tsx). Private
              = creator + invitees only; public = anyone signed into
              the workspace can open the same persistenceKey. We
              don't enforce visibility on the IndexedDB content (the
              data lives client-side), but the index page filters
              what shows up in each user's list based on this flag. */}
          {(() => {
            const isPublic = board.visibility === "public"
            return (
              <button
                type="button"
                data-tour="wb-visibility"
                onClick={() => {
                  const next = isPublic ? "private" : "public"
                  updateWhiteboard(board.id, { visibility: next })
                  // Mirror to the backend so the ACL on /api/whiteboards/:key
                  // routes blocks non-invitees, not just the UI listing.
                  void syncBoardMeta(board.persistenceKey, { visibility: next })
                  toast.success(
                    next === "public"
                      ? "Now public — anyone in your workspace can open this board."
                      : "Now private — only you + invitees can open this board.",
                  )
                }}
                className={
                  isPublic
                    ? "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    : "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400"
                }
                title={
                  isPublic
                    ? "Public — anyone in your workspace. Click to make private."
                    : "Private — only you + invitees. Click to make public."
                }
              >
                {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {isPublic ? "Public" : "Private"}
              </button>
            )
          })()}
          <TakeATourButton tourId={WHITEBOARD_EDITOR_TOUR_ID} />
          {/* Pending edit-access requests from students. Owner-only
              affordance; the dropdown lists each pending request with
              Approve / Deny. Approve also pushes the student into
              invitedUserIds + backend ACL via handleDecide → so the
              next time they open the board it's no longer read-only. */}
          {pendingRequests.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  title={`${pendingRequests.length} edit-access request${pendingRequests.length === 1 ? "" : "s"} pending`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Edit requests
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0 text-[10px] font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                    {pendingRequests.length}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="border-b border-border/60 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Edit-access requests
                  </p>
                </div>
                <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto">
                  {pendingRequests.map(({ req, student }) => (
                    <li key={req.id} className="flex items-start gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {student?.name ?? "Student"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Asked {new Date(req.requestedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={() => handleDecide(req.id, req.studentId, false)}
                          title="Deny"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleDecide(req.id, req.studentId, true)}
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Invite — only meaningful on private boards (public ones
              are already open to the workspace). Restrict to the
              owner so a random invitee can't keep inviting others. */}
          {board.visibility !== "public" && currentUser?.id === board.createdBy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInviteOpen(true)}
              className="h-7 gap-1 px-2 text-xs"
              title="Invite people to this private board"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite
              {board.invitedUserIds && board.invitedUserIds.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] tabular-nums">
                  {board.invitedUserIds.length}
                </span>
              )}
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Saved {new Date(board.updatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
      <WhiteboardInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        board={board}
        onInvited={(ids) => {
          const existing = board.invitedUserIds ?? []
          const next = Array.from(new Set([...existing, ...ids]))
          updateWhiteboard(board.id, { invitedUserIds: next })
          // Backend ACL needs the numeric user ids — lms-store users
          // can be string ids; we coerce via Number() and drop any
          // that aren't numeric since the backend ACL also filters.
          const numericIds = next.map((id) => Number(id)).filter((n) => Number.isFinite(n))
          void syncBoardMeta(board.persistenceKey, { invitedUserIds: numericIds })
        }}
      />
      <div className="flex-1 overflow-hidden">
        <WhiteboardCanvas
          persistenceKey={board.persistenceKey}
          className="h-full w-full"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
