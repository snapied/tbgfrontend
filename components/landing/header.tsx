"use client"

// Mega-menu header — creator-business OS information architecture.
//
// Three top-level entries:
//   1. Platform  — 4-column mega menu (Sell · Engage · Publish · Make it yours)
//                  + spotlight: "Just shipped — Docs"
//   2. Solutions — 3-column mega menu (By creator · By model · By goal)
//                  + spotlight: "Replace your fragmented stack"
//   3. Resources — Learn + Trust + Alternatives panel
//
// Plus "Pricing" as a flat link.
//
// Design constraints:
//   • Each panel is 1240px wide (was 1020/1040) — significantly more
//     horizontal breathing room
//   • Column gutters use vertical dividers; rows use generous vertical
//     spacing so the panel reads premium, not crammed
//   • Group titles are small-caps + tracking-widest with a thin
//     underline accent for hierarchy
//   • Spotlight cards on the right side anchor each panel
//
// Mobile drawer mirrors the same IA in collapsible accordions.

import { useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowRight, ArrowRightLeft, Award, BookOpen, Briefcase, Building2,
  Calendar, ChevronDown, ClipboardList, Code2, Compass, CreditCard,
  FileText, Film, Globe2, GraduationCap, Heart, Instagram, Key,
  Languages, Layers, Lightbulb, Mail, Mic, Megaphone, MessageCircleQuestion,
  MessageSquare, Menu, Newspaper, Package, Palette, PenSquare, Play,
  PlayCircle, Repeat, Shapes, ShieldCheck, ShoppingBag, Sparkles, Trophy,
  UserPlus, Users, Video, Wand2, X, Youtube, Zap,
} from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  body: string
  icon: React.ElementType
  chip?: string
  chipVariant?: "new" | "live"
  color: string
}
interface MegaSection { title: string; items: NavItem[] }

// ─── PLATFORM — 4 columns ────────────────────────────────────────
const PLATFORM: MegaSection[] = [
  {
    title: "Sell",
    items: [
      { href: "/features/storefront",   icon: ShoppingBag, label: "Storefront",     body: "8 product kinds, one checkout",          color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
      { href: "/features/courses",      icon: GraduationCap, label: "Courses",      body: "Self-paced with modules + quizzes",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
      { href: "/solutions/memberships", icon: Repeat, label: "Memberships",        body: "Recurring access · trials · bundles",     color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
      { href: "/features/certificates", icon: Award, label: "Certificates",        body: "17 templates + bulk CSV issue",           color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
    ],
  },
  {
    title: "Engage",
    items: [
      { href: "/features/live-classes", icon: Video, label: "Live classes",        body: "LiveKit rooms · zero seat fees",          color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
      { href: "/features/whiteboard",   icon: PenSquare, label: "Whiteboards",     body: "Multiplayer · 25+ templates",             color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
      { href: "/features/community",    icon: Users, label: "Community",            body: "Cohort feeds · leaderboard",              color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300" },
      { href: "/features/doubts",       icon: MessageCircleQuestion, label: "Doubts inbox", body: "Pre-sale + post-sale Q&A",       color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
    ],
  },
  {
    title: "Publish",
    items: [
      { href: "/features/docs",         icon: FileText, label: "Docs",              body: "Multiplayer knowledge layer",             color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", chip: "New", chipVariant: "new" },
      { href: "/features/blog",         icon: Newspaper, label: "Blog",             body: "SEO-grade · scheduled · comments",         color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", chip: "New", chipVariant: "new" },
      { href: "/features/quizzes",      icon: Trophy, label: "Quizzes",             body: "18 ready-to-fire templates",              color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
      { href: "/features/faculty",      icon: GraduationCap, label: "Faculty",      body: "Showcase · co-teach · invite",            color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
    ],
  },
  {
    title: "Make it yours",
    items: [
      { href: "/features/portal",       icon: Globe2, label: "Public portal",      body: "Your site · your URL · your brand",       color: "bg-primary/10 text-primary", chip: "New", chipVariant: "new" },
      { href: "/features/whitelabel",   icon: Palette, label: "White-label",       body: "Strip the platform badge",                 color: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300" },
      { href: "/features/multilingual", icon: Languages, label: "Multilingual",    body: "10 languages · visitor picks",            color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
      { href: "/features/api",          icon: Code2, label: "API & integrations", body: "Scoped REST keys · webhooks",              color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300" },
    ],
  },
]

// ─── SOLUTIONS — 3 columns + spotlight ───────────────────────────
const SOLUTIONS: MegaSection[] = [
  {
    title: "By creator",
    items: [
      { href: "/solutions/for-youtubers",            icon: Youtube,   label: "For YouTubers",           body: "Convert subs to paying members",       color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
      { href: "/solutions/for-instagram-creators",   icon: Instagram, label: "For Instagram creators",  body: "Link-in-bio that actually earns",      color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300" },
      { href: "/solutions/for-coaches",              icon: Briefcase, label: "For coaches",             body: "1:1 sessions + group cohorts + content", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
      { href: "/solutions/for-course-creators",      icon: GraduationCap, label: "For course creators", body: "The full course platform — your URL",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
      { href: "/solutions/for-personal-brands",      icon: Sparkles,  label: "For personal brands",     body: "Multi-product creator brand at one URL", color: "bg-primary/10 text-primary" },
    ],
  },
  {
    title: "By business model",
    items: [
      { href: "/solutions/paid-communities", icon: Users,    label: "Paid communities",  body: "Subscription-gated cohort feeds",       color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
      { href: "/solutions/live-cohorts",     icon: Calendar, label: "Live cohorts",      body: "Time-boxed batches · zero seat fees",   color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
      { href: "/solutions/memberships",      icon: Repeat,   label: "Memberships",       body: "Recurring access to a bundle",          color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
      { href: "/solutions/digital-products", icon: Package,  label: "Digital products",  body: "PDFs, audio, video, ZIPs, license keys", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    ],
  },
  {
    title: "By goal",
    items: [
      { href: "/solutions/launch-your-creator-business", icon: Wand2,    label: "Launch your business",  body: "Day-1 setup, every tool included",     color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
      { href: "/solutions/replace-your-stack",           icon: Layers,   label: "Replace your stack",     body: "One bill replaces 6 tools",            color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
      { href: "/alternatives",                           icon: ArrowRightLeft, label: "Move from a rival", body: "Migrate from Teachable, Kajabi, Graphy…", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300" },
      { href: "/use-cases",                              icon: Compass,  label: "All use cases",          body: "Solo · School · College · Corporate · NGO", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    ],
  },
]

// ─── RESOURCES — 2 columns + Alternatives ────────────────────────
const RESOURCES: MegaSection[] = [
  {
    title: "Learn",
    items: [
      { href: "/guides",     icon: ClipboardList, label: "Guides",      body: "Step-by-step walkthroughs of every feature",   color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
      { href: "/use-cases",  icon: Lightbulb,     label: "Use cases",   body: "Playbooks per audience",                       color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
      { href: "/updates",    icon: Megaphone,     label: "Updates",     body: "What shipped this month",                      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
      { href: "/help",       icon: BookOpen,      label: "Help center", body: "Search 70+ help articles",                     color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    ],
  },
  {
    title: "Trust",
    items: [
      { href: "/founder-bill-of-rights", icon: ShieldCheck,    label: "Founder Bill of Rights", body: "Six commitments. In writing.",     color: "bg-primary/10 text-primary" },
      { href: "/about",                  icon: Building2,      label: "About",                   body: "Made by creators in India",        color: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300" },
      { href: "/verify",                 icon: Award,          label: "Verify a certificate",    body: "Public lookup, no account",        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
      { href: "mailto:hello@thebigclass.com", icon: Mail, label: "Talk to us",                   body: "Same-day reply from a human",      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    ],
  },
]

const ALTERNATIVES_LINKS: NavItem[] = [
  { href: "/alternatives/teachable",   icon: ArrowRightLeft, label: "Teachable",   body: "Direct payouts · custom domain · zero %",  color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" },
  { href: "/alternatives/kajabi",      icon: ArrowRightLeft, label: "Kajabi",      body: "Less bloat · India-native · 1/4 the price", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" },
  { href: "/alternatives/thinkific",   icon: ArrowRightLeft, label: "Thinkific",   body: "Cohorts + live included, no add-ons",      color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300" },
  { href: "/alternatives/podia",       icon: ArrowRightLeft, label: "Podia",       body: "Real portal · multi-product · UPI",         color: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300" },
  { href: "/alternatives/gumroad",     icon: ArrowRightLeft, label: "Gumroad",     body: "Your URL · your audience · 0%",            color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300" },
  { href: "/alternatives/learnworlds", icon: ArrowRightLeft, label: "LearnWorlds", body: "Same depth, fraction of the lift",          color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300" },
  { href: "/alternatives/graphy",      icon: ArrowRightLeft, label: "Graphy",      body: "Honest export · zero commission",           color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" },
  { href: "/alternatives/tagmango",    icon: ArrowRightLeft, label: "TagMango",    body: "Real storefront · UPI · cohorts",           color: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300" },
]

// ─── Chip ────────────────────────────────────────────────────────
function Chip({ label, variant }: { label: string; variant?: "new" | "live" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide",
      variant === "live"
        ? "bg-emerald-500 text-white"
        : "bg-primary text-primary-foreground",
    )}>
      {variant === "live" && <span className="h-1 w-1 animate-pulse rounded-full bg-white" />}
      {label}
    </span>
  )
}

// ─── Single nav item row ─────────────────────────────────────────
//
// Bumped vertical padding (py-3 → py-3.5) and gap (gap-3 → gap-3.5)
// for the new wider menus — more breathing room per row.
function NavRow({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="group relative flex items-start gap-3.5 rounded-xl px-3 py-3 transition-all duration-150 hover:bg-muted/60"
    >
      <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110", item.color)}>
        <item.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13.5px] font-semibold text-foreground">{item.label}</span>
          {item.chip && <Chip label={item.chip} variant={item.chipVariant} />}
        </div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{item.body}</p>
      </div>
      <ArrowRight className="mt-2 h-3 w-3 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-60" />
    </Link>
  )
}

// ─── Group title — small-caps with thin accent ───────────────────
function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 px-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        {children}
      </span>
      <span className="h-px flex-1 bg-border/60" />
    </div>
  )
}

// ─── Platform panel — 4 columns + spotlight (1240px) ─────────────
function PlatformPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 w-[min(1240px,calc(100vw-2rem))] max-h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card/95 shadow-2xl shadow-black/15 backdrop-blur-xl ring-1 ring-black/5 duration-150">
      {/* Top eyebrow strip — quieter than the previous gradient
          banner; the menu's job is to scan-and-go, not pitch. */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-6 py-3">
        <p className="text-[11px] font-semibold text-muted-foreground">
          <span className="font-bold text-foreground">Platform</span> · One workspace · everything you sell, ship, and run.
        </p>
        <Link
          href="/pricing"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          See pricing <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 4 columns + spotlight */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_300px]">
        {PLATFORM.map((section, si) => (
          <div
            key={section.title}
            className={cn(
              "py-5 px-2",
              si < PLATFORM.length ? "border-r border-border/60" : "",
            )}
          >
            <GroupTitle>{section.title}</GroupTitle>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavRow key={item.href} item={item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}

        {/* Spotlight — "Just shipped: Docs" */}
        <div className="relative flex flex-col overflow-hidden bg-gradient-to-br from-violet-500/10 via-card to-primary/5">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <Zap className="h-3.5 w-3.5 text-violet-700" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">
              Just shipped
            </p>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700">
              <FileText className="h-5 w-5" />
            </span>
            <p className="mt-3 font-serif text-base font-bold leading-snug">
              Docs — your multiplayer knowledge layer
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
              A real editor with live embeds of lessons, recordings, whiteboards
              and quizzes. Publish to a cohort, a course, or the open web.
            </p>
            <div className="mt-auto pt-4">
              <Button asChild size="sm" className="w-full gap-1.5 text-xs" onClick={onClose}>
                <Link href="/features/docs">
                  See Docs <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom trust strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-6 py-3 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="font-semibold text-foreground">0% commission</span>
          <span aria-hidden>·</span>
          <span>Direct payouts (UPI + cards)</span>
          <span aria-hidden>·</span>
          <span>One-click full export</span>
          <span aria-hidden>·</span>
          <span>30-day refund</span>
        </div>
        <Link
          href="/founder-bill-of-rights"
          onClick={onClose}
          className="font-semibold text-primary hover:underline"
        >
          Why these are in writing →
        </Link>
      </div>
    </div>
  )
}

// ─── Solutions panel — 3 columns + spotlight (1240px) ────────────
function SolutionsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 w-[min(1240px,calc(100vw-2rem))] max-h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card/95 shadow-2xl shadow-black/15 backdrop-blur-xl ring-1 ring-black/5 duration-150">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-6 py-3">
        <p className="text-[11px] font-semibold text-muted-foreground">
          <span className="font-bold text-foreground">Solutions</span> · Pick the path that matches what you do.
        </p>
        <Link
          href="/use-cases"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          All use cases <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_340px]">
        {SOLUTIONS.map((section, si) => (
          <div
            key={section.title}
            className={cn("py-5 px-2", si < SOLUTIONS.length ? "border-r border-border/60" : "")}
          >
            <GroupTitle>{section.title}</GroupTitle>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavRow key={item.href} item={item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}

        {/* Spotlight — "Replace your stack" */}
        <div className="relative flex flex-col overflow-hidden bg-gradient-to-br from-primary/[0.08] via-card to-emerald-500/[0.06]">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Bigger picture
            </p>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <p className="font-serif text-base font-bold leading-snug">
              Replace Notion + Discord + Zoom + Teachable + a custom landing site.
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
              One workspace. One member record. One bill. The fragmented stack most creators end up with — cleaned up.
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                "Storefront + checkout + payouts",
                "Cohort feed + community + leaderboard",
                "Live + recordings + transcripts",
                "Docs + blog + public portal",
              ].map((b) => (
                <li key={b} className="flex items-start gap-1.5 text-[11px]">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-4">
              <Button asChild size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={onClose}>
                <Link href="/solutions/replace-your-stack">
                  See the cost calc <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Resources panel — 2 columns + Alternatives panel (1240px) ───
function ResourcesPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 w-[min(1240px,calc(100vw-2rem))] max-h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card/95 shadow-2xl shadow-black/15 backdrop-blur-xl ring-1 ring-black/5 duration-150">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-6 py-3">
        <p className="text-[11px] font-semibold text-muted-foreground">
          <span className="font-bold text-foreground">Resources</span> · Learn how, compare honestly, talk to a human.
        </p>
        <Link
          href="/help"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Help center <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1.6fr]">
        {RESOURCES.map((section, si) => (
          <div
            key={section.title}
            className={cn("py-5 px-2", si < RESOURCES.length ? "border-r border-border/60" : "")}
          >
            <GroupTitle>{section.title}</GroupTitle>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavRow key={item.href} item={item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}

        {/* Alternatives — 2-col grid of 8 rival pages */}
        <div className="bg-gradient-to-br from-primary/[0.03] via-card to-accent/[0.04] py-5 px-2">
          <GroupTitle>Compare honestly</GroupTitle>
          <div className="grid grid-cols-2 gap-0.5">
            {ALTERNATIVES_LINKS.map((item) => (
              <NavRow key={item.href} item={item} onClick={onClose} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-3 text-[11px] text-muted-foreground">
        <p>
          Questions?{" "}
          <Link href="mailto:hello@thebigclass.com" onClick={onClose} className="font-semibold text-primary hover:underline">
            hello@thebigclass.com
          </Link>
          {" "}— we reply same day.
        </p>
        <Link
          href="/about"
          onClick={onClose}
          className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground"
        >
          Our story <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────
export function Header() {
  const [open, setOpen] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(null), 150)
  }
  function cancelClose(key?: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    if (key) setOpen(key)
  }

  function MenuTrigger({ id, label }: { id: string; label: string }) {
    return (
      <button
        type="button"
        onClick={() => setOpen(open === id ? null : id)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          open === id ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        )}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open === id && "rotate-180")} />
      </button>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="inline-flex">
            <Logo size="md" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {/* Platform */}
            <div
              className="relative"
              onMouseEnter={() => cancelClose("platform")}
              onMouseLeave={scheduleClose}
            >
              <MenuTrigger id="platform" label="Platform" />
              {open === "platform" && (
                <div
                  className="fixed left-1/2 top-16 z-50 -translate-x-1/2 pt-2"
                  onMouseEnter={() => cancelClose()}
                  onMouseLeave={scheduleClose}
                >
                  <PlatformPanel onClose={() => setOpen(null)} />
                </div>
              )}
            </div>

            {/* Solutions */}
            <div
              className="relative"
              onMouseEnter={() => cancelClose("solutions")}
              onMouseLeave={scheduleClose}
            >
              <MenuTrigger id="solutions" label="Solutions" />
              {open === "solutions" && (
                <div
                  className="fixed left-1/2 top-16 z-50 -translate-x-1/2 pt-2"
                  onMouseEnter={() => cancelClose()}
                  onMouseLeave={scheduleClose}
                >
                  <SolutionsPanel onClose={() => setOpen(null)} />
                </div>
              )}
            </div>

            {/* Resources */}
            <div
              className="relative"
              onMouseEnter={() => cancelClose("resources")}
              onMouseLeave={scheduleClose}
            >
              <MenuTrigger id="resources" label="Resources" />
              {open === "resources" && (
                <div
                  className="fixed left-1/2 top-16 z-50 -translate-x-1/2 pt-2"
                  onMouseEnter={() => cancelClose()}
                  onMouseLeave={scheduleClose}
                >
                  <ResourcesPanel onClose={() => setOpen(null)} />
                </div>
              )}
            </div>

            <Link
              href="/pricing"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/signup">Start free</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      {mobileOpen && <MobileDrawer onClose={() => setMobileOpen(false)} />}
    </>
  )
}

// ─── Mobile drawer ───────────────────────────────────────────────
function MobileDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Logo size="sm" />
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-6 p-5">
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" onClick={onClose}>
              <Link href="/signup">Start free</Link>
            </Button>
            <Button asChild size="sm" variant="outline" onClick={onClose}>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          {[
            { title: "Platform",     items: PLATFORM.flatMap((s) => s.items) },
            { title: "Solutions",    items: SOLUTIONS.flatMap((s) => s.items) },
            { title: "Resources",    items: RESOURCES.flatMap((s) => s.items) },
            { title: "Alternatives", items: ALTERNATIVES_LINKS },
          ].map(({ title, items }) => (
            <div key={title}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {title}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/40"
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.color)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          {item.chip && <Chip label={item.chip} variant={item.chipVariant} />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{item.body}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="border-t border-border pt-4">
            <Link
              href="/pricing"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl border border-border p-3 text-sm font-semibold hover:bg-muted/40"
            >
              Pricing & plans <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Suppress lint on imports reserved for future spotlight variants.
void Heart
void Shapes
void UserPlus
void PlayCircle
void Play
void Mic
void Key
void CreditCard
void Film
void MessageSquare
void Newspaper
