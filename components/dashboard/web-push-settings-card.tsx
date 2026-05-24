"use client"

// WebPushSettingsCard — consumer UI for the useWebPush primitive
// (Sprint C Communities #48). Lives in /dashboard/settings (or
// anywhere a teacher might toggle notification routing) and surfaces
// the four states the hook can be in: unsupported / default /
// granted / denied. Each state has a single action button + a
// human-readable status line so the teacher always knows what to
// do next.
//
// Why a dedicated card rather than a hidden setting:
//   • The Web Push permission prompt is browser-modal — surfacing
//     a clear "Enable on this device" button gets a 5–10× higher
//     accept rate than a toggle buried inside a long settings list.
//   • The four states have distinct copy + actions; trying to
//     compress this into a switch would force the user to read
//     between the lines.

import { Bell, BellOff, ShieldAlert, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { useWebPush } from "@/lib/web-push"

export function WebPushSettingsCard() {
  const push = useWebPush()

  if (push.state === "unsupported") {
    return (
      <Card className="border-muted">
        <CardContent className="flex items-start gap-3 p-4 text-[12.5px]">
          <Smartphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="font-semibold">Push not supported on this browser</p>
            <p className="mt-1 text-muted-foreground">
              Web Push works on Chrome, Firefox, Edge, and Safari 16.4+. Open
              this dashboard in one of those browsers to enable phone-style
              alerts.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (push.state === "denied") {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 p-4 text-[12.5px]">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0">
            <p className="font-semibold">Push notifications are blocked</p>
            <p className="mt-1 text-muted-foreground">
              You declined the prompt earlier (or the browser blocked it).
              Re-enable from the browser&apos;s site permissions panel —
              we can&apos;t re-ask programmatically.
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              In Chrome: click the lock icon next to the URL → Notifications → Allow.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (push.state === "granted" && push.subscription) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-start justify-between gap-3 p-4 text-[12.5px]">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            <div className="min-w-0">
              <p className="font-semibold">You&apos;re subscribed on this device</p>
              <p className="mt-1 text-muted-foreground">
                Mentions, replies-to-me, and admin announcements will ping you
                even when the dashboard tab is closed.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const ok = await push.disable()
              if (ok) toast.success("Unsubscribed from this device.")
              else toast.error("Couldn't unsubscribe — try again.")
            }}
          >
            <BellOff className="mr-1 h-3 w-3" />
            Unsubscribe
          </Button>
        </CardContent>
      </Card>
    )
  }

  // state === "default" OR granted-but-no-subscription (cleared by
  // the browser; we treat it the same as default for UI purposes).
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4 text-[12.5px]">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-4 w-4 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold">Enable push on this device</p>
            <p className="mt-1 text-muted-foreground">
              Get pinged the moment a student asks a question or a doubt
              lands — even when you&apos;ve closed the dashboard tab.
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              You can unsubscribe any time. We never send marketing pushes.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            const sub = await push.enable()
            if (sub) {
              toast.success("Push notifications enabled.")
            } else if (push.state === "denied") {
              toast.error(
                "You declined the prompt — re-enable in your browser settings.",
              )
            }
          }}
        >
          Enable on this device
        </Button>
      </CardContent>
    </Card>
  )
}
