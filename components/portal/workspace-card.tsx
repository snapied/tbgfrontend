"use client"

// Workspace URL + custom domain + plan. Lifted out of Settings into a
// shared component so the Portal → Domain screen can render it as the
// canonical place to configure how the public site is reached. Same
// card, same data — just lives next to the rest of the portal config.

import { useState } from "react"
import { Check, Copy, ExternalLink, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useTenant } from "@/lib/tenant-store"
import { PLATFORM_HOST, tenantPublicUrl } from "@/lib/tenant-resolver"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"
import { usePlan } from "@/lib/use-plan"

export function WorkspaceCard() {
  const { currentTenant, requestCustomDomain, removeCustomDomain } = useTenant()
  const { isAllowed } = usePlan()
  const customDomainAllowed = isAllowed("customDomain")
  const [domainInput, setDomainInput] = useState(currentTenant?.customDomain ?? "")
  const [copied, setCopied] = useState(false)

  if (!currentTenant) return null

  const subdomainUrl = tenantPublicUrl(currentTenant.slug)
  const liveUrl = tenantPublicUrl(
    currentTenant.slug,
    currentTenant.customDomain,
    currentTenant.customDomainStatus,
  )

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> Workspace
          </CardTitle>
          <CardDescription>
            Your URL, custom domain, and plan. Changes here apply to all your students immediately.
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className="capitalize">
            {currentTenant.plan} plan
          </Badge>
          <Badge
            className={cn(
              currentTenant.status === "active" && "bg-success text-success-foreground",
              currentTenant.status === "trial" && "bg-primary text-primary-foreground",
              currentTenant.status === "suspended" && "bg-destructive text-destructive-foreground",
              currentTenant.status === "archived" && "border border-border bg-muted text-muted-foreground",
            )}
          >
            {currentTenant.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subdomain */}
        <div className="rounded-md border border-success/30 bg-success/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">
            Your subdomain (always live)
          </p>
          <div className="mt-1 flex items-center gap-2">
            <a
              href={subdomainUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 truncate font-mono text-sm font-medium hover:underline"
            >
              {subdomainUrl.replace(/^https?:\/\//, "")}
            </a>
            <Button variant="ghost" size="icon" onClick={() => copy(subdomainUrl)} title="Copy URL">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" asChild title="Open">
              <a href={subdomainUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Custom domain — gated behind the customDomain plan flag. The
            PlanFeatureGate wraps the entire row so Starter users see
            the upgrade popover instead of an enabled-looking input. */}
        <PlanFeatureGate feature="customDomain">
        <div className="rounded-md border border-border/60 p-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom domain
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Point a CNAME from your domain to ours, then request verification below.
              </p>
            </div>
            {currentTenant.customDomain && (
              <CustomDomainBadge status={currentTenant.customDomainStatus} />
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="learn.youracademy.com"
              className="font-mono"
              disabled={!customDomainAllowed}
            />
            <Button
              variant={currentTenant.customDomain ? "outline" : "default"}
              onClick={() => {
                if (!customDomainAllowed) return
                requestCustomDomain(currentTenant.id, domainInput)
              }}
              disabled={!domainInput.trim() || !customDomainAllowed}
            >
              {currentTenant.customDomain ? "Update" : "Request"}
            </Button>
            {currentTenant.customDomain && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (!customDomainAllowed) return
                  removeCustomDomain(currentTenant.id)
                  setDomainInput("")
                }}
                disabled={!customDomainAllowed}
              >
                Remove
              </Button>
            )}
          </div>

          {/* CNAME instructions */}
          <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              DNS to add at your domain registrar
            </p>
            <div className="grid grid-cols-[80px_1fr] gap-y-1 text-xs font-mono">
              <span className="text-muted-foreground">Type</span>
              <span>CNAME</span>
              <span className="text-muted-foreground">Host</span>
              <span>{currentTenant.customDomain || "learn.yourdomain.com"}</span>
              <span className="text-muted-foreground">Value</span>
              <span className="inline-flex items-center gap-1.5">
                {currentTenant.slug}.{PLATFORM_HOST}
                <button
                  onClick={() => copy(`${currentTenant.slug}.${PLATFORM_HOST}`)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Copy"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </span>
              <span className="text-muted-foreground">TTL</span>
              <span>Auto / 300s</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              After DNS propagates, your platform admin will verify and provision SSL automatically.
            </p>
          </div>

          {liveUrl !== subdomainUrl && currentTenant.customDomainStatus === "verified" && (
            <div className="rounded-md border border-success/30 bg-success/5 p-2 text-xs">
              Live at{" "}
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold hover:underline"
              >
                {liveUrl.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>
        </PlanFeatureGate>
      </CardContent>
    </Card>
  )
}

function CustomDomainBadge({ status }: { status: string }) {
  if (status === "verified")
    return (
      <Badge className="gap-1 bg-success text-success-foreground">
        <Globe className="h-3 w-3" /> Live
      </Badge>
    )
  if (status === "pending")
    return (
      <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
        Verifying
      </Badge>
    )
  if (status === "failed")
    return (
      <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
        Failed
      </Badge>
    )
  return null
}
