"use client"

import { useMemo, useState } from "react"
import { Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { generateId, type User } from "@/lib/lms-store"
import { uploadAsset } from "@/lib/upload-asset"
import { PhoneInput } from "@/components/forms/phone-input"

type Draft = Partial<User> & { name: string; email: string }

const EMPTY: Draft = { name: "", email: "" }

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Compute age from a yyyy-mm-dd DOB string. Returns undefined if blank.
function ageFromDob(dob?: string): number | undefined {
  if (!dob) return undefined
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return undefined
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 150 ? age : undefined
}

export function AddStudentDialog({
  onAdd, onClose,
}: {
  onAdd: (s: User) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [phoneValid, setPhoneValid] = useState(false)
  const [resumeBusy, setResumeBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  // Auto-compute age from DOB whenever it changes — user can still override.
  const computedAge = useMemo(() => ageFromDob(draft.dateOfBirth), [draft.dateOfBirth])
  const effectiveAge = draft.age ?? computedAge

  const valid =
    draft.name.trim().length > 0 &&
    isValidEmail(draft.email.trim()) &&
    phoneValid &&                         // WhatsApp is required for every student
    (!draft.linkedInUrl || isUrlish(draft.linkedInUrl)) &&
    (!draft.githubUrl || isUrlish(draft.githubUrl)) &&
    (!draft.twitterUrl || isUrlish(draft.twitterUrl)) &&
    (!draft.portfolioUrl || isUrlish(draft.portfolioUrl))

  const onResumeFile = async (file: File) => {
    setResumeBusy(true)
    try {
      const { url } = await uploadAsset(file, "students")
      set("resumeUrl", url)
    } finally {
      setResumeBusy(false)
    }
  }
  const onAvatarFile = async (file: File) => {
    setAvatarBusy(true)
    try {
      const { url } = await uploadAsset(file, "students")
      set("avatar", url)
    } finally {
      setAvatarBusy(false)
    }
  }

  const submit = () => {
    if (!valid) return
    const out: User = {
      // Required
      id: generateId("user"),
      role: "student",
      name: draft.name.trim(),
      email: draft.email.trim(),
      createdAt: new Date().toISOString(),
      // Pass through everything else, trimmed
      avatar: draft.avatar,
      bio: draft.bio?.trim() || undefined,
      phone: draft.phone?.trim() || undefined,
      dateOfBirth: draft.dateOfBirth || undefined,
      age: effectiveAge,
      gender: draft.gender,
      addressLine1: draft.addressLine1?.trim() || undefined,
      addressLine2: draft.addressLine2?.trim() || undefined,
      city: draft.city?.trim() || undefined,
      state: draft.state?.trim() || undefined,
      postalCode: draft.postalCode?.trim() || undefined,
      country: draft.country?.trim() || undefined,
      school: draft.school?.trim() || undefined,
      schoolBoard: draft.schoolBoard?.trim() || undefined,
      college: draft.college?.trim() || undefined,
      collegeDegree: draft.collegeDegree?.trim() || undefined,
      collegeMajor: draft.collegeMajor?.trim() || undefined,
      collegeGraduationYear: draft.collegeGraduationYear,
      highestQualification: draft.highestQualification?.trim() || undefined,
      linkedInUrl: draft.linkedInUrl?.trim() || undefined,
      githubUrl: draft.githubUrl?.trim() || undefined,
      twitterUrl: draft.twitterUrl?.trim() || undefined,
      portfolioUrl: draft.portfolioUrl?.trim() || undefined,
      resumeUrl: draft.resumeUrl,
      notes: draft.notes?.trim() || undefined,
    }
    onAdd(out)
    setDraft(EMPTY)
  }

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Add a student</DialogTitle>
        <DialogDescription>
          Name, email, and a WhatsApp number are required so we can reach the student.
          Everything else is optional and can be filled in later from the student's profile page.
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="online">Online</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <ScrollArea className="mt-2 h-[420px] pr-3">
          <TabsContent value="basic" className="space-y-4 outline-none">
            <Field label="Full name *">
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Aanya Sharma" />
            </Field>
            <Field label="Email *">
              <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="aanya@example.com" />
              {draft.email && !isValidEmail(draft.email) && (
                <p className="mt-1 text-[11px] text-destructive">Doesn't look like a valid email.</p>
              )}
            </Field>
            <Field label="WhatsApp number *">
              <PhoneInput
                value={draft.phone ?? ""}
                onChange={(e164, valid) => { set("phone", e164); setPhoneValid(valid) }}
                whatsapp
                required
                placeholder="98765 43210"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of birth">
                <Input type="date" value={draft.dateOfBirth ?? ""} onChange={(e) => set("dateOfBirth", e.target.value)} />
                {computedAge !== undefined && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Age: {computedAge}</p>
                )}
              </Field>
              <Field label="Age (override)">
                <Input
                  type="number" min={0} max={150}
                  value={draft.age ?? ""}
                  onChange={(e) => set("age", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={computedAge !== undefined ? String(computedAge) : "—"}
                />
              </Field>
            </div>
            <Field label="Gender">
              <Select
                value={draft.gender ?? ""}
                onValueChange={(v) => set("gender", (v || undefined) as User["gender"])}
              >
                <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Short bio">
              <Textarea
                value={draft.bio ?? ""}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Frontend developer, batch of 2026"
                className="min-h-20"
              />
            </Field>
            <Field label="Profile photo">
              <FileUploader
                accept="image/*"
                busy={avatarBusy}
                hasFile={!!draft.avatar}
                onFile={onAvatarFile}
                onClear={() => set("avatar", undefined)}
                previewSrc={draft.avatar}
                label={draft.avatar ? "Replace photo" : "Upload photo"}
              />
            </Field>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 outline-none">
            <p className="text-xs text-muted-foreground">
              WhatsApp number is set on the <span className="font-medium text-foreground">Basic</span> tab.
              Add address details here so they appear on certificates.
            </p>
            <Field label="Address line 1">
              <Input value={draft.addressLine1 ?? ""} onChange={(e) => set("addressLine1", e.target.value)} placeholder="221B Baker Street" />
            </Field>
            <Field label="Address line 2">
              <Input value={draft.addressLine2 ?? ""} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Apartment, floor, etc." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><Input value={draft.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Bengaluru" /></Field>
              <Field label="State / Province"><Input value={draft.state ?? ""} onChange={(e) => set("state", e.target.value)} placeholder="Karnataka" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Postal code"><Input value={draft.postalCode ?? ""} onChange={(e) => set("postalCode", e.target.value)} placeholder="560001" /></Field>
              <Field label="Country"><Input value={draft.country ?? ""} onChange={(e) => set("country", e.target.value)} placeholder="India" /></Field>
            </div>
          </TabsContent>

          <TabsContent value="education" className="space-y-4 outline-none">
            <div className="rounded-md border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
              All education fields are optional — fill what you have.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="School"><Input value={draft.school ?? ""} onChange={(e) => set("school", e.target.value)} placeholder="Delhi Public School" /></Field>
              <Field label="Board / curriculum">
                <Select value={draft.schoolBoard ?? ""} onValueChange={(v) => set("schoolBoard", v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="CBSE / ICSE / IB / State / Other" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBSE">CBSE</SelectItem>
                    <SelectItem value="ICSE">ICSE</SelectItem>
                    <SelectItem value="IB">IB</SelectItem>
                    <SelectItem value="IGCSE">IGCSE</SelectItem>
                    <SelectItem value="State Board">State board</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="College / university">
              <Input value={draft.college ?? ""} onChange={(e) => set("college", e.target.value)} placeholder="IIT Bombay" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Degree">
                <Input value={draft.collegeDegree ?? ""} onChange={(e) => set("collegeDegree", e.target.value)} placeholder="B.Tech" />
              </Field>
              <Field label="Major / specialisation">
                <Input value={draft.collegeMajor ?? ""} onChange={(e) => set("collegeMajor", e.target.value)} placeholder="Computer Science" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Graduation year">
                <Input
                  type="number" min={1950} max={2100}
                  value={draft.collegeGraduationYear ?? ""}
                  onChange={(e) => set("collegeGraduationYear", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2026"
                />
              </Field>
              <Field label="Highest qualification">
                <Input
                  value={draft.highestQualification ?? ""}
                  onChange={(e) => set("highestQualification", e.target.value)}
                  placeholder="e.g. PhD, Masters, Bachelors"
                />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="online" className="space-y-4 outline-none">
            <Field label="LinkedIn URL">
              <Input value={draft.linkedInUrl ?? ""} onChange={(e) => set("linkedInUrl", e.target.value)} placeholder="https://linkedin.com/in/username" />
              {draft.linkedInUrl && !isUrlish(draft.linkedInUrl) && (
                <p className="mt-1 text-[11px] text-destructive">URL should start with http(s)://</p>
              )}
            </Field>
            <Field label="GitHub URL">
              <Input value={draft.githubUrl ?? ""} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/username" />
            </Field>
            <Field label="Twitter / X URL">
              <Input value={draft.twitterUrl ?? ""} onChange={(e) => set("twitterUrl", e.target.value)} placeholder="https://twitter.com/username" />
            </Field>
            <Field label="Portfolio / website">
              <Input value={draft.portfolioUrl ?? ""} onChange={(e) => set("portfolioUrl", e.target.value)} placeholder="https://yourdomain.com" />
            </Field>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 outline-none">
            <Field label="Resume (PDF preferred)">
              <FileUploader
                accept="application/pdf,.doc,.docx"
                busy={resumeBusy}
                hasFile={!!draft.resumeUrl}
                onFile={onResumeFile}
                onClear={() => set("resumeUrl", undefined)}
                previewLabel={draft.resumeUrl}
                label={draft.resumeUrl ? "Replace resume" : "Upload resume"}
              />
              {draft.resumeUrl && (
                <p className="mt-2 break-all text-[11px] text-muted-foreground">
                  Stored at <a href={draft.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{draft.resumeUrl}</a>
                </p>
              )}
            </Field>
            <Field label="Internal notes">
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anything else — scholarship status, special requirements, etc."
                className="min-h-24"
              />
            </Field>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <DialogFooter className="mt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!valid}>Add student</Button>
      </DialogFooter>
    </DialogContent>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function isUrlish(s: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(s.trim())
}

function FileUploader({
  accept, busy, hasFile, onFile, onClear, previewSrc, previewLabel, label,
}: {
  accept: string
  busy: boolean
  hasFile: boolean
  onFile: (file: File) => void
  onClear: () => void
  previewSrc?: string
  previewLabel?: string
  label: string
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted">
        <Upload className="h-3.5 w-3.5" />
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ""
          }}
        />
      </label>
      {hasFile && previewSrc && (
        <div className="mt-2 flex items-start gap-3">
          <img src={previewSrc} alt="" className="h-14 w-14 rounded-full border object-cover" />
          <Button variant="ghost" size="sm" onClick={onClear} className="text-xs">
            <X className="mr-1 h-3 w-3" /> Remove
          </Button>
        </div>
      )}
      {hasFile && !previewSrc && previewLabel && (
        <div className="mt-2 flex items-center justify-between rounded border bg-muted/30 px-2 py-1.5 text-xs">
          <span className="flex items-center gap-2 truncate"><FileText className="h-3.5 w-3.5" />Uploaded</span>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-6 text-xs">
            <X className="mr-1 h-3 w-3" /> Remove
          </Button>
        </div>
      )}
    </div>
  )
}
