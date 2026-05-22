"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldOff,
  Trash2,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { generateId, useLMS, type User } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { PhoneInput } from "@/components/forms/phone-input"

type TeamRole = "admin" | "instructor"

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser } = useLMS()
  const confirm = useConfirm()
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [resetPasswordFor, setResetPasswordFor] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)

  // Only show admins + instructors here. Students live on /dashboard/students.
  const team = useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "instructor"),
    [users],
  )
  const filteredUsers = useMemo(() => {
    if (!search) return team
    const q = search.toLowerCase()
    return team.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    )
  }, [team, search])

  const handleResetPassword = async (user: User) => {
    setResetPasswordFor(user)
    setBusy(true)
    try {
      await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, name: user.name }),
      })
      updateUser(user.id, { invitedAt: new Date().toISOString() })
    } finally {
      setBusy(false)
      setTimeout(() => setResetPasswordFor(null), 1800)
    }
  }

  const toggleDisabled = (user: User) => {
    updateUser(user.id, {
      disabledAt: user.disabledAt ? undefined : new Date().toISOString(),
    })
  }

  const handleDelete = async (user: User) => {
    const ok = await confirm({
      title: `Remove ${user.name} from the team?`,
      description: "They lose access immediately. Their personal data stays in your records.",
      destructive: true,
      confirmLabel: "Remove",
    })
    if (!ok) return
    deleteUser(user.id)
    toastUndoableDelete({
      kind: "user",
      ids: user.id,
      label: user.name,
      itemNoun: "team member",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage team</h1>
          <p className="text-muted-foreground">Admins and instructors who can run classes, grade work, and manage students.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Button onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add team member
          </Button>
          <AddTeamMemberDialog
            open={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onAdd={(user) => {
              addUser(user)
              setIsCreateOpen(false)
              // Send invite email through the existing password-reset flow —
              // the new user clicks the link and sets their password.
              fetch("/api/auth/reset-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email, name: user.name }),
              }).catch(() => { /* logged server-side */ })
            }}
          />
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            {filteredUsers.length === 0 && team.length > 0
              ? `No matches for "${search}".`
              : `${team.length} member${team.length === 1 ? "" : "s"} in your workspace.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <EmptyState onAdd={() => setIsCreateOpen(true)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last login</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                              {initials(user.name)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.phone && (
                              <p className="font-mono text-[11px] text-muted-foreground">{user.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <RoleSelect user={user} onChange={(role) => updateUser(user.id, { role })} />
                      </td>
                      <td className="px-4 py-4">
                        {user.disabledAt ? (
                          <Badge variant="outline" className="border-destructive/30 text-destructive">
                            Disabled
                          </Badge>
                        ) : user.invitedAt && !user.lastLoginAt ? (
                          <Badge variant="secondary">Invited</Badge>
                        ) : (
                          <Badge className="bg-success text-success-foreground">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : <span className="text-xs">Never</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={`mailto:${user.email}`}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(user)} disabled={busy}>
                              <RefreshCw className={cn("mr-2 h-4 w-4", busy && resetPasswordFor?.id === user.id && "animate-spin")} />
                              {user.invitedAt && !user.lastLoginAt ? "Resend invite" : "Send password reset"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleDisabled(user)}>
                              {user.disabledAt ? (
                                <><Shield className="mr-2 h-4 w-4" />Re-enable account</>
                              ) : (
                                <><ShieldOff className="mr-2 h-4 w-4" />Disable account</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(user)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove from team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flash banner when a reset / invite just went out */}
      {resetPasswordFor && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-success/30 bg-card px-4 py-2 text-sm shadow-md">
          <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-success" />
          Sent to <span className="font-medium">{resetPasswordFor.email}</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-3 font-semibold">You're flying solo</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Bring in instructors so they can build courses, run classes, and grade work alongside you.
      </p>
      <Button onClick={onAdd} className="mt-4">
        <UserPlus className="mr-2 h-4 w-4" />
        Add team member
      </Button>
    </div>
  )
}

function RoleSelect({ user, onChange }: { user: User; onChange: (role: TeamRole) => void }) {
  return (
    <Select value={user.role} onValueChange={(v) => onChange(v as TeamRole)}>
      <SelectTrigger className="h-7 w-32 text-xs capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="instructor">Instructor</SelectItem>
      </SelectContent>
    </Select>
  )
}

function AddTeamMemberDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (u: User) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneValid, setPhoneValid] = useState(false)
  const [role, setRole] = useState<TeamRole>("instructor")
  const [submitting, setSubmitting] = useState(false)

  const emailValid = !email || /^[^@]+@[^@]+\.[^@]+$/.test(email)
  const canSubmit = !!name.trim() && !!email && emailValid && phoneValid

  const reset = () => {
    setName(""); setEmail(""); setPhone(""); setPhoneValid(false); setRole("instructor")
  }

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      onAdd({
        id: generateId("user"),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone,
        role,
        createdAt: new Date().toISOString(),
        invitedAt: new Date().toISOString(),
      })
      reset()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
          <DialogDescription>
            We&apos;ll email them a link to set their password. WhatsApp is required for class reminders.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tm-name">Full name *</Label>
            <Input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-email">Email *</Label>
            <Input
              id="tm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              placeholder="jane@yourdomain.com"
            />
            {email && !emailValid && (
              <p className="inline-flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> That doesn&apos;t look like a valid email.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp number *</Label>
            <PhoneInput
              value={phone}
              onChange={(e164, valid) => { setPhone(e164); setPhoneValid(valid) }}
              required
              whatsapp
              placeholder="98765 43210"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger id="tm-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instructor">Instructor — can build &amp; teach</SelectItem>
                <SelectItem value="admin">Admin — full workspace access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            Add &amp; send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?"
}

