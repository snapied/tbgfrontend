"use client"

// Edit-student dialog. Lets the teacher tweak the fields they
// commonly need to touch on a student: name, phone, bio, address,
// avatar. Email is read-only because it's the account identifier.

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { useLMS, type User } from "@/lib/lms-store"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: User
}

export function StudentEditDialog({ open, onOpenChange, student }: Props) {
  const { updateUser } = useLMS()
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone ?? "")
  const [bio, setBio] = useState(student.bio ?? "")
  const [addressLine1, setAddressLine1] = useState(student.addressLine1 ?? "")
  const [addressLine2, setAddressLine2] = useState(student.addressLine2 ?? "")
  const [city, setCity] = useState(student.city ?? "")
  const [state, setState] = useState(student.state ?? "")
  const [postalCode, setPostalCode] = useState(student.postalCode ?? "")
  const [country, setCountry] = useState(student.country ?? "")
  const [avatar, setAvatar] = useState(student.avatar ?? "")
  const [notes, setNotes] = useState(student.notes ?? "")
  const [saving, setSaving] = useState(false)

  // Re-seed local state whenever the dialog is opened against a
  // different student, so previous edits don't leak in.
  useEffect(() => {
    if (!open) return
    setName(student.name)
    setPhone(student.phone ?? "")
    setBio(student.bio ?? "")
    setAddressLine1(student.addressLine1 ?? "")
    setAddressLine2(student.addressLine2 ?? "")
    setCity(student.city ?? "")
    setState(student.state ?? "")
    setPostalCode(student.postalCode ?? "")
    setCountry(student.country ?? "")
    setAvatar(student.avatar ?? "")
    setNotes(student.notes ?? "")
  }, [open, student])

  const save = () => {
    if (!name.trim()) return
    setSaving(true)
    updateUser(student.id, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      bio: bio.trim() || undefined,
      avatar: avatar.trim() || undefined,
      addressLine1: addressLine1.trim() || undefined,
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update {student.name}&apos;s profile. Email stays as their account identifier.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1 pt-2">
          <div className="space-y-2">
            <Label>Profile photo</Label>
            <div className="flex items-start gap-4">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={name}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground ring-2 ring-border">
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                </div>
              )}
              <div className="flex-1">
                <FileUploadField
                  value={avatar}
                  onChange={(url) => setAvatar(url)}
                  accept="image/png,image/jpeg,image/webp"
                  maxSizeMB={8}
                  variant="compact"
                  hideUrlInput
                  compress={{ maxDim: 400, quality: 0.85, mime: "image/jpeg" }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={student.email} readOnly disabled className="cursor-not-allowed bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98XXX XXXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A line about the student — their goal, background, anything useful to remember."
            />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Address line 1"
            />
            <Input
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Address line 2 (optional)"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal code" />
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (e.g. IN)" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Private notes (teacher-only)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything the student shouldn't see — preferences, parent contact, etc."
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
