"use client"

// Uploads a user-supplied image / file and returns a CDN URL the editor +
// renderer can use as <img src>.
//
// Two upload paths, chosen automatically:
//
//   1. PRESIGNED (video files / files > PRESIGN_THRESHOLD_BYTES):
//      Backend generates a short-lived PUT URL; the browser streams the file
//      body directly to R2. Node memory is never involved — no size limit.
//      Supports real upload progress via XHR. Ideal for 4K video (2-10 GB).
//
//   2. STANDARD (images, PDFs, small clips ≤ PRESIGN_THRESHOLD_BYTES):
//      POST multipart/form-data to the backend which buffers in memory and
//      re-uploads to R2. Simple, backward-compatible.
//
// If R2 isn't configured or the backend is down, both paths surface an error
// the UI can toast — no silent localhost-URL fallback.

import { readCurrentTenantSlug } from "./tenant-store"

/** Folder buckets the backend recognises — anything else lands in "general". */
export type UploadFolder =
  | "general"
  | "blog"
  | "faculty"
  | "courses"
  | "students"
  | "certificates"
  | "recordings"
  | "assignments"
  | "storefront"
  | "workspace"

export interface UploadResult {
  url: string
  /** Always "asset" now — kept on the type for backward-compat with callers. */
  via: "asset"
}

// Files larger than this threshold, OR any video file, use the presigned
// PUT path to avoid buffering through Node. 500 MB is the backend multer cap.
const PRESIGN_THRESHOLD_BYTES = 500 * 1024 * 1024 // 500 MB

function isVideoMime(mime: string) {
  return mime.startsWith("video/")
}

// ─── Standard upload (multipart via backend) ──────────────────────────────

async function postToBackend(
  endpoint: string,
  file: File,
  tenant: string,
  folder: UploadFolder,
): Promise<{ url: string } | { error: string }> {
  try {
    const form = new FormData()
    form.append("file", file)
    if (tenant) form.append("tenant", tenant)
    if (folder) form.append("folder", folder)
    const resp = await fetch(endpoint, {
      method: "POST",
      body: form,
      credentials: "include",
    })
    const json = (await resp.json().catch(() => null)) as
      | { url?: string; error?: string; storage?: string }
      | null
    if (!resp.ok) {
      return { error: json?.error || `Upload failed (${resp.status})` }
    }
    if (!json?.url) return { error: "Upload response missing URL" }
    return { url: json.url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" }
  }
}

// ─── Presigned upload (direct-to-R2 via signed PUT) ──────────────────────

interface PresignResult {
  uploadUrl: string
  publicUrl: string
  key: string
  expiresIn: number
}

/**
 * Upload a file using a presigned PUT URL — the file bytes go directly from
 * the browser to R2, completely bypassing Node. Supports real upload progress.
 *
 * @param onProgress  Called with 0–100 as the upload progresses.
 */
async function presignedUpload(
  apiBase: string,
  file: File,
  tenant: string,
  folder: UploadFolder,
  onProgress?: (pct: number) => void,
): Promise<{ url: string } | { error: string }> {
  try {
    // Step 1 — ask the backend for a signed PUT URL.
    const presignResp = await fetch(`${apiBase}/api/assets/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        mime: file.type,
        filename: file.name,
        bytes: file.size,
        folder,
        tenant,
      }),
    })
    const presign = (await presignResp.json().catch(() => null)) as PresignResult & { error?: string } | null
    if (!presignResp.ok || !presign?.uploadUrl) {
      return { error: presign?.error || `Presign failed (${presignResp.status})` }
    }

    // Step 2 — PUT the raw file body directly to R2 using XHR for progress.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", presign.uploadUrl, true)
      xhr.setRequestHeader("Content-Type", file.type)
      // R2 needs the cache-control header we baked into the presigned command.
      // Note: some browsers block custom headers on cross-origin PUT — R2
      // accepts them because we signed with the exact header values.
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`R2 PUT failed: ${xhr.status} ${xhr.statusText}`))
      }
      xhr.onerror = () => reject(new Error("Network error during R2 PUT"))
      xhr.send(file)
    })

    onProgress?.(100)
    return { url: presign.publicUrl }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Presigned upload failed" }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Upload a file to R2 and return its CDN URL.
 *
 * Automatically picks the presigned path for video files and files
 * over 500 MB so they stream directly to R2 without touching Node.
 */
export async function uploadAsset(
  file: File,
  folder: UploadFolder = "general",
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const tenant = (() => {
    try {
      return readCurrentTenantSlug() || "shared"
    } catch {
      return "shared"
    }
  })()

  const apiBase = process.env.NEXT_PUBLIC_API_URL
  if (!apiBase) {
    throw new Error(
      "Upload disabled — NEXT_PUBLIC_API_URL not set. Configure the backend URL so uploads can reach the R2 bucket.",
    )
  }
  const base = apiBase.replace(/\/$/, "")

  // Use presigned upload for: any video file, OR any file over the threshold.
  // This ensures 4K video (even just a few minutes = several GB) never hits
  // the multer memory buffer.
  const usePresign = isVideoMime(file.type) || file.size > PRESIGN_THRESHOLD_BYTES

  const remote = usePresign
    ? await presignedUpload(base, file, tenant, folder, onProgress)
    : await postToBackend(`${base}/api/assets/upload`, file, tenant, folder)

  if ("url" in remote) return { url: remote.url, via: "asset" }

  // Surface the backend's reason — it tells the user exactly what's
  // wrong (R2 not configured / S3 transient error / file rejected /
  // network down) so they can fix it instead of getting a silent
  // localhost URL that "works in dev but breaks for the student."
  throw new Error(remote.error)
}

export async function uploadDataUrl(
  dataUrl: string,
  filename: string,
  folder: UploadFolder = "general",
): Promise<string> {
  const mime = dataUrl.split(";")[0]?.split(":")[1] || "image/jpeg"
  const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg"
  const dataPart = dataUrl.split(",")[1] ?? ""
  const bin = atob(dataPart)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const file = new File([bytes], `${filename}.${ext}`, { type: mime })
  const result = await uploadAsset(file, folder)
  return result.url
}
