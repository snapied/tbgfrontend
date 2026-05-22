"use client"

// Faculty add/edit form. Used by both /dashboard/faculty/new and
// /dashboard/faculty/[id]/edit so the shape of the data + the
// validation rules stay in one place. The owning page passes a
// `mode` so the form can label its CTA appropriately and decide
// whether to look up cross-tenant context (only useful on add — on
// edit we already know who this person is).
//
// Multi-tenant: when a teacher's email is already in the
// faculty-registry (i.e. they teach at another workspace too), the
// add form surfaces a soft callout so the inviter knows they're
// inviting an existing platform user, not creating a new one. The
// invite still goes out so the person opts in to this workspace;
// we don't auto-link accounts without consent.

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  Mail,
  Send,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PhoneInput } from "@/components/forms/phone-input"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { generateId, useLMS, type User } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { lookupFaculty, recordFacultyTenant, dropFacultyTenant } from "@/lib/faculty-registry"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

const FACULTY_NEW_TOUR: TourStep[] = [
  {
    title: "Add a new faculty member",
    body: "They'll get an email invite with a one-click magic-link to set their password. Name + email are required; everything else can wait.",
    emoji: "👩‍🏫",
    placement: "center",
  },
  {
    target: "[data-tour='faculty-email']",
    title: "Email — also the login",
    body: "This is how they sign in. If we recognise the email from another workspace, a callout tells you they're already on the platform (they'll just gain access to yours too).",
    emoji: "✉️",
    placement: "right",
  },
  {
    target: "[data-tour='faculty-submit']",
    title: "Add & send invite",
    body: "Creates the account and fires the invite email. The setup link works for 7 days.",
    emoji: "📨",
    placement: "left",
  },
]

const FACULTY_EDIT_TOUR: TourStep[] = [
  {
    title: "Edit faculty profile",
    body: "Everything but the email is editable here — to change the email, delete and re-invite from a fresh address (login is tied to email).",
    emoji: "✏️",
    placement: "center",
  },
  {
    target: "[data-tour='faculty-email']",
    title: "Email is locked",
    body: "Their login is keyed to email. Renaming would break their sessions — instead, remove the seat and invite a new address.",
    emoji: "🔒",
    placement: "right",
  },
  {
    target: "[data-tour='faculty-submit']",
    title: "Save changes",
    body: "Persists the profile. They aren't re-notified about edits — silent updates so admins can fix typos without nagging the teacher.",
    emoji: "💾",
    placement: "left",
  },
]

type FacultyRole = "instructor" | "admin"

interface Props {
  mode: "new" | "edit"
  initial?: User
}

export function FacultyForm({ mode, initial }: Props) {
  const router = useRouter()
  const { users, addUser, updateUser, deleteUser, currentUser } = useLMS()
  const { currentTenant } = useTenant()
  const confirm = useConfirm()

  const [name, setName] = useState(initial?.name ?? "")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [phoneValid, setPhoneValid] = useState(!!initial?.phone)
  const [role, setRole] = useState<FacultyRole>(
    (initial?.role as FacultyRole) ?? "instructor",
  )
  const [bio, setBio] = useState(initial?.bio ?? "")
  const [avatar, setAvatar] = useState(initial?.avatar ?? "")
  // Online presence — all optional. Surfaced on the public
  // instructor card on every course page + /p/[tenant]/teachers.
  const [portfolioUrl, setPortfolioUrl] = useState(initial?.portfolioUrl ?? "")
  const [linkedInUrl, setLinkedInUrl] = useState(initial?.linkedInUrl ?? "")
  const [twitterUrl, setTwitterUrl] = useState(initial?.twitterUrl ?? "")
  const [instagramUrl, setInstagramUrl] = useState(initial?.instagramUrl ?? "")
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "")
  const [githubUrl, setGithubUrl] = useState(initial?.githubUrl ?? "")
  const [busy, setBusy] = useState(false)

  // Cross-tenant lookup. On add: prefill name / phone if we've seen
  // this email at another tenant. On edit: surface the other tenants
  // they belong to as a callout.
  const registryEntry = useMemo(
    () => (email ? lookupFaculty(email) : undefined),
    [email],
  )
  // For add: prefill missing fields the first time we see the email
  // match the registry.
  useEffect(() => {
    if (mode !== "new" || !registryEntry) return
    if (!name && registryEntry.name) setName(registryEntry.name)
    if (!phone && registryEntry.phone) {
      setPhone(registryEntry.phone)
      setPhoneValid(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryEntry?.email])

  const emailValid = !email || /^[^@]+@[^@]+\.[^@]+$/.test(email)
  // On add — block if a User row with this email already exists in
  // this workspace (avoids duplicate accounts). Edit can keep its
  // existing email unchanged.
  const emailInUseHere = useMemo(() => {
    if (!email) return false
    const lower = email.trim().toLowerCase()
    return users.some(
      (u) => u.email.toLowerCase() === lower && u.id !== initial?.id,
    )
  }, [users, email, initial?.id])

  const canSubmit =
    !busy &&
    !!name.trim() &&
    !!email.trim() &&
    emailValid &&
    !emailInUseHere &&
    phoneValid

  const otherTenants = (registryEntry?.tenantSlugs ?? []).filter(
    (s) => s !== currentTenant?.slug,
  )

  async function sendInviteEmail(user: { email: string; name: string }) {
    // Routes through the dedicated invite-request endpoint so the
    // recipient gets the proper welcoming "you're invited" email
    // (with workspace + inviter name) and lands on
    // /p/<tenant>/accept-invite/[token] (or the platform-level
    // /accept-invite path when no tenant is set). Passing `tenant`
    // binds the token to this workspace so it can't be consumed
    // inside a sibling tenant's portal, and routes the email link
    // back inside the tenant's branded chrome.
    try {
      await fetch("/api/auth/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          role,
          workspaceName: currentTenant?.name ?? "the workspace",
          inviterName: currentUser?.name,
          tenant: currentTenant?.slug,
        }),
      })
    } catch {
      /* swallowed — best effort */
    }
  }

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const socialFields = {
        portfolioUrl: portfolioUrl.trim() || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        twitterUrl: twitterUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
      }
      if (mode === "new") {
        const created: User = {
          id: generateId("user"),
          name: name.trim(),
          email: cleanEmail,
          phone,
          avatar: avatar || undefined,
          bio: bio || undefined,
          role,
          createdAt: new Date().toISOString(),
          invitedAt: new Date().toISOString(),
          ...socialFields,
        }
        addUser(created)
        await sendInviteEmail({ email: cleanEmail, name: created.name })
        if (currentTenant?.slug) {
          recordFacultyTenant({
            email: cleanEmail,
            name: created.name,
            phone,
            tenantSlug: currentTenant.slug,
          })
        }
        toast.success("Faculty added.", {
          description: `Invite email sent to ${cleanEmail}.`,
        })
        router.push("/dashboard/faculty")
      } else if (initial) {
        updateUser(initial.id, {
          name: name.trim(),
          phone,
          avatar: avatar || undefined,
          bio: bio || undefined,
          role,
          ...socialFields,
          // Email intentionally not editable — switching emails on a
          // login record after an invite is a footgun. Delete + re-
          // invite is cleaner.
        })
        if (currentTenant?.slug) {
          recordFacultyTenant({
            email: cleanEmail,
            name: name.trim(),
            phone,
            tenantSlug: currentTenant.slug,
          })
        }
        toast.success("Faculty updated.")
        router.push("/dashboard/faculty")
      }
    } finally {
      setBusy(false)
    }
  }

  async function resendInvite() {
    if (!initial) return
    setBusy(true)
    try {
      await sendInviteEmail({ email: initial.email, name: initial.name })
      updateUser(initial.id, { invitedAt: new Date().toISOString() })
      toast.success("Invite re-sent.", {
        description: `Another link is on its way to ${initial.email}.`,
      })
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!initial) return
    const ok = await confirm({
      title: `Remove ${initial.name}?`,
      description:
        "They lose access to this workspace immediately. Their courses + content stay; we just unlink the login.",
      destructive: true,
    })
    if (!ok) return
    deleteUser(initial.id)
    if (currentTenant?.slug) {
      dropFacultyTenant(initial.email, currentTenant.slug)
    }
    toastUndoableDelete({
      kind: "user",
      ids: initial.id,
      label: initial.name,
      itemNoun: "faculty",
    })
    router.push("/dashboard/faculty")
  }

  return (
    <div className="space-y-6">
      <ProductTour
        tourId={mode === "new" ? "faculty-new-v1" : "faculty-edit-v1"}
        steps={mode === "new" ? FACULTY_NEW_TOUR : FACULTY_EDIT_TOUR}
      />
      <div className="flex justify-end">
        <TakeATourButton tourId={mode === "new" ? "faculty-new-v1" : "faculty-edit-v1"} />
      </div>
      <Card>
        <CardContent className="space-y-5 p-6">
          {/* Multi-tenant callout — only in add mode and only when
              we recognize the email from another workspace. Keeps
              the inviter from accidentally thinking they're creating
              a duplicate account. */}
          {mode === "new" && otherTenants.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-accent/40 bg-accent/5 p-3 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="font-medium">This teacher already teaches on the platform.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  They&apos;re a faculty member at{" "}
                  <span className="font-medium text-foreground">
                    {otherTenants.length} other workspace{otherTenants.length === 1 ? "" : "s"}
                  </span>
                  . An invite will still go out so they opt-in to this one — we don&apos;t auto-link accounts across tenants without their consent.
                </p>
              </div>
            </div>
          )}
          {mode === "edit" && otherTenants.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="font-medium">Also teaches at {otherTenants.length} other workspace{otherTenants.length === 1 ? "" : "s"}.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Changes here don&apos;t propagate to the other workspace(s) — each tenant keeps its own copy of the profile.
                </p>
              </div>
            </div>
          )}

          {/* Avatar + identity */}
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <div className="space-y-2">
              <Label className="text-xs">Photo</Label>
              <ThumbnailField
                value={avatar}
                onChange={(url) => setAvatar(url ?? "")}
                defaultTitle={name || "Instructor"}
                folder="faculty"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="f-name">Full name *</Label>
                <Input
                  id="f-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5" data-tour="faculty-email">
                <Label htmlFor="f-email">
                  Email *{mode === "edit" && " (locked — delete and re-invite to change)"}
                </Label>
                <Input
                  id="f-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="jane@yourdomain.com"
                  disabled={mode === "edit"}
                />
                {email && !emailValid && (
                  <p className="inline-flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" /> That doesn&apos;t look like a valid email.
                  </p>
                )}
                {emailInUseHere && (
                  <p className="inline-flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Someone with this email is already a faculty
                    member here. Edit their profile instead of adding a duplicate.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>WhatsApp number *</Label>
              <PhoneInput
                value={phone}
                onChange={(e164, valid) => {
                  setPhone(e164)
                  setPhoneValid(valid)
                }}
                required
                whatsapp
                placeholder="98765 43210"
              />
              <p className="text-[11px] text-muted-foreground">
                Used for class reminders, late-grading nudges, and student
                question pings.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as FacultyRole)}>
                <SelectTrigger id="f-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instructor">Instructor — can build &amp; teach</SelectItem>
                  <SelectItem value="admin">
                    <span className="inline-flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Admin — full workspace access
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-bio">Short bio (optional)</Label>
            <Textarea
              id="f-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="One-paragraph intro — what they teach, where they're from, why students love them."
            />
            <p className="text-[11px] text-muted-foreground">
              Shown on /p/{currentTenant?.slug ?? "your-tenant"}/teachers and on every course this
              teacher publishes.
            </p>
          </div>

          {/* Online presence — every field is optional and rendered
              on the public instructor card with nofollow/noopener so
              user-controlled URLs don't pass SEO juice. Six is the
              right number: covers personal site + the five platforms
              teachers actually link to, without becoming a wall of
              text-fields the teacher has to skip over. */}
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-sm">Online presence (optional)</p>
              <p className="text-[11px] text-muted-foreground">
                Shown as icon links under the bio on the public profile.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-portfolio" className="text-xs">Personal website</Label>
                <Input
                  id="f-portfolio"
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://your-site.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-linkedin" className="text-xs">LinkedIn</Label>
                <Input
                  id="f-linkedin"
                  type="url"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/handle"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-twitter" className="text-xs">X / Twitter</Label>
                <Input
                  id="f-twitter"
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/handle"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-instagram" className="text-xs">Instagram</Label>
                <Input
                  id="f-instagram"
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/handle"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-youtube" className="text-xs">YouTube</Label>
                <Input
                  id="f-youtube"
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@handle"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-github" className="text-xs">GitHub</Label>
                <Input
                  id="f-github"
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/handle"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {mode === "edit" && initial && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resendInvite}
                disabled={busy}
              >
                <Mail className="mr-1.5 h-4 w-4" />
                {initial.invitedAt && !initial.lastLoginAt
                  ? "Resend invite"
                  : "Send password reset"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={busy}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remove from workspace
              </Button>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/faculty")}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit} data-tour="faculty-submit">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : mode === "new" ? (
              <Send className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {mode === "new" ? "Add & send invite" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
