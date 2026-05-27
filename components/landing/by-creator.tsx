"use client"

import Link from "next/link"
import { ArrowRight, Youtube, Instagram, Briefcase, GraduationCap, Sparkles } from "lucide-react"

function SectionShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-background via-muted/10 to-background border-y border-border/40">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-16">{children}</div>
      </div>
    </section>
  )
}

export function ByCreator() {
  const creators = [
    {
      href: "/solutions/for-youtubers",
      icon: Youtube,
      label: "For YouTubers",
      body: "Convert subs to paying members.",
      img: "./music.jpeg",
      className: "md:col-span-2 lg:col-span-2 row-span-2",
    },
    {
      href: "/solutions/for-instagram-creators",
      icon: Instagram,
      label: "For Instagram creators",
      body: "Link-in-bio that actually earns.",
      img: "./social.jpeg",
      className: "md:col-span-1 lg:col-span-1 row-span-1",
    },
    {
      href: "/solutions/for-coaches",
      icon: Briefcase,
      label: "For coaches",
      body: "1:1 sessions + group cohorts + content.",
      img: "./coach.jpeg",
      className: "md:col-span-1 lg:col-span-1 row-span-1",
    },
    {
      href: "/solutions/for-course-creators",
      icon: GraduationCap,
      label: "For course creators",
      body: "The full course platform — your URL.",
      img: "/creator.jpeg",
      className: "md:col-span-1 lg:col-span-1 row-span-1",
    },
    {
      href: "/solutions/for-personal-brands",
      icon: Sparkles,
      label: "For personal brands",
      body: "Multi-product creator brand at one URL.",
      img: "./youtuber.jpg",
      className: "md:col-span-2 lg:col-span-2 row-span-1",
    },
  ]

  return (
    <SectionShell
      eyebrow="By Creator"
      title="Built for the way you create."
      subtitle="Whether you're recording from a studio or coaching from your living room, the platform adapts to your specific business model."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[280px]">
        {creators.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-background transition-all hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 ${c.className}`}
          >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
              <img
                src={c.img}
                alt={c.label}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 group-hover:from-black/95 group-hover:via-black/50" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-md shadow-sm">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-bold text-white sm:text-xl">{c.label}</h3>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80 font-medium sm:text-base">
                {c.body}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </SectionShell>
  )
}
