"use client"

import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Download,
  Key,
  Layers,
  MessageSquare,
  Radio,
  Sparkles,
  Tag,
  Users,
} from "lucide-react"

/**
 * "Products you can sell." Marketing surface that lists every kind of
 * thing a creator can sell through The Big Class — framed the way a
 * platform-shopping buyer is used to reading it. Used on the homepage
 * and the storefront feature page.
 *
 * Every kind on this list is a real product type in our storefront
 * data model. AI Avatar deliberately omitted because we do not ship it.
 */

interface SellKind {
  Icon: React.ElementType
  label: string
  tagline: string
  body: string
  badge?: string
  grad: string
}

const SELL_KINDS: SellKind[] = [
  {
    Icon: BookOpen,
    label: "Courses",
    tagline: "Live or recorded.",
    body: "Drag-and-drop curriculum builder. Modules, lessons, embedded video, PDFs, inline quizzes. Pair with Live Classes for a cohort or stand alone as on-demand content.",
    grad: "from-emerald-400 to-emerald-700",
  },
  {
    Icon: Tag,
    label: "Memberships",
    tagline: "Recurring access.",
    body: "Charge monthly or yearly for ongoing access — to a course library, to a private community, to weekly office hours. Auto-renew, cancel any time, prorated upgrades.",
    badge: "Recurring",
    grad: "from-rose-400 to-rose-700",
  },
  {
    Icon: Radio,
    label: "Webinars",
    tagline: "Free or paid.",
    body: "Schedule a one-time event, take signups, send reminders across in-app + email + WhatsApp. Hosts run them in the built-in cloud room or any common video-conferencing tool — we handle registration and follow-up.",
    grad: "from-sky-400 to-indigo-700",
  },
  {
    Icon: Users,
    label: "Communities",
    tagline: "Members + Discussions.",
    body: "Sell ongoing access to a private space — threaded discussions, pinned answers, announcements that hit phones, member-only resources. The membership gates it, the discussion is the room.",
    grad: "from-violet-400 to-fuchsia-700",
  },
  {
    Icon: Download,
    label: "Digital Products",
    tagline: "Documents, links, files.",
    body: "PDFs, slides, audio, video, ZIPs, design files, swipe files, prompt packs. Buyers get them instantly in their Library — no DRM nonsense, no manual delivery.",
    grad: "from-amber-400 to-amber-700",
  },
  {
    Icon: MessageSquare,
    label: "Coaching",
    tagline: "1:1 or group.",
    body: "Sell time. Buyers pick a slot, you get a calendar entry + video-call URL. Recurring slots work too — pair with a Membership for \"2 calls a month\" packages.",
    grad: "from-orange-400 to-rose-700",
  },
  {
    Icon: Key,
    label: "License Keys",
    tagline: "Software & gated content.",
    body: "Auto-issue unique license keys at purchase. Show them in the buyer's Library, optionally rate-limit per buyer, optionally enforce activation count.",
    grad: "from-slate-500 to-slate-900",
  },
  {
    Icon: Layers,
    label: "Bundles",
    tagline: "Mix any of the above.",
    body: "Combine three courses + a download + a 1:1 session into one priced bundle. Buyers unlock all components; you get one cart, one checkout, one invoice.",
    badge: "Save 30%",
    grad: "from-indigo-400 to-purple-700",
  },
]

export function ProductsYouCanSell({
  bordered = true,
}: {
  bordered?: boolean
}) {
  return (
    <section
      className={`relative overflow-hidden py-16 sm:py-20 ${bordered ? "border-y border-border" : ""}`}
    >
      {/* Background photo — teacher at laptop, darkened heavily so
          card content stays the hero and the photo reads as texture. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/people/teacher-2.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-top opacity-20 pointer-events-none select-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90 pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Eight product kinds, one workspace
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Products you can sell.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Most platforms cap you at &quot;courses&quot; and tell you to buy a plugin for everything else. Not here.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SELL_KINDS.map((k) => <SellCard key={k.label} kind={k} />)}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>Have a one-off thing not in the list?</span>
          <Link href="mailto:hello@thebigclass.com" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            Tell us — we ship fast <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function SellCard({ kind }: { kind: SellKind }) {
  const Icon = kind.Icon
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
      <div className={`relative flex h-20 items-center justify-center bg-gradient-to-br ${kind.grad}`}>
        <Icon className="h-7 w-7 text-white/95 transition-transform group-hover:scale-110" />
        {kind.badge && (
          <span className="absolute right-2 top-2 rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
            {kind.badge}
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-baseline gap-2">
          <p className="text-base font-bold leading-tight">{kind.label}</p>
          <span className="text-[11px] text-muted-foreground">{kind.tagline}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{kind.body}</p>
      </div>
    </div>
  )
}
