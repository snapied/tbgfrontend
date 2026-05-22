// Read-only renderer for HTML produced by <RichTextEditor>.
//
// The `.tiptap-content` class (defined in app/globals.css) carries the
// shared prose styles so what students see matches what the teacher
// authored in the editor. Output is XSS-safe by virtue of Tiptap's
// schema — only known nodes/marks survive the parse — but never pipe
// user-provided raw HTML through this without going through the editor
// first.

import { cn } from "@/lib/utils"

interface Props {
  html: string
  className?: string
}

export function RichTextContent({ html, className }: Props) {
  if (!html) return null
  return (
    <div
      className={cn("tiptap-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// Tiptap serializes an empty document as "<p></p>" — a plain `!html` check
// would treat that as truthy. Use this anywhere you need "did the user
// type anything?" (form validation, dirty checks, conditional rendering).
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true
  return !html.replace(/<[^>]*>/g, "").trim()
}

// Strip HTML tags and decode the common entities so a rich-text field can
// be safely rendered as plain text — meta tags, OpenGraph descriptions,
// list snippets with line-clamp, search index payloads. Don't use this
// when you want the actual formatted output — use <RichTextContent /> for
// that.
export function stripRichTextTags(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}
