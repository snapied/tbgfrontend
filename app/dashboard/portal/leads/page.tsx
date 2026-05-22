"use client"

// Lead inbox — every contact-form submission lands here. Three layers
// of triage available on every row + the detail dialog:
//
//   1. Workflow status (new → contacted → qualified → archived) —
//      moves through the funnel.
//   2. Priority (hot / warm / cold) — admin's judgment of how
//      promising the lead looks, independent of status.
//   3. Star flag — manual "important, don't lose this" marker.
//
// Both quick actions (star toggle, status dropdown, archive) and the
// detail dialog (priority picker, star toggle, tag editor, notes)
// route through updateLead so the audit timestamp + sidebar badge
// stay in sync.

import { useMemo, useRef, useState } from "react"
import {
  Archive,
  CheckCircle2,
  Download,
  Flame,
  Inbox,
  PhoneCall,
  Plus,
  Search,
  Snowflake,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  generatePortalId,
  usePortal,
  type LeadPriority,
  type LeadStatus,
  type PortalLead,
} from "@/lib/portal-store"
import { parseCsv } from "@/lib/workspace-export"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/lib/use-confirm"

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-primary/15 text-primary",
  contacted: "bg-accent/15 text-accent",
  qualified: "bg-success/15 text-success",
  archived: "bg-muted text-muted-foreground",
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  archived: "Archived",
}

// Priority palette — warm/cool poles mapped to colours that read
// even at the small pill size used in the list.
const PRIORITY_META: Record<LeadPriority, { label: string; cls: string; icon: React.ReactNode }> = {
  hot:  { label: "Hot",  cls: "bg-destructive/10 text-destructive border-destructive/30", icon: <Flame className="h-3 w-3" /> },
  warm: { label: "Warm", cls: "bg-accent/15 text-accent border-accent/30",                icon: <Sparkles className="h-3 w-3" /> },
  cold: { label: "Cold", cls: "bg-muted text-muted-foreground border-border",              icon: <Snowflake className="h-3 w-3" /> },
}

// Header column → PortalLead field mapping for the CSV importer.
// We accept several common label variants so a sheet exported from
// Mailchimp, Notion, Google Forms, or our own CSV exporter all
// round-trip without manual remapping. The values are lowercase
// because we match against `header.toLowerCase().trim()`.
const CSV_FIELD_ALIASES: Record<string, keyof PortalLead | "tagsString"> = {
  name:        "name",
  "full name": "name",
  email:       "email",
  "e-mail":    "email",
  phone:       "phone",
  mobile:      "phone",
  "phone number": "phone",
  message:     "message",
  notes:       "notes",
  status:      "status",
  priority:    "priority",
  source:      "source",
  starred:     "starred",
  star:        "starred",
  tags:        "tagsString",
  form:        "formId",
  page:        "pageSlug",
  date:        "createdAt",
}

interface ImportPreview {
  filename: string
  parsed: PortalLead[]
  skipped: number
  detectedColumns: string[]
}

// Lead inbox is part of the Pro+ marketing toolkit. Starter sees the
// real inbox dimmed as a preview behind the upgrade card, so they
// know what they're getting (without being able to interact).
export default function LeadsPage() {
  return (
    <PlanFeatureGate feature="marketingTools">
      <LeadsPageInner />
    </PlanFeatureGate>
  )
}

function LeadsPageInner() {
  const { leads, addLead, updateLead, deleteLead } = usePortal()
  const confirm = useConfirm()
  // Confirm-then-delete helper. Centralised so the row trash button
  // and any future "delete from detail dialog" affordance share copy.
  async function confirmDeleteLead(lead: PortalLead) {
    const ok = await confirm({
      title: `Delete this lead?`,
      description: `${lead.name ?? lead.email} will be removed from the inbox. This can't be undone — export the inbox first if you might need it back.`,
      destructive: true,
      confirmLabel: "Delete lead",
    })
    if (!ok) return
    deleteLead(lead.id)
    toast.success("Lead deleted.")
  }
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [starredOnly, setStarredOnly] = useState(false)
  const [openLead, setOpenLead] = useState<PortalLead | null>(null)
  // Manual lead creation. Same shape as CSV import, just one row at
  // a time, for the "phone call came in, I want to log it" case.
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<{
    name: string
    email: string
    phone: string
    message: string
    priority: LeadPriority | "none"
    source: string
    tags: string
  }>({ name: "", email: "", phone: "", message: "", priority: "none", source: "manual", tags: "" })

  function resetDraft() {
    setDraft({ name: "", email: "", phone: "", message: "", priority: "none", source: "manual", tags: "" })
  }

  function commitNewLead() {
    const email = draft.email.trim().toLowerCase()
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast.error("Email is required and must be valid.")
      return
    }
    const tags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    addLead({
      id: generatePortalId("lead"),
      formId: "manual",
      pageSlug: "manual",
      name: draft.name.trim() || undefined,
      email,
      phone: draft.phone.trim() || undefined,
      message: draft.message.trim() || undefined,
      source: draft.source.trim() || "manual",
      status: "new",
      priority: draft.priority === "none" ? undefined : draft.priority,
      tags: tags.length > 0 ? tags : undefined,
      createdAt: new Date().toISOString(),
    })
    toast.success(`Lead added — ${draft.name.trim() || email}`)
    setCreateOpen(false)
    resetDraft()
  }
  // CSV import — file picker + preview dialog. parseCsv() runs
  // client-side so a 10k-row CSV never leaves the browser.
  const importInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)

  // Inbox-style ordering: starred leads bubble to the top, then
  // priority (hot > warm > unset > cold), then recency. Within each
  // tier ties break on createdAt so the most recent is at the top.
  const filtered = useMemo(() => {
    const base = leads
      .filter((l) => statusFilter === "all" || l.status === statusFilter)
      .filter((l) => priorityFilter === "all" || (l.priority ?? "") === priorityFilter)
      .filter((l) => !starredOnly || l.starred === true)
    const matched = fuzzySearch(base, search, (l) => [
      l.name ?? "",
      l.email,
      l.message ?? "",
      l.phone ?? "",
      ...(l.tags ?? []),
    ])
    const priorityRank: Record<string, number> = { hot: 0, warm: 1, "": 2, cold: 3 }
    return [...matched].sort((a, b) => {
      // Starred always wins.
      if ((b.starred ? 1 : 0) - (a.starred ? 1 : 0) !== 0) {
        return (b.starred ? 1 : 0) - (a.starred ? 1 : 0)
      }
      const pa = priorityRank[a.priority ?? ""] ?? 2
      const pb = priorityRank[b.priority ?? ""] ?? 2
      if (pa !== pb) return pa - pb
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [leads, search, statusFilter, priorityFilter, starredOnly])

  const newCount = useMemo(() => leads.filter((l) => l.status === "new").length, [leads])
  const starredCount = useMemo(() => leads.filter((l) => l.starred).length, [leads])

  const exportCsv = () => {
    const rows: string[][] = [
      ["Date", "Name", "Email", "Phone", "Message", "Form", "Page", "Status", "Priority", "Starred", "Tags", "Notes"],
      ...leads.map((l) => [
        l.createdAt,
        l.name ?? "",
        l.email,
        l.phone ?? "",
        l.message ?? "",
        l.formId,
        l.pageSlug,
        l.status,
        l.priority ?? "",
        l.starred ? "yes" : "",
        (l.tags ?? []).join("|"),
        l.notes ?? "",
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // CSV import. Read → parseCsv → coerce each row into a PortalLead
  // → preview. Rows missing an email are skipped + counted so the
  // admin can see how many lines didn't make the cut before
  // committing. We don't auto-import — the admin confirms in the
  // preview dialog.
  async function onPickImportFile(file: File) {
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) {
        toast.error("Couldn't find any rows in that CSV.")
        return
      }
      // Normalise headers via the alias table.
      const headerKeys = Object.keys(rows[0]).map((h) => h.trim())
      const headerMap: Record<string, keyof PortalLead | "tagsString" | undefined> = {}
      for (const h of headerKeys) {
        headerMap[h] = CSV_FIELD_ALIASES[h.toLowerCase().trim()]
      }
      const parsed: PortalLead[] = []
      let skipped = 0
      for (const row of rows) {
        const lead: Partial<PortalLead> & { tagsString?: string } = {}
        for (const h of headerKeys) {
          const field = headerMap[h]
          if (!field) continue
          const value = row[h]?.trim()
          if (!value) continue
          if (field === "tagsString") {
            lead.tagsString = value
          } else if (field === "starred") {
            const v = value.toLowerCase()
            ;(lead as PortalLead).starred = v === "yes" || v === "true" || v === "1"
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(lead as any)[field] = value
          }
        }
        if (!lead.email) {
          skipped++
          continue
        }
        const tags = lead.tagsString
          ? lead.tagsString.split(/[|,]/).map((t) => t.trim()).filter(Boolean)
          : undefined
        const status: LeadStatus = ((["new", "contacted", "qualified", "archived"] as const).includes(
          lead.status as LeadStatus,
        )
          ? lead.status
          : "new") as LeadStatus
        const priority: LeadPriority | undefined =
          lead.priority === "hot" || lead.priority === "warm" || lead.priority === "cold"
            ? lead.priority
            : undefined
        parsed.push({
          id: generatePortalId("lead"),
          formId: lead.formId ?? "import",
          pageSlug: lead.pageSlug ?? "csv-import",
          name: lead.name,
          email: lead.email.toLowerCase(),
          phone: lead.phone,
          message: lead.message,
          source: lead.source ?? "csv-import",
          status,
          priority,
          starred: lead.starred,
          tags,
          notes: lead.notes,
          createdAt: lead.createdAt
            ? new Date(lead.createdAt).toISOString()
            : new Date().toISOString(),
        })
      }
      setImportPreview({
        filename: file.name,
        parsed,
        skipped,
        detectedColumns: headerKeys.filter((h) => headerMap[h]),
      })
    } catch (err) {
      toast.error(`Couldn't read CSV: ${(err as Error).message}`)
    }
  }

  function commitImport() {
    if (!importPreview) return
    // Walk the parsed list in reverse so the original CSV order ends
    // up newest-first in the inbox (addLead prepends).
    for (let i = importPreview.parsed.length - 1; i >= 0; i--) {
      addLead(importPreview.parsed[i])
    }
    toast.success(
      `Imported ${importPreview.parsed.length.toLocaleString()} lead${importPreview.parsed.length === 1 ? "" : "s"}`,
    )
    setImportPreview(null)
  }

  // Tiny helpers used in both the row + dialog. Keep updates flowing
  // through updateLead so updatedAt is bumped consistently and the
  // sidebar badge can rely on a single source of truth.
  function toggleStar(id: string, starred: boolean) {
    updateLead(id, { starred: !starred })
  }
  function setStatus(id: string, status: LeadStatus) {
    updateLead(id, { status })
  }
  function setPriority(id: string, priority: LeadPriority | "none") {
    updateLead(id, { priority: priority === "none" ? undefined : priority })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Lead inbox</h1>
          <p className="text-muted-foreground">
            Every contact-form submission from your public site lives here.
          </p>
          {/* At-a-glance counts. New = needs triage; starred =
              admin-flagged "don't lose this." */}
          {leads.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {newCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {newCount} new
                </span>
              )}
              {starredCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                  <Star className="h-3 w-3 fill-current" />
                  {starredCount} starred
                </span>
              )}
              <span className="text-muted-foreground">· {leads.length} total</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onPickImportFile(f)
              e.target.value = ""
            }}
          />
          <Button
            onClick={() => setCreateOpen(true)}
            title="Add a lead manually (phone call, walk-in, off-platform contact)"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New lead
          </Button>
          <Button
            variant="outline"
            onClick={() => importInputRef.current?.click()}
            title="Import leads from a CSV file"
          >
            <Upload className="mr-1.5 h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={leads.length === 0}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads — typos OK"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={starredOnly ? "default" : "outline"}
          onClick={() => setStarredOnly((s) => !s)}
          className="gap-1.5"
          title="Show starred leads only — tap the ★ on any lead row to star it"
        >
          <Star className={cn("h-4 w-4", starredOnly && "fill-current")} />
          Starred
          {starredCount > 0 && (
            <span className="ml-0.5 rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold tabular-nums">
              {starredCount}
            </span>
          )}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            {starredOnly && leads.length > 0 ? (
              // Specific "you're filtering to starred but nothing is
              // starred yet" coaching — the most likely reason a user
              // would land in an empty state if they've already got
              // leads in the inbox.
              <>
                <Star className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No starred leads yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Tap the <Star className="-mt-0.5 inline h-3.5 w-3.5 align-middle" /> on any
                  lead row (or in the detail dialog) to mark it as important. Starred leads stick
                  to the top of the inbox.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setStarredOnly(false)}
                >
                  Show all leads
                </Button>
              </>
            ) : (
              <>
                <Inbox className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No leads</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submissions from your contact forms will show up here.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => {
            const priority = l.priority ? PRIORITY_META[l.priority] : null
            return (
              <Card
                key={l.id}
                className={cn(
                  "cursor-pointer transition-colors hover:border-primary/40",
                  l.status === "new" && "border-l-4 border-l-accent",
                )}
                onClick={() => setOpenLead(l)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  {/* Star toggle — click to flag without opening the
                      detail dialog. Stops propagation so the row click
                      handler doesn't also fire. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStar(l.id, !!l.starred)
                    }}
                    title={l.starred ? "Unstar lead" : "Star lead"}
                    className={cn(
                      "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                      l.starred
                        ? "text-amber-500 hover:bg-amber-500/10"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Star className={cn("h-4 w-4", l.starred && "fill-current")} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{l.name ?? l.email}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          STATUS_COLORS[l.status],
                        )}
                      >
                        {l.status}
                      </span>
                      {priority && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            priority.cls,
                          )}
                        >
                          {priority.icon}
                          {priority.label}
                        </span>
                      )}
                      {(l.tags ?? []).slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{l.email}</p>
                    {l.message && (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{l.message}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString()} · {l.formId} on {l.pageSlug}
                    </p>
                  </div>

                  {/* Quick-action cluster — three single-tap moves the
                      admin can do without opening the dialog. The
                      buttons are disabled when they'd be a no-op so
                      the inbox doesn't look noisier than it is. */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      disabled={l.status === "contacted"}
                      onClick={() => setStatus(l.id, "contacted")}
                      title="Mark as contacted"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Contacted</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-success hover:text-success"
                      disabled={l.status === "qualified"}
                      onClick={() => setStatus(l.id, "qualified")}
                      title="Mark as qualified"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Qualified</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-muted-foreground"
                      disabled={l.status === "archived"}
                      onClick={() => setStatus(l.id, "archived")}
                      title="Archive lead"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => confirmDeleteLead(l)}
                      title="Delete lead"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* CSV import preview. Shows the detected columns, parsed row
          count, and any skipped rows so the admin sees what will land
          before confirming. Non-destructive — clicking Cancel
          discards the parsed list. */}
      <Dialog open={importPreview != null} onOpenChange={(v) => !v && setImportPreview(null)}>
        {importPreview && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Import {importPreview.parsed.length.toLocaleString()} lead
                {importPreview.parsed.length === 1 ? "" : "s"}?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2 text-sm">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">File:</span>{" "}
                  <span className="font-mono">{importPreview.filename}</span>
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground">Detected columns:</span>{" "}
                  {importPreview.detectedColumns.length === 0 ? (
                    <span className="text-destructive">none recognised</span>
                  ) : (
                    <span className="font-mono">{importPreview.detectedColumns.join(", ")}</span>
                  )}
                </div>
                {importPreview.skipped > 0 && (
                  <div className="mt-1 text-accent">
                    {importPreview.skipped} row{importPreview.skipped === 1 ? "" : "s"} skipped
                    (missing email)
                  </div>
                )}
              </div>
              {importPreview.parsed.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview (first 3)
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    {importPreview.parsed.slice(0, 3).map((l) => (
                      <li key={l.id} className="rounded-md border border-border/60 bg-card/60 p-2">
                        <div className="font-medium">{l.name ?? l.email}</div>
                        <div className="text-muted-foreground">
                          {l.email}
                          {l.phone ? ` · ${l.phone}` : ""}
                          {l.status !== "new" ? ` · ${l.status}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Accepted columns: <span className="font-mono">name</span>,{" "}
                <span className="font-mono">email</span>, <span className="font-mono">phone</span>,{" "}
                <span className="font-mono">message</span>, <span className="font-mono">notes</span>,{" "}
                <span className="font-mono">status</span>, <span className="font-mono">priority</span>,{" "}
                <span className="font-mono">tags</span>, <span className="font-mono">source</span>,{" "}
                <span className="font-mono">starred</span>. Unknown headers are ignored.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setImportPreview(null)}>
                Cancel
              </Button>
              <Button
                onClick={commitImport}
                disabled={importPreview.parsed.length === 0}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Import {importPreview.parsed.length}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Manual lead creation. Sibling of the CSV-import path — single
          row at a time. Email is the only required field; everything
          else is optional and surfaced in the same shape the row +
          detail dialog already expect. */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v)
          if (!v) resetDraft()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</p>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email *</p>
              <Input
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value.toLowerCase() }))}
                type="email"
                placeholder="lead@example.com"
                autoFocus
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
              <Input
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
              <Input
                value={draft.source}
                onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                placeholder="e.g. phone call, instagram, referral"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</p>
              <Select value={draft.priority} onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as LeadPriority | "none" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
              <Input
                value={draft.tags}
                onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                placeholder="comma-separated"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message / notes</p>
              <Textarea
                value={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                rows={3}
                placeholder="What did they ask about?"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false)
                resetDraft()
              }}
            >
              Cancel
            </Button>
            <Button onClick={commitNewLead}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openLead} onOpenChange={(v) => !v && setOpenLead(null)}>
        {openLead && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !openLead.starred
                    updateLead(openLead.id, { starred: next })
                    setOpenLead({ ...openLead, starred: next })
                  }}
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
                    openLead.starred
                      ? "text-amber-500"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title={openLead.starred ? "Unstar" : "Star this lead"}
                >
                  <Star className={cn("h-4 w-4", openLead.starred && "fill-current")} />
                </button>
                {openLead.name ?? openLead.email}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-sm">
              {/* Status quick-buttons — same set as the row but bigger
                  and labelled so the dialog reads as the canonical
                  triage surface. */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(["new", "contacted", "qualified", "archived"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={openLead.status === s ? "default" : "outline"}
                      onClick={() => {
                        updateLead(openLead.id, { status: s })
                        setOpenLead({ ...openLead, status: s })
                      }}
                      className="h-7 text-xs"
                    >
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Priority — independent of workflow status. A hot lead
                  can still be in "new" status; a contacted lead can be
                  cold. Three buttons + "none" to clear. */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Priority
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(["hot", "warm", "cold"] as const).map((p) => {
                    const meta = PRIORITY_META[p]
                    const active = openLead.priority === p
                    return (
                      <Button
                        key={p}
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => {
                          setPriority(openLead.id, p)
                          setOpenLead({ ...openLead, priority: p })
                        }}
                        className="h-7 gap-1 text-xs"
                      >
                        {meta.icon}
                        {meta.label}
                      </Button>
                    )
                  })}
                  {openLead.priority && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={() => {
                        setPriority(openLead.id, "none")
                        setOpenLead({ ...openLead, priority: undefined })
                      }}
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div><span className="text-muted-foreground">Email:</span> {openLead.email}</div>
                {openLead.phone && (
                  <div><span className="text-muted-foreground">Phone:</span> {openLead.phone}</div>
                )}
                <div>
                  <span className="text-muted-foreground">Captured by:</span>{" "}
                  {openLead.formId} on <span className="font-mono">{openLead.pageSlug}</span>
                </div>
                {openLead.source && (
                  <div>
                    <span className="text-muted-foreground">Source:</span> {openLead.source}
                  </div>
                )}
              </div>

              {openLead.message && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Message
                  </p>
                  <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3">{openLead.message}</p>
                </div>
              )}

              {/* Tags editor. Comma-separated input → normalised array.
                  Lets the admin attach context that doesn't fit status
                  or priority ("school inquiry", "wholesale", "spam"). */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tags
                </p>
                <Input
                  defaultValue={(openLead.tags ?? []).join(", ")}
                  placeholder="e.g. school inquiry, wholesale, follow-up"
                  onBlur={(e) => {
                    const next = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                    updateLead(openLead.id, { tags: next })
                    setOpenLead({ ...openLead, tags: next })
                  }}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Comma-separated. Saved on blur.
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Internal notes
                </p>
                <Textarea
                  value={openLead.notes ?? ""}
                  onChange={(e) => {
                    updateLead(openLead.id, { notes: e.target.value })
                    setOpenLead({ ...openLead, notes: e.target.value })
                  }}
                  rows={3}
                  placeholder="Visible only to your team"
                />
              </div>

              {openLead.updatedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Last touched {new Date(openLead.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
