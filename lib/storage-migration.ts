// One-time rename of every localStorage key from the legacy `vidyanxt.*`
// prefix to the current brand prefix `thebigclass.*`. Runs once per browser
// (gated by a flag) and is safe to call repeatedly.
//
// We don't delete the legacy keys — leaving them lets users roll back without
// losing data. They'll be cleaned up by hand if/when this is removed.

const FLAG_KEY = "thebigclass.migration.v1.complete"
const LEGACY_PREFIX = "vidyanxt."
const NEW_PREFIX = "thebigclass."

let ran = false

export function runLegacyKeyMigration(): void {
  if (ran) return
  ran = true
  if (typeof window === "undefined") return
  try {
    if (window.localStorage.getItem(FLAG_KEY)) return
    let moved = 0
    // Snapshot the key list — mutating localStorage while iterating is messy.
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(LEGACY_PREFIX)) keys.push(k)
    }
    for (const legacyKey of keys) {
      const newKey = NEW_PREFIX + legacyKey.slice(LEGACY_PREFIX.length)
      // Don't overwrite if the new key was somehow already written.
      if (window.localStorage.getItem(newKey) !== null) continue
      const value = window.localStorage.getItem(legacyKey)
      if (value !== null) {
        window.localStorage.setItem(newKey, value)
        moved++
      }
    }
    window.localStorage.setItem(FLAG_KEY, new Date().toISOString())
    if (moved > 0) {
      // eslint-disable-next-line no-console
      console.info(`[thebigclass] migrated ${moved} legacy localStorage key(s) to the new prefix`)
    }
  } catch {
    /* ignore quota / private-browsing errors */
  }
}
