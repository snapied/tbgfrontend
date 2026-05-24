"use client"

// Portal → Languages admin. Three concerns on one page:
//
//   1. Master switch — multilingual on/off for the public portal.
//      When off, the LanguagePicker hides itself and the portal
//      renders in `defaultLocale` only.
//
//   2. Per-language toggles — admins pick which locales appear in
//      the picker. Defaults to every locale that ships a dictionary.
//
//   3. Content browser — every dictionary key is listed alongside
//      the English source string. Admins can drop a per-tenant
//      override per (locale, key) pair without touching code; the
//      override gets merged on top of the built-in dictionary at
//      render time.
//
// Everything writes through usePortal().updateConfig() so changes
// flow through the standard publish-draft flow.

import { useState, useMemo } from "react"
import { Globe, Languages as LanguagesIcon, Search, Save, RotateCcw, Lock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"
import { toast } from "sonner"
import { usePortal, DEFAULT_I18N_CONFIG, type PortalI18nConfig } from "@/lib/portal-store"
import {
  SUPPORTED_LOCALES,
  DICTIONARIES,
  type Locale,
  type Dictionary,
} from "@/lib/i18n"
import { cn } from "@/lib/utils"

// Collects every tenant-configured string that participates in the
// portal chrome (nav CTAs, page nav labels, curated nav items, footer
// columns). Each entry returns the key the i18n provider's tenantT()
// looks up + the English source the admin originally typed. Adding a
// new translatable surface is one push() away.
interface TenantString {
  key: string
  label: string
  source: string
  surface: string
}

// "Ready" locales are the ones that ship with a real, hand-translated
// dictionary in /lib/i18n.tsx. The picker still lists "coming soon"
// ones with a Soon badge, but admins can't enable them yet — there's
// nothing to translate to.
const READY_LOCALES = SUPPORTED_LOCALES.filter((l) => !l.disabled)
const ALL_KEYS = Object.keys(DICTIONARIES.en) as (keyof Dictionary)[]

export default function LanguagesAdminPage() {
  // Plan gate: Languages + per-tenant translations is a paid feature
  // (Pro and above). The gate renders the actual admin page as a
  // dimmed preview underneath the upgrade card, so Starter users see
  // exactly what they'd get — defence-in-depth alongside the sidebar
  // plan-lock icon on the nav entry.
  return (
    <PlanFeatureGate feature="multilingual">
      <LanguagesAdminPageInner />
    </PlanFeatureGate>
  )
}

function LanguagesAdminPageInner() {
  const { config, updateConfig, pages } = usePortal()
  const current = config.i18n ?? DEFAULT_I18N_CONFIG

  const [draft, setDraft] = useState<PortalI18nConfig>(current)
  const [search, setSearch] = useState("")
  const [filterLocale, setFilterLocale] = useState<"en" | Locale>("en")

  // Build the live list of tenant-content strings from the current
  // portal config. These mirror the keys site-header / site-footer
  // ask tenantT() for at render time, so every entry here actually
  // takes effect once the admin types a translation. When the admin
  // changes their nav / pages, this list automatically reflects it.
  const tenantStrings: TenantString[] = useMemo(() => {
    const out: TenantString[] = []
    const nav = config.nav ?? {}
    if (nav.primaryCta?.label) {
      out.push({
        key: "nav.primaryCta.label",
        label: "Header — primary CTA",
        source: nav.primaryCta.label,
        surface: "Header",
      })
    }
    if (nav.secondaryCta?.label) {
      out.push({
        key: "nav.secondaryCta.label",
        label: "Header — secondary CTA",
        source: nav.secondaryCta.label,
        surface: "Header",
      })
    }
    if (nav.items && nav.items.length > 0) {
      nav.items.forEach((it, idx) => {
        out.push({
          key: `nav.items.${idx}.label`,
          label: `Header nav item #${idx + 1}`,
          source: it.label,
          surface: "Header",
        })
      })
    } else {
      // Auto-built nav uses the page's own navLabel / title — surface
      // each visible page so the admin can translate them.
      pages
        .filter((p) => p.showInNav && p.status === "published")
        .forEach((p) => {
          out.push({
            key: `page.${p.id}.navLabel`,
            label: `Page nav label — ${p.title}`,
            source: p.navLabel ?? p.title,
            surface: "Header",
          })
        })
    }
    if (config.footerCopyright) {
      out.push({
        key: "footer.copyright",
        label: "Footer copyright (when overridden)",
        source: config.footerCopyright,
        surface: "Footer",
      })
    }
    config.footerColumns.forEach((col, idx) => {
      out.push({
        key: `footer.column.${idx}.heading`,
        label: `Footer column #${idx + 1} heading`,
        source: col.heading,
        surface: "Footer",
      })
      col.links?.forEach((lnk, lidx) => {
        out.push({
          key: `footer.column.${idx}.link.${lidx}.label`,
          label: `Footer link — ${col.heading}`,
          source: lnk.label,
          surface: "Footer",
        })
      })
    })
    return out
  }, [config.nav, config.footerColumns, config.footerCopyright, pages])

  const dirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(current)
  }, [draft, current])

  const save = () => {
    updateConfig({ i18n: draft })
    toast.success("Language settings saved — they apply to the public portal immediately.")
  }

  const reset = () => {
    setDraft(DEFAULT_I18N_CONFIG)
    toast.message("Reverted to defaults — hit Save to publish.")
  }

  const toggleLocale = (code: Locale, on: boolean) => {
    setDraft((d) => {
      const next = new Set(d.enabledLocales)
      if (on) next.add(code)
      else next.delete(code)
      // Never let the admin disable every locale — the picker needs
      // at least the default to render.
      if (next.size === 0) next.add(d.defaultLocale as Locale)
      // If the default itself was just disabled, swap default to the
      // first remaining enabled locale so the portal still has
      // something coherent to render.
      let nextDefault = d.defaultLocale
      if (!next.has(d.defaultLocale as Locale)) {
        nextDefault = Array.from(next)[0]
      }
      return {
        ...d,
        enabledLocales: Array.from(next),
        defaultLocale: nextDefault,
      }
    })
  }

  // Accepts a Dictionary key (platform chrome) or a free-form tenant
  // key like "nav.primaryCta.label". For built-in dictionary keys we
  // compare to the source and drop the override when they match; for
  // tenant keys an empty value clears the override.
  const setOverride = (code: Locale, key: string, value: string) => {
    setDraft((d) => {
      const overrides = { ...(d.overrides ?? {}) }
      const forLocale = { ...(overrides[code] ?? {}) }
      const builtin =
        (DICTIONARIES[code] as unknown as Record<string, string>)?.[key] ?? ""
      if (!value || value === builtin) {
        delete forLocale[key]
      } else {
        forLocale[key] = value
      }
      if (Object.keys(forLocale).length === 0) {
        delete overrides[code]
      } else {
        overrides[code] = forLocale
      }
      return { ...d, overrides }
    })
  }

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ALL_KEYS
    return ALL_KEYS.filter((k) => {
      if (k.toLowerCase().includes(q)) return true
      const en = DICTIONARIES.en[k]?.toLowerCase() ?? ""
      if (en.includes(q)) return true
      const localised = DICTIONARIES[filterLocale]?.[k]?.toLowerCase() ?? ""
      if (localised.includes(q)) return true
      return false
    })
  }, [search, filterLocale])

  const filteredTenantStrings = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tenantStrings
    return tenantStrings.filter((s) => {
      if (s.label.toLowerCase().includes(q)) return true
      if (s.source.toLowerCase().includes(q)) return true
      if (s.key.toLowerCase().includes(q)) return true
      const override = draft.overrides?.[filterLocale]?.[s.key]?.toLowerCase() ?? ""
      if (override.includes(q)) return true
      return false
    })
  }, [search, tenantStrings, draft.overrides, filterLocale])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LanguagesIcon className="h-6 w-6 text-primary" />
            Languages & translations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick which languages your portal offers, set the default, and tweak any string without a code change.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty} className="gap-1">
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </header>

      {/* What's translatable vs not — flag this up-front so admins
          know which strings will switch when they flip the picker,
          and which ones still need a per-page edit. */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-2">
            <p className="font-medium">What this page controls</p>
            <p className="text-muted-foreground">
              The language picker switches <strong>platform chrome</strong> — header nav (Courses, Blog, Sign in), the language picker, the footer&apos;s &ldquo;Powered by&rdquo; and &ldquo;All rights reserved&rdquo; lines, and the auth flow. Everything in the Translation content table below is part of that chrome.
            </p>
            <p className="text-muted-foreground">
              <strong>Tenant content stays where you wrote it.</strong> Page nav labels, hero headlines, section copy, footer column titles, your custom CTA labels, and blog posts won&apos;t auto-translate — they live on each individual page in the Pages editor. If you need a Hindi version of your hero, duplicate the page (or section) and write the Hindi copy there.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Master switch + default locale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Multilingual mode
          </CardTitle>
          <CardDescription>
            Turn this off if you want a single-language portal — the picker disappears and visitors see the default locale only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">Multilingual portal</p>
              <p className="text-xs text-muted-foreground">
                When on, visitors get a language picker in the header and can switch any time.
              </p>
            </div>
            <Switch
              checked={draft.multilingualEnabled}
              onCheckedChange={(v) =>
                setDraft((d) => ({ ...d, multilingualEnabled: v === true }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-sm">Default language</Label>
            <Select
              value={draft.defaultLocale}
              onValueChange={(v) => setDraft((d) => ({ ...d, defaultLocale: v }))}
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READY_LOCALES.filter((l) =>
                  draft.enabledLocales.includes(l.code),
                ).map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="mr-2">{l.flag}</span>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Rendered on first paint and pinned when multilingual mode is off. Must be one of the enabled languages below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Per-locale toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available languages</CardTitle>
          <CardDescription>
            Untick any language you don&apos;t want to offer. Ten Indian languages ship with native translations; non-Indian languages are on the roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORTED_LOCALES.map((l) => {
              const enabled = draft.enabledLocales.includes(l.code)
              const ready = !l.disabled
              return (
                <label
                  key={l.code}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border bg-card p-3 text-sm transition-colors",
                    enabled && ready && "border-primary/40 bg-primary/5",
                    !ready && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Checkbox
                    checked={enabled}
                    onCheckedChange={(v) => ready && toggleLocale(l.code, v === true)}
                    disabled={!ready}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span>{l.flag}</span>
                      <span className="font-medium">{l.label}</span>
                      {!ready && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Soon
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {l.code.toUpperCase()}
                      {l.code === draft.defaultLocale && " · default"}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Translation coverage — quick per-locale "how much have I
          actually translated?" widget. Shows two ratios: tenant-string
          overrides (your CTAs, page nav labels, footer headings) and
          platform-chrome overrides (overrides on top of the built-in
          dictionary you've taken away from the default). Built-in
          ready locales start at 100% chrome coverage because every key
          ships hand-translated; the override count is purely about
          the strings YOU want to deviate from. Tenant strings start at
          0% because nothing ships with translations for your custom
          copy. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage</CardTitle>
          <CardDescription>
            Per-locale view of what&apos;s translated. Tenant strings need a per-locale override
            from you; platform chrome ships translated for ready languages — the override count
            is just strings you&apos;ve customised on top of the defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Language</th>
                  <th className="py-2 pr-3 text-right">Tenant strings</th>
                  <th className="py-2 pr-3 text-right">Chrome overrides</th>
                  <th className="py-2 pl-3">Translation status</th>
                </tr>
              </thead>
              <tbody>
                {READY_LOCALES.filter((l) => draft.enabledLocales.includes(l.code)).map((l) => {
                  const overrides = draft.overrides?.[l.code] ?? {}
                  const overrideKeys = Object.keys(overrides)
                  const tenantKeys = new Set(tenantStrings.map((s) => s.key))
                  const tenantOverrides = overrideKeys.filter((k) => tenantKeys.has(k)).length
                  const chromeOverrides = overrideKeys.filter((k) => !tenantKeys.has(k)).length
                  const tenantTotal = tenantStrings.length
                  const tenantPct = tenantTotal === 0 ? 1 : tenantOverrides / tenantTotal
                  const isDefault = l.code === draft.defaultLocale
                  return (
                    <tr key={l.code} className="border-b border-border/50">
                      <td className="py-2.5 pr-3">
                        <span className="font-semibold">{l.flag} {l.label}</span>
                        {isDefault && (
                          <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-primary">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {l.code === draft.defaultLocale ? (
                          <span className="text-muted-foreground" title="Default locale renders the source directly — no overrides needed">
                            n/a
                          </span>
                        ) : (
                          <>
                            {tenantOverrides} / {tenantTotal}
                          </>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {chromeOverrides}
                      </td>
                      <td className="py-2.5 pl-3">
                        {l.code === draft.defaultLocale ? (
                          <span className="text-[11px] text-muted-foreground">Source language</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 max-w-[120px] flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  tenantPct >= 0.9
                                    ? "bg-emerald-500"
                                    : tenantPct >= 0.5
                                      ? "bg-amber-500"
                                      : "bg-rose-500",
                                )}
                                style={{ width: `${Math.round(tenantPct * 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold tabular-nums">
                              {Math.round(tenantPct * 100)}%
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Content browser */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Translation content</CardTitle>
          <CardDescription>
            Two tabs: <strong>Platform chrome</strong> is everything the platform ships (Sign in, Courses, &ldquo;Powered by&rdquo;). <strong>Your content</strong> is the strings you typed in the nav/footer editors — your &ldquo;Enroll Now&rdquo; CTA, page nav labels, footer column headings, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by key or text…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-locale" className="text-xs text-muted-foreground">
                Translate to
              </Label>
              <Select value={filterLocale} onValueChange={(v) => setFilterLocale(v as Locale)}>
                <SelectTrigger id="filter-locale" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {READY_LOCALES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      <span className="mr-2">{l.flag}</span>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="chrome" className="space-y-4">
            <TabsList>
              <TabsTrigger value="chrome">Platform chrome ({filteredKeys.length})</TabsTrigger>
              <TabsTrigger value="tenant">Your content ({filteredTenantStrings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="chrome" className="space-y-2">
              {filteredKeys.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No keys match &quot;{search}&quot;.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-1/4 px-3 py-2 text-left font-medium">Key</th>
                        <th className="w-1/3 px-3 py-2 text-left font-medium">English (source)</th>
                        <th className="px-3 py-2 text-left font-medium">
                          {(SUPPORTED_LOCALES.find((l) => l.code === filterLocale)?.label ?? filterLocale)} override
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeys.map((key) => {
                        const en = DICTIONARIES.en[key] ?? ""
                        const builtin = DICTIONARIES[filterLocale]?.[key] ?? en
                        const override = draft.overrides?.[filterLocale]?.[key] ?? ""
                        const isDefault = filterLocale === "en"
                        return (
                          <tr key={key} className="border-b border-border last:border-b-0 align-top">
                            <td className="px-3 py-2">
                              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">{key}</code>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{en}</td>
                            <td className="px-3 py-2">
                              {isDefault ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Lock className="h-3 w-3" />
                                  English is the source — edit on the en row above.
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <Input
                                    value={override || builtin}
                                    onChange={(e) => setOverride(filterLocale as Locale, key, e.target.value)}
                                    placeholder={builtin}
                                    className="h-8 text-sm"
                                  />
                                  {override && override !== builtin && (
                                    <p className="text-[10px] text-primary">
                                      Overrides built-in &ldquo;{builtin}&rdquo;
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tenant" className="space-y-2">
              {tenantStrings.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No tenant-configured strings yet. Once you set a primary CTA, add a page to the nav, or edit footer columns, they&apos;ll show up here for translation.
                </div>
              ) : filteredTenantStrings.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No tenant strings match &quot;{search}&quot;.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-1/4 px-3 py-2 text-left font-medium">Where</th>
                        <th className="w-1/3 px-3 py-2 text-left font-medium">Source (as you typed it)</th>
                        <th className="px-3 py-2 text-left font-medium">
                          {(SUPPORTED_LOCALES.find((l) => l.code === filterLocale)?.label ?? filterLocale)} translation
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenantStrings.map((s) => {
                        const override = draft.overrides?.[filterLocale]?.[s.key] ?? ""
                        const isDefault = filterLocale === "en"
                        return (
                          <tr key={s.key} className="border-b border-border last:border-b-0 align-top">
                            <td className="px-3 py-2">
                              <span className="text-xs font-medium">{s.label}</span>
                              <p className="mt-0.5">
                                <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{s.key}</code>
                              </p>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{s.source}</td>
                            <td className="px-3 py-2">
                              {isDefault ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Lock className="h-3 w-3" />
                                  English is your source — edit it in the nav / footer editor.
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <Input
                                    value={override}
                                    onChange={(e) => setOverride(filterLocale as Locale, s.key, e.target.value)}
                                    placeholder={`Translate “${s.source}”`}
                                    className="h-8 text-sm"
                                  />
                                  {override && (
                                    <p className="text-[10px] text-primary">
                                      Will replace &ldquo;{s.source}&rdquo; on {SUPPORTED_LOCALES.find((l) => l.code === filterLocale)?.label} pages.
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
