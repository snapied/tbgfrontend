// Helpers for working with lesson content URLs.
//
// The store keeps lessons "dumb" — content is just a string. These helpers turn
// that string into something renderable: a provider name, an embeddable URL,
// the right viewer flavor, etc. Centralising this here means the editor and
// the viewer always agree on what a URL means.

import type { LessonType } from "./lms-store"

export type VideoProvider = "youtube" | "vimeo" | "loom" | "bunny" | "file" | "unknown"
export type EmbedProvider =
  | "canva"
  | "gamma"
  | "google-docs"
  | "google-slides"
  | "google-sheets"
  | "notion"
  | "figma"
  | "loom"
  | "miro"
  | "youtube"
  | "vimeo"
  | "iframe"
export type DocumentKind = "pdf" | "doc" | "ppt" | "xlsx" | "txt" | "other"

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv"])
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "aac", "m4a", "flac"])
const DOCUMENT_EXTS: Record<string, DocumentKind> = {
  pdf: "pdf",
  doc: "doc", docx: "doc",
  ppt: "ppt", pptx: "ppt",
  xls: "xlsx", xlsx: "xlsx",
  txt: "txt",
}

function extOf(url: string): string {
  try {
    const u = new URL(url)
    const parts = u.pathname.split(".")
    if (parts.length < 2) return ""
    return parts[parts.length - 1].toLowerCase()
  } catch {
    return ""
  }
}

export function detectVideoProvider(url: string): VideoProvider {
  if (!url) return "unknown"
  const u = url.toLowerCase()
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube"
  if (u.includes("vimeo.com")) return "vimeo"
  if (u.includes("loom.com")) return "loom"
  if (u.includes("b-cdn.net") || u.includes("bunnycdn.com") || u.includes("mediadelivery.net")) return "bunny"
  if (VIDEO_EXTS.has(extOf(url))) return "file"
  return "unknown"
}

export function detectEmbedProvider(url: string): EmbedProvider {
  if (!url) return "iframe"
  const u = url.toLowerCase()
  if (u.includes("canva.com")) return "canva"
  if (u.includes("gamma.app")) return "gamma"
  if (u.includes("docs.google.com/presentation")) return "google-slides"
  if (u.includes("docs.google.com/spreadsheets")) return "google-sheets"
  if (u.includes("docs.google.com")) return "google-docs"
  if (u.includes("notion.so") || u.includes("notion.site")) return "notion"
  if (u.includes("figma.com")) return "figma"
  if (u.includes("loom.com")) return "loom"
  if (u.includes("miro.com")) return "miro"
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube"
  if (u.includes("vimeo.com")) return "vimeo"
  return "iframe"
}

export function detectDocumentKind(url: string): DocumentKind {
  return DOCUMENT_EXTS[extOf(url)] ?? "other"
}

// Guess the right lesson type from a pasted URL. Used in the editor when the
// instructor hasn't explicitly picked a type yet.
export function inferLessonType(url: string): LessonType {
  if (!url) return "video"
  const u = url.toLowerCase()
  // explicit video/audio file extensions
  const ext = extOf(url)
  if (VIDEO_EXTS.has(ext)) return "video"
  if (AUDIO_EXTS.has(ext)) return "audio"
  if (ext === "pdf") return "document"
  if (DOCUMENT_EXTS[ext]) return "document"
  // known video providers
  if (detectVideoProvider(url) !== "unknown" && detectVideoProvider(url) !== "file") return "video"
  // anything else iframeable → embed
  if (
    u.includes("canva.com") || u.includes("gamma.app") ||
    u.includes("docs.google.com") || u.includes("notion.so") ||
    u.includes("notion.site") || u.includes("figma.com") ||
    u.includes("miro.com")
  ) return "embed"
  return "video"
}

// ---------------- URL builders ----------------

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m ? m[1] : null
}
export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}
export function loomId(url: string): string | null {
  const m = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/)
  return m ? m[1] : null
}

/** Returns an iframe-safe URL for the given video URL. Null if not embeddable. */
export function videoEmbedUrl(url: string): string | null {
  const provider = detectVideoProvider(url)
  if (provider === "youtube") {
    const id = youtubeId(url)
    return id ? `https://www.youtube.com/embed/${id}?rel=0` : null
  }
  if (provider === "vimeo") {
    const id = vimeoId(url)
    return id ? `https://player.vimeo.com/video/${id}` : null
  }
  if (provider === "loom") {
    const id = loomId(url)
    return id ? `https://www.loom.com/embed/${id}` : null
  }
  if (provider === "bunny") return url  // Bunny iframe URLs are already embed-safe
  return null
}

/** Builds an iframe URL for general embeds. Many providers (Canva/Notion/etc.) accept their public URL directly. */
export function embedUrl(url: string): string {
  const provider = detectEmbedProvider(url)
  if (provider === "youtube") {
    const id = youtubeId(url)
    if (id) return `https://www.youtube.com/embed/${id}?rel=0`
  }
  if (provider === "vimeo") {
    const id = vimeoId(url)
    if (id) return `https://player.vimeo.com/video/${id}`
  }
  if (provider === "loom") {
    const id = loomId(url)
    if (id) return `https://www.loom.com/embed/${id}`
  }
  if (provider === "figma") {
    return `https://www.figma.com/embed?embed_host=thebigclass&url=${encodeURIComponent(url)}`
  }
  // Canva: append /view?embed if user pasted /design/...
  if (provider === "canva" && !url.includes("?embed") && !url.endsWith("/view")) {
    return url.replace(/\/?$/, "/view?embed")
  }
  // Notion / Gamma / Google docs / Miro accept their canonical URL.
  return url
}

/** Returns a viewer URL for non-PDF Office documents (DOC/PPT/XLSX) using
 * Microsoft's Office Online viewer. The source URL must be publicly reachable. */
export function officeViewerUrl(url: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
}

export function providerLabel(provider: VideoProvider | EmbedProvider): string {
  switch (provider) {
    case "youtube": return "YouTube"
    case "vimeo": return "Vimeo"
    case "loom": return "Loom"
    case "bunny": return "Bunny CDN"
    case "file": return "File"
    case "canva": return "Canva"
    case "gamma": return "Gamma"
    case "google-docs": return "Google Docs"
    case "google-slides": return "Google Slides"
    case "google-sheets": return "Google Sheets"
    case "notion": return "Notion"
    case "figma": return "Figma"
    case "miro": return "Miro"
    case "iframe": return "Web page"
    default: return "Link"
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
