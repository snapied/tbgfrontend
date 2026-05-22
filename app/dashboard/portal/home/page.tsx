"use client"

// Home-page content editor. Thin wrapper around the shared
// PageSectionsEditor so any future page-content edits (legal pages,
// custom pages) share the same surface.

import { PageSectionsEditor } from "@/components/portal/page-sections-editor"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"

export default function PortalHomePage() {
  return (
    <>
      <ProductTour
        tourId="portal-builder"
        promptLabel="Tour the page builder"
        steps={[
          {
            target: '[data-tour="add-section"]',
            title: "Build your layout",
            body: "Start by adding a Hero section, a Feature grid, or a Course block to your page. You can mix and match sections any way you like.",
            emoji: "🧱",
            placement: "bottom"
          },
          {
            target: '[data-tour="sections-list"]',
            title: "Reorder and edit",
            body: "Drag sections up and down to reorder them, or click on a section to expand it and edit its content and settings.",
            emoji: "✍️",
            placement: "right"
          },
          {
            target: '[data-tour="live-preview"]',
            title: "See it live",
            body: "Every change you make updates here instantly. You can even toggle device sizes to see how your page looks on mobile.",
            emoji: "👀",
            placement: "left"
          }
        ]}
      />
      <PageSectionsEditor
        slug="/"
        eyebrow="Home page content"
        title="What visitors see when they land"
        description="Edit your welcome message, hero, calls to action, and the rest of your home page. Changes save automatically and the preview refreshes itself."
        headerAction={<TakeATourButton tourId="portal-builder" />}
      />
    </>
  )
}
