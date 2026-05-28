"use client"

// Tenant-switch warning modal. Shown when a user logged into
// Tenant A tries to take a transactional action on Tenant B's page.
// Blocks the action until the user either switches tenants or cancels.

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTenantName: string
  currentEmail: string
  targetTenantName: string
  targetTenantSlug: string
  /** URL to redirect back to after login into the target tenant. */
  returnUrl: string
  onConfirmSwitch: () => void
}

export function TenantSwitchModal({
  open,
  onOpenChange,
  currentTenantName,
  currentEmail,
  targetTenantName,
  targetTenantSlug,
  returnUrl,
  onConfirmSwitch,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            You&apos;re signed into a different academy
          </DialogTitle>
          <DialogDescription>
            To continue with this purchase, you&apos;ll need to sign into{" "}
            <strong>{targetTenantName}</strong> instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Currently signed into</p>
            <p className="text-sm font-medium">{currentTenantName}</p>
            <p className="text-xs text-muted-foreground">{currentEmail}</p>
          </div>

          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              Your data on {currentTenantName} will remain safe
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">→</span>
              You will be signed out of the current session
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              You can sign back into {currentTenantName} anytime
            </li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button onClick={onConfirmSwitch}>
            Sign out & continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
