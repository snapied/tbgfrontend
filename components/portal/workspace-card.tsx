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
// PlanFeatureGate + usePlan removed — custom domain is "Coming soon" for now

export function WorkspaceCard() {
  const { currentTenant } = useTenant()
  const [copied, setCopied] = useState(false)

  if (!currentTenant) return null

  const subdomainUrl = tenantPublicUrl(currentTenant.slug)

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

        {/* Custom domain — Coming Soon */}
        <div className="rounded-md border border-border/60 p-4 space-y-2 opacity-75">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom domain
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Connect your own domain like <span className="font-mono">learn.youracademy.com</span> for a fully branded experience.
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
              Coming soon
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="learn.youracademy.com"
              className="font-mono"
              disabled
            />
            <Button disabled>
              Connect
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Custom domains will let you point your own domain (e.g. learn.youracademy.com) to your portal.
            SSL certificates will be provisioned automatically. Stay tuned!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// CustomDomainBadge removed — custom domain is "Coming soon" for now
