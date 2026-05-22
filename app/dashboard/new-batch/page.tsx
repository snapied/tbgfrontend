"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Upload, AlertCircle, CheckCircle2, X, ChevronRight, ArrowLeft, Loader2, Plus } from "lucide-react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { CertificatePreview, type TemplateType } from "@/components/certificates/certificate-preview"
import { CustomTemplateRenderer, type FieldValues } from "@/components/certificates/custom-template-renderer"
import { useCertificateStore, generateId, type Batch, type Certificate } from "@/lib/certificate-store"
import { loadCustomTemplates, TEMPLATE_VARIABLES, type CustomTemplate } from "@/lib/custom-templates"
import { useLMS } from "@/lib/lms-store"

type Step = "upload" | "preview" | "template" | "generate"

interface CSVRow {
  student_name: string
  email: string
  course_name: string
  completion_date: string
  grade?: string
  instructor_name?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
}

const REQUIRED_COLUMNS = ["student_name", "email", "course_name", "completion_date"]
// Tenant-scoped storage. Both keys hold per-workspace state and must not
// be visible to other tenants.
import { readCurrentTenantSlug } from "@/lib/tenant-store"
function lastTemplateKey(): string {
  return `thebigclass.t.${readCurrentTenantSlug()}.lastTemplate.v1`
}
// Set by the Students page when the user clicks "Generate certificates" —
// lets this page skip the CSV upload step and start at preview.
function pendingBatchKey(): string {
  return `thebigclass.t.${readCurrentTenantSlug()}.pendingBatchRows.v1`
}

const templates: { id: TemplateType; name: string; description: string; bestFor: string }[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Formal navy & gold design with serif typography",
    bestFor: "Academic completion, formal training",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Minimal design with clean sans-serif typography",
    bestFor: "Tech bootcamps, professional courses",
  },
  {
    id: "achievement",
    name: "Achievement",
    description: "Bold gradient design for top performers",
    bestFor: "Awards, hackathons, distinctions",
  },
  {
    id: "participation",
    name: "Participation",
    description: "Friendly pastel design with soft styling",
    bestFor: "Workshops, webinars, school events",
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Two-column navy & gold structure for enterprise training",
    bestFor: "Enterprise programmes, professional bodies",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Dark luxe black & gold with refined display serif",
    bestFor: "Premium courses, awards, fellowships",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Pure typography with editorial whitespace",
    bestFor: "Modern brands, design studios",
  },
  {
    id: "botanical",
    name: "Botanical",
    description: "Soft sage & terracotta with hand-drawn leaves",
    bestFor: "Creative workshops, wellness courses",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Two-pane emerald & cream with refined serif",
    bestFor: "Executive education, leadership programmes",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Premium dark navy with electric blue/violet gradient",
    bestFor: "Tech, fintech & SaaS programmes",
  },
  {
    id: "monogram",
    name: "Monogram",
    description: "Editorial layout with a giant brand-initial monogram",
    bestFor: "Design studios, creative brands",
  },
  {
    id: "diploma",
    name: "Diploma",
    description: "University-style with double border and twin seals",
    bestFor: "Academic completion, institutional awards",
  },
  {
    id: "wave",
    name: "Wave",
    description: "Modern indigo–cyan wave header with floating card",
    bestFor: "Product, growth & marketing programmes",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Dreamy mesh gradient with frosted-glass card",
    bestFor: "Premium SaaS, creative & lifestyle brands",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Aged parchment with wax seal & red Honoris Causa ribbon",
    bestFor: "Heritage academies, classical institutions",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Architectural drawing on deep blue with title block",
    bestFor: "Engineering, architecture & technical training",
  },
  {
    id: "artdeco",
    name: "Art Deco",
    description: "1920s gold geometric Gatsby with sunburst fans",
    bestFor: "Luxury, cultural & lifetime achievement awards",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Synthwave cyberpunk with retro sun & glowing typography",
    bestFor: "Hackathons, gaming, esports & creator economy",
  },
]

export default function NewBatchPage() {
  const router = useRouter()
  const { addBatch } = useCertificateStore()
  const { courses } = useLMS()
  const [step, setStep] = useState<Step>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<CSVRow[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  // Built-in template id or "custom:<customTemplateId>".
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic")
  const [lastUsedTemplate, setLastUsedTemplate] = useState<string | null>(null)
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  // Load custom templates the user has saved + the last-used selection.
  // Sort favourites first, then most-recently-updated, so the most useful
  // templates are always at the top of the picker.
  useEffect(() => {
    const customs = loadCustomTemplates().sort((a, b) => {
      if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
    setCustomTemplates(customs)
    try {
      const saved = window.localStorage.getItem(lastTemplateKey())
      if (!saved) return
      const isCustom = saved.startsWith("custom:")
      const stillExists = isCustom
        ? customs.some((t) => `custom:${t.id}` === saved)
        : templates.some((t) => t.id === saved)
      if (stillExists) {
        setSelectedTemplate(saved)
        setLastUsedTemplate(saved)
      }
    } catch {
      // localStorage unavailable — fall back to default
    }
  }, [])

  const pickTemplate = useCallback((id: string) => {
    setSelectedTemplate(id)
    try {
      window.localStorage.setItem(lastTemplateKey(), id)
    } catch {
      // ignore quota / storage errors — selection still works in-memory
    }
  }, [])

  const sampleFields = Object.fromEntries(
    TEMPLATE_VARIABLES.map((v) => [v.key, v.sample])
  ) as unknown as FieldValues

  const validateRow = useCallback((row: Record<string, string>, index: number): ValidationError[] => {
    const rowErrors: ValidationError[] = []

    // Check required fields
    for (const col of REQUIRED_COLUMNS) {
      if (!row[col] || row[col].trim() === "") {
        rowErrors.push({ row: index + 1, field: col, message: `${col} is required` })
      }
    }

    // Validate email format
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      rowErrors.push({ row: index + 1, field: "email", message: "Invalid email format" })
    }

    // Validate date format
    if (row.completion_date) {
      const date = new Date(row.completion_date)
      if (isNaN(date.getTime())) {
        rowErrors.push({ row: index + 1, field: "completion_date", message: "Invalid date format (use YYYY-MM-DD)" })
      } else if (date > new Date()) {
        rowErrors.push({ row: index + 1, field: "completion_date", message: "Date cannot be in the future" })
      }
    }

    // Validate name length
    if (row.student_name && (row.student_name.length < 1 || row.student_name.length > 100)) {
      rowErrors.push({ row: index + 1, field: "student_name", message: "Name must be 1-100 characters" })
    }

    return rowErrors
  }, [])

  // If the Students page handed us pre-filled rows, validate them and
  // jump straight to the preview step — no CSV upload needed.
  useEffect(() => {
    let raw: string | null = null
    try { raw = window.localStorage.getItem(pendingBatchKey()) } catch { /* ignore */ }
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { rows: Record<string, string>[]; filename?: string }
      if (!parsed.rows || parsed.rows.length === 0) return
      const allErrors: ValidationError[] = []
      parsed.rows.forEach((row, i) => allErrors.push(...validateRow(row, i)))
      setFile(new File([], parsed.filename ?? "selected-students.csv"))
      setParsedData(parsed.rows as unknown as CSVRow[])
      setErrors(allErrors)
      setStep("preview")
      try { window.localStorage.removeItem(pendingBatchKey()) } catch { /* ignore */ }
    } catch {
      // ignore — user can still use the regular upload flow
    }
  }, [validateRow])

  const handleFile = useCallback((uploadedFile: File) => {
    if (uploadedFile.type !== "text/csv" && !uploadedFile.name.endsWith(".csv")) {
      setErrors([{ row: 0, field: "file", message: "File must be a CSV" }])
      return
    }

    if (uploadedFile.size > 5 * 1024 * 1024) {
      setErrors([{ row: 0, field: "file", message: "File must be under 5MB" }])
      return
    }

    setFile(uploadedFile)
    
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        const data = results.data as Record<string, string>[]
        
        if (data.length > 1000) {
          setErrors([{ row: 0, field: "file", message: "File cannot exceed 1,000 rows" }])
          return
        }

        // Check for required columns
        const headers = Object.keys(data[0] || {})
        const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
        
        if (missingColumns.length > 0) {
          setErrors([{ row: 0, field: "columns", message: `Missing required columns: ${missingColumns.join(", ")}` }])
          return
        }

        // Validate each row
        const allErrors: ValidationError[] = []
        data.forEach((row, index) => {
          const rowErrors = validateRow(row, index)
          allErrors.push(...rowErrors)
        })

        setParsedData(data as unknown as CSVRow[])
        setErrors(allErrors)
        setStep("preview")
      },
      error: () => {
        setErrors([{ row: 0, field: "file", message: "Failed to parse CSV file" }])
      },
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }, [handleFile])

  const handleGenerate = async () => {
    setIsGenerating(true)
    const validRows = parsedData.filter((_, index) => 
      !errors.some(e => e.row === index + 1)
    )

    const batchId = generateId("batch")
    // selectedTemplate is either a built-in id ("classic", "modern", …) or
    // a custom-template reference of the form "custom:<id>". Resolve both
    // into the persisted Certificate.template + optional customTemplateId.
    const isCustom = selectedTemplate.startsWith("custom:")
    const templateType: Certificate["template"] = isCustom ? "custom" : (selectedTemplate as TemplateType)
    const customTemplateId = isCustom ? selectedTemplate.slice("custom:".length) : undefined
    const now = new Date().toISOString()
    const courseName = validRows[0]?.course_name || "Untitled Course"

    // Generate certificates
    const certificates: Certificate[] = []

    for (let i = 0; i < validRows.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30))
      setGenerationProgress(Math.round(((i + 1) / validRows.length) * 100))

      const row = validRows[i]
      const certId = `CERT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`

      // Resolve instructor_name from the row first, but if it's blank,
      // look up the matching course in the LMS store and use that course's
      // instructor. Falls back to a friendly default only as a last resort.
      const courseMatch = courses.find(
        (c) => c.title.trim().toLowerCase() === (row.course_name || "").trim().toLowerCase()
      )
      const resolvedInstructor =
        row.instructor_name?.trim() || courseMatch?.instructor?.name || "Course Instructor"

      certificates.push({
        id: certId,
        studentName: row.student_name,
        email: row.email,
        courseName: row.course_name,
        completionDate: row.completion_date,
        grade: row.grade,
        instructorName: resolvedInstructor,
        template: templateType,
        customTemplateId,
        status: "active",
        batchId: batchId,
        createdAt: now,
      })
    }

    // Create batch
    const newBatch: Batch = {
      id: batchId,
      courseName: courseName,
      template: templateType,
      customTemplateId,
      totalRows: parsedData.length,
      successCount: certificates.length,
      failureCount: parsedData.length - certificates.length,
      status: "completed",
      createdAt: now,
      createdBy: "Demo User",
      certificates: certificates,
    }

    // Save to store
    addBatch(newBatch)

    // Navigate to the new batch detail page
    router.push(`/dashboard/history/${batchId}`)
  }

  const validRowCount = parsedData.length - new Set(errors.map(e => e.row)).size

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {["upload", "preview", "template", "generate"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["upload", "preview", "template", "generate"].indexOf(step) > i
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {["upload", "preview", "template", "generate"].indexOf(step) > i ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className={cn("hidden text-sm sm:inline", step === s ? "font-medium" : "text-muted-foreground")}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with student data. Required columns: student_name, email, course_name, completion_date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Drop zone: drag-and-drop is OK on the whole area, but the
                "click to browse" UX is restricted to the Browse Files
                button. Previously an `<input type="file" class="absolute
                inset-0">` covered the whole area, so any click anywhere
                near the drop zone re-opened the OS file picker — including
                clicks meant for the side nav, which made it feel like the
                page kept hijacking the user. */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
            >
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="mt-1 text-sm text-muted-foreground">or use the button below</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => uploadInputRef.current?.click()}
                type="button"
              >
                Browse files
              </Button>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ""  // allow re-selecting the same file
                }}
              />
              <p className="mt-4 text-xs text-muted-foreground">Max 5MB, up to 1,000 rows</p>
            </div>

            {errors.length > 0 && step === "upload" && (
              <div className="mt-4 rounded-lg bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-medium">Upload Error</p>
                </div>
                <p className="mt-1 text-sm text-destructive">{errors[0].message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Data</CardTitle>
                <CardDescription>
                  {file?.name} &bull; {parsedData.length} rows &bull; {validRowCount} valid
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setFile(null); setParsedData([]); setErrors([]) }}>
                <X className="mr-1 h-4 w-4" /> Change file
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-medium">{errors.length} validation errors</p>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-destructive">
                  {errors.slice(0, 5).map((err, i) => (
                    <li key={i}>Row {err.row}: {err.message}</li>
                  ))}
                  {errors.length > 5 && <li>... and {errors.length - 5} more errors</li>}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Course</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, i) => {
                    const hasError = errors.some(e => e.row === i + 1)
                    return (
                      <tr key={i} className={cn("border-t border-border", hasError && "bg-destructive/5")}>
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">{row.student_name}</td>
                        <td className="px-4 py-3">{row.email}</td>
                        <td className="px-4 py-3">{row.course_name}</td>
                        <td className="px-4 py-3">{row.completion_date}</td>
                        <td className="px-4 py-3">
                          {hasError ? (
                            <span className="text-destructive">Error</span>
                          ) : (
                            <span className="text-success">Valid</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <div className="border-t border-border bg-muted/30 px-4 py-2 text-center text-sm text-muted-foreground">
                  Showing 10 of {parsedData.length} rows
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep("template")} disabled={validRowCount === 0}>
                Continue with {validRowCount} valid rows
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "template" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Template</CardTitle>
            <CardDescription>Choose a certificate design for this batch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Custom templates (user-designed). Surfaced first so the user
                sees their own work before scrolling through built-ins. */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Your templates
                </h3>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/templates/new">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Design new
                  </Link>
                </Button>
              </div>
              {customTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  You haven't designed any templates yet.{" "}
                  <Link href="/dashboard/templates/new" className="font-medium text-primary underline">
                    Create one
                  </Link>{" "}
                  to use it here.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {customTemplates.map((ct) => {
                    const value = `custom:${ct.id}`
                    return (
                      <button
                        key={ct.id}
                        onClick={() => pickTemplate(value)}
                        className={cn(
                          "rounded-lg border-2 p-4 text-left transition-all",
                          selectedTemplate === value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="mb-3 overflow-hidden rounded border border-border">
                          <CustomTemplateRenderer template={ct} fields={sampleFields} fit />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold">{ct.name}</h3>
                          {lastUsedTemplate === value && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                              Last used
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Custom · updated {new Date(ct.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Built-in templates
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => pickTemplate(template.id)}
                    className={cn(
                      "rounded-lg border-2 p-4 text-left transition-all",
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="mb-3 overflow-hidden rounded border border-border">
                      <CertificatePreview template={template.id} scale="sm" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{template.name}</h3>
                      {lastUsedTemplate === template.id && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                          Last used
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                    <p className="mt-2 text-xs text-accent-foreground/70">Best for: {template.bestFor}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("preview")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep("generate")}>
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "generate" && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Certificates</CardTitle>
            <CardDescription>Review and confirm your batch details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template</span>
                <span className="font-medium">{templates.find(t => t.id === selectedTemplate)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Certificates to generate</span>
                <span className="font-medium">{validRowCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skipped (errors)</span>
                <span className="font-medium text-destructive">{parsedData.length - validRowCount}</span>
              </div>
            </div>

            {isGenerating ? (
              <div className="space-y-4">
                <Progress value={generationProgress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground">
                  Generating certificates... {generationProgress}%
                </p>
              </div>
            ) : (
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("template")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleGenerate}>
                  <Loader2 className={cn("mr-2 h-4 w-4", isGenerating && "animate-spin")} />
                  Generate {validRowCount} Certificates
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
