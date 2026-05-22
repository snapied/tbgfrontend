"use client"

import { useState } from "react"
import { Plus, Search, Megaphone, AlertTriangle, Info, Bell, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useLMS, generateId, type Announcement } from "@/lib/lms-store"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"

// Creating announcements (broadcast to students / per-course pushes
// with priority + scheduling) is a marketing-toolkit feature.
// Starter sees the existing announcement list as a dimmed preview
// behind the upgrade card so they know exactly what they'd get.
export default function AnnouncementsPage() {
  return (
    <PlanFeatureGate feature="marketingTools">
      <AnnouncementsPageInner />
    </PlanFeatureGate>
  )
}

function AnnouncementsPageInner() {
  const { announcements, courses, getUserById, currentUser, addAnnouncement, updateAnnouncement } = useLMS()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newPriority, setNewPriority] = useState<"low" | "normal" | "high" | "urgent">("normal")
  // Radix Select forbids an empty-string value, so the "all students"
  // option uses a sentinel that we translate to `undefined` on save.
  const ALL_COURSES = "__all__"
  const [newCourse, setNewCourse] = useState<string>(ALL_COURSES)
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch = announcement.title.toLowerCase().includes(search.toLowerCase()) ||
      announcement.content.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || announcement.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreate = () => {
    if (!newTitle || !newContent || !currentUser) return
    
    const announcement: Announcement = {
      id: generateId("ann"),
      title: newTitle,
      content: newContent,
      courseId: newCourse && newCourse !== ALL_COURSES ? newCourse : undefined,
      authorId: currentUser.id,
      priority: newPriority,
      status: "published",
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    
    addAnnouncement(announcement)
    setNewTitle("")
    setNewContent("")
    setNewPriority("normal")
    setNewCourse(ALL_COURSES)
    setDialogOpen(false)
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return <AlertTriangle className="h-4 w-4 text-destructive" />
      case "high": return <Bell className="h-4 w-4 text-accent" />
      case "normal": return <Info className="h-4 w-4 text-primary" />
      default: return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "border-l-destructive bg-destructive/5"
      case "high": return "border-l-accent bg-accent/5"
      case "normal": return "border-l-primary bg-primary/5"
      default: return "border-l-muted-foreground bg-muted/50"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Announcements</h1>
          <p className="text-muted-foreground">Communicate with your students and team</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Share important updates with your students
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Announcement title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Write your announcement..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newPriority} onValueChange={(v) => setNewPriority(v as typeof newPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Course (optional)</Label>
                  <Select value={newCourse} onValueChange={setNewCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_COURSES}>All Students (Global)</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">
                Publish Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search announcements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No announcements found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a new announcement to communicate with your students
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAnnouncements.map((announcement) => {
            const author = getUserById(announcement.authorId)
            const course = announcement.courseId 
              ? courses.find(c => c.id === announcement.courseId) 
              : null
            
            return (
              <Card 
                key={announcement.id} 
                className={cn("border-l-4", getPriorityColor(announcement.priority))}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getPriorityIcon(announcement.priority)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                            announcement.status === "published" ? "bg-success/10 text-success" :
                            announcement.status === "draft" ? "bg-muted text-muted-foreground" :
                            "bg-destructive/10 text-destructive"
                          )}>
                            {announcement.status}
                          </span>
                          {announcement.priority === "urgent" && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive text-destructive-foreground">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                          <span>By {author?.name || "Unknown"}</span>
                          <span>
                            {course ? `For: ${course.title}` : "Global"}
                          </span>
                          <span>
                            {announcement.publishedAt 
                              ? new Date(announcement.publishedAt).toLocaleDateString() 
                              : "Not published"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateAnnouncement(announcement.id, { 
                            status: announcement.status === "archived" ? "published" : "archived" 
                          })}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {announcement.status === "archived" ? "Restore" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
