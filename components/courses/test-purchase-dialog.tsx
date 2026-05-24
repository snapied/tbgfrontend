"use client"

// TestPurchaseDialog — admin-only dry-run of the checkout flow for
// a course's underlying storefront product. Runs the same checkout
// pipeline a real buyer hits, but stamps the resulting Order with
// `testMode: true` so:
//
//   • The receipt + invoice list render a "TEST" watermark
//   • Webhooks don't fire (no fake order.paid lands in the
//     teacher's CRM / analytics)
//   • The order shows up under the test customer's library so the
//     teacher can walk the post-purchase experience end-to-end
//
// Surfaces on the course detail page (admin role gate). The flow
// is intentionally tiny: pick which buyer email to simulate (defaults
// to a deterministic test-user@<tenant> address) and submit. We
// don't ask for amount overrides or coupon codes — a real test
// purchase should run the standard happy path so the teacher sees
// what their real buyers see.

import { useEffect, useState } from "react"
import { FlaskConical, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useStore } from "@/lib/store-store"
import { useTenant } from "@/lib/tenant-store"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Underlying storefront product id for the course. Caller resolves
   *  this — most courses have a 1:1 product, but bundles + memberships
   *  can wrap a course differently. */
  productId: string | undefined
  /** Display label for the dialog header — usually the course title. */
  productTitle: string
}

export function TestPurchaseDialog({
  open,
  onOpenChange,
  productId,
  productTitle,
}: Props) {
  const { checkout, products } = useStore()
  const { currentTenant } = useTenant()

  // Deterministic default email per tenant — keeps repeat test
  // purchases tied to the same synthetic customer so the teacher's
  // /library view stays clean. They can override before submit.
  const defaultEmail = currentTenant?.slug
    ? `test+${currentTenant.slug}@thebigclass.com`
    : "test@thebigclass.com"
  const [email, setEmail] = useState(defaultEmail)
  const [name, setName] = useState("Test buyer")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail(defaultEmail)
    setName("Test buyer")
  }, [open, defaultEmail])

  const product = productId ? products.find((p) => p.id === productId) : null

  const handleSubmit = () => {
    if (!productId) {
      toast.error("This course isn't wired to a storefront product yet.")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Test purchase needs a valid email.")
      return
    }
    setSubmitting(true)
    try {
      const result = checkout({
        productId,
        customerId: `test-${email.trim().toLowerCase()}`,
        customerEmail: email.trim().toLowerCase(),
        customerName: name.trim() || "Test buyer",
        testMode: true,
      })
      if (!result.ok) {
        toast.error("Couldn't run the test purchase.", {
          description: result.error,
        })
        return
      }
      toast.success("Test purchase recorded.", {
        description: `Order ${result.order.id} · marked TEST · no webhooks fired`,
        action: {
          label: "Open receipt",
          onClick: () => {
            window.location.assign(`/order/${result.order.id}`)
          },
        },
      })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Test purchase
          </DialogTitle>
          <DialogDescription>
            Walks the full checkout for{" "}
            <span className="font-medium text-foreground">{productTitle}</span>.
            No real money. No webhook fan-out. Marked{" "}
            <span className="font-mono text-foreground">TEST</span> on the
            receipt.
          </DialogDescription>
        </DialogHeader>
        {!product ? (
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              This course doesn&rsquo;t have a published storefront product
              yet. Publish the course to wire one up automatically,
              or create one manually in the Storefront tab.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.06] px-3 py-2 text-xs">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Pre-flight
              </p>
              <ul className="mt-1 space-y-0.5 text-amber-800/80 dark:text-amber-200/80">
                <li>· Order is real, but marked TEST and excluded from webhooks</li>
                <li>· Entitlement is granted so /library shows the course</li>
                <li>· Inventory counter still increments — undo manually if you mind</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tp-email">Buyer email</Label>
              <Input
                id="tp-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
              />
              <p className="text-[11px] text-muted-foreground">
                Defaults to a deterministic per-workspace address so repeat
                test runs share one synthetic customer.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tp-name">Buyer name</Label>
              <Input
                id="tp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Test buyer"
              />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !product}
          >
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
            )}
            Run test purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
