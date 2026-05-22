"use client"

// Thin strip across the top of every public portal page. Dismissable
// dismissals persist in localStorage keyed on a hash of the message so
// editing the bar's text in the dashboard re-shows it to returning
// visitors (otherwise teachers would update the announcement and never
// realize their existing audience was still hidden).

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PortalAnnouncementBar } from "@/lib/portal-store"

const STORAGE_KEY = "thebigclass.portal.announcement.dismissed.v1"

export function AnnouncementBar({
  bar,
  tenant,
}: {
  bar: PortalAnnouncementBar
  tenant: string
}) {
  const [dismissed, setDismissed] = useState(false)
  const messageHash = quickHash(bar.message + (bar.cta?.label ?? ""))

  useEffect(() => {
    if (!bar.dismissable) return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const map = JSON.parse(raw) as Record<string, string>
      if (map[`${tenant}:${messageHash}`]) setDismissed(true)
    } catch {
      /* ignore */
    }
  }, [bar.dismissable, tenant, messageHash])

  if (!bar.enabled || !bar.message.trim() || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    if (bar.dismissPersists !== "forever") return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      map[`${tenant}:${messageHash}`] = new Date().toISOString()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch {
      /* quota — fine, just don't persist the dismissal */
    }
  }

  const colors: Record<typeof bar.variant, string> = {
    info: "bg-primary text-primary-foreground",
    promo: "bg-accent text-accent-foreground",
    warning: "bg-destructive text-destructive-foreground",
  }

  return (
    <div className={cn("relative flex items-center justify-center gap-3 px-4 py-2 text-sm", colors[bar.variant])}>
      <span className="text-center">{bar.message}</span>
      {bar.cta?.label && bar.cta.href && (
        <Link
          href={bar.cta.href}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          {bar.cta.label}
        </Link>
      )}
      {bar.dismissable && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-80 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// Cheap, non-cryptographic — only used as a dismissal cache key, so
// any 8-char hex of the message content is good enough.
function quickHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(16).padStart(8, "0")
}
