import type { LiveSession } from "./lms-store"

export type ComputedStatus = "upcoming" | "live" | "ended" | "cancelled"

export function computeSessionStatus(session: LiveSession, now: Date = new Date()): ComputedStatus {
  if (session.status === "cancelled") return "cancelled"
  const start = new Date(session.scheduledAt).getTime()
  const end = start + session.durationMinutes * 60 * 1000
  const t = now.getTime()
  if (t < start) return "upcoming"
  if (t < end) return "live"
  return "ended"
}

export function formatSessionWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function providerLabel(provider: LiveSession["provider"]): string {
  switch (provider) {
    case "google-meet": return "Google Meet"
    case "zoom": return "Zoom"
    case "ms-teams": return "Microsoft Teams"
    default: return "Live link"
  }
}
