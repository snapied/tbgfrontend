"use client"

// Font picker that shows each option rendered in its own face, plus
// a tab to upload a custom font file. The select-trigger shows the
// current font's name set in its actual typeface so the teacher can
// see-at-a-glance what's selected.
//
// Implementation note: Google Fonts loaded via GoogleFontLoader so
// every row in the dropdown shows the real face. Custom fonts come in
// via the file upload — we POST to /api/uploads, register an
// @font-face rule inline, and store the resolved URL.

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, Type as TypeIcon, Upload, X } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoogleFontLoader } from "@/components/portal/font-loader"
import { uploadAsset } from "@/lib/upload-asset"
import { cn } from "@/lib/utils"

export interface CustomFont {
  family: string  // What we set as font-family
  url: string     // Where the font file lives (path)
}

interface Props {
  // Pre-built list of Google Fonts to show in the gallery.
  options: string[]
  // Current value — Google family name or custom family name.
  value: string
  onChange: (family: string | undefined) => void
  // Custom fonts the workspace has uploaded.
  customFonts: CustomFont[]
  onCustomFontsChange: (next: CustomFont[]) => void
  // Sample text shown in each row + the trigger. Pass "Aa" for compact.
  sample?: string
  label?: string
}

export function FontPicker({
  options,
  value,
  onChange,
  customFonts,
  onCustomFontsChange,
  sample = "The quick brown fox jumps",
  label,
}: Props) {
  const [open, setOpen] = useState(false)

  // Names we need to ask Google Fonts for. Includes whatever's
  // currently selected (so the trigger renders right) + every visible
  // option in the dropdown.
  const googleFamilies = useMemo(() => {
    const set = new Set<string>(options)
    if (value && !customFonts.some((f) => f.family === value)) set.add(value)
    return [...set]
  }, [options, value, customFonts])

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <GoogleFontLoader families={googleFamilies} />
      {customFonts.map((f) => (
        // Register every custom font as an @font-face so it's usable
        // by name elsewhere on the page. The CSS escape avoids string
        // injection if the user's filename had quirky characters.
        <style
          key={f.family}
          dangerouslySetInnerHTML={{
            __html: `@font-face { font-family: "${escape(f.family)}"; src: url("${escape(f.url)}"); font-display: swap; }`,
          }}
        />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-sm hover:bg-muted/40"
          >
            <span className="flex min-w-0 items-center gap-3">
              <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span
                className="truncate text-base"
                style={value ? { fontFamily: `"${value}", sans-serif` } : undefined}
              >
                {value || "Default (platform)"}
              </span>
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[420px] p-0">
          <Tabs defaultValue="gallery">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="max-h-[420px] overflow-y-auto p-2">
              <FontRow
                family=""
                label="Default (platform)"
                sample={sample}
                active={!value}
                onPick={() => { onChange(undefined); setOpen(false) }}
              />
              {customFonts.length > 0 && (
                <>
                  <p className="mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your fonts
                  </p>
                  {customFonts.map((f) => (
                    <div key={f.family} className="flex items-center">
                      <FontRow
                        family={f.family}
                        label={f.family}
                        sample={sample}
                        active={value === f.family}
                        onPick={() => { onChange(f.family); setOpen(false) }}
                      />
                      <button
                        type="button"
                        title="Remove custom font"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (value === f.family) onChange(undefined)
                          onCustomFontsChange(customFonts.filter((x) => x.family !== f.family))
                        }}
                        className="ml-1 mr-2 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}
              <p className="mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Google Fonts
              </p>
              {options.map((f) => (
                <FontRow
                  key={f}
                  family={f}
                  label={f}
                  sample={sample}
                  active={value === f}
                  onPick={() => { onChange(f); setOpen(false) }}
                />
              ))}
            </TabsContent>

            <TabsContent value="upload" className="p-4">
              <UploadCustomFont
                existing={customFonts}
                onAdd={(font) => {
                  onCustomFontsChange([...customFonts, font])
                  onChange(font.family)
                }}
              />
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// One row in the gallery — clickable, shows the sample in the font.
function FontRow({
  family,
  label,
  sample,
  active,
  onPick,
}: {
  family: string
  label: string
  sample: string
  active: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition hover:bg-muted/50",
        active && "bg-primary/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p
          className="truncate text-lg"
          style={family ? { fontFamily: `"${family}", sans-serif` } : undefined}
        >
          {sample}
        </p>
      </div>
      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  )
}

// Upload a custom font file. Accepts woff2 / woff / ttf / otf — the
// modern browsers all handle these inline via @font-face from a URL.
function UploadCustomFont({
  existing,
  onAdd,
}: {
  existing: CustomFont[]
  onAdd: (font: CustomFont) => void
}) {
  const [family, setFamily] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!file || !family.trim()) {
      setError("Pick a font file and give it a name.")
      return
    }
    if (existing.some((f) => f.family === family.trim())) {
      setError("A font with that name already exists.")
      return
    }
    setUploading(true)
    setError(null)
    try {
      const result = await uploadAsset(file, "workspace")
      onAdd({ family: family.trim(), url: result.url })
      setFamily("")
      setFile(null)
    } catch (e) {
      setError((e as Error).message ?? "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Font family name</Label>
        <Input
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="My Brand Sans"
        />
        <p className="text-[10px] text-muted-foreground">
          Used as the CSS font-family value. Whatever the file is actually called doesn&apos;t matter.
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Font file (.woff2, .woff, .ttf, .otf)</Label>
        <Input
          type="file"
          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button onClick={submit} disabled={uploading || !file || !family.trim()} className="w-full">
        {uploading ? "Uploading…" : <><Upload className="mr-1.5 h-3.5 w-3.5" /> Add font</>}
      </Button>
    </div>
  )
}

function escape(s: string): string {
  return s.replace(/["\\]/g, "\\$&")
}
