"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { TemplateBuilder } from "@/components/certificates/template-builder"
import { getCustomTemplate, type CustomTemplate } from "@/lib/custom-templates"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"

// Editing a custom certificate template hits the same Pro+ gate as
// creating one. The gate shows the designer dimmed underneath the
// upgrade card so users see what they'd be editing.
export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tpl, setTpl] = useState<CustomTemplate | null | undefined>(undefined)

  useEffect(() => {
    setTpl(getCustomTemplate(id) ?? null)
  }, [id])

  if (tpl === undefined) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
  }
  if (tpl === null) {
    return (
      <Card>
        <CardContent className="space-y-4 py-12 text-center">
          <p>Template not found.</p>
          <button className="text-sm underline" onClick={() => router.push("/dashboard/templates")}>Back to templates</button>
        </CardContent>
      </Card>
    )
  }

  return (
    <PlanFeatureGate feature="customCertificates">
      <TemplateBuilder
        initial={tpl}
        onSaved={() => router.push("/dashboard/templates")}
        onBack={() => router.push("/dashboard/templates")}
      />
    </PlanFeatureGate>
  )
}
