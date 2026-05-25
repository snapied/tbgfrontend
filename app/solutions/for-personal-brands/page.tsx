// /solutions/for-personal-brands — multi-product creator brand at one URL.

import type { Metadata } from "next"
import {
  Award,
  BookOpen,
  FileText,
  Globe2,
  Heart,
  Mic,
  Package,
  Repeat,
  Sparkles,
  Users,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "For personal brands — Multi-product creator business · The Big Class",
  description:
    "Your personal brand isn't one product. It's a portfolio — cohorts, memberships, downloads, 1:1s, content. One workspace, one URL, one bill. Your audience never leaves your brand.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-personal-brands" },
}

export default function ForPersonalBrandsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For personal brands"
          title={
            <>
              One portfolio.{" "}
              <span className="text-primary">One URL. All of it.</span>
            </>
          }
          subtitle="Your personal brand sells courses, runs a paid community, hosts live AMAs, writes a blog, ships digital downloads, sometimes coaches 1:1. Stop fragmenting that across six tools. One workspace; your URL; every revenue line in one place."
          outcomes={[
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: "All your products under one identity",
              body: "Cohorts, memberships, 1:1s, downloads, content — same brand, same checkout, same member record.",
            },
            {
              icon: <Heart className="h-5 w-5" />,
              title: "Build the inner-circle community",
              body: "A paid feed where your real fans live. Reactions, posts, leaderboard. The opposite of an open Discord.",
            },
            {
              icon: <Award className="h-5 w-5" />,
              title: "Compound trust through content",
              body: "Blog + Docs + public knowledge hub on your own URL. SEO grows your audience while your products convert it.",
            },
          ]}
          featureMap={[
            { icon: <Globe2 className="h-4 w-4" />, title: "Public portal", body: "Your home, store, blog, courses, faculty page — all on your URL.", href: "/features/portal" },
            { icon: <BookOpen className="h-4 w-4" />, title: "Blog + Docs", body: "Real content surfaces with SEO depth.", href: "/features/blog" },
            { icon: <Users className="h-4 w-4" />, title: "Paid community", body: "Subscription-gated cohort feed for your inner circle.", href: "/solutions/paid-communities" },
            { icon: <Repeat className="h-4 w-4" />, title: "Memberships + bundles", body: "Compose your products into one recurring offer.", href: "/solutions/memberships" },
          ]}
          comparison={{
            alternativeName: "Notion + Discord + Gumroad + a custom site",
            rows: [
              {
                label: "Where your audience lands",
                us: "Your URL. Every product on one page.",
                them: "Four URLs. Audience bounces. Brand fragments.",
              },
              {
                label: "Member record",
                us: "One row per fan — every product they've bought, attended, commented on",
                them: "Four databases that don't reconcile",
              },
              {
                label: "Bill at scale",
                us: "One subscription. Volume scales without per-seat fees.",
                them: "Discord Server Boost + Gumroad 10% + Notion seats + Domain + DNS + every plugin",
              },
            ],
          }}
          cta={{
            title: "Your name is a business. Treat it like one.",
            body: "Start free. The portal is yours, the audience is yours, the products are yours. We're the workspace, not the gatekeeper.",
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void FileText
void Mic
void Package
