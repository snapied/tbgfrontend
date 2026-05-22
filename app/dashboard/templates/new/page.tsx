"use client"

import { useRouter } from "next/navigation"
import { TemplateBuilder } from "@/components/certificates/template-builder"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"
import { ProductTour, type TourStep } from "@/components/tour/product-tour"

// The custom certificate designer is a Pro+ feature. Starter users
// still get the built-in fixed templates from /dashboard/templates,
// but creating a new one (and editing existing customs) is gated.
// The gate shows the designer dimmed underneath so users see what
// they'd get before upgrading.

// Tour for the certificate builder. The builder itself is dense
// (toolbox + canvas + property panel), so the tour uses center
// modals to walk through the workflow conceptually rather than
// trying to spotlight individual buttons.
const TEMPLATE_NEW_TOUR: TourStep[] = [
  {
    title: "Design a custom certificate",
    body: "Drag-and-drop builder for certificates students get on course completion. Pick a background, place text + images + signatures + a QR code, save it.",
    emoji: "🎓",
    placement: "center",
  },
  {
    title: "Toolbox on the left",
    body: "Text, shapes, signature lines, QR codes, images. Click to drop onto the canvas. The Library popover at the bottom has pre-built snippets and decorations.",
    emoji: "🧰",
    placement: "center",
  },
  {
    title: "Canvas in the middle",
    body: "Drag elements to reposition, drag corners to resize. Variables like {{student.name}} and {{course.title}} get replaced at issue time.",
    emoji: "🖼️",
    placement: "center",
  },
  {
    title: "Properties panel on the right",
    body: "Click any element to edit its size, colour, font, alignment. Click the canvas background to set the page size + background image.",
    emoji: "🎨",
    placement: "center",
  },
  {
    title: "Save when ready",
    body: "Top-right Save commits the template. From now on it shows up as an option whenever you issue a certificate batch.",
    emoji: "💾",
    placement: "center",
  },
]

export default function NewTemplatePage() {
  const router = useRouter()
  return (
    <PlanFeatureGate feature="customCertificates">
      <ProductTour tourId="template-new-v1" steps={TEMPLATE_NEW_TOUR} />
      <TemplateBuilder
        onSaved={() => router.push("/dashboard/templates")}
        onBack={() => router.push("/dashboard/templates")}
      />
    </PlanFeatureGate>
  )
}
