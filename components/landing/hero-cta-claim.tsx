"use client"

// Textual hero CTA.
//
// Replaced the interactive subdomain picker with a clean text-led
// cluster: a primary CTA rendered as a large bold link with an
// arrow + underline-on-hover treatment, paired with a quieter
// secondary link to pricing, and a single trust line underneath.
// Plus a tiny tertiary line offering the no-signup certificate
// designer for visitors who aren't ready to sign up yet.
//
// No buttons, no inputs — the whole cluster reads as prose with the
// emphasis on the primary action. Premium feel via typography +
// micro-animation, not visual weight.

import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

export function HeroCTAClaim() {
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
        <Link
          href="/signup"
          className="group inline-flex items-baseline gap-2 text-xl font-black tracking-tight text-foreground transition-colors hover:text-primary sm:text-2xl"
        >
          <span className="relative">
            Launch your academy free
            <span
              aria-hidden
              className="absolute inset-x-0 -bottom-0.5 h-[3px] origin-left scale-x-100 bg-gradient-to-r from-primary to-emerald-600 transition-transform duration-200 group-hover:scale-x-110"
            />
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 translate-y-1 text-primary transition-transform duration-200 group-hover:translate-x-1 group-hover:translate-y-1 sm:h-6 sm:w-6" />
        </Link>

        <Link
          href="/pricing"
          className="inline-flex items-baseline text-sm font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          or see pricing
        </Link>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <TrustItem>No credit card</TrustItem>
        <span aria-hidden className="text-border">·</span>
        <TrustItem>60-second setup</TrustItem>
        <span aria-hidden className="text-border">·</span>
        <TrustItem>Free Starter forever, cancel any day</TrustItem>
      </p>

      <p className="mt-3 text-xs text-muted-foreground">
        Not ready?{" "}
        <Link
          href="/template-designer"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Try the certificate designer in your browser
        </Link>{" "}
        — no signup, your work is yours to keep.
      </p>
    </div>
  )
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Check className="h-3 w-3 shrink-0 text-success" />
      {children}
    </span>
  )
}
