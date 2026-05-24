"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Key,
  LibraryBig,
  Loader2,
  Receipt,
  Sparkles,
  UserPlus,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  money,
  useStore,
  type Entitlement,
} from "@/lib/store-store"
import {
  generateId,
  useLMS,
  type User as LMSUser,
} from "@/lib/lms-store"
import { StorefrontHeader } from "@/components/store/storefront-header"
import { KindBadge } from "@/app/dashboard/store/page"
import { useTenant } from "@/lib/tenant-store"
import {
  PasswordStrengthInput,
  MIN_PASSWORD_SCORE,
} from "@/components/forms/password-strength-input"
import { toast } from "sonner"

export default function OrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { orders, products, entitlements } = useStore()
  const { getCourseById, currentUser, users, addUser, updateUser, setCurrentUser } = useLMS()
  // Tenant-aware base for all "Browse store" / "My library" links.
  // The store + library now live inside the tenant portal only.
  // When the current tenant is unknown (anonymous receipt link
  // shared elsewhere) we fall back to "/" — the legacy redirect
  // stubs at /store and /library handle the second hop.
  const { currentTenant } = useTenant()
  const tenantBase = currentTenant?.slug ? `/p/${currentTenant.slug}` : ""
  const libraryHref = tenantBase ? `${tenantBase}/library` : "/library"
  const storeHref = tenantBase ? `${tenantBase}/store` : "/store"

  const order = orders.find(o => o.id === id)
  const product = order ? products.find(p => p.id === order.productId) : undefined
  void getCourseById // imported for sub-components below
  const ents = useMemo<Entitlement[]>(
    () => order ? entitlements.filter(e => e.orderId === order.id) : [],
    [entitlements, order],
  )

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <StorefrontHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground" />
          <h1 className="mt-3 text-xl font-bold">Receipt not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">The order id may be incorrect.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-6">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-3 font-serif text-2xl font-extrabold tracking-tight sm:text-3xl">
            Thank you — your purchase is confirmed.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A copy of this receipt has been sent to <span className="font-medium text-foreground">{order.customerEmail}</span>.
          </p>
        </div>

        {/* What you get */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What you got</CardTitle>
            <CardDescription>
              Open your <Link href={libraryHref} className="underline">library</Link> any time to come back to this.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entitlements were granted (subscription pending?).</p>
            ) : (
              ents.map(e => <EntitlementRow key={e.id} entitlement={e} tenantBase={tenantBase} />)
            )}
          </CardContent>
        </Card>

        {/* Guest claim CTA — only shown when no one's signed in and the
            buyer's email isn't yet linked to a user account in this
            tenant. Lets a guest checkout buyer set a password right
            here so they can sign in and find their purchase again
            without re-using the receipt link. */}
        {!currentUser && (
          <ClaimAccountCard
            email={order.customerEmail}
            name={order.customerName}
            users={users}
            tenantBase={tenantBase}
            onClaimed={(u) => setCurrentUser(u)}
            addUser={addUser}
            updateUser={updateUser}
          />
        )}

        {/* Receipt */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Receipt</CardTitle>
            <CardDescription>Order id: <span className="font-mono">{order.id}</span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-md border border-border/60 p-3">
              {product?.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.coverImageUrl} alt="" className="h-14 w-20 rounded object-cover" />
              ) : (
                <div className="h-14 w-20 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium">{order.productSnapshot.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <KindBadge kind={order.productSnapshot.kind} />
                  <Badge variant="outline" className="capitalize">{order.status}</Badge>
                </div>
              </div>
            </div>
            {/* Bump line items — surfaces each add-on the buyer ticked
                on the checkout page. Hidden when the order is purely
                the headline product. Itemising here keeps the receipt
                accurate (otherwise the Subtotal looks higher than the
                product price for no obvious reason). */}
            {order.bumpLineItems && order.bumpLineItems.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Added at checkout
                </p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {order.bumpLineItems.map((b) => (
                    <li key={b.productId} className="flex items-center justify-between gap-3">
                      <span className="line-clamp-1">{b.title}</span>
                      <span className="shrink-0 tabular-nums">
                        {money(b.amount, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-1 border-t border-border pt-3">
              <ReceiptRow label="Customer">{order.customerName} · {order.customerEmail}</ReceiptRow>
              <ReceiptRow label="When">{new Date(order.createdAt).toLocaleString()}</ReceiptRow>
              <ReceiptRow label="Payment">{order.paymentMethod}{order.paymentReference ? ` · ${order.paymentReference.slice(-10)}` : ""}</ReceiptRow>
              <ReceiptRow label="Subtotal">{money(order.subtotal, order.currency)}</ReceiptRow>
              {order.discount > 0 && (
                <ReceiptRow label={`Coupon (${order.couponCode})`}>
                  <span className="text-success">−{money(order.discount, order.currency)}</span>
                </ReceiptRow>
              )}
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total paid</span>
                <span className="tabular-nums">{money(order.total, order.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-3 pb-8 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={libraryHref}>
              <LibraryBig className="mr-2 h-4 w-4" />
              Go to my library
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={storeHref}>Keep browsing</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}

function ReceiptRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  )
}

function EntitlementRow({ entitlement, tenantBase }: { entitlement: Entitlement; tenantBase: string }) {
  const { products } = useStore()
  const { getCourseById } = useLMS()
  const product = products.find(p => p.id === entitlement.productId)

  // Each entitlement type has a different "open" action.
  if (entitlement.type === "course" && entitlement.reference) {
    const course = getCourseById(entitlement.reference)
    if (!course) {
      return <SimpleRow label={product?.title ?? "Course"} icon={<BookOpen className="h-4 w-4" />} hint="Course not found" />
    }
    return (
      <ActionRow
        icon={<BookOpen className="h-4 w-4" />}
        title={course.title}
        href={tenantBase ? `${tenantBase}/learn/${course.slug}` : `/learn/${course.slug}`}
        cta="Start learning"
      />
    )
  }
  if (entitlement.type === "download" && product && product.delivery.kind === "file-download") {
    return (
      <div className="rounded-md border border-border/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm">
          <Download className="h-4 w-4 text-primary" />
          <span className="font-medium">{product.title}</span>
        </div>
        <ul className="space-y-1.5">
          {product.delivery.files.map(f => (
            <li key={f.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate font-medium">{f.filename}</span>
              <Button size="sm" variant="outline" asChild>
                <a href={f.url} download={f.filename} target="_blank" rel="noreferrer">
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (entitlement.type === "session" && product && product.delivery.kind === "session") {
    return (
      <ActionRow
        icon={<CalendarClock className="h-4 w-4" />}
        title={product.title}
        href={product.delivery.bookingUrl ?? "#"}
        external
        cta={product.delivery.bookingUrl ? "Book your session" : "Booking link coming"}
        hint={`${product.delivery.durationMinutes} min session`}
      />
    )
  }
  if (entitlement.type === "webinar" && product && product.delivery.kind === "webinar") {
    return (
      <ActionRow
        icon={<Video className="h-4 w-4" />}
        title={product.title}
        href={product.delivery.meetingUrl ?? "#"}
        external
        cta={product.delivery.meetingUrl ? "Join webinar" : "Link coming"}
        hint={product.delivery.scheduledAt ? new Date(product.delivery.scheduledAt).toLocaleString() : undefined}
      />
    )
  }
  if (entitlement.type === "license" && entitlement.reference) {
    return <LicenseRow productTitle={product?.title ?? "License"} licenseKey={entitlement.reference} />
  }
  if (entitlement.type === "membership" && product) {
    return (
      <ActionRow
        icon={<Sparkles className="h-4 w-4" />}
        title={`${product.title} — membership`}
        href={tenantBase ? `${tenantBase}/library` : "/library"}
        cta="Open library"
        hint={entitlement.expiresAt ? `Renews ${new Date(entitlement.expiresAt).toLocaleDateString()}` : undefined}
      />
    )
  }
  return <SimpleRow label={product?.title ?? "Item"} icon={<Sparkles className="h-4 w-4" />} hint={entitlement.type} />
}

function ActionRow({ icon, title, href, cta, hint, external }: { icon: React.ReactNode; title: string; href: string; cta: string; hint?: string; external?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/60 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {external ? (
        <Button size="sm" variant="outline" asChild>
          <a href={href} target="_blank" rel="noreferrer">{cta} <ExternalLink className="ml-1 h-3 w-3" /></a>
        </Button>
      ) : (
        <Button size="sm" asChild><Link href={href}>{cta}</Link></Button>
      )}
    </div>
  )
}

function SimpleRow({ label, icon, hint }: { label: string; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/60 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

function LicenseRow({ productTitle, licenseKey }: { productTitle: string; licenseKey: string }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(licenseKey) } catch { /* ignore */ }
  }
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Key className="h-4 w-4 text-primary" />
        <span className="font-medium">{productTitle}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2 py-1.5">
        <code className="flex-1 truncate font-mono text-sm font-semibold tracking-wider">{licenseKey}</code>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copy} title="Copy">
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// Inline "claim your account" card for guest buyers. Lets them attach
// a password to the email they paid with so they can sign in later
// and reach the purchase from /p/<slug>/my without re-using the
// receipt URL. For the POC we provision the LMS user row directly —
// when a real auth backend lands, swap the body of `claim()` for a
// proper /api/auth/signup-from-purchase call.
function ClaimAccountCard({
  email,
  name,
  users,
  tenantBase,
  addUser,
  updateUser,
  onClaimed,
}: {
  email: string
  name: string
  users: LMSUser[]
  tenantBase: string
  addUser: (u: LMSUser) => void
  updateUser: (id: string, patch: Partial<LMSUser>) => void
  onClaimed: (u: LMSUser) => void
}) {
  const router = useRouter()
  // Skip the card entirely when the buyer already has a User row in
  // this tenant — they should be signing in instead.
  const existing = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  )
  const [pw, setPw] = useState("")
  const [pwValid, setPwValid] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (existing) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-base font-semibold">Already have an account</p>
            <p className="text-sm text-muted-foreground">
              Sign in with <span className="font-medium text-foreground">{email}</span> to find this purchase on your learner dashboard.
            </p>
          </div>
          <Button asChild>
            <Link href={tenantBase ? `${tenantBase}/login` : "/login"}>Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const canSubmit = pwValid && pw === confirm && !submitting

  const claim = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      // POC: provision the user directly. When real auth lands, this
      // should POST to a signup endpoint that hashes the password and
      // sets a session cookie.
      const newUser: LMSUser = {
        id: generateId("user"),
        name: name.trim() || email.split("@")[0],
        email: email.toLowerCase(),
        role: "student",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      }
      addUser(newUser)
      // updateUser would no-op for a brand-new row — keep the reference
      // around so TypeScript doesn't flag it as unused while the real
      // backend is missing.
      void updateUser
      onClaimed(newUser)
      toast.success("Account created — taking you to your dashboard.")
      const dest = tenantBase ? `${tenantBase}/my` : "/dashboard"
      setTimeout(() => router.push(dest), 600)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4 text-primary" />
          Claim your account
        </CardTitle>
        <CardDescription>
          Set a password so you can sign back in with{" "}
          <span className="font-medium text-foreground">{email}</span> and find this purchase later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void claim()
          }}
        >
          <PasswordStrengthInput
            label="Choose a password"
            value={pw}
            onChange={(next, valid) => {
              setPw(next)
              setPwValid(valid)
            }}
            confirmValue={confirm}
            onConfirmChange={setConfirm}
            userInputs={[email, name]}
            minScore={MIN_PASSWORD_SCORE}
          />
          <Button type="submit" disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create my account
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

