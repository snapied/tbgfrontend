"use client"

// Public profile — this is where the teacher's avatar / cover / bio /
// socials live in the new IA. They're still User fields on lms-store
// (so course pages keep working), just edited from here instead of
// Settings. Settings now only holds account-level concerns (name,
// email, password).

import { useEffect, useState } from "react"
import { Save, Check, Sparkles } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { ProfileCoverEditor } from "@/components/portal/profile-cover-editor"
import { useLMS } from "@/lib/lms-store"
import { useStorageError } from "@/lib/storage-error"
import { cn } from "@/lib/utils"

export default function PortalProfilePage() {
  const { currentUser, updateUser } = useLMS()
  const [avatar, setAvatar] = useState(currentUser?.avatar ?? "")
  const [coverImageUrl, setCoverImageUrl] = useState(currentUser?.coverImageUrl ?? "")
  const [bio, setBio] = useState(currentUser?.bio ?? "")
  const [portfolioUrl, setPortfolioUrl] = useState(currentUser?.portfolioUrl ?? "")
  const [twitterUrl, setTwitterUrl] = useState(currentUser?.twitterUrl ?? "")
  const [linkedInUrl, setLinkedInUrl] = useState(currentUser?.linkedInUrl ?? "")
  const [youtubeUrl, setYoutubeUrl] = useState(currentUser?.youtubeUrl ?? "")
  const [instagramUrl, setInstagramUrl] = useState(currentUser?.instagramUrl ?? "")
  const [githubUrl, setGithubUrl] = useState(currentUser?.githubUrl ?? "")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
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

  const dirty =
    !!currentUser &&
    (avatar !== (currentUser.avatar ?? "") ||
      coverImageUrl !== (currentUser.coverImageUrl ?? "") ||
      bio !== (currentUser.bio ?? "") ||
      portfolioUrl !== (currentUser.portfolioUrl ?? "") ||
      twitterUrl !== (currentUser.twitterUrl ?? "") ||
      linkedInUrl !== (currentUser.linkedInUrl ?? "") ||
      youtubeUrl !== (currentUser.youtubeUrl ?? "") ||
      instagramUrl !== (currentUser.instagramUrl ?? "") ||
      githubUrl !== (currentUser.githubUrl ?? ""))

  // Storage warnings are advisory now — uploads go to /api/uploads so
  // the saved value is a short path, not a base64 blob. The only time
  // this fires is when a workspace has unusually huge legacy data;
  // surface as a yellow tip, not a blocking error.
  const storageErr = useStorageError("users")
  useEffect(() => {
    if (!storageErr) return
    setSaveError(
      "Heads up: this workspace's stored data is getting large. Future edits should still save fine — uploads now stream to disk.",
    )
  }, [storageErr])

  const save = () => {
    if (!currentUser || !dirty) return
    setSaveError(null)
    updateUser(currentUser.id, {
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
    setSavedAt(new Date())
    setTimeout(() => setSavedAt(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Public profile
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">
          How students see you
        </h1>
        <p className="text-muted-foreground">
          Your photo, cover, bio, and links show up on every course you author and on your
          public teacher page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photo &amp; cover</CardTitle>
          <CardDescription>
            What students see at the top of your public teacher page — composed live as you edit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileCoverEditor
            name={currentUser?.name ?? "Your name"}
            avatar={avatar}
            coverUrl={coverImageUrl}
            onAvatarChange={setAvatar}
            onCoverChange={setCoverImageUrl}
            subtitle={bio ? bio.split(/\n/)[0].slice(0, 80) : "Instructor"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <CardDescription>A line or three students see on every course you teach.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="bio">Short bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What you teach, who you teach, and why students should trust you."
            rows={4}
            maxLength={500}
          />
          <p className="text-[11px] text-muted-foreground">{bio.length}/500</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social &amp; web</CardTitle>
          <CardDescription>
            Each is rendered as a small icon on your public page. All outgoing links use{" "}
            <code className="rounded bg-muted px-1 font-mono">rel=&quot;nofollow&quot;</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://your-website.com" />
          <Input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/yourhandle" />
          <Input value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/you" />
          <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@channel" />
          <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/handle" />
          <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/you" />
        </CardContent>
      </Card>

      {saveError && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-foreground"
        >
          <span className="flex-1">{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={!dirty} className={cn(savedAt && "bg-emerald-600 hover:bg-emerald-700")}>
          {savedAt ? <><Check className="mr-1 h-4 w-4" /> Saved</> : <><Save className="mr-1 h-4 w-4" /> Save changes</>}
        </Button>
      </div>
    </div>
  )
}
