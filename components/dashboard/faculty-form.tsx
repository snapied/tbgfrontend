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

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Loader2,
  Mail,
  RefreshCw,
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
import { RichTextEditor } from "@/components/editor/rich-text-editor"
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
  // 55-char hard cap — the public teacher card has roughly 55
  // chars of width before it line-breaks past the photo column.
  // Capping at the data layer means we never have to truncate
  // visually downstream + the teacher sees a live counter while
  // typing.
  const BIO_MAX = 55
  const [bio, setBio] = useState((initial?.bio ?? "").slice(0, BIO_MAX))
  // Long-form "tell more about yourself" — Tiptap HTML, surfaced
  // in the About card on the public teacher detail page. Stored
  // as a separate field so the Bio (short) and the
  // profile bio (rich) don't fight each other for one string.
  const [about, setAbout] = useState(initial?.about ?? "")
  const [avatar, setAvatar] = useState(initial?.avatar ?? "")
  // Cover image — pulled from the same User record so a teacher
  // who already filled in their /dashboard/portal/profile cover
  // sees it pre-populated here. New field on the form; not
  // previously settable from this page.
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "")
  // "Same as workspace profile" detection. When the faculty member
  // being edited is the signed-in user (the workspace owner editing
  // their own profile in two places), we offer a one-click sync
  // from /dashboard/portal/profile so they don't have to maintain
  // two parallel records. This compares ids — the LMS-store
  // currentUser is the canonical record both surfaces read from.
  const isSelfProfile = !!initial && !!currentUser && initial.id === currentUser.id
  // Online presence — all optional. Surfaced on the public
  // instructor card on every course page + /p/[tenant]/instructors.
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
          about: about || undefined,
          coverImageUrl: coverImageUrl || undefined,
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
          about: about || undefined,
          coverImageUrl: coverImageUrl || undefined,
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

  // Pull-from-public-profile sync. Pulls the canonical fields off
  // the User record being edited (`initial`) and writes them into
  // form state.
  //
  // Why `initial` and not `currentUser`: the old version pulled
  // from `currentUser` (the signed-in admin), which (a) silently
  // overwrote a different teacher's bio with the admin's bio when
  // an admin was editing someone else and (b) was a no-op for the
  // self-edit case because `currentUser` and `initial` point at
  // the same User record. Pulling from `initial` is correct in
  // both cases: the form snapshot can drift from the live User
  // record when the same person is updated from
  // /dashboard/portal/profile in another tab, and this button
  // (plus the auto-sync effect below) brings the form back in
  // line. Force-sync — overwrites local values even when they
  // were edited; explicit click is the user telling us "I want
  // the latest from the public profile".
  function syncFromWorkspaceProfile() {
    if (!initial) return
    if (initial.name) setName(initial.name)
    if (initial.phone) {
      setPhone(initial.phone)
      setPhoneValid(true)
    }
    setAvatar(initial.avatar ?? "")
    setCoverImageUrl(initial.coverImageUrl ?? "")
    setBio((initial.bio ?? "").slice(0, BIO_MAX))
    setAbout(initial.about ?? "")
    setPortfolioUrl(initial.portfolioUrl ?? "")
    setLinkedInUrl(initial.linkedInUrl ?? "")
    setTwitterUrl(initial.twitterUrl ?? "")
    setInstagramUrl(initial.instagramUrl ?? "")
    setYoutubeUrl(initial.youtubeUrl ?? "")
    setGithubUrl(initial.githubUrl ?? "")
    toast.success("Pulled latest from public profile.")
  }

  // Auto-sync: when the live User record (initial prop) updates
  // out-of-band — typically because the same person updated their
  // /dashboard/portal/profile in another tab — refresh the bio /
  // about / social / cover / avatar fields here. We DO NOT auto-
  // sync the name / phone / role because those are workspace-
  // admin controls and shouldn't be hijacked by a profile edit
  // happening elsewhere.
  //
  // Dirty-edit protection: each field only re-syncs if its current
  // value matches what we last seeded into it. If the user has
  // started typing locally, the previously-seeded value won't
  // match anymore and we leave their work alone. The explicit
  // Sync button above always force-overwrites.
  const seedRef = useRef({
    bio: initial?.bio ?? "",
    about: initial?.about ?? "",
    avatar: initial?.avatar ?? "",
    coverImageUrl: initial?.coverImageUrl ?? "",
    portfolioUrl: initial?.portfolioUrl ?? "",
    linkedInUrl: initial?.linkedInUrl ?? "",
    twitterUrl: initial?.twitterUrl ?? "",
    instagramUrl: initial?.instagramUrl ?? "",
    youtubeUrl: initial?.youtubeUrl ?? "",
    githubUrl: initial?.githubUrl ?? "",
  })
  useEffect(() => {
    if (!initial) return
    const seed = seedRef.current
    const next = {
      bio: (initial.bio ?? "").slice(0, BIO_MAX),
      about: initial.about ?? "",
      avatar: initial.avatar ?? "",
      coverImageUrl: initial.coverImageUrl ?? "",
      portfolioUrl: initial.portfolioUrl ?? "",
      linkedInUrl: initial.linkedInUrl ?? "",
      twitterUrl: initial.twitterUrl ?? "",
      instagramUrl: initial.instagramUrl ?? "",
      youtubeUrl: initial.youtubeUrl ?? "",
      githubUrl: initial.githubUrl ?? "",
    }
    if (next.bio !== seed.bio && bio === seed.bio) setBio(next.bio)
    if (next.about !== seed.about && about === seed.about) setAbout(next.about)
    if (next.avatar !== seed.avatar && avatar === seed.avatar) setAvatar(next.avatar)
    if (next.coverImageUrl !== seed.coverImageUrl && coverImageUrl === seed.coverImageUrl) setCoverImageUrl(next.coverImageUrl)
    if (next.portfolioUrl !== seed.portfolioUrl && portfolioUrl === seed.portfolioUrl) setPortfolioUrl(next.portfolioUrl)
    if (next.linkedInUrl !== seed.linkedInUrl && linkedInUrl === seed.linkedInUrl) setLinkedInUrl(next.linkedInUrl)
    if (next.twitterUrl !== seed.twitterUrl && twitterUrl === seed.twitterUrl) setTwitterUrl(next.twitterUrl)
    if (next.instagramUrl !== seed.instagramUrl && instagramUrl === seed.instagramUrl) setInstagramUrl(next.instagramUrl)
    if (next.youtubeUrl !== seed.youtubeUrl && youtubeUrl === seed.youtubeUrl) setYoutubeUrl(next.youtubeUrl)
    if (next.githubUrl !== seed.githubUrl && githubUrl === seed.githubUrl) setGithubUrl(next.githubUrl)
    seedRef.current = next
    // We deliberately only depend on `initial` — re-running on every
    // local edit would constantly clobber the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  return (
    <div className="space-y-6">
      <ProductTour
        tourId={mode === "new" ? "faculty-new-v1" : "faculty-edit-v1"}
        steps={mode === "new" ? FACULTY_NEW_TOUR : FACULTY_EDIT_TOUR}
      />
      {/* Top action bar — primary CTAs live up here so they're
          visible without scrolling on long forms. Save-at-bottom
          was getting lost below the social-links grid. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TakeATourButton tourId={mode === "new" ? "faculty-new-v1" : "faculty-edit-v1"} />
        <div className="flex flex-wrap items-center gap-2">
          {/* Pull-from-public-profile button. Available on every
              edit (not just self-edit) so admins managing other
              teachers can also pick up edits the teacher made on
              their own /dashboard/portal/profile. The button is
              additive to the auto-sync effect above — it
              force-overwrites local edits, whereas auto-sync
              respects in-progress typing. */}
          {mode === "edit" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={syncFromWorkspaceProfile}
              title={isSelfProfile
                ? "Refresh bio, about, socials, and photo from your public profile"
                : "Refresh bio, about, socials, and photo from this teacher's public profile"}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {isSelfProfile ? "Sync from workspace profile" : "Pull latest from public profile"}
            </Button>
          )}
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

          {/* Avatar + identity. Photo column is constrained to
              w-40 — ThumbnailField uses aspect-video w-full
              internally, so without a wrapper it stretches to fill
              the grid's "auto" track and dominates the form. 160px
              is wide enough to read the avatar preview but narrow
              enough that the identity fields keep most of the row. */}
          <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
            <div className="space-y-2">
              <Label className="text-xs">Photo</Label>
              <div className="w-40">
                <ThumbnailField
                  value={avatar}
                  onChange={(url) => setAvatar(url ?? "")}
                  defaultTitle={name || "Instructor"}
                  folder="faculty"
                />
              </div>
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

          {/* Cover image — wide 16:9 banner above the teacher's
              public profile card. Optional; falls back to a
              generated gradient on the public side when unset. */}
          <div className="space-y-2">
            <Label className="text-xs">Cover image (optional)</Label>
            <ThumbnailField
              value={coverImageUrl}
              onChange={(url) => setCoverImageUrl(url ?? "")}
              defaultTitle={name || "Instructor"}
              folder="faculty"
            />
            <p className="text-[11px] text-muted-foreground">
              Wide 16:9 banner shown above the public teacher profile. Leave blank for an auto-generated gradient.
            </p>
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
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="f-bio">Bio (optional)</Label>
              <span
                className={
                  "text-[11px] tabular-nums " +
                  (bio.length >= BIO_MAX
                    ? "text-destructive"
                    : "text-muted-foreground")
                }
              >
                {bio.length} / {BIO_MAX}
              </span>
            </div>
            <Textarea
              id="f-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              maxLength={BIO_MAX}
              rows={2}
              placeholder="One line, e.g. 'Calculus prof. Ex-IIT. Loves whiteboards.'"
            />
            <p className="text-[11px] text-muted-foreground">
              Shown under the name on the teacher card across /p/{currentTenant?.slug ?? "your-tenant"}/instructors and every course this teacher publishes. Keep it tight — the card breaks past one line beyond {BIO_MAX} characters.
            </p>
          </div>

          {/* About — long-form profile bio. WYSIWYG so the teacher
              can write headings, links, lists, the lot. Renders
              inside the "About <name>" card on the public teacher
              detail page. Distinct from `bio` (the 55-char card
              tagline above) because the card and the profile
              page have very different copy needs. */}
          <div className="space-y-1.5">
            <Label>About — tell more about yourself (optional)</Label>
            <RichTextEditor
              value={about}
              onChange={setAbout}
              placeholder="Where you've taught, what you specialise in, what your students walk away knowing. A few paragraphs is plenty."
              minHeight={200}
            />
            <p className="text-[11px] text-muted-foreground">
              Shown in the &ldquo;About&rdquo; card on /p/{currentTenant?.slug ?? "your-tenant"}/instructors/&lt;handle&gt;. Formatting (bold, lists, links) is preserved.
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

      {/* Footer — secondary destructive/auxiliary actions only.
          Primary Save/Cancel live in the top bar. */}
      {mode === "edit" && initial && (
        <div className="flex flex-wrap gap-2">
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
        </div>
      )}
    </div>
  )
}
