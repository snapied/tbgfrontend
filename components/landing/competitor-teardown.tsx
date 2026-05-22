"use client"

import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  HeartHandshake,
  IndianRupee,
  Quote,
  ShieldCheck,
  Sparkles,
  ArrowRightLeft
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Row {
  theme: string
  quote: string
  source: string
  ours: string
  ourLink: string
  ourLinkLabel: string
  icon: React.ElementType
}

const ROWS: Row[] = [
  {
    theme: "Hidden commission jumps",
    quote: "Commission was said 3–6%, but they took 11% from me and also a percent from my customers.",
    source: "Verified buyer review",
    ours: "Flat fee per plan. Zero percent commission on creator revenue — ever. Pricing is public and never changes for existing customers.",
    ourLink: "/founder-bill-of-rights#article-1",
    ourLinkLabel: "See Article 1 of the Bill",
    icon: IndianRupee,
  },
  {
    theme: "Refund-window theatre",
    quote: "Cancelled within 7-day trial window… no refund honoured, unable to do anything despite clear email proof.",
    source: "Verified buyer review",
    ours: "30-day no-questions refund. Onboarding fees included — not buried in fine print. One support reply, money back.",
    ourLink: "/legal/refund",
    ourLinkLabel: "Read the refund policy",
    icon: HeartHandshake,
  },
  {
    theme: "Pre-sale heaven, post-sale silence",
    quote: "Pre-sale heaven, post-sale silence — the single most consistent complaint across 355 reviews.",
    source: "Third-party analysis, 2026",
    ours: "Same inbox catches in-course doubts + public-page enquiries. Sub-2h response on P0 issues. Sidebar badge for unread.",
    ourLink: "/features/doubts",
    ourLinkLabel: "See the doubts inbox",
    icon: Sparkles,
  },
  {
    theme: "Data hostage",
    quote: "Lifetime promises broken… platform discontinued, no proper export path for our students or content.",
    source: "Verified buyer review",
    ours: "Workspace-wide export from /dashboard/settings — courses, students, orders, certificates, blog, brand, everything.",
    ourLink: "/help/workspace-export",
    ourLinkLabel: "Export + reimport guide",
    icon: Database,
  },
  {
    theme: "No API",
    quote: "No API available.",
    source: "Verified buyer review",
    ours: "Public REST API at /api/v1, scoped bearer tokens, transparent rate limits. Free on every plan. Generate a key in 30 seconds.",
    ourLink: "/features/api",
    ourLinkLabel: "Open the API docs",
    icon: Code2,
  },
  {
    theme: "Acts like the boss, not the partner",
    quote: "They act like bosses and not partners and do everything as per themselves. Despite that, they have no accountability.",
    source: "Verified buyer review",
    ours: "Public uptime + incident dashboard. Status page open to the world. We post-mortem every P0 incident and publish the fix within 7 days.",
    ourLink: "/updates",
    ourLinkLabel: "See changelog + status",
    icon: ShieldCheck,
  },
]

export function CompetitorTeardown() {
  return (
    <section className="relative overflow-hidden bg-background py-24 lg:py-32">
      {/* Dynamic Background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
        <div className="h-[800px] w-[800px] rounded-full bg-gradient-to-tr from-destructive/10 via-transparent to-success/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-md">
            <Quote className="mr-1.5 h-3.5 w-3.5 text-primary" />
            What creators actually wrote
          </Badge>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
            Why creators are leaving <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              the platforms they signed up for
            </span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Every quote below is from a real, verifiable buyer review on a public review site. We read every thread before we built. 
            <strong className="text-foreground font-medium ml-1">The right column is what we've committed to, in writing.</strong>
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-2">
          {ROWS.map((row, i) => (
            <BentoCard key={row.theme} row={row} delay={i * 100} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function BentoCard({ row, delay, index }: { row: Row; delay: number; index: number }) {
  const Icon = row.icon
  const isEven = index % 2 === 0
  
  const blobA = "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"black\" d=\"M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.3,-46.4C90.8,-33.7,96.8,-18.4,96.6,-3.2C96.4,12,89.9,27.1,80.1,39.3C70.3,51.5,57.1,60.8,42.8,67.7C28.5,74.6,13.1,79.1,-2.4,83.1C-17.9,87,-35.8,90.4,-50.1,83.6C-64.4,76.8,-75.1,59.8,-82.9,42.2C-90.7,24.6,-95.6,6.4,-94.1,-11.1C-92.6,-28.6,-84.7,-45.4,-72.6,-57.9C-60.5,-70.4,-44.2,-78.6,-28.9,-82.1C-13.6,-85.6,0.7,-84.4,15.1,-80.7Z\" transform=\"translate(100 100)\" /></svg>')"
  const blobB = "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"black\" d=\"M39.9,-65.7C54.1,-58.4,69.7,-51.7,78.2,-39.7C86.7,-27.7,88.1,-10.4,84.9,5.7C81.7,21.8,73.9,36.7,63.1,48.2C52.3,59.7,38.5,67.8,23.3,73.1C8.1,78.4,-8.5,80.9,-23.4,77.1C-38.3,73.3,-51.5,63.2,-61.8,50.7C-72.1,38.2,-79.5,23.3,-82.1,7.5C-84.7,-8.3,-82.5,-25,-74.6,-38.7C-66.7,-52.4,-53.1,-63.1,-38.4,-70.1C-23.7,-77.1,-7.9,-80.4,3.1,-84.9C14.1,-89.4,32.2,-95.1,39.9,-65.7Z\" transform=\"translate(100 100)\" /></svg>')"
  const selectedBlob = isEven ? blobA : blobB
  return (
    <div 
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-card/40 p-1 shadow-lg backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5"
      style={{ animation: `fadeUp 0.8s ease-out ${delay}ms both` }}
    >
      <div className="grid h-full grid-cols-1 md:grid-cols-2">
        {/* Left: Complaint */}
        <div className="flex flex-col justify-between p-6 md:p-8 md:border-r border-border/50">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10">
                <Quote className="h-3 w-3 text-destructive" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-destructive/80">
                The old way
              </span>
            </div>
            <h3 className="mb-3 text-lg font-semibold text-foreground/90">{row.theme}</h3>
            <p className="font-serif text-[15px] italic leading-relaxed text-muted-foreground">
              "{row.quote}"
            </p>
          </div>
          <div className="mt-6">
            <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              {row.source}
            </span>
          </div>
        </div>

        {/* Right: Commitment with Alternating Organic Mask Effect Background */}
        <div className="relative flex flex-col justify-between overflow-hidden p-6 md:p-8">
          {/* The Organic Background Blob */}
          <div 
            className="absolute inset-0 bg-success/[0.06] transition-colors duration-500 group-hover:bg-success/[0.08]"
            style={{
              maskImage: selectedBlob,
              maskSize: "140%",
              maskRepeat: "no-repeat",
              maskPosition: isEven ? "center right" : "center left",
              WebkitMaskImage: selectedBlob,
              WebkitMaskSize: "140%",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: isEven ? "center right" : "center left",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-success/[0.1] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-success/90">
                Our commitment
              </span>
            </div>
            <div className="flex items-start gap-3 mt-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm border border-border/40 text-primary transition-transform group-hover:scale-110 group-hover:shadow-md">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-[14px] leading-relaxed text-foreground/90 font-medium">
                {row.ours}
              </p>
            </div>
          </div>
          
          <div className="relative z-10 mt-8">
            <Link
              href={row.ourLink}
              className="group/link inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              {row.ourLinkLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Center visual bridge */}
      <div className="absolute left-1/2 top-1/2 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm md:flex transition-transform group-hover:scale-110">
        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  )
}
