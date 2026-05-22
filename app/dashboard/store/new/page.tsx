"use client"

import { ProductEditor } from "@/components/store/product-editor"
import { useStore } from "@/lib/store-store"
import { usePlan } from "@/lib/use-plan"
import { PlanGatedCard } from "@/components/dashboard/plan-lock"

export default function NewProductPage() {
  // Belt-and-braces: a user who bookmarks /dashboard/store/new and
  // returns past the storefront-products cap would otherwise sail
  // past the list-page gate. Hold the editor behind the same upgrade
  // card the rest of the app uses for at-cap surfaces.
  const { products } = useStore()
  const { usageRemaining, hydrated } = usePlan()
  const remaining = usageRemaining("storefrontProducts", products.length)
  const atCap = hydrated && remaining !== Infinity && remaining <= 0
  if (atCap) {
    return (
      <div className="mx-auto max-w-xl pt-8">
        <PlanGatedCard feature="storefrontProducts" />
      </div>
    )
  }
  return <ProductEditor />
}
