"use client"

// Student-facing whiteboards list. Surfaces every public board in
// the workspace (plus any private board the student is explicitly
// invited to). Each card shows the title, the instructor who owns
// it (name + avatar), and the last-edited timestamp.
//
// Click → /p/<tenant>/my/whiteboards/<id> which mounts the same
// tldraw canvas the teacher uses, but in read-only view mode.

import { useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { PenSquare, Plus, Search, Lock, Trash2, UserCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLMS, generateId, type Whiteboard } from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { useConfirm } from "@/lib/use-confirm"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { toast } from "sonner"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `just now`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

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

export default function MyWhiteboardsPage() {
  const params = useParams<{ tenant: string }>()
  const router = useRouter()
  const slug = tenantSlug(params)
  const { currentUser, whiteboards, getUserById, addWhiteboard, deleteWhiteboard } =
    useLMS()
  const confirm = useConfirm()
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })

  // Students get a private scratchpad — never a public board. Public
  // boards stay an instructor-only affordance so the student list
  // stays curated and free of cross-student noise. If they want their
  // teacher to mark it up too, the request-to-edit flow on the board
  // page hands access back through the right gate.
  const handleCreateMyBoard = () => {
    if (!currentUser) {
      toast.error("Sign in first to start a board.")
      return
    }
    const id = generateId("wb")
    const board: Whiteboard = {
      id,
      title: `My whiteboard · ${new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.id,
      persistenceKey: id,
      visibility: "private",
      invitedUserIds: [],
    }
    addWhiteboard(board)
    toast.success("New whiteboard — only you can see this.")
    router.push(`/p/${slug}/my/whiteboards/${id}`)
  }

  // Soft-delete a board the student owns. Goes through the same
  // pushToTrash path the teacher uses, so the row shows up in
  // /p/<slug>/my/trash for the 7-day window and the undo toast can
  // restore it via the LMS store's whiteboard restore handler.
  const handleDeleteBoard = async (board: Whiteboard) => {
    const ok = await confirm({
      title: `Delete "${board.title}"?`,
      description:
        "Moves the board to your Trash — you can restore it within 7 days. The canvas content stays on this device while the metadata is in Trash.",
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
      recoverPath: `/p/${slug}/my/trash`,
    })
  }

  // Visible to this student. SAFE DEFAULTS:
  //   • EXPLICIT public boards — visible (read-only).
  //   • Boards where the student is in invitedUserIds — visible.
  //   • Boards the student created themselves — visible.
  //   • Anything else (including undefined visibility) — HIDDEN.
  //
  // Undefined visibility is treated as private, not public. Legacy
  // boards created before the visibility field landed should not
  // leak to students — the teacher can flip them to public from
  // /dashboard/whiteboards/<id> if they want to share.
  const rows = useMemo(() => {
    if (!currentUser) return []
    return whiteboards
      .filter((b) => {
        if (b.createdBy === currentUser.id) return true
        const v = b.visibility
        if (v === "public") return true
        return b.invitedUserIds?.includes(currentUser.id) ?? false
      })
      .map((b) => ({ board: b, owner: getUserById(b.createdBy) }))
      .sort((a, b) => b.board.updatedAt.localeCompare(a.board.updatedAt))
  }, [whiteboards, currentUser, getUserById])

  const visible = useMemo(
    () => fuzzySearch(rows, search, (r) => `${r.board.title} ${r.owner?.name ?? ""}`),
    [rows, search],
  )

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see your workspace whiteboards.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Whiteboards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length === 0
              ? "Your teachers haven't shared any boards yet — but you can start your own."
              : `${rows.length} board${rows.length === 1 ? "" : "s"} you can open.`}
          </p>
        </div>
        <Button onClick={handleCreateMyBoard} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New whiteboard
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by board or instructor…"
          className="pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PenSquare className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {rows.length === 0 ? "No whiteboards yet" : "Nothing matches"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0
                ? "When your teachers create a shared board, it'll show up here."
                : "Try clearing the search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ board, owner }) => {
            const isMine = board.createdBy === currentUser.id
            const visibility = board.visibility ?? "public"
            return (
              <Link
                key={board.id}
                href={`/p/${slug}/my/whiteboards/${board.id}`}
                className="group relative block"
              >
                {isMine && (
                  // Hover-revealed trash icon. Owner-only — students
                  // never see a delete affordance on instructor or
                  // peer boards.
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void handleDeleteBoard(board)
                    }}
                    title="Move to Trash"
                    aria-label={`Delete "${board.title}"`}
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-background/85 text-destructive opacity-0 shadow-sm ring-1 ring-border transition-opacity hover:bg-background group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <Card className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  {board.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={board.thumbnail}
                      alt=""
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-accent/10">
                      <PenSquare className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                  )}
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 font-serif text-base font-semibold">
                        {board.title}
                      </p>
                      {isMine ? (
                        <Badge variant="default" className="shrink-0">
                          <UserCircle2 className="mr-1 h-3 w-3" />
                          Mine
                        </Badge>
                      ) : visibility === "private" ? (
                        <Badge variant="secondary" className="shrink-0">
                          <Lock className="mr-1 h-3 w-3" />
                          Invited
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {owner?.avatar ? (
                          <AvatarImage src={owner.avatar} alt={owner.name ?? ""} />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {initials(owner?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {owner?.name ?? "Instructor"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Edited {timeAgo(board.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
