"use client"

// Compact language picker for the customer portal header. Reads
// + writes through useT() so the change persists across
// navigation and across browser sessions.

import { Languages } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SUPPORTED_LOCALES, useT } from "@/lib/i18n"

interface Props {
  // Optional className for tightening / loosening the trigger to
  // fit different header variants without code duplication.
  className?: string
}

export function LanguagePicker({ className }: Props) {
  const { locale, setLocale, t, multilingualEnabled, enabledLocales } = useT()
  // Tenant turned multilingual off — render nothing. The portal still
  // shows in the configured default locale; this just removes the
  // dead picker from the header.
  if (!multilingualEnabled) return null

  // Apply the tenant's enabled-locales filter on top of the built-in
  // "ready vs coming soon" flag. If the tenant didn't customise the
  // list (enabledLocales undefined), we keep the original behaviour
  // — show ready locales selectable, coming-soon ones as disabled.
  const tenantEnabled = enabledLocales
  const filtered = tenantEnabled
    ? SUPPORTED_LOCALES.filter((l) => tenantEnabled.includes(l.code))
    : SUPPORTED_LOCALES
  // Edge case: tenant disabled every locale. Hiding the picker is
  // the right call — there's nothing to switch to.
  if (filtered.length <= 1) return null
  const active = filtered.find((l) => l.code === locale) ?? filtered[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground",
          className,
        )}
        aria-label={t("header.language")}
      >
        <Languages className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{active.flag}</span>
        <span>{active.code.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {filtered.map((l) => (
          <DropdownMenuItem
            key={l.code}
            disabled={l.disabled}
            onClick={() => !l.disabled && setLocale(l.code)}
            className={cn(
              "flex items-center gap-2 text-sm",
              l.code === locale && "bg-primary/5 font-medium text-primary",
              l.disabled && "opacity-60",
            )}
          >
            <span>{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {l.disabled && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Soon
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
