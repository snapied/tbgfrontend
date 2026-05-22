"use client"

// Visitor-facing popup. Renders the FIRST enabled popup whose trigger
// fires and whose page-scope matches the current path. We only run one
// at a time on purpose — stacking modals is hostile.
//
// Triggers:
//   time          — set timeout for `afterSec`
//   scroll        — IntersectionObserver-free; just watch window scroll
//   exit-intent   — mouseleave above the viewport (desktop only)
//
// Frequency is enforced via localStorage with the popup id as the key.

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  RichTextContent,
  isRichTextEmpty,
} from "@/components/editor/rich-text-content"
import {
  generatePortalId,
  usePortal,
  type PortalPopup,
} from "@/lib/portal-store"

const FREQ_KEY = "thebigclass.portal.popup.shown.v1"

export function Popup({
  popups,
  tenant,
  pageSlug,
}: {
  popups: PortalPopup[]
  tenant: string
  pageSlug: string
}) {
  // First popup that's enabled + page-scope-matched + frequency-OK. Tab-
  // scoped state so the popup never re-fires twice within the same SPA
  // navigation even if the user clicks back+forward.
  const [active, setActive] = useState<PortalPopup | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const candidate = pickActivePopup(popups, tenant, pageSlug)
    if (!candidate) return
    setActive(candidate)
    return wireTrigger(candidate, () => setOpen(true))
  }, [popups, tenant, pageSlug])

  if (!active || !open) return null

  const close = () => {
    setOpen(false)
    recordShown(tenant, active)
  }

  const leadFormEnabled = !!active.leadForm?.enabled

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-card/80 p-1.5 text-muted-foreground backdrop-blur hover:bg-card hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {active.imageUrl && (
          <img src={active.imageUrl} alt="" className="aspect-video w-full object-cover" />
        )}
        <div className="space-y-3 p-6">
          <h3 className="font-serif text-2xl font-bold tracking-tight">{active.title}</h3>
          {!isRichTextEmpty(active.body) && (
            <RichTextContent html={active.body} className="text-sm" />
          )}
          {leadFormEnabled ? (
            <PopupLeadForm popup={active} pageSlug={pageSlug} onSuccessClose={close} />
          ) : (
            active.cta?.label &&
            active.cta.href && (
              <Button asChild className="w-full">
                <Link href={active.cta.href}>{active.cta.label}</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function pickActivePopup(
  popups: PortalPopup[],
  tenant: string,
  pageSlug: string,
): PortalPopup | null {
  const shown = readShown(tenant)
  for (const p of popups) {
    if (!p.enabled) continue
    if (p.showOnPages && p.showOnPages.length > 0 && !p.showOnPages.includes(pageSlug)) continue
    if (!frequencyAllows(p, shown[p.id])) continue
    return p
  }
  return null
}

function frequencyAllows(p: PortalPopup, lastIso?: string): boolean {
  if (!lastIso) return true
  if (p.frequency === "always") return true
  if (p.frequency === "once-per-visit") {
    // "Visit" = browser tab session. We treat any previous show in
    // localStorage as a hit; sessionStorage would be more correct but
    // not all browsers fire it across iframes.
    return false
  }
  // once-per-day
  const last = new Date(lastIso).getTime()
  return Date.now() - last > 24 * 60 * 60 * 1000
}

function readShown(tenant: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(FREQ_KEY)
    if (!raw) return {}
    const map = JSON.parse(raw) as Record<string, Record<string, string>>
    return map[tenant] ?? {}
  } catch {
    return {}
  }
}

function recordShown(tenant: string, p: PortalPopup): void {
  try {
    const raw = window.localStorage.getItem(FREQ_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {}
    map[tenant] = { ...(map[tenant] ?? {}), [p.id]: new Date().toISOString() }
    window.localStorage.setItem(FREQ_KEY, JSON.stringify(map))
  } catch {
    /* fine */
  }
}

// Inline lead-capture form rendered inside a popup when the admin
// configured one. On submit, writes through to the portal `addLead`
// store with `source="popup:<id>"` so the lead inbox shows where
// the capture came from. After a successful submit we show the
// admin-configured success message and auto-close after a couple
// of seconds.
function PopupLeadForm({
  popup,
  pageSlug,
  onSuccessClose,
}: {
  popup: PortalPopup
  pageSlug: string
  onSuccessClose: () => void
}) {
  const { addLead } = usePortal()
  const cfg = popup.leadForm!
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)

  // Disable submit until we have at least the email — every other
  // capture field is optional so the admin can mix-and-match without
  // landing leads in the inbox that have no way to reach the visitor.
  const canSubmit =
    email.trim().length > 3 &&
    (!cfg.captureName || name.trim().length > 1)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    addLead({
      id: generatePortalId("lead"),
      formId: `popup:${popup.id}`,
      pageSlug,
      name: cfg.captureName ? name.trim() : undefined,
      email: email.trim().toLowerCase(),
      phone: cfg.capturePhone ? phone.trim() || undefined : undefined,
      message: cfg.captureMessage ? message.trim() || undefined : undefined,
      source: `popup:${popup.title}`,
      status: "new",
      createdAt: new Date().toISOString(),
    })
    setSubmitted(true)
    // Give the success message a moment to register before closing.
    window.setTimeout(onSuccessClose, 2200)
  }

  if (submitted) {
    return (
      <div className="space-y-2 rounded-md border border-success/30 bg-success/5 p-4 text-center">
        <CheckCircle2 className="mx-auto h-7 w-7 text-success" />
        <p className="text-sm font-semibold text-foreground">
          {cfg.successMessage || "Thanks — we'll be in touch shortly."}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      {cfg.captureName && (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
      )}
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        required
      />
      {cfg.capturePhone && (
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
        />
      )}
      {cfg.captureMessage && (
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything we should know? (optional)"
          rows={3}
        />
      )}
      <Button type="submit" disabled={!canSubmit} className="w-full">
        {cfg.submitLabel || "Send"}
      </Button>
      <p className="text-center text-[10px] text-muted-foreground">
        We&apos;ll never share your details.
      </p>
    </form>
  )
}

// Wires up the appropriate DOM listener for the popup's trigger.
// Returns a cleanup function in standard useEffect style.
function wireTrigger(p: PortalPopup, fire: () => void): () => void {
  if (p.trigger.type === "time") {
    const t = window.setTimeout(fire, Math.max(0, p.trigger.afterSec) * 1000)
    return () => window.clearTimeout(t)
  }
  if (p.trigger.type === "scroll") {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      if (max <= 0) return
      const pct = (window.scrollY / max) * 100
      const target = p.trigger.type === "scroll" ? p.trigger.percent : 50
      if (pct >= target) {
        fire()
        window.removeEventListener("scroll", onScroll)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }
  if (p.trigger.type === "exit-intent") {
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        fire()
        document.removeEventListener("mouseout", onLeave)
      }
    }
    document.addEventListener("mouseout", onLeave)
    return () => document.removeEventListener("mouseout", onLeave)
  }
  return () => {}
}
