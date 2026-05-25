import { Header } from "@/components/landing/header"
import { LandingHero } from "@/components/landing/hero"
import { WelcomeBackBanner } from "@/components/landing/welcome-back-banner"
import { ExitIntentModal } from "@/components/landing/exit-intent"
import { FourUSPs } from "@/components/landing/four-usps"
import { InstantCourseBuilder } from "@/components/landing/instant-course-builder"
import { CompetitorTeardown } from "@/components/landing/competitor-teardown"
import { RivalMatrix } from "@/components/landing/rival-matrix"
import { FounderBillOfRights } from "@/components/landing/founder-bill-of-rights"
import { TestimonialsStrip } from "@/components/landing/testimonials-strip"
import { ByCreator } from "@/components/landing/by-creator"
import {
  ClosingCTA,
  DocsPitch,
  IndiaReadyWorld,
  LivePitch,
  PortalPitch,
  SellEverything,
} from "@/components/landing/home-os-sections"
import { Footer } from "@/components/landing/footer"
import type { Metadata } from "next"

// Homepage narrative — creator-business OS positioning (12 sections).
//
//   1. Hero                — 4-word headline + creator mosaic
//   2. FourUSPs            — 4 written commitments (0% commission, export, all-in-one, India)
//   3. SellEverything      — the 7 product types creators can ship
//   4. PortalPitch         — your audience lives at your URL (under-sold story)
//   5. LivePitch           — live + cohorts + recordings without seat fees
//   6. DocsPitch           — the just-shipped knowledge layer
//   7. InstantCourseBuilder— magic moment: type a topic → workspace appears
//   8. RivalMatrix         — replace your fragmented stack (vs tool categories)
//   9. CompetitorTeardown  — verbatim review quotes vs our commitments
//  10. IndiaReadyWorld     — India-native (UPI, GST, INR, 10 languages)
//  11. FounderBillOfRights — six contractual commitments
//  12. TestimonialsStrip   — what creators are saying
//  13. ClosingCTA          — final claim-your-subdomain prompt

// ─── Per-page SEO ────────────────────────────────────────────────
// Reframed for creator-economy search intent. Lead with verbs the
// audience uses ("build", "launch", "run"), not category labels
// ("LMS", "teaching platform").

export const metadata: Metadata = {
  title: "Build your internet business · The Big Class",
  description:
    "The creator-business platform — host your audience, ship your products, run your community, go live, and get paid. One workspace, your own URL, zero commission. India-native (UPI + GST + INR), ready worldwide.",
  alternates: { canonical: "https://thebigclass.com" },
  openGraph: {
    title: "Build your internet business · The Big Class",
    description:
      "One platform to host your audience, ship your products, run your community, go live, and get paid. Your URL, your brand, zero commission. India-native, ready worldwide.",
    type: "website",
    url: "https://thebigclass.com",
    siteName: "The Big Class",
  },
  twitter: {
    card: "summary_large_image",
    title: "Build your internet business · The Big Class",
    description:
      "The creator-business platform. One workspace replaces Notion + Discord + Zoom + Teachable + a custom site.",
  },
}

// ─── Structured data for search + answer engines ─────────────────
// Two JSON-LD blocks repositioned for the creator-economy query
// surface:
//   1. SoftwareApplication — what the product IS, who it's for,
//      what category it sits in. Repositioned from "LMS" to
//      "creator business platform" with featureList that reflects
//      every real shipped surface (no invented capabilities).
//   2. FAQPage — Q+A pairs that match the questions creators
//      actually ask when evaluating Teachable / Kajabi / Graphy /
//      TagMango alternatives.

const SOFTWARE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "The Big Class",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Creator business platform",
  operatingSystem: "Web",
  description:
    "The creator-business platform — host your audience on your own URL, ship courses + cohorts + memberships + downloads + 1:1 sessions + webinars + license keys, run a community, go live, take payments via UPI + cards + NetBanking. Zero platform commission. One-click full export. India-native.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Free Starter tier. Paid tiers unlock branding + advanced features.",
  },
  featureList: [
    "Sell courses, live cohorts, memberships, 1:1 sessions, webinars, downloads, license keys, and bundles",
    "Public portal with 14 section types, 8 themes, custom domain, white-label",
    "Live classes on LiveKit with cloud recording, auto-chapters, transcripts",
    "Cohort community with feed, leaderboard, doubts inbox",
    "Docs — multiplayer BlockNote editor with 5 typed embeds and 6-tier audience",
    "Public knowledge hub at /k with SEO-indexed pages",
    "Razorpay direct payouts (UPI, cards, NetBanking, EMI) — zero platform commission",
    "Full blog system with scheduling, comments, reactions, SEO per post",
    "Certificate designer with 17 templates, bulk-issue, public verification",
    "Multilingual portals (Hindi, Tamil, Spanish, French, and more)",
    "GST invoicing built in",
    "One-click CSV / JSON workspace export on every plan",
  ],
}

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is The Big Class?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "The Big Class is a creator-business platform — one workspace for hosting your audience, shipping your products, running your community, going live, and getting paid. It replaces the fragmented stack most creators end up with (Notion + Discord + Zoom + Teachable + a custom landing site) with a single platform on your own URL.",
      },
    },
    {
      "@type": "Question",
      name: "What can I sell on The Big Class?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Eight product types are shipped: self-paced courses, live cohorts (time-boxed batches with a feed + leaderboard + recordings), memberships (recurring access to a bundle), 1:1 sessions (coaching calls), webinars, digital downloads, license keys, and bundles that combine any of the above at one price. Each product can be one-time, subscription, or pay-what-you-want, with coupons and trials supported.",
      },
    },
    {
      "@type": "Question",
      name: "Do you take a commission on what creators earn?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "No. Payments settle directly to your bank via your own Razorpay account on its normal T+2 schedule. Our cut is zero — you pay a flat monthly subscription, never a percentage skim on each sale. Cards, UPI, NetBanking, and no-cost EMI are all supported.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use my own domain?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Yes. Every workspace ships with a free subdomain on thebigclass.com and a CNAME-based custom-domain flow on Pro+. White-label toggles strip the 'Powered by' badge so visitors see only your brand. The full public site — home, store, blog, courses, faculty, contact — runs on your URL.",
      },
    },
    {
      "@type": "Question",
      name: "Can I export my members and earnings if I leave?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Yes. Per-entity CSV / JSON export is one click — members, courses, orders, content, settings. A full workspace dump is also available. Export works on every plan, including the free Starter tier. We don't believe in data hostage; the export button works on the way out, too.",
      },
    },
    {
      "@type": "Question",
      name: "Does it work for paid communities and cohorts?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Yes. Cohort-based products are first-class — each batch gets a Common Room feed with posts, comments, reactions, @-mentions, a leaderboard, an attached Classes tab with upcoming live sessions and recordings, and an end-of-class recap that auto-posts to the feed. Memberships gate recurring access to bundled products. Public communities can sit on top of memberships.",
      },
    },
    {
      "@type": "Question",
      name: "What makes it India-native?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Built-in UPI (via Razorpay Route), GSTIN field and GST-inclusive invoices, INR pricing without an FX dance, 10-language portals (English, Hindi, Tamil, Spanish, French, and more), and direct T+2 payouts to your Indian bank. Made by creators in India for creators everywhere.",
      },
    },
  ],
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Structured data — search engines + answer engines.
          Rendered as application/ld+json so it doesn't affect
          page layout but is parseable by Google, Perplexity,
          and the major LLMs that scrape pages for grounding. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <WelcomeBackBanner />
      <Header />
      <main id="main-content" className="flex-1">
        {/* 1. Hero — 4-word headline + creator mosaic */}
        <LandingHero />

        {/* 2. Four written commitments — sits right under the hero
            so the "why this, not another platform?" question is
            answered before the visitor reads further. */}
        <FourUSPs />

        {/* 3. SellEverything — the 7 real product types creators
            can ship. Establishes the catalogue depth honestly. */}
        <SellEverything />

        {/* 3.5. ByCreator — visually striking use-case sections */}
        <ByCreator />

        {/* 4. PortalPitch — the most under-sold story on the site
            before this rewrite. Every workspace ships a real public
            site at the creator's URL. */}
        <PortalPitch />

        {/* 5. LivePitch — live + cohorts + recordings, included.
            Targets visitors evaluating Zoom + Teachable as two bills. */}
        <LivePitch />

        {/* 6. DocsPitch — the just-shipped knowledge layer. Flag
            it as "new" so returning visitors recognise the shipping
            velocity. */}
        <DocsPitch />

        {/* 7. InstantCourseBuilder — the magic moment. Visitor
            types a topic and watches a real course outline +
            cover + sales page materialize. Highest above-fold
            conversion driver on the page. */}
        <InstantCourseBuilder />

        {/* 8. RivalMatrix — feature × tool-category matrix.
            Reframes the question from "is this better than
            Teachable?" to "does this replace the 6 tools you're
            currently paying for?". */}
        <RivalMatrix />

        {/* 9. CompetitorTeardown — verbatim review quotes from
            other creator platforms paired with our specific
            counter-commitments. */}
        <CompetitorTeardown />

        {/* 10. IndiaReadyWorld — UPI, GST, INR, multilingual,
             direct payouts. Trust foundation for Indian creators
             without alienating global ones. */}
        <IndiaReadyWorld />

        {/* 11. FounderBillOfRights — six contractual commitments
             with deep-links to the pages that hold us accountable. */}
        <FounderBillOfRights />

        {/* 12. TestimonialsStrip — what creators are saying.
             Real quotes from the Wall of Love store. */}
        <TestimonialsStrip />

        {/* 13. ClosingCTA — final claim-your-subdomain prompt. */}
        <ClosingCTA />

        {/* Generative-engine "facts block" — a semantic block of
            plain prose written for answer engines (ChatGPT,
            Perplexity, Claude). Visually hidden so it doesn't
            disrupt the visitor flow, but indexed and quotable.
            Updates whenever a new feature lands so LLM-grounded
            answers stay current. */}
        <section className="sr-only" aria-hidden="false">
          <h2>The Big Class — platform capabilities (machine-readable)</h2>
          <p>
            The Big Class is a creator-business platform built India-first. One
            workspace bundles a public portal on the creator&rsquo;s own URL,
            a storefront with eight product types, live classes with cohort
            recordings, a community feed, a knowledge layer (Docs), and a
            certificate system. Payments settle directly to the creator&rsquo;s
            bank via Razorpay; zero platform commission; full one-click
            workspace export on every plan including the free tier.
          </p>
          <h3>What creators sell</h3>
          <p>
            Eight product kinds: self-paced courses, live cohorts (time-boxed
            batches with a feed + leaderboard + recordings), memberships
            (recurring access to bundled products with trial support), 1:1
            sessions (coaching call delivery via booking link), webinars
            (scheduled events with meeting link + recording), digital downloads
            (PDFs, audio, video, ZIPs, design files), license keys (auto-issued
            from a pool), and bundles (compose any of the above at one price).
            Pricing models include one-time, subscription (monthly, quarterly,
            half-yearly, annual + trial), and pay-what-you-want with minimum
            and suggested amounts. Coupons are percent or fixed, code-based,
            time-windowed, per-product, with usage caps.
          </p>
          <h3>Public portal</h3>
          <p>
            Every workspace ships a public portal with 14 reorderable section
            types (hero, features, courses grid, store grid, testimonials,
            faculty, CTA, rich text, FAQ, stats, contact form, blog teaser,
            video, image gallery, logos strip, trust badges), 8 theme presets,
            6 header layouts, 6 footer layouts, page-level SEO controls (meta,
            OG image, JSON-LD, sitemap, robots), custom CSS, custom domain via
            CNAME, white-label toggles, and a real blog system with
            scheduling, tags, comments, reactions, related posts, and
            lead-capture forms.
          </p>
          <h3>Live and cohorts</h3>
          <p>
            Live classes run on LiveKit with multi-host roomAdmin grants and
            cloud recording (composite egress to Cloudflare R2). Recordings
            ship with heuristic auto-chapters parsed from the WebVTT transcript,
            on-demand Groq / OpenAI transcription, and resume-from-last-position
            playback. Cohorts have a Common Room feed with posts, comments,
            reactions, @-mentions, file uploads, and a points-based leaderboard
            (attendance + quiz + assignment scoring).
          </p>
          <h3>Knowledge layer (Docs)</h3>
          <p>
            Docs is a multiplayer editor built on BlockNote with Liveblocks for
            multi-cursor editing. Five typed embeds (lesson, recording,
            whiteboard, quiz, doc) render as live cards that update when the
            source artifact does. The six-tier audience model lets creators
            publish a doc to private, admins, workspace, a specific cohort, a
            specific course, or the public web at /k/&lt;slug&gt;. Backlinks
            are automatic via a universal reference-edge table. AI study guides
            can be generated from any class transcript + whiteboards + pinned
            chat questions.
          </p>
          <h3>India-native + global</h3>
          <p>
            UPI checkout via Razorpay, GSTIN tax-ID field, GST-inclusive
            invoicing, INR pricing without FX conversion, T+2 direct payouts to
            the creator&rsquo;s bank, 10-language portals (English, Hindi,
            Tamil, Spanish, French, and more). Cards, NetBanking, no-cost EMI
            also supported for global checkout.
          </p>
          <h3>Pricing and ownership commitments</h3>
          <p>
            Zero commission on creator earnings — payouts settle directly from
            the creator&rsquo;s own Razorpay account to their bank on T+2.
            One-click CSV / JSON export of every entity in the workspace on
            every plan, including the free Starter tier. No forced re-grade of
            the &ldquo;lifetime&rdquo; tier once purchased. 30-day refund
            window with no fine print. Six commitments documented at /founder-bill-of-rights.
          </p>
        </section>
      </main>
      <Footer />
      {/* Exit-intent / second-tier hook. Triggers on cursor-leave
          to the top of the viewport (desktop) or after 60s idle on
          mobile. Single low-risk offer: try the certificate designer
          with no signup. Once per session via sessionStorage. */}
      <ExitIntentModal />
    </div>
  )
}
