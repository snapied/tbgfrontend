"use client"

// OgImageGenerator — workspace-wide social share card.
//
// Architecture: a SINGLE 1200×630 HTML div serves as both the live
// preview (CSS-scaled to fit the dashboard column) AND the PNG export
// source (captured at full resolution via html-to-image). One render
// path = zero mismatch between preview and final PNG.
//
// The wrapper uses position:relative + absolute child so the 1200px
// card NEVER affects the parent's layout width (no horizontal
// scrollbar). The card is scaled down via CSS transform to fit.
//
// On "Generate" the PNG is uploaded to R2 CDN and the resulting CDN
// URL (not a data URL) is stored in brand.ogImage. This means
// WhatsApp / LinkedIn / Slack scrapers can fetch the image directly
// from the CDN — no base64 bloat in localStorage.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Download, ImageIcon, RefreshCcw, Trash2 } from "lucide-react"
import { toPng } from "html-to-image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadDataUrl } from "@/lib/upload-asset"

interface Props {
  primaryColor?: string
  accentColor?: string
  siteName?: string
  tagline?: string
  logoUrl?: string
  currentOgImage?: string
  onGenerate: (cdnUrl: string) => void
  onClear: () => void
}

const W = 1200
const H = 630

export function OgImageGenerator({
  primaryColor,
  accentColor,
  siteName,
  tagline,
  logoUrl,
  currentOgImage,
  onGenerate,
  onClear,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  const primary = primaryColor || "#0a3024"
  const accent = accentColor || "#d4af37"
  const name = (siteName || "Your Academy").slice(0, 60)
  const tag = (tagline || "Teach. Sell. Certify.").slice(0, 100)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "")

  const darkPrimary = useMemo(() => darken(primary, 0.28), [primary])
  const accentTextColor = useMemo(() => readableOn(accent), [accent])

  // Measure container width and compute a scale factor so the 1200px
  // card fits without pushing out a horizontal scrollbar.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const w = el.clientWidth
    if (w > 0) setScale(w / W)
  }, [])
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w > 0) setScale(w / W)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Generate PNG → Upload to CDN → return CDN URL.
  const handleGenerate = async () => {
    if (!cardRef.current) return
    setBusy(true)
    setError(null)
    try {
      // 1. Capture the card as a PNG data URL.
      const dataUrl = await toPng(cardRef.current, {
        width: W,
        height: H,
        pixelRatio: 1,
        cacheBust: true,
      })
      // 2. Upload to R2 CDN.
      const cdnUrl = await uploadDataUrl(dataUrl, `${slug || "share"}-og`, "workspace")
      // 3. Pass the CDN URL back — stored in brand.ogImage.
      onGenerate(cdnUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate")
    } finally {
      setBusy(false)
    }
  }

  const hasGenerated = !!currentOgImage

  // Dynamic font size so long names don't clip.
  const nameFontSize = name.length > 30 ? 54 : name.length > 20 ? 64 : 76

  return (
    <div className="space-y-3">
      {/* Scaled wrapper. position:relative + overflow:hidden contains
          the 1200px absolute-positioned card so it never causes a
          horizontal scrollbar on the page. */}
      <div
        ref={wrapRef}
        className="rounded-xl border border-border shadow-md"
        style={{
          position: "relative",
          width: "100%",
          height: scale > 0 ? H * scale : "auto",
          aspectRatio: scale > 0 ? undefined : `${W} / ${H}`,
          overflow: "hidden",
        }}
      >
        {/* ──────────── THE CARD (1200×630, absolute) ──────────── */}
        <div
          ref={cardRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            transform: scale > 0 ? `scale(${scale})` : "scale(1)",
            transformOrigin: "top left",
            background: `linear-gradient(135deg, ${primary} 0%, ${darkPrimary} 100%)`,
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Inter', 'Arial', system-ui, sans-serif",
            overflow: "hidden",
          }}
        >
          {/* ── Decorative: large circle top-right ── */}
          <div
            style={{
              position: "absolute", width: 520, height: 520,
              borderRadius: "50%", top: -80, right: -60,
              background: accent, opacity: 0.18, pointerEvents: "none",
            }}
          />
          {/* ── Decorative: small circle bottom-left ── */}
          <div
            style={{
              position: "absolute", width: 360, height: 360,
              borderRadius: "50%", bottom: -120, left: -100,
              background: accent, opacity: 0.10, pointerEvents: "none",
            }}
          />

          {/* ── Dot grid (top-right) ── */}
          <div
            style={{
              position: "absolute", top: 40, right: 60,
              display: "grid",
              gridTemplateColumns: "repeat(7, 36px)",
              gridTemplateRows: "repeat(5, 36px)",
              opacity: 0.16, pointerEvents: "none",
            }}
          >
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 5, height: 5, borderRadius: "50%", background: "#fff",
                }}
              />
            ))}
          </div>

          {/* ── Left accent stripe ── */}
          <div
            style={{
              position: "absolute", left: 0, top: 0,
              width: 10, height: "100%", background: accent,
            }}
          />

          {/* ══════ Content area (flex-grow) ══════ */}
          <div
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              padding: "48px 72px 24px 72px",
              minHeight: 0, overflow: "hidden",
              position: "relative", zIndex: 1,
            }}
          >
            {/* Logo */}
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                crossOrigin="anonymous"
                style={{
                  maxHeight: 60, maxWidth: 180,
                  objectFit: "contain", objectPosition: "left",
                  flexShrink: 0,
                }}
              />
            )}

            {/* Spacer pushes name+tagline to bottom */}
            <div style={{ flex: 1, minHeight: 20 }} />

            {/* Site name */}
            <div
              style={{
                fontSize: nameFontSize, fontWeight: 800,
                fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
                color: "#ffffff", lineHeight: 1.12, letterSpacing: "-0.01em",
                flexShrink: 0, maxHeight: 210, overflow: "hidden",
              }}
            >
              {name}
            </div>

            {/* Tagline */}
            <div
              style={{
                marginTop: 16, fontSize: 28, fontWeight: 400,
                color: "rgba(255,255,255,0.80)", lineHeight: 1.35,
                flexShrink: 0, maxHeight: 80, overflow: "hidden",
              }}
            >
              {tag}
            </div>

            {/* Accent divider */}
            <div
              style={{
                width: 56, height: 3, borderRadius: 2,
                background: accent, marginTop: 20, flexShrink: 0,
              }}
            />
          </div>

          {/* ══════ Bottom bar (fixed 72px, never overlaps) ══════ */}
          <div
            style={{
              height: 72, flexShrink: 0,
              background: "rgba(0,0,0,0.38)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 72px", position: "relative", zIndex: 1,
            }}
          >
            <span
              style={{
                background: accent, color: accentTextColor,
                borderRadius: 20, padding: "8px 22px",
                fontSize: 20, fontWeight: 600, whiteSpace: "nowrap",
              }}
            >
              {slug}.thebigclass.com
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: 19, fontWeight: 500, whiteSpace: "nowrap",
              }}
            >
              Start learning →
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={hasGenerated ? "outline" : "default"}
          size="sm"
          disabled={busy}
          onClick={handleGenerate}
          className="gap-1.5"
        >
          {hasGenerated ? <RefreshCcw className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          {busy ? "Uploading…" : hasGenerated ? "Regenerate" : "Generate share card"}
        </Button>
        {currentOgImage && (
          <>
            <Button type="button" variant="ghost" size="sm" asChild className="gap-1.5">
              <a
                href={currentOgImage}
                download={`${slug || "share-card"}-og.png`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="ml-auto gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}
      <p className={cn("text-[11px]", hasGenerated ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
        {hasGenerated
          ? "✓ Share card uploaded to CDN. Social platforms will show this image when your portal URL is shared."
          : "Click Generate to create a 1200×630 PNG, upload it to your CDN, and set it as the default social preview image."}
      </p>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function darken(hex: string, ratio: number): string {
  const c = hex.replace(/^#/, "")
  if (c.length !== 6) return hex
  const d = (i: number) => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - ratio))
  return `rgb(${d(0)}, ${d(2)}, ${d(4)})`
}

function readableOn(hex: string): string {
  const c = hex.replace(/^#/, "")
  if (c.length !== 6) return "#000"
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#000" : "#fff"
}
