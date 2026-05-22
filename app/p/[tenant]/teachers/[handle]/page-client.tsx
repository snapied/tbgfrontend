"use client"

// Per-teacher public profile. Resolves the [handle] by checking
// curated faculty first, then falling back to a workspace user whose
// email-local-part matches. Renders hero + bio + socials + courses by
// this instructor.

import { use, useMemo } from "react"
import Link from "next/link"
import {
  Globe,
  Github,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { formatMoney } from "@/lib/currency"
import { ExternalLink } from "@/components/ui/external-link"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { cn } from "@/lib/utils"

export default function PortalTeacherDetailsClient({
  params,
}: {
  params: Promise<{ tenant: string; handle: string }>
}) {
  const { tenant, handle } = use(params)
  const { faculty } = usePortal()
  const { users, courses, getUserById } = useLMS()
  const basePath = `/p/${tenant}`

  // Resolution: curated faculty first, then a workspace user whose
  // email-local-part matches the handle (so /teachers/jane-doe works
  // for jane-doe@school.com even if she's not in the curated list yet).
  const member = useMemo(() => {
    const fac = faculty.find((m) => m.handle === handle)
    if (fac) {
      const u = fac.userId ? getUserById(fac.userId) : undefined
      return {
        name: fac.name,
        role: fac.role,
        bio: fac.bio ?? u?.bio,
        photo: fac.photo ?? u?.avatar,
        cover: fac.coverImageUrl ?? u?.coverImageUrl,
        expertise: fac.expertise ?? [],
        socials: fac.socials ?? {},
        linkedUserId: fac.userId,
      }
    }
    const u = users.find((u) => u.email.split("@")[0] === handle)
    if (!u) return null
    return {
      name: u.name,
      role: u.role.charAt(0).toUpperCase() + u.role.slice(1),
      bio: u.bio,
      photo: u.avatar,
      cover: u.coverImageUrl,
      expertise: [] as string[],
      socials: {
        twitter: u.twitterUrl,
        linkedin: u.linkedInUrl,
        youtube: u.youtubeUrl,
        instagram: u.instagramUrl,
        github: u.githubUrl,
        email: u.portfolioUrl,
      },
      linkedUserId: u.id,
    }
  }, [faculty, users, getUserById, handle])

  // Courses authored by this instructor — links via the linked user id
  // (or by name fallback when no user is linked).
  const taughtCourses = useMemo(() => {
    if (!member) return []
    return courses.filter(
      (c) =>
        c.status === "published" &&
        (c.instructor.id === member.linkedUserId || c.instructor.name === member.name),
    )
  }, [courses, member])

  if (!member) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Teacher not found</h1>
        <p className="mt-2 text-muted-foreground">
          No one with the handle <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{handle}</code> teaches here.
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link href={`${basePath}/teachers`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> All teachers
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        <div
          className="h-56 w-full sm:h-72"
          style={
            member.cover
              ? undefined
              : { background: "linear-gradient(135deg, var(--primary), var(--accent))" }
          }
        >
          {member.cover && (
            <img src={member.cover} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="-mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name}
                className="h-32 w-32 shrink-0 rounded-full object-cover ring-4 ring-background"
              />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground ring-4 ring-background">
                {member.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
            )}
            <div className="flex-1 pb-2">
              <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                {member.name}
              </h1>
              {member.role && (
                <p className="mt-1 text-muted-foreground">{member.role}</p>
              )}
            </div>
            <SocialIcons socials={member.socials} />
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            {member.bio && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-3 font-serif text-lg font-bold tracking-tight">About</h2>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{member.bio}</p>
                </CardContent>
              </Card>
            )}
            {member.expertise && member.expertise.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-3 font-serif text-lg font-bold tracking-tight">Expertise</h2>
                  <div className="flex flex-wrap gap-2">
                    {member.expertise.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Courses by this instructor */}
            {taughtCourses.length > 0 && (
              <div>
                <h2 className="mb-4 font-serif text-2xl font-bold tracking-tight">
                  Courses by {member.name.split(" ")[0]}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {taughtCourses.map((c) => (
                    <Link key={c.id} href={`${basePath}/courses/details/${c.slug}`} className="group block">
                      <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
                        <div className="aspect-video overflow-hidden bg-muted">
                          <img
                            src={c.thumbnail || "/placeholder.svg?height=400&width=600"}
                            alt={c.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="line-clamp-2 font-semibold group-hover:text-primary">
                            {c.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {stripRichTextTags(c.description).slice(0, 120)}
                          </p>
                          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                            <span className="text-base font-bold">
                              {c.price > 0 ? formatMoney(c.price, c.currency) : "Free"}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">{c.level}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold">By the numbers</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Courses</dt>
                    <dd className="font-semibold">{taughtCourses.length}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Students</dt>
                    <dd className="font-semibold">
                      {taughtCourses
                        .reduce((acc, c) => acc + (c.enrolledCount ?? 0), 0)
                        .toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold">Get in touch</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Send a message and we&apos;ll reach out within a business day.
                </p>
                <Button asChild className={cn("mt-3 w-full")}>
                  <Link href={`${basePath}/contact`}>Send a message</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  )
}

function SocialIcons({
  socials,
}: {
  socials: {
    twitter?: string
    linkedin?: string
    youtube?: string
    instagram?: string
    github?: string
    facebook?: string
    email?: string
  }
}) {
  const items: Array<{ href: string; Icon: typeof Twitter; label: string }> = []
  if (socials.twitter) items.push({ href: socials.twitter, Icon: Twitter, label: "Twitter" })
  if (socials.linkedin) items.push({ href: socials.linkedin, Icon: Linkedin, label: "LinkedIn" })
  if (socials.youtube) items.push({ href: socials.youtube, Icon: Youtube, label: "YouTube" })
  if (socials.instagram) items.push({ href: socials.instagram, Icon: Instagram, label: "Instagram" })
  if (socials.github) items.push({ href: socials.github, Icon: Github, label: "GitHub" })
  if (socials.email) {
    const isUrl = /^https?:\/\//.test(socials.email)
    items.push({
      href: isUrl ? socials.email : `mailto:${socials.email}`,
      Icon: isUrl ? Globe : Mail,
      label: "Website",
    })
  }
  if (items.length === 0) return null
  return (
    <div className="flex items-center gap-2 pb-2">
      {items.map((it, i) => (
        <ExternalLink
          key={i}
          href={it.href}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          aria-label={it.label}
        >
          <it.Icon className="h-4 w-4" />
        </ExternalLink>
      ))}
    </div>
  )
}
