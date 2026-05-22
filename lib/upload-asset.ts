"use client"

// Uploads a user-supplied image / file and returns a CDN URL the editor +
// renderer can use as <img src>.
//
// Single path: POST to the backend's /api/assets/upload, which pushes to
// Cloudflare R2 and returns the CDN URL. We DELIBERATELY don't keep a
// local-disk fallback in this client — every upload must end up on the
// tenant's CDN so URLs are stable, permanent, and shareable. If R2 isn't
// configured or fails, the backend returns an error and the caller (UI
// upload button) surfaces it as a toast.

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

export async function uploadAsset(
  file: File,
  folder: UploadFolder = "general",
): Promise<UploadResult> {
  const tenant = (() => {
    try {
      return readCurrentTenantSlug() || "shared"
    } catch {
      return "shared"
    }
  })()

  // The ONLY upload destination is the backend's R2-backed endpoint.
  // No silent local-disk fallback — every asset must end up on the CDN
  // so URLs are permanent, cross-device, and load anywhere.
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  if (!apiBase) {
    throw new Error(
      "Upload disabled — NEXT_PUBLIC_API_URL not set. Configure the backend URL so uploads can reach the R2 bucket.",
    )
  }
  const remote = await postToBackend(
    `${apiBase.replace(/\/$/, "")}/api/assets/upload`,
    file,
    tenant,
    folder,
  )
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

