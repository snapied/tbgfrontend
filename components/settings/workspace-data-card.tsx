"use client"

// Workspace export + import surface.
//
// Lives at the bottom of /dashboard/settings — the most
// load-bearing trust commitment we make ("your data leaves with
// you in one click") earns its own dedicated card on the page
// every admin already visits.
//
// Export is non-destructive: it reads localStorage, packages a
// JSON envelope, triggers a download. Import is destructive
// (replace mode by default) so we gate it behind a confirmation
// dialog that previews what's about to land + warns about the
// overwrite.

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  Receipt,
  RefreshCw,
  Upload,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  exportCourses,
  exportOrders,
  exportStudents,
  exportWorkspace,
  importCoursesCsv,
  importStudentsCsv,
  importWorkspace,
  parseCsv,
  rowsToCsv,
  suggestEntityFilename,
  suggestExportFilename,
  validateExportEnvelope,
  type EntityName,
  type ExportFormat,
  type ImportSliceSummary,
  type ProgressEvent,
  type WorkspaceExport,
} from "@/lib/workspace-export"
import { useTenant } from "@/lib/tenant-store"
import { toast } from "sonner"

interface Phase {
  kind: "idle" | "exporting" | "exported" | "preview" | "importing" | "imported" | "error"
  message?: string
  // Last progress event so we can render a "N of M slices" line
  // under the bar.
  progress?: ProgressEvent
}

// A pending CSV import that's been parsed + previewed but not yet
// applied. We keep both the entity type and the parsed rows so the
// dialog can show "N rows of <entity>" and the apply step knows which
// importer to call.
interface PendingCsv {
  entity: "students" | "courses"
  rows: Record<string, string>[]
  filename: string
}

export function WorkspaceDataCard() {
  const { currentTenant } = useTenant()
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [pendingEnvelope, setPendingEnvelope] = useState<WorkspaceExport | null>(null)
  const [pendingCsv, setPendingCsv] = useState<PendingCsv | null>(null)
  const [exportSize, setExportSize] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  // Which entity the next CSV file-picker click is bound to. Set
  // when the user clicks "Import students CSV" or "Import courses
  // CSV" — the <input> onChange reads this to dispatch to the
  // correct parser.
  const csvEntityRef = useRef<"students" | "courses">("students")

  // Reset to idle a few seconds after a "done" state — keeps the
  // success affordance visible long enough to register but
  // doesn't trap the user in it.
  useEffect(() => {
    if (phase.kind !== "exported" && phase.kind !== "imported") return
    const t = setTimeout(() => setPhase({ kind: "idle" }), 6_000)
    return () => clearTimeout(t)
  }, [phase.kind])

  const tenantSlug = currentTenant?.slug
  const tenantName = currentTenant?.name

  async function onExport() {
    if (!tenantSlug) {
      toast.error("Pick a workspace first.")
      return
    }
    setPhase({ kind: "exporting" })
    try {
      const envelope = await exportWorkspace(tenantSlug, {
        sourceTenantName: tenantName,
        onProgress: (p) => setPhase({ kind: "exporting", progress: p }),
      })
      // Trigger the download. URL.createObjectURL keeps the file
      // entirely in the browser — nothing hits a server, which is
      // what makes the "your data, your hands" claim honest.
      const json = JSON.stringify(envelope, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = suggestExportFilename(tenantSlug, envelope.exportedAt)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportSize(blob.size)
      setPhase({ kind: "exported" })
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message })
    }
  }

  // Per-entity export. CSV is the universal sheet format every
  // creator already knows how to open. JSON is the lossless option
  // for anyone wiring this into another tool or a script.
  function onExportEntity(entity: EntityName, format: ExportFormat) {
    if (!tenantSlug) {
      toast.error("Pick a workspace first.")
      return
    }
    const rows =
      entity === "students"
        ? exportStudents(tenantSlug)
        : entity === "courses"
          ? exportCourses(tenantSlug)
          : exportOrders(tenantSlug)
    if (rows.length === 0) {
      toast.message(`No ${entity} to export yet.`)
      return
    }
    const exportedAt = new Date().toISOString()
    let body: string
    let mime: string
    if (format === "csv") {
      body = rowsToCsv(rows)
      mime = "text/csv;charset=utf-8"
    } else {
      // Mirror the workspace envelope shape on a single-entity scale
      // so a tool consuming "students.json" can rely on the same
      // {format, version, exportedAt, rows} contract.
      body = JSON.stringify(
        {
          format: EXPORT_FORMAT,
          version: EXPORT_VERSION,
          entity,
          exportedAt,
          sourceTenant: tenantSlug,
          sourceTenantName: tenantName,
          rows,
        },
        null,
        2,
      )
      mime = "application/json"
    }
    const blob = new Blob([body], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = suggestEntityFilename(tenantSlug, entity, exportedAt, format)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(
      `Downloaded ${rows.length.toLocaleString()} ${entity} (${format.toUpperCase()})`,
    )
  }

  // CSV file picker. Parses the file, shows a preview dialog with
  // the row count so the user can sanity-check before we write.
  async function onPickCsv(file: File, entity: "students" | "courses") {
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) {
        toast.error("The CSV had no data rows.")
        return
      }
      setPendingCsv({ entity, rows, filename: file.name })
    } catch (err) {
      toast.error(`Couldn't read the CSV: ${(err as Error).message}`)
    }
  }

  function onConfirmCsvImport() {
    if (!pendingCsv || !tenantSlug) return
    let summary: ImportSliceSummary
    try {
      summary =
        pendingCsv.entity === "students"
          ? importStudentsCsv(tenantSlug, pendingCsv.rows)
          : importCoursesCsv(tenantSlug, pendingCsv.rows)
    } catch (err) {
      toast.error(`Import failed: ${(err as Error).message}`)
      return
    }
    setPendingCsv(null)
    toast.success(
      `${pendingCsv.entity}: ${summary.inserted} added, ${summary.updated} updated${
        summary.skipped > 0 ? `, ${summary.skipped} skipped` : ""
      }. Reloading…`,
      { duration: 2500 },
    )
    setTimeout(() => window.location.reload(), 1200)
  }

  async function onPickFile(file: File) {
    setPhase({ kind: "exporting" /* spinner state while parsing */ })
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const result = validateExportEnvelope(parsed)
      if (!result.ok) {
        setPhase({ kind: "error", message: result.reason })
        return
      }
      setPendingEnvelope(result.envelope)
      setPhase({ kind: "preview" })
    } catch (err) {
      setPhase({
        kind: "error",
        message: `Couldn't parse the file as JSON: ${(err as Error).message}`,
      })
    }
  }

  async function onConfirmImport() {
    if (!pendingEnvelope || !tenantSlug) return
    setPhase({ kind: "importing" })
    try {
      await importWorkspace(pendingEnvelope, {
        targetTenant: tenantSlug,
        mode: "replace",
        onProgress: (p) => setPhase({ kind: "importing", progress: p }),
      })
      setPhase({ kind: "imported" })
      setPendingEnvelope(null)
      toast.success("Workspace restored. Reloading…", { duration: 2500 })
      // Hard reload so every React store re-hydrates against the
      // fresh localStorage. Without this, half the dashboard would
      // still be holding stale state until the next manual refresh.
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message })
    }
  }

  // Render the counts preview from the envelope's summary stats.
  const previewRows = useMemo(() => {
    if (!pendingEnvelope) return []
    return Object.entries(pendingEnvelope.counts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, n]) => n > 0)
  }, [pendingEnvelope])

  const isWorking = phase.kind === "exporting" || phase.kind === "importing"

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Workspace data
          </CardTitle>
          <CardDescription>
            Export every byte of this workspace to a single JSON file. Re-upload it later — into this
            workspace or a fresh one — to recover everything you had.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export half */}
          <Section
            title="Export everything"
            description="Courses, lessons, modules, students, faculty, enrolments, quizzes, attempts, assignments, submissions, certificates, orders, entitlements, products, blog posts, portal pages, brand config, notifications, doubts, announcements, reviews — everything stored against this workspace."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onExport} disabled={isWorking || !tenantSlug}>
                {phase.kind === "exporting" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {phase.kind === "exporting" ? "Packaging…" : "Export workspace"}
              </Button>
              {phase.kind === "exported" && (
                <span className="inline-flex items-center gap-1 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Downloaded
                  {exportSize != null && (
                    <span className="ml-1 text-muted-foreground">
                      · {formatBytes(exportSize)}
                    </span>
                  )}
                </span>
              )}
            </div>
            {phase.kind === "exporting" && phase.progress && (
              <ProgressLine progress={phase.progress} />
            )}
          </Section>

          <div className="h-px bg-border" />

          {/* Per-entity export. Most creators don't think in
              workspaces — they think "I want my students as a CSV
              for Mailchimp" or "give me every course in a sheet so
              I can audit pricing". */}
          <Section
            title="Export by entity"
            description="Pull out a single slice as a spreadsheet (CSV) or as a structured JSON. Round-trip friendly: re-upload an edited CSV below to update records by email (students) or by id/slug (courses)."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <EntityExportRow
                icon={Users}
                label="Students"
                disabled={!tenantSlug || isWorking}
                onCsv={() => onExportEntity("students", "csv")}
                onJson={() => onExportEntity("students", "json")}
              />
              <EntityExportRow
                icon={BookOpen}
                label="Courses"
                disabled={!tenantSlug || isWorking}
                onCsv={() => onExportEntity("courses", "csv")}
                onJson={() => onExportEntity("courses", "json")}
              />
              <EntityExportRow
                icon={Receipt}
                label="Orders"
                disabled={!tenantSlug || isWorking}
                onCsv={() => onExportEntity("orders", "csv")}
                onJson={() => onExportEntity("orders", "json")}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Import CSV →
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!tenantSlug || isWorking}
                onClick={() => {
                  csvEntityRef.current = "students"
                  csvInputRef.current?.click()
                }}
              >
                <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                Students CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!tenantSlug || isWorking}
                onClick={() => {
                  csvEntityRef.current = "courses"
                  csvInputRef.current?.click()
                }}
              >
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                Courses CSV
              </Button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onPickCsv(f, csvEntityRef.current)
                  e.target.value = ""
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              CSV import is non-destructive: existing rows are updated, new rows are added.
              Course curriculum (modules + lessons) stays intact.
            </p>
          </Section>

          <div className="h-px bg-border" />

          {/* Import half */}
          <Section
            title="Import from a full workspace export"
            description="Pick a .json file you downloaded from any The Big Class workspace. We'll preview what's inside before anything writes."
          >
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onPickFile(f)
                  // Reset so picking the same file twice in a row still fires.
                  e.target.value = ""
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isWorking || !tenantSlug}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose export file
              </Button>
              {phase.kind === "imported" && (
                <span className="inline-flex items-center gap-1 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Imported · reloading
                </span>
              )}
            </div>
            {phase.kind === "importing" && phase.progress && (
              <ProgressLine progress={phase.progress} />
            )}
          </Section>

          {phase.kind === "error" && phase.message && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="font-medium">Something went wrong</p>
                <p className="text-muted-foreground">{phase.message}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPhase({ kind: "idle" })}
                className="ml-auto"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Dismiss
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            The export file is plain JSON — nothing proprietary. Browser-local: nothing leaves
            your machine.
          </p>
        </CardContent>
      </Card>

      {/* Import preview / confirm dialog */}
      <Dialog
        open={phase.kind === "preview"}
        onOpenChange={(o) => {
          if (!o) {
            setPendingEnvelope(null)
            setPhase({ kind: "idle" })
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Replace this workspace?</DialogTitle>
            <DialogDescription>
              Importing overwrites every slice in <span className="font-semibold text-foreground">{tenantName ?? tenantSlug}</span>{" "}
              with the contents of this archive. There&apos;s no automatic backup — export this
              workspace first if you want a safety net.
            </DialogDescription>
          </DialogHeader>
          {pendingEnvelope && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  From: {pendingEnvelope.sourceTenantName ?? pendingEnvelope.sourceTenant}
                </Badge>
                <Badge variant="outline">
                  Exported: {new Date(pendingEnvelope.exportedAt).toLocaleString()}
                </Badge>
                <Badge variant="outline">v{pendingEnvelope.version}</Badge>
              </div>
              {previewRows.length > 0 ? (
                <ul className="grid grid-cols-2 gap-1 text-xs">
                  {previewRows.slice(0, 12).map(([label, n]) => (
                    <li key={label} className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1">
                      <span className="capitalize text-muted-foreground">{label}</span>
                      <span className="font-mono text-foreground">{n.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No row-counted slices in this archive (probably config-only).
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Total slices: {Object.keys(pendingEnvelope.slices).length}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPendingEnvelope(null)
                setPhase({ kind: "idle" })
              }}
            >
              Cancel
            </Button>
            <Button onClick={onConfirmImport}>
              <Upload className="mr-2 h-4 w-4" />
              Replace + reload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV import preview. Non-destructive merge, but we still
          confirm so the user catches a wrong-entity drop (e.g.
          uploading a courses CSV against the students importer). */}
      <Dialog
        open={pendingCsv != null}
        onOpenChange={(o) => {
          if (!o) setPendingCsv(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Import {pendingCsv?.rows.length.toLocaleString()} {pendingCsv?.entity}?
            </DialogTitle>
            <DialogDescription>
              {pendingCsv?.entity === "students" ? (
                <>
                  Matched by <span className="font-mono">email</span>. Existing students will be
                  updated; new students will be added. Other users (admins, faculty) are left alone.
                </>
              ) : (
                <>
                  Matched by <span className="font-mono">id</span>, then <span className="font-mono">slug</span>.
                  Only flat metadata changes — module + lesson trees are preserved.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {pendingCsv && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  File: <span className="ml-1 font-mono text-[11px]">{pendingCsv.filename}</span>
                </Badge>
                <Badge variant="outline">
                  Rows: {pendingCsv.rows.length.toLocaleString()}
                </Badge>
                <Badge variant="outline">
                  Columns: {Object.keys(pendingCsv.rows[0] ?? {}).length}
                </Badge>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Columns detected
                </p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-foreground/80">
                  {Object.keys(pendingCsv.rows[0] ?? {}).join(", ")}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview (first row)
                </p>
                <ul className="mt-1 space-y-0.5 text-[11px]">
                  {Object.entries(pendingCsv.rows[0] ?? {}).slice(0, 6).map(([k, v]) => (
                    <li key={k} className="flex items-baseline gap-2">
                      <span className="w-24 shrink-0 truncate font-mono text-muted-foreground">{k}</span>
                      <span className="truncate text-foreground">{v || "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingCsv(null)}>
              Cancel
            </Button>
            <Button onClick={onConfirmCsvImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import + reload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function EntityExportRow({
  icon: Icon,
  label,
  disabled,
  onCsv,
  onJson,
}: {
  icon: React.ElementType
  label: string
  disabled: boolean
  onCsv: () => void
  onJson: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-3">
      <div className="inline-flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <div className="inline-flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={disabled} onClick={onCsv}>
          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
          CSV
        </Button>
        <Button variant="outline" size="sm" disabled={disabled} onClick={onJson}>
          <FileJson className="mr-1 h-3.5 w-3.5" />
          JSON
        </Button>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ProgressLine({ progress }: { progress: ProgressEvent }) {
  const pct = Math.round((progress.current / Math.max(1, progress.total)) * 100)
  return (
    <div className="space-y-1.5">
      <Progress value={pct} className="h-1.5" />
      <p className="text-[11px] text-muted-foreground">
        {progress.phase === "read" ? "Reading" : "Writing"} {progress.current}/{progress.total}
        <span className="ml-1 font-mono">{progress.sliceKey}</span>
      </p>
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
