"use client"

// Faculty showcase manager. The list on this page powers /p/[tenant]/teachers
// and the `faculty` section on any portal page. Each member can either
// (a) auto-pull from a real instructor user (set userId) or (b) be a
// standalone entry (e.g. guest faculty without a workspace login).

import { useMemo, useState } from "react"
import { Plus, Trash2, Star, StarOff, Pencil, Users as UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { usePortal, suggestHandle, generatePortalId, type PortalFacultyMember } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"

export default function FacultyPage() {
  const { faculty, upsertFaculty, deleteFaculty } = usePortal()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PortalFacultyMember | null>(null)

  const sorted = useMemo(
    () => faculty.slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99)),
    [faculty],
  )

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = (m: PortalFacultyMember) => {
    setEditing(m)
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Instructor showcase</h1>
          <p className="text-muted-foreground">
            The team page visitors see on your public site. Featured cards on /teachers and the home page.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" /> Add member
        </Button>
      </div>

      {/* Inline note about how this is different from Manage Users.
          Without this, teachers see two surfaces with overlapping
          fields (name, photo, bio) and get confused. */}
      <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-sm">
        <div className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
          i
        </div>
        <div>
          <p className="font-medium">How is this different from Manage Users?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <a href="/dashboard/users" className="font-medium text-primary hover:underline">Manage Users</a>{" "}
            is everyone who can log in — students, instructors, admins. <strong>Instructor showcase</strong>&nbsp; is the
            curated public team page. Link a workspace instructor in to auto-pull their photo + bio, or add a
            guest expert who doesn&apos;t need a login.
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No faculty yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add yourself first, then anyone else who teaches with you. Each member gets a public
              profile at <code className="rounded bg-muted px-1 font-mono">/teachers/[handle]</code>.
            </p>
            <Button onClick={openNew} className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" /> Add your first member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground ring-2 ring-border">
                      {m.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.name}</p>
                    {m.role && (
                      <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                    )}
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      /teachers/{m.handle}
                    </p>
                  </div>
                  {m.featured && (
                    <span title="Featured" className="text-accent">
                      <Star className="h-4 w-4 fill-current" />
                    </span>
                  )}
                </div>
                {m.bio && (
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.bio}</p>
                )}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => upsertFaculty({ ...m, featured: !m.featured })}>
                    {m.featured ? <><StarOff className="mr-1 h-3.5 w-3.5" /> Unfeature</> : <><Star className="mr-1 h-3.5 w-3.5" /> Feature</>}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteFaculty(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <FacultyDialog
          editing={editing}
          onClose={() => setOpen(false)}
          onSave={(m) => {
            upsertFaculty(m)
            setOpen(false)
          }}
          existingHandles={faculty.filter((x) => x.id !== editing?.id).map((x) => x.handle)}
        />
      </Dialog>
    </div>
  )
}

function FacultyDialog({
  editing,
  onClose,
  onSave,
  existingHandles,
}: {
  editing: PortalFacultyMember | null
  onClose: () => void
  onSave: (m: PortalFacultyMember) => void
  existingHandles: string[]
}) {
  const { users } = useLMS()
  const instructors = useMemo(
    () => users.filter((u) => u.role === "instructor" || u.role === "admin"),
    [users],
  )
  const [name, setName] = useState(editing?.name ?? "")
  const [role, setRole] = useState(editing?.role ?? "")
  const [handle, setHandle] = useState(editing?.handle ?? "")
  const [bio, setBio] = useState(editing?.bio ?? "")
  const [photo, setPhoto] = useState(editing?.photo ?? "")
  const [cover, setCover] = useState(editing?.coverImageUrl ?? "")
  const [linkedUserId, setLinkedUserId] = useState(editing?.userId ?? "")
  const [expertise, setExpertise] = useState(editing?.expertise?.join(", ") ?? "")
  const [twitter, setTwitter] = useState(editing?.socials?.twitter ?? "")
  const [linkedin, setLinkedIn] = useState(editing?.socials?.linkedin ?? "")
  const [website, setWebsite] = useState(editing?.socials?.email ?? "")

  // Auto-fill from the linked user — but only on selection change, so the
  // teacher can override any field manually after picking.
  const onPickUser = (uid: string) => {
    setLinkedUserId(uid)
    if (!uid) return
    const u = users.find((x) => x.id === uid)
    if (!u) return
    if (!name) setName(u.name)
    if (!photo && u.avatar) setPhoto(u.avatar)
    if (!cover && u.coverImageUrl) setCover(u.coverImageUrl)
    if (!bio && u.bio) setBio(u.bio)
    if (!handle) setHandle(suggestHandle(u.name))
    if (!twitter && u.twitterUrl) setTwitter(u.twitterUrl)
    if (!linkedin && u.linkedInUrl) setLinkedIn(u.linkedInUrl)
    if (!website && u.portfolioUrl) setWebsite(u.portfolioUrl)
  }

  const finalHandle = (handle || suggestHandle(name || "teacher")).toLowerCase()
  const handleClash = existingHandles.includes(finalHandle)
  const canSave = !!name.trim() && !!finalHandle && !handleClash

  const save = () => {
    const member: PortalFacultyMember = {
      id: editing?.id ?? generatePortalId("fac"),
      userId: linkedUserId || undefined,
      name: name.trim(),
      role: role.trim() || undefined,
      handle: finalHandle,
      bio: bio.trim() || undefined,
      photo: photo.trim() || undefined,
      coverImageUrl: cover.trim() || undefined,
      socials: {
        twitter: twitter.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        email: website.trim() || undefined,
      },
      expertise: expertise
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      featured: editing?.featured,
      order: editing?.order,
      courseIds: editing?.courseIds,
    }
    onSave(member)
  }

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit faculty member" : "Add faculty member"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Link to a workspace user (optional)</Label>
          <Select value={linkedUserId} onValueChange={onPickUser}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an instructor / admin or leave blank for guest faculty" />
            </SelectTrigger>
            <SelectContent>
              {instructors.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Pre-fills name, photo, bio, and socials. You can edit any field after.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>Role / title</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Head of Mathematics" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Handle</Label>
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder={suggestHandle(name || "teacher")}
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Public URL: <code>/teachers/{finalHandle}</code>
            {handleClash && (
              <span className="ml-2 font-medium text-destructive">— this handle is taken.</span>
            )}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="A line or three about what they teach and why students should trust them."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Photo</Label>
            <FileUploadField
              value={photo}
              onChange={setPhoto}
              accept="image/png,image/jpeg,image/webp"
              maxSizeMB={8}
              variant="compact"
              compress={{ maxDim: 400, quality: 0.85, mime: "image/jpeg" }}
              folder="faculty"
            />
          </div>
          <div className="space-y-2">
            <Label>Cover</Label>
            <ThumbnailField
              value={cover}
              onChange={setCover}
              defaultTitle={name}
              compress={{ maxDim: 1600, quality: 0.82, mime: "image/jpeg" }}
              folder="faculty"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Expertise tags</Label>
          <Input
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            placeholder="React, Node.js, System Design"
          />
          <p className="text-[11px] text-muted-foreground">Comma-separated. Shown as chips on the public profile.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Twitter</Label>
            <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/handle" />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input value={linkedin} onChange={(e) => setLinkedIn(e.target.value)} placeholder="https://linkedin.com/in/you" />
          </div>
          <div className="space-y-2">
            <Label>Website / email</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="hello@example.com" />
          </div>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!canSave}>
          {editing ? "Update" : "Add member"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
