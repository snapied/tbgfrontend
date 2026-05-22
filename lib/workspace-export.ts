"use client"

// Workspace export + import — full-tenant data round-trip.
//
// Goal: a creator can download every byte of their workspace as a
// single JSON file, then later re-upload the same file (into the
// same workspace OR a fresh one) and recover everything they had —
// courses, students, orders, certificates, portal pages, faculty,
// blog posts, the lot.
//
// How it works
// ------------
// Every tenant-scoped slice in this app lives under a localStorage
// key with the prefix `thebigclass.t.<slug>.`. (See tk() in
// lms-store / portal-store / store-store, and storageKey() in
// wall-store / referral-store / org-settings / certificate-store
// — they all share the same root.)
//
// Export scans localStorage, filters to that prefix, parses each
// value as JSON, and packages it into a single envelope:
//
//   {
//     format: "thebigclass.workspace-export",
//     version: 1,
//     exportedAt: <ISO timestamp>,
//     sourceTenant: <slug>,
//     sourceTenantName?: <human label>,
//     counts: { courses: 47, students: 1243, orders: 89, … },
//     slices: { "lms.courses.v1": [...], "store.orders.v1": [...], … }
//   }
//
// Import does the reverse — validates the envelope, optionally
// switches to a target tenant, and writes every slice back under
// that tenant's prefix. With mode="replace" we overwrite anything
// that's there; with mode="merge" we union arrays by id when the
// shape is { id: string }[].
//
// Async-by-design
// ---------------
// Both functions yield to the event loop between slices via tiny
// awaits — keeps a 5 MB export from freezing the dashboard UI.
// Progress callbacks fire on every slice so the page can render a
// real progress bar instead of an indeterminate spinner.

// The single shared prefix every tenant-scoped key lives under.
// `tenantPrefix(slug)` returns the full string we filter against.
function tenantPrefix(slug: string): string {
  return `thebigclass.t.${slug}.`
}

// What ends up in the file. Versioned so future format changes
// can opt-in to migration rather than silently breaking imports.
export const EXPORT_FORMAT = "thebigclass.workspace-export" as const
export const EXPORT_VERSION = 1

export interface WorkspaceExport {
  format: typeof EXPORT_FORMAT
  version: number
  exportedAt: string                       // ISO
  sourceTenant: string                     // slug at export time
  sourceTenantName?: string                // human-friendly label
  // Quick stats so the import-preview UI can show
  // "this archive contains 47 courses, 1,243 students…"
  // without parsing every slice itself.
  counts: Record<string, number>
  // The raw JSON-parsed value of every slice. Keys are the
  // localStorage suffix after the tenant prefix is stripped —
  // e.g. "lms.courses.v1", "portal.config.v1", "store.orders.v1".
  // Values are the parsed JSON (objects / arrays / strings).
  slices: Record<string, unknown>
}

// Progress callback shape. fires for each slice on export +
// each slice on import. `phase` tells the UI whether to show
// "Reading <X>" vs "Writing <X>".
export interface ProgressEvent {
  phase: "read" | "write"
  current: number
  total: number
  sliceKey: string
}
export type ProgressFn = (e: ProgressEvent) => void

// Tiny yield so a 5MB walk doesn't lock the main thread.
// Picked setTimeout over microtask because a microtask still
// blocks paint; setTimeout(0) lets the browser repaint between
// slices.
function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// Heuristic stats for the human preview. We try to identify the
// "shape" of common slices so the export envelope can carry a
// "47 courses, 1,243 students" summary without reading every
// item again on the consumer side.
function deriveCounts(slices: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(slices)) {
    if (Array.isArray(v)) {
      // Derive a human label from the key suffix. "lms.courses.v1"
      // -> "courses". Best-effort.
      const m = k.match(/[.]([a-zA-Z]+)\.v\d+$/)
      const label = (m?.[1] ?? k).toLowerCase()
      out[label] = v.length
    }
  }
  return out
}

/**
 * Export every tenant-scoped slice into a downloadable envelope.
 * Pure read — does not mutate localStorage.
 */
export async function exportWorkspace(
  sourceTenant: string,
  options: { sourceTenantName?: string; onProgress?: ProgressFn } = {},
): Promise<WorkspaceExport> {
  if (typeof window === "undefined") {
    throw new Error("exportWorkspace must run in a browser context")
  }
  const prefix = tenantPrefix(sourceTenant)
  // Snapshot the matching keys first so we don't iterate
  // localStorage live (mutating it would be a footgun anyway,
  // but we want a stable count for the progress bar).
  const keys: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (k && k.startsWith(prefix)) keys.push(k)
  }
  keys.sort()

  const slices: Record<string, unknown> = {}
  for (let i = 0; i < keys.length; i++) {
    const fullKey = keys[i]
    const sliceKey = fullKey.slice(prefix.length)
    options.onProgress?.({
      phase: "read",
      current: i + 1,
      total: keys.length,
      sliceKey,
    })
    const raw = window.localStorage.getItem(fullKey)
    if (raw == null) continue
    // Tolerant parse — if a slice was written as plain string
    // (e.g. a flag), preserve it verbatim instead of dropping it.
    try {
      slices[sliceKey] = JSON.parse(raw)
    } catch {
      slices[sliceKey] = raw
    }
    await nextTick()
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sourceTenant,
    sourceTenantName: options.sourceTenantName,
    counts: deriveCounts(slices),
    slices,
  }
}

/**
 * Sanity-check an export envelope before letting the user
 * commit. Returns a structured result so the UI can show the
 * exact field that failed.
 */
export type ValidateResult =
  | { ok: true; envelope: WorkspaceExport }
  | { ok: false; reason: string }

export function validateExportEnvelope(input: unknown): ValidateResult {
  if (!input || typeof input !== "object") {
    return { ok: false, reason: "Not a JSON object." }
  }
  const e = input as Partial<WorkspaceExport>
  if (e.format !== EXPORT_FORMAT) {
    return { ok: false, reason: `Wrong format. Expected '${EXPORT_FORMAT}'.` }
  }
  if (typeof e.version !== "number") {
    return { ok: false, reason: "Missing version." }
  }
  if (e.version > EXPORT_VERSION) {
    return {
      ok: false,
      reason: `Archive was made with a newer app version (v${e.version}). Update this workspace first.`,
    }
  }
  if (!e.slices || typeof e.slices !== "object") {
    return { ok: false, reason: "Archive has no slices." }
  }
  if (typeof e.sourceTenant !== "string" || !e.sourceTenant) {
    return { ok: false, reason: "Archive is missing its source tenant." }
  }
  return { ok: true, envelope: e as WorkspaceExport }
}

// Helpers for the merge mode. We treat a slice as "array-of-
// records" only when every element looks like { id: string }.
function isIdArray(v: unknown): v is Array<{ id: string }> {
  return (
    Array.isArray(v) &&
    v.every((x) => x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string")
  )
}

function mergeById(
  existing: Array<{ id: string }>,
  incoming: Array<{ id: string }>,
): Array<{ id: string }> {
  // Incoming wins on id collision — the file is the new
  // source of truth for the records inside it; existing rows
  // not present in the incoming list are kept.
  const seen = new Set(incoming.map((x) => x.id))
  return [...incoming, ...existing.filter((x) => !seen.has(x.id))]
}

export interface ImportOptions {
  // Replace = blow away every slice we have and write the
  // envelope's version. Merge = union arrays-of-{id} slices
  // and replace anything else. Default: "replace".
  mode?: "replace" | "merge"
  // Override the tenant the data writes into. Useful for
  // "import this old account's export into my fresh workspace".
  // Defaults to the source tenant baked into the envelope.
  targetTenant?: string
  onProgress?: ProgressFn
}

export interface ImportSummary {
  targetTenant: string
  sliceCount: number
  bytesWritten: number
}

/**
 * Write every slice in the envelope into the target tenant's
 * localStorage keys. Always runs async so the dashboard stays
 * responsive on large workspaces.
 */
export async function importWorkspace(
  envelope: WorkspaceExport,
  options: ImportOptions = {},
): Promise<ImportSummary> {
  if (typeof window === "undefined") {
    throw new Error("importWorkspace must run in a browser context")
  }
  const targetTenant = options.targetTenant ?? envelope.sourceTenant
  const mode = options.mode ?? "replace"
  const prefix = tenantPrefix(targetTenant)
  const entries = Object.entries(envelope.slices)

  let bytesWritten = 0
  for (let i = 0; i < entries.length; i++) {
    const [sliceKey, value] = entries[i]
    const fullKey = `${prefix}${sliceKey}`
    options.onProgress?.({
      phase: "write",
      current: i + 1,
      total: entries.length,
      sliceKey,
    })

    let nextValue = value
    if (mode === "merge") {
      // Only attempt merge when both old + new are id-arrays.
      // Anything else falls back to replace — saner than
      // silently corrupting a config object with a half-merge.
      const rawExisting = window.localStorage.getItem(fullKey)
      if (rawExisting && isIdArray(value)) {
        try {
          const parsedExisting = JSON.parse(rawExisting)
          if (isIdArray(parsedExisting)) {
            nextValue = mergeById(parsedExisting, value)
          }
        } catch {
          /* unreadable existing — overwrite */
        }
      }
    }

    const serialized = typeof nextValue === "string" ? nextValue : JSON.stringify(nextValue)
    try {
      window.localStorage.setItem(fullKey, serialized)
      bytesWritten += serialized.length
    } catch (err) {
      // localStorage quota is ~5 MB. We surface the partial
      // import so the user knows where it stopped.
      throw new Error(
        `Storage quota hit while writing "${sliceKey}". ${i}/${entries.length} slices written. Cause: ${(err as Error).message}`,
      )
    }
    await nextTick()
  }

  return { targetTenant, sliceCount: entries.length, bytesWritten }
}

/**
 * Build a filename like "snapied.workspace.2026-05-19.json"
 * for the download. Slug-only (no spaces / special chars) so it
 * round-trips through every OS.
 */
export function suggestExportFilename(tenant: string, exportedAt: string): string {
  const date = exportedAt.slice(0, 10)
  const slug = tenant.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
  return `${slug}.workspace.${date}.json`
}

// ---------------------------------------------------------------
// Per-entity exports + CSV round-trip
// ---------------------------------------------------------------
// The workspace envelope is the source-of-truth backup. But most
// creators don't think in "workspaces" — they think in spreadsheets:
// "give me my student list as a CSV so I can paste it into Mailchimp",
// "let me download every course as a row I can audit in Excel".
//
// These helpers expose the most-asked entities (students, courses,
// orders) as flat row arrays that can be serialised as CSV (universal)
// or JSON (lossless). Importers accept the same CSV back so a creator
// can edit a sheet in Google and re-upload it.

export type EntityName = "students" | "courses" | "orders"
export type ExportFormat = "csv" | "json"

// RFC 4180 escaper. Wraps in double quotes when the value contains
// a comma, quote, CR, or LF; doubles embedded quotes; renders null /
// undefined as empty strings (NOT the literal text "null").
export function csvEscape(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "object") {
    // Nested objects/arrays get JSON-encoded then escaped — better
    // than dropping data, and parseable on the import side if we
    // ever decide to round-trip nested structures.
    try {
      v = JSON.stringify(v)
    } catch {
      v = String(v)
    }
  }
  const s = String(v)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

// Build a CSV blob from a list of homogeneous rows. Header order is
// the union of keys across rows in first-seen order, so callers that
// want a deterministic column order should pass rows where the first
// row already has every column.
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers: string[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k)
        headers.push(k)
      }
    }
  }
  const lines = [headers.join(",")]
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","))
  }
  return lines.join("\r\n") + "\r\n"
}

// Filename for a single-entity download — distinct from
// suggestExportFilename which is the full workspace envelope name.
//   "renu.students.2026-05-19.csv"
export function suggestEntityFilename(
  tenant: string,
  entity: EntityName,
  exportedAt: string,
  format: ExportFormat,
): string {
  const date = exportedAt.slice(0, 10)
  const slug = tenant.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
  return `${slug}.${entity}.${date}.${format}`
}

// Read a tenant-scoped array slice from localStorage. Returns [] if
// the slice doesn't exist or isn't an array — callers can treat the
// empty case as "no data yet".
function readArraySlice<T = Record<string, unknown>>(
  tenant: string,
  sliceKey: string,
): T[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(`${tenantPrefix(tenant)}${sliceKey}`)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export interface StudentRow {
  id: string
  name: string
  email: string
  phone: string
  enrolledCourses: string
  joinedAt: string
  [k: string]: unknown
}

// Flatten the lms.users.v1 slice → role=student rows ready for CSV.
// We collapse arrays (enrolledCourses) into "|"-separated strings so
// the output is a sane spreadsheet, not a sea of stringified JSON.
export function exportStudents(tenant: string): StudentRow[] {
  type RawUser = {
    id?: string
    name?: string
    email?: string
    phone?: string
    role?: string
    enrolledCourses?: string[]
    enrollments?: Array<{ courseId?: string }>
    joinedAt?: string
    createdAt?: string
  }
  const users = readArraySlice<RawUser>(tenant, "lms.users.v1")
  return users
    .filter((u) => (u.role ?? "student") === "student")
    .map((u) => {
      const enrolled =
        u.enrolledCourses ??
        (Array.isArray(u.enrollments)
          ? u.enrollments.map((e) => e.courseId).filter(Boolean)
          : [])
      return {
        id: u.id ?? "",
        name: u.name ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        enrolledCourses: (enrolled as string[]).filter(Boolean).join("|"),
        joinedAt: u.joinedAt ?? u.createdAt ?? "",
      } satisfies StudentRow
    })
}

export interface CourseRow {
  id: string
  slug: string
  title: string
  description: string
  priceInr: string
  status: string
  facultyId: string
  modulesCount: string
  lessonsCount: string
  createdAt: string
  [k: string]: unknown
}

// Flatten lms.courses.v1 into a metadata table — curriculum trees
// stay inside the full workspace JSON envelope (they're nested and
// don't survive a flat CSV round-trip cleanly).
export function exportCourses(tenant: string): CourseRow[] {
  type RawCourse = {
    id?: string
    slug?: string
    title?: string
    description?: string
    priceInr?: number | string
    price?: number | string
    status?: string
    facultyId?: string
    modules?: Array<{ lessons?: unknown[] }>
    createdAt?: string
  }
  const courses = readArraySlice<RawCourse>(tenant, "lms.courses.v1")
  return courses.map((c) => {
    const modules = Array.isArray(c.modules) ? c.modules : []
    const lessons = modules.reduce(
      (n, m) => n + (Array.isArray(m.lessons) ? m.lessons.length : 0),
      0,
    )
    return {
      id: c.id ?? "",
      slug: c.slug ?? "",
      title: c.title ?? "",
      description: c.description ?? "",
      priceInr: String(c.priceInr ?? c.price ?? ""),
      status: c.status ?? "",
      facultyId: c.facultyId ?? "",
      modulesCount: String(modules.length),
      lessonsCount: String(lessons),
      createdAt: c.createdAt ?? "",
    } satisfies CourseRow
  })
}

export interface OrderRow {
  id: string
  studentEmail: string
  itemTitle: string
  amountInr: string
  status: string
  createdAt: string
  [k: string]: unknown
}

export function exportOrders(tenant: string): OrderRow[] {
  type RawOrder = {
    id?: string
    studentEmail?: string
    buyerEmail?: string
    email?: string
    itemTitle?: string
    productTitle?: string
    title?: string
    amountInr?: number | string
    amount?: number | string
    status?: string
    createdAt?: string
  }
  const orders = readArraySlice<RawOrder>(tenant, "store.orders.v1")
  return orders.map((o) => ({
    id: o.id ?? "",
    studentEmail: o.studentEmail ?? o.buyerEmail ?? o.email ?? "",
    itemTitle: o.itemTitle ?? o.productTitle ?? o.title ?? "",
    amountInr: String(o.amountInr ?? o.amount ?? ""),
    status: o.status ?? "",
    createdAt: o.createdAt ?? "",
  }))
}

// ---------------------------------------------------------------
// CSV parser (RFC 4180-ish)
// ---------------------------------------------------------------
// Hand-rolled rather than pulled in as a dep — the surface we need
// is tiny: BOM stripping, CRLF or LF line endings, double-quoted
// fields with escaped quotes, header row → record.
export function parseCsv(text: string): Record<string, string>[] {
  if (!text) return []
  // Strip UTF-8 BOM that Excel loves to add.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        row.push(field)
        field = ""
      } else if (ch === "\r") {
        // swallow — paired \n handles the row break
      } else if (ch === "\n") {
        row.push(field)
        rows.push(row)
        row = []
        field = ""
      } else {
        field += ch
      }
    }
  }
  // Trailing field / row that didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  if (rows.length === 0) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1)
    .filter((r) => r.some((c) => c !== ""))
    .map((r) => {
      const rec: Record<string, string> = {}
      headers.forEach((h, idx) => {
        rec[h] = r[idx] ?? ""
      })
      return rec
    })
}

export interface ImportSliceSummary {
  inserted: number
  updated: number
  skipped: number
}

// Generic id-keyed merge. Incoming wins on collision.
function mergeArrayByKey<T extends Record<string, unknown>>(
  existing: T[],
  incoming: T[],
  key: keyof T,
): { merged: T[]; inserted: number; updated: number } {
  const byKey = new Map<string, T>()
  for (const r of existing) {
    const k = String(r[key] ?? "")
    if (k) byKey.set(k, r)
  }
  let inserted = 0
  let updated = 0
  for (const r of incoming) {
    const k = String(r[key] ?? "")
    if (!k) continue
    if (byKey.has(k)) {
      byKey.set(k, { ...byKey.get(k)!, ...r })
      updated++
    } else {
      byKey.set(k, r)
      inserted++
    }
  }
  return { merged: Array.from(byKey.values()), inserted, updated }
}

function writeArraySlice(tenant: string, sliceKey: string, rows: unknown[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    `${tenantPrefix(tenant)}${sliceKey}`,
    JSON.stringify(rows),
  )
}

// Merge a CSV student list into lms.users.v1. Match key is `email`
// (lowercase) because that's the only stable cross-system identifier
// when importing from another platform. Rows without an email are
// skipped — counted, not silently dropped.
export function importStudentsCsv(
  tenant: string,
  rows: Record<string, string>[],
): ImportSliceSummary {
  type RawUser = {
    id?: string
    name?: string
    email?: string
    phone?: string
    role?: string
    enrolledCourses?: string[]
    joinedAt?: string
  }
  const existing = readArraySlice<RawUser>(tenant, "lms.users.v1")
  const byEmail = new Map<string, RawUser>()
  for (const u of existing) {
    const e = (u.email ?? "").toLowerCase().trim()
    if (e) byEmail.set(e, u)
  }
  let inserted = 0
  let updated = 0
  let skipped = 0
  for (const row of rows) {
    const email = (row.email ?? "").toLowerCase().trim()
    if (!email) {
      skipped++
      continue
    }
    const enrolledCsv = row.enrolledCourses ?? ""
    const enrolled = enrolledCsv
      ? enrolledCsv.split(/[|,]/).map((s) => s.trim()).filter(Boolean)
      : undefined
    const prev = byEmail.get(email)
    const next: RawUser = {
      ...(prev ?? {}),
      id: row.id || prev?.id || `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: row.name ?? prev?.name ?? "",
      email,
      phone: row.phone ?? prev?.phone ?? "",
      role: "student",
      enrolledCourses: enrolled ?? prev?.enrolledCourses ?? [],
      joinedAt: row.joinedAt ?? prev?.joinedAt ?? new Date().toISOString(),
    }
    if (prev) {
      updated++
    } else {
      inserted++
    }
    byEmail.set(email, next)
  }
  // Keep non-student users (admins, faculty) untouched.
  const nonStudents = existing.filter((u) => (u.role ?? "student") !== "student")
  writeArraySlice(tenant, "lms.users.v1", [
    ...nonStudents,
    ...Array.from(byEmail.values()),
  ])
  return { inserted, updated, skipped }
}

// Merge a CSV course list. Match by id first, then slug. Only updates
// flat metadata — module/lesson trees are preserved from the existing
// course record so a CSV import never wipes curriculum.
export function importCoursesCsv(
  tenant: string,
  rows: Record<string, string>[],
): ImportSliceSummary {
  type RawCourse = {
    id?: string
    slug?: string
    title?: string
    description?: string
    priceInr?: number | string
    status?: string
    facultyId?: string
    modules?: unknown[]
    createdAt?: string
  }
  const existing = readArraySlice<RawCourse>(tenant, "lms.courses.v1")
  let inserted = 0
  let updated = 0
  let skipped = 0
  const out = [...existing]
  for (const row of rows) {
    const id = row.id?.trim()
    const slug = row.slug?.trim()
    if (!id && !slug) {
      skipped++
      continue
    }
    const idx = out.findIndex(
      (c) => (id && c.id === id) || (slug && c.slug === slug),
    )
    const priceInrNum = Number(row.priceInr)
    const patch: RawCourse = {
      id: id || out[idx]?.id || `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      slug: slug || out[idx]?.slug || "",
      title: row.title ?? out[idx]?.title ?? "",
      description: row.description ?? out[idx]?.description ?? "",
      priceInr: Number.isFinite(priceInrNum)
        ? priceInrNum
        : (out[idx]?.priceInr ?? 0),
      status: row.status ?? out[idx]?.status ?? "draft",
      facultyId: row.facultyId ?? out[idx]?.facultyId ?? "",
      modules: out[idx]?.modules ?? [],
      createdAt: out[idx]?.createdAt ?? new Date().toISOString(),
    }
    if (idx >= 0) {
      out[idx] = { ...out[idx], ...patch }
      updated++
    } else {
      out.push(patch)
      inserted++
    }
  }
  writeArraySlice(tenant, "lms.courses.v1", out)
  return { inserted, updated, skipped }
}

// Re-export mergeArrayByKey for any future per-entity importer that
// wants a generic merge without re-implementing the loop.
export { mergeArrayByKey }
