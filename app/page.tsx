import { Header } from "@/components/landing/header"
import { LandingHero } from "@/components/landing/hero"
import { InstantCourseBuilder } from "@/components/landing/instant-course-builder"
import { TemplatesSection } from "@/components/landing/sections"
import { CompetitorTeardown } from "@/components/landing/competitor-teardown"
import { FounderBillOfRights } from "@/components/landing/founder-bill-of-rights"
import { TestimonialsStrip } from "@/components/landing/testimonials-strip"
import { PlatformExplorer } from "@/components/landing/platform-explorer"
import { InAppTools } from "@/components/landing/in-app-tools"
import { Footer } from "@/components/landing/footer"

// Home-page narrative flow — leaner version (7 sections instead of 11).
//
//   1. Hero                — entry. Identity + ownership claim.
//   2. InstantCourseBuilder
//                          — the do-something-now magic moment.
//                            Visitor types a topic and watches a real
//                            course outline + cover + certificate +
//                            sales page build in 5s. Sole biggest
//                            conversion driver on the page.
//   3. TestimonialsStrip   — social proof, moved up so visitors who
//                            saw the magic in #2 now see "real
//                            people using it."
//   4. CompetitorTeardown  — verbatim review quotes vs our specific
//                            contractual counter-commitments. Buyers
//                            comparing platforms convert here.
//   5. PlatformExplorer    — TABBED surface that absorbs four
//                            previously-separate sections (Products
//                            you can sell, Your portal, Made for
//                            India, New wedges). Each tab is a 6-card
//                            grid — same narrative beats, ~70% less
//                            scroll. Curious visitors can dig; fast
//                            scrollers absorb the breadth at a glance.
//   6. FounderBillOfRights — trust closer. Six contractual
//                            commitments with links to the pages that
//                            hold us accountable.
//   7. TemplatesSection    — polish closer + final CTA. Visual proof
//                            the platform looks good out of the box.
//
// We dropped the standalone FeaturesSection (its content overlapped
// with Products + Portal). The PlatformExplorer's four tabs cover
// what visitors actually want to know: what they can sell, what they
// can brand, that we work in India, and the wedges that aren't on
// competitor platforms.
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <LandingHero />
        <InstantCourseBuilder />
        <TestimonialsStrip />
        <InAppTools />
        <CompetitorTeardown />
        <PlatformExplorer />
        <FounderBillOfRights />
        <TemplatesSection />
      </main>
      <Footer />
    </div>
  )
}
