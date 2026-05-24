"use client"

// OgImageGenerator — workspace-wide social share card. Builds a
// 1200×630 PNG entirely client-side from the teacher's brand inputs
// (primaryColor + siteName + optional tagline + optional logo) and
// stores the resulting data-URL on `brand.ogImage`.
//
// Why client-side: 1200×630 OG images are typically 30–120 KB as
// PNG — fits comfortably in localStorage without a backend roundtrip,
// keeps the dashboard snappy, and means the generator works offline.
//
// The component renders both a live preview (rendered via CSS so the
// teacher sees changes instantly as they edit brand colours) and a
// "Regenerate as PNG" button that rasterises the current preview via
// a hidden canvas. Upload-your-own still flows through FileUploadField
// for teachers who already have a designed card.

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, Image as ImageIcon, RefreshCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  primaryColor?: string
  accentColor?: string
  siteName?: string
  tagline?: string
  logoUrl?: string
  /** Current saved value — when set we show "✓ Generated" state. */
  currentOgImage?: string
  /** Fires with a data: URL (PNG) when the teacher clicks Generate. */
  onGenerate: (dataUrl: string) => void
  /** Fires when the teacher clicks the trash icon. */
  onClear: () => void
}

// 1200×630 is the actual export. We render the preview at half scale
// (600×315) so the UI stays compact; the canvas rasterisation uses
// the full 2× dimensions for crispness.
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
  const previewRef = useRef<HTMLDivElement | null>(null)

  // Crisp primary fallback so a teacher who hasn't picked a colour
  // still gets a generated card.
  const primary = primaryColor || "#0a3024"
  const accent = accentColor || "#d4af37"
  const name = (siteName || "Your academy").slice(0, 60)
  const tag = (tagline || "Teach. Sell. Certify.").slice(0, 90)

  // Derive a lighter tint of primary for the gradient end.
  const tint = useMemo(() => mixWithWhite(primary, 0.18), [primary])

  // Rasterise via canvas. We re-draw the same shapes we render in CSS
  // so the export matches the preview pixel-for-pixel.
  const handleGenerate = async () => {
    setBusy(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Background gradient.
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, tint)
      grad.addColorStop(1, primary)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Accent diagonal stripe — slim ribbon at the bottom for visual
      // anchor. Keeps the card from looking like a flat colour block.
      ctx.fillStyle = accent
      ctx.fillRect(0, H - 24, W, 24)

      // Optional logo top-left. Image loads might fail (CORS, broken
      // URL) — we wrap in a try/catch and skip on error.
      const padding = 80
      let textTop = padding + 40
      if (logoUrl) {
        try {
          const img = await loadImage(logoUrl)
          // Constrain logo to max 200px tall.
          const ratio = img.width / img.height
          const drawH = Math.min(200, img.height)
          const drawW = drawH * ratio
          ctx.drawImage(img, padding, padding, drawW, drawH)
          textTop = padding + drawH + 50
        } catch {
          // Continue without logo.
        }
      }

      // Site name — big, serif, white.
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 88px 'Playfair Display', 'Times New Roman', serif"
      ctx.textBaseline = "top"
      wrapText(ctx, name, padding, textTop, W - padding * 2, 100)

      // Tagline — smaller, sans, semi-translucent.
      const taglineTop = textTop + 120
      ctx.fillStyle = "rgba(255,255,255,0.85)"
      ctx.font = "400 38px 'Inter', system-ui, sans-serif"
      wrapText(ctx, tag, padding, taglineTop, W - padding * 2, 50)

      // Footer "thebigclass.com" — small, bottom-right corner.
      ctx.fillStyle = "rgba(255,255,255,0.7)"
      ctx.font = "500 22px 'Inter', system-ui, sans-serif"
      ctx.textAlign = "right"
      ctx.fillText(name.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".thebigclass.com", W - padding, H - 60)
      ctx.textAlign = "left"

      const dataUrl = canvas.toDataURL("image/png")
      onGenerate(dataUrl)
    } finally {
      setBusy(false)
    }
  }

  // Re-fire generation whenever inputs change AND we previously had
  // an auto-generated image. We don't auto-generate on first mount —
  // that would overwrite a teacher-uploaded image silently.
  const hasGenerated = !!currentOgImage && currentOgImage.startsWith("data:image")
  useEffect(() => {
    if (!hasGenerated) return
    // Debounce so rapid colour-picker dragging doesn't thrash.
    const t = window.setTimeout(() => {
      void handleGenerate()
    }, 600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary, accent, name, tag, logoUrl])

  return (
    <div className="space-y-3">
      {/* Live CSS preview — matches the canvas output 1:1 so the
          teacher sees the final result before committing. */}
      <div
        ref={previewRef}
        className="relative overflow-hidden rounded-lg border border-border shadow-sm"
        style={{
          aspectRatio: `${W} / ${H}`,
          background: `linear-gradient(135deg, ${tint} 0%, ${primary} 100%)`,
        }}
        role="img"
        aria-label={`Share card preview for ${name}`}
      >
        {/* Bottom accent ribbon */}
        <div
          className="absolute inset-x-0 bottom-0 h-[3.8%]"
          style={{ background: accent }}
        />
        <div className="absolute inset-0 flex flex-col p-[6.7%]">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="max-h-[16%] w-auto object-contain object-left"
            />
          )}
          <div className="mt-auto">
            <p
              className="font-serif text-[6.5%] font-bold leading-tight text-white"
              style={{ fontSize: "clamp(20px, 7.3vw, 88px)" }}
            >
              {name}
            </p>
            <p
              className="mt-2 text-white/80"
              style={{ fontSize: "clamp(9px, 3.1vw, 38px)" }}
            >
              {tag}
            </p>
          </div>
          <p
            className="absolute right-[5%] bottom-[7%] font-medium text-white/70"
            style={{ fontSize: "clamp(8px, 1.8vw, 22px)" }}
          >
            {name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.thebigclass.com
          </p>
        </div>
      </div>

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
          {busy ? "Generating…" : hasGenerated ? "Regenerate" : "Generate share card"}
        </Button>
        {currentOgImage && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5"
            >
              <a href={currentOgImage} download={`${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-og.png`}>
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

      <p className={cn("text-[11px]", hasGenerated ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
        {hasGenerated
          ? "✓ Your share card is live. Pasting your portal URL into WhatsApp / Slack / X / LinkedIn now shows this image."
          : "Click Generate to create a 1200×630 PNG from your brand. We'll save it as the default share image for every portal page."}
      </p>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────────

function mixWithWhite(hex: string, ratio: number): string {
  const cleaned = hex.replace(/^#/, "")
  if (cleaned.length !== 6) return hex
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * ratio)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = src
  })
}

// Naive word wrap for canvas text. Splits on spaces, draws line by line.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ")
  let line = ""
  let cursorY = y
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i]
    const w = ctx.measureText(testLine).width
    if (w > maxWidth && line) {
      ctx.fillText(line, x, cursorY)
      line = words[i]
      cursorY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) ctx.fillText(line, x, cursorY)
}
