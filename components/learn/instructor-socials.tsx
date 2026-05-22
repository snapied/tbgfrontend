// Small icon-row of an instructor's social / web links.
//
// Pulls every populated URL off a User record (portfolio, Twitter,
// LinkedIn, YouTube, Instagram, GitHub) and renders an accessible
// outgoing link per item via <ExternalLink> — that gives us
// rel="nofollow noopener noreferrer" + target="_blank" everywhere.
//
// Renders nothing when the instructor hasn't set any links, so the
// caller doesn't need to gate.

import { Github, Globe, Instagram, Linkedin, Twitter, Youtube } from "lucide-react"
import { ExternalLink } from "@/components/ui/external-link"
import type { User } from "@/lib/lms-store"
import { cn } from "@/lib/utils"

interface Props {
  user: Pick<User, "portfolioUrl" | "twitterUrl" | "linkedInUrl" | "youtubeUrl" | "instagramUrl" | "githubUrl">
  className?: string
}

export function InstructorSocials({ user, className }: Props) {
  const links: Array<{ url?: string; label: string; Icon: typeof Github }> = [
    { url: user.portfolioUrl, label: "Website",   Icon: Globe },
    { url: user.twitterUrl,   label: "Twitter / X", Icon: Twitter },
    { url: user.linkedInUrl,  label: "LinkedIn",  Icon: Linkedin },
    { url: user.youtubeUrl,   label: "YouTube",   Icon: Youtube },
    { url: user.instagramUrl, label: "Instagram", Icon: Instagram },
    { url: user.githubUrl,    label: "GitHub",    Icon: Github },
  ]
  const active = links.filter((l) => l.url && l.url.trim())
  if (active.length === 0) return null
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {active.map(({ url, label, Icon }) => (
        <ExternalLink
          key={label}
          href={url!}
          title={label}
          aria-label={label}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Icon className="h-3.5 w-3.5" />
        </ExternalLink>
      ))}
    </div>
  )
}
