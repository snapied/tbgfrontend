"use client"

// Cross-browser room-state sync helper.
//
// The host pushes state changes to the backend; everyone else polls.
//
// Endpoints (defined in backend/src/routes/liveSessions.ts):
//   GET  /api/live-sessions/<roomCode>/state
//   PUT  /api/live-sessions/<roomCode>/state
//
// We accept "no record found" as state="scheduled" — that's the natural default
// for a room nobody has touched server-side yet. Local-first; if the network
// fails the host keeps working off localStorage just like before.

export type LiveRoomStateValue = "scheduled" | "open" | "live" | "ended"

export interface LiveRoomStatePayload {
  roomCode: string
  state: LiveRoomStateValue
  scheduledAt: string | null
  durationMinutes: number | null
  title: string | null
  hostName: string | null
  recordingUrl: string | null
  /** Public URL of the WebVTT captions sidecar, written by the
   *  egress poller's Whisper step. Null until the recording is
   *  finalised + transcribed. */
  transcriptUrl?: string | null
  /** Plain-text transcript for the post-class panel. */
  transcriptText?: string | null
  /** Last egress error, if any. */
  recordingError?: string | null
  /** True while LiveKit egress is still processing the file. */
  recordingInProgress?: boolean
  updatedAt: string | null
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

// ACCESS_TOKEN_KEY mirrors the constant in billing-client.ts; we
// don't import to avoid a circular pull through the billing module
// just for one string. The login flow writes the access token to
// this localStorage key after auth/login.
const ACCESS_TOKEN_KEY = "thebigclass.accessToken"
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Coalesce concurrent refresh attempts — we hit /api/auth/refresh
// from multiple places (billing, live-room, whiteboard) and a single
// retry burst would otherwise mint N tokens. First caller wins;
// everyone else awaits the same promise.
let _refreshInFlight: Promise<boolean> | null = null
async function tryRefreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (_refreshInFlight) return _refreshInFlight
  _refreshInFlight = fetch(`${apiBase()}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (r) => {
      if (!r.ok) return false
      const body = (await r.json().catch(() => null)) as { accessToken?: string } | null
      if (!body?.accessToken) return false
      window.localStorage.setItem(ACCESS_TOKEN_KEY, body.accessToken)
      return true
    })
    .catch(() => false)
    .finally(() => {
      _refreshInFlight = null
    })
  return _refreshInFlight
}

/**
 * Push partial state to the backend. Only the fields you pass are written;
 * everything else stays as-is.
 *
 * REQUIRES auth — the backend route is `requireAuth`, so the host's
 * access token (written to localStorage by the login flow) must be
 * sent as a Bearer header. Without it the PUT silently 401s, the
 * server never records the host's "Open the room" click, and
 * students polling from another browser are stuck on the default
 * "scheduled" state forever. That was the user-flagged "student stays
 * in the waiting room even though host joined" bug.
 */
async function putRoomState(
  roomCode: string,
  patch: Partial<Omit<LiveRoomStatePayload, "roomCode" | "updatedAt">>,
): Promise<Response> {
  return fetch(`${apiBase()}/api/live-sessions/${encodeURIComponent(roomCode)}/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(patch),
  })
}

export async function pushRoomState(
  roomCode: string,
  patch: Partial<Omit<LiveRoomStatePayload, "roomCode" | "updatedAt">>,
): Promise<boolean> {
  if (!roomCode) return false
  try {
    let res = await putRoomState(roomCode, patch)
    // On 401 the stored access token is stale (or never existed).
    // Try the refresh-cookie path once — most users have a valid
    // refresh cookie even when the access token expired — then
    // retry the PUT. This recovers from the "host's token went
    // stale, students stuck in lobby" failure mode automatically,
    // so the host doesn't have to log out + back in mid-class.
    if (res.status === 401) {
      const refreshed = await tryRefreshAccessToken()
      if (refreshed) {
        res = await putRoomState(roomCode, patch)
      }
    }
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[pushRoomState] PUT failed ${res.status} for room=${roomCode}` +
          (res.status === 401
            ? " — refresh cookie also expired; host must sign in again"
            : ""),
      )
    }
    return res.ok
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[pushRoomState] network error for room=${roomCode}:`, err)
    return false
  }
}

/** Read the current state for a room. Returns null on network error. */
export async function fetchRoomState(roomCode: string): Promise<LiveRoomStatePayload | null> {
  if (!roomCode) return null
  try {
    const res = await fetch(
      `${apiBase()}/api/live-sessions/${encodeURIComponent(roomCode)}/state`,
      { credentials: "include" },
    )
    if (!res.ok) return null
    return (await res.json()) as LiveRoomStatePayload
  } catch {
    return null
  }
}

export interface TranscribeResult {
  ok: true
  transcriptUrl: string
  transcriptText: string | null
}

/**
 * Backfill transcription for an existing recording. Returns the new
 * VTT URL + plain text on success, an error string on failure.
 * Runs server-side — the response can take a couple of minutes for
 * a long class.
 */
export async function requestTranscription(
  roomCode: string,
): Promise<TranscribeResult | { error: string }> {
  if (!roomCode) return { error: "missing roomCode" }
  try {
    const res = await fetch(
      `${apiBase()}/api/live-sessions/${encodeURIComponent(roomCode)}/transcribe`,
      { method: "POST", credentials: "include", headers: authHeaders() },
    )
    if (!res.ok) {
      try {
        const body = (await res.json()) as { error?: string }
        return { error: body.error || `Request failed (${res.status})` }
      } catch {
        return { error: `Request failed (${res.status})` }
      }
    }
    return (await res.json()) as TranscribeResult
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" }
  }
}
