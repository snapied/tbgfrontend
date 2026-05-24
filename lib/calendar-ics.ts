// ICS file generator + per-provider calendar deep links.
//
// Powers the "Add to calendar" button on class detail pages and
// reminder emails. We deliberately don't bundle a third-party ICS
// library — the iCalendar spec we need (single VEVENT, no
// recurrence, no attendees, no attachments) is ~30 lines of glue,
// and avoiding the dep keeps the client bundle lean.
//
// The same input feeds all four output paths:
//   • downloadIcs(event) — RFC 5545 .ics file via blob URL
//   • googleCalendarUrl(event) — calendar.google.com/calendar/render?...
//   • outlookCalendarUrl(event) — outlook.live.com/calendar/0/deeplink/compose?...
//   • appleCalendarHref(event) — same ICS, but data: URL so Safari opens
//     it directly in Apple Calendar instead of triggering download
//
// Times are stored as ISO; we serialize them to UTC for ICS
// (Z-suffix) because most clients respect TZID rules unreliably
// and a single UTC stamp is unambiguous on every platform we care
// about. The Google/Outlook URLs use ISO without colons (their
// expected format).

export interface CalendarEvent {
  title: string
  /** ISO start. */
  startsAt: string
  durationMinutes: number
  description?: string
  /** Full HTTPS URL the user should click to join. */
  location?: string
  /** Unique stable ID — `<id>@thebigclass.com` style. Required by
   *  RFC 5545; calendars use it to dedupe re-imports of the same
   *  event. Falls back to a hash of (title+startsAt) when omitted. */
  uid?: string
}

// ── ICS generation ─────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

// RFC 5545 wants timestamps as YYYYMMDDTHHMMSSZ in UTC.
function formatIcsTimestamp(iso: string): string {
  const d = new Date(iso)
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  )
}

// Escape per RFC 5545 §3.3.11 — backslashes, commas, semicolons,
// and newlines all need escaping inside TEXT-valued properties.
function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
}

// ICS lines must wrap at 75 octets per RFC 5545 §3.1. We fold
// long lines by inserting CRLF + space at the boundary. Cheap
// safeguard so a long description doesn't make calendars choke.
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = []
  let remaining = line
  out.push(remaining.slice(0, 75))
  remaining = remaining.slice(75)
  while (remaining.length > 0) {
    out.push(" " + remaining.slice(0, 74))
    remaining = remaining.slice(74)
  }
  return out.join("\r\n")
}

function deterministicUid(event: CalendarEvent): string {
  let h = 5381
  const s = `${event.title}|${event.startsAt}`
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${Math.abs(h).toString(36)}@thebigclass.com`
}

export function buildIcs(event: CalendarEvent): string {
  const dtStart = formatIcsTimestamp(event.startsAt)
  const endMs = new Date(event.startsAt).getTime() + event.durationMinutes * 60_000
  const dtEnd = formatIcsTimestamp(new Date(endMs).toISOString())
  const uid = event.uid ?? deterministicUid(event)
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Big Class//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsTimestamp(new Date().toISOString())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : "",
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .map(foldIcsLine)
  return lines.join("\r\n") + "\r\n"
}

// Browser-only: triggers a download of the .ics file.
export function downloadIcs(event: CalendarEvent): void {
  if (typeof window === "undefined") return
  const blob = new Blob([buildIcs(event)], { type: "text/calendar" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${slugify(event.title)}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Defer revoke so Safari's download handler still has the URL
  // when it reads the blob.
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── Per-provider deep links ────────────────────────────────────────

// Google + Outlook use their own datetime formats. We compute both
// here so the consumer just gets a fully-baked href.
function formatGoogleTime(iso: string): string {
  // YYYYMMDDTHHMMSSZ — same as ICS but they accept it verbatim.
  return formatIcsTimestamp(iso)
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const endMs = new Date(event.startsAt).getTime() + event.durationMinutes * 60_000
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleTime(event.startsAt)}/${formatGoogleTime(new Date(endMs).toISOString())}`,
    details: event.description ?? "",
    location: event.location ?? "",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function outlookCalendarUrl(event: CalendarEvent): string {
  const endMs = new Date(event.startsAt).getTime() + event.durationMinutes * 60_000
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startsAt,
    enddt: new Date(endMs).toISOString(),
    body: event.description ?? "",
    location: event.location ?? "",
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

// Apple Calendar opens .ics files served from data: URLs natively
// on macOS + iOS Safari, no extra plumbing required. Other browsers
// will just download the file.
export function appleCalendarHref(event: CalendarEvent): string {
  const ics = buildIcs(event)
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "class"
}
