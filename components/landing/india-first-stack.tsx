"use client"

// India-first stack. The other wedge against the incumbent creator
// platforms: we look + behave like an Indian product, not a US
// product with "₹" awkwardly bolted on. UPI is a first-class checkout option;
// WhatsApp is a real channel, not a bolt-on; the portal speaks
// Hindi + Tamil; invoices are GST-compliant out of the box.
//
// Visually this section is the most "alive" — payment-method
// chips that pulse on a loop, WhatsApp + Hindi typing
// animations, a Rupee/GST badge cluster. The motion signals
// that the India-native posture is not a marketing claim but a
// product reality.

import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Globe,
  IndianRupee,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function IndiaFirstStack() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-br from-secondary via-background to-accent/[0.04] py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/4 h-80 w-80 animate-[indiaBlob_22s_ease-in-out_infinite] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-1/4 h-72 w-72 animate-[indiaBlob_18s_ease-in-out_infinite_reverse] rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          {/* Left — copy */}
          <div>
            <Badge variant="outline" className="mb-4">
              🇮🇳 Built in India, for India + the world
            </Badge>
            <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              An LMS that{" "}
              <span className="text-primary">speaks rupee</span> — and Hindi, and WhatsApp.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Most creator platforms are US-first with India bolted on. Ours is the opposite —
              UPI is the default checkout, WhatsApp is a real channel, the portal speaks five
              languages, and your invoices come GST-compliant out of the box.
            </p>

            <ul className="mt-7 space-y-3 text-sm">
              {[
                ["UPI intent flow", "No redirect. Your buyer approves in their UPI app — same as Zomato or BookMyShow."],
                ["WhatsApp Business native", "Green-tick verified API. Drips, broadcasts, abandoned-checkout recovery, class reminders."],
                ["Five languages, switchable", "EN · हिन्दी · தமிழ் · Español · Français. Picker in every portal header; choice persists per visitor."],
                ["GST invoices, auto-generated", "HSN codes, IGST/CGST/SGST split, every order, every time. No bookkeeping plug-in needed."],
                ["No-Cost EMI above ₹6,000", "Built-in. Buyer toggles at checkout — you take home the same number."],
                ["T+1 settlement", "Money in your bank the next working day. Not the 'sometime in 5–7 days' the legacy platforms ship."],
              ].map(([title, body], i) => (
                <li
                  key={title}
                  className="flex gap-3"
                  style={{ animation: `indiaUp 0.6s ease-out ${i * 60}ms both` }}
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/help/products-checkout">
                  See the checkout stack
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/features/multilingual">Five languages</Link>
              </Button>
            </div>
          </div>

          {/* Right — visual stack */}
          <div className="space-y-4">
            <PaymentStackCard />
            <WhatsAppStackCard />
            <InvoiceStackCard />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes indiaBlob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(20px, -25px) scale(1.04); }
          66%      { transform: translate(-15px, 20px) scale(0.96); }
        }
        @keyframes indiaUp {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes indiaPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes hindiTyping {
          0%, 20%   { content: "Sign in"; }
          25%, 45%  { content: "साइन इन करें"; }
          50%, 70%  { content: "உள்நுழைய"; }
          75%, 95%  { content: "Iniciar sesión"; }
        }
        @keyframes whatsappPulse {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(2px); }
          75%      { transform: translateX(-2px); }
        }
      `}</style>
    </section>
  )
}

// ============================================================
// Visual cards
// ============================================================

function PaymentStackCard() {
  const METHODS = [
    { label: "UPI", note: "Intent flow", color: "bg-primary text-primary-foreground" },
    { label: "Cards", note: "Visa · Master · Rupay", color: "bg-card border border-border" },
    { label: "NetBanking", note: "All major banks", color: "bg-card border border-border" },
    { label: "Wallets", note: "Paytm · Mobikwik · PhonePe", color: "bg-card border border-border" },
    { label: "Simpl · LazyPay", note: "Pay-Later", color: "bg-card border border-border" },
    { label: "EMI", note: "0% above ₹6,000", color: "bg-accent text-accent-foreground" },
  ]
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Checkout — your buyer&apos;s view</p>
          </div>
          <Badge variant="outline" className="text-[10px]">Native</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {METHODS.map((m, i) => (
            <div
              key={m.label}
              className={cn(
                "rounded-md p-2 text-center transition",
                m.color,
              )}
              style={{
                animation: `indiaPulse 2.5s ease-in-out ${i * 0.18}s infinite`,
              }}
            >
              <p className="font-bold">{m.label}</p>
              <p className="text-[10px] opacity-80">{m.note}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <IndianRupee className="h-3 w-3" />
            <span>Total ₹4,999</span>
          </div>
          <div className="rounded-full bg-success/15 px-2 py-0.5 text-success">
            Settles T+1
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WhatsAppStackCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <p className="text-sm font-semibold">WhatsApp Business · Green-tick verified</p>
          </div>
          <Badge variant="outline" className="text-[10px]">Native</Badge>
        </div>
        <div className="space-y-1.5">
          <BubbleRow
            delay={0}
            text="🎓 Class reminder: 'React Bootcamp · Module 4' starts in 1 hour."
          />
          <BubbleRow
            delay={400}
            text="🔥 Early-bird ends tonight. Your cart's still open — finish in one tap."
          />
          <BubbleRow
            delay={800}
            text="📜 Your certificate is ready! Tap to view + share on LinkedIn."
          />
        </div>
      </CardContent>
    </Card>
  )
}

function BubbleRow({ text, delay }: { text: string; delay: number }) {
  return (
    <div
      className="rounded-2xl rounded-bl-sm border border-success/30 bg-success/5 px-3 py-2 text-xs leading-relaxed text-foreground/90"
      style={{ animation: `whatsappPulse 6s ease-in-out ${delay}ms infinite` }}
    >
      {text}
    </div>
  )
}

function InvoiceStackCard() {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">GST-compliant invoice — auto-generated</p>
          </div>
          <Badge variant="outline" className="text-[10px]">Per order</Badge>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px] text-foreground/80">
          <div className="flex items-center justify-between">
            <span>Invoice #TBC-2026-04829</span>
            <span className="text-muted-foreground">19 May 2026</span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="flex justify-between"><span>Subtotal</span> <span>₹4,235.59</span></div>
            <div className="flex justify-between text-muted-foreground"><span>IGST (18%)</span> <span>₹762.41</span></div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold"><span>Total</span> <span>₹4,999.00</span></div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          HSN codes · IGST/CGST/SGST split · auto-emailed PDF · ready for your CA.
        </p>
      </CardContent>
    </Card>
  )
}

// Mark the LanguagePicker-ish bit so it doesn't bitrot unused.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
;[Globe, Sparkles, CalendarClock]
