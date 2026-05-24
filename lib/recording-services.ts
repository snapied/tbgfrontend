"use client"

// Recording-side service stubs — Sprint C Recordings #18 + #28.
//
// Two surfaces:
//   • requestAutoCaption(sessionId)  →  triggers a server-side
//     Whisper / similar transcription job. Returns the job id + a
//     polling key. Implementation is a stub here; the real server
//     hooks land in /api/recordings/captions on the backend.
//   • requestOfflineDownload(sessionId)  →  asks the backend to mint
//     a short-lived signed URL the user can save locally. We don't
//     stream the bytes through the browser — we hand off to a
//     native download.
//
// Why client primitives even before the server exists:
//   1. Consumers (RecordingDetailsSheet, the eventual mobile app,
//      bulk admin tools) can wire to a stable surface today.
//   2. Replacing the stub body with a real fetch is a one-line
//      change once the backend lands.
//   3. The optimistic state (queued / processing / ready) is the
//      tricky UX bit; we'd build it either way.

export interface CaptionJob {
  jobId: string
  /** ISO timestamp the job was queued. */
  queuedAt: string
  /** Polling key — client passes this back to checkCaptionStatus. */
  pollingKey: string
}

export interface OfflineDownload {
  /** Signed URL the browser can download. Expires in `expiresIn`
   *  seconds — typically ~24h. */
  url: string
  expiresIn: number
  /** Suggested filename for the download. */
  filename: string
}

/** Queue an auto-caption job for the given live session. The real
 *  backend uses Whisper-large (or a fallback) and writes the .vtt
 *  output to the session's storage bucket. The poller then surfaces
 *  the captions on the transcript side panel.
 *
 *  Returns null when:
 *   • The session has no recording URL yet (queue is pointless).
 *   • The backend rejects (returns non-2xx).
 */
export async function requestAutoCaption(
  sessionId: string,
): Promise<CaptionJob | null> {
  if (typeof window === "undefined") return null
  try {
    const res = await fetch(`/api/recordings/${encodeURIComponent(sessionId)}/captions`, {
      method: "POST",
    })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<CaptionJob>
    if (!data.jobId || !data.pollingKey) return null
    return {
      jobId: data.jobId,
      queuedAt: data.queuedAt ?? new Date().toISOString(),
      pollingKey: data.pollingKey,
    }
  } catch {
    return null
  }
}

/** Poll caption job status. Backend returns one of:
 *   - "queued"     — still waiting in line
 *   - "running"    — Whisper is chewing through audio
 *   - "ready"      — .vtt + transcript JSON are saved
 *   - "failed"     — terminal; caller can show error + retry
 */
export type CaptionStatus = "queued" | "running" | "ready" | "failed"

export async function checkCaptionStatus(
  pollingKey: string,
): Promise<CaptionStatus> {
  if (typeof window === "undefined") return "queued"
  try {
    const res = await fetch(
      `/api/recordings/captions/status?key=${encodeURIComponent(pollingKey)}`,
    )
    if (!res.ok) return "failed"
    const data = (await res.json()) as { status?: CaptionStatus }
    return data.status ?? "queued"
  } catch {
    return "failed"
  }
}

/** Request a signed download URL for the given recording. The
 *  backend checks recordingVisibility + the caller's permissions
 *  before minting the URL. Browsers handle the actual file save via
 *  a native <a download> click — we don't stream bytes through JS.
 *
 *  Returns null when:
 *   • The recording isn't downloadable (e.g. visibility = public
 *     but `downloadEnabled` is false on the session).
 *   • The caller isn't authorised.
 */
export async function requestOfflineDownload(
  sessionId: string,
): Promise<OfflineDownload | null> {
  if (typeof window === "undefined") return null
  try {
    const res = await fetch(`/api/recordings/${encodeURIComponent(sessionId)}/download`, {
      method: "POST",
    })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<OfflineDownload>
    if (!data.url || typeof data.expiresIn !== "number") return null
    return {
      url: data.url,
      expiresIn: data.expiresIn,
      filename: data.filename ?? `recording-${sessionId}.mp4`,
    }
  } catch {
    return null
  }
}

/** Fire a native download — the browser handles the actual save.
 *  We use <a download> rather than fetching + Blob because:
 *    • Large files would otherwise eat RAM as Blobs.
 *    • CORS headers on the signed URL are CDN-controlled; the
 *      download attribute lets the browser stream straight from
 *      the CDN.
 */
export function triggerNativeDownload(d: OfflineDownload): void {
  if (typeof window === "undefined") return
  const a = document.createElement("a")
  a.href = d.url
  a.download = d.filename
  a.rel = "noopener noreferrer"
  // Some browsers (Safari) need the link in the DOM before click().
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
