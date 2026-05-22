"use client"

import Link from "next/link"
import { ArrowRight, Award, Circle, FileText, ImageIcon, Layers, MousePointer2, Palette, PenLine, QrCode, Square, ShieldCheck, Sparkles, Type, Upload } from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

export default function CertificatesFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Certificates · Template Designer"
          title={<>Certificates students <span className="text-primary">actually want</span> to share.</>}
          subtitle="Seventeen ready-made templates and a full designer for your own. Drag text, shapes, signatures, QR codes, your logo — bind any field to a student variable, save it, and bulk-issue 200 certs from a CSV in two minutes."
          heroImage="/images/features/certificates.png"
        />

        <FeatureSplit
          title="Pick a template that looks like your brand, not ours."
          body="Classic. Modern. Achievement. Participation. Corporate. Elegant. Minimal. Botanical. Executive. Midnight. Monogram. Diploma. Wave. Aurora. Vintage. Blueprint. Art-Deco. Neon. Plus the custom designer when none of the seventeen fit."
          bullets={[
            "17 ready-made templates",
            "Or design your own from scratch in the Template Designer (next section)",
            "Print-ready A4 landscape",
            "Auto-fills your logo + brand colours",
          ]}
          mockup={
            <PreviewFrame title="certificate › modern">
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Certificate of Completion
                </p>
                <p className="mt-3 text-center font-serif text-lg font-bold">Aanya Rao</p>
                <p className="mt-1 text-center text-[10px] text-muted-foreground">has successfully completed</p>
                <p className="mt-1 text-center text-[12px] font-semibold">UX Foundations</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-[8px] text-muted-foreground">CERT-A1B2C3D4</span>
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <Palette className="h-3 w-3" /> 17 templates · custom designer
              </div>
            </PreviewFrame>
          }
        />

        {/* The Template Designer — the big one. Replaces a section that used
            to just call this "custom designer" in a one-liner. */}
        <FeatureSplit
          reverse
          title="The Template Designer — your certificate, your way."
          body="A full canvas editor for the days the seventeen templates won't do. Drag text, rectangles, circles, signatures, QR codes, your logo. Bind any text block to a student variable. Pick from 17 fonts categorised by Sans / Serif / Display / Signature / Mono. Save, favourite, duplicate, share across the team."
          bullets={[
            "6 block types — Text, Rectangle, Circle, Signature (text or image), QR code, Image",
            "17 typeface choices — Inter, Playfair, Cinzel, Allura, Great Vibes, Sacramento and more",
            "Bind any field to a variable like {{student_name}} or {{course_title}}",
            "Snippets, decorations, backgrounds — drop in pre-made flourishes",
            "Per-template favourites, duplication, and version stamps",
            "Saves as a custom template usable from the same bulk-issue flow",
          ]}
          mockup={<TemplateDesignerMockup />}
        />

        <TryTheDesignerLive />

        <FeatureSplit
          title="Bulk-issue from CSV in minutes."
          body="Drop a CSV with student names, emails, and course info. We validate the columns, preview a few rows, then issue the entire batch in one go. Every cert gets a unique ID — your students get a downloadable PDF and a public link."
          bullets={[
            "CSV upload with row-level validation",
            "Preview before issuing — no surprises",
            "Unique verification ID per certificate",
            "Batch history with re-download anytime",
          ]}
          mockup={
            <PreviewFrame title="new batch › preview">
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-1.5 font-mono text-[10px]">
                  <Upload className="h-3 w-3" /> ux-cohort-4.csv · 42 rows
                </div>
                <div className="overflow-hidden rounded-md border border-border/60">
                  <div className="grid grid-cols-3 border-b border-border/60 bg-muted/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Name</span><span>Email</span><span>Course</span>
                  </div>
                  {[
                    ["Aanya Rao",   "aanya@ex.com",   "UX Foundations"],
                    ["Karan Bhan",  "karan@ex.com",   "UX Foundations"],
                    ["Sara Tariq",  "sara@ex.com",    "UX Foundations"],
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-3 border-b border-border/60 px-2 py-1 last:border-0 text-[10px]">
                      <span>{row[0]}</span>
                      <span className="font-mono text-muted-foreground">{row[1]}</span>
                      <span className="text-muted-foreground">{row[2]}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full rounded-md bg-primary px-2 py-1.5 text-[10px] font-semibold text-primary-foreground">
                  Issue 42 certificates
                </button>
              </div>
            </PreviewFrame>
          }
        />

        <FeatureSplit
          reverse
          title="Verification anyone can do, no login."
          body="Every certificate links to a public /verify page. Recruiters, parents, hiring panels — they punch in the ID and see the cert's status, course, student, and issue date. No platform account needed."
          bullets={[
            "Public verification by certificate ID",
            "Shows status (Active / Revoked) + metadata",
            "Revoke from your dashboard anytime",
            "No login wall for verifiers",
          ]}
          mockup={
            <PreviewFrame title="thebigclass.com/verify">
              <div className="space-y-2 text-[11px]">
                <div className="rounded-md border border-border bg-muted/20 p-2 font-mono text-[10px]">
                  CERT-A1B2C3D4
                </div>
                <div className="space-y-1 rounded-md border border-success/30 bg-success/5 p-3">
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-success">
                    <ShieldCheck className="h-3.5 w-3.5" /> Valid certificate
                  </p>
                  <p className="font-semibold">Aanya Rao</p>
                  <p className="text-[10px] text-muted-foreground">UX Foundations · Issued May 14, 2026 · by Studio Cohort</p>
                </div>
                <p className="inline-flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <FileText className="h-3 w-3" /> Download the original PDF
                </p>
              </div>
            </PreviewFrame>
          }
        />

        <FeatureCTA />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// "Try it live" — full-bleed strip that drops the prospect into the
// real editor at /template-designer (no signup required).
// ============================================================

function TryTheDesignerLive() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] via-card to-accent/[0.08] p-8 sm:p-10">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
                <Sparkles className="h-3 w-3" /> No signup · saves to your browser
              </div>
              <h3 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Don&apos;t take our word for it — <span className="text-primary">try the editor right now</span>.
              </h3>
              <p className="mt-3 text-muted-foreground">
                We embedded the actual Template Designer on a public page. Drag the blocks. Pick a font. Bind a variable. See it render at A4. Two minutes of play beats any screenshot.
              </p>

              <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/template-designer">
                    <MousePointer2 className="h-4 w-4" /> Open the live editor
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/signup">
                    Create my workspace <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Mini preview to suggest what awaits */}
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl opacity-60" />
              <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-2 font-mono text-[9px] text-muted-foreground">thebigclass.com/template-designer</span>
                </div>
                <div className="grid grid-cols-[40px_1fr]">
                  <div className="space-y-1.5 border-r border-border/60 bg-muted/20 p-1.5">
                    {[Type, Square, Circle, PenLine, QrCode, ImageIcon].map((Icon, i) => (
                      <div key={i} className="flex h-6 w-6 items-center justify-center rounded-md bg-card text-muted-foreground hover:bg-muted">
                        <Icon className="h-3 w-3" />
                      </div>
                    ))}
                  </div>
                  <div className="p-3">
                    <div className="relative aspect-[1.414/1] w-full rounded border border-border bg-card">
                      <div className="absolute inset-2 rounded border border-amber-400/40" />
                      <p className="absolute left-1/2 top-[18%] -translate-x-1/2 font-serif text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        Certificate
                      </p>
                      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 ring-1 ring-primary px-2 py-0.5">
                        <p className="font-serif text-base font-bold leading-none">Aanya Rao</p>
                        <span className="absolute -top-3 left-0 rounded-sm bg-primary px-1 font-mono text-[6px] font-bold text-primary-foreground">
                          {`{{student_name}}`}
                        </span>
                      </div>
                      <Award className="absolute bottom-2 right-2 h-3 w-3 text-amber-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Template Designer mockup — looks like the real editor: left
// toolbox with block types, a canvas with a faux selection, and a
// right inspector with font picker + variable binding.
// ============================================================

function TemplateDesignerMockup() {
  const tools = [
    { icon: Type,       label: "Text" },
    { icon: Square,     label: "Rect" },
    { icon: Circle,     label: "Circle" },
    { icon: PenLine,    label: "Signature" },
    { icon: QrCode,     label: "QR" },
    { icon: ImageIcon,  label: "Image" },
  ]
  const variables = [
    "{{student_name}}", "{{course_title}}", "{{completion_date}}",
    "{{certificate_id}}", "{{instructor_name}}", "{{grade}}",
  ]
  const fontPicker = [
    { family: "Sans",      sample: "Inter",       cls: "font-sans" },
    { family: "Serif",     sample: "Playfair",    cls: "font-serif" },
    { family: "Display",   sample: "Cinzel",      cls: "font-cinzel" },
    { family: "Signature", sample: "Great Vibes", cls: "font-great-vibes" },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-md">
      {/* App chrome */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-rose-400/70" />
        <span className="h-2 w-2 rounded-full bg-amber-400/70" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
        <span className="ml-2 truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          templates › new › untitled certificate
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success">
          <Sparkles className="h-2.5 w-2.5" /> Saved
        </span>
      </div>

      <div className="grid grid-cols-[48px_1fr_120px]">
        {/* Toolbox */}
        <aside className="space-y-1 border-r border-border/60 bg-muted/20 p-1.5">
          {tools.map((t) => (
            <div
              key={t.label}
              className="group flex flex-col items-center gap-0.5 rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              title={t.label}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="text-[8px]">{t.label}</span>
            </div>
          ))}
        </aside>

        {/* Canvas */}
        <div className="relative bg-gradient-to-br from-muted/30 via-background to-muted/20 p-3">
          {/* A4 landscape canvas */}
          <div className="relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded border border-border bg-card shadow-inner">
            {/* Decorative border */}
            <div className="absolute inset-2 rounded border border-amber-400/40" />
            <div className="absolute inset-3 rounded border border-amber-400/20" />

            {/* Top text block */}
            <p className="absolute left-1/2 top-[18%] -translate-x-1/2 font-serif text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Certificate of Completion
            </p>

            {/* Selected name block with handles */}
            <div className="absolute left-1/2 top-[38%] -translate-x-1/2">
              <div className="relative inline-block px-2 py-0.5 ring-1 ring-primary">
                <p className="font-serif text-[18px] font-bold leading-none">Aanya Rao</p>
                {/* Selection handles */}
                {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((pos) => (
                  <span
                    key={pos}
                    className={`absolute ${pos} h-1.5 w-1.5 rounded-sm border border-primary bg-card`}
                  />
                ))}
                {/* Field-binding chip */}
                <span className="absolute -top-4 left-0 inline-flex items-center gap-1 rounded-sm bg-primary px-1 py-0.5 font-mono text-[7px] font-bold text-primary-foreground">
                  <Layers className="h-2 w-2" /> {`{{student_name}}`}
                </span>
              </div>
            </div>

            <p className="absolute left-1/2 top-[52%] -translate-x-1/2 text-[8px] text-muted-foreground">
              has successfully completed
            </p>
            <p className="absolute left-1/2 top-[60%] -translate-x-1/2 text-[10px] font-semibold">
              UX Foundations
            </p>

            {/* Signature block bottom-left */}
            <div className="absolute bottom-3 left-4">
              <p className="font-great-vibes text-base text-foreground/80">Maya R.</p>
              <span className="block border-t border-border" />
              <p className="font-mono text-[7px] uppercase tracking-wide text-muted-foreground">Signing Authority</p>
            </div>

            {/* QR + seal bottom-right */}
            <div className="absolute bottom-3 right-4 flex items-center gap-2">
              {/* Faux QR */}
              <div
                className="grid h-7 w-7 grid-cols-5 grid-rows-5 gap-px rounded-sm bg-foreground p-0.5"
                aria-hidden
              >
                {Array.from({ length: 25 }).map((_, i) => (
                  <span
                    key={i}
                    className={`${(i * 7) % 3 === 0 ? "bg-card" : "bg-foreground"}`}
                  />
                ))}
              </div>
              {/* Gold seal circle */}
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-amber-950 ring-2 ring-amber-200/30">
                <Award className="h-3 w-3" />
              </div>
            </div>

            {/* Cert-id stamp */}
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[7px] text-muted-foreground">
              CERT-A1B2C3D4
            </span>
          </div>

          {/* Canvas toolbar pill */}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">A4 · landscape</span>
            <span>·</span>
            <span>100%</span>
          </div>
        </div>

        {/* Right inspector */}
        <aside className="space-y-2 border-l border-border/60 bg-muted/10 p-2 text-[10px]">
          <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Selected · Text</p>

          <div>
            <p className="mb-0.5 text-[8px] font-medium uppercase tracking-wide text-muted-foreground">Font</p>
            <div className="space-y-0.5">
              {fontPicker.map((f) => (
                <div
                  key={f.family}
                  className={`flex items-center justify-between rounded px-1.5 py-1 ${
                    f.family === "Serif" ? "border border-primary bg-primary/5" : "border border-transparent"
                  }`}
                >
                  <span className="text-[8px] text-muted-foreground">{f.family}</span>
                  <span className={`text-[10px] ${f.cls}`}>{f.sample}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-0.5 text-[8px] font-medium uppercase tracking-wide text-muted-foreground">Bind to</p>
            <div className="flex flex-wrap gap-1">
              {variables.slice(0, 4).map((v, i) => (
                <span
                  key={v}
                  className={`rounded px-1 py-0.5 font-mono text-[7px] ${
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {v.replace(/[{}]/g, "")}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <NumPill label="X" value="50%" />
            <NumPill label="Y" value="38%" />
            <NumPill label="Size" value="18" />
            <NumPill label="Wght" value="700" />
          </div>
        </aside>
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[9px] text-muted-foreground">
        <span>6 blocks · 17 fonts available</span>
        <span className="font-mono">⌘S saves</span>
      </div>
    </div>
  )
}

function NumPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-card px-1.5 py-0.5">
      <p className="text-[7px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-[9px] font-semibold">{value}</p>
    </div>
  )
}
