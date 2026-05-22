// File-upload endpoint for the POC. Writes the uploaded file to
// `public/uploads/<tenant>/<uuid>.<ext>` and returns the public path the
// client should store + use as <img src>.
//
// Why filesystem and not a data URL: data URLs are 4× larger than the
// raw bytes, get stored verbatim in localStorage (5 MB origin quota),
// and stretch any plain-text rendering of the URL across the screen.
// Writing to /public/uploads keeps localStorage holding paths like
// "/uploads/acme/8f3e.jpg" which fit in 30 bytes and render correctly.
//
// Production swap: replace the writeFile() below with a putObject() to
// Cloudflare R2 (or S3) using credentials the user will provide later.
// The route shape stays the same so no client changes are needed.

import { mkdir, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"

// Sanity limits — anything above this is the user uploading the wrong
// file. The 50 MB cap matches our soft cap in the FileUploadField.
const MAX_BYTES = 50 * 1024 * 1024

// Allowlist drives both the Content-Type check and the file extension.
// Adding a new MIME here is the single edit point.
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/webm": "weba",
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "ttf",
  "font/otf": "otf",
  "application/font-woff2": "woff2",
  "application/font-woff": "woff",
  "application/x-font-ttf": "ttf",
  "application/x-font-otf": "otf",
  // Some browsers send empty MIME for fonts — match by extension via
  // the fallback path in POST below.
  "": "bin",
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Missing 'file' part in form-data." },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: `File is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).` },
        { status: 413 },
      )
    }

    // Resolve extension from MIME first; if the browser sent an empty
    // type (common for fonts), fall back to the filename extension.
    let ext = MIME_EXT[file.type]
    if (!ext || ext === "bin") {
      const m = /\.([a-z0-9]{1,5})$/i.exec(file.name)
      const fromName = m?.[1]?.toLowerCase()
      const allowedByName = new Set([
        "woff2", "woff", "ttf", "otf", "jpg", "jpeg", "png", "webp", "gif", "svg", "ico", "pdf", "mp4", "webm", "mp3", "wav",
      ])
      if (fromName && allowedByName.has(fromName)) {
        ext = fromName === "jpeg" ? "jpg" : fromName
      } else {
        return NextResponse.json(
          { ok: false, error: `Unsupported file type: ${file.type || "(unknown)"}` },
          { status: 415 },
        )
      }
    }

    // Bucket per tenant when we know which workspace this belongs to —
    // keeps cleanup easy when a workspace is deleted, and stops one
    // workspace's uploads from being trivially enumerated by another.
    // Falls back to "shared" when the caller didn't tag the upload.
    const tenant = (form.get("tenant") as string | null)?.trim() || "shared"
    const safeTenant = tenant.replace(/[^a-z0-9-_]/gi, "").slice(0, 64) || "shared"

    const id = randomUUID().replace(/-/g, "").slice(0, 16)
    const filename = `${id}.${ext}`
    const dir = path.join(process.cwd(), "public", "uploads", safeTenant)
    if (!existsSync(dir)) await mkdir(dir, { recursive: true })
    const filepath = path.join(dir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const url = `/uploads/${safeTenant}/${filename}`
    return NextResponse.json({
      ok: true,
      url,
      bytes: buffer.length,
      mime: file.type,
      filename: file.name,
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "Upload failed." },
      { status: 500 },
    )
  }
}
