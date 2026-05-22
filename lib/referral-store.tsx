"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { readCurrentTenantSlug } from "./tenant-store"

// Refer & Earn.
//
// A workspace owner / instructor invites a friend by providing their
// name + country + WhatsApp number. We persist that invitation under
// a short generated code; sharing the resulting `/r/<code>` link
// attributes the eventual signup back to the inviter so the reward
// can be granted.

export type ReferralStatus = "pending" | "joined" | "rewarded"

export interface Referral {
  id: string
  code: string             // 6-char invite code embedded in the URL
  // Inviter
  referrerId: string       // userId of the person doing the invite
  referrerName: string
  referrerEmail: string
  // Invitee — collected up front so the inviter can follow up via WhatsApp
  inviteeName: string
  inviteeCountry: string   // ISO country code or name
  inviteePhone: string     // E.164
  // Lifecycle
  status: ReferralStatus
  rewardLabel: string      // e.g. "1 month free"
  createdAt: string
  joinedAt?: string
  rewardedAt?: string
  // When the invitee signs up via the link we record their resulting
  // tenant + email so the reward can be granted to the inviter.
  convertedTenantSlug?: string
  convertedEmail?: string
  notes?: string
}

interface ReferralStore {
  referrals: Referral[]
  addReferral: (r: Referral) => void
  updateReferral: (id: string, patch: Partial<Referral>) => void
  deleteReferral: (id: string) => void
  // Mark a code as converted once the invitee finishes signup. Used by
  // the signup flow when ?ref=<code> is present.
  markJoined: (code: string, info: { email: string; tenantSlug?: string }) => void
  findByCode: (code: string) => Referral | undefined
  // Totals for the dashboard widget.
  stats: {
    sent: number
    joined: number
    rewarded: number
    pending: number
  }
}

const ReferralContext = createContext<ReferralStore | null>(null)

const DEFAULT_REWARD = "1 month free per friend who joins"

function storageKey(slug: string) {
  return `thebigclass.t.${slug}.referrals.v1`
}

// Tenant-agnostic conversion log. Written by the signup page when the
// new user joined via ?ref=<code> — picked up by every tenant's
// ReferralProvider so the referrer's dashboard can flip pending → joined
// even though the invitee created a different tenant in a different
// storage namespace.
const CONVERSIONS_KEY = "thebigclass.global.referralConversions.v1"

export interface ReferralConversion {
  code: string
  email: string
  tenantSlug?: string
  at: string
}

export function loadConversions(): ReferralConversion[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CONVERSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReferralConversion[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function recordConversion(c: ReferralConversion): void {
  if (typeof window === "undefined") return
  try {
    const list = loadConversions()
    // De-dupe by code — only the first successful conversion counts.
    if (list.find((x) => x.code === c.code)) return
    list.push(c)
    window.localStorage.setItem(CONVERSIONS_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function loadFromStorage(): Referral[] {
  if (typeof window === "undefined") return []
  try {
    const slug = readCurrentTenantSlug()
    const raw = window.localStorage.getItem(storageKey(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Referral[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(referrals: Referral[]): void {
  if (typeof window === "undefined") return
  try {
    const slug = readCurrentTenantSlug()
    window.localStorage.setItem(storageKey(slug), JSON.stringify(referrals))
  } catch {
    /* ignore */
  }
}

/**
 * Six-character alphanumeric code, uppercase, easy to share verbally.
 * Avoids ambiguous characters (0/O, 1/I/L).
 */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export { DEFAULT_REWARD as DEFAULT_REFERRAL_REWARD }

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const local = loadFromStorage()
    // Reconcile against the global conversions log so pending invites
    // flip to joined the next time the referrer opens the dashboard.
    const conversions = loadConversions()
    const byCode = new Map(conversions.map((c) => [c.code, c]))
    const reconciled = local.map((r) => {
      if (r.status !== "pending") return r
      const c = byCode.get(r.code)
      if (!c) return r
      return {
        ...r,
        status: "joined" as const,
        joinedAt: c.at,
        convertedEmail: c.email,
        convertedTenantSlug: c.tenantSlug,
      }
    })
    setReferrals(reconciled)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveToStorage(referrals)
  }, [referrals, hydrated])

  const addReferral = useCallback((r: Referral) => {
    setReferrals((prev) => [r, ...prev])
  }, [])

  const updateReferral = useCallback((id: string, patch: Partial<Referral>) => {
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const deleteReferral = useCallback((id: string) => {
    setReferrals((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const markJoined = useCallback(
    (code: string, info: { email: string; tenantSlug?: string }) => {
      setReferrals((prev) =>
        prev.map((r) =>
          r.code === code && r.status === "pending"
            ? {
                ...r,
                status: "joined" as const,
                joinedAt: new Date().toISOString(),
                convertedEmail: info.email,
                convertedTenantSlug: info.tenantSlug,
              }
            : r,
        ),
      )
    },
    [],
  )

  const findByCode = useCallback(
    (code: string) => referrals.find((r) => r.code === code),
    [referrals],
  )

  const stats = useMemo(() => {
    let sent = 0, joined = 0, rewarded = 0
    for (const r of referrals) {
      sent++
      if (r.status === "joined" || r.status === "rewarded") joined++
      if (r.status === "rewarded") rewarded++
    }
    return { sent, joined, rewarded, pending: sent - joined }
  }, [referrals])

  return (
    <ReferralContext.Provider
      value={{ referrals, addReferral, updateReferral, deleteReferral, markJoined, findByCode, stats }}
    >
      {children}
    </ReferralContext.Provider>
  )
}

export function useReferrals(): ReferralStore {
  const ctx = useContext(ReferralContext)
  if (!ctx) throw new Error("useReferrals must be used within a ReferralProvider")
  return ctx
}
