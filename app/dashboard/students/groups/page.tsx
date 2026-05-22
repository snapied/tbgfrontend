"use client"

// Student groups manager. Lets the teacher bucket students into named
// segments ("Cohort 5", "Scholarship 2026", "JEE Mains batch") for
// targeted messaging + filtering on the students list. Each group
// shows member count + purpose; click into a group to manage members.

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLMS, generateId, type StudentGroup, type User } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { MessageComposer } from "@/components/messages/message-composer"
import { StudentMultiSelect } from "@/components/students/student-multi-select"

const GROUP_COLORS = [
  "#0a3024", "#15803d", "#1e1b4b", "#9a3412", "#581c87", "#0f766e",
] as const

export default function StudentGroupsPage() {
  const {
    studentGroups,
    addStudentGroup,
    updateStudentGroup,
    deleteStudentGroup,
    users,
    getUserById,
    currentUser,
  } = useLMS()
  const confirm = useConfirm()
  const students = useMemo(() => users.filter((u) => u.role === "student"), [users])
  const [editing, setEditing] = useState<StudentGroup | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [messageGroup, setMessageGroup] = useState<StudentGroup | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/students">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to students
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Student groups</h1>
          <p className="text-muted-foreground">
            Bucket students into segments for targeted messaging and filters. Same student can sit
            in multiple groups.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New group
        </Button>
      </div>

      {studentGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No groups yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Group your students by cohort, scholarship status, or anything else useful — then
              message the whole group with one click.
            </p>
            <Button onClick={() => setNewOpen(true)} className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" /> Create your first group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studentGroups.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: g.color ?? GROUP_COLORS[0] }}
                      />
                      <h3 className="truncate font-semibold">{g.name}</h3>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {g.memberIds.length} member{g.memberIds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(g)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMessageGroup(g)} disabled={g.memberIds.length === 0}>
                        <Send className="mr-2 h-4 w-4" /> Message group
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Delete the "${g.name}" group?`,
                            description: "Members stay in your student roster — they're just removed from this group.",
                            destructive: true,
                          })
                          if (!ok) return
                          deleteStudentGroup(g.id)
                          toastUndoableDelete({
                            kind: "student-group",
                            ids: g.id,
                            label: g.name,
                            itemNoun: "group",
                          })
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {g.purpose && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{g.purpose}</p>
                )}
                {g.memberIds.length > 0 && (
                  <div className="mt-4 flex -space-x-2">
                    {g.memberIds.slice(0, 6).map((id) => {
                      const u = getUserById(id)
                      if (!u) return null
                      return u.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={id}
                          src={u.avatar}
                          alt={u.name}
                          title={u.name}
                          className="h-7 w-7 rounded-full border-2 border-card object-cover"
                        />
                      ) : (
                        <span
                          key={id}
                          title={u.name}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-semibold text-primary-foreground"
                        >
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                      )
                    })}
                    {g.memberIds.length > 6 && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
                        +{g.memberIds.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupDialog
        open={newOpen || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setNewOpen(false)
            setEditing(null)
          }
        }}
        editing={editing}
        students={students}
        onSave={(g) => {
          if (editing) updateStudentGroup(editing.id, g)
          else addStudentGroup({ ...g, id: generateId("grp"), createdBy: currentUser?.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as StudentGroup)
          setNewOpen(false)
          setEditing(null)
        }}
      />

      {messageGroup && (
        <MessageComposer
          open={!!messageGroup}
          onOpenChange={(o) => { if (!o) setMessageGroup(null) }}
          recipients={messageGroup.memberIds
            .map((id) => getUserById(id))
            .filter((u): u is User => !!u)}
          defaultSubject={`Update for ${messageGroup.name}`}
        />
      )}
    </div>
  )
}

// ============================================================
// Create / edit dialog
// ============================================================

function GroupDialog({
  open,
  onOpenChange,
  editing,
  students,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: StudentGroup | null
  students: User[]
  onSave: (draft: Partial<StudentGroup>) => void
}) {
  const [name, setName] = useState("")
  const [purpose, setPurpose] = useState("")
  const [color, setColor] = useState<string>(GROUP_COLORS[0])
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())

  // Re-seed on open so previous edit state doesn't leak.
  useMemo(() => {
    if (!open) return
    setName(editing?.name ?? "")
    setPurpose(editing?.purpose ?? "")
    setColor(editing?.color ?? GROUP_COLORS[0])
    setMemberIds(new Set(editing?.memberIds ?? []))
  }, [open, editing])

  const save = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      purpose: purpose.trim() || undefined,
      color,
      memberIds: [...memberIds],
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit group" : "New student group"}</DialogTitle>
          <DialogDescription>
            Name the group, write down what it&apos;s for, pick members.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1 pt-2 pl-3">
          <div className="space-y-2">
            <Label>Group name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cohort 5 — JEE Mains 2026"
            />
          </div>
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              placeholder="What's this group for? e.g. Weekly live class reminders + assignment drops."
            />
            <p className="text-[11px] text-muted-foreground">
              Helps you remember three months from now why the group exists.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Color tag</Label>
            <div className="flex gap-2">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition"
                  style={{
                    background: c,
                    boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
                    outline: color === c ? "2px solid var(--ring)" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Members</Label>
            <StudentMultiSelect
              students={students}
              value={memberIds}
              onChange={setMemberIds}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()}>
            <Users className="mr-1.5 h-4 w-4" />
            {editing ? "Update group" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
