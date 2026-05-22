"use client"

// Invite users to a private whiteboard. Picks from the workspace
// user directory (lms-store users), filters out the owner + already-
// invited, and fires an in-app notification per invitee. Notification
// payload carries the boardId so the recipient's notification bell
// can route the click to /dashboard/whiteboards/<id>. Acceptance is
// implicit — opening the link adds the user to `invitedUserIds`
// (handled where the board is rendered, not here).

import { useMemo, useState } from "react"
import { Search, Send, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useLMS, generateId } from "@/lib/lms-store"
import type { Whiteboard } from "@/lib/lms-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  board: Whiteboard
  onInvited: (userIds: string[]) => void
}

export function WhiteboardInviteDialog({ open, onOpenChange, board, onInvited }: Props) {
  const { users, currentUser, addNotifications } = useLMS()
  const [search, setSearch] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState("")

  const alreadyInvited = new Set(board.invitedUserIds ?? [])

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      // Hide self (owner) and anyone already on the board.
      if (currentUser && u.id === currentUser.id) return false
      if (u.id === board.createdBy) return false
      if (alreadyInvited.has(u.id)) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  }, [users, search, currentUser, board.createdBy, alreadyInvited])

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = () => {
    if (picked.size === 0 || !currentUser) return
    const ids = Array.from(picked)
    const url = `/dashboard/whiteboards/${board.id}`
    const baseTitle = `${currentUser.name} invited you to a whiteboard`
    const body = message.trim() || `Join "${board.title}" — open it from your whiteboards.`
    // Fan out one in-app notification per invitee. The notification
    // bell + Inbox pick this up automatically; no extra wiring needed
    // because both surfaces filter `notifications` by userId.
    addNotifications(
      ids.map((userId) => ({
        id: generateId("notif"),
        userId,
        channel: "in-app",
        type: "whiteboard.invited",
        title: baseTitle,
        body,
        url,
        createdAt: new Date().toISOString(),
        status: "sent",
        meta: { boardId: board.id, inviterId: currentUser.id },
      })),
    )
    onInvited(ids)
    toast.success(
      `Invited ${ids.length} ${ids.length === 1 ? "person" : "people"} to "${board.title}".`,
    )
    setPicked(new Set())
    setMessage("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to whiteboard</DialogTitle>
          <DialogDescription>
            Add people to this private board. They&apos;ll get an in-app
            notification and can open the board from their inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            {candidates.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {search
                  ? "No one matches that search."
                  : "Everyone in your workspace is already on this board or it's just you."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {candidates.map((u) => {
                  const on = picked.has(u.id)
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => toggle(u.id)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
                          on && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded border",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card",
                          )}
                          aria-hidden
                        >
                          {on ? "✓" : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{u.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                        </span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {u.role}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <label
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="wb-invite-msg"
            >
              Note (optional)
            </label>
            <Input
              id="wb-invite-msg"
              placeholder={`Why you're inviting them to "${board.title}"`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {alreadyInvited.size > 0 && (
            <p className="text-[11px] text-muted-foreground">
              <UserPlus className="mr-1 inline h-3 w-3" />
              {alreadyInvited.size} {alreadyInvited.size === 1 ? "person" : "people"} already invited.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-1.5 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={submit} disabled={picked.size === 0}>
            <Send className="mr-1.5 h-4 w-4" />
            Send {picked.size > 0 ? picked.size : ""} invite{picked.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
