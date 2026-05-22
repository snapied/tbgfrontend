// Server-side persistence for the portal store. Mirrors the
// localStorage keyspace defined in lib/portal-store.tsx so the public
// /p/<slug>/* surfaces show the same brand/pages/content to every
// visitor — not just the browser that did the editing.
//
// Storage: one JSON file per tenant at
//   <repo>/web/.portal-state/<slug>.json
// containing a flat map of { keyName: value }.
//
// .portal-state/ is gitignored. In a real backend this becomes a
// table; the surface area we use here ({ load, upsert }) stays
// compatible.

import { promises as fs } from "fs"
import path from "path"

// One process-wide write lock per file path so two simultaneous
// upserts from different tabs don't truncate each other's work.
const writeLocks = new Map<string, Promise<void>>()

function rootDir(): string {
  // process.cwd() inside Next.js dev/start is the project root (the
  // directory holding next.config.*), which is web/. Pin the store
  // under .portal-state/ relative to that.
  return path.join(process.cwd(), ".portal-state")
}

function fileFor(slug: string): string {
  // Hard guard against path traversal — only allow [a-z0-9-_].
  if (!/^[a-z0-9-_]+$/i.test(slug)) {
    throw new Error(`Invalid tenant slug: ${slug}`)
  }
  return path.join(rootDir(), `${slug}.json`)
}

export type PortalStateBlob = Record<string, unknown>

export async function loadPortalState(slug: string): Promise<PortalStateBlob> {
  try {
    const raw = await fs.readFile(fileFor(slug), "utf8")
    return JSON.parse(raw) as PortalStateBlob
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {}
    throw err
  }
}

export async function upsertPortalKey(
  slug: string,
  key: string,
  value: unknown,
): Promise<void> {
  const file = fileFor(slug)
  // Serialize concurrent writes for the same file.
  const prev = writeLocks.get(file) ?? Promise.resolve()
  const next = prev.then(async () => {
    await fs.mkdir(rootDir(), { recursive: true })
    let current: PortalStateBlob = {}
    try {
      const raw = await fs.readFile(file, "utf8")
      current = JSON.parse(raw) as PortalStateBlob
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
    }
    current[key] = value
    // Atomic write: serialize to a sibling tmp file then rename so a
    // crash mid-write can't leave a half-truncated JSON.
    const tmp = `${file}.${process.pid}.tmp`
    await fs.writeFile(tmp, JSON.stringify(current, null, 2), "utf8")
    await fs.rename(tmp, file)
  })
  writeLocks.set(file, next.catch(() => undefined))
  await next
}
