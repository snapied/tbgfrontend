"use client"

// Student inbox — every in-app notification scoped to me. The bell
// in the sidebar is a quick preview; this is the full list.
//
// Channel filter is intentional: students typically only care about
// the "in-app" rows (the same content fires via email + WhatsApp
// separately). We default to in-app to keep noise down.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  CheckCheck,
  Inbox as InboxIcon,
  Mail,
  MessageSquare,
  Smartphone,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useLMS, type NotificationChannel } from "@/lib/lms-store"
import { cn } from "@/lib/utils"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_INBOX_TOUR,
  STUDENT_INBOX_TOUR_ID,
} from "@/components/student/tours"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  "in-app": "In-app",
  email: "Email",
  whatsapp: "WhatsApp",
}

const CHANNEL_ICON: Record<NotificationChannel, React.ReactNode> = {
  "in-app": <InboxIcon className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
}

export default function StudentInboxPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const {
    currentUser,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useLMS()
  const [channelFilter, setChannelFilter] = useState<
    "all" | NotificationChannel
  >("in-app")

  const mine = useMemo(
    () =>
      currentUser
        ? notifications
            .filter((n) => n.userId === currentUser.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [notifications, currentUser],
  )

  const visible = useMemo(
    () =>
      channelFilter === "all"
        ? mine
        : mine.filter((n) => n.channel === channelFilter),
    [mine, channelFilter],
  )

  const unreadCount = mine.filter((n) => n.status !== "read").length
  const counts = {
    all: mine.length,
    "in-app": mine.filter((n) => n.channel === "in-app").length,
    email: mine.filter((n) => n.channel === "email").length,
    whatsapp: mine.filter((n) => n.channel === "whatsapp").length,
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_INBOX_TOUR_ID} steps={STUDENT_INBOX_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mine.length} total · {unreadCount} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId={STUDENT_INBOX_TOUR_ID} />
          <Button
            variant="outline"
            size="sm"
            disabled={!currentUser || unreadCount === 0}
            onClick={() => {
              if (currentUser) markAllNotificationsRead(currentUser.id)
            }}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>
      </div>

      <Tabs
        value={channelFilter}
        onValueChange={(v) => setChannelFilter(v as typeof channelFilter)}
      >
        <TabsList>
          <TabsTrigger value="in-app">
            <InboxIcon className="mr-1.5 h-3.5 w-3.5" />
            In-app ({counts["in-app"]})
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Email ({counts.email})
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <Smartphone className="mr-1.5 h-3.5 w-3.5" />
            WhatsApp ({counts.whatsapp})
          </TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <InboxIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {mine.length === 0
                ? "No notifications yet"
                : "Nothing in this channel"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mine.length === 0
                ? "When your teacher schedules a class or grades your work, you'll see it here."
                : "Try a different channel above."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {visible.map((n) => {
                const isRead = n.status === "read"
                const href = (() => {
                  if (!n.url) return undefined
                  // Re-scope dashboard-style URLs into the tenant student
                  // surface where it makes sense. Otherwise pass through.
                  if (slug && n.url.startsWith("/dashboard/quizzes/")) {
                    return `/p/${slug}/my/quizzes`
                  }
                  if (slug && n.url.startsWith("/dashboard/assignments/")) {
                    return `/p/${slug}/my/assignments`
                  }
                  return n.url
                })()
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 p-4 transition-colors",
                      isRead ? "opacity-70" : "bg-card",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                      {CHANNEL_ICON[n.channel]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "line-clamp-1 text-sm",
                            isRead ? "font-normal" : "font-semibold",
                          )}
                        >
                          {n.title}
                        </p>
                        {!isRead && (
                          <Badge
                            variant="outline"
                            className="border-primary/40 bg-primary/10 text-[10px] text-primary"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {CHANNEL_LABEL[n.channel]} ·{" "}
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {href && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          onClick={() => markNotificationRead(n.id)}
                        >
                          <Link href={href}>Open</Link>
                        </Button>
                      )}
                      {!isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => markNotificationRead(n.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
