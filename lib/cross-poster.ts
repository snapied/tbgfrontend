"use client"

// Universal cross-poster — one primitive every artifact can use to
// fan out to multiple channels (LinkedIn / X / WhatsApp /
// communities / email subscribers) from a single dialog.
//
// Each channel knows how to:
//   • compose a per-channel message from the artifact descriptor
//   • dispatch (open a share URL, mailto:, addBatchPost, etc.)
//
// We don't ship server-side wiring for LinkedIn/X/email yet — those
// open the canonical sharer URLs that the user confirms in a new
// tab. Communities + WhatsApp are fully wired client-side.
//
// API:
//   const result = await postToChannels({
//     artifact: { kind: "blog-post", title, url, description, thumbnailUrl, hashtags },
//     channels: { linkedin, x, whatsapp, communities: [id, …], email },
//     deps: { addBatchPost, generateId, currentUser },
//   })
//   result.attempted  // string[]
//   result.succeeded  // string[]
//   result.failed     // {channel, reason}[]

import type { BatchPost } from "@/lib/lms-store"

export type CrossPosterArtifactKind =
  | "blog-post"
  | "page"
  | "course"
  | "testimonial"
  | "whiteboard"
  | "certificate"

export interface CrossPosterArtifact {
  kind: CrossPosterArtifactKind
  title: string
  /** Canonical URL that gets cross-posted. */
  url: string
  /** Short description used by share previews. */
  description?: string
  /** Image URL for OG previews. Not all sharers respect it. */
  thumbnailUrl?: string
  /** Optional hashtag list (used by X composer). */
  hashtags?: string[]
}

export interface ChannelSelections {
  linkedin?: boolean
  x?: boolean
  whatsapp?: { numbers: string[] } | { broadcast: true }
  /** Community batchIds — addBatchPost called per id. */
  communities?: string[]
  /** Email — list of recipient addresses (BCC). */
  email?: { to: string[]; subject?: string }
}

export interface CrossPosterDeps {
  /** Bound from useLMS() at the call site. */
  addBatchPost: (post: BatchPost) => void
  generateId: (prefix: string) => string
  currentUser?: { id?: string; name?: string }
  /** Optional per-channel message override. When omitted, we use the
   *  default composer that interpolates the artifact title + URL. */
  composer?: Partial<Record<keyof ChannelSelections, (a: CrossPosterArtifact) => string>>
}

export interface CrossPosterResult {
  attempted: string[]
  succeeded: string[]
  failed: { channel: string; reason: string }[]
}

const DEFAULT_COMPOSE = (a: CrossPosterArtifact): string => {
  const tail = a.description ? `\n\n${a.description}` : ""
  return `${a.title}${tail}\n\n${a.url}`
}

/** Fire-and-track every selected channel. Channel openings that
 *  require user confirmation (LinkedIn/X share dialogs, mailto)
 *  open in a new tab — we count "tab opened" as success since we
 *  can't observe the user's final action. */
export async function postToChannels({
  artifact,
  channels,
  deps,
}: {
  artifact: CrossPosterArtifact
  channels: ChannelSelections
  deps: CrossPosterDeps
}): Promise<CrossPosterResult> {
  const attempted: string[] = []
  const succeeded: string[] = []
  const failed: { channel: string; reason: string }[] = []

  // ── LinkedIn ──────────────────────────────────────────────────────
  if (channels.linkedin && typeof window !== "undefined") {
    attempted.push("linkedin")
    try {
      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(artifact.url)}`
      window.open(url, "_blank", "noopener,noreferrer")
      succeeded.push("linkedin")
    } catch (err) {
      failed.push({ channel: "linkedin", reason: (err as Error).message })
    }
  }

  // ── X (Twitter) ───────────────────────────────────────────────────
  if (channels.x && typeof window !== "undefined") {
    attempted.push("x")
    try {
      const compose = deps.composer?.x ?? DEFAULT_COMPOSE
      const text = compose(artifact)
      const hashtags = artifact.hashtags?.join(",")
      const params = new URLSearchParams({
        text,
        url: artifact.url,
        ...(hashtags ? { hashtags } : {}),
      })
      window.open(`https://twitter.com/intent/tweet?${params.toString()}`, "_blank", "noopener,noreferrer")
      succeeded.push("x")
    } catch (err) {
      failed.push({ channel: "x", reason: (err as Error).message })
    }
  }

  // ── WhatsApp ──────────────────────────────────────────────────────
  if (channels.whatsapp && typeof window !== "undefined") {
    attempted.push("whatsapp")
    try {
      const compose = deps.composer?.whatsapp ?? DEFAULT_COMPOSE
      const text = compose(artifact)
      if ("broadcast" in channels.whatsapp) {
        // Open a single wa.me link with no phone — opens the
        // share-anywhere screen in the user's WhatsApp client.
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer",
        )
      } else {
        // Per-recipient sequence with a 250ms stagger so the
        // browser's popup blocker doesn't gobble the batch.
        channels.whatsapp.numbers.forEach((raw, i) => {
          const phone = raw.replace(/[^0-9]/g, "")
          if (!phone) return
          window.setTimeout(() => {
            window.open(
              `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
              "_blank",
              "noopener,noreferrer",
            )
          }, i * 250)
        })
      }
      succeeded.push("whatsapp")
    } catch (err) {
      failed.push({ channel: "whatsapp", reason: (err as Error).message })
    }
  }

  // ── Communities (batch posts) ─────────────────────────────────────
  if (channels.communities && channels.communities.length > 0) {
    attempted.push("communities")
    try {
      const compose = deps.composer?.communities ?? DEFAULT_COMPOSE
      const body = compose(artifact)
      const now = new Date().toISOString()
      channels.communities.forEach((batchId) => {
        const post: BatchPost = {
          id: deps.generateId("post"),
          batchId,
          authorId: deps.currentUser?.id ?? "unknown",
          body,
          embedUrl: artifact.url,
          pinned: false,
          hidden: false,
          comments: [],
          createdAt: now,
          updatedAt: now,
        }
        deps.addBatchPost(post)
      })
      succeeded.push("communities")
    } catch (err) {
      failed.push({ channel: "communities", reason: (err as Error).message })
    }
  }

  // ── Email (mailto) ───────────────────────────────────────────────
  if (channels.email && channels.email.to.length > 0 && typeof window !== "undefined") {
    attempted.push("email")
    try {
      const compose = deps.composer?.email ?? DEFAULT_COMPOSE
      const body = compose(artifact)
      const bcc = channels.email.to.join(",")
      const subject = channels.email.subject ?? artifact.title
      const url = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(url, "_blank")
      succeeded.push("email")
    } catch (err) {
      failed.push({ channel: "email", reason: (err as Error).message })
    }
  }

  return { attempted, succeeded, failed }
}
