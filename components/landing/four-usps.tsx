// Four USPs strip — the four reasons educators switch.
//
// Lives right below the hero so a visitor who didn't quite get "what
// is this thing" from the H1 lands on a one-glance summary. Each
// USP names a category-level pain we don't have, and a specific
// thing we ship that the rest of the market doesn't.
//
// Picked four because three feels thin and five is choice paralysis.
// The four are deliberately *not* feature names (live classes /
// courses / community) — they're the four commercial commitments
// that make the platform feel different:
//   1. Zero commission — most platforms take a percentage skim
//   2. Own your data — most platforms gate export behind paid tiers
//   3. All-in-one — most platforms force a stack of 4-7 subscriptions
//   4. India-first — UPI native, WhatsApp built in, Hindi/Tamil portals

import Link from "next/link"
import {
  ArrowRight,
  Coins,
  Download,
  Globe2,
  Sparkles,
} from "lucide-react"

interface USP {
  emoji: string
  icon: React.ReactNode
  headline: string
  body: string
  rival: string
  evidence: { label: string; href: string }
}

const USPS: USP[] = [
  {
    emoji: "💰",
    icon: <Coins className="h-4 w-4" />,
    headline: "Zero commission on your revenue",
    body: "Payments settle from your own gateway account straight to your bank — UPI, cards, NetBanking, EMI. We never touch your money. Our cut is the flat subscription you already pay, never a percentage skim on each sale.",
    rival: "Most creator platforms take 2–10% of every transaction on top of the gateway fee — and lock 'zero commission' behind their priciest tier.",
    evidence: { label: "See payouts", href: "/help/payouts-gateway-fees" },
  },
  {
    emoji: "📤",
    icon: <Download className="h-4 w-4" />,
    headline: "Your audience is yours, always",
    body: "Per-entity CSV / JSON export is one click. Full workspace dump if you ever leave. Available on every plan, including the free tier. Your members, your roster, your earnings history — never hostage.",
    rival: "Most platforms gate export behind a paid tier, ship half-dumps missing key entities, or charge a 'data migration fee' on the way out.",
    evidence: { label: "See the export", href: "/help/workspace-export" },
  },
  {
    emoji: "🧩",
    icon: <Sparkles className="h-4 w-4" />,
    headline: "Replace your fragmented stack",
    body: "Storefront, live, community, content, docs, certificates, payments, blog, public site — one workspace, one member record, one analytics view. Cancel Discord + Zoom + Teachable + a custom landing site. Keep one bill.",
    rival: "Most creators stitch together a hosted course tool, a community tool, a video tool, a payment tool, an email tool, a site builder. The bill adds up; the member record never reconciles.",
    evidence: { label: "See what replaces", href: "/solutions/replace-your-stack" },
  },
  {
    emoji: "🇮🇳",
    icon: <Globe2 className="h-4 w-4" />,
    headline: "Built India-first, ready worldwide",
    body: "UPI + Razorpay Route native, GST invoicing built in, INR pricing without the FX dance, 10-language portals (EN · HI · TA · ES · FR + more). Made by creators in India, for creators everywhere.",
    rival: "Most platforms assume USD + a single card processor + English-only. UPI, GST, and INR are afterthoughts — if they ship at all.",
    evidence: { label: "See the India stack", href: "/features/multilingual" },
  },
]

export function FourUSPs() {
  return (
    <section className="border-y border-border bg-gradient-to-b from-secondary/30 via-background to-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            What you actually get
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Four commitments. In writing.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Every line below is on our pricing page and in our help docs — not a
            marketing claim with fine print. If we ever break one, the export
            button still works on the way out.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {USPS.map((u) => (
            <USPCard key={u.headline} usp={u} />
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-primary/30 bg-primary/[0.04] p-4 text-center text-sm">
          <p>
            <span className="font-semibold text-foreground">No catch.</span>{" "}
            All four ship on the <Link href="/pricing" className="font-semibold text-primary hover:underline">free Starter plan</Link>. Paid tiers unlock more branding, more seats, and the team-tier features — never the commitments above.
          </p>
        </div>
      </div>
    </section>
  )
}

function USPCard({ usp }: { usp: USP }) {
  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-3xl">{usp.emoji}</span>
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-snug">{usp.headline}</h3>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{usp.body}</p>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Compared to
        </p>
        <p className="mt-1 text-xs leading-relaxed">{usp.rival}</p>
      </div>
      <Link
        href={usp.evidence.href}
        className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        {usp.evidence.label}
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </article>
  )
}
