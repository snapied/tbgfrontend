"use client"

// Local storage fallback for addon purchases when the backend is
// unreachable. Mirrors TenantAddon DB rows in localStorage so the
// billing page can render purchases and the usage enforcement layer
// can sum addon quotas on top of plan limits.
//
// Key: `thebigclass.addons.v1`

export interface LocalAddon {
  id: string
  addonId: string
  quantity: number
  status: "active" | "cancelled"
  purchasedAt: string
  cancelledAt?: string
}

const STORAGE_KEY = "thebigclass.addons.v1"

function readAll(): LocalAddon[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeAll(data: LocalAddon[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore quota */ }
}

export function getActiveAddons(): LocalAddon[] {
  return readAll().filter((a) => a.status === "active")
}

export function getAllAddons(): LocalAddon[] {
  return readAll()
}

export function purchaseAddonLocal(addonId: string, quantity = 1): LocalAddon {
  const all = readAll()
  const addon: LocalAddon = {
    id: `addon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addonId,
    quantity,
    status: "active",
    purchasedAt: new Date().toISOString(),
  }
  all.push(addon)
  writeAll(all)
  return addon
}

export function cancelAddonLocal(id: string): boolean {
  const all = readAll()
  const idx = all.findIndex((a) => a.id === id && a.status === "active")
  if (idx === -1) return false
  all[idx].status = "cancelled"
  all[idx].cancelledAt = new Date().toISOString()
  writeAll(all)
  return true
}

/**
 * Sum the extra quota this tenant has from active addons.
 * Used by the usage enforcement layer.
 */
export function getAddonBoosts(): {
  extraStudents: number
  extraTeachers: number
  extraStorageGB: number
} {
  const active = getActiveAddons()
  let extraStudents = 0
  let extraTeachers = 0
  let extraStorageGB = 0
  for (const a of active) {
    switch (a.addonId) {
      case "extra_students_500": extraStudents += 500 * a.quantity; break
      case "extra_teacher_seat": extraTeachers += 1 * a.quantity; break
      case "extra_storage_100gb": extraStorageGB += 100 * a.quantity; break
    }
  }
  return { extraStudents, extraTeachers, extraStorageGB }
}
