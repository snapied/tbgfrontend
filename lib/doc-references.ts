"use client"

// ReferenceEdge — the universal cross-link table.
//
// Every time something references something else (embed, mention,
// attachment, AI-generation), we write one edge here. Backlinks
// and recommendations are queries on this table.
//
// Why a separate primitive (not edges-on-each-entity): a single
// global table makes the inverse query trivial. "What references
// this recording?" = filter rows where toKind=recording, toId=X.
// If edges lived on the embedding side only, the recording would
// have no idea it was referenced.
//
// Today this is localStorage; same shape moves to a server table
// (Postgres or otherwise) without consumer changes.

import { useCallback, useSyncExternalStore } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

export type ReferenceKind =
  | "embed"          // a Doc embed-block points at this artifact
  | "mention"        // a Doc text mentions this artifact (@-style)
  | "attach"         // an artifact has this Doc attached as a tab/handbook
  | "generated-from" // this Doc was AI-generated from that artifact (e.g. session transcript)

export type ArtifactKind =
  | "doc"
  | "lesson"
  | "course"
  | "community-post"
  | "community"          // batch itself (for "community handbook" attachments)
  | "recording"          // LiveSession id with a recording
  | "live-session"       // LiveSession id (any state)
  | "whiteboard"
  | "quiz"
  | "product"            // store product
  | "user"

export interface ReferenceEdge {
  id: string
  fromKind: ArtifactKind
  fromId: string
  toKind: ArtifactKind
  toId: string
  kind: ReferenceKind
  createdAt: string
  createdBy?: string
}

const KEY = (slug: string) => `thebigclass.t.${slug}.docReferences.v1`

function readAll(): ReferenceEdge[] {
  if (typeof window === "undefined") return []
  const slug = readCurrentTenantSlug()
  if (!slug) return []
  try {
    const raw = window.localStorage.getItem(KEY(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReferenceEdge[]
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writeAll(edges: ReferenceEdge[]): void {
  if (typeof window === "undefined") return
  const slug = readCurrentTenantSlug()
  if (!slug) return
  try {
    window.localStorage.setItem(KEY(slug), JSON.stringify(edges))
    window.dispatchEvent(new StorageEvent("storage", { key: KEY(slug) }))
  } catch { /* quota — best-effort */ }
}

export function addReferenceEdge(args: Omit<ReferenceEdge, "id" | "createdAt"> & { createdAt?: string }): ReferenceEdge {
  const edge: ReferenceEdge = {
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: args.createdAt ?? new Date().toISOString(),
    ...args,
  }
  writeAll([...readAll(), edge])
  return edge
}

export function removeReferenceEdges(filter: Partial<Pick<ReferenceEdge, "fromKind" | "fromId" | "toKind" | "toId" | "kind">>): void {
  const all = readAll()
  const remaining = all.filter((e) => {
    // Predicate intent: keep the row when ANY filter field doesn't
    // match the edge — i.e. drop only when every filter field matches.
    for (const k of Object.keys(filter) as Array<keyof typeof filter>) {
      const v = filter[k]
      if (v != null && (e as unknown as Record<string, unknown>)[k] !== v) return true
    }
    return false
  })
  if (remaining.length === all.length) return
  writeAll(remaining)
}

/** Sync a doc's outgoing embed edges to match its current block list.
 *  Call this on every doc save — it diffs the existing edges against
 *  the current set of embed blocks and adds/removes accordingly. */
export function syncDocEmbedEdges(
  docId: string,
  embeds: Array<{ toKind: ArtifactKind; toId: string }>,
  createdBy?: string,
): void {
  const all = readAll()
  // Drop all existing "embed" edges originating from this doc.
  const filtered = all.filter((e) => !(e.fromKind === "doc" && e.fromId === docId && e.kind === "embed"))
  // Re-add fresh edges for the current embeds.
  const fresh: ReferenceEdge[] = embeds.map((em) => ({
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fromKind: "doc",
    fromId: docId,
    toKind: em.toKind,
    toId: em.toId,
    kind: "embed",
    createdAt: new Date().toISOString(),
    createdBy,
  }))
  writeAll([...filtered, ...fresh])
}

/** All edges where (toKind, toId) === target — "what references me". */
export function getBacklinks(toKind: ArtifactKind, toId: string): ReferenceEdge[] {
  return readAll().filter((e) => e.toKind === toKind && e.toId === toId)
}

/** All edges where (fromKind, fromId) === source — "what do I reference". */
export function getForwardLinks(fromKind: ArtifactKind, fromId: string): ReferenceEdge[] {
  return readAll().filter((e) => e.fromKind === fromKind && e.fromId === fromId)
}

// React hooks
export function useBacklinks(toKind: ArtifactKind, toId: string): ReferenceEdge[] {
  const subscribe = useCallback((cb: () => void) => {
    if (typeof window === "undefined") return () => {}
    const slug = readCurrentTenantSlug()
    if (!slug) return () => {}
    const target = KEY(slug)
    function onStorage(e: StorageEvent) { if (e.key === null || e.key === target) cb() }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  const getSnapshot = useCallback(() => JSON.stringify(getBacklinks(toKind, toId)), [toKind, toId])
  const getServerSnapshot = useCallback(() => "[]", [])
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return JSON.parse(serialized) as ReferenceEdge[]
}

export function useForwardLinks(fromKind: ArtifactKind, fromId: string): ReferenceEdge[] {
  const subscribe = useCallback((cb: () => void) => {
    if (typeof window === "undefined") return () => {}
    const slug = readCurrentTenantSlug()
    if (!slug) return () => {}
    const target = KEY(slug)
    function onStorage(e: StorageEvent) { if (e.key === null || e.key === target) cb() }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  const getSnapshot = useCallback(() => JSON.stringify(getForwardLinks(fromKind, fromId)), [fromKind, fromId])
  const getServerSnapshot = useCallback(() => "[]", [])
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return JSON.parse(serialized) as ReferenceEdge[]
}
