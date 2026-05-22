"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Building,
  ChevronDown,
  ExternalLink,
  Filter,
  Globe,
  LogIn,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Logo } from "@/components/brand/logo"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  type CustomDomainStatus,
  type TenantPlan,
  type TenantStatus,
  useTenant,
} from "@/lib/tenant-store"
import { tenantPublicUrl } from "@/lib/tenant-resolver"

export default function SuperAdminPage() {
  const { tenants, updateTenant, deleteTenant, switchTenant } = useTenant()
  const confirm = useConfirm()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | TenantStatus>("all")

  const rows = useMemo(() => {
    return [...tenants]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((t) => {
        if (statusFilter !== "all" && t.status !== statusFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            t.name.toLowerCase().includes(q) ||
            t.slug.toLowerCase().includes(q) ||
            t.ownerEmail.toLowerCase().includes(q) ||
            (t.customDomain?.toLowerCase().includes(q) ?? false)
          )
        }
        return true
      })
  }, [tenants, search, statusFilter])

  const counts = {
    total: tenants.length,
    trial: tenants.filter((t) => t.status === "trial").length,
    active: tenants.filter((t) => t.status === "active").length,
    suspended: tenants.filter((t) => t.status === "suspended").length,
    pendingDomain: tenants.filter((t) => t.customDomainStatus === "pending").length,
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive sm:inline-flex">
              <ShieldCheck className="h-3 w-3" />
              Super-admin
            </span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform tenants</h1>
          <p className="text-muted-foreground">
            Every academy that has signed up. Manage status, plan, and custom domains here.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile label="Total" value={`${counts.total}`} tone="muted" />
          <StatTile label="Trial" value={`${counts.trial}`} tone="primary" />
          <StatTile label="Active" value={`${counts.active}`} tone="success" />
          <StatTile label="Suspended" value={`${counts.suspended}`} tone="warn" />
          <StatTile label="CNAME pending" value={`${counts.pendingDomain}`} tone="accent" />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, URL, owner email, or custom domain…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | TenantStatus)}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Building className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 font-semibold">No tenants match those filters</h3>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/superadmin/tenants/${t.id}`}
                          className="font-medium hover:underline"
                        >
                          {t.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(t.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{t.ownerName}</p>
                        <p className="text-xs text-muted-foreground">{t.ownerEmail}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <a
                            href={tenantPublicUrl(t.slug)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-mono hover:underline"
                          >
                            {t.slug}.thebigclass.com
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {t.customDomain && (
                            <DomainBadge
                              domain={t.customDomain}
                              status={t.customDomainStatus}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusSelect
                          value={t.status}
                          onChange={(s) => updateTenant(t.id, { status: s })}
                        />
                      </TableCell>
                      <TableCell>
                        <PlanSelect
                          value={t.plan}
                          onChange={(p) => updateTenant(t.id, { plan: p })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              switchTenant(t.slug)
                              window.location.href = "/dashboard"
                            }}
                            title="Impersonate — view this workspace"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/superadmin/tenants/${t.id}`}>Manage</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              const ok = await confirm({
                                title: `Archive "${t.name}"?`,
                                description: "Their data stays in storage but the workspace is gated. You can un-archive later.",
                                destructive: true,
                                confirmLabel: "Archive",
                              })
                              if (!ok) return
                              updateTenant(t.id, { status: "archived" })
                              toast.success(`Archived "${t.name}".`)
                            }}
                            title="Archive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          ⚠️ This is a frontend-only stub. In production, gate this route behind real super-admin
          auth and hit a real <code className="rounded bg-muted px-1 font-mono">/api/admin/tenants</code> endpoint.
        </p>
      </main>
    </div>
  )
}

// ---- Tiny components ----

function StatTile({ label, value, tone }: { label: string; value: string; tone: "muted" | "primary" | "success" | "warn" | "accent" }) {
  const toneMap = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warn: "bg-destructive/10 text-destructive",
    accent: "bg-accent/15 text-accent",
  } as const
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", toneMap[tone])}>
          {label}
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function StatusSelect({ value, onChange }: { value: TenantStatus; onChange: (v: TenantStatus) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TenantStatus)}>
      <SelectTrigger className="h-7 text-xs">
        <SelectValue />
        <ChevronDown className="h-3 w-3 opacity-60" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="trial">Trial</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="suspended">Suspended</SelectItem>
        <SelectItem value="archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  )
}

function PlanSelect({ value, onChange }: { value: TenantPlan; onChange: (v: TenantPlan) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TenantPlan)}>
      <SelectTrigger className="h-7 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="free">Free</SelectItem>
        <SelectItem value="starter">Starter</SelectItem>
        <SelectItem value="growth">Growth</SelectItem>
        <SelectItem value="scale">Scale</SelectItem>
      </SelectContent>
    </Select>
  )
}

function DomainBadge({ domain, status }: { domain: string; status: CustomDomainStatus }) {
  const meta =
    status === "verified" ? { icon: <Globe className="h-3 w-3" />, text: "Live", class: "bg-success text-success-foreground" }
    : status === "pending"  ? { icon: <Globe className="h-3 w-3" />, text: "Verifying", class: "bg-accent/15 text-accent" }
    : status === "failed"   ? { icon: <AlertTriangle className="h-3 w-3" />, text: "Failed", class: "bg-destructive/15 text-destructive" }
    : null
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{domain}</span>
      {meta && (
        <Badge className={cn("gap-1 text-[10px]", meta.class)}>
          {meta.icon}
          {meta.text}
        </Badge>
      )}
    </div>
  )
}
