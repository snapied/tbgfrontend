"use client"

import { Award, Star, CheckCircle, Leaf, Square, Building2, Sparkles, Scroll, Stamp, Ruler, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export type TemplateType =
  | "classic"
  | "modern"
  | "achievement"
  | "participation"
  | "corporate"
  | "elegant"
  | "minimal"
  | "botanical"
  | "executive"
  | "midnight"
  | "monogram"
  | "diploma"
  | "wave"
  | "aurora"
  | "vintage"
  | "blueprint"
  | "artdeco"
  | "neon"

interface CertificatePreviewProps {
  template: TemplateType
  name?: string
  course?: string
  date?: string
  className?: string
  scale?: "sm" | "md" | "lg"
}

export function CertificatePreview({
  template,
  name = "John Smith",
  course = "Advanced Web Development",
  date = "May 15, 2026",
  className,
  scale = "md",
}: CertificatePreviewProps) {
  const scaleClasses = {
    sm: "text-[6px]",
    md: "text-[8px]",
    lg: "text-[10px]",
  }

  return (
    <div
      className={cn(
        "aspect-[1.414/1] w-full overflow-hidden",
        scaleClasses[scale],
        className
      )}
    >
      {template === "classic" && (
        <div
          className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 p-[1em]"
          style={{ border: "0.4em double #b8860b" }}
        >
          <div className="flex items-center gap-[0.5em] text-amber-700">
            <div className="h-[0.5em] w-[3em] bg-amber-600" />
            <Award className="h-[2em] w-[2em]" strokeWidth={1.5} />
            <div className="h-[0.5em] w-[3em] bg-amber-600" />
          </div>
          <h1 className="mt-[0.8em] font-serif text-[2em] font-bold tracking-wide text-slate-800">
            Certificate of Completion
          </h1>
          <p className="mt-[0.5em] text-[1em] text-slate-600">This is to certify that</p>
          <p className="mt-[0.5em] font-serif text-[1.8em] font-semibold text-slate-900">{name}</p>
          <p className="mt-[0.5em] text-[1em] text-slate-600">has successfully completed</p>
          <p className="mt-[0.3em] text-[1.2em] font-medium text-slate-800">{course}</p>
          <p className="mt-[0.8em] text-[0.9em] text-slate-500">{date}</p>
        </div>
      )}

      {template === "modern" && (
        <div className="flex h-full w-full bg-white">
          <div className="w-[0.5em] bg-blue-600" />
          <div className="flex flex-1 flex-col justify-center p-[1.5em]">
            <span className="text-[0.8em] font-medium uppercase tracking-[0.2em] text-blue-600">
              Certificate
            </span>
            <h1 className="mt-[0.5em] text-[1.8em] font-light text-slate-900">
              Certificate of <span className="font-bold text-blue-600">Completion</span>
            </h1>
            <p className="mt-[1em] text-[0.9em] text-slate-500">Awarded to</p>
            <p className="text-[1.5em] font-semibold text-slate-800">{name}</p>
            <p className="mt-[0.6em] text-[0.9em] text-slate-500">
              for successfully completing <span className="font-semibold text-slate-800">{course}</span>
            </p>
            <p className="mt-[0.4em] text-[0.8em] text-slate-400">{date}</p>
          </div>
        </div>
      )}

      {template === "achievement" && (
        <div className="flex h-full w-full flex-col bg-white">
          <div
            className="flex h-[40%] w-full flex-col items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #f59e0b 100%)",
            }}
          >
            <span className="text-[0.8em] uppercase tracking-[0.3em] text-white/90">
              The Big Class
            </span>
            <h1 className="mt-[0.3em] font-serif text-[2em] font-black tracking-wide text-white">
              Certificate of Achievement
            </h1>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center p-[1em] text-center">
            <Star className="h-[1.5em] w-[1.5em] fill-amber-500 text-amber-500" />
            <p className="mt-[0.3em] text-[0.8em] uppercase tracking-[0.25em] text-purple-700">
              Presented to
            </p>
            <p className="mt-[0.2em] font-serif text-[1.8em] font-black text-slate-900">{name}</p>
            <p className="mt-[0.3em] text-[0.9em] text-slate-500">
              for outstanding work in <span className="font-bold text-purple-700">{course}</span>
            </p>
          </div>
        </div>
      )}

      {template === "participation" && (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-[0.8em] bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 p-[1em]">
          <div className="rounded-full bg-purple-100 p-[0.4em]">
            <CheckCircle className="h-[1.4em] w-[1.4em] text-purple-600" />
          </div>
          <h1 className="mt-[0.5em] text-[1.5em] font-extrabold text-purple-800">
            Certificate of Participation
          </h1>
          <p className="mt-[0.3em] text-[0.9em] italic text-purple-500">
            awarded with appreciation to
          </p>
          <p className="mt-[0.3em] text-[1.4em] font-extrabold text-purple-700">{name}</p>
          <p className="mt-[0.3em] text-[0.9em] text-slate-600">for joining {course}</p>
          <p className="mt-[0.3em] text-[0.8em] text-slate-400">{date}</p>
        </div>
      )}

      {template === "corporate" && (
        <div className="flex h-full w-full bg-white">
          <div
            className="flex w-[30%] flex-col p-[1em] text-white"
            style={{ background: "linear-gradient(160deg, #0b1f3a, #1e4669)" }}
          >
            <p className="font-serif text-[1em] font-bold tracking-[0.2em] text-amber-300">
              VIDYANXT
            </p>
            <div className="mt-[0.4em] h-[0.15em] w-[1.4em] bg-amber-300" />
            <p className="mt-[1.2em] text-[0.65em] uppercase tracking-[0.25em] text-slate-300">
              Certificate ID
            </p>
            <p className="font-mono text-[0.75em] text-amber-300">CRT-2026</p>
            <div className="mt-auto h-[2em] w-[2em] rounded bg-white" />
          </div>
          <div className="flex flex-1 flex-col p-[1.4em]">
            <p className="text-[0.7em] font-bold uppercase tracking-[0.3em] text-amber-600">
              Professional Certification
            </p>
            <h1 className="mt-[0.4em] font-serif text-[1.8em] font-bold leading-tight text-slate-900">
              Certificate of Completion
            </h1>
            <p className="mt-[0.4em] text-[0.7em] leading-relaxed text-slate-500">
              This document formally certifies the successful completion of the programme.
            </p>
            <p className="mt-[1em] text-[0.65em] uppercase tracking-[0.25em] text-slate-500">
              Awarded to
            </p>
            <p className="font-serif text-[1.4em] font-bold text-slate-900">{name}</p>
            <div className="mt-[0.6em] border-l-[0.25em] border-amber-500 bg-slate-50 p-[0.5em]">
              <p className="text-[0.6em] uppercase tracking-[0.2em] text-slate-500">Programme</p>
              <p className="font-serif text-[0.85em] font-bold text-slate-900">{course}</p>
            </div>
          </div>
        </div>
      )}

      {template === "elegant" && (
        <div
          className="relative flex h-full w-full flex-col items-center justify-center p-[1em]"
          style={{ background: "radial-gradient(circle at 50% 40%, #1a1a23, #0a0a0f)" }}
        >
          <div
            className="absolute inset-[0.6em] border"
            style={{ borderColor: "#d4af37" }}
          />
          <Sparkles className="h-[1.2em] w-[1.2em] text-amber-300" />
          <p className="mt-[0.3em] text-[0.7em] tracking-[0.4em] text-amber-300">
            VIDYANXT ACADEMY
          </p>
          <div className="my-[0.5em] flex items-center gap-[0.3em]">
            <div className="h-[0.05em] w-[2em] bg-amber-300" />
            <Square className="h-[0.4em] w-[0.4em] rotate-45 fill-amber-300 text-amber-300" />
            <div className="h-[0.05em] w-[2em] bg-amber-300" />
          </div>
          <h1 className="font-serif text-[1.8em] italic text-amber-100">Certificate of</h1>
          <p className="font-serif text-[1.4em] font-bold tracking-[0.15em] text-amber-300">
            DISTINCTION
          </p>
          <p className="mt-[0.6em] text-[0.7em] tracking-[0.3em] text-amber-200/60">PRESENTED TO</p>
          <p className="mt-[0.2em] font-serif text-[1.6em] font-semibold text-amber-100">{name}</p>
        </div>
      )}

      {template === "minimal" && (
        <div className="flex h-full w-full flex-col bg-stone-50 p-[1.2em]">
          <div className="flex items-baseline justify-between border-b border-black/80 pb-[0.3em]">
            <p className="text-[0.8em] font-bold uppercase tracking-[0.4em] text-black">
              VIDYANXT
            </p>
            <p className="font-mono text-[0.65em] text-slate-500">CERT-2026-ABCD</p>
          </div>
          <p className="mt-[0.8em] font-mono text-[0.65em] text-slate-500">— 01</p>
          <h1 className="mt-[0.2em] text-[1.4em] font-light leading-tight text-black">
            Certificate of <span className="font-bold">Completion</span>
          </h1>
          <p className="mt-[1em] font-mono text-[0.65em] text-slate-500">— 02</p>
          <p className="text-[3em] font-extrabold leading-none tracking-tight text-black">
            {name.split(" ")[0]}
          </p>
          <div className="mt-auto flex items-end justify-between border-t border-black/80 pt-[0.5em]">
            <div>
              <p className="font-mono text-[0.55em] uppercase tracking-[0.2em] text-slate-500">
                Issued
              </p>
              <p className="text-[0.8em] font-bold text-black">{date}</p>
            </div>
            <div className="h-[1.6em] w-[1.6em] bg-black" />
          </div>
        </div>
      )}

      {template === "botanical" && (
        <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#f7f3ea] p-[1em] text-center">
          <Leaf className="absolute left-[0.3em] top-[0.3em] h-[1.4em] w-[1.4em] -rotate-12 text-emerald-600/70" />
          <Leaf className="absolute right-[0.3em] top-[0.5em] h-[1em] w-[1em] rotate-45 text-emerald-700/60" />
          <Leaf className="absolute bottom-[0.3em] left-[0.5em] h-[1em] w-[1em] rotate-180 text-emerald-600/70" />
          <Leaf className="absolute bottom-[0.4em] right-[0.3em] h-[1.4em] w-[1.4em] rotate-[200deg] text-emerald-700/70" />
          <div className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded-full border border-emerald-700/60">
            <Leaf className="h-[1em] w-[1em] text-emerald-700" />
          </div>
          <p className="mt-[0.4em] text-[0.7em] tracking-[0.35em] text-emerald-700">
            VIDYANXT ACADEMY
          </p>
          <h1 className="mt-[0.3em] font-serif text-[1.7em] font-black leading-tight text-emerald-900">
            Certificate of Completion
          </h1>
          <p className="mt-[0.2em] text-[0.8em] italic text-amber-800">
            awarded with appreciation
          </p>
          <p className="mt-[0.6em] text-[0.7em] tracking-[0.3em] text-amber-800">PRESENTED TO</p>
          <p className="mt-[0.2em] font-serif text-[1.6em] font-bold text-emerald-900">{name}</p>
        </div>
      )}

      {template === "executive" && (
        <div className="flex h-full w-full bg-[#f4ede0]">
          <div
            className="flex w-1/2 flex-col p-[1em] text-[#f4ede0]"
            style={{ background: "linear-gradient(170deg, #053024, #0d4536)" }}
          >
            <div className="flex items-center gap-[0.3em]">
              <div className="flex h-[1.1em] w-[1.1em] items-center justify-center border border-amber-300 font-serif text-[0.9em] font-bold text-amber-300">V</div>
              <p className="font-serif text-[0.9em] font-semibold tracking-[0.18em]">VIDYANXT</p>
            </div>
            <p className="mt-[1em] text-[0.65em] tracking-[0.4em] text-amber-300">EXECUTIVE CERTIFICATION</p>
            <h1 className="mt-[0.3em] font-serif text-[2em] font-semibold leading-[0.95]">
              Certificate<br />of <em className="italic font-medium text-amber-300">Completion</em>
            </h1>
            <div className="mt-auto h-[0.2em] w-[1.6em] bg-amber-300" />
            <p className="mt-[0.3em] font-serif text-[0.75em] italic text-amber-100/70">Issued {date}</p>
          </div>
          <div className="flex w-1/2 flex-col p-[1em]">
            <p className="text-[0.65em] tracking-[0.35em] text-emerald-900/60">CONFERRED UPON</p>
            <p className="mt-[0.2em] font-serif text-[1.8em] font-bold leading-none text-emerald-950">{name}</p>
            <div className="mt-[0.4em] h-[0.15em] w-[1.6em] bg-emerald-950" />
            <p className="mt-[0.5em] text-[0.8em] leading-snug text-emerald-900/80">
              upon completion of <span className="font-serif font-bold italic text-emerald-950">{course}</span>
            </p>
            <div className="mt-auto">
              <p className="font-serif text-[0.9em] font-bold text-emerald-950">Demo User</p>
              <div className="my-[0.2em] h-px w-full bg-emerald-950" />
              <p className="text-[0.55em] tracking-[0.2em] text-emerald-900/60">PROGRAMME DIRECTOR</p>
            </div>
          </div>
        </div>
      )}

      {template === "midnight" && (
        <div
          className="relative flex h-full w-full flex-col p-[0.8em] text-blue-50"
          style={{ background: "radial-gradient(circle at 18% 22%, rgba(56,132,255,0.22), transparent 45%), radial-gradient(circle at 82% 78%, rgba(168,85,247,0.18), transparent 50%), #060a1a" }}
        >
          <div className="absolute inset-[0.5em] border border-blue-400/25" />
          <div className="absolute left-[0.4em] top-[0.4em] h-[0.8em] w-[0.8em] border-l-2 border-t-2 border-[#3884ff]" />
          <div className="absolute bottom-[0.4em] right-[0.4em] h-[0.8em] w-[0.8em] border-b-2 border-r-2 border-[#a855f7]" />
          <div className="z-10 flex items-center gap-[0.3em]">
            <div className="h-[0.4em] w-[0.4em] rounded-full" style={{ background: "linear-gradient(135deg,#3884ff,#a855f7)" }} />
            <p className="text-[0.7em] tracking-[0.3em] font-semibold text-blue-50">VIDYANXT</p>
          </div>
          <p className="z-10 mt-[0.6em] font-mono text-[0.55em] tracking-[0.2em] text-blue-300">CERTIFICATE / 2026</p>
          <h1 className="z-10 mt-[0.2em] text-[2em] font-bold leading-none">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">Certificate of</span>
            <br />
            <span className="bg-gradient-to-r from-[#3884ff] to-[#a855f7] bg-clip-text text-transparent">Completion</span>
          </h1>
          <p className="z-10 mt-[0.6em] font-mono text-[0.55em] tracking-[0.2em] text-blue-300">RECIPIENT —</p>
          <p className="z-10 mt-[0.1em] border-b border-blue-400/30 pb-[0.2em] text-[1.4em] font-bold text-white">{name}</p>
          <p className="z-10 mt-[0.3em] text-[0.7em]">
            <span className="text-blue-100">Programme: </span>
            <span className="font-semibold text-[#3884ff]">{course}</span>
          </p>
        </div>
      )}

      {template === "monogram" && (
        <div className="relative h-full w-full overflow-hidden bg-[#faf7f2]">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMinYMid meet"
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-[55%]"
            aria-hidden
          >
            <text
              x="-2"
              y="92"
              fontFamily="Georgia, serif"
              fontSize="110"
              fontWeight="900"
              fill="#b8390f"
              letterSpacing="-4"
            >
              V
            </text>
          </svg>
          <div className="relative z-10 flex h-full flex-col p-[1em]">
            <div className="flex items-baseline justify-between border-b border-black/80 pb-[0.2em]">
              <div className="flex items-center gap-[0.3em]">
                <div className="h-[0.4em] w-[0.4em] rounded-full bg-[#b8390f]" />
                <p className="font-serif text-[0.8em] font-bold tracking-[0.1em] text-black">VIDYANXT</p>
              </div>
              <p className="font-serif text-[0.6em] italic text-stone-500">Vol. 26</p>
            </div>
            <div className="ml-[42%] mt-auto border-l border-stone-300 pl-[0.6em]">
              <p className="text-[0.55em] tracking-[0.3em] font-bold text-[#b8390f]">RECIPIENT</p>
              <p className="mt-[0.1em] font-serif text-[1.4em] font-black leading-none text-black">{name}</p>
              <p className="mt-[0.3em] text-[0.6em] leading-snug text-stone-700">
                for <span className="font-serif italic font-bold text-[#b8390f]">{course}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {template === "diploma" && (
        <div className="relative flex h-full w-full flex-col items-center bg-[#fbf5e7] p-[0.8em] text-center">
          <div className="pointer-events-none absolute inset-[0.3em] border-2 border-[#a8874b]" />
          <div className="pointer-events-none absolute inset-[0.5em] border border-[#a8874b]" />
          <div className="relative z-10 mt-[0.4em] flex h-[1.4em] w-[1.4em] items-center justify-center rounded-full border border-[#6b4f1d]">
            <Scroll className="h-[0.9em] w-[0.9em] text-[#6b4f1d]" />
          </div>
          <p className="relative z-10 mt-[0.2em] text-[0.7em] font-bold tracking-[0.3em] text-[#6b4f1d]">VIDYANXT ACADEMY</p>
          <p className="relative z-10 mt-[0.1em] text-[0.55em] tracking-[0.3em] text-amber-800/80">— FOUNDED IN PURSUIT OF KNOWLEDGE —</p>
          <p className="relative z-10 mt-[0.2em] text-[0.7em] tracking-[0.4em] text-[#a8874b]">❦ ❦ ❦</p>
          <h1 className="relative z-10 mt-[0.2em] font-serif text-[1.6em] font-bold text-[#28201a]">
            <em className="italic font-medium text-[#6b4f1d]">Diploma</em> of Completion
          </h1>
          <p className="relative z-10 mt-[0.1em] text-[0.65em] italic text-amber-900/80">Be it known to all who shall read these presents that</p>
          <p className="relative z-10 mt-[0.2em] border-b border-[#a8874b] pb-[0.15em] font-serif text-[1.5em] font-medium italic text-[#28201a]">{name}</p>
        </div>
      )}

      {template === "wave" && (
        <div className="flex h-full w-full flex-col bg-white">
          <div
            className="relative flex h-[40%] flex-col justify-between p-[0.8em] text-white"
            style={{ background: "linear-gradient(90deg, #6366f1 0%, #7c3aed 55%, #06b6d4 100%)" }}
          >
            <div className="absolute -bottom-[0.2em] left-0 right-0 h-[1em]" style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.15))" }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[0.3em]">
                <div className="flex h-[1em] w-[1em] items-center justify-center rounded-[0.3em] border border-white/60 bg-white/15 font-bold">V</div>
                <p className="text-[0.7em] font-bold tracking-[0.18em]">VIDYANXT</p>
              </div>
              <p className="text-[0.55em] tracking-[0.25em] opacity-90">PROGRAMME CERTIFICATE</p>
            </div>
            <h1 className="text-[1.7em] font-extrabold leading-none">Certificate of Completion</h1>
          </div>
          <div className="-mt-[0.8em] mx-[0.6em] flex-1 rounded-[0.6em] border border-indigo-100 bg-white p-[0.8em] shadow-sm">
            <p className="text-[0.6em] font-bold tracking-[0.3em] text-indigo-600">AWARDED TO</p>
            <p className="mt-[0.1em] text-[1.4em] font-bold leading-tight text-slate-900">{name}</p>
            <p className="mt-[0.3em] text-[0.65em] text-slate-500">
              for <span className="font-bold text-slate-800">{course}</span>
            </p>
            <div className="mt-[0.4em] flex flex-wrap gap-[0.3em]">
              <span className="rounded-full bg-indigo-50 px-[0.5em] py-[0.1em] text-[0.55em] font-semibold text-indigo-700">● Programme complete</span>
              <span className="rounded-full bg-cyan-50 px-[0.5em] py-[0.1em] text-[0.55em] font-semibold text-cyan-700">● {date}</span>
            </div>
          </div>
        </div>
      )}

      {template === "aurora" && (
        <div
          className="relative flex h-full w-full flex-col items-center justify-center p-[0.8em] text-center"
          style={{
            background:
              "radial-gradient(circle at 10% 15%, #ff7eb3 0%, transparent 38%), radial-gradient(circle at 90% 15%, #ffb87a 0%, transparent 36%), radial-gradient(circle at 90% 85%, #7c5cff 0%, transparent 42%), radial-gradient(circle at 10% 85%, #2dd4bf 0%, transparent 38%), linear-gradient(135deg, #fff0fb, #efe7ff)",
          }}
        >
          <div className="absolute inset-[0.5em] rounded-[0.6em] border border-white/85 bg-white/55 backdrop-blur-md" />
          <div className="relative flex flex-col items-center gap-[0.2em] text-center">
            <div className="flex items-center gap-[0.3em]">
              <div
                className="h-[0.4em] w-[0.4em] rounded-full"
                style={{ background: "conic-gradient(from 0deg, #ff7eb3, #7c5cff, #2dd4bf, #ffb87a, #ff7eb3)" }}
              />
              <p className="text-[0.55em] tracking-[0.35em] font-semibold text-[#4a3a8a]">VIDYANXT</p>
            </div>
            <p className="mt-[0.4em] text-[0.55em] tracking-[0.4em] font-semibold text-[#7c5cff]">PROGRAMME CERTIFICATE</p>
            <h1 className="font-serif text-[1.8em] font-normal leading-none text-[#1a1a2e]">
              Certificate of{" "}
              <em
                className="italic"
                style={{
                  background: "linear-gradient(120deg,#ff7eb3,#7c5cff,#2dd4bf)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Completion
              </em>
            </h1>
            <p className="mt-[0.5em] text-[0.55em] tracking-[0.35em] font-semibold text-[#6b5a9a]">AWARDED TO</p>
            <p className="font-serif text-[1.5em] leading-none text-[#1a1a2e]">{name}</p>
            <div className="my-[0.2em] h-px w-[3em] bg-gradient-to-r from-transparent via-[#7c5cff] to-transparent" />
            <p className="text-[0.6em] text-[#3a3a5a]">
              for completing <span className="font-serif italic text-[#7c5cff]">{course}</span>
            </p>
          </div>
        </div>
      )}

      {template === "vintage" && (
        <div className="relative h-full w-full bg-[#f0e3c8] text-center">
          <div className="pointer-events-none absolute inset-[0.4em] border border-[#65422180]" />
          <div className="pointer-events-none absolute inset-[0.6em] border-[3px] border-double border-[#6b4423]" />
          <div className="absolute left-1/2 top-[0.3em] h-[0.6em] w-[0.6em] -translate-x-1/2 rounded-full border-2 border-[#6b4423] bg-[#f0e3c8]" />
          <div className="absolute bottom-[0.3em] left-1/2 h-[0.6em] w-[0.6em] -translate-x-1/2 rounded-full border-2 border-[#6b4423] bg-[#f0e3c8]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-[1em]">
            <p className="text-[0.5em] tracking-[0.4em] text-[#6b4423]">— EST. MMXXVI —</p>
            <p className="mt-[0.2em] font-serif text-[0.75em] font-bold tracking-[0.3em] text-[#3a2818]">{`The Big Class`.toUpperCase()}</p>
            <p className="mt-[0.2em] text-[0.7em] tracking-[0.4em] text-[#8b5a2b]">❦ ❦ ❦</p>
            <h1 className="mt-[0.2em] font-serif text-[1.7em] italic font-normal text-[#3a2818] leading-none">
              Certificate of Honour
            </h1>
            <p className="mt-[0.3em] text-[0.55em] italic text-[#6b4423]">
              Let it be known that
            </p>
            <p
              className="mt-[0.2em] font-serif text-[1.5em] text-[#3a2818] underline decoration-[#8b5a2b]"
              style={{ textUnderlineOffset: "0.15em" }}
            >
              {name}
            </p>
            <div className="mt-[0.5em] inline-block bg-[#b91c1c] px-[0.5em] py-[0.1em] text-[0.55em] font-bold tracking-[0.2em] text-[#f0e3c8]">
              HONORIS CAUSA
            </div>
          </div>
          <div className="absolute bottom-[0.4em] right-[0.4em] flex h-[1.4em] w-[1.4em] items-center justify-center rounded-full border border-[#b91c1c] text-[#b91c1c]">
            <Stamp className="h-[0.9em] w-[0.9em]" />
          </div>
        </div>
      )}

      {template === "blueprint" && (
        <div
          className="relative h-full w-full overflow-hidden p-[0.6em] text-[#e2f0ff]"
          style={{ background: "radial-gradient(ellipse at center, #173a6e 0%, #0a1e3d 80%)" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(160,200,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(160,200,255,0.18) 1px, transparent 1px)",
              backgroundSize: "1.4em 1.4em",
            }}
          />
          <div className="absolute inset-[0.4em] border border-[#6ea7e8]" />
          <div className="absolute left-[0.4em] top-[0.4em] h-[0.6em] w-[0.6em] border-l-2 border-t-2 border-[#6ea7e8]" />
          <div className="absolute bottom-[0.4em] right-[0.4em] h-[0.6em] w-[0.6em] border-b-2 border-r-2 border-[#6ea7e8]" />
          <div className="relative flex h-full flex-col items-center justify-center p-[0.4em] text-center">
            <p className="font-mono text-[0.5em] tracking-[0.3em] text-[#a0c8ff]">SHEET 01 / 01 · VIDYANXT</p>
            <h1 className="mt-[0.4em] text-[1.7em] font-black uppercase leading-none text-white">
              Certificate of <span className="text-[#ffd166]">Mastery</span>
            </h1>
            <div className="mt-[0.3em] flex w-full items-center gap-[0.2em] text-[0.4em] text-[#6ea7e8]">
              <span>▸</span>
              <div className="h-px flex-1 bg-[#6ea7e8]" />
              <span className="whitespace-nowrap font-mono">A4 LANDSCAPE 297×210</span>
              <div className="h-px flex-1 bg-[#6ea7e8]" />
              <span>◂</span>
            </div>
            <p className="mt-[0.4em] font-mono text-[0.55em] tracking-[0.4em] text-[#6ea7e8]">ISSUED TO</p>
            <p className="text-[1.2em] font-bold leading-none text-white">{name}</p>
            <p className="mt-[0.3em] text-[0.55em] text-[#c8dcf5]">
              completed <span className="font-bold text-[#ffd166]">{course}</span>
            </p>
          </div>
        </div>
      )}

      {template === "artdeco" && (
        <div
          className="relative h-full w-full overflow-hidden text-center text-[#f5e6b3]"
          style={{ background: "radial-gradient(ellipse at center, #16110a 0%, #050302 70%)" }}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(212,175,55,0.06) 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, rgba(212,175,55,0.04) 0 1px, transparent 1px 18px)",
            }}
          />
          <div className="pointer-events-none absolute inset-[0.4em] border-[1.5px] border-[#d4af37]" />
          <div className="pointer-events-none absolute inset-[0.6em] border border-[#d4af37]/50" />
          <div className="relative flex h-full flex-col items-center justify-center p-[0.8em]">
            <p className="text-[0.5em] tracking-[0.5em] text-[#d4af37]">— ANNO MMXXVI —</p>
            <p className="mt-[0.1em] font-serif text-[0.7em] font-bold tracking-[0.4em] text-[#f5e6b3]">{"The Big Class".toUpperCase()}</p>
            <div className="my-[0.3em] flex items-center gap-[0.2em]">
              <div className="h-px w-[1.2em] bg-[#d4af37]" />
              <Square className="h-[0.3em] w-[0.3em] rotate-45 fill-[#d4af37] text-[#d4af37]" />
              <div className="h-px w-[1.2em] bg-[#d4af37]" />
            </div>
            <h1 className="font-serif text-[1.6em] uppercase tracking-[0.04em] text-[#f5e6b3] leading-none">
              Certificate of <span className="font-bold text-[#d4af37]">Mastery</span>
            </h1>
            <p className="mt-[0.4em] text-[0.55em] tracking-[0.5em] text-[#b8941f]">BESTOWED UPON</p>
            <p className="font-serif text-[1.4em] uppercase tracking-[0.05em] text-[#f5e6b3] leading-none">
              {name}
            </p>
            <p className="mt-[0.3em] text-[0.55em] tracking-[0.05em] text-[#d4c590]">
              for completion of <span className="font-bold uppercase text-[#d4af37]">{course}</span>
            </p>
          </div>
        </div>
      )}

      {template === "neon" && (
        <div
          className="relative h-full w-full overflow-hidden text-center text-blue-50"
          style={{
            background:
              "radial-gradient(ellipse at 50% 120%, #ff2e88 0%, transparent 45%), radial-gradient(ellipse at 0% 0%, #00f0ff 0%, transparent 35%), radial-gradient(ellipse at 100% 0%, #9b5cff 0%, transparent 35%), linear-gradient(180deg, #08001f, #1a0040)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,46,136,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.45) 1px, transparent 1px)",
              backgroundSize: "0.6em 0.6em",
              transform: "perspective(140px) rotateX(60deg)",
              transformOrigin: "bottom",
              maskImage: "linear-gradient(to top, #000 30%, transparent)",
              WebkitMaskImage: "linear-gradient(to top, #000 30%, transparent)",
            }}
          />
          <div className="absolute inset-[0.4em] border border-cyan-400/40" />
          <div className="absolute left-[0.4em] top-[0.4em] h-[0.6em] w-[0.6em] border-l-2 border-t-2 border-cyan-300" />
          <div className="absolute bottom-[0.4em] right-[0.4em] h-[0.6em] w-[0.6em] border-b-2 border-r-2 border-[#ff2e88]" />
          <div className="relative flex h-full flex-col items-center justify-center p-[0.8em]">
            <p className="font-mono text-[0.5em] tracking-[0.35em] text-cyan-300">// VIDYANXT // PROGRAMME //</p>
            <h1
              className="mt-[0.3em] text-[1.5em] font-black uppercase leading-[0.95] tracking-wide"
              style={{
                background: "linear-gradient(180deg, #ffffff 30%, #00f0ff 60%, #9b5cff 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Certificate of Completion
            </h1>
            <p className="mt-[0.4em] font-mono text-[0.5em] tracking-[0.4em] text-[#ff2e88]">— ISSUED TO —</p>
            <p className="text-[1.5em] font-black leading-none text-white">{name}</p>
            <p className="mt-[0.3em] font-mono text-[0.55em] text-cyan-100">
              {">"} {course}
            </p>
            <div className="mt-[0.3em] inline-block border border-[#ff2e88] px-[0.5em] py-[0.05em] font-mono text-[0.5em] tracking-[0.3em] text-[#ff2e88]">
              SIGNAL · ACTIVE
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Full-size certificate for generation/download
export function CertificateFull({
  template,
  name = "John Smith",
  course = "Advanced Web Development",
  date = "May 15, 2026",
  instructor = "Dr. Jane Doe",
  certificateId = "CERT-2026-ABCD1234",
}: CertificatePreviewProps & { instructor?: string; certificateId?: string }) {
  return (
    <div className="aspect-[1.414/1] w-full max-w-3xl mx-auto">
      {template === "classic" && (
        <div
          className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 p-12"
          style={{ border: "8px double #b8860b" }}
        >
          <div className="flex items-center gap-4 text-amber-700">
            <div className="h-1 w-24 bg-amber-600" />
            <Award className="h-16 w-16" strokeWidth={1.5} />
            <div className="h-1 w-24 bg-amber-600" />
          </div>
          <h1 className="mt-6 font-serif text-4xl font-bold tracking-wide text-slate-800">
            Certificate of Completion
          </h1>
          <p className="mt-4 text-lg text-slate-600">This is to certify that</p>
          <p className="mt-2 font-serif text-3xl font-semibold text-slate-900">{name}</p>
          <p className="mt-4 text-lg text-slate-600">has successfully completed</p>
          <p className="mt-1 text-xl font-medium text-slate-800">{course}</p>
          <p className="mt-6 text-base text-slate-500">{date}</p>
          <div className="mt-8 flex items-center gap-16">
            <div className="text-center">
              <p className="font-medium text-slate-700">{instructor}</p>
              <div className="mt-1 h-px w-32 bg-slate-400" />
              <p className="mt-1 text-sm text-slate-500">Instructor</p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-amber-600">
              <Award className="h-10 w-10 text-amber-600" />
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-700">The Big Class</p>
              <div className="mt-1 h-px w-32 bg-slate-400" />
              <p className="mt-1 text-sm text-slate-500">Issuing Authority</p>
            </div>
          </div>
          <p className="mt-6 font-mono text-xs text-slate-400">ID: {certificateId}</p>
        </div>
      )}

      {template === "modern" && (
        <div className="flex h-full w-full bg-white shadow-lg">
          <div className="w-3 bg-blue-600" />
          <div className="flex flex-1 flex-col justify-center p-12">
            <span className="text-sm font-medium uppercase tracking-widest text-blue-600">
              Certificate
            </span>
            <h1 className="mt-4 text-5xl font-light text-slate-900">
              Certificate of <span className="font-bold text-blue-600">Completion</span>
            </h1>
            <p className="mt-8 text-lg text-slate-500">Awarded to</p>
            <p className="text-3xl font-semibold text-slate-800">{name}</p>
            <p className="mt-6 text-slate-600">
              For successful completion of <span className="font-semibold text-slate-900">{course}</span>{" "}
              and demonstrating proficiency in all assessed areas.
            </p>
            <div className="mt-8 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Completion Date</p>
                <p className="text-lg font-medium text-slate-700">{date}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Instructor</p>
                <p className="text-lg font-medium text-slate-700">{instructor}</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded bg-blue-600">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            <p className="mt-6 font-mono text-xs text-slate-400">Certificate ID: {certificateId}</p>
          </div>
        </div>
      )}

      {template === "achievement" && (
        <div className="flex h-full w-full flex-col bg-white shadow-lg">
          <div
            className="flex h-[40%] w-full flex-col items-center justify-center text-white"
            style={{
              background: "linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #f59e0b 100%)",
            }}
          >
            <p className="text-xs uppercase tracking-[0.4em] opacity-95">The Big Class</p>
            <h1 className="mt-2 font-serif text-4xl font-black tracking-wide">
              Certificate of Achievement
            </h1>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-pink-500">
              <Star className="h-8 w-8 fill-white text-white" />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-purple-700">
              Presented to
            </p>
            <p className="mt-1 font-serif text-4xl font-black text-slate-900">{name}</p>
            <p className="mt-4 max-w-md text-slate-600">
              in recognition of outstanding performance in{" "}
              <span className="font-bold text-purple-700">{course}</span>, completed on {date}.
            </p>
            <div className="mt-6 flex items-center gap-8 text-sm">
              <div className="text-center">
                <p className="font-bold text-slate-900">{instructor}</p>
                <p className="text-slate-500">Instructor</p>
              </div>
            </div>
            <p className="mt-4 font-mono text-xs text-slate-400">ID: {certificateId}</p>
          </div>
        </div>
      )}

      {template === "participation" && (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 p-12 shadow-lg">
          <div className="rounded-full bg-purple-100 p-4">
            <CheckCircle className="h-12 w-12 text-purple-600" />
          </div>
          <h1 className="mt-4 text-4xl font-extrabold text-purple-800">
            Certificate of Participation
          </h1>
          <p className="mt-2 text-lg italic text-purple-500">awarded with appreciation to</p>
          <p className="mt-3 border-b-2 border-dashed border-pink-300 px-6 pb-2 text-4xl font-extrabold text-purple-700">
            {name}
          </p>
          <p className="mt-4 max-w-md text-center text-slate-600">
            for joining and taking part in <span className="font-bold text-purple-700">{course}</span> on {date}. Thank you for being part of the journey!
          </p>
          <p className="mt-6 font-mono text-xs text-slate-400">Certificate ID: {certificateId}</p>
        </div>
      )}

      {template === "corporate" && (
        <div className="flex h-full w-full bg-white shadow-lg">
          <div
            className="flex w-[30%] flex-col p-8 text-white"
            style={{ background: "linear-gradient(160deg, #0b1f3a, #1e4669)" }}
          >
            <p className="font-serif text-lg font-bold tracking-[0.2em] text-amber-300">
              VIDYANXT
            </p>
            <div className="mt-2 h-0.5 w-6 bg-amber-300" />
            <p className="mt-8 text-[10px] uppercase tracking-[0.25em] text-slate-300">
              Certificate ID
            </p>
            <p className="font-mono text-xs text-amber-300">{certificateId}</p>
            <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-slate-300">
              Verify At
            </p>
            <p className="text-[9px] break-all text-slate-100">
              thebigclass.com/verify
            </p>
            <Building2 className="mt-auto h-10 w-10 text-amber-300/60" />
          </div>
          <div className="flex flex-1 flex-col p-12">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-600">
              Professional Certification
            </p>
            <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-slate-900">
              Certificate of<br />Completion
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              This document formally certifies the successful completion of the programme of study set out below.
            </p>
            <p className="mt-8 text-xs uppercase tracking-[0.25em] text-slate-500">
              Awarded to
            </p>
            <p className="font-serif text-3xl font-bold text-slate-900">{name}</p>
            <div className="mt-6 border-l-4 border-amber-500 bg-slate-50 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Programme</p>
              <p className="font-serif text-xl font-bold text-slate-900">{course}</p>
            </div>
            <div className="mt-auto flex justify-between border-t border-slate-200 pt-4">
              <div>
                <p className="font-serif font-bold text-slate-900">{instructor}</p>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Programme Director</p>
              </div>
              <div className="text-right">
                <p className="font-serif font-bold text-slate-900">{date}</p>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Date of Issue</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {template === "elegant" && (
        <div
          className="relative flex h-full w-full flex-col items-center justify-center p-12 shadow-lg"
          style={{ background: "radial-gradient(circle at 50% 40%, #1a1a23, #0a0a0f)" }}
        >
          <div
            className="absolute inset-6 border"
            style={{ borderColor: "#d4af37" }}
          />
          <Sparkles className="h-8 w-8 text-amber-300" />
          <p className="mt-2 text-xs tracking-[0.5em] text-amber-300">VIDYANXT ACADEMY</p>
          <div className="my-4 flex items-center gap-2">
            <div className="h-px w-12 bg-amber-300" />
            <Square className="h-2 w-2 rotate-45 fill-amber-300 text-amber-300" />
            <div className="h-px w-12 bg-amber-300" />
          </div>
          <h1 className="font-serif text-5xl italic text-amber-100">Certificate of</h1>
          <p className="mt-1 font-serif text-3xl font-bold tracking-[0.2em] text-amber-300">
            DISTINCTION
          </p>
          <p className="mt-6 text-xs tracking-[0.4em] text-amber-200/60">PRESENTED TO</p>
          <p className="mt-2 font-serif text-4xl font-semibold text-amber-100">{name}</p>
          <div className="mt-3 h-px w-64 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
          <p className="mt-4 max-w-md text-center font-serif text-base italic text-amber-200/80">
            in recognition of the honourable completion of <span className="font-bold not-italic text-amber-300">{course}</span>.
          </p>
          <p className="mt-6 font-mono text-[10px] tracking-widest text-amber-300/60">{certificateId}</p>
        </div>
      )}

      {template === "minimal" && (
        <div className="flex h-full w-full flex-col bg-stone-50 p-12 shadow-lg">
          <div className="flex items-baseline justify-between border-b border-black/80 pb-3">
            <p className="text-sm font-bold uppercase tracking-[0.4em] text-black">
              VIDYANXT
            </p>
            <p className="font-mono text-xs text-slate-500">{certificateId}</p>
          </div>
          <p className="mt-6 font-mono text-xs text-slate-500">— 01</p>
          <h1 className="mt-1 text-3xl font-light leading-tight text-black">
            Certificate of <span className="font-bold">Completion</span>
          </h1>
          <div className="mt-12 flex items-end gap-8">
            <p className="font-mono text-xs text-slate-500 pb-3">— 02 Recipient</p>
            <p className="text-7xl font-extrabold leading-none tracking-tight text-black">
              {name}
            </p>
          </div>
          <div className="mt-12 grid grid-cols-[100px_1fr] gap-8">
            <p className="font-mono text-xs text-slate-500 pt-1">— 03 Detail</p>
            <p className="text-base leading-relaxed text-slate-700">
              For successfully completing <span className="font-bold text-black">{course}</span> on {date}, under the instruction of {instructor}.
            </p>
          </div>
          <div className="mt-auto grid grid-cols-3 items-end gap-6 border-t border-black/80 pt-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Issued</p>
              <p className="font-bold text-black">{date}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Instructor</p>
              <p className="font-bold text-black">{instructor}</p>
            </div>
            <div className="flex items-end justify-end gap-3">
              <p className="font-mono text-[9px] leading-tight text-slate-500">VERIFY</p>
              <div className="h-14 w-14 bg-black" />
            </div>
          </div>
        </div>
      )}

      {template === "botanical" && (
        <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#f7f3ea] p-12 text-center shadow-lg">
          <Leaf className="absolute left-6 top-6 h-20 w-20 -rotate-12 text-emerald-600/70" />
          <Leaf className="absolute right-8 top-10 h-12 w-12 rotate-45 text-emerald-700/60" />
          <Leaf className="absolute bottom-8 left-10 h-14 w-14 rotate-180 text-emerald-600/70" />
          <Leaf className="absolute bottom-6 right-6 h-20 w-20 rotate-[200deg] text-emerald-700/70" />
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-700/60">
            <Leaf className="h-10 w-10 text-emerald-700" />
          </div>
          <p className="mt-3 text-xs tracking-[0.4em] text-emerald-700">VIDYANXT ACADEMY</p>
          <h1 className="mt-2 font-serif text-4xl font-black leading-tight text-emerald-900">
            Certificate of Completion
          </h1>
          <p className="mt-1 text-base italic text-amber-800">awarded with appreciation</p>
          <p className="mt-6 text-xs tracking-[0.35em] text-amber-800">PRESENTED TO</p>
          <p className="mt-1 font-serif text-4xl font-bold text-emerald-900">{name}</p>
          <p className="mt-4 max-w-md font-serif text-base italic text-emerald-800/80">
            for thoughtfully completing <span className="font-bold not-italic text-emerald-900">{course}</span> on {date}.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-px w-12 bg-amber-800/60" />
            <Leaf className="h-3 w-3 text-amber-800" />
            <div className="h-px w-12 bg-amber-800/60" />
          </div>
          <p className="mt-3 font-mono text-[10px] text-emerald-700/70">{certificateId}</p>
        </div>
      )}

      {template === "executive" && (
        <div className="flex h-full w-full bg-[#f4ede0] shadow-lg">
          <div
            className="relative flex w-1/2 flex-col p-12 text-[#f4ede0]"
            style={{ background: "linear-gradient(170deg, #053024 0%, #0a3024 50%, #0d4536 100%)" }}
          >
            <div className="absolute right-12 top-12 h-40 w-40 rounded-full border border-amber-300/25" />
            <div className="absolute bottom-12 right-16 h-24 w-24 rounded-full border border-amber-300/15" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-amber-300 font-serif text-xl font-bold text-amber-300">V</div>
              <p className="font-serif text-lg font-semibold tracking-[0.18em]">{"The Big Class".toUpperCase()}</p>
            </div>
            <p className="relative z-10 mt-12 text-xs font-semibold tracking-[0.45em] text-amber-300">EXECUTIVE CERTIFICATION</p>
            <h1 className="relative z-10 mt-3 font-serif text-6xl font-semibold leading-[0.95]">
              Certificate<br />of <em className="italic font-medium text-amber-300">Completion</em>
            </h1>
            <p className="relative z-10 mt-6 max-w-[18rem] text-sm leading-relaxed text-amber-50/75">
              Awarded in recognition of disciplined study and demonstrated mastery of the programme set out herein.
            </p>
            <div className="relative z-10 mt-auto h-0.5 w-10 bg-amber-300" />
            <p className="relative z-10 mt-2 font-serif italic text-amber-100/70">Issued {date}</p>
          </div>
          <div className="flex w-1/2 flex-col p-12">
            <p className="text-xs font-semibold tracking-[0.4em] text-emerald-900/60">CONFERRED UPON</p>
            <p className="mt-1 font-serif text-5xl font-bold leading-none text-emerald-950">{name}</p>
            <div className="mt-4 h-0.5 w-12 bg-emerald-950" />
            <p className="mt-6 max-w-md text-base leading-relaxed text-emerald-900/80">
              upon the successful completion of{" "}
              <span className="font-serif text-lg font-bold italic text-emerald-950">{course}</span>, having satisfied the assessment standards of the issuing institution.
            </p>
            <div className="mt-auto grid grid-cols-2 items-end gap-8 pt-8">
              <div>
                <p className="font-serif text-lg font-bold text-emerald-950">{instructor}</p>
                <div className="my-1.5 h-px w-full bg-emerald-950" />
                <p className="text-[10px] font-semibold tracking-[0.2em] text-emerald-900/60">PROGRAMME DIRECTOR</p>
              </div>
              <div className="text-right text-[10px] leading-tight text-emerald-900/60">
                <div className="ml-auto mb-1 h-16 w-16 border border-amber-700/30 bg-white" />
                <p className="font-mono font-semibold text-emerald-950">{certificateId}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {template === "midnight" && (
        <div
          className="relative flex h-full w-full flex-col p-10 text-blue-50 shadow-lg"
          style={{
            background:
              "radial-gradient(circle at 18% 22%, rgba(56,132,255,0.22), transparent 45%), radial-gradient(circle at 82% 78%, rgba(168,85,247,0.18), transparent 50%), #060a1a",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(124,158,232,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(124,158,232,0.4) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, #000 40%, transparent 80%)",
            }}
          />
          <div className="pointer-events-none absolute inset-6 border border-blue-400/25" />
          <div className="pointer-events-none absolute left-6 top-6 h-8 w-8 border-l-2 border-t-2 border-[#3884ff]" />
          <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 border-b-2 border-r-2 border-[#a855f7]" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full shadow-[0_0_12px_rgba(56,132,255,0.6)]" style={{ background: "linear-gradient(135deg,#3884ff,#a855f7)" }} />
              <p className="text-sm font-semibold tracking-[0.35em] text-blue-50">VIDYANXT ACADEMY</p>
            </div>
            <div className="rounded-full border border-blue-400/35 px-3 py-1 font-mono text-[10px] tracking-widest text-blue-300">
              VERIFIED · {date}
            </div>
          </div>
          <p className="relative z-10 mt-12 font-mono text-xs tracking-widest text-blue-300">CERTIFICATE / 2026</p>
          <h1 className="relative z-10 mt-1 text-6xl font-bold leading-[0.98]">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">Certificate of</span>
            <br />
            <span className="bg-gradient-to-r from-[#3884ff] to-[#a855f7] bg-clip-text text-transparent">Completion</span>
          </h1>
          <p className="relative z-10 mt-6 max-w-2xl text-sm leading-relaxed text-blue-100/70">
            Issued by The Big Class to the recipient named below, recognising successful completion of the programme.
          </p>
          <div className="relative z-10 mt-10 flex items-end gap-6">
            <p className="pb-2 font-mono text-xs tracking-widest text-blue-300 whitespace-nowrap">RECIPIENT —</p>
            <p className="flex-1 border-b border-blue-400/35 pb-3 text-4xl font-bold leading-none text-white">{name}</p>
          </div>
          <p className="relative z-10 mt-4 text-base">
            <span className="text-blue-100">Programme: </span>
            <span className="font-semibold text-[#3884ff]">{course}</span>
          </p>
          <div className="relative z-10 mt-auto grid grid-cols-3 items-end gap-6 pt-8">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-blue-300">INSTRUCTOR</p>
              <p className="mt-1 font-semibold">{instructor}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest text-blue-300">ISSUED</p>
              <p className="mt-1 font-semibold">{date}</p>
            </div>
            <div className="text-right">
              <div className="ml-auto h-16 w-16 rounded bg-white" />
              <p className="mt-1.5 font-mono text-[10px] tracking-widest text-blue-300">{certificateId}</p>
            </div>
          </div>
        </div>
      )}

      {template === "monogram" && (
        <div className="relative h-full w-full overflow-hidden bg-[#faf7f2] shadow-lg">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMinYMid meet"
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-[58%]"
            aria-hidden
          >
            <text
              x="-3"
              y="93"
              fontFamily="Georgia, 'Playfair Display', serif"
              fontSize="115"
              fontWeight="900"
              fill="#b8390f"
              letterSpacing="-4"
            >
              V
            </text>
          </svg>
          <div className="relative z-10 grid h-full grid-cols-[1.2fr_1fr] grid-rows-[auto_1fr_auto] gap-0 p-10">
            <div className="col-span-2 flex items-baseline justify-between border-b border-black/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[#b8390f]" />
                <p className="font-serif text-lg font-bold tracking-[0.05em] text-black">The Big Class</p>
              </div>
              <p className="font-serif italic text-stone-500">Vol. 26 — Spring Issue</p>
            </div>
            <div className="pt-8">
              <p className="text-xs font-semibold tracking-[0.35em] text-stone-500">A CERTIFICATE</p>
              <h1 className="mt-2 font-serif text-7xl font-black leading-[0.9] text-black">
                of <em className="italic font-medium text-[#b8390f]">Excellence</em>
                <br />
                and Completion
              </h1>
              <dl className="mt-10 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
                <dt className="text-xs font-semibold tracking-[0.25em] text-stone-500">ISSUED</dt><dd className="font-medium text-black">{date}</dd>
                <dt className="text-xs font-semibold tracking-[0.25em] text-stone-500">REFERENCE</dt><dd className="font-medium text-black">{certificateId}</dd>
                <dt className="text-xs font-semibold tracking-[0.25em] text-stone-500">AUTHORITY</dt><dd className="font-medium text-black">{instructor}</dd>
              </dl>
            </div>
            <div className="flex flex-col border-l border-stone-300 pl-8 pt-8">
              <p className="text-xs font-bold tracking-[0.4em] text-[#b8390f]">RECIPIENT</p>
              <p className="mt-2 font-serif text-5xl font-black leading-none text-black">{name}</p>
              <p className="mt-6 text-base leading-relaxed text-stone-700">
                is hereby acknowledged for the diligent and successful completion of the programme{" "}
                <span className="font-serif text-lg font-bold italic text-[#b8390f]">{course}</span>, presented with the commendation of the issuing institution.
              </p>
            </div>
            <div className="col-span-2 mt-auto grid grid-cols-[1fr_1fr_auto] items-end gap-6 border-t border-black/80 pt-4">
              <div>
                <p className="font-serif text-base font-bold text-black">{instructor}</p>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-stone-500">INSTRUCTOR OF RECORD</p>
              </div>
              <div>
                <p className="font-serif text-base font-bold text-black">The Big Class</p>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-stone-500">ISSUING AUTHORITY</p>
              </div>
              <div className="text-right">
                <div className="ml-auto h-14 w-14 border border-stone-300 bg-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {template === "diploma" && (
        <div
          className="relative flex h-full w-full flex-col items-center bg-[#fbf5e7] p-14 text-center shadow-lg"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(168,135,75,0.03) 0 1px, transparent 1px 4px)" }}
        >
          <div className="pointer-events-none absolute inset-4 border-[3px] border-[#a8874b]" />
          <div className="pointer-events-none absolute inset-6 border border-[#a8874b]" />
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-[#6b4f1d]">
            <Scroll className="h-10 w-10 text-[#6b4f1d]" />
          </div>
          <p className="relative z-10 mt-3 text-base font-bold tracking-[0.3em] text-[#6b4f1d]">VIDYANXT ACADEMY</p>
          <p className="relative z-10 mt-1 text-[10px] font-semibold tracking-[0.5em] text-amber-800/80">— FOUNDED IN PURSUIT OF KNOWLEDGE —</p>
          <p className="relative z-10 mt-3 font-serif text-lg tracking-[0.6em] text-[#a8874b]">❦ ❦ ❦</p>
          <h1 className="relative z-10 mt-2 font-serif text-5xl font-bold text-[#28201a]">
            <em className="italic font-medium text-[#6b4f1d]">Diploma</em> of Completion
          </h1>
          <p className="relative z-10 mt-4 font-serif italic text-lg text-amber-900/80">Be it known to all who shall read these presents that</p>
          <p className="relative z-10 mt-4 border-b border-[#a8874b] pb-2 font-serif text-6xl font-medium italic text-[#28201a]">{name}</p>
          <p className="relative z-10 mt-6 max-w-2xl text-base leading-relaxed text-stone-700">
            having faithfully completed the prescribed course of study in{" "}
            <span className="font-serif italic font-bold text-[#6b4f1d]">{course}</span> and having satisfied the requirements set forth, is hereby admitted to all honours and privileges thereto appertaining.
          </p>
          <div className="relative z-10 mt-auto grid w-full grid-cols-[1fr_auto_1fr] items-end gap-6">
            <div className="text-center">
              <p className="font-serif text-lg font-semibold italic text-[#28201a]">{instructor}</p>
              <div className="my-1 h-px w-full bg-[#28201a]" />
              <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-800/80">FACULTY DIRECTOR</p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#6b4f1d] bg-[#fbf5e7]">
              <Star className="h-10 w-10 fill-[#a8874b] text-[#a8874b]" />
            </div>
            <div className="text-center">
              <p className="font-serif text-lg font-semibold italic text-[#28201a]">The Big Class</p>
              <div className="my-1 h-px w-full bg-[#28201a]" />
              <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-800/80">ISSUING AUTHORITY</p>
            </div>
          </div>
          <p className="relative z-10 mt-3 font-mono text-[10px] text-[#6b4f1d]">{certificateId} · {date}</p>
        </div>
      )}

      {template === "wave" && (
        <div className="flex h-full w-full flex-col bg-white shadow-lg">
          <div
            className="relative flex h-[42%] flex-col justify-between p-10 text-white"
            style={{ background: "linear-gradient(90deg, #6366f1 0%, #7c3aed 55%, #06b6d4 100%)" }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
              style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.18))" }}
            />
            <div className="absolute right-16 top-4 h-12 w-12 rounded-full bg-white/10" />
            <div className="absolute right-4 top-2 h-6 w-6 rounded-full bg-white/15" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/60 bg-white/15 font-extrabold">V</div>
                <p className="text-sm font-bold tracking-[0.2em]">VIDYANXT ACADEMY</p>
              </div>
              <p className="text-[10px] font-semibold tracking-[0.3em] opacity-90">PROGRAMME CERTIFICATE · {date}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.4em] opacity-90">AWARDED BY VIDYANXT</p>
              <h1 className="mt-1 text-5xl font-extrabold leading-none">Certificate of Completion</h1>
            </div>
          </div>
          <div className="relative mx-8 -mt-6 flex-1 rounded-2xl border border-indigo-100 bg-white p-10 shadow-[0_12px_32px_rgba(99,102,241,0.12)]">
            <div className="absolute -top-1 left-12 h-2 w-16 rounded-full" style={{ background: "linear-gradient(90deg,#6366f1,#06b6d4)" }} />
            <p className="text-xs font-bold tracking-[0.35em] text-indigo-600">AWARDED TO</p>
            <p className="mt-2 text-4xl font-bold leading-tight text-slate-900">{name}</p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
              for the successful completion of{" "}
              <span className="font-bold text-slate-900" style={{ backgroundImage: "linear-gradient(to right, transparent, rgba(99,102,241,0.18), transparent)" }}>{course}</span>{" "}
              on <span className="font-bold text-cyan-600">{date}</span>, having met all programme requirements set by the issuing institution.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-700" />
                Programme complete
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-1.5 text-xs font-semibold text-cyan-700">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-700" />
                Issued · {date}
              </span>
            </div>
            <div className="mt-auto grid grid-cols-[1fr_1fr_auto] items-end gap-6 border-t border-indigo-100 pt-6">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-400">INSTRUCTOR</p>
                <p className="font-bold text-slate-900">{instructor}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-400">ISSUED</p>
                <p className="font-bold text-slate-900">{date}</p>
              </div>
              <div className="text-right">
                <div className="ml-auto h-16 w-16 rounded border border-indigo-100 bg-white" />
                <p className="mt-1.5 font-mono text-[10px] font-semibold text-indigo-600">{certificateId}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {template === "aurora" && (
        <div
          className="relative flex h-full w-full flex-col shadow-lg"
          style={{
            background:
              "radial-gradient(circle at 8% 12%, #ff7eb3 0%, transparent 38%), radial-gradient(circle at 92% 16%, #ffb87a 0%, transparent 36%), radial-gradient(circle at 88% 88%, #7c5cff 0%, transparent 42%), radial-gradient(circle at 18% 88%, #2dd4bf 0%, transparent 38%), radial-gradient(circle at 50% 50%, #c084fc 0%, transparent 60%), linear-gradient(135deg, #fff0fb 0%, #efe7ff 100%)",
          }}
        >
          <div className="relative m-10 flex flex-1 flex-col rounded-3xl border border-white/85 bg-white/55 p-12 backdrop-blur-md shadow-[0_4px_32px_rgba(124,92,255,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.4em] text-[#4a3a8a]">
                <div
                  className="h-3 w-3 rounded-full shadow-[0_2px_8px_rgba(124,92,255,0.4)]"
                  style={{ background: "conic-gradient(from 0deg, #ff7eb3, #7c5cff, #2dd4bf, #ffb87a, #ff7eb3)" }}
                />
                The Big Class
              </div>
              <div className="rounded-full border border-purple-300/40 bg-white/60 px-4 py-1.5 text-xs font-medium tracking-[0.15em] text-[#4a3a8a]">
                — {date} —
              </div>
            </div>
            <div className="mt-10 text-center">
              <p className="text-sm font-semibold tracking-[0.45em] text-[#7c5cff]">PROGRAMME CERTIFICATE</p>
              <h1 className="mt-3 font-serif text-7xl font-normal leading-[0.95] tracking-tight text-[#1a1a2e]">
                Certificate of{" "}
                <em
                  className="italic"
                  style={{
                    background: "linear-gradient(120deg,#ff7eb3,#7c5cff,#2dd4bf)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Completion
                </em>
              </h1>
            </div>
            <div className="mt-8 text-center">
              <p className="text-sm font-semibold tracking-[0.4em] text-[#6b5a9a]">AWARDED TO</p>
              <p className="mt-2 font-serif text-5xl text-[#1a1a2e]">{name}</p>
              <div className="mx-auto mt-3 h-px w-32 bg-gradient-to-r from-transparent via-[#7c5cff] to-transparent" />
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#3a3a5a]">
                for the successful completion of{" "}
                <span className="font-serif text-lg italic" style={{ background: "linear-gradient(120deg,#ff7eb3,#7c5cff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  {course}
                </span>
                , concluded with merit on {date}.
              </p>
            </div>
            <div className="mt-auto grid grid-cols-[1fr_1fr_auto] items-end gap-6 border-t border-purple-300/20 pt-6">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.3em] text-[#6b5a9a]">INSTRUCTOR</p>
                <p className="font-serif text-lg text-[#1a1a2e]">{instructor}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.3em] text-[#6b5a9a]">ISSUED</p>
                <p className="font-serif text-lg text-[#1a1a2e]">{date}</p>
              </div>
              <div className="text-right">
                <div className="ml-auto h-16 w-16 rounded border border-purple-300/30 bg-white" />
                <p className="mt-1.5 font-mono text-[10px] font-semibold tracking-wider text-[#7c5cff]">{certificateId}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {template === "vintage" && (
        <div className="relative h-full w-full bg-[#f0e3c8] text-center shadow-lg">
          <div className="pointer-events-none absolute inset-4 border border-[#65422180]" />
          <div className="pointer-events-none absolute inset-6 border-[3px] border-double border-[#6b4423]" />
          <div className="pointer-events-none absolute left-1/2 top-3 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#6b4423] bg-[#f0e3c8]" />
          <div className="pointer-events-none absolute bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#6b4423] bg-[#f0e3c8]" />
          <div className="pointer-events-none absolute right-12 top-12 h-24 w-24 rounded-full bg-[#8b5a2b]/15" />
          <div className="pointer-events-none absolute bottom-16 left-12 h-32 w-28 rounded-full bg-[#8b5a2b]/20" />
          <div className="relative flex h-full flex-col items-center justify-center p-16">
            <p className="font-serif text-xs tracking-[0.4em] text-[#6b4423]">— EST. MMXXVI —</p>
            <p className="mt-2 font-serif text-lg font-bold tracking-[0.3em] text-[#3a2818]">{"The Big Class".toUpperCase()}</p>
            <p className="mt-2 font-serif text-xl tracking-[0.4em] text-[#8b5a2b]">❦ &nbsp; ❦ &nbsp; ❦</p>
            <h1 className="mt-3 font-serif text-6xl italic font-normal leading-none text-[#3a2818]">Certificate of Honour</h1>
            <p className="mt-4 font-serif text-base italic text-[#6b4423]">Let it be known to all who shall peruse these presents that</p>
            <p
              className="mt-3 font-serif text-6xl text-[#3a2818] underline decoration-[#8b5a2b] decoration-[2px]"
              style={{ textUnderlineOffset: "10px" }}
            >
              {name}
            </p>
            <p className="mt-6 max-w-2xl font-serif text-base leading-relaxed text-[#4a3424]">
              hath this day diligently completed the course entitled{" "}
              <span className="italic font-medium text-[#6b4423] underline decoration-[#8b5a2b]/40">{course}</span>, and is hereby commended for the same.
            </p>
          </div>
          <div className="absolute bottom-16 left-16 text-center">
            <div className="relative inline-block bg-gradient-to-br from-[#b91c1c] to-[#991b1b] px-6 py-2 font-serif text-base font-bold uppercase tracking-[0.2em] text-[#f0e3c8] shadow-md">
              Honoris Causa
              <div className="absolute -bottom-3 left-0 h-0 w-0 border-t-[12px] border-r-[24px] border-t-[#6b1818] border-r-transparent" />
              <div className="absolute -bottom-3 right-0 h-0 w-0 border-l-[24px] border-t-[12px] border-l-transparent border-t-[#6b1818]" />
            </div>
            <p className="mt-6 font-serif text-base italic text-[#3a2818]">{instructor} · Master of Instruction</p>
          </div>
          <div className="absolute bottom-12 right-12 flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#b91c1c]/85 text-[#b91c1c]">
            <div className="absolute inset-2 rounded-full border border-[#b91c1c]/50" />
            <Stamp className="h-14 w-14" />
          </div>
          <div className="absolute bottom-2 left-6 right-6 flex items-center justify-between text-[10px] tracking-wider text-[#6b4423]">
            <span>Conferred {date}</span>
            <div className="h-12 w-12 border border-[#b8a07a] bg-white" />
            <span className="font-mono text-[#3a2818]">{certificateId}</span>
          </div>
        </div>
      )}

      {template === "blueprint" && (
        <div
          className="relative h-full w-full overflow-hidden p-3 text-blue-50 shadow-lg"
          style={{ background: "radial-gradient(ellipse at center, #173a6e 0%, #0a1e3d 80%)" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(160,200,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(160,200,255,0.18) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(rgba(160,200,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(160,200,255,0.08) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          />
          <div className="relative h-full border border-[#6ea7e8] p-8">
            <div className="absolute -left-px -top-px h-8 w-8 border-l-2 border-t-2 border-[#6ea7e8]" />
            <div className="absolute -right-px -top-px h-8 w-8 border-r-2 border-t-2 border-[#6ea7e8]" />
            <div className="absolute -bottom-px -left-px h-8 w-8 border-b-2 border-l-2 border-[#6ea7e8]" />
            <div className="absolute -bottom-px -right-px h-8 w-8 border-b-2 border-r-2 border-[#6ea7e8]" />
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-dashed border-[#6ea7e8] pb-3 font-mono text-xs tracking-wider text-[#a0c8ff]">
                <span><span className="opacity-70">SHEET</span> <span className="font-semibold text-white">01 / 01</span></span>
                <span className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-[#ffd166]" />
                  <span className="font-semibold text-white">VIDYANXT ACADEMY</span>
                </span>
                <span><span className="opacity-70">DRAWING</span> <span className="font-semibold text-white">{certificateId}</span></span>
              </div>
              <div className="mt-6 grid grid-cols-3 items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6ea7e8]">PROJECT NO.</p>
                  <p className="font-mono text-base font-medium text-white">VDX-2026</p>
                </div>
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-[#6ea7e8]">— SCALE 1 : 1 —</p>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6ea7e8]">REV.</p>
                  <p className="font-mono text-base font-medium text-white">A · {date}</p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <h1 className="text-6xl font-black uppercase leading-none tracking-tight text-white">
                  Certificate of <span className="text-[#ffd166] [text-shadow:0_0_24px_rgba(255,209,102,0.45)]">Mastery</span>
                </h1>
              </div>
              <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-[#6ea7e8]">
                <span className="text-base">▸</span>
                <div className="h-px flex-1 bg-[#6ea7e8]" />
                <span>A4 LANDSCAPE — 297mm × 210mm</span>
                <div className="h-px flex-1 bg-[#6ea7e8]" />
                <span className="text-base">◂</span>
              </div>
              <div className="mt-6 text-center">
                <p className="font-mono text-xs tracking-[0.3em] text-[#6ea7e8]">— ISSUED TO —</p>
                <p className="mt-2 text-5xl font-bold leading-none text-white">{name}</p>
              </div>
              <p className="mt-6 text-center text-base leading-relaxed text-blue-100">
                in formal recognition of the successful completion of{" "}
                <span
                  className="font-bold text-[#ffd166]"
                  style={{ background: "linear-gradient(transparent 92%, rgba(255,209,102,0.6) 92%, rgba(255,209,102,0.6) 96%, transparent 96%)" }}
                >
                  {course}
                </span>
                .
              </p>
              <div className="mt-auto grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-4 border-t border-dashed border-[#6ea7e8] pt-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6ea7e8]">DRAWN BY</p>
                  <p className="text-base font-bold text-white">{instructor}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6ea7e8]">APPROVED</p>
                  <p className="text-base font-bold text-white">The Big Class</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6ea7e8]">DATE</p>
                  <p className="font-mono text-sm font-semibold text-[#ffd166]">{date}</p>
                </div>
                <div className="ml-auto h-16 w-16 border border-[#6ea7e8] bg-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {template === "artdeco" && (
        <div
          className="relative h-full w-full overflow-hidden text-center text-[#f5e6b3] shadow-lg"
          style={{ background: "radial-gradient(ellipse at center, #16110a 0%, #050302 70%)" }}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(212,175,55,0.06) 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, rgba(212,175,55,0.04) 0 1px, transparent 1px 18px)",
            }}
          />
          <div className="pointer-events-none absolute inset-4 border-[1.5px] border-[#d4af37]" />
          <div className="pointer-events-none absolute inset-6 border border-[#d4af37]/50" />
          <div className="relative flex h-full flex-col items-center justify-center px-16 py-12">
            <Award className="h-12 w-12 text-[#d4af37]" />
            <p className="mt-3 text-xs font-medium tracking-[0.6em] text-[#d4af37]">— ANNO MMXXVI —</p>
            <p className="mt-2 font-serif text-xl font-bold tracking-[0.45em] text-[#f5e6b3]">{"The Big Class".toUpperCase()}</p>
            <div className="my-4 flex items-center gap-2">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#d4af37]" />
              <Square className="h-3 w-3 rotate-45 fill-[#d4af37] text-[#d4af37]" />
              <Square className="h-2 w-2 rotate-45 fill-[#d4af37]/50 text-[#d4af37]" />
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#d4af37]" />
            </div>
            <h1 className="font-serif text-6xl font-light uppercase tracking-wider leading-none text-[#f5e6b3]">
              Certificate of <span className="font-bold text-[#d4af37]">Mastery</span>
            </h1>
            <p className="mt-6 font-serif text-xs tracking-[0.5em] text-[#b8941f]">BESTOWED UPON</p>
            <p className="mt-2 font-serif text-5xl font-light uppercase tracking-wider leading-none text-[#f5e6b3]">{name}</p>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed tracking-wider text-[#d4c590]">
              in formal recognition of the consummate completion of{" "}
              <span className="font-serif font-bold uppercase tracking-widest text-[#d4af37]">{course}</span>, attended with distinction on {date}.
            </p>
            <div className="mt-auto flex w-full items-end justify-between pt-8">
              <div className="text-center">
                <p className="font-serif text-lg font-light text-[#f5e6b3]">{instructor}</p>
                <div className="my-1 h-px w-full bg-[#d4af37]" />
                <p className="font-serif text-[10px] tracking-[0.3em] text-[#b8941f]">— INSTRUCTOR —</p>
              </div>
              <div className="text-right">
                <div className="ml-auto h-16 w-16 bg-white p-1" />
                <p className="mt-1.5 font-mono text-[10px] text-[#d4af37]">{certificateId}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {template === "neon" && (
        <div
          className="relative h-full w-full overflow-hidden text-center text-blue-50 shadow-lg"
          style={{
            background:
              "radial-gradient(ellipse at 50% 120%, #ff2e88 0%, transparent 45%), radial-gradient(ellipse at 0% 0%, #00f0ff 0%, transparent 35%), radial-gradient(ellipse at 100% 0%, #9b5cff 0%, transparent 35%), linear-gradient(180deg, #08001f 0%, #0a002d 50%, #1a0040 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,46,136,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              transform: "perspective(420px) rotateX(60deg)",
              transformOrigin: "bottom",
              maskImage: "linear-gradient(to top, #000 30%, transparent)",
              WebkitMaskImage: "linear-gradient(to top, #000 30%, transparent)",
            }}
          />
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full shadow-[0_0_60px_rgba(255,46,136,0.5),0_0_120px_rgba(255,46,136,0.3)]"
            style={{
              bottom: "28%",
              width: "300px",
              height: "300px",
              background: "linear-gradient(180deg, #ff2e88 0%, #ff8c42 50%, #ffd166 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: "28%",
              width: "300px",
              height: "300px",
              background: "repeating-linear-gradient(180deg, transparent 0 20px, rgba(8,0,31,0.95) 20px 28px)",
              maskImage: "radial-gradient(circle, #000 49%, transparent 50%)",
              WebkitMaskImage: "radial-gradient(circle, #000 49%, transparent 50%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 3px)" }}
          />
          <div className="relative m-12 flex flex-1 flex-col border border-cyan-400/40 bg-[rgba(8,0,31,0.35)] p-10 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,46,136,0.25),inset_0_0_60px_rgba(0,240,255,0.08)]">
            <div className="absolute -left-px -top-px h-12 w-12 border-l-2 border-t-2 border-cyan-300 shadow-[-2px_-2px_12px_rgba(0,240,255,0.6)]" />
            <div className="absolute -bottom-px -right-px h-12 w-12 border-b-2 border-r-2 border-[#ff2e88] shadow-[2px_2px_12px_rgba(255,46,136,0.6)]" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-7 w-7 fill-cyan-300 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]" />
                <span className="text-lg font-bold tracking-[0.2em] text-cyan-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]">VIDYANXT</span>
              </div>
              <p className="font-mono text-xs tracking-[0.15em] text-[#ff2e88] drop-shadow-[0_0_8px_rgba(255,46,136,0.6)]">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#ff2e88] shadow-[0_0_6px_#ff2e88]" />SIGNAL · ACTIVE · {date}
              </p>
            </div>
            <div className="mt-10 text-center">
              <p className="font-mono text-xs tracking-[0.35em] text-cyan-300">// PROGRAMME CERTIFICATE //</p>
              <h1
                className="mt-2 text-6xl font-black uppercase leading-none tracking-wide"
                style={{
                  background: "linear-gradient(180deg, #ffffff 30%, #00f0ff 60%, #9b5cff 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow: "0 0 20px rgba(0,240,255,0.5)",
                }}
              >
                Certificate of Completion
              </h1>
            </div>
            <div className="mt-10 text-center">
              <p className="font-mono text-xs tracking-[0.4em] text-[#ff2e88] drop-shadow-[0_0_6px_rgba(255,46,136,0.6)]">— ISSUED TO —</p>
              <p
                className="mt-2 text-5xl font-black leading-none text-white"
                style={{ textShadow: "0 0 16px rgba(255,255,255,0.7), 0 0 32px rgba(0,240,255,0.5)" }}
              >
                {name}
              </p>
            </div>
            <p className="mt-6 text-center font-mono text-base leading-relaxed text-blue-100">
              for the successful completion of <span className="text-lg font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]">{course}</span>, having met every protocol of the issuing institution.
            </p>
            <div className="mt-auto grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-4 border-t border-cyan-400/30 pt-6">
              <div>
                <p className="font-mono text-[10px] tracking-[0.25em] text-cyan-300">OPERATOR</p>
                <p className="text-base font-bold text-white">{instructor}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.25em] text-cyan-300">TIMESTAMP</p>
                <p className="text-base font-bold text-white">{date}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.25em] text-cyan-300">SIG·ID</p>
                <p className="font-mono text-sm text-[#ff2e88]">{certificateId}</p>
              </div>
              <div className="ml-auto h-16 w-16 border border-cyan-300 bg-white shadow-[0_0_12px_rgba(0,240,255,0.4)]" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
