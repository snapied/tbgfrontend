// Metadata for the /help index lives here because the index page
// itself is now a client component (it owns the live fuzzy-search +
// "/" shortcut state) and a client component can't export `metadata`.
// Individual articles at /help/[slug] set their own metadata via their
// own generateMetadata, which takes precedence over this default.
import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Help & guides · The Big Class",
  description:
    "Every guide for creators, learners, and developers — one searchable index. From inviting your first faculty member to issuing an API key.",
}

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children
}
