"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

export interface Certificate {
  id: string
  studentName: string
  email: string
  courseName: string
  completionDate: string
  grade?: string
  instructorName: string
  template:
    | "classic" | "modern" | "achievement" | "participation"
    | "corporate" | "elegant" | "minimal" | "botanical"
    | "executive" | "midnight" | "monogram" | "diploma" | "wave"
    | "aurora" | "vintage" | "blueprint" | "artdeco" | "neon"
    | "custom"
  // Set when template === "custom": the id of the user-designed template
  // in the custom-templates store. Used to look up the layout at render.
  customTemplateId?: string
  status: "active" | "revoked"
  batchId: string
  createdAt: string
}

export interface Batch {
  id: string
  courseName: string
  template:
    | "classic" | "modern" | "achievement" | "participation"
    | "corporate" | "elegant" | "minimal" | "botanical"
    | "executive" | "midnight" | "monogram" | "diploma" | "wave"
    | "aurora" | "vintage" | "blueprint" | "artdeco" | "neon"
    | "custom"
  customTemplateId?: string
  totalRows: number
  successCount: number
  failureCount: number
  status: "completed" | "processing" | "error"
  createdAt: string
  createdBy: string
  certificates: Certificate[]
}

interface CertificateStore {
  batches: Batch[]
  addBatch: (batch: Batch) => void
  getBatch: (id: string) => Batch | undefined
  getCertificate: (id: string) => Certificate | undefined
  revokeCertificate: (id: string) => void
}

const CertificateContext = createContext<CertificateStore | null>(null)

// Per-tenant storage. The legacy flat key is migrated into the platform
// workspace on first read so existing dev installs keep their issued
// certificates. New tenants start empty — no demo data leakage.
import { readCurrentTenantSlug } from "./tenant-store"
import {
  ensureTenantBlobPulled,
  persistTenantSlice,
} from "./tenant-state-sync"
const LEGACY_KEY = "thebigclass.certificates.v1"
// Suffix used as both the localStorage key tail AND the server blob
// key. Lives under the generic /api/portal-state/<slug> endpoint with
// portal.* / lms.* / store.* keys so a fresh browser (or the public
// /verify route) can resolve a certificate it never issued locally.
const CERTS_SUFFIX = "certificates.v1"
function storageKey(slug: string) {
  return `thebigclass.t.${slug}.${CERTS_SUFFIX}`
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`
}

// Seed data — used only the first time, before anything is persisted.
const initialBatches: Batch[] = [
  {
    id: "batch-001",
    courseName: "Full-Stack JavaScript Bootcamp",
    template: "modern",
    totalRows: 3,
    successCount: 3,
    failureCount: 0,
    status: "completed",
    createdAt: "2026-05-14T10:30:00Z",
    createdBy: "Demo User",
    certificates: [
      {
        id: "CERT-A1B2C3D4",
        studentName: "Alice Johnson",
        email: "alice@example.com",
        courseName: "Full-Stack JavaScript Bootcamp",
        completionDate: "2026-05-14",
        instructorName: "Demo User",
        template: "modern",
        status: "active",
        batchId: "batch-001",
        createdAt: "2026-05-14T10:30:00Z",
      },
      {
        id: "CERT-E5F6G7H8",
        studentName: "Bob Smith",
        email: "bob@example.com",
        courseName: "Full-Stack JavaScript Bootcamp",
        completionDate: "2026-05-14",
        instructorName: "Demo User",
        template: "modern",
        status: "active",
        batchId: "batch-001",
        createdAt: "2026-05-14T10:30:00Z",
      },
      {
        id: "CERT-I9J0K1L2",
        studentName: "Carol Williams",
        email: "carol@example.com",
        courseName: "Full-Stack JavaScript Bootcamp",
        completionDate: "2026-05-14",
        instructorName: "Demo User",
        template: "modern",
        status: "active",
        batchId: "batch-001",
        createdAt: "2026-05-14T10:30:00Z",
      },
    ],
  },
]

function loadFromStorage(): Batch[] {
  if (typeof window === "undefined") return []
  try {
    const slug = readCurrentTenantSlug()
    const key = storageKey(slug)
    let raw = window.localStorage.getItem(key)
    // One-time migration: copy the legacy flat key into the platform
    // workspace so pre-multi-tenant issued certificates survive the upgrade.
    if (!raw && slug === "platform") {
      const legacy = window.localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        window.localStorage.setItem(key, legacy)
        raw = legacy
      }
    }
    if (!raw) return []
    const parsed = JSON.parse(raw) as Batch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(batches: Batch[]): void {
  if (typeof window === "undefined") return
  // Write-through to localStorage + the server blob, same pattern as
  // the LMS and portal stores. The mirror is what lets the public
  // /verify/<id> page resolve a certificate that wasn't issued from
  // the visitor's own browser.
  const slug = readCurrentTenantSlug()
  persistTenantSlice(slug, CERTS_SUFFIX, batches)
}

export function CertificateProvider({ children }: { children: ReactNode }) {
  // SSR-safe: start with seed, hydrate from localStorage on mount.
  // Start empty so a fresh tenant doesn't briefly flash demo certificates
  // before the per-tenant hydration completes.
  const [batches, setBatches] = useState<Batch[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Pull the cross-browser blob first so incognito visitors / fresh
    // browsers see certificates the issuer's browser wrote. The helper
    // dedupes per slug across every store that calls it on mount.
    let cancelled = false
    const slug = readCurrentTenantSlug()
    void ensureTenantBlobPulled(slug).then(() => {
      if (cancelled) return
      setBatches(loadFromStorage())
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (hydrated) saveToStorage(batches)
  }, [batches, hydrated])

  const addBatch = useCallback((batch: Batch) => {
    setBatches((prev) => [batch, ...prev])
  }, [])

  const getBatch = useCallback(
    (id: string) => batches.find((b) => b.id === id),
    [batches]
  )

  const getCertificate = useCallback(
    (id: string) => {
      const needle = id.trim()
      for (const batch of batches) {
        const cert = batch.certificates.find((c) => c.id === needle || c.id.toUpperCase() === needle.toUpperCase())
        if (cert) return cert
      }
      return undefined
    },
    [batches]
  )

  const revokeCertificate = useCallback((id: string) => {
    setBatches((prev) =>
      prev.map((batch) => ({
        ...batch,
        certificates: batch.certificates.map((cert) =>
          cert.id === id ? { ...cert, status: "revoked" as const } : cert
        ),
      }))
    )
  }, [])

  return (
    <CertificateContext.Provider value={{ batches, addBatch, getBatch, getCertificate, revokeCertificate }}>
      {children}
    </CertificateContext.Provider>
  )
}

export function useCertificateStore() {
  const context = useContext(CertificateContext)
  if (!context) {
    throw new Error("useCertificateStore must be used within a CertificateProvider")
  }
  return context
}

export { generateId }
