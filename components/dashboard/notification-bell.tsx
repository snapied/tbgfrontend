"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Bell, Check, CheckCheck, Mail, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function NotificationBell() {
  const { currentUser, getUserNotifications, markNotificationRead, markAllNotificationsRead, notifications } = useLMS()
  const [open, setOpen] = useState(false)

  const items = useMemo(() => {
    if (!currentUser) return []
    return getUserNotifications(currentUser.id).slice(0, 20)
  }, [currentUser, getUserNotifications, notifications])

  const unread = items.filter((n) => n.status !== "read").length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          {unread > 0 && currentUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllNotificationsRead(currentUser.id)}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium">Nothing yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Live class invites and graded work will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const unreadItem = n.status !== "read"
                const content = (
                  <div
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors",
                      unreadItem ? "bg-primary/[0.04]" : "bg-transparent",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        unreadItem ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <NotificationIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium leading-tight">{n.title}</p>
                        {unreadItem && (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                )
                return (
                  <li key={n.id}>
                    {n.url ? (
                      <Link
                        href={n.url}
                        onClick={() => {
                          markNotificationRead(n.id)
                          setOpen(false)
                        }}
                        className="block hover:bg-muted/40"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className="block w-full text-left hover:bg-muted/40"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Bell className="h-3 w-3" /> In-app
          </span>
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3" /> Email
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> WhatsApp
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationIcon({ type }: { type: string }) {
  if (type.startsWith("live-session")) return <span className="text-xs">▶</span>
  if (type.endsWith(".graded")) return <Check className="h-3.5 w-3.5" />
  if (type.endsWith(".published")) return <MessageSquare className="h-3.5 w-3.5" />
  return <Bell className="h-3.5 w-3.5" />
}
