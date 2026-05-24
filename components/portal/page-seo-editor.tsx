"use client"

// PageSeoEditor — per-page SEO meta editor + social-share simulator.
//
// Surfaces the four fields that matter for discoverability and
// social previews (title, description, OG image, noIndex) and renders
// live mock-ups of the most-shared destinations (Google, WhatsApp,
// Slack, LinkedIn, X) so the teacher sees how their unfurl card
// actually looks before they hit publish.
//
// Defaults follow the existing fallback chain:
//   • seo.title       → page.title       → brand.siteName
//   • seo.description → first ~160 chars of the first rich-text section
//   • seo.ogImage     → brand.ogImage    → brand.logoUrl

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Eye, EyeOff, Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { cn } from "@/lib/utils"
import type { PortalPage, PortalPageSEO } from "@/lib/portal-store"

interface Props {
  page: PortalPage
  /** Whole-portal defaults the editor falls back to. */
  defaults: {
    siteName?: string
    description?: string
    ogImage?: string
    primaryColor?: string
  }
  /** The full public URL of this page — drives the preview chrome's
   *  fake address bar copy. */
  publicUrl: string
  onChange: (seo: PortalPageSEO) => void
}

const TITLE_LIMIT = 70 // Google truncates around 60–70 chars; keep below.
const DESC_LIMIT = 160 // 155–165 sweet spot.

export function PageSeoEditor({ page, defaults, publicUrl, onChange }: Props) {
  const seo = page.seo ?? {}
  const [open, setOpen] = useState(false)

  // Auto-derived defaults. We never persist these — only show them as
  // "current preview" so the teacher knows what visitors actually see.
  const effective = useMemo(() => {
    const title = seo.title ?? page.title ?? defaults.siteName ?? "Your page"
    const description =
      seo.description ?? defaults.description ?? "Read more on our portal."
    const ogImage = seo.ogImage ?? defaults.ogImage ?? undefined
    return { title, description, ogImage }
  }, [seo, page, defaults])

  const update = (patch: Partial<PortalPageSEO>) => {
    onChange({ ...seo, ...patch })
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">SEO & social sharing</CardTitle>
            {seo.noindex && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <EyeOff className="h-2.5 w-2.5" /> Hidden from search
              </span>
            )}
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {!open && (
          <CardDescription className="mt-1 text-[12px]">
            Title, description, share image, and how it looks unfurled in WhatsApp / Slack / LinkedIn / X.
          </CardDescription>
        )}
      </CardHeader>
      {open && (
        <CardContent className="space-y-5 border-t border-border pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* ── Editor ─────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="seo-title" className="flex items-center justify-between">
                  <span>Meta title</span>
                  <CharCount value={seo.title ?? ""} limit={TITLE_LIMIT} />
                </Label>
                <Input
                  id="seo-title"
                  value={seo.title ?? ""}
                  onChange={(e) => update({ title: e.target.value || undefined })}
                  placeholder={page.title}
                  maxLength={TITLE_LIMIT + 10}
                />
                <p className="text-[11px] text-muted-foreground">
                  Defaults to the page title. Aim for ≤ 60 characters so Google doesn&rsquo;t cut it off.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seo-desc" className="flex items-center justify-between">
                  <span>Meta description</span>
                  <CharCount value={seo.description ?? ""} limit={DESC_LIMIT} />
                </Label>
                <Textarea
                  id="seo-desc"
                  rows={3}
                  value={seo.description ?? ""}
                  onChange={(e) => update({ description: e.target.value || undefined })}
                  placeholder={defaults.description ?? "Two sentences about the page."}
                />
                <p className="text-[11px] text-muted-foreground">
                  Shows under the title in Google + WhatsApp/Slack unfurls. 150–160 chars is ideal.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Share image (OG)</Label>
                <FileUploadField
                  value={seo.ogImage ?? ""}
                  onChange={(url) => update({ ogImage: url || undefined })}
                  accept="image/png,image/jpeg,image/webp"
                  maxSizeMB={2}
                  hint="1200 × 630 PNG/JPG. Falls back to your workspace share card."
                  variant="compact"
                  compress={{ maxDim: 1200, quality: 0.85, mime: "image/jpeg" }}
                />
              </div>

              <label className="flex items-start gap-2 rounded-md border border-border bg-card p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={!!seo.noindex}
                  onChange={(e) => update({ noindex: e.target.checked || undefined })}
                />
                <span>
                  <span className="block font-medium">Hide from search engines</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Adds <code className="rounded bg-muted px-1 font-mono text-[10px]">noindex,nofollow</code>. Use for thank-you pages and lead magnets.
                  </span>
                </span>
              </label>
            </div>

            {/* ── Live preview mocks ─────────────────────────────── */}
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-3 w-3" /> Live previews
              </p>

              {/* Google search */}
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Google search
                </p>
                <div className="space-y-0.5">
                  <p className="truncate text-[12px] text-emerald-700">{publicUrl}</p>
                  <p className="line-clamp-2 font-medium leading-tight text-[#1a0dab]">
                    {effective.title}
                  </p>
                  <p className="line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
                    {effective.description}
                  </p>
                </div>
              </div>

              {/* WhatsApp / Slack unfurl */}
              <div className="rounded-lg border-l-4 border-l-[#25D366] bg-muted/30 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  WhatsApp / Slack
                </p>
                <div className="flex gap-2">
                  {effective.ogImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effective.ogImage}
                      alt=""
                      className="h-14 w-20 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div
                      className="h-14 w-20 shrink-0 rounded"
                      style={{ background: defaults.primaryColor ?? "#0a3024" }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[12.5px] font-semibold">{effective.title}</p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">
                      {effective.description}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {hostOf(publicUrl)}
                    </p>
                  </div>
                </div>
              </div>

              {/* LinkedIn / X large image card */}
              <div className="overflow-hidden rounded-lg border border-border">
                <p className="border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  LinkedIn / X
                </p>
                <div
                  className="flex aspect-[1200/630] w-full items-end p-3"
                  style={{
                    background: effective.ogImage
                      ? `url(${effective.ogImage}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${defaults.primaryColor ?? "#0a3024"}, #1e293b)`,
                  }}
                >
                  <div className="rounded bg-white/95 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm">
                    {hostOf(publicUrl)}
                  </div>
                </div>
                <div className="space-y-0.5 px-3 py-2">
                  <p className="line-clamp-2 text-[12.5px] font-semibold leading-tight">
                    {effective.title}
                  </p>
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">
                    {effective.description}
                  </p>
                </div>
              </div>

              {seo.title === undefined && seo.description === undefined && (
                <p className="text-[11px] italic text-muted-foreground">
                  Tip: fill in even one of these and the preview cards above
                  update instantly. Defaults come from your page title +
                  first paragraph.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function CharCount({ value, limit }: { value: string; limit: number }) {
  const len = value.length
  const ratio = len / limit
  return (
    <span
      className={cn(
        "text-[10px] tabular-nums",
        ratio < 0.7 ? "text-muted-foreground" : ratio < 1 ? "text-amber-600" : "text-destructive",
      )}
    >
      {len} / {limit}
    </span>
  )
}

function hostOf(url: string): string {
  try {
    const u = new URL(url, "https://example.com")
    return u.host || url
  } catch {
    return url
  }
}

