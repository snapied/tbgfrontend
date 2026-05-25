// /solutions/replace-your-stack — one bill replaces 6 tools.

import type { Metadata } from "next"
import {
  Calendar,
  CreditCard,
  FileText,
  Globe2,
  Layers,
  MessageSquare,
  ShoppingBag,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Replace your fragmented stack — one platform · The Big Class",
  description:
    "Cancel Discord + Zoom + Teachable + Notion + a custom landing site. One workspace replaces all of it — your audience, your products, your community, your content. One bill. One member record.",
  alternates: { canonical: "https://thebigclass.com/solutions/replace-your-stack" },
}

// Stack-replacement cost table — honest about what each tool typically
// costs at a creator's working tier, not headline pricing.
const REPLACEMENT_ROWS = [
  { tool: "Notion (team)",       cost: "₹680/seat/mo",  replaces: "Docs · pages · public site", here: "Docs + Portal — built in" },
  { tool: "Discord (Nitro server)", cost: "₹400+/mo",   replaces: "Community feed",              here: "Cohort feed with leaderboard + reactions" },
  { tool: "Zoom Pro",            cost: "₹1,200/host/mo", replaces: "Live classes + recording",   here: "LiveKit rooms + cloud recording — every plan" },
  { tool: "Teachable Pro",       cost: "₹4,000+/mo",    replaces: "Courses + checkout",          here: "Course builder + storefront + 0% commission" },
  { tool: "Mailchimp / ConvertKit", cost: "₹1,500+/mo", replaces: "Newsletter + lead capture",  here: "Blog subscribe + contact-form leads" },
  { tool: "A custom Next.js site", cost: "₹6,000+/mo dev",replaces: "Landing pages + blog",      here: "Portal page builder + real blog with SEO" },
]

export default function ReplaceYourStackPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="Replace your stack"
          title={
            <>
              One workspace.{" "}
              <span className="text-primary">Six fewer subscriptions.</span>
            </>
          }
          subtitle="Most creators end up paying for Notion + Discord + Zoom + Teachable + ConvertKit + a custom site — and the data never reconciles. One workspace replaces all of it. Same capabilities. One bill. One member record."
          outcomes={[
            {
              icon: <Layers className="h-5 w-5" />,
              title: "One member record across every product",
              body: "Who attended which class · who completed which course · who's in which membership — all in one row, one analytics view.",
            },
            {
              icon: <CreditCard className="h-5 w-5" />,
              title: "One bill that scales with you",
              body: "Flat subscription instead of 6 line items + 4 transaction percentages. Predictable cost at every audience size.",
            },
            {
              icon: <Users className="h-5 w-5" />,
              title: "Your audience never bounces",
              body: "Today: visitor lands on your site, leaves for your checkout, leaves again for your community. Now: all on your URL.",
            },
          ]}
          featureMap={[
            { icon: <Globe2 className="h-4 w-4" />, title: "Portal + blog", body: "Replaces a custom Next.js site + Ghost / WordPress.", href: "/features/portal" },
            { icon: <ShoppingBag className="h-4 w-4" />, title: "Storefront + checkout", body: "Replaces Teachable + Gumroad + Stripe Checkout.", href: "/features/storefront" },
            { icon: <Video className="h-4 w-4" />, title: "Live + recordings", body: "Replaces Zoom Pro + the post-class drive folder.", href: "/features/live-classes" },
            { icon: <Users className="h-4 w-4" />, title: "Community + cohort feeds", body: "Replaces Discord + Circle + Mighty Networks.", href: "/features/community" },
          ]}
        />

        {/* The replacement table — unique to this lander */}
        <section className="border-y border-border/60 bg-muted/20 py-20">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                The honest math
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Six tools. Six bills. One workspace.
              </h2>
              <p className="mt-3 text-balance text-muted-foreground">
                Indicative monthly costs at a creator&rsquo;s typical working tier. Your actual numbers vary;
                the pattern doesn&rsquo;t.
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-[1.3fr_0.8fr_1.3fr_1.5fr] divide-x divide-border border-b border-border bg-muted/40">
                <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tool you might pay for
                </div>
                <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Approx cost
                </div>
                <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  What it gives you
                </div>
                <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Replaced here by
                </div>
              </div>
              {REPLACEMENT_ROWS.map((r) => (
                <div
                  key={r.tool}
                  className="grid grid-cols-[1.3fr_0.8fr_1.3fr_1.5fr] divide-x divide-border/60 border-b border-border/60 last:border-b-0"
                >
                  <div className="px-4 py-3 text-sm font-semibold">{r.tool}</div>
                  <div className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
                    {r.cost}
                  </div>
                  <div className="px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                    {r.replaces}
                  </div>
                  <div className="px-4 py-3 text-[13px] font-semibold leading-relaxed">
                    {r.here}
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-[1.3fr_0.8fr_1.3fr_1.5fr] divide-x divide-border border-t-2 border-primary/30 bg-primary/[0.04]">
                <div className="px-4 py-3 text-sm font-bold">Total stack</div>
                <div className="px-4 py-3 font-mono text-[12px] font-bold text-foreground">
                  ₹13,780+/mo
                </div>
                <div className="px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                  Six bills · four take rates · zero data reconciliation
                </div>
                <div className="px-4 py-3 text-[13px] font-bold text-primary">
                  Pro plan: ₹1,499/mo · one bill · 0% commission
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Costs above are approximate creator-tier prices in INR at time of writing. Your exact numbers
              depend on tier and audience size — the structural saving doesn&rsquo;t.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

void Calendar
void FileText
void MessageSquare
