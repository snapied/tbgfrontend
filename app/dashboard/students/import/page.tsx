"use client"

// Student bulk-import via CSV.
//
// Flow:
//   1. Upload — drag/drop or pick a file. We parse it client-side
//      with our own RFC-4180-ish parser (quoted cells, embedded
//      commas, double-quote escapes). No CSV lib pulled in.
//   2. Map — auto-detect the email / name columns by header name.
//      The teacher can re-pick if our guess is wrong.
//   3. Preview — every parsed row is bucketed into one of:
//        • valid       — will be imported.
//        • duplicate   — email already exists in the workspace. Skipped.
//        • bad-email   — email is missing or malformed. Skipped.
//        • dup-in-file — same email appears twice in the file. First row wins.
//   4. Import — push valid rows through addUser, generate ids, fire
//      a toast with the count + a link back to the roster.
//
// Why client-side parse + import: students live in the localStorage-
// backed lms-store today, so there's no server endpoint to POST to.
// When/if we move students to a real DB, this page swaps in the
// fetch — the UI stays the same.

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { generateId, useLMS, type User } from "@/lib/lms-store"
import { cn } from "@/lib/utils"

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const SAMPLE_CSV = `name,email,phone
Aanya Sharma,aanya@example.com,+91 98765 43210
Ravi Patel,ravi@example.com,+91 98765 11111
Mei Lin,mei@example.com,
`

// Header heuristics. We match case-insensitively so "Name" / "NAME"
// / "Full Name" all resolve to the name field. Order matters — the
// first match wins.
const HEADER_HINTS: Record<string, string[]> = {
  email: ["email", "e-mail", "mail"],
  name: ["name", "full name", "fullname", "student name", "student_name"],
  phone: ["phone", "phone number", "whatsapp", "mobile", "contact"],
}

type RowStatus = "valid" | "duplicate" | "bad-email" | "dup-in-file"
interface ParsedRow {
  rowNum: number
  name: string
  email: string
  phone: string
  status: RowStatus
  reason?: string
}

// RFC-4180-lite parser. Handles quoted cells with embedded commas
// + double-quote escape ("" inside a quoted cell). Doesn't try to
// be clever about Windows line endings — we normalise \r\n to \n
// up front. Returns rows of string[] including the header row.
function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n")
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ",") {
        row.push(cell)
        cell = ""
      } else if (c === "\n") {
        row.push(cell)
        rows.push(row)
        row = []
        cell = ""
      } else {
        cell += c
      }
    }
  }
  // Flush the final cell/row (no trailing newline case).
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

function guessColumn(headers: string[], hints: string[]): number {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[_\s]+/g, " ")
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i])
    if (hints.some((hint) => h === hint || h.includes(hint))) return i
  }
  return -1
}

export default function StudentImportPage() {
  const router = useRouter()
  const { users, addUser } = useLMS()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [rawRows, setRawRows] = useState<string[][] | null>(null)
  const [emailCol, setEmailCol] = useState<number>(-1)
  const [nameCol, setNameCol] = useState<number>(-1)
  const [phoneCol, setPhoneCol] = useState<number>(-1)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)

  const existingEmails = useMemo(
    () => new Set(users.map((u) => u.email.toLowerCase())),
    [users],
  )

  const headers = rawRows && rawRows.length > 0 ? rawRows[0] : []
  const dataRows = rawRows && rawRows.length > 1 ? rawRows.slice(1) : []

  // Bucket every parsed row by status so the preview can colour-code
  // it + the importer can skip non-valid ones. dup-in-file is keyed
  // by lowercase email — the first occurrence wins.
  const classifiedRows: ParsedRow[] = useMemo(() => {
    if (!rawRows || emailCol < 0) return []
    const seenInFile = new Set<string>()
    return dataRows.map((cells, idx): ParsedRow => {
      const email = (cells[emailCol] ?? "").trim().toLowerCase()
      const name = nameCol >= 0 ? (cells[nameCol] ?? "").trim() : ""
      const phone = phoneCol >= 0 ? (cells[phoneCol] ?? "").trim() : ""
      const rowNum = idx + 2  // +1 for 0-index, +1 for header row
      if (!email || !EMAIL_RE.test(email)) {
        return { rowNum, name, email, phone, status: "bad-email", reason: !email ? "Missing email" : "Malformed email" }
      }
      if (existingEmails.has(email)) {
        return { rowNum, name, email, phone, status: "duplicate", reason: "Already a student" }
      }
      if (seenInFile.has(email)) {
        return { rowNum, name, email, phone, status: "dup-in-file", reason: "Repeated in this file" }
      }
      seenInFile.add(email)
      return { rowNum, name, email, phone, status: "valid" }
    })
  }, [rawRows, emailCol, nameCol, phoneCol, dataRows, existingEmails])

  const counts = useMemo(() => {
    const out = { valid: 0, duplicate: 0, badEmail: 0, dupInFile: 0 }
    for (const r of classifiedRows) {
      if (r.status === "valid") out.valid++
      else if (r.status === "duplicate") out.duplicate++
      else if (r.status === "bad-email") out.badEmail++
      else if (r.status === "dup-in-file") out.dupInFile++
    }
    return out
  }, [classifiedRows])

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Pick a .csv file.")
      return
    }
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length < 2) {
        toast.error("Need at least one data row after the header.")
        return
      }
      const hdr = rows[0]
      setFileName(file.name)
      setRawRows(rows)
      setEmailCol(guessColumn(hdr, HEADER_HINTS.email))
      setNameCol(guessColumn(hdr, HEADER_HINTS.name))
      setPhoneCol(guessColumn(hdr, HEADER_HINTS.phone))
    } catch {
      toast.error("Couldn't parse that file. Make sure it's UTF-8 CSV.")
    }
  }

  function reset() {
    setFileName(null)
    setRawRows(null)
    setEmailCol(-1)
    setNameCol(-1)
    setPhoneCol(-1)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function runImport() {
    if (counts.valid === 0) return
    setImporting(true)
    try {
      const nowIso = new Date().toISOString()
      for (const r of classifiedRows) {
        if (r.status !== "valid") continue
        const user: User = {
          id: generateId("user"),
          name: r.name || r.email.split("@")[0],
          email: r.email,
          phone: r.phone || undefined,
          role: "student",
          createdAt: nowIso,
        }
        addUser(user)
      }
      toast.success(`Imported ${counts.valid} student${counts.valid === 1 ? "" : "s"}.`, {
        description:
          counts.duplicate + counts.badEmail + counts.dupInFile > 0
            ? `${counts.duplicate} duplicate · ${counts.badEmail} invalid · ${counts.dupInFile} repeated in file (skipped).`
            : undefined,
      })
      router.push("/dashboard/students")
    } finally {
      setImporting(false)
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "students-import-template.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const hasFile = !!rawRows
  const emailColumnOk = emailCol >= 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/students")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to students
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={downloadSample}>
            <Download className="mr-1.5 h-4 w-4" />
            Download template
          </Button>
          {hasFile && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="mr-1.5 h-4 w-4" />
              Start over
            </Button>
          )}
          <Button
            onClick={runImport}
            disabled={!emailColumnOk || counts.valid === 0 || importing}
          >
            {importing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            {importing
              ? "Importing…"
              : counts.valid > 0
                ? `Import ${counts.valid} student${counts.valid === 1 ? "" : "s"}`
                : "Import"}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Import students from CSV</h1>
        <p className="text-sm text-muted-foreground">
          Drop a spreadsheet with name + email columns. We dedupe by email, so
          re-running the same file is safe — only new students get added.
        </p>
      </div>

      {!hasFile && (
        <Card>
          <CardContent className="p-6">
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void handleFile(file)
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border bg-muted/30 px-6 py-12 text-center transition",
                dragging && "border-primary bg-primary/5",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                }}
              />
              <div className="rounded-full bg-primary/10 p-3">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold">
                  Drop a CSV here, or click to pick one
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  UTF-8, comma-separated. Header row required. Up to 10,000 rows.
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Need a starting point?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    downloadSample()
                  }}
                >
                  Download the template
                </button>
                .
              </p>
            </label>
          </CardContent>
        </Card>
      )}

      {hasFile && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" /> {fileName}
              </CardTitle>
              <CardDescription>
                {dataRows.length} row{dataRows.length === 1 ? "" : "s"} parsed. Match the columns below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ColumnPicker
                  label="Email column *"
                  headers={headers}
                  value={emailCol}
                  onChange={setEmailCol}
                  required
                />
                <ColumnPicker
                  label="Name column"
                  headers={headers}
                  value={nameCol}
                  onChange={setNameCol}
                />
                <ColumnPicker
                  label="Phone column"
                  headers={headers}
                  value={phoneCol}
                  onChange={setPhoneCol}
                />
              </div>
              {!emailColumnOk && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>
                    Pick the column that contains email addresses. We can&apos;t
                    import students without one — email is the unique key.
                  </p>
                </div>
              )}

              {emailColumnOk && (
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <CountChip tone="ok" label="Will import" value={counts.valid} />
                  <CountChip tone="muted" label="Already in workspace" value={counts.duplicate} />
                  <CountChip tone="warn" label="Bad email" value={counts.badEmail} />
                  <CountChip tone="muted" label="Repeated in file" value={counts.dupInFile} />
                </div>
              )}
            </CardContent>
          </Card>

          {emailColumnOk && classifiedRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  First 50 rows. Skipped rows are dimmed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Row</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classifiedRows.slice(0, 50).map((r) => (
                        <TableRow
                          key={r.rowNum}
                          className={cn(r.status !== "valid" && "opacity-60")}
                        >
                          <TableCell className="text-xs text-muted-foreground">{r.rowNum}</TableCell>
                          <TableCell>
                            <StatusPill status={r.status} reason={r.reason} />
                          </TableCell>
                          <TableCell className="text-sm">{r.name || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="font-mono text-xs">{r.email || <span className="text-muted-foreground">(empty)</span>}</TableCell>
                          <TableCell className="text-xs">{r.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {classifiedRows.length > 50 && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    +{classifiedRows.length - 50} more row{classifiedRows.length - 50 === 1 ? "" : "s"} not shown — all will be processed.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        Need a different format? See the{" "}
        <Link href="/help/students" className="font-semibold text-primary underline-offset-2 hover:underline">
          student onboarding guide
        </Link>
        .
      </p>
    </div>
  )
}

function ColumnPicker({
  label,
  headers,
  value,
  onChange,
  required,
}: {
  label: string
  headers: string[]
  value: number
  onChange: (v: number) => void
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      <Select
        value={value === -1 ? "_none" : String(value)}
        onValueChange={(v) => onChange(v === "_none" ? -1 : Number(v))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Pick a column" />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="_none">— None —</SelectItem>}
          {headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>
              {h || `(column ${i + 1})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function CountChip({
  tone,
  label,
  value,
}: {
  tone: "ok" | "warn" | "muted"
  label: string
  value: number
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        tone === "ok" && "border-emerald-500/30 bg-emerald-500/5",
        tone === "warn" && "border-amber-500/30 bg-amber-500/5",
        tone === "muted" && "border-border bg-muted/30",
      )}
    >
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function StatusPill({ status, reason }: { status: RowStatus; reason?: string }) {
  const meta: Record<RowStatus, { label: string; cls: string }> = {
    valid: { label: "Will import", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    duplicate: { label: "Skip · existing", cls: "bg-muted text-muted-foreground" },
    "bad-email": { label: "Skip · bad email", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    "dup-in-file": { label: "Skip · repeated", cls: "bg-muted text-muted-foreground" },
  }
  const m = meta[status]
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
        m.cls,
      )}
      title={reason}
    >
      {m.label}
    </span>
  )
}
