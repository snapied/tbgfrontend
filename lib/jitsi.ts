"use client"

// Jitsi config + JWT fetcher.
//
// Domain is env-driven so the same code targets:
//   - meet.jit.si           — free public Jitsi (default). ⚠️ Anonymous rooms
//                             increasingly get the "waiting for moderator —
//                             please log in" gate. If you hit that, switch to:
//   - meet.ffmuc.net        — Freifunk München, allows anonymous join.
//   - framatalk.org         — Framasoft (EU), allows anonymous join.
//   - your self-hosted box  — best long-term answer for production.
//   - 8x8.vc                — JaaS managed; requires JITSI_APP_ID/SECRET on
//                             the backend so we mint per-user JWTs.
//
// JWT is only minted (via backend) when we're NOT on meet.jit.si — the public
// instance doesn't validate our tokens. Self-hosted Jitsi with JWT auth (prosody
// mod_auth_token) gates room access on the signed claims (moderator, name, etc).

// meet.ffmuc.net (Freifunk München) is the default for the new-tab launch flow.
// Rationale:
//   - meet.jit.si gates anonymous rooms with a "moderator must log in" prompt
//     after a few uses from the same IP, which kills the test flow.
//   - ffmuc has NO moderator gate — first joiner becomes moderator automatically.
//   - ffmuc blocks iframe embedding via X-Frame-Options, but we don't embed
//     anymore on public Jitsi (see JitsiRoom): we open a new tab instead, which
//     bypasses X-Frame-Options entirely.
// Override via NEXT_PUBLIC_JITSI_DOMAIN when you move to JaaS or self-hosted —
// the iframe path returns automatically for non-public domains.
//
// Protocol support:
//   - Bare host like "meet.example.com"     → HTTPS
//   - "http://localhost:8000"               → HTTP (browsers treat localhost as
//                                             a secure context, so WebRTC works)
//   - "https://jitsi.thebigclass.com"       → HTTPS (explicit)
const RAW_JITSI_DOMAIN: string =
  process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.ffmuc.net"

const protocolMatch = RAW_JITSI_DOMAIN.match(/^(https?):\/\/(.+)$/i)
export const JITSI_PROTOCOL: "http" | "https" = (protocolMatch?.[1]?.toLowerCase() as "http" | "https") || "https"
export const JITSI_DOMAIN: string = protocolMatch ? protocolMatch[2] : RAW_JITSI_DOMAIN
export const JITSI_USE_SSL: boolean = JITSI_PROTOCOL === "https"

// Treat the well-known public Jitsi as "don't bother shipping our JWT" — they
// don't honour third-party tokens. Self-hosted / JaaS validate them.
export const IS_PUBLIC_JITSI =
  JITSI_DOMAIN === "meet.jit.si" ||
  JITSI_DOMAIN === "meet.ffmuc.net" ||
  JITSI_DOMAIN === "framatalk.org"

// Prefix keeps room names tidy and avoids colliding with strangers' rooms on
// public Jitsi servers. Default reflects the product brand (The Big Class);
// override per-tenant via NEXT_PUBLIC_JITSI_ROOM_PREFIX if needed.
const ROOM_PREFIX = process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX || "tbc-"

export function jitsiRoomName(roomCodeOrId: string): string {
  // Sanitise the caller-provided code, then prefix with a tenant-ish slug so
  // we never collide with a stranger's meet.jit.si room. The prefix is what
  // makes meet.jit.si treat us as "an app", reducing the chance the room
  // gets caught by their anti-abuse moderator-gate heuristics.
  const safe = roomCodeOrId.replace(/[^a-zA-Z0-9-_]/g, "")
  return `${ROOM_PREFIX}${safe}`
}

/**
 * Single canonical room-code derivation. Host and student MUST go through this
 * helper or they risk landing in different Jitsi rooms — exactly what happened
 * before this existed.
 *
 *   - If session.roomCode is set, use it. (Normal case for in-house rooms.)
 *   - Else derive a stable code from session.id by stripping the "session-"
 *     prefix that lms-store's generateId puts on it. That keeps host + student
 *     in sync even on legacy sessions created before roomCode existed.
 */
export function canonicalRoomCode(session: {
  id: string
  roomCode?: string | null
}): string {
  if (session.roomCode && session.roomCode.trim()) return session.roomCode.trim()
  // Strip "session-" / "wb-" style prefixes so the same session.id always
  // collapses to the same short code regardless of how the caller derived it.
  return session.id.replace(/^[a-z]+-/i, "")
}

/**
 * Direct URL to the same Jitsi room, opened in a new tab instead of an iframe.
 * Useful as an escape hatch when meet.jit.si refuses the iframe (moderator gate)
 * — a standalone tab is gated less aggressively than an embedded one.
 */
export function jitsiRoomUrl(roomCodeOrId: string, displayName?: string): string {
  const room = jitsiRoomName(roomCodeOrId)
  const u = new URL(`${JITSI_PROTOCOL}://${JITSI_DOMAIN}/${room}`)
  if (displayName) {
    // Jitsi reads the userInfo.displayName from this hash payload.
    u.hash = `#userInfo.displayName=%22${encodeURIComponent(displayName)}%22`
  }
  return u.toString()
}

export interface JitsiTokenUser {
  id: string
  name: string
  email?: string
  avatar?: string
}

/**
 * Ask the backend to mint a Jitsi JWT for the given room + user.
 * Returns null on public Jitsi (no token needed) or on failure — JitsiMeeting
 * accepts undefined and the room will work in anonymous mode.
 */
export async function fetchJitsiToken(opts: {
  roomName: string
  user: JitsiTokenUser
  moderator: boolean
}): Promise<string | null> {
  if (IS_PUBLIC_JITSI) return null
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
  try {
    const res = await fetch(`${apiBase}/api/live-sessions/jitsi-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(opts),
    })
    if (!res.ok) return null
    const j = await res.json()
    return typeof j.token === "string" ? j.token : null
  } catch {
    return null
  }
}

export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}
