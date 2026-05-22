"use client"

// Browser-local API key registry.
//
// In production this lives behind a real backend — keys are hashed
// + persisted server-side, the secret only shown once on creation,
// scope enforcement happens at the API edge. For the POC we
// implement the shape end-to-end client-side so the dashboard +
// dev portal pages can be built against the eventual contract
// without waiting for backend work.
//
// The interface deliberately matches what a server-side endpoint
// would expose: list, create, revoke. When the backing changes,
// swap the storage layer — call sites don't move.

import { useEffect, useState, useCallback } from "react"

const STORAGE_KEY = "thebigclass.api-keys.v1"

// Public, unguessable but identifiable scopes. Lets a creator
// generate a key that can only read course data (e.g. for a
// dashboard widget) without granting it write or billing access.
// Keep this set small — every scope is a UX surface the dev has
// to reason about.
export type ApiScope =
  | "read:courses"
  | "read:students"
  | "read:orders"
  | "read:analytics"
  | "write:students"
  | "write:enrollments"

export const ALL_SCOPES: { id: ApiScope; label: string; description: string }[] = [
  { id: "read:courses", label: "Read courses", description: "List courses, lessons, modules. No write access." },
  { id: "read:students", label: "Read students", description: "List enrolled students + their progress." },
  { id: "read:orders", label: "Read orders", description: "Receipt + entitlement history for analytics dashboards." },
  { id: "read:analytics", label: "Read analytics", description: "Aggregate metrics (revenue, completion, retention)." },
  { id: "write:students", label: "Write students", description: "Create / update student profiles. CRM sync." },
  { id: "write:enrollments", label: "Write enrollments", description: "Enrol or revoke access — use with care." },
]

export interface ApiKey {
  id: string                 // public identifier; safe to display anywhere
  name: string               // human label set by the creator at creation
  scopes: ApiScope[]
  // Last 4 chars of the secret kept for "show me which key was used"
  // surfaces in logs / dashboards. The full secret only ever exists
  // in the create response — we never persist it in plaintext.
  lastFour: string
  // Hashed full secret. POC uses a short SHA-256; real backends
  // should pepper + KDF this. The hash is what verifyApiKey
  // compares against.
  secretHash: string
  createdAt: string          // ISO
  revokedAt?: string         // ISO; set on revoke. Past-revoke keys are kept for audit.
  lastUsedAt?: string        // ISO; bumped by verifyApiKey on success.
  // Optional human reason / tag (e.g. "Zapier integration" or
  // "Used by mobile app v1.2"). Lets the creator triage when a key
  // shows up in unexpected logs.
  note?: string
}

// ------------ Secret generation & verification ------------

// 24-byte cryptographically random secret, base64url-encoded.
// Prefixed with `tbc_` so secrets are visually distinct from
// random strings in logs / regex scans. Mirrors Stripe's `sk_…`
// convention.
function generateSecret(): string {
  const buf = new Uint8Array(24)
  if (typeof window === "undefined") {
    // Server-side fallback shouldn't run in this client-only
    // module; if it does we use Math.random as last resort.
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256)
  } else {
    window.crypto.getRandomValues(buf)
  }
  const b64 = btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  return `tbc_${b64}`
}

// Lightweight hash for the POC. Real backend should bcrypt /
// argon2 + a server-side pepper.
async function hashSecret(secret: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    // Pure-JS fallback so SSR / test environments don't crash.
    // Strictly worse than SubtleCrypto — only used when SubtleCrypto
    // isn't available.
    let h = 5381
    for (let i = 0; i < secret.length; i++) h = ((h << 5) + h) ^ secret.charCodeAt(i)
    return `dev-${(h >>> 0).toString(36)}`
  }
  const data = new TextEncoder().encode(secret)
  const buf = await window.crypto.subtle.digest("SHA-256", data)
  const bytes = Array.from(new Uint8Array(buf))
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function generatePublicId(): string {
  // 8-char public id, base36, prefixed. Identifies the key in
  // logs without exposing the secret.
  const r = Math.random().toString(36).slice(2, 10).padEnd(8, "0")
  return `key_${r}`
}

// ------------ Storage layer ------------

function readKeys(): ApiKey[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ApiKey[]) : []
  } catch {
    return []
  }
}

function writeKeys(keys: ApiKey[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    /* quota — best effort */
  }
  // Dispatch a storage event so other tabs / hooks know to re-read.
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }))
  } catch {
    /* not supported */
  }
}

// ------------ Public API ------------

/**
 * One-shot creation. Returns the fresh secret in plaintext so the
 * UI can show it to the creator exactly once; from then on only
 * the `lastFour` survives.
 */
export async function createApiKey(args: {
  name: string
  scopes: ApiScope[]
  note?: string
}): Promise<{ key: ApiKey; secret: string }> {
  const secret = generateSecret()
  const secretHash = await hashSecret(secret)
  const key: ApiKey = {
    id: generatePublicId(),
    name: args.name.trim() || "Untitled key",
    scopes: Array.from(new Set(args.scopes)),
    lastFour: secret.slice(-4),
    secretHash,
    createdAt: new Date().toISOString(),
    note: args.note?.trim() || undefined,
  }
  const next = [key, ...readKeys()]
  writeKeys(next)
  return { key, secret }
}

export function revokeApiKey(id: string) {
  const next = readKeys().map((k) =>
    k.id === id && !k.revokedAt ? { ...k, revokedAt: new Date().toISOString() } : k,
  )
  writeKeys(next)
}

/**
 * Look up a key by its secret. Returns the matching key when the
 * secret is valid + not revoked, undefined otherwise. Also bumps
 * `lastUsedAt` on success so dashboards can show "Last used 4 min
 * ago" — that's a critical "is anyone using this?" signal before a
 * creator decides to revoke.
 */
export async function verifyApiKey(secret: string): Promise<ApiKey | undefined> {
  if (!secret?.startsWith("tbc_")) return undefined
  const hash = await hashSecret(secret)
  const keys = readKeys()
  const match = keys.find((k) => !k.revokedAt && k.secretHash === hash)
  if (!match) return undefined
  // Bump lastUsedAt on a successful verify. Best-effort; we tolerate
  // a quota error.
  const now = new Date().toISOString()
  writeKeys(keys.map((k) => (k.id === match.id ? { ...k, lastUsedAt: now } : k)))
  return { ...match, lastUsedAt: now }
}

// ------------ React hook ------------

export function useApiKeys(): {
  keys: ApiKey[]
  refresh: () => void
} {
  const [keys, setKeys] = useState<ApiKey[]>(() => readKeys())
  const refresh = useCallback(() => setKeys(readKeys()), [])
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) refresh()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [refresh])
  return { keys, refresh }
}
