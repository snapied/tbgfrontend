// Client-side sync helpers between localStorage and the per-tenant
// server blob at /api/portal-state/[slug]. Both the portal store
// (brand, pages) and the LMS store (users, courses, enrollments,
// messages, notifications, ...) use the same chokepoints here so a
// cross-browser visitor — incognito or otherwise — sees the same
// state the editing browser saved.
//
// Two functions matter:
//   • ensureTenantBlobPulled(slug)
//       One-shot async fetch of every server key for this tenant,
//       written into localStorage. Module-scoped promise per slug so
//       multiple stores calling this concurrently dedupe to one
//       network request.
//   • persistTenantSlice(slug, suffix, value)
//       Write-through helper: synchronous localStorage write +
//       debounced POST to mirror the same value to the server. The
//       suffix is the same string used as the localStorage key
//       (e.g. "lms.users.v1", "portal.config.v1"), so a flat blob
//       on the server round-trips cleanly back into the per-slice
//       cache here.

const pullPromises = new Map<string, Promise<void>>()
const mirrorTimers = new Map<string, ReturnType<typeof setTimeout>>()

const LS_PREFIX = "thebigclass.t."

function lsKey(slug: string, suffix: string): string {
  return `${LS_PREFIX}${slug}.${suffix}`
}

function endpoint(slug: string): string {
  return `/api/portal-state/${encodeURIComponent(slug)}`
}

// Async-fetch the server blob and write each key into localStorage.
// Called from each store's hydrate path; the singleton-promise map
// ensures the network call happens once per (slug, mount) regardless
// of how many providers hook in.
async function pullTenantBlobInternal(slug: string): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const res = await fetch(endpoint(slug), { cache: "no-store" })
    if (!res.ok) return
    const json = (await res.json()) as {
      ok?: boolean
      state?: Record<string, unknown>
    }
    if (!json.ok || !json.state) return
    for (const [suffix, value] of Object.entries(json.state)) {
      try {
        window.localStorage.setItem(lsKey(slug, suffix), JSON.stringify(value))
      } catch {
        /* quota — tolerable, server is still source of truth */
      }
    }
  } catch {
    /* offline / dev backend down — fall back to whatever's in localStorage */
  }
}

export function ensureTenantBlobPulled(slug: string): Promise<void> {
  if (!slug) return Promise.resolve()
  let p = pullPromises.get(slug)
  if (!p) {
    p = pullTenantBlobInternal(slug)
    pullPromises.set(slug, p)
  }
  return p
}

// Resets the dedupe cache. Call when the tenant context changes or
// when the dashboard explicitly wants to re-pull (rare; the storage
// event already covers same-tab sync).
export function resetTenantBlobPull(slug?: string): void {
  if (slug) pullPromises.delete(slug)
  else pullPromises.clear()
}

// Debounced server mirror. Coalesces rapid writes (e.g. a color
// picker firing on every drag) into a single POST after 600ms of
// quiet. The localStorage write that accompanies this is immediate
// either way, so the same-tab editor never feels laggy.
export function mirrorSliceToServer(
  slug: string,
  suffix: string,
  value: unknown,
): void {
  if (typeof window === "undefined" || !slug) return
  const bucket = `${slug}::${suffix}`
  const existing = mirrorTimers.get(bucket)
  if (existing) clearTimeout(existing)
  mirrorTimers.set(
    bucket,
    setTimeout(() => {
      mirrorTimers.delete(bucket)
      void fetch(endpoint(slug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: suffix, value }),
        keepalive: true,
      }).catch(() => {
        /* tolerable — local cache still has truth, next save retries */
      })
    }, 600),
  )
}

// Write-through helper used by store useEffects in place of a bare
// localStorage.setItem. Performs the local cache write first
// (synchronous; preserves the immediate-feedback UX) and then
// schedules the server mirror.
export function persistTenantSlice(
  slug: string,
  suffix: string,
  value: unknown,
  onLocalError?: (err: unknown) => void,
): void {
  if (typeof window === "undefined" || !slug) return
  try {
    window.localStorage.setItem(lsKey(slug, suffix), JSON.stringify(value))
  } catch (err) {
    onLocalError?.(err)
  }
  mirrorSliceToServer(slug, suffix, value)
}
