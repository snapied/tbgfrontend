"use client"

import Link from "next/link"
import {
  ArrowRight,
  Award,
  BookOpen,
  Globe,
  Heart,
  Settings,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Card, CardContent } from "@/components/ui/card"

interface Guide {
  href: string
  icon: React.ElementType
  title: string
  body: string
}

const QUICK_STARTS: Guide[] = [
  { href: "/features/live-classes",   icon: Video,       title: "Schedule your first live class",   body: "Paste a Meet/Zoom link, set Repeats, send invites across in-app + email + WhatsApp." },
  { href: "/features/courses",        icon: BookOpen,    title: "Build your first course",            body: "Drag modules + lessons, add a quiz, set preview lessons, publish." },
  { href: "/features/storefront",     icon: ShoppingBag, title: "Open your store",                    body: "Add a course, a bundle, a 1:1 session — your public store is live the same hour." },
  { href: "/features/certificates",   icon: Award,       title: "Issue certificates in bulk",         body: "Pick a template, upload a CSV, issue 200 certs with public verify links." },
  { href: "/features/community",      icon: Heart,       title: "Set up Wall of Love + leaderboard", body: "Drop the first student win on the wall and the leaderboard fills itself." },
  { href: "/features/refer-and-earn", icon: UserPlus,    title: "Run Refer & Earn",                   body: "Generate a personal invite link, share via WhatsApp deep-link, watch attribution land." },
]

const OPERATIONS: Guide[] = [
  { href: "/about",          icon: Users,      title: "Invite your teaching team",     body: "Add admins and instructors with email + WhatsApp — they get a set-password invite." },
  { href: "/legal/dpa",      icon: Settings,   title: "Configure your sender domains", body: "Hook up ZeptoMail for email and your WhatsApp Business sender for messages." },
  { href: "/features/storefront", icon: Globe, title: "Point your domain (CNAME)",     body: "Move from yourbrand.thebigclass.com to learn.yourdomain.com on Growth and Scale." },
  { href: "/features/community",  icon: Sparkles, title: "Make announcements that land",  body: "Send across in-app, email, and WhatsApp with one composer." },
]

export default function GuidesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/40 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3" />
              User guides
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">Step-by-step playbooks.</h1>
            <p className="mt-3 text-muted-foreground">
              The fastest way to get value out of your workspace. Every guide takes you from zero to live in under 15 minutes.
            </p>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick starts</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_STARTS.map((g) => <GuideCard key={g.href} guide={g} />)}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operations</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {OPERATIONS.map((g) => <GuideCard key={g.href} guide={g} />)}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function GuideCard({ guide }: { guide: Guide }) {
  const Icon = guide.icon
  return (
    <Link
      href={guide.href}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="font-semibold leading-snug">{guide.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{guide.body}</p>
      <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Read the guide <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  )
}
