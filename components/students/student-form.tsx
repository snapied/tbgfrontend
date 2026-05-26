"use client"

// Shared student form — used by /dashboard/students/new and
// /dashboard/students/[id]/edit. The "create" route passes no
// `initial` and shows the Invitation card; the edit route passes a
// User and hides the invitation card (re-invite lives on the detail
// page).

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, FileText, X, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useLMS, type User } from "@/lib/lms-store"
import { uploadAsset } from "@/lib/upload-asset"
import { PhoneInput } from "@/components/forms/phone-input"
import { sendStudentInvite } from "@/lib/student-invite"
import { useTenant } from "@/lib/tenant-store"
import { toast } from "sonner"
import { lookupPostal } from "@/lib/postal-lookup"
import { useEffect } from "react"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

// Same form drives create + edit. The tour adapts copy via the
// `isEdit` branch inside the steps. Two separate tourIds so a user
// who's seen the "Add" walkthrough still gets the "Edit" one on
// their first edit (and vice versa).
const STUDENT_NEW_TOUR: TourStep[] = [
  {
    title: "Add a new student",
    body: "Name, email, and a WhatsApp number are required — the rest is optional. Toggle 'Invite' on Save to email them a setup link.",
    emoji: "🎓",
    placement: "center",
  },
  {
    target: "[data-tour='student-basics']",
    title: "Basic information",
    body: "Name + email + phone are how we reach them. Phone uses an international prefix picker so WhatsApp deep-links work regardless of country.",
    emoji: "👤",
    placement: "right",
  },
  {
    target: "[data-tour='student-save']",
    title: "Save & invite",
    body: "Saving creates the student. If the invite toggle is on, they get an email with a one-click magic-link to set their password.",
    emoji: "💾",
    placement: "left",
  },
]

const STUDENT_EDIT_TOUR: TourStep[] = [
  {
    title: "Edit student profile",
    body: "Every field is editable except their internal id. Changes persist on Save.",
    emoji: "✏️",
    placement: "center",
  },
  {
    target: "[data-tour='student-basics']",
    title: "Profile fields",
    body: "Name, email, phone. Updating the email here doesn't re-invite them — use the resend invite button on the student detail page for that.",
    emoji: "👤",
    placement: "right",
  },
  {
    target: "[data-tour='student-save']",
    title: "Save changes",
    body: "Updates the profile right away. They're not notified about edits unless you tick a re-invite (deliberately quiet — admins routinely fix typos here).",
    emoji: "💾",
    placement: "left",
  },
]

type Draft = Partial<User> & { name: string; email: string }
const EMPTY: Draft = { name: "", email: "" }

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

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

interface Props {
  mode: "create" | "edit"
  initial?: User
  onSave: (out: User) => void
}

export function StudentForm({ mode, initial, onSave }: Props) {
  const router = useRouter()
  const { currentUser, users } = useLMS()
  const { currentTenant } = useTenant()

  const [draft, setDraft] = useState<Draft>(
    initial
      ? {
          ...initial,
          name: initial.name,
          email: initial.email,
        }
      : EMPTY,
  )
  // On EDIT we treat an existing phone as already-valid so the user
  // can save changes to OTHER fields without re-validating phone
  // (the PhoneInput emits valid=true only once they touch it). On
  // CREATE we still gate on PhoneInput's emitted valid flag.
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [phoneValidEmitted, setPhoneValidEmitted] = useState(!!initial?.phone)
  const [resumeBusy, setResumeBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Filename of the most recent resume upload — populated by the
  // FileUploader after a successful upload so the preview shows a
  // friendly name instead of a 200-char signed URL.
  const [resumeFilename, setResumeFilename] = useState<string | undefined>(undefined)
  // Invite toggles only apply on create. On edit we hide the card.
  const [inviteEmail, setInviteEmail] = useState(true)
  const [inviteWhatsapp, setInviteWhatsapp] = useState(true)
  const isEdit = mode === "edit"
  const [postalStatus, setPostalStatus] = useState<"idle" | "looking" | "ok" | "miss">("idle")

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const computedAge = useMemo(() => ageFromDob(draft.dateOfBirth), [draft.dateOfBirth])
  const effectiveAge = draft.age ?? computedAge

  // Postal lookup. Debounce 600ms after the last keystroke so we
  // don't spam zippopotam.us / postalpincode.in on every digit. Only
  // fires when the code is long enough to plausibly resolve (4+ chars)
  // and the city / state aren't already manually filled (we don't
  // want to overwrite the teacher's edits).
  useEffect(() => {
    const code = draft.postalCode?.trim()
    if (!code || code.length < 4) {
      setPostalStatus("idle")
      return
    }
    const handle = window.setTimeout(async () => {
      setPostalStatus("looking")
      const res = await lookupPostal(code, draft.country)
      if (!res) {
        setPostalStatus("miss")
        return
      }
      setPostalStatus("ok")
      setDraft((d) => ({
        ...d,
        // Only fill blanks — don't trample manual edits.
        city: d.city?.trim() ? d.city : res.city,
        state: d.state?.trim() ? d.state : res.state,
        country: d.country?.trim() ? d.country : res.country,
      }))
    }, 600)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.postalCode])

  // Duplicate-email guard: another user with the same email blocks
  // save (case-insensitive, edit-mode ignores ITSELF). Avoids the
  // silent dupe row that the store would otherwise accept.
  //
  // `users` is already tenant-scoped (lms-store keys are per-tenant),
  // so a dupe here means "this person is already in YOUR workspace" —
  // not a global collision. We surface the existing record so the
  // teacher can jump straight to their profile instead of being
  // stuck staring at a red error with no next step.
  const emailLower = draft.email.trim().toLowerCase()
  const existingUserSameTenant = useMemo(() => {
    if (!emailLower) return undefined
    return users.find(
      (u) => u.id !== initial?.id && u.email.toLowerCase() === emailLower,
    )
  }, [users, emailLower, initial?.id])
  const duplicateEmail = !!existingUserSameTenant

  // On edit, an existing phone counts as valid unless the user
  // re-touched the field and it's now invalid. On create the
  // PhoneInput's `valid` callback is the gate.
  const phoneAcceptable = isEdit
    ? !phoneTouched
      ? true
      : phoneValidEmitted
    : phoneValidEmitted

  const valid =
    draft.name.trim().length > 0 &&
    isValidEmail(draft.email.trim()) &&
    !duplicateEmail &&
    phoneAcceptable &&
    (!draft.linkedInUrl || isUrlish(draft.linkedInUrl)) &&
    (!draft.githubUrl || isUrlish(draft.githubUrl)) &&
    (!draft.twitterUrl || isUrlish(draft.twitterUrl)) &&
    (!draft.portfolioUrl || isUrlish(draft.portfolioUrl))

  const onResumeFile = async (file: File) => {
    setResumeBusy(true)
    try {
      const { url } = await uploadAsset(file, "students")
      set("resumeUrl", url)
      setResumeFilename(file.name)
    } catch (err) {
      // Don't swallow the failure silently — uploadAsset can throw on
      // network / size / mime errors and the teacher would otherwise
      // see the busy state vanish without any file appearing.
      toast.error(
        `Couldn't upload resume: ${(err as Error).message ?? "unknown error"}. Try a smaller PDF or use a hosted link.`,
      )
    } finally {
      setResumeBusy(false)
    }
  }

  const onAvatarFile = async (file: File) => {
    setAvatarBusy(true)
    try {
      const { url } = await uploadAsset(file, "students")
      set("avatar", url)
    } catch (err) {
      toast.error(
        `Couldn't upload photo: ${(err as Error).message ?? "unknown error"}. Try a smaller image.`,
      )
    } finally {
      setAvatarBusy(false)
    }
  }

  const handleSubmit = async () => {
    if (!valid) return
    setSubmitting(true)
    const out: User = {
      // Edit keeps the original id + createdAt; create gets fresh ones
      // from the caller (handled in onSave for the create route).
      id: initial?.id ?? "",
      role: initial?.role ?? "student",
      name: draft.name.trim(),
      email: draft.email.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
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
    onSave(out)

    // Invite fan-out only on create — edit doesn't send a new
    // invitation. The "Re-invite" action on the student detail page
    // calls sendStudentInvite directly when the teacher wants one.
    if (!isEdit && (inviteEmail || inviteWhatsapp) && currentTenant) {
      const existingIdentity = users.some(
        (u) => u.id !== out.id && u.email.toLowerCase() === out.email.toLowerCase(),
      )
      try {
        const result = await sendStudentInvite({
          studentName: out.name,
          studentEmail: out.email,
          studentPhone: out.phone,
          tenantName: currentTenant.name,
          tenantSlug: currentTenant.slug,
          teacherName: currentUser?.name ?? "Your instructor",
          teacherEmail: currentUser?.email,
          existingIdentity,
          channels: {
            email: inviteEmail,
            whatsapp: inviteWhatsapp && !!out.phone,
          },
        })
        const channelsHit = [
          result.emailSent ? "email" : null,
          result.whatsappSent ? "WhatsApp" : null,
        ].filter(Boolean) as string[]
        if (channelsHit.length > 0) {
          toast.success(
            `Invite sent to ${out.name} via ${channelsHit.join(" + ")}.`,
          )
        } else {
          // Student row was still created; only the fan-out failed.
          // Surface a soft warning so the teacher can re-invite.
          toast.warning(
            `${out.name} added, but the invite couldn't be delivered. Re-invite from the student's page.`,
          )
        }
      } catch {
        toast.warning(
          `${out.name} added, but the invite couldn't be delivered. Re-invite from the student's page.`,
        )
      }
    } else if (!isEdit) {
      // Created without an invite — confirm the row was saved so the
      // teacher isn't left wondering whether the click worked.
      toast.success(`${out.name} added.`)
    } else {
      toast.success(`Updated ${out.name}.`)
    }

    router.push(isEdit ? `/dashboard/students/${out.id}` : "/dashboard/students")
  }

  return (
    <div className="space-y-6">
      <ProductTour
        tourId={isEdit ? "student-edit-v1" : "student-new-v1"}
        steps={isEdit ? STUDENT_EDIT_TOUR : STUDENT_NEW_TOUR}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/students")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isEdit ? "Edit student" : "Add new student"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit
                ? `Update ${initial?.name ?? "the student"}'s profile.`
                : "Fill in the details to register a new student"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <TakeATourButton tourId={isEdit ? "student-edit-v1" : "student-new-v1"} />
          <Button
            variant="outline"
            onClick={() => router.push(isEdit && initial ? `/dashboard/students/${initial.id}` : "/dashboard/students")}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            data-tour="student-save"
          >
            {submitting
              ? (isEdit ? "Saving…" : "Adding…")
              : (isEdit ? "Save changes" : "Add student")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <Card data-tour="student-basics">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Name, email, and a WhatsApp number are required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Full name *">
                <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Aanya Sharma" />
              </Field>
              <Field label="Email *">
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="aanya@example.com"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={!!draft.email && (!isValidEmail(draft.email) || duplicateEmail)}
                />
                {draft.email && !isValidEmail(draft.email) && (
                  <p className="mt-1 text-[11px] text-destructive">Doesn&apos;t look like a valid email.</p>
                )}
                {draft.email && isValidEmail(draft.email) && existingUserSameTenant && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
                    <div className="flex-1 leading-snug">
                      <strong>{existingUserSameTenant.name || existingUserSameTenant.email}</strong> is already in this workspace. No need to add again — open their profile to message, enroll, or update.
                      <Link
                        href={`/dashboard/students/${existingUserSameTenant.id}`}
                        className="ml-2 inline-flex items-center font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-100"
                      >
                        Open profile →
                      </Link>
                    </div>
                  </div>
                )}
              </Field>
              <Field label="WhatsApp number *">
                <PhoneInput
                  value={draft.phone ?? ""}
                  onChange={(e164, valid) => {
                    set("phone", e164)
                    setPhoneValidEmitted(valid)
                    setPhoneTouched(true)
                  }}
                  whatsapp
                  required
                  placeholder="98765 43210"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) => set("bio", e.target.value.slice(0, 280))}
                  placeholder="Frontend developer, batch of 2026"
                  className="min-h-20"
                  maxLength={280}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {(draft.bio ?? "").length}/280
                </p>
              </Field>
            </CardContent>
          </Card>

          {/* Contact details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
              <CardDescription>Address details appear on certificates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Address line 1">
                <Input value={draft.addressLine1 ?? ""} onChange={(e) => set("addressLine1", e.target.value)} placeholder="221B Baker Street" />
              </Field>
              <Field label="Address line 2">
                <Input value={draft.addressLine2 ?? ""} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Apartment, floor, etc." />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City"><Input value={draft.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Bengaluru" /></Field>
                <Field label="State / Province"><Input value={draft.state ?? ""} onChange={(e) => set("state", e.target.value)} placeholder="Karnataka" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Postal code">
                  <Input value={draft.postalCode ?? ""} onChange={(e) => set("postalCode", e.target.value)} placeholder="560001" />
                  <p
                    className={
                      postalStatus === "ok"
                        ? "text-[11px] text-success"
                        : postalStatus === "miss"
                        ? "text-[11px] text-muted-foreground"
                        : postalStatus === "looking"
                        ? "text-[11px] text-muted-foreground"
                        : "hidden"
                    }
                  >
                    {postalStatus === "ok"
                      ? "✓ Auto-filled city, state, country from postal code"
                      : postalStatus === "looking"
                      ? "Looking up…"
                      : postalStatus === "miss"
                      ? "Couldn't auto-fill — please enter city + country manually"
                      : ""}
                  </p>
                </Field>
                <Field label="Country"><Input value={draft.country ?? ""} onChange={(e) => set("country", e.target.value)} placeholder="IN, US, GB…" /></Field>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle>Education & Background</CardTitle>
              <CardDescription>Academic and professional details. All fields are optional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="School / High School"><Input value={draft.school ?? ""} onChange={(e) => set("school", e.target.value)} placeholder="e.g., Lincoln High School" /></Field>
                <Field label="Board / Curriculum">
                  <Select value={draft.schoolBoard ?? ""} onValueChange={(v) => set("schoolBoard", v || undefined)}>
                    <SelectTrigger><SelectValue placeholder="e.g., State Board, IB, CBSE" /></SelectTrigger>
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
              <Field label="College / University / Institute">
                <Input value={draft.college ?? ""} onChange={(e) => set("college", e.target.value)} placeholder="e.g., State University or Tech Institute" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Degree / Program">
                  <Input value={draft.collegeDegree ?? ""} onChange={(e) => set("collegeDegree", e.target.value)} placeholder="e.g., B.Sc., MBA, Diploma" />
                </Field>
                <Field label="Major / Specialisation">
                  <Input value={draft.collegeMajor ?? ""} onChange={(e) => set("collegeMajor", e.target.value)} placeholder="e.g., Computer Science, Design" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Graduation / Completion Year">
                  <Input
                    type="number" min={1950} max={2100}
                    value={draft.collegeGraduationYear ?? ""}
                    onChange={(e) => set("collegeGraduationYear", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g., 2024"
                  />
                </Field>
                <Field label="Highest Qualification">
                  <Input
                    value={draft.highestQualification ?? ""}
                    onChange={(e) => set("highestQualification", e.target.value)}
                    placeholder="e.g., High School, Bachelor's, Master's"
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Photo */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader
                accept="image/*"
                busy={avatarBusy}
                hasFile={!!draft.avatar}
                onFile={onAvatarFile}
                onClear={() => set("avatar", undefined)}
                previewSrc={draft.avatar}
                label={draft.avatar ? "Replace photo" : "Upload photo"}
              />
            </CardContent>
          </Card>

          {/* Online Profiles */}
          <Card>
            <CardHeader>
              <CardTitle>Online Profiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Resume (PDF preferred)">
                <FileUploader
                  accept="application/pdf,.doc,.docx"
                  busy={resumeBusy}
                  hasFile={!!draft.resumeUrl}
                  onFile={onResumeFile}
                  onClear={() => {
                    set("resumeUrl", undefined)
                    setResumeFilename(undefined)
                  }}
                  previewLabel={resumeFilename ?? filenameFromUrl(draft.resumeUrl)}
                  label={draft.resumeUrl ? "Replace resume" : "Upload resume"}
                />
                {draft.resumeUrl && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    <a
                      href={draft.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Open resume in new tab
                    </a>
                  </p>
                )}
              </Field>
              <Field label="Internal notes">
                <Textarea
                  value={draft.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value.slice(0, 1500))}
                  placeholder="Anything else — scholarship status, special requirements, etc."
                  className="min-h-24"
                  maxLength={1500}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {(draft.notes ?? "").length}/1500 · only you can see these
                </p>
              </Field>
            </CardContent>
          </Card>

          {/* Invite — Phase A from the design doc. Fires email +
              WhatsApp the moment the student is created. Instructor can
              flip either off (e.g. during a CSV import) and re-invite
              later from the student detail page. Hidden on edit. */}
          {!isEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Invitation</CardTitle>
              <CardDescription>
                We send the student a friendly invite the moment you save. They can sign in with
                the password they already have if they&apos;re a student of another teacher on
                The Big Class.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Email invite</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {draft.email.trim() ? `Sends to ${draft.email.trim()}` : "Enter the student's email above"}
                  </p>
                </div>
                <Switch
                  checked={inviteEmail}
                  onCheckedChange={setInviteEmail}
                  disabled={!isValidEmail(draft.email.trim())}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">WhatsApp invite</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {draft.phone?.trim()
                      ? `Sends to ${draft.phone.trim()}`
                      : "Add a phone number above to enable"}
                  </p>
                </div>
                <Switch
                  checked={inviteWhatsapp}
                  onCheckedChange={setInviteWhatsapp}
                  disabled={!draft.phone?.trim()}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Subject + tone include your name and workspace so students in multiple workspaces
                can tell invites apart. Re-invite anytime from the student page.
              </p>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )
}

function isUrlish(s: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(s.trim())
}

// Best-effort filename pull from a CDN URL — drops query/hash and
// returns the last path segment. Returns undefined when the URL
// doesn't parse so callers can fall back to their own label.
function filenameFromUrl(url?: string): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    const last = u.pathname.split("/").filter(Boolean).pop()
    return last ? decodeURIComponent(last) : undefined
  } catch {
    return undefined
  }
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
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted transition-colors">
        <Upload className="h-4 w-4" />
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
        <div className="mt-3 flex items-start gap-4 rounded-md border p-3">
          <img src={previewSrc} alt="" className="h-16 w-16 rounded-full border object-cover" />
          <Button variant="ghost" size="sm" onClick={onClear} className="mt-2">
            <X className="mr-2 h-4 w-4" /> Remove
          </Button>
        </div>
      )}
      {hasFile && !previewSrc && previewLabel && (
        <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 truncate text-muted-foreground">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{previewLabel}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 shrink-0">
            <X className="mr-2 h-4 w-4" /> Remove
          </Button>
        </div>
      )}
    </div>
  )
}
