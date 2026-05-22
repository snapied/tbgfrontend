"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Globe,
  Link as LinkIcon,
  Loader2,
  Palette,
  Sparkles,
  Users,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/brand/logo"
import { useTenant } from "@/lib/tenant-store"
import { useOrgSettings } from "@/lib/org-settings"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { tenantPublicUrl } from "@/lib/tenant-resolver"
import { cn } from "@/lib/utils"

const STEPS = [
  { key: "import",  label: "Import",  icon: Globe },
  { key: "brand",   label: "Brand",   icon: Palette },
  { key: "domain",  label: "Domain",  icon: Globe },
  { key: "team",    label: "Team",    icon: Users },
  { key: "launch",  label: "Launch",  icon: ArrowRight },
] as const
type StepKey = typeof STEPS[number]["key"]

interface SiteMeta {
  url: string
  title?: string
  description?: string
  siteName?: string
  themeColor?: string
  logoUrl?: string
  faviconUrl?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { currentTenant, updateTenant, requestCustomDomain } = useTenant()
  const { settings, update: updateOrg } = useOrgSettings()
  const [step, setStep] = useState<StepKey>("import")

  // Brand form is bound to the org settings (already per-tenant via storage
  // key namespacing — switching tenants gives this page a clean state).
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl ?? "")
  const [primary, setPrimary] = useState(settings.brandPrimaryColor ?? "#0a3024")
  const [accent, setAccent] = useState(settings.brandAccentColor ?? "#d4af37")
  const [tagline, setTagline] = useState(settings.tagline ?? "")
  const [orgName, setOrgName] = useState(currentTenant?.name ?? settings.organisationName)

  // Website import state
  const [siteUrl, setSiteUrl] = useState("")
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importedFrom, setImportedFrom] = useState<SiteMeta | null>(null)

  const [customDomain, setCustomDomain] = useState("")
  const [inviteEmails, setInviteEmails] = useState("")

  useEffect(() => {
    setOrgName(currentTenant?.name ?? settings.organisationName)
  }, [currentTenant, settings.organisationName])

  const currentIdx = STEPS.findIndex((s) => s.key === step)

  const runImport = async () => {
    setImportError(null)
    if (!siteUrl.trim()) return
    setImporting(true)
    try {
      const res = await fetch(`/api/site-meta?url=${encodeURIComponent(siteUrl.trim())}`)
      const json = (await res.json()) as SiteMeta | { error: string }
      if (!res.ok || "error" in json) {
        setImportError(("error" in json && json.error) || "Couldn't read that site.")
        return
      }
      setImportedFrom(json)
      // Pre-fill the brand form with what we found.
      if (json.siteName || json.title) setOrgName(json.siteName ?? json.title ?? orgName)
      if (json.logoUrl) setLogoUrl(json.logoUrl)
      if (json.themeColor && /^#[0-9a-f]{6}$/i.test(json.themeColor)) setPrimary(json.themeColor)
      if (json.description) setTagline(json.description.slice(0, 140))
      // Persist what we learned onto the tenant so it sticks.
      if (currentTenant) updateTenant(currentTenant.id, {
        branding: {
          ...currentTenant.branding,
          logoUrl: json.logoUrl ?? currentTenant.branding.logoUrl,
          primaryColor: (json.themeColor && /^#[0-9a-f]{6}$/i.test(json.themeColor)) ? json.themeColor : currentTenant.branding.primaryColor,
          tagline: json.description?.slice(0, 140) ?? currentTenant.branding.tagline,
        },
        name: json.siteName ?? json.title ?? currentTenant.name,
      })
      setStep("brand")
    } catch (err) {
      setImportError((err as Error).message ?? "Network error")
    } finally {
      setImporting(false)
    }
  }

  const finish = () => {
    if (currentTenant) {
      updateTenant(currentTenant.id, {
        name: orgName.trim() || currentTenant.name,
        branding: { ...currentTenant.branding, logoUrl, primaryColor: primary, accentColor: accent, tagline },
      })
    }
    updateOrg({
      logoUrl: logoUrl || undefined,
      brandPrimaryColor: primary,
      brandAccentColor: accent,
      tagline: tagline || undefined,
      organisationName: orgName.trim() || currentTenant?.name || settings.organisationName,
    })
    router.push("/dashboard")
  }

  const next = () => {
    const i = STEPS.findIndex((s) => s.key === step)
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].key)
    else finish()
  }
  const prev = () => {
    const i = STEPS.findIndex((s) => s.key === step)
    if (i > 0) setStep(STEPS[i - 1].key)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={finish}>
            Skip for now
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Welcome{currentTenant?.ownerName ? `, ${currentTenant.ownerName.split(" ")[0]}` : ""}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-extrabold tracking-tight">
            Let&apos;s set up <span className="text-amber-600">{currentTenant?.name ?? "your workspace"}</span>.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Takes 3 minutes. You can change everything later from Settings.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            const done = idx < currentIdx
            const active = idx === currentIdx
            return (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done && "bg-success text-success-foreground",
                    active && "bg-primary text-primary-foreground",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    active ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <span className={cn("h-px flex-1", done ? "bg-success" : "bg-border")} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step body */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            {step === "import" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Already have a website?</h2>
                  <p className="text-sm text-muted-foreground">
                    Paste your URL — we&apos;ll pull your logo, name, colours, and tagline so you don&apos;t have to retype them.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="site-url">Your website</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="site-url"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runImport()}
                        placeholder="https://youracademy.com"
                        className="pl-8 font-mono"
                      />
                    </div>
                    <Button onClick={runImport} disabled={!siteUrl.trim() || importing}>
                      {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Pull branding
                    </Button>
                  </div>
                  {importError && (
                    <p className="text-xs text-destructive">{importError}</p>
                  )}
                  {importedFrom && (
                    <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-success">
                        Imported from {new URL(importedFrom.url).hostname}
                      </p>
                      <ul className="mt-2 grid gap-1 text-xs">
                        {importedFrom.siteName && <li>Name: <span className="font-medium">{importedFrom.siteName}</span></li>}
                        {importedFrom.logoUrl  && <li>Logo: <span className="font-mono">{importedFrom.logoUrl.slice(0, 60)}…</span></li>}
                        {importedFrom.themeColor && <li>Colour: <span className="font-mono">{importedFrom.themeColor}</span></li>}
                        {importedFrom.description && <li className="line-clamp-2">Tagline: {importedFrom.description}</li>}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                  No website yet? That&apos;s fine — you&apos;ll launch on{" "}
                  <span className="font-mono text-foreground">
                    {currentTenant?.slug ?? "your-slug"}.thebigclass.com
                  </span>{" "}
                  immediately. Hit <span className="font-medium">Continue</span> to skip this step.
                </div>
              </div>
            )}

            {step === "brand" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Look like yourself</h2>
                  <p className="text-sm text-muted-foreground">
                    {importedFrom
                      ? `Pre-filled from ${new URL(importedFrom.url).hostname}. Tweak whatever you want.`
                      : "Drop a logo and pick brand colours. They flow into every certificate and email."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-name">Academy name</Label>
                  <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <FileUploadField
                    value={logoUrl}
                    onChange={setLogoUrl}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    maxSizeMB={8}
                    showImagePreview
                    urlPlaceholder="https://yourdomain.com/logo.png"
                    hint="Square PNG with transparent background works best."
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ColorField label="Primary colour" value={primary} onChange={setPrimary} />
                  <ColorField label="Accent colour"  value={accent}  onChange={setAccent} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tagline (optional)</Label>
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Founded in pursuit of knowledge" />
                </div>
              </div>
            )}

            {step === "domain" && currentTenant && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Your URL</h2>
                  <p className="text-sm text-muted-foreground">
                    Your subdomain is live. Hook up a custom domain whenever you&apos;re ready.
                  </p>
                </div>
                <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-success">
                    Active workspace URL
                  </p>
                  <p className="mt-1 font-mono text-base font-medium">
                    {tenantPublicUrl(currentTenant.slug)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Anyone you share this with will see your branded storefront immediately.
                  </p>
                </div>
                <div className="space-y-2 rounded-md border border-border/60 p-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Custom domain (optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="learn.youracademy.com"
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={() => requestCustomDomain(currentTenant.id, customDomain)}
                      disabled={!customDomain.trim()}
                    >
                      Request
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After submitting, point a CNAME from{" "}
                    <span className="font-mono text-foreground">{customDomain || "learn.yourdomain.com"}</span> to{" "}
                    <span className="font-mono text-foreground">{currentTenant.slug}.thebigclass.com</span>. We&apos;ll verify
                    DNS and provision SSL automatically.
                  </p>
                </div>
              </div>
            )}

            {step === "team" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Bring your team</h2>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll send invites once SMTP is wired. For now this just queues a friendly note.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Instructor emails</Label>
                  <Input
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder="jane@academy.com, sam@academy.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated. You can invite more from{" "}
                    <Link href="/dashboard/users" className="underline">Manage Users</Link> any time.
                  </p>
                </div>
              </div>
            )}

            {step === "launch" && currentTenant && (
              <div className="space-y-3 text-sm">
                <h2 className="text-lg font-semibold">You&apos;re ready.</h2>
                <p className="text-muted-foreground">
                  Here&apos;s what to do first when you land in the dashboard:
                </p>
                <ul className="grid gap-2">
                  <Next icon={BookOpen} label="Create your first course" href="/dashboard/courses/new" />
                  <Next icon={Video} label="Schedule a live class" href="/dashboard/classes/new" />
                  <Next icon={ClipboardList} label="Post your first product in the store" href="/dashboard/store/new" />
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={prev} disabled={currentIdx === 0}>
            Back
          </Button>
          <Button onClick={next}>
            {currentIdx === STEPS.length - 1 ? "Go to dashboard" : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded-md border bg-transparent" />
      </div>
    </div>
  )
}

function Next({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 hover:bg-muted/40">
        <Icon className="h-4 w-4 text-primary" />
        <span className="flex-1 font-medium">{label}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </Link>
    </li>
  )
}
