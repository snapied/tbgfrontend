"use client"

// Bell popover for a single community — sets the member's notification
// level + a 24h snooze. Drops into the batch detail header.
//
// Why a popover (not a settings page): users mute communities in the
// heat of the moment. A popover keeps the action one click away. The
// settings page can still aggregate the same prefs later for a global
// "notifications" page.

import { useEffect, useState } from "react"
import { Bell, BellOff, BellRing, MoonStar } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  COMMUNITY_NOTIF_LEVELS,
  clearCommunitySnooze,
  getCommunityNotifPrefs,
  setCommunityNotifPrefs,
  snoozeCommunity24h,
  type CommunityNotifLevel,
  type CommunityNotifPrefs,
} from "@/lib/community-notification-prefs"

export function CommunityNotificationPrefsPopover({
  userId,
  communityId,
}: {
  userId: string | undefined
  communityId: string
}) {
  const [prefs, setPrefs] = useState<CommunityNotifPrefs | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPrefs(getCommunityNotifPrefs(userId, communityId))
  }, [userId, communityId])

  // Re-pull prefs when the popover opens — covers the case where the
  // user changed prefs in another tab.
  function onOpenChange(open: boolean) {
    if (open) setPrefs(getCommunityNotifPrefs(userId, communityId))
  }

  if (!mounted || !prefs) {
    // Render the bell shell during hydration so layout doesn't jump.
    return (
      <button
        type="button"
        aria-label="Notification preferences"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground"
        disabled
      >
        <Bell className="h-3.5 w-3.5" />
      </button>
    )
  }

  const isSnoozed = !!prefs.snoozeUntilMs && prefs.snoozeUntilMs > Date.now()
  const snoozeLabel = isSnoozed
    ? `Snoozed until ${new Date(prefs.snoozeUntilMs!).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })}`
    : null

  const triggerIcon = isSnoozed
    ? <MoonStar className="h-3.5 w-3.5" />
    : prefs.level === "off"
      ? <BellOff className="h-3.5 w-3.5" />
      : prefs.level === "all"
        ? <BellRing className="h-3.5 w-3.5" />
        : <Bell className="h-3.5 w-3.5" />

  function pick(level: CommunityNotifLevel) {
    const next = setCommunityNotifPrefs(userId, communityId, { level })
    setPrefs(next)
  }

  function toggleClassAlerts() {
    // The early-return above guarantees prefs is non-null at render
    // time, but TS can't narrow through this closure — use the
    // setter form to invert based on the latest known value.
    const current = prefs?.classStartAlerts ?? true
    const next = setCommunityNotifPrefs(userId, communityId, {
      classStartAlerts: !current,
    })
    setPrefs(next)
  }

  function snooze() {
    setPrefs(snoozeCommunity24h(userId, communityId))
  }

  function unsnooze() {
    setPrefs(clearCommunitySnooze(userId, communityId))
  }

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notification preferences for this community"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
            isSnoozed
              ? "border-amber-500/40 bg-amber-500/[0.06] text-amber-700"
              : prefs.level === "off"
                ? "border-border bg-muted text-muted-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
          }`}
          title={snoozeLabel ?? "Notification preferences"}
        >
          {triggerIcon}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notify me about
            </p>
            <div className="mt-2 space-y-1">
              {COMMUNITY_NOTIF_LEVELS.map((opt) => {
                const active = prefs.level === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pick(opt.id)}
                    className={`flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition ${
                      active
                        ? "border-primary bg-primary/[0.06]"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`mt-1 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${
                        active ? "border-primary bg-primary" : "border-border bg-background"
                      }`}
                    >
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold">{opt.label}</span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/30 p-2.5">
            <label className="flex items-center justify-between gap-2 text-[12px]">
              <span className="font-semibold">Ping me when a live class starts</span>
              <input
                type="checkbox"
                checked={prefs.classStartAlerts !== false}
                onChange={toggleClassAlerts}
                className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
              />
            </label>
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              Separate from feed activity — useful if you muted everything else.
            </p>
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.05] p-2.5">
            {isSnoozed ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-amber-700">{snoozeLabel}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    Notifications resume automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={unsnooze}
                  className="rounded-md border border-amber-500/40 px-2 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/10"
                >
                  Wake now
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={snooze}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-background px-2 py-1.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/10"
              >
                <MoonStar className="h-3.5 w-3.5" />
                Quiet for 24 hours
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
