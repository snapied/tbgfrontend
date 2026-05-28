"use client"

// Per-course teacher commission store. Each teacher has a record
// with an array of "engagements" — one per course-batch assignment.
// This supports: different commission models per course, multiple
// batches of the same course, and per-course class tracking.
//
// v2 key: `thebigclass.teacher-commissions.v2`
// v1 key (legacy): `thebigclass.teacher-commissions.v1`
// Auto-migrates v1 → v2 on first read.

export type CommissionModel = "percentage" | "per_student_fixed" | "per_class_fixed" | "fixed_academy_commission"

// One engagement = one teacher + one course (+ optional batch).
// Mirrors what a single CourseTeacher row represents in the backend.
export interface CourseEngagement {
  engagementId: string
  courseId: string
  batchLabel?: string                // e.g. "Batch 2 Apr-Jun"
  model: CommissionModel
  teacherPct?: number                // Model A: percentage split
  fixedAmount?: number               // Model B: fixed ₹ per student
  feePerClass?: number               // Model C: fixed ₹ per class
  totalClasses?: number              // Model C: total contracted classes
  completedClasses?: number          // Model C: completed count
  academyFixedCommission?: number    // Model D: fixed ₹ academy keeps
}

// Per-teacher record — one per teacher, holds all their engagements.
export interface TeacherCommissionRecord {
  enabled: boolean
  engagements: CourseEngagement[]
  createdAt?: string
  updatedAt?: string
}

// Legacy v1 interface (kept for migration)
export interface CommissionSettings {
  enabled: boolean
  model?: CommissionModel
  teacherPct?: number
  fixedAmount?: number
  feePerClass?: number
  totalClasses?: number
  completedClasses?: number
  assignedCourseIds?: string[]
  createdAt?: string
  updatedAt?: string
}

const V2_KEY = "thebigclass.teacher-commissions.v2"
const V1_KEY = "thebigclass.teacher-commissions.v1"

// ── Internal storage helpers ────────────────────────────────────

function readAllV2(): Record<string, TeacherCommissionRecord> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(V2_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAllV2(data: Record<string, TeacherCommissionRecord>): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(V2_KEY, JSON.stringify(data))
  } catch { /* ignore quota */ }
}

function readAllV1(): Record<string, CommissionSettings> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(V1_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// ── v1 → v2 migration ──────────────────────────────────────────

function migrateV1toV2(userId: string, v1: CommissionSettings): TeacherCommissionRecord {
  const engagements: CourseEngagement[] = []

  if (v1.enabled && v1.model && v1.assignedCourseIds?.length) {
    // Create one engagement per assigned course with the same terms
    for (const courseId of v1.assignedCourseIds) {
      engagements.push({
        engagementId: `eng_migrated_${courseId}_${Date.now()}`,
        courseId,
        model: v1.model,
        teacherPct: v1.teacherPct,
        fixedAmount: v1.fixedAmount,
        feePerClass: v1.feePerClass,
        totalClasses: v1.totalClasses,
        completedClasses: v1.completedClasses,
      })
    }
  }

  return {
    enabled: v1.enabled,
    engagements,
    createdAt: v1.createdAt,
    updatedAt: v1.updatedAt,
  }
}

// ── Public API ──────────────────────────────────────────────────

export function getCommission(userId: string): TeacherCommissionRecord | null {
  // Try v2 first
  const allV2 = readAllV2()
  if (allV2[userId]) return allV2[userId]

  // Auto-migrate from v1 if available
  const allV1 = readAllV1()
  if (allV1[userId]) {
    const migrated = migrateV1toV2(userId, allV1[userId])
    // Write to v2
    allV2[userId] = migrated
    writeAllV2(allV2)
    return migrated
  }

  return null
}

export function setCommission(userId: string, record: TeacherCommissionRecord): void {
  const all = readAllV2()
  all[userId] = { ...record, updatedAt: new Date().toISOString() }
  writeAllV2(all)
}

export function deleteCommission(userId: string): void {
  const all = readAllV2()
  delete all[userId]
  writeAllV2(all)
}

// ── Per-engagement helpers ──────────────────────────────────────

export function getEngagement(userId: string, engagementId: string): CourseEngagement | null {
  const record = getCommission(userId)
  return record?.engagements.find((e) => e.engagementId === engagementId) ?? null
}

export function upsertEngagement(userId: string, engagement: CourseEngagement): void {
  const record = getCommission(userId) ?? { enabled: true, engagements: [] }
  const idx = record.engagements.findIndex((e) => e.engagementId === engagement.engagementId)
  if (idx >= 0) {
    record.engagements[idx] = engagement
  } else {
    record.engagements.push(engagement)
  }
  record.enabled = true
  setCommission(userId, record)
}

export function deleteEngagement(userId: string, engagementId: string): void {
  const record = getCommission(userId)
  if (!record) return
  record.engagements = record.engagements.filter((e) => e.engagementId !== engagementId)
  setCommission(userId, record)
}
