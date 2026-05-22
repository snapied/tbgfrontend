"use client"

// Student settings. Edits the LMS-store User row in place via
// updateUser. Three blocks:
//   1. Profile — display name, phone, avatar URL.
//   2. Notification channels — in-app / email / WhatsApp opt-out.
//      The dispatcher (lib/notifications.ts) honours these flags
//      automatically; nothing else needs to change here.
//   3. Timezone — IANA string used everywhere we render class times
//      (for now informational; UI consumers default to the browser
//      zone when this is unset).
//
// Saves are debounced into a single "Save changes" button so the
// student isn't surprised by background writes.

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Bell,
  Loader2,
  MessageSquare,
  Phone,
  Save,
  Trash2,
  Upload,
  User as UserIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLMS } from "@/lib/lms-store"
import { compressImage, COMPRESS_PRESETS } from "@/lib/image-compress"
import { uploadAsset } from "@/lib/upload-asset"
import { toast } from "sonner"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_SETTINGS_TOUR,
  STUDENT_SETTINGS_TOUR_ID,
} from "@/components/student/tours"

// Short, opinionated timezone list focused on the LMS's primary
// markets. Students whose zone isn't listed can leave the field on
// "Browser default" and it'll use the runtime locale.
// Radix Select rejects "" as an item value, so we use a sentinel
// for "no preference" and translate it on read/write.
const TZ_DEFAULT_SENTINEL = "__browser__"

const TIMEZONES: { value: string; label: string }[] = [
  { value: TZ_DEFAULT_SENTINEL, label: "Browser default" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
  { value: "UTC", label: "UTC" },
]

export default function MySettingsPage() {
  const { currentUser, updateUser } = useLMS()

  const initial = useMemo(
    () => ({
      name: currentUser?.name ?? "",
      phone: currentUser?.phone ?? "",
      avatar: currentUser?.avatar ?? "",
      timezone: currentUser?.timezone ?? "",
      inApp: currentUser?.notificationChannels?.inApp !== false,
      email: currentUser?.notificationChannels?.email !== false,
      whatsapp: currentUser?.notificationChannels?.whatsapp !== false,
    }),
    [currentUser],
  )

  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [avatar, setAvatar] = useState(initial.avatar)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [inApp, setInApp] = useState(initial.inApp)
  const [emailOn, setEmailOn] = useState(initial.email)
  const [whatsappOn, setWhatsappOn] = useState(initial.whatsapp)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Pick a photo from disk → compress to the 400-px avatar preset →
  // upload via the asset backend. If the backend is missing or fails,
  // we fall back to the compressed data: URL so the photo still
  // renders locally (it just won't survive a cross-device sign-in).
  // Either way the `avatar` field gets set and the student has to
  // hit Save to persist.
  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file (PNG, JPG, or WebP).")
      return
    }
    setUploading(true)
    try {
      let dataUrl: string | undefined
      let toUpload: File = file
      try {
        const compressed = await compressImage(file, COMPRESS_PRESETS.avatar)
        dataUrl = compressed.url
        const dataPart = compressed.url.split(",")[1] ?? ""
        const bin = atob(dataPart)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const ext = compressed.mime === "image/webp" ? "webp" : "jpg"
        const renamed = file.name.replace(/\.[^.]+$/, "") + "." + ext
        toUpload = new File([bytes], renamed, { type: compressed.mime })
      } catch {
        // Compression failed — push the raw file through anyway.
      }
      try {
        const { url } = await uploadAsset(toUpload, "students")
        setAvatar(url)
        toast.success("Photo uploaded — hit Save to apply.")
      } catch (err) {
        // Backend not configured / network down. Fall back to the
        // compressed data URL so the student still sees their photo
        // locally; warn them that it won't sync to other devices.
        if (dataUrl) {
          setAvatar(dataUrl)
          toast.warning(
            "Saved locally — backend uploads are off, so this photo won't sync to other devices.",
          )
        } else {
          toast.error((err as Error).message ?? "Upload failed.")
        }
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Re-sync local state when the underlying user record reloads (e.g.
  // the LMS store hydrates from localStorage after the first render).
  useEffect(() => {
    setName(initial.name)
    setPhone(initial.phone)
    setAvatar(initial.avatar)
    setTimezone(initial.timezone)
    setInApp(initial.inApp)
    setEmailOn(initial.email)
    setWhatsappOn(initial.whatsapp)
  }, [initial])

  const dirty =
    name !== initial.name ||
    phone !== initial.phone ||
    avatar !== initial.avatar ||
    timezone !== initial.timezone ||
    inApp !== initial.inApp ||
    emailOn !== initial.email ||
    whatsappOn !== initial.whatsapp

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to update your settings.
        </CardContent>
      </Card>
    )
  }

  const save = () => {
    updateUser(currentUser.id, {
      name: name.trim() || currentUser.name,
      phone: phone.trim() || undefined,
      avatar: avatar.trim() || undefined,
      timezone: timezone || undefined,
      notificationChannels: {
        inApp,
        email: emailOn,
        whatsapp: whatsappOn,
      },
    })
    toast.success("Settings saved.")
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_SETTINGS_TOUR_ID} steps={STUDENT_SETTINGS_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your profile, notification channels, and time zone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId={STUDENT_SETTINGS_TOUR_ID} />
          <Button onClick={save} disabled={!dirty}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save changes
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            Profile
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="set-name">Display name</Label>
              <Input
                id="set-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-phone">Phone (for WhatsApp)</Label>
              <Input
                id="set-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Profile photo</Label>
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 ring-1 ring-border">
                {avatar ? <AvatarImage src={avatar} alt={name || currentUser.name} /> : null}
                <AvatarFallback className="text-lg">
                  {(name || currentUser.name).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        {avatar ? "Change photo" : "Upload photo"}
                      </>
                    )}
                  </Button>
                  {avatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatar("")}
                      disabled={uploading}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                      Remove
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleFile(f)
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a square photo for best results (PNG / JPG / WebP, auto-resized to 400 px).
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-avatar" className="text-xs">…or paste an image URL</Label>
              <Input
                id="set-avatar"
                value={avatar.startsWith("data:") ? "" : avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://…"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Falls back to your initials when blank.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={currentUser.email} disabled />
            <p className="text-xs text-muted-foreground">
              Email is your sign-in identity and can&apos;t be changed here.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifications
          </div>
          <p className="text-xs text-muted-foreground">
            Choose how you hear from your teachers. Critical security messages always come through.
          </p>
          <ChannelToggle
            icon={<Bell className="h-4 w-4 text-muted-foreground" />}
            label="In-app inbox"
            description="The bell in the header + the Inbox page."
            checked={inApp}
            onChange={setInApp}
          />
          <ChannelToggle
            icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
            label="Email"
            description={`Sent to ${currentUser.email}.`}
            checked={emailOn}
            onChange={setEmailOn}
          />
          <ChannelToggle
            icon={<Phone className="h-4 w-4 text-muted-foreground" />}
            label="WhatsApp"
            description={
              phone || currentUser.phone
                ? `Sent to ${phone || currentUser.phone}.`
                : "Add a phone number above to enable WhatsApp."
            }
            checked={whatsappOn}
            disabled={!phone && !currentUser.phone}
            onChange={setWhatsappOn}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            Time zone
          </div>
          <div className="space-y-1.5">
            <Label>Display times in</Label>
            <Select
              value={timezone || TZ_DEFAULT_SENTINEL}
              onValueChange={(v) => setTimezone(v === TZ_DEFAULT_SENTINEL ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Browser default" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Class schedules and recording timestamps render in this zone.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ChannelToggle({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}
