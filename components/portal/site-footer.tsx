"use client"

// Portal site footer. Layout dispatches on config.brand.footerLayout
// (see lib/portal-layout-presets.ts). Each variant works against the
// same PortalConfig data so switching layouts never loses content.

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowRight,
  BookOpen,
  Facebook,
  Github,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ExternalLink } from "@/components/ui/external-link"
import { cn } from "@/lib/utils"
import type { PortalConfig } from "@/lib/portal-store"
import { DEFAULT_FOOTER_PRESET } from "@/lib/portal-layout-presets"
import { usePortalDataset } from "@/components/portal/use-portal-dataset"
import { useTenant } from "@/lib/tenant-store"
import { useDocs } from "@/lib/docs"
import { useT, type Dictionary } from "@/lib/i18n"

// Auto-Knowledge-hub injection. When the tenant has at least one
// published-public doc, the footer surfaces a "Knowledge hub" link
// to /p/<tenant>/k so visitors can find it without the creator
// manually adding the link to their footer columns. Hidden when
// there are no public docs (avoids dead links).
function useKnowledgeHubLink(basePath: string): { label: string; href: string } | null {
  const { docs } = useDocs()
  return useMemo(() => {
    const hasPublic = docs.some(
      (d) =>
        d.audience.kind === "public" &&
        d.status === "published" &&
        !d.deletedAt &&
        d.publicSlug,
    )
    if (!hasPublic) return null
    return { label: "Knowledge hub", href: `${basePath}/k` }
  }, [docs, basePath])
}

interface Props {
  tenant: string
  config: PortalConfig
  basePath: string
}

export function PortalSiteFooter({ tenant, config, basePath }: Props) {
  const { t } = useT()
  const layout = config.brand.footerLayout || DEFAULT_FOOTER_PRESET
  const siteName = config.brand.siteName ?? tenant
  const tagline = config.brand.tagline
  const year = new Date().getFullYear()
  // When the tenant hasn't customised footerCopyright, use the localised
  // default: "© <year> <site>. <translated 'All rights reserved.'>".
  // If they did set a custom copyright string, leave it untouched so a
  // bilingual line they wrote by hand keeps rendering verbatim.
  const copyright =
    config.footerCopyright ??
    `© ${year} ${siteName}. ${t("footer.allRightsReserved" as keyof Dictionary)}`

  switch (layout) {
    case "compact-mono":
      return <CompactMono siteName={siteName} config={config} basePath={basePath} copyright={copyright} />
    case "newsletter-cta":
      return <NewsletterCta siteName={siteName} tagline={tagline} config={config} basePath={basePath} copyright={copyright} />
    case "two-column":
      return <TwoColumn siteName={siteName} tagline={tagline} config={config} basePath={basePath} copyright={copyright} />
    case "centered-tight":
      return <CenteredTight siteName={siteName} tagline={tagline} config={config} basePath={basePath} copyright={copyright} />
    case "card-grid":
      return <CardGrid siteName={siteName} tagline={tagline} config={config} basePath={basePath} copyright={copyright} />
    default:
      return <MultiColumn siteName={siteName} tagline={tagline} config={config} basePath={basePath} copyright={copyright} />
  }
}

// ============================================================
// Layout variants
// ============================================================

interface VariantProps {
  siteName: string
  tagline?: string
  config: PortalConfig
  basePath: string
  copyright: string
}

function MultiColumn({ siteName, tagline, config, basePath, copyright }: VariantProps) {
  const knowledgeHub = useKnowledgeHubLink(basePath)
  const columns = augmentColumnsWithKnowledgeHub(config.footerColumns ?? [], knowledgeHub)
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <BrandBlock siteName={siteName} tagline={tagline} config={config} basePath={basePath} />
          {columns
            .filter((c) => c.links.length > 0)
            .slice(0, 3)
            .map((col) => (
              <FooterColumn key={col.id} column={col} basePath={basePath} />
            ))}
        </div>
        <BottomStrip copyright={copyright} hidePoweredBy={config.brand.hidePoweredBy || config.brand.hideAttribution} />
      </div>
    </footer>
  )
}

function CompactMono({ siteName, config, basePath, copyright }: VariantProps) {
  const knowledgeHub = useKnowledgeHubLink(basePath)
  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row lg:px-8">
        <Link href={basePath || "/"} className="flex items-center gap-2.5">
          {config.brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.brand.logoUrl} alt={siteName} className="h-7 w-auto max-w-[140px] object-contain" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-background text-xs font-bold text-foreground">
              {siteName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="font-semibold tracking-tight">{siteName}</span>
        </Link>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-5">
          {knowledgeHub && (
            <Link
              href={knowledgeHub.href}
              className="inline-flex items-center gap-1.5 text-xs opacity-80 transition-opacity hover:opacity-100"
            >
              <BookOpen className="h-3 w-3" />
              {knowledgeHub.label}
            </Link>
          )}
          <p className="text-xs opacity-70">{copyright}</p>
        </div>
        <SocialsRow config={config} mono />
      </div>
    </footer>
  )
}

function NewsletterCta({ siteName, tagline, config, basePath, copyright }: VariantProps) {
  const knowledgeHub = useKnowledgeHubLink(basePath)
  const columns = augmentColumnsWithKnowledgeHub(config.footerColumns ?? [], knowledgeHub)
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="border-b border-border bg-primary/[0.04]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center lg:px-8">
          <h3 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            Join the newsletter
          </h3>
          <p className="max-w-xl text-sm text-muted-foreground">
            New courses, tutorials, and behind-the-scenes notes — straight to your inbox, no spam.
          </p>
          <NewsletterInput />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <BrandBlock siteName={siteName} tagline={tagline} config={config} basePath={basePath} />
          {columns
            .filter((c) => c.links.length > 0)
            .slice(0, 3)
            .map((col) => (
              <FooterColumn key={col.id} column={col} basePath={basePath} />
            ))}
        </div>
        <BottomStrip copyright={copyright} hidePoweredBy={config.brand.hidePoweredBy || config.brand.hideAttribution} />
      </div>
    </footer>
  )
}

function TwoColumn({ siteName, tagline, config, basePath, copyright }: VariantProps) {
  const s = config.socials ?? {}
  const knowledgeHub = useKnowledgeHubLink(basePath)
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2 lg:px-8">
        <div>
          <BrandBlock siteName={siteName} tagline={tagline} config={config} basePath={basePath} />
          {knowledgeHub && <KnowledgeHubInline link={knowledgeHub} />}
        </div>
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Get in touch
          </h4>
          {s.email && (
            <p className="text-sm">
              <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
            </p>
          )}
          <SocialsRow config={config} />
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-border px-6 py-4 lg:px-8">
        <p className="text-center text-xs text-muted-foreground">{copyright}</p>
      </div>
    </footer>
  )
}

function CenteredTight({ siteName, tagline, config, basePath, copyright }: VariantProps) {
  const knowledgeHub = useKnowledgeHubLink(basePath)
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-10 text-center lg:px-8">
        <Link href={basePath || "/"} className="flex items-center gap-2.5">
          {config.brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.brand.logoUrl} alt={siteName} className="h-8 w-auto max-w-[140px] object-contain" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              {siteName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="font-semibold tracking-tight">{siteName}</span>
        </Link>
        {tagline && <p className="text-sm text-muted-foreground">{tagline}</p>}
        {knowledgeHub && <KnowledgeHubInline link={knowledgeHub} />}
        <SocialsRow config={config} />
        <p className="text-xs text-muted-foreground">{copyright}</p>
      </div>
    </footer>
  )
}

function CardGrid({ siteName, tagline, config, basePath, copyright }: VariantProps) {
  const knowledgeHub = useKnowledgeHubLink(basePath)
  const columns = augmentColumnsWithKnowledgeHub(config.footerColumns ?? [], knowledgeHub)
  return (
    <footer className="px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <BrandBlock siteName={siteName} tagline={tagline} config={config} basePath={basePath} />
          {columns
            .filter((c) => c.links.length > 0)
            .slice(0, 3)
            .map((col) => (
              <FooterColumn key={col.id} column={col} basePath={basePath} />
            ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">{copyright}</p>
          <SocialsRow config={config} compact />
        </div>
      </div>
    </footer>
  )
}

// ============================================================
// Building blocks
// ============================================================

function BrandBlock({
  siteName,
  tagline,
  config,
  basePath,
}: {
  siteName: string
  tagline?: string
  config: PortalConfig
  basePath: string
}) {
  return (
    <div>
      <Link href={basePath || "/"} className="flex items-center gap-2.5">
        {config.brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.brand.logoUrl}
            alt={siteName}
            className="h-8 w-auto max-w-[140px] object-contain"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            {siteName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="font-semibold tracking-tight">{siteName}</span>
      </Link>
      {tagline && <p className="mt-3 text-sm text-muted-foreground">{tagline}</p>}
      <SocialsRow config={config} />
    </div>
  )
}

function FooterColumn({
  column,
  basePath,
}: {
  column: { heading: string; links: { label: string; href: string }[] }
  basePath: string
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
        {column.heading}
      </h4>
      <ul className="mt-3 space-y-2">
        {column.links.map((l, i) =>
          /^https?:\/\//.test(l.href) || l.href.startsWith("mailto:") ? (
            <li key={i}>
              <ExternalLink
                href={l.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </ExternalLink>
            </li>
          ) : (
            <li key={i}>
              <Link
                // Relative hrefs get scoped to the tenant's portal so
                // /privacy resolves to /p/<tenant>/privacy. Without this
                // every footer link 404s on the public site.
                href={l.href.startsWith("/") ? `${basePath}${l.href}` : l.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

// Append (or extend) a column with the Knowledge hub link when
// the tenant has at least one public doc. Strategy:
//   • If any existing column is titled Resources / Links / Learn /
//     Read (case-insensitive), append into it so we don't add a
//     redundant new column.
//   • Otherwise, prepend a synthetic "Resources" column with just
//     the Knowledge hub link.
//   • Idempotent — if the link is already in the columns (e.g. the
//     creator manually added it), we return the original.
function augmentColumnsWithKnowledgeHub(
  columns: NonNullable<PortalConfig["footerColumns"]>,
  link: { label: string; href: string } | null,
): NonNullable<PortalConfig["footerColumns"]> {
  if (!link) return columns
  const alreadyExists = columns.some((c) =>
    c.links.some((l) => l.href === link.href || l.label === link.label),
  )
  if (alreadyExists) return columns

  const reusableIdx = columns.findIndex((c) =>
    /^(resources|links|learn|read)$/i.test(c.heading ?? ""),
  )
  if (reusableIdx >= 0) {
    const next = columns.slice()
    const target = next[reusableIdx]
    next[reusableIdx] = { ...target, links: [...target.links, link] }
    return next
  }

  // Synthetic column at the front (so it's adjacent to BrandBlock
  // and visually anchored as the lead "what to read" column).
  return [
    { id: "auto-resources", heading: "Resources", links: [link] },
    ...columns,
  ]
}

// Inline link variant — used by the compact layouts that don't
// have a columns grid. Reads as a small "Knowledge hub" pill in
// muted text so it doesn't shout.
function KnowledgeHubInline({ link }: { link: { label: string; href: string } }) {
  return (
    <Link
      href={link.href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <BookOpen className="h-3 w-3" />
      {link.label}
    </Link>
  )
}

function BottomStrip({
  copyright,
  hidePoweredBy,
}: {
  copyright: string
  // White-label opt-out for the "Powered by The Big Class"
  // attribution. When true we collapse the layout so the
  // copyright sits alone — and the centred-strip variants keep
  // working visually instead of leaving an empty slot.
  hidePoweredBy?: boolean
}) {
  const { t } = useT()
  return (
    <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
      <p>{copyright}</p>
      {!hidePoweredBy && (
        <p>
          {t("footer.poweredBy" as keyof Dictionary)}{" "}
          <ExternalLink href="https://thebigclass.com" className="font-medium hover:text-foreground">
            The Big Class
          </ExternalLink>
        </p>
      )}
    </div>
  )
}

function SocialsRow({
  config,
  mono,
  compact,
}: {
  config: PortalConfig
  mono?: boolean
  compact?: boolean
}) {
  const s = config.socials ?? {}
  const items: Array<{ href: string; Icon: typeof Twitter; label: string }> = []
  if (s.twitter) items.push({ href: s.twitter, Icon: Twitter, label: "Twitter" })
  if (s.linkedin) items.push({ href: s.linkedin, Icon: Linkedin, label: "LinkedIn" })
  if (s.youtube) items.push({ href: s.youtube, Icon: Youtube, label: "YouTube" })
  if (s.instagram) items.push({ href: s.instagram, Icon: Instagram, label: "Instagram" })
  if (s.facebook) items.push({ href: s.facebook, Icon: Facebook, label: "Facebook" })
  if (s.github) items.push({ href: s.github, Icon: Github, label: "GitHub" })
  if (s.email) items.push({ href: `mailto:${s.email}`, Icon: Mail, label: "Email" })
  if (items.length === 0) return null

  const size = compact ? "h-7 w-7" : "h-8 w-8"
  return (
    <div className={cn("mt-4 flex items-center gap-2", compact && "mt-0")}>
      {items.map((it, i) => (
        <ExternalLink
          key={i}
          href={it.href}
          className={cn(
            "flex items-center justify-center rounded-full border transition",
            size,
            mono
              ? "border-background/30 text-background hover:border-background hover:bg-background hover:text-foreground"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
          )}
          aria-label={it.label}
        >
          <it.Icon className="h-4 w-4" />
        </ExternalLink>
      ))}
    </div>
  )
}

// Newsletter signup. Routes through the shared usePortalDataset
// submitLead so the inbox + in-app notification + email pipeline
// stays unified with the contact form. (Earlier this bypassed all of
// that by POSTing directly to /api/portal/leads, which only wrote a
// log — no notification ever fired.)
function NewsletterInput() {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  // Lazy-resolve the tenant on submit so this component doesn't have
  // to be threaded with props from every footer caller.
  const { currentTenant } = useTenant()
  const slug = currentTenant?.slug ?? ""
  const dataset = usePortalDataset(slug)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      await dataset.submitLead({
        formId: "newsletter",
        pageSlug: typeof window !== "undefined" ? window.location.pathname : "",
        email: email.trim(),
      })
      setDone(true)
    } catch {
      setDone(true)
    } finally {
      setBusy(false)
    }
  }
  if (done) {
    return (
      <p className="text-sm text-success">Thanks — check your inbox to confirm.</p>
    )
  }
  return (
    <form onSubmit={submit} className="flex w-full max-w-md items-center gap-2">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1"
      />
      <Button type="submit" disabled={busy}>
        Subscribe <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </form>
  )
}
