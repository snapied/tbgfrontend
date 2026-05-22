"use client"

import { useEffect, useState } from "react"
import { TEMPLATE_CANVAS, type CustomTemplate, type Block, type TextBlock, type ShapeBlock, type SignatureBlock, type ImageBlock, type QrBlock, type DecorationBlock } from "@/lib/custom-templates"
import { DecorationSvg } from "./decoration-presets"

export interface FieldValues {
  student_name: string
  course_name: string
  completion_date: string
  instructor_name: string
  organisation_name: string
  certificate_id: string
  grade?: string
}

interface Props {
  template: CustomTemplate
  fields: FieldValues
  // Optional pre-rendered QR data URL. If omitted, the renderer will generate
  // one client-side from the verification URL.
  qrDataUrl?: string
  verificationUrl?: string
  // When true (default), the canvas scales down to fit its parent while
  // preserving the A4 aspect ratio. Set to false in the editor where you
  // want native 1:1 pixels.
  fit?: boolean
  className?: string
}

// Replace {{tokens}} in a string with values from `fields`. Unknown tokens
// are left as-is so the user can see they've typed something invalid.
function interpolate(content: string, fields: FieldValues): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = (fields as unknown as Record<string, string | undefined>)[key]
    return v ?? `{{${key}}}`
  })
}

function renderTextBlock(b: TextBlock, fields: FieldValues) {
  const text = interpolate(b.content, fields)
  if (b.uppercase ? !text.trim() : !text.length) return null
  // The bbox W is enforced (text wraps within it), but H is a *minimum*
  // hint, not a hard clip — if the user picks a font size too big for the
  // chosen H, the text still renders fully and overflows downward. Clipping
  // mid-glyph (the old behaviour) was the worst possible outcome because the
  // designer couldn't see what they'd typed.
  const style: React.CSSProperties = {
    position: "absolute",
    left: b.x, top: b.y, width: b.w,
    // No explicit height — content flows naturally.
    fontFamily: b.fontFamily,
    fontSize: b.fontSize,
    fontWeight: b.fontWeight,
    fontStyle: b.italic ? "italic" : "normal",
    color: b.color,
    textAlign: b.align,
    letterSpacing: b.letterSpacing ? `${b.letterSpacing}em` : undefined,
    lineHeight: b.lineHeight ?? 1.2,
    textTransform: b.uppercase ? "uppercase" : undefined,
    transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
    transformOrigin: "top left",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    zIndex: b.zIndex,
  }
  return <div key={b.id} style={style}>{text}</div>
}

function renderShapeBlock(b: ShapeBlock) {
  const base: React.CSSProperties = {
    position: "absolute",
    left: b.x, top: b.y, width: b.w, height: b.h,
    transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
    transformOrigin: "center center",
    zIndex: b.zIndex,
  }
  if (b.shape === "rect") {
    return (
      <div
        key={b.id}
        style={{
          ...base,
          backgroundColor: b.fill,
          border: b.stroke ? `${b.strokeWidth ?? 1}px solid ${b.stroke}` : undefined,
          borderRadius: b.borderRadius,
        }}
      />
    )
  }
  if (b.shape === "circle") {
    return (
      <div
        key={b.id}
        style={{
          ...base,
          backgroundColor: b.fill,
          border: b.stroke ? `${b.strokeWidth ?? 1}px solid ${b.stroke}` : undefined,
          borderRadius: "50%",
        }}
      />
    )
  }
  // line — render as a 1d rect to avoid SVG complexity
  return (
    <div
      key={b.id}
      style={{
        ...base,
        backgroundColor: b.stroke || b.fill || "#000",
      }}
    />
  )
}

function renderSignatureBlock(b: SignatureBlock, fields: FieldValues) {
  const mode = b.mode ?? 'text'
  const style: React.CSSProperties = {
    position: "absolute",
    left: b.x, top: b.y, width: b.w, height: b.h,
    transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
    transformOrigin: "center center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    color: b.textColor ?? "#0f172a",
    zIndex: b.zIndex,
  }
  const nameText = b.text ? interpolate(b.text, fields) : fields.instructor_name
  return (
    <div key={b.id} style={style}>
      {mode === 'image' && b.imageSrc ? (
        <img
          src={b.imageSrc}
          alt="Signature"
          crossOrigin="anonymous"
          style={{
            maxHeight: "70%", maxWidth: "90%",
            objectFit: "contain",
            marginBottom: 6,
          }}
        />
      ) : (
        <div
          style={{
            fontFamily: b.fontFamily ?? "var(--font-great-vibes), 'Great Vibes', cursive",
            fontSize: b.fontSize ?? 36,
            lineHeight: 1,
            paddingBottom: 6,
            color: b.textColor ?? "#0f172a",
            whiteSpace: "nowrap",
          }}
        >
          {nameText}
        </div>
      )}
      <div
        style={{
          width: "80%", height: 1,
          backgroundColor: b.lineColor ?? "#0f172a",
        }}
      />
      <div style={{ marginTop: 4, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}>
        {b.label || "Instructor"}
      </div>
    </div>
  )
}

function renderDecorationBlock(b: DecorationBlock) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: b.x, top: b.y, width: b.w, height: b.h,
    transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
    transformOrigin: "center center",
    opacity: b.opacity ?? 1,
    zIndex: b.zIndex,
    pointerEvents: "none",
  }
  return (
    <div key={b.id} style={style}>
      <DecorationSvg variant={b.variant} primary={b.primary} accent={b.accent} text={b.text} />
    </div>
  )
}

function renderImageBlock(b: ImageBlock) {
  if (!b.src) {
    // Show a friendly placeholder while the user hasn't uploaded yet,
    // so the bbox is still visible and selectable in the editor.
    return (
      <div
        key={b.id}
        style={{
          position: "absolute",
          left: b.x, top: b.y, width: b.w, height: b.h,
          background: "repeating-linear-gradient(45deg, #f1f5f9 0 8px, #e2e8f0 8px 16px)",
          border: "1px dashed #94a3b8",
          color: "#64748b",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "system-ui, sans-serif", fontSize: 12,
          zIndex: b.zIndex,
        }}
      >
        Image · click to upload
      </div>
    )
  }
  return (
    <img
      key={b.id}
      src={b.src}
      alt=""
      crossOrigin="anonymous"
      style={{
        position: "absolute",
        left: b.x, top: b.y, width: b.w, height: b.h,
        objectFit: b.objectFit ?? "contain",
        opacity: b.opacity ?? 1,
        borderRadius: b.rounded ? "50%" : undefined,
        transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
        transformOrigin: "center center",
        zIndex: b.zIndex,
        pointerEvents: "none",
      }}
    />
  )
}

function QrBlockComponent({ block, qrDataUrl }: { block: QrBlock; qrDataUrl?: string }) {
  // The QR can be supplied by the caller (the PDF pipeline does this so the
  // QR is identical to the verification URL embedded in the cert). When
  // missing — e.g. in the editor preview — render a styled placeholder so
  // the layout is preserved without pulling in a QR generator.
  const padding = block.padding ?? 8
  const centerSize = block.centerSize ?? Math.round(Math.min(block.w, block.h) * 0.18)
  return (
    <div
      style={{
        position: "absolute",
        left: block.x, top: block.y, width: block.w, height: block.h,
        backgroundColor: block.bgColor ?? "#ffffff",
        border: "1px solid #e2e8f0",
        padding,
        zIndex: block.zIndex,
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Verify QR"
            style={{ width: "100%", height: "100%", display: "block" }}
            crossOrigin="anonymous"
          />
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              background:
                "repeating-conic-gradient(#0f172a 0 25%, #ffffff 0 50%)",
              backgroundSize: "12px 12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0f172a", fontFamily: "monospace", fontSize: 10,
            }}
          >
            <span style={{ background: "#fff", padding: "2px 6px" }}>QR</span>
          </div>
        )}
        {block.centerSrc && (
          <img
            src={block.centerSrc}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              width: centerSize, height: centerSize,
              objectFit: "contain",
              background: "#ffffff",
              padding: 2,
              borderRadius: block.centerRounded ? "50%" : 4,
            }}
          />
        )}
      </div>
    </div>
  )
}

function renderBlock(b: Block, fields: FieldValues, qrDataUrl?: string): React.ReactNode {
  switch (b.type) {
    case "text": return renderTextBlock(b, fields)
    case "shape": return renderShapeBlock(b)
    case "signature": return renderSignatureBlock(b, fields)
    case "image": return renderImageBlock(b)
    case "decoration": return renderDecorationBlock(b)
    case "qr": return <QrBlockComponent key={b.id} block={b} qrDataUrl={qrDataUrl} />
  }
}

export function CustomTemplateRenderer({ template, fields, qrDataUrl, verificationUrl, fit = true, className }: Props) {
  // Generate a QR on the fly when the caller didn't supply one — the editor
  // preview uses this so designers see a real QR while laying out. If a QR
  // block in the template specifies a foreground / background colour, we
  // honour them so the auto-generated preview matches the styled QR that
  // will appear in the rendered PDF.
  const qrBlock = template.blocks.find((b): b is QrBlock => b.type === "qr")
  const [autoQr, setAutoQr] = useState<string | undefined>(qrDataUrl)
  useEffect(() => {
    if (qrDataUrl || !verificationUrl) return
    let cancelled = false
    import("qrcode").then(({ default: QRCode }) =>
      // margin: 4 is the standard "quiet zone" QR scanners need. Without
      // it the code reads as garbage. errorCorrectionLevel 'H' tolerates
      // up to ~30% damage, which lets us overlay a centre logo without
      // making the code unreadable.
      QRCode.toDataURL(verificationUrl, {
        margin: 4,
        width: 1200,
        errorCorrectionLevel: 'H',
        color: {
          dark: qrBlock?.fgColor ?? '#000000',
          light: qrBlock?.bgColor ?? '#ffffff',
        },
      }).then((url) => {
        if (!cancelled) setAutoQr(url)
      })
    ).catch(() => undefined)
    return () => { cancelled = true }
  }, [qrDataUrl, verificationUrl, qrBlock?.fgColor, qrBlock?.bgColor])

  const bg = template.background
  const backgroundStyle: React.CSSProperties = (() => {
    if (bg.gradient) {
      const stops = [bg.gradient.from, bg.gradient.via, bg.gradient.to].filter(Boolean).join(", ")
      return { background: `linear-gradient(${bg.gradient.angle ?? 135}deg, ${stops})` }
    }
    if (bg.image) {
      return {
        backgroundColor: bg.color,
        backgroundImage: `url(${bg.image.src})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }
    }
    return { backgroundColor: bg.color }
  })()

  // Wrapping div uses aspect-ratio to scale; the inner canvas is fixed-size
  // and `transform: scale()` would clip nicely but breaks html-to-image text
  // rendering. Instead, when `fit` is true, scale the whole canvas to fit
  // the parent's width and let the height follow via aspect-ratio.
  if (fit) {
    return (
      <div
        className={className}
        style={{
          aspectRatio: `${TEMPLATE_CANVAS.width} / ${TEMPLATE_CANVAS.height}`,
          width: "100%",
          position: "relative",
          overflow: "hidden",
          ...backgroundStyle,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: TEMPLATE_CANVAS.width,
            height: TEMPLATE_CANVAS.height,
            transform: `scale(var(--cert-scale, 1))`,
            transformOrigin: "top left",
          }}
          ref={(node) => {
            if (!node || !node.parentElement) return
            // Set a CSS var on the inner div sized to its parent's width.
            const apply = () => {
              const parent = node.parentElement!
              const s = parent.clientWidth / TEMPLATE_CANVAS.width
              node.style.setProperty("--cert-scale", String(s))
            }
            apply()
            const ro = new ResizeObserver(apply)
            ro.observe(node.parentElement)
          }}
        >
          {template.blocks.map((b) => renderBlock(b, fields, autoQr))}
        </div>
      </div>
    )
  }

  // Native pixel rendering — used by the editor and the PDF snapshot pipeline.
  return (
    <div
      className={className}
      style={{
        width: TEMPLATE_CANVAS.width,
        height: TEMPLATE_CANVAS.height,
        position: "relative",
        overflow: "hidden",
        ...backgroundStyle,
      }}
    >
      {template.blocks.map((b) => renderBlock(b, fields, autoQr))}
    </div>
  )
}
