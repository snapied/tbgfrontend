"use client"

import { useSearchParams } from "next/navigation"
import { ProductEditor } from "@/components/store/product-editor"
import { useStore, type ProductKind } from "@/lib/store-store"
import { usePlan } from "@/lib/use-plan"
import { PlanGatedCard } from "@/components/dashboard/plan-lock"

const VALID_KINDS: ProductKind[] = [
  "course", "download", "bundle", "membership", "session", "webinar", "license",
]

export default function NewProductPage() {
  // Belt-and-braces: a user who bookmarks /dashboard/store/new and
  // returns past the storefront-products cap would otherwise sail
  // past the list-page gate. Hold the editor behind the same upgrade
  // card the rest of the app uses for at-cap surfaces.
  const { products } = useStore()
  const { usageRemaining, hydrated } = usePlan()
  const remaining = usageRemaining("storefrontProducts", products.length)
  const atCap = hydrated && remaining !== Infinity && remaining <= 0

  // ?kind= comes from the store empty-state quick-start cards
  // (/dashboard/store), letting the user skip the kind picker for
  // the most common path. We validate against the allowlist before
  // forwarding so an arbitrary ?kind=foo can't crash the editor.
  const params = useSearchParams()
  const rawKind = params?.get("kind")
  const initialKind = (VALID_KINDS as string[]).includes(rawKind ?? "")
    ? (rawKind as ProductKind)
    : undefined

  if (atCap) {
    return (
      <div className="mx-auto max-w-xl pt-8">
        <PlanGatedCard feature="storefrontProducts" />
      </div>
    )
  }
  return <ProductEditor initialKind={initialKind} />
}
