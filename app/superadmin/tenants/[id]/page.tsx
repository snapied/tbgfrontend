"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  LogIn,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useTenant } from "@/lib/tenant-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { PLATFORM_HOST, tenantPublicUrl } from "@/lib/tenant-resolver"

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const {
    tenants,
    updateTenant,
    deleteTenant,
    switchTenant,
    requestCustomDomain,
    verifyCustomDomain,
    removeCustomDomain,
  } = useTenant()
  const confirm = useConfirm()
  const tenant = tenants.find((t) => t.id === id)
  const [domainInput, setDomainInput] = useState(tenant?.customDomain ?? "")
  const [notes, setNotes] = useState(tenant?.notes ?? "")
  const [copied, setCopied] = useState(false)

  if (!tenant) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-bold">Tenant not found</h1>
          <Button asChild className="mt-4">
            <Link href="/superadmin">Back to tenants</Link>
          </Button>
        </main>
      </div>
    )
  }

  const copyCnameTarget = async () => {
    try {
      await navigator.clipboard.writeText(`${tenant.slug}.${PLATFORM_HOST}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/superadmin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">/superadmin/tenants/{tenant.id}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              switchTenant(tenant.slug)
              window.location.href = "/dashboard"
            }}
          >
            <LogIn className="mr-1.5 h-4 w-4" />
            Impersonate
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:py-10">
        {/* Overview */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</p>
                <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {tenant.ownerName} · {tenant.ownerEmail} · created {new Date(tenant.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={cn(
                  tenant.status === "active" && "bg-success text-success-foreground",
                  tenant.status === "trial" && "bg-primary text-primary-foreground",
                  tenant.status === "suspended" && "bg-destructive text-destructive-foreground",
                  tenant.status === "archived" && "border border-border bg-muted text-muted-foreground",
                )}>
                  {tenant.status}
                </Badge>
                <Badge variant="outline" className="capitalize">{tenant.plan} plan</Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subdomain</p>
                <a
                  href={tenantPublicUrl(tenant.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-medium hover:underline"
                >
                  {tenant.slug}.{PLATFORM_HOST}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Custom domain</p>
                {tenant.customDomain ? (
                  <p className="mt-1 font-mono text-sm">
                    {tenant.customDomain}{" "}
                    <DomainBadge status={tenant.customDomainStatus} />
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Not configured</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status + plan controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lifecycle</CardTitle>
            <CardDescription>Control whether the tenant can use the platform and what they get.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={tenant.status} onValueChange={(v) => updateTenant(tenant.id, { status: v as typeof tenant.status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plan</Label>
                <Select value={tenant.plan} onValueChange={(v) => updateTenant(tenant.id, { plan: v as typeof tenant.plan })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom domain */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custom domain</CardTitle>
            <CardDescription>
              Tenants point a CNAME from their domain to ours. Once verified, their workspace is reachable there.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Domain</Label>
              <div className="flex gap-2">
                <Input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="learn.acmeacademy.com"
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => requestCustomDomain(tenant.id, domainInput)}
                  disabled={!domainInput.trim()}
                >
                  {tenant.customDomain ? "Update" : "Request"}
                </Button>
              </div>
            </div>

            {/* DNS instructions */}
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                DNS instructions to share with the tenant
              </p>
              <div className="grid grid-cols-[80px_1fr] gap-y-1 text-sm font-mono">
                <span className="text-muted-foreground">Type</span>
                <span>CNAME</span>
                <span className="text-muted-foreground">Host</span>
                <span>{tenant.customDomain || "learn.yourdomain.com"}</span>
                <span className="text-muted-foreground">Value</span>
                <span className="inline-flex items-center gap-1.5">
                  {tenant.slug}.{PLATFORM_HOST}
                  <button onClick={copyCnameTarget} className="text-muted-foreground hover:text-foreground" title="Copy">
                    {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </span>
                <span className="text-muted-foreground">TTL</span>
                <span>Auto</span>
              </div>
            </div>

            {tenant.customDomain && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => verifyCustomDomain(tenant.id)}
                  disabled={tenant.customDomainStatus === "verified"}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Mark verified
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateTenant(tenant.id, { customDomainStatus: "failed" })}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Mark failed
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeCustomDomain(tenant.id)}
                >
                  Remove
                </Button>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              In production: a background job pings DNS to confirm the CNAME resolves to us, then the
              platform provisions SSL (Caddy / Vercel / Cloudflare). The buttons above just walk the
              state machine for now.
            </p>
          </CardContent>
        </Card>

        {/* Admin notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Internal notes</CardTitle>
            <CardDescription>Visible to super-admins only.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Onboarding context, escalations, customer-success notes…"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={() => updateTenant(tenant.id, { notes })}>
                Save notes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Permanently delete this tenant record. Their localStorage data on other browsers stays.
            </div>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                const ok = await confirm({
                  title: `Permanently delete "${tenant.name}"?`,
                  description: "This can't be undone. The tenant record is removed from the platform; localStorage data on other browsers stays.",
                  destructive: true,
                })
                if (!ok) return
                deleteTenant(tenant.id)
                toast.success(`Deleted "${tenant.name}".`)
                window.location.href = "/superadmin"
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete tenant
            </Button>
          </CardContent>
        </Card>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Gate this route behind real super-admin auth before going live — currently anyone with the URL can manage tenants.
        </p>
      </main>
    </div>
  )
}

function DomainBadge({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <Badge className="ml-1.5 gap-1 bg-success text-success-foreground">
        <Globe className="h-3 w-3" /> Live
      </Badge>
    )
  }
  if (status === "pending") {
    return (
      <Badge variant="outline" className="ml-1.5 gap-1 border-accent/40 text-accent">
        <Globe className="h-3 w-3" /> Verifying
      </Badge>
    )
  }
  if (status === "failed") {
    return (
      <Badge variant="outline" className="ml-1.5 gap-1 border-destructive/40 text-destructive">
        <AlertTriangle className="h-3 w-3" /> Failed
      </Badge>
    )
  }
  return null
}
