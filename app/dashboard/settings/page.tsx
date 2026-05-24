"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Award,
  Bell,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  useOrgSettings,
  type OrgNotificationPrefs,
} from "@/lib/org-settings"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { useStorageError } from "@/lib/storage-error"
import { WorkspaceDataCard } from "@/components/settings/workspace-data-card"
import { WebPushSettingsCard } from "@/components/dashboard/web-push-settings-card"
import { FileUploadField } from "@/components/upload/file-upload-field"
import {
  PasswordStrengthInput,
  MIN_PASSWORD_SCORE,
} from "@/components/forms/password-strength-input"

const DEFAULT_PREFS: OrgNotificationPrefs = {
  batchCompletion: true,
  verificationAlerts: false,
  weeklySummary: true,
  newEnrollment: true,
  assignmentSubmitted: true,
}

export default function SettingsPage() {
  // Org-level brand + currency live in Portal → Brand now (Portal writes
  // back to OrgSettings so certificates keep picking up the same values).
  // We still need the `settings` here for the notification prefs slice.
  const { settings, update } = useOrgSettings()
  const { currentUser, updateUser } = useLMS()
  const { currentTenant } = useTenant()

  // Currently-saved account values come from the LMS store; the form below
  // is bound to local state so the user can edit + revert without thrash.
  // Bio + socials are rendered on the public instructor card on every
  // course this user authors, so editing them here surfaces immediately
  // for students.
  const [displayName, setDisplayName] = useState(currentUser?.name ?? "")
  const [email, setEmail] = useState(currentUser?.email ?? "")
  const [avatar, setAvatar] = useState(currentUser?.avatar ?? "")
  const [coverImageUrl, setCoverImageUrl] = useState(currentUser?.coverImageUrl ?? "")
  const [bio, setBio] = useState(currentUser?.bio ?? "")
  const [portfolioUrl, setPortfolioUrl] = useState(currentUser?.portfolioUrl ?? "")
  const [twitterUrl, setTwitterUrl] = useState(currentUser?.twitterUrl ?? "")
  const [linkedInUrl, setLinkedInUrl] = useState(currentUser?.linkedInUrl ?? "")
  const [youtubeUrl, setYoutubeUrl] = useState(currentUser?.youtubeUrl ?? "")
  const [instagramUrl, setInstagramUrl] = useState(currentUser?.instagramUrl ?? "")
  const [githubUrl, setGithubUrl] = useState(currentUser?.githubUrl ?? "")
  const [accountSavedAt, setAccountSavedAt] = useState<Date | null>(null)
  useEffect(() => {
    setDisplayName(currentUser?.name ?? "")
    setEmail(currentUser?.email ?? "")
    setAvatar(currentUser?.avatar ?? "")
    setCoverImageUrl(currentUser?.coverImageUrl ?? "")
    setBio(currentUser?.bio ?? "")
    setPortfolioUrl(currentUser?.portfolioUrl ?? "")
    setTwitterUrl(currentUser?.twitterUrl ?? "")
    setLinkedInUrl(currentUser?.linkedInUrl ?? "")
    setYoutubeUrl(currentUser?.youtubeUrl ?? "")
    setInstagramUrl(currentUser?.instagramUrl ?? "")
    setGithubUrl(currentUser?.githubUrl ?? "")
  }, [currentUser?.id])

  const accountDirty =
    !!currentUser &&
    (displayName !== currentUser.name ||
      avatar !== (currentUser.avatar ?? "") ||
      coverImageUrl !== (currentUser.coverImageUrl ?? "") ||
      bio !== (currentUser.bio ?? "") ||
      portfolioUrl !== (currentUser.portfolioUrl ?? "") ||
      twitterUrl !== (currentUser.twitterUrl ?? "") ||
      linkedInUrl !== (currentUser.linkedInUrl ?? "") ||
      youtubeUrl !== (currentUser.youtubeUrl ?? "") ||
      instagramUrl !== (currentUser.instagramUrl ?? "") ||
      githubUrl !== (currentUser.githubUrl ?? ""))

  // Advisory note when localStorage is near capacity. Uploads now go
  // to /api/uploads (path strings, not base64), so this rarely fires —
  // and when it does, it's informational, not a blocker.
  const [accountSaveError, setAccountSaveError] = useState<string | null>(null)
  const storageErr = useStorageError("users")
  useEffect(() => {
    if (!storageErr) return
    setAccountSaveError(
      "Heads up: this workspace's stored data is getting large. Your edit went through, but it's a good idea to use a smaller image next time.",
    )
  }, [storageErr])

  const saveAccount = () => {
    if (!currentUser || !accountDirty) return
    setAccountSaveError(null)
    updateUser(currentUser.id, {
      name: displayName.trim(),
      avatar: avatar.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      bio: bio.trim() || undefined,
      portfolioUrl: portfolioUrl.trim() || undefined,
      twitterUrl: twitterUrl.trim() || undefined,
      linkedInUrl: linkedInUrl.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
    })
    // No defensive read-back anymore — uploads now stream to disk
    // (lib/upload-asset.ts → /api/uploads), so the saved value is a
    // short path like "/uploads/<tenant>/<id>.jpg" that's nowhere near
    // the localStorage quota. The earlier check was a false-positive
    // factory: it flagged "avatarLost" on any save that landed before
    // the persistence effect had a chance to run.
    setAccountSavedAt(new Date())
    setTimeout(() => setAccountSavedAt(null), 1500)
  }

  // Notification prefs hang off the org settings now and persist with them.
  const prefs: OrgNotificationPrefs = useMemo(
    () => ({ ...DEFAULT_PREFS, ...(settings.notifications ?? {}) }),
    [settings.notifications],
  )
  const setPref = (key: keyof OrgNotificationPrefs, value: boolean) =>
    update({ notifications: { ...prefs, [key]: value } })

  const [passwordOpen, setPasswordOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Personal account and notification preferences. Workspace URL, branding, and other public-facing config live in{" "}
          <a href="/dashboard/portal" className="font-medium text-primary hover:underline">
            Portal
          </a>.
        </p>
      </div>

      {/* Sprint C Communities #48 — Web Push opt-in card. Lives
          above the notification preferences grid because the
          permission prompt sets the ceiling for everything below
          (no granted permission → no push delivery regardless of
          per-channel toggles). One-card layout reads as "first
          decide whether push is on, then tune what gets through". */}
      <WebPushSettingsCard />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>What we should alert you about. Saved automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <NotificationRow
              label="Batch completion"
              hint="Pings when a certificate batch finishes generating."
              checked={prefs.batchCompletion}
              onChange={(v) => setPref("batchCompletion", v)}
            />
            <Separator />
            <NotificationRow
              label="Verification alerts"
              hint="Pings when an issued certificate is verified by a third party."
              checked={prefs.verificationAlerts}
              onChange={(v) => setPref("verificationAlerts", v)}
            />
            <Separator />
            <NotificationRow
              label="New enrollment"
              hint="When a student enrolls in one of your courses."
              checked={prefs.newEnrollment}
              onChange={(v) => setPref("newEnrollment", v)}
            />
            <Separator />
            <NotificationRow
              label="Assignment submitted"
              hint="When a student turns in an assignment, project, or test."
              checked={prefs.assignmentSubmitted}
              onChange={(v) => setPref("assignmentSubmitted", v)}
            />
            <Separator />
            <NotificationRow
              label="Weekly summary"
              hint="A Monday morning recap of last week's activity."
              checked={prefs.weeklySummary}
              onChange={(v) => setPref("weeklySummary", v)}
            />
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Your personal account settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!currentUser ? (
              <p className="text-sm text-muted-foreground">No account is signed in.</p>
            ) : (
              <>
                {/* Profile photo — same `avatar` field on the User
                    record that the public-profile editor writes to,
                    so editing it here updates everywhere your face
                    shows up (course cards, certificate signature
                    block, comments on the public blog, etc.). The
                    cover photo + bio + social links live on the
                    richer Portal → Public profile editor. */}
                <div className="space-y-2">
                  <Label>Profile photo</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                          {(displayName || "?").trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <FileUploadField
                        value={avatar}
                        onChange={setAvatar}
                        accept="image/png,image/jpeg,image/webp"
                        maxSizeMB={8}
                        hideUrlInput
                        compress={{ maxDim: 400, quality: 0.85, mime: "image/jpeg" }}
                      />
                      {avatar && (
                        <button
                          type="button"
                          onClick={() => setAvatar("")}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Remove photo
                        </button>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Square image works best. Auto-compressed to 400px. JPG / PNG / WEBP up to
                        8 MB.
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    Looking for cover banner, bio, or social links?{" "}
                    <a href="/dashboard/portal/profile" className="font-medium text-primary hover:underline">
                      Portal → Public profile
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      className="pl-8 cursor-not-allowed bg-muted/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your email is your account identifier and can&apos;t be changed here. To update it, please contact support.
                  </p>
                </div>
                {accountSaveError && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-foreground"
                  >
                    <span className="flex-1">{accountSaveError}</span>
                    <button
                      type="button"
                      onClick={() => setAccountSaveError(null)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                      aria-label="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={saveAccount}
                    disabled={!accountDirty}
                    className={cn(accountSavedAt && "bg-emerald-600 hover:bg-emerald-700")}
                  >
                    {accountSavedAt ? (<><Check className="mr-1 h-4 w-4" /> Saved</>) : "Save changes"}
                  </Button>
                  {accountDirty && (
                    <Button
                      variant="ghost"
                      onClick={() => setDisplayName(currentUser.name)}
                    >
                      Revert
                    </Button>
                  )}
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Change password</p>
                    <p className="text-sm text-muted-foreground">Update your password</p>
                  </div>
                  <Button variant="outline" onClick={() => setPasswordOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <WorkspaceDataCard />

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  )
}

function NotificationRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { currentUser } = useLMS()
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [newPwValid, setNewPwValid] = useState(false) // gated by zxcvbn score ≥ MIN_PASSWORD_SCORE
  const [confirmPw, setConfirmPw] = useState("")
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const reset = () => {
    setCurrentPw("")
    setNewPw("")
    setNewPwValid(false)
    setConfirmPw("")
    setShow(false)
    setDone(false)
  }

  // PasswordStrengthInput's `valid` flag already factors in score >=
  // MIN_PASSWORD_SCORE + confirm-match when confirmValue is wired.
  // We add the "different from current password" check on top.
  const valid =
    currentPw.length > 0 &&
    newPwValid &&
    newPw !== currentPw

  const submit = async () => {
    if (!valid) return
    setSubmitting(true)
    // No real auth backend wired yet — pretend it succeeded. When the auth
    // route is connected, POST {currentPw, newPw} to /api/auth/password.
    await new Promise((r) => setTimeout(r, 700))
    setSubmitting(false)
    setDone(true)
    setTimeout(() => {
      onOpenChange(false)
      reset()
    }, 1100)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change password
          </DialogTitle>
          <DialogDescription>
            We score new passwords with the same zxcvbn engine signup uses. Aim for a
            green &ldquo;Good&rdquo; bar before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <PwField label="Current password" value={currentPw} onChange={setCurrentPw} show={show} />
          {/* zxcvbn-backed new + confirm password fields. `userInputs`
              feeds the strength scorer your name + email so a password
              that contains either gets a red bar — same logic as
              signup. */}
          <PasswordStrengthInput
            label="New password"
            value={newPw}
            onChange={(next, isValid) => {
              setNewPw(next)
              setNewPwValid(isValid)
            }}
            confirmValue={confirmPw}
            onConfirmChange={setConfirmPw}
            userInputs={[currentUser?.name ?? "", currentUser?.email ?? ""]}
            minScore={MIN_PASSWORD_SCORE}
            disabled={submitting}
          />
          {currentPw && newPw && newPw === currentPw && (
            <p className="text-xs text-destructive">
              New password must differ from your current password.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {show ? "Hide" : "Show"} current password
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!valid || submitting}
            className={cn(done && "bg-emerald-600 hover:bg-emerald-700")}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : done ? <Check className="mr-2 h-4 w-4" /> : null}
            {done ? "Updated" : submitting ? "Updating…" : "Update password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PwField({
  label,
  value,
  onChange,
  show,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  error?: string | null
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// Workspace card (subdomain, custom domain, plan) lives in
// components/portal/workspace-card.tsx and is rendered under
// /dashboard/portal/domain. The IA puts everything public-facing into
// one place; Settings is now strictly personal account + plumbing.
