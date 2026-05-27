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
const pendingWrites = new Map<string, Map<string, unknown>>()

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
// picker firing on every drag) into a single bulk POST after 600ms
// of quiet. The localStorage write that accompanies this is immediate
// either way, so the same-tab editor never feels laggy.
// Active sync promises by slug, to prevent concurrent /bulk requests from
// resolving out of order and corrupting the database with stale data.
const activeSyncs = new Map<string, Promise<void>>()

export function mirrorSliceToServer(
  slug: string,
  suffix: string,
  value: unknown,
): void {
  if (typeof window === "undefined" || !slug) return
  
  let tenantWrites = pendingWrites.get(slug)
  if (!tenantWrites) {
    tenantWrites = new Map()
    pendingWrites.set(slug, tenantWrites)
  }
  tenantWrites.set(suffix, value)

  const existing = mirrorTimers.get(slug)
  if (existing) clearTimeout(existing)
  
  mirrorTimers.set(
    slug,
    setTimeout(() => {
      mirrorTimers.delete(slug)
      const writesToFlush = pendingWrites.get(slug)
      if (!writesToFlush) return
      pendingWrites.delete(slug)
      
      const entries = Array.from(writesToFlush.entries()).map(([k, v]) => ({ key: k, value: v }))
      void fetch(`${endpoint(slug)}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
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

export async function flushTenantStateSync(slug: string): Promise<void> {
  if (typeof window === "undefined" || !slug) return
  
  const existing = mirrorTimers.get(slug)
  if (existing) {
    clearTimeout(existing)
    mirrorTimers.delete(slug)
  }

  // If a network request is already in flight, wait for it to finish first.
  // This ensures that if the user clicks "Publish" while a debounced auto-save
  // is inflight, the final "Publish" network request is sent AFTER the auto-save
  // completes, guaranteeing the database ends up with the final published state.
  while (activeSyncs.has(slug)) {
    try {
      await activeSyncs.get(slug)
    } catch {
      // ignore rejection, we just want to serialize
    }
  }
  
  const writesToFlush = pendingWrites.get(slug)
  if (!writesToFlush || writesToFlush.size === 0) return
  pendingWrites.delete(slug)
  
  const entries = Array.from(writesToFlush.entries()).map(([k, v]) => ({ key: k, value: v }))
  
  const syncPromise = (async () => {
    try {
      await fetch(`${endpoint(slug)}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      })
    } catch {
      /* tolerable — offline or network failure; state is still in local storage */
    } finally {
      activeSyncs.delete(slug)
    }
  })()

  activeSyncs.set(slug, syncPromise)
  await syncPromise
}

