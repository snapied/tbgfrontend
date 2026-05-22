"use client"

// LiveKit config + token fetcher.
//
// Two env values drive everything:
//   - NEXT_PUBLIC_LIVEKIT_URL: the WebSocket URL of your LiveKit server.
//       LiveKit Cloud  → wss://<project>.livekit.cloud
//       Self-hosted    → wss://livekit.yourdomain.com
//   - Backend (server-only): LIVEKIT_API_KEY + LIVEKIT_API_SECRET
//
// The browser never sees the API secret — it only ever receives a short-lived
// signed access token from /api/live-sessions/livekit-token.

export const LIVEKIT_URL: string =
  process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://localhost"

// Room-name prefix avoids collisions on shared LiveKit Cloud projects and
// keeps an at-a-glance brand prefix in the dashboard.
const ROOM_PREFIX = process.env.NEXT_PUBLIC_LIVEKIT_ROOM_PREFIX || "tbc-"

export function livekitRoomName(roomCodeOrId: string): string {
  const safe = roomCodeOrId.replace(/[^a-zA-Z0-9-_]/g, "")
  return `${ROOM_PREFIX}${safe}`
}

export interface LiveKitTokenUser {
  id: string
  name: string
  email?: string
  avatar?: string
}

export async function fetchLiveKitToken(opts: {
  roomName: string
  user: LiveKitTokenUser
  moderator: boolean
}): Promise<string | null> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
  try {
    const res = await fetch(`${apiBase}/api/live-sessions/livekit-token`, {
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
