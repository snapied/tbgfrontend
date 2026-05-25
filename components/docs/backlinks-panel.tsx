"use client"

// BacklinksPanel — "what references this doc". Queries the
// ReferenceEdge table for inbound edges and renders human-friendly
// links to each source artifact.

import Link from "next/link"
import { ArrowDownToLine, ArrowUpFromLine, Sparkles } from "lucide-react"
import { useLMS } from "@/lib/lms-store"
import { useDocs } from "@/lib/docs"
import {
  useBacklinks,
  useForwardLinks,
  type ArtifactKind,
  type ReferenceEdge,
} from "@/lib/doc-references"

interface Props {
  docId: string
}

export function BacklinksPanel({ docId }: Props) {
  const inbound = useBacklinks("doc", docId)
  const outbound = useForwardLinks("doc", docId)

  return (
    <div className="space-y-4">
      <Section
        title="Referenced from"
        icon={<ArrowDownToLine className="h-3 w-3" />}
        edges={inbound}
        emptyHint="Nothing references this doc yet. When someone embeds it or mentions it, it'll show up here."
      />
      <Section
        title="This doc references"
        icon={<ArrowUpFromLine className="h-3 w-3" />}
        edges={outbound}
        emptyHint="Use the embed picker to insert a lesson, recording, whiteboard, quiz, or another doc."
      />
    </div>
  )
}

function Section({
  title, icon, edges, emptyHint,
}: { title: string; icon: React.ReactNode; edges: ReferenceEdge[]; emptyHint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border/60 px-3 py-2">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
          {edges.length > 0 && (
            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-foreground">
              {edges.length}
            </span>
          )}
        </p>
      </div>
      {edges.length === 0 ? (
        <p className="px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {edges.slice(0, 30).map((e) => (
            <EdgeRow key={e.id} edge={e} side={icon === undefined ? "out" : "in"} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EdgeRow({ edge }: { edge: ReferenceEdge; side: "in" | "out" }) {
  const { courses, liveSessions, whiteboards, quizzes } = useLMS()
  const { getDoc } = useDocs()

  // For an inbound edge into this doc, we want to describe the
  // FROM side. For an outbound edge from this doc, we describe the
  // TO side. The display logic is the same — just point at
  // different fields.
  const targetKind: ArtifactKind = edge.fromKind === "doc" && edge.kind === "embed"
    ? edge.toKind
    : edge.fromKind
  const targetId   = edge.fromKind === "doc" && edge.kind === "embed"
    ? edge.toId
    : edge.fromId

  const { label, href, hint, emoji } = describeTarget(targetKind, targetId, {
    courses, liveSessions, whiteboards, quizzes,
    getDoc,
  })

  return (
    <li>
      <Link
        href={href ?? "#"}
        className="flex items-start gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-muted/40"
      >
        <span aria-hidden className="text-base">{emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{label}</span>
          {hint && <span className="block truncate text-[10px] text-muted-foreground">{hint}</span>}
        </span>
        {edge.kind === "generated-from" && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary inline-flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> AI
          </span>
        )}
      </Link>
    </li>
  )
}

function describeTarget(
  kind: ArtifactKind,
  id: string,
  stores: {
    courses: ReturnType<typeof useLMS>["courses"]
    liveSessions: ReturnType<typeof useLMS>["liveSessions"]
    whiteboards: ReturnType<typeof useLMS>["whiteboards"]
    quizzes: ReturnType<typeof useLMS>["quizzes"]
    getDoc: ReturnType<typeof useDocs>["getDoc"]
  },
): { label: string; href?: string; hint?: string; emoji: string } {
  switch (kind) {
    case "doc": {
      const d = stores.getDoc(id)
      if (!d) return { label: "Doc (removed)", emoji: "📝" }
      return { label: d.title || "Untitled", href: `/dashboard/docs/${d.id}`, hint: "Doc", emoji: d.icon ?? "📝" }
    }
    case "lesson": {
      for (const c of stores.courses) {
        for (const m of c.modules ?? []) {
          const l = m.lessons.find((x) => x.id === id)
          if (l) return { label: l.title, href: `/dashboard/courses/${c.id}`, hint: `Lesson · ${c.title}`, emoji: "🎓" }
        }
      }
      return { label: "Lesson (removed)", emoji: "🎓" }
    }
    case "course": {
      const c = stores.courses.find((x) => x.id === id)
      if (!c) return { label: "Course (removed)", emoji: "📚" }
      return { label: c.title, href: `/dashboard/courses/${c.id}`, hint: "Course", emoji: "📚" }
    }
    case "recording":
    case "live-session": {
      const s = stores.liveSessions.find((x) => x.id === id)
      if (!s) return { label: "Recording (removed)", emoji: "🎬" }
      return { label: s.title, href: `/dashboard/recordings/${s.id}`, hint: "Recording", emoji: "🎬" }
    }
    case "whiteboard": {
      const w = stores.whiteboards.find((x) => x.id === id)
      if (!w) return { label: "Whiteboard (removed)", emoji: "🎨" }
      return { label: w.title, href: `/dashboard/whiteboards/${w.id}`, hint: "Whiteboard", emoji: "🎨" }
    }
    case "quiz": {
      const q = stores.quizzes.find((x) => x.id === id)
      if (!q) return { label: "Quiz (removed)", emoji: "📝" }
      return { label: q.title, href: `/dashboard/quizzes/${q.id}`, hint: "Quiz", emoji: "📝" }
    }
    case "community-post":
      return { label: "Community post", hint: "Community feed", emoji: "💬" }
    case "community":
      return { label: "Community", hint: "Cohort", emoji: "👥" }
    case "product":
      return { label: "Product", hint: "Storefront", emoji: "🛍️" }
    case "user":
      return { label: "User mention", emoji: "👤" }
  }
}
