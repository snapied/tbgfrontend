"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

// Persist the users list to localStorage so students added through the
// portal survive page refreshes. The rest of the LMS store (courses,
// enrollments, quizzes…) is still in-memory; only users are user-editable
// from the dashboard right now, so that's the only slice we persist.
// Storage keys are tenant-scoped — every read/write goes through tk(slug, name).
// In production this becomes a `WHERE tenant_id = ?` filter on the backend; for
// now it keeps each workspace's localStorage data fully isolated so switching
// tenants in dev (?tenant=acme) gives you a clean slate.
import { readCurrentTenantSlug } from "./tenant-store"
import { regenerateCoverUrl } from "./cover-fallback"
import { reportStorageError } from "./storage-error"
import { pushToTrash, registerRestoreHandler } from "./trash"
import { pushRoomState } from "./live-room-state"
import {
  buildNotifications,
  quizSubmittedNotification,
  assignmentSubmittedNotification,
} from "./notifications"
import {
  ensureTenantBlobPulled,
  mirrorSliceToServer,
  persistTenantSlice,
} from "./tenant-state-sync"

const KEY_SUFFIXES = {
  users: "lms.users.v1",
  courses: "lms.courses.v1",
  enrollments: "lms.enrollments.v1",
  quizzes: "lms.quizzes.v1",
  quizAttempts: "lms.quizAttempts.v1",
  liveSessions: "lms.liveSessions.v1",
  attendance: "lms.attendance.v1",
  notifications: "lms.notifications.v1",
  sentEmails: "lms.sentEmails.v1",
  assignments: "lms.assignments.v1",
  submissions: "lms.submissions.v1",
  assignmentViews: "lms.assignmentViews.v1",
  reviews: "lms.reviews.v1",
  // New: per-student Q&A thread + outbound messages (single + bulk)
  doubts: "lms.doubts.v1",
  messages: "lms.messages.v1",
  studentGroups: "lms.studentGroups.v1",
  // Common Room posts — one slice for the whole workspace, indexed
  // by batchId when read. Keeps a single persistence boundary per
  // tenant instead of one slice per batch.
  batchPosts: "lms.batchPosts.v1",
  // Standalone whiteboards the instructor creates outside of any
  // live class. The actual canvas state (strokes, shapes, etc.) is
  // managed by tldraw in IndexedDB keyed by persistenceKey; we only
  // store metadata here (title, createdAt, thumbnail).
  whiteboards: "lms.whiteboards.v1",
  // Pending / decided requests from students asking for edit access
  // on a whiteboard they can currently only view. Owner approves →
  // student gets added to the board's invitedUserIds.
  whiteboardAccessRequests: "lms.whiteboardAccessRequests.v1",
} as const

type KeyName = keyof typeof KEY_SUFFIXES

function tk(slug: string, name: KeyName): string {
  return `thebigclass.t.${slug}.${KEY_SUFFIXES[name]}`
}

// Persist a courses[] array to localStorage with a progressive
// quota-failure cascade. Each step shrinks the payload more
// aggressively than the last until either a write succeeds or
// we've shed enough to give up and console.error.
//
// The order: full → strip baked data: URL thumbnails → empty the
// lesson `content` field of the oldest course (repeat) → keep only
// the 3 most recent courses → keep only the newest course alone.
// We prefer to lose old courses' fancy covers and seeded lesson
// content rather than lose the brand-new course the user just
// hit Create on.
export function persistCoursesWithFallback(key: string, courses: Course[]): void {
  if (typeof window === "undefined") return
  const setItem = (value: unknown) =>
    window.localStorage.setItem(key, JSON.stringify(value))

  // Tier 1 — full payload.
  try {
    setItem(courses)
    return
  } catch { /* fall through */ }

  // Tier 2 — replace `data:` URL thumbnails (baked covers, inlined
  // upload fallbacks — the single biggest field a course carries)
  // with a deterministic regenerated Picsum URL. Same algorithm
  // the original cover-picker uses, derived from title + category,
  // so the course still shows the same photograph after the strip.
  // We never set thumbnail to an empty string here — that would
  // make the dashboard render placeholder.svg.
  const noData = courses.map((c) =>
    typeof c.thumbnail === "string" && c.thumbnail.startsWith("data:")
      ? { ...c, thumbnail: regenerateCoverUrl({ title: c.title, category: c.category }) }
      : c,
  )
  try {
    setItem(noData)
    // eslint-disable-next-line no-console
    console.warn(
      "[thebigclass] courses persist: stripped baked thumbnails to fit storage",
    )
    return
  } catch { /* fall through */ }

  // Tier 3 — empty the lesson `content` field of the oldest
  // course, then the next, etc., until we fit. Lesson bodies are
  // the next-heaviest field after thumbnails.
  const sortedByOldest = [...noData].sort((a, b) => {
    const ta = new Date(a.updatedAt ?? a.createdAt).getTime()
    const tb = new Date(b.updatedAt ?? b.createdAt).getTime()
    return ta - tb
  })
  let trimmed = [...noData]
  for (let i = 0; i < sortedByOldest.length; i++) {
    const targetId = sortedByOldest[i].id
    trimmed = trimmed.map((c) =>
      c.id === targetId
        ? {
            ...c,
            modules: c.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) => ({ ...l, content: "" })),
            })),
          }
        : c,
    )
    try {
      setItem(trimmed)
      // eslint-disable-next-line no-console
      console.warn(
        `[thebigclass] courses persist: emptied lesson content on ${i + 1} oldest course(s) to fit storage`,
      )
      return
    } catch { /* keep trimming */ }
  }

  // Tier 4 — keep only the 3 most recent courses (by updatedAt).
  const recent3 = [...noData]
    .sort((a, b) => {
      const ta = new Date(b.updatedAt ?? b.createdAt).getTime()
      const tb = new Date(a.updatedAt ?? a.createdAt).getTime()
      return ta - tb
    })
    .slice(0, 3)
  try {
    setItem(recent3)
    // eslint-disable-next-line no-console
    console.warn(
      "[thebigclass] courses persist: kept only the 3 most recent courses to fit storage",
    )
    return
  } catch { /* fall through */ }

  // Tier 5 — keep only the single newest course (minimal payload).
  // At this point we've already lost a lot; bail loud if even this
  // fails so the user sees something is wrong.
  if (recent3.length > 0) {
    const newest = [recent3[0]]
    try {
      setItem(newest)
      // eslint-disable-next-line no-console
      console.warn(
        "[thebigclass] courses persist: kept ONLY the newest course; older ones lost to storage quota",
      )
      return
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[thebigclass] courses persist failed entirely — storage quota cannot accommodate even one course:",
        err,
      )
    }
  }
}

// Minimal HTML escaper for transactional emails composed in this file.
// Just the 5 characters that change meaning inside an attribute or text
// node — anything more sophisticated belongs in a dedicated email lib.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// One-time migration: legacy (pre-multi-tenant) keys at thebigclass.lms.*.v1
// belong to the platform-owner workspace. Copy them under the new key shape
// the first time the app boots after this upgrade, so existing courses,
// quizzes, students etc. don't disappear.
function migrateLegacyKeys(targetSlug: string) {
  if (typeof window === "undefined") return
  const MIGRATED_FLAG = `thebigclass.t.${targetSlug}.migrated.v1`
  try {
    if (window.localStorage.getItem(MIGRATED_FLAG)) return
    let moved = 0
    for (const name of Object.keys(KEY_SUFFIXES) as KeyName[]) {
      const legacyKey = `thebigclass.${KEY_SUFFIXES[name]}`
      const newKey = tk(targetSlug, name)
      const legacyValue = window.localStorage.getItem(legacyKey)
      if (legacyValue && !window.localStorage.getItem(newKey)) {
        window.localStorage.setItem(newKey, legacyValue)
        moved++
      }
    }
    window.localStorage.setItem(MIGRATED_FLAG, new Date().toISOString())
    if (moved > 0) {
      // eslint-disable-next-line no-console
      console.info(`[thebigclass] migrated ${moved} legacy LMS slice(s) to tenant "${targetSlug}"`)
    }
  } catch { /* ignore */ }
}

// ==================== TYPES ====================

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: "admin" | "instructor" | "student"
  bio?: string
  createdAt: string
  // When set, the user is suspended — login is blocked once real auth lands
  // and they're rendered as "Disabled" on the team-management screen.
  disabledAt?: string
  // Last successful sign-in. Stays undefined until real auth is wired up,
  // at which point /api/auth/login should bump it on every session create.
  lastLoginAt?: string
  // Optional pointer to the most recent invite email so we can show a
  // "sent X minutes ago" hint in Manage Users.
  invitedAt?: string
  // Extended profile — all optional. Used by the Add Student dialog,
  // the student profile page, and (eventually) the certificate generator
  // so issued certs can carry richer recipient data than the CSV columns.
  phone?: string
  dateOfBirth?: string  // ISO yyyy-mm-dd
  age?: number          // computed from DOB or set explicitly
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | 'other'
  // Location
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  // Education
  school?: string
  schoolBoard?: string  // e.g. CBSE, ICSE, IB
  college?: string
  collegeDegree?: string  // e.g. B.Tech, B.Sc, MBBS
  collegeMajor?: string
  collegeGraduationYear?: number
  highestQualification?: string
  // Online presence — surfaced on the public instructor card on every
  // course page. Each is an absolute URL the teacher controls. All
  // rendered with rel="nofollow noopener noreferrer" so we don't pass
  // SEO juice through user-controlled URLs.
  linkedInUrl?: string
  githubUrl?: string
  twitterUrl?: string
  portfolioUrl?: string
  youtubeUrl?: string
  instagramUrl?: string
  // Wide banner image for the instructor's public surface (16:9 ish).
  // Shown above the instructor card on course pages; falls back to a
  // generated gradient when unset so the page still feels designed.
  coverImageUrl?: string
  // Documents — backend asset URLs (uploaded via /api/assets/upload)
  resumeUrl?: string
  // Free-form
  notes?: string
  // Per-user notification channel preferences. Absence = all-on (the
  // historical behaviour), so users without explicit settings continue
  // to receive every channel. Set false to opt out of a channel;
  // buildNotifications honours this when fanning out.
  notificationChannels?: {
    inApp?: boolean
    email?: boolean
    whatsapp?: boolean
  }
  // IANA timezone string (e.g. "Asia/Kolkata") used for displaying
  // class times in the student's local zone. Falls back to the
  // browser default when unset.
  timezone?: string
}

export interface LessonAttachment {
  id: string
  filename: string
  url: string
  sizeBytes?: number
  mandatory?: boolean
  downloadable?: boolean
}

// Expanded set of lesson types. "pdf" is kept for backwards compat with seeded
// data; new content should prefer "document" (PDF/DOC/PPT/XLSX/TXT) or "embed"
// (Canva, Gamma, Slides, Notion, Figma, Loom — anything iframe-able).
export type LessonType =
  | "video"
  | "text"
  | "pdf"
  | "document"
  | "embed"
  | "audio"
  | "quiz"
  | "live"

export interface Lesson {
  id: string
  title: string
  description: string
  type: LessonType
  content: string  // URL, markdown, quiz ID, or live-session ID
  duration: number  // in minutes
  order: number
  isPreview: boolean   // free preview lesson (overrides paid lock)
  isLocked?: boolean   // explicit paid lock (otherwise inferred from course price)
  attachments?: LessonAttachment[]
  transcript?: string  // for video/audio; AI-fillable later
  resources?: Array<{ label: string; url: string }>
}

export interface Module {
  id: string
  title: string
  description: string
  lessons: Lesson[]
  order: number
  // Optional per-module instructor — overrides the course's
  // primary instructor for the lessons inside this module. Used when
  // a course is co-taught and Module 1 is owned by one teacher,
  // Module 2 by another. Resolves through users[] by id; falls back
  // silently to the course instructor when the id is unknown.
  instructorId?: string
  // Days after enrollment (Phase 3B drip). When set, the lessons in
  // this module render as "Unlocks on <date>" in the player until
  // the student is past the offset. 0 / undefined = available
  // immediately (current default for every existing module).
  unlockOffsetDays?: number
}

export interface Coupon {
  id: string
  code: string
  discountPercent: number  // 0-100
  validFrom?: string  // ISO
  validUntil?: string  // ISO
  maxUses?: number
  uses: number
  createdAt: string
}

export type CourseVisibility = "public" | "private" | "unlisted" | "password"

export interface Course {
  id: string
  title: string
  subtitle?: string
  slug: string
  description: string
  thumbnail: string
  instructor: User
  // Additional teachers contributing to this course. The primary
  // `instructor` above stays the headline owner (shown in the hero,
  // gets the rating, signs the certificate); these are co-teachers
  // who can build / edit content. Surfaced on the public course
  // page as a "Taught by" rail when populated.
  coInstructorIds?: string[]
  // Pricing
  price: number
  originalPrice?: number
  currency: string
  earlyBirdPrice?: number
  earlyBirdUntil?: string  // ISO
  coupons?: Coupon[]
  // Discovery
  category: string
  tags?: string[]
  level: "beginner" | "intermediate" | "advanced"
  language: string
  introVideoUrl?: string
  // SEO — overrides the auto-generated meta on the public course page.
  // Each is optional; when absent, the renderer falls back to the course
  // title / description / thumbnail. Stored verbatim so a teacher can
  // tune for search and social sharing independently of the marketing
  // copy that fills the rest of the page.
  seoTitle?: string         // <title> + <meta name="title">; <=60 chars
  seoDescription?: string   // <meta name="description">; <=160 chars
  seoKeywords?: string[]    // comma-separated <meta name="keywords">
  ogImage?: string          // OpenGraph image URL for social shares
  // Content
  modules: Module[]
  totalDuration: number  // in minutes
  totalLessons: number
  enrolledCount: number
  rating: number
  reviewCount: number
  // Lifecycle
  status: "draft" | "published" | "archived"
  publishAt?: string  // ISO; for scheduled publishing
  visibility?: CourseVisibility
  accessPassword?: string  // plain for POC; hash on the server
  // Marketing
  features: string[]
  requirements: string[]
  whatYouLearn: string[]
  // Certification — either a built-in template id (see
  // BUILTIN_TEMPLATES in lib/certificate-templates.ts) OR a custom template
  // id like `custom-<random>` pointing at a CustomTemplate the teacher
  // designed. Renderers branch on isBuiltinTemplateId() to know which path
  // to take.
  certificateEligible?: boolean
  certificateTemplate: string
  // ── Monetize wizard (Phase 2) ───────────────────────────────
  // These fields drive the funnel mechanics around the course
  // without changing the existing `price` / `currency` shape.
  // They're all optional so courses created before the wizard
  // landed keep working unchanged.
  //
  // accessModel — how the buyer gets in:
  //   "one-time"       — buy once, lifetime access (current default)
  //   "payment-plan"   — split the price across N months
  //   "membership"     — locked unless the buyer holds the
  //                      instructor's membership product
  accessModel?: "one-time" | "payment-plan" | "membership"
  // Product id (in the storefront `Product` table) shown as a
  // single-checkbox "add the resource pack for ₹X" bump on the
  // checkout page. Wizard step 2 either picks an existing
  // `download`-kind product or creates one.
  checkoutBumpProductId?: string
  // Product id of a `session`-kind product (1-on-1 coaching).
  // Surfaced on the post-purchase "What's next" page as the
  // premium add-on offer. Wizard step 3 creates this; instructors
  // can opt out.
  coachingProductId?: string
  // Default community (StudentGroup) this course funnels into.
  // Phase 3C: every course purchase auto-adds the buyer to this
  // batch's memberIds — so "join the community" stops being a
  // separate sale. Surfaced as the third slot on the "what's next"
  // page. Optional; courses without a default batch silently skip
  // the auto-join.
  defaultBatchId?: string
  createdAt: string
  updatedAt: string
}

export interface Enrollment {
  id: string
  courseId: string
  studentId: string
  enrolledAt: string
  completedAt?: string
  progress: number // 0-100
  lastAccessedAt: string
  completedLessons: string[] // lesson IDs
  currentLessonId?: string
  certificateId?: string
}

export interface QuizQuestion {
  id: string
  question: string
  // "long-answer" is essay-style — student answer is rich text, no
  // auto-grading; teacher reviews via the standard quiz attempt
  // review flow. `correctAnswer` stays optional for this type (some
  // teachers like to record a model answer / rubric notes).
  type: "multiple-choice" | "true-false" | "short-answer" | "long-answer"
  options?: string[]
  correctAnswer: string | number // index for multiple-choice, string for others
  explanation?: string
  points: number
}

export interface Quiz {
  id: string
  title: string
  description: string
  courseId: string
  moduleId?: string
  lessonId?: string
  questions: QuizQuestion[]
  timeLimit?: number // in minutes
  passingScore: number // percentage
  maxAttempts: number
  shuffleQuestions: boolean
  showAnswers: boolean
  // "auto"    — score and (optionally) answers are revealed immediately on submit.
  // "teacher" — submission goes into a review queue; results stay hidden until
  //             a teacher releases them. Default for new quizzes.
  gradingMode?: "auto" | "teacher"
  createdAt: string
}

export interface QuizQuestionGrade {
  // Teacher's per-question verdict. Falls back to auto-comparison when absent.
  correct: boolean
  note?: string
}

export interface QuizAttempt {
  id: string
  quizId: string
  studentId: string
  answers: Record<string, string | number>
  score: number
  passed: boolean
  startedAt: string
  completedAt?: string
  timeSpent: number // in seconds
  // "graded"         — score is final and visible to the student.
  // "pending-review" — teacher hasn't released results yet.
  status?: "graded" | "pending-review"
  questionGrades?: Record<string, QuizQuestionGrade>
  teacherFeedback?: string
  gradedAt?: string
  gradedBy?: string
}

export interface Review {
  id: string
  courseId: string
  studentId: string
  rating: number
  comment: string
  createdAt: string
  // Number of times the student has updated this review after the
  // initial post. 0 (or undefined) means "never edited". Kept as a
  // lifetime counter for stats, but no longer used to gate edits —
  // the rate limit now lives in `editTimestamps` (rolling 24h window).
  editCount?: number
  updatedAt?: string
  // ISO timestamps of recent edits, used by addReview / the form to
  // enforce a rolling cap (MAX_REVIEW_EDITS_PER_WINDOW per
  // REVIEW_EDIT_WINDOW_MS). Older entries are pruned on every write
  // so this stays bounded. Re-enables editing automatically once the
  // oldest stored edit ages past the window.
  editTimestamps?: string[]
  // Teacher / instructor reply, posted from the reviews-management page.
  // When set, the public reviews surface renders it inline below the
  // review as a "Response from the instructor" block. Empty string is
  // treated the same as undefined (cleared reply).
  teacherReply?: string
  teacherReplyAt?: string
  // Moderation flag. Spam reviews are kept in the data set so the teacher
  // can review them later, but excluded from the public list and from
  // the course's rating aggregate. Toggled from the management page.
  isSpam?: boolean
}

// Hard cap on how many times a student can update their own review — lifetime,
// not rolling. Once they hit 3 edits the form locks permanently.
export const MAX_REVIEW_EDITS = 3
// Keep these for back-compat with any code that imported them, but
// the rolling-window model is replaced by the lifetime cap above.
export const MAX_REVIEW_EDITS_PER_WINDOW = MAX_REVIEW_EDITS
export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Given a review (or undefined for a brand-new one), return whether
 * the student can still edit it. A student gets MAX_REVIEW_EDITS total
 * updates (lifetime, not rolling). Once spent, the review is locked
 * permanently. Shared by the store guard and the form UI.
 */
export function reviewEditWindow(
  review: { editCount?: number; editTimestamps?: string[] } | undefined,
  _now: number = Date.now(),
): {
  recentEdits: string[]
  editsLeft: number
  unlocksAt: number | null
} {
  const used = review?.editCount ?? 0
  const editsLeft = Math.max(0, MAX_REVIEW_EDITS - used)
  return {
    recentEdits: review?.editTimestamps ?? [],
    editsLeft,
    unlocksAt: null, // permanent lock — no rolling unlock
  }
}

export interface Announcement {
  id: string
  title: string
  content: string
  courseId?: string // null for global announcements
  authorId: string
  priority: "low" | "normal" | "high" | "urgent"
  status: "draft" | "published" | "archived"
  publishedAt?: string
  createdAt: string
}

export interface Discussion {
  id: string
  // Optional — a discussion can be tied to a specific course, or it can be a
  // general workspace-wide thread (announcements, community Q&A). Empty /
  // undefined means "General".
  courseId?: string
  lessonId?: string
  authorId: string
  title: string
  content: string
  replies: DiscussionReply[]
  isPinned: boolean
  isResolved: boolean
  createdAt: string
}

export interface DiscussionReply {
  id: string
  authorId: string
  content: string
  isAnswer: boolean
  createdAt: string
}

// Live classes — teacher schedules a session and pastes a Meet/Zoom URL; the
// provider is detected from the URL but can be overridden. Status fields like
// "live" / "ended" are computed at read time from scheduledAt + durationMinutes,
// not stored, so the clock always reflects reality.
// "in-house" is our own video room — students join straight from the
// portal, no external link or login. The rest are passthroughs to
// Zoom / Meet / Teams / a custom URL the teacher pastes in.
export type LiveProvider = "in-house" | "google-meet" | "zoom" | "ms-teams" | "other"

// State of an in-house room. Drives the student waiting-room UX:
//   scheduled — pre-class. Show countdown + prep checklist.
//   open      — teacher entered the room. Auto-beam students in.
//   live      — class is in progress.
//   ended     — wrap-up screen + recording link.
// The state machine only applies to provider="in-house". Other
// providers stay on `status` ("scheduled" | "cancelled") since we
// don't control their lifecycle.
export type LiveRoomState = "scheduled" | "open" | "live" | "ended"

// Stored recording. URL points at whatever blob host we end up using
// (S3, Mux, the WebRTC provider's recording feature). For the POC we
// stub the URL as a placeholder so the rest of the UX flows can be
// demoed end-to-end without a recording pipeline behind it.
export interface LiveRecording {
  id: string
  url: string                  // public or signed URL to the mp4 / webm
  startedAt: string            // when the recording began
  endedAt: string              // when stopped
  durationSec: number
  // True when this is a stub (no real video at the URL yet). UI shows
  // a "processing" badge instead of a play button. Replaced by the
  // real recording once the encoding pipeline finishes.
  pending?: boolean
}

// Anything a teacher might want to attach to a class after it happens:
// the embed-able links (Canva, Gamma, Slides, Notion, Figma), uploaded
// files (PDF, slides, images), notes, and external videos (recordings).
// Reused by assignments (`AssignmentResource`) — same shape, different home.
export type SessionMaterialType =
  | "link"
  | "file"
  | "video"
  | "image"
  | "embed"
  | "note"
  | "quiz"
  | "assignment"
  | "homework"
export interface SessionMaterial {
  id: string
  type: SessionMaterialType
  label: string
  url?: string
  note?: string
  sizeBytes?: number
  // For "embed" the auto-detected provider name (Canva, Gamma…), surfaced
  // as a label on the chip. Optional — the viewer detects at render time.
  provider?: string
  // Quiz attachments reference a quiz in useLMS().quizzes — students click
  // "Take quiz" and we route to /quiz/<quizId>. Homework/assignment items
  // can optionally point at a stored assignment, otherwise the label + url
  // (e.g. "Read chapter 4" with PDF link) is enough.
  quizId?: string
  assignmentId?: string
  dueAt?: string
}

export interface LiveSession {
  id: string
  courseId: string
  title: string
  description?: string
  provider: LiveProvider
  meetingUrl: string
  scheduledAt: string  // ISO start time
  durationMinutes: number
  hostId: string  // userId
  status: "scheduled" | "cancelled"
  // ---- In-house room state ----
  // Only populated when provider === "in-house". Drives the
  // student waiting-room → in-class → ended transitions.
  roomState?: LiveRoomState
  roomCode?: string            // short code used in the URL: /p/<tenant>/live/<code>
  roomOpenedAt?: string        // when the teacher hit "Open room"
  roomStartedAt?: string       // when the class actually started (transition open → live)
  roomEndedAt?: string         // when ended
  // Stored recordings. Multiple entries possible (e.g. teacher
  // paused + restarted; or recorded a Q&A separately).
  recordings?: LiveRecording[]
  // ---- Post-class recap (filled in after the class happens) ----
  // Explicit confirmation the class actually took place. Falls back to the
  // computed "ended" status when undefined, but lets the teacher *cancel
  // ended* (e.g. canceled at the last minute but never marked) or *confirm
  // held* (e.g. ran short, marked early).
  wasHeld?: boolean
  // Markdown / plain text — "What we covered today".
  summary?: string
  // The video recording — usually the platform's auto-export (Zoom cloud,
  // Meet recording, Loom, YouTube unlisted). Inline-embedded when shown.
  recordingUrl?: string
  // Slides, PDFs, links, embeds, notes — anything the teacher wants to
  // make available to students who attended (or to no-shows as catch-up).
  materials?: SessionMaterial[]
  createdAt: string
  // Notifications fired once when the session was created/updated so we don't
  // re-notify on every page load.
  notifiedAt?: string
  // ---- Recurrence ----
  // When a class is scheduled with a "repeats" option, every instance shares
  // the same seriesId and the *first* instance owns the series metadata
  // (label, count, end date). Cancelling/editing one instance does NOT touch
  // the rest unless the teacher chooses "apply to series".
  seriesId?: string
  recurrence?: {
    // Human-readable label like "Weekly on Mon" or "Every 3 days".
    label: string
    // Days between sessions. 1=daily, 7=weekly, etc.
    intervalDays: number
    // Total number of instances in the series (including the first).
    count: number
    // Position of this instance, 1-based.
    index: number
  }
  // Reminder-fan-out de-dupe markers. Each key maps to the ISO
  // timestamp at which that reminder window fired so the scheduler
  // never sends the same reminder twice. Server-side scanner sets
  // these; clients read them only to render "reminder sent" badges.
  remindersSent?: Partial<Record<ReminderWindowKey, string>>
}

// Three reminder windows fan out before a class. Naming maps to the
// human label the recipient sees ("Starting in 3 hours" etc.).
export type ReminderWindowKey = "3h" | "1h" | "15m"

export interface AttendanceRecord {
  id: string
  sessionId: string
  studentId: string
  joinedAt: string
  leftAt?: string
}

// Standalone whiteboard the instructor created from /dashboard/whiteboards.
// The actual canvas content lives in IndexedDB under tldraw's persistenceKey
// (we just hold metadata here). Cheap to list, sort, rename, and delete.
export interface Whiteboard {
  id: string
  title: string
  /** ISO timestamp for the *last* meaningful change to the canvas. */
  updatedAt: string
  createdAt: string
  /** User id of the creator. Defaults to currentUser when created from UI. */
  createdBy: string
  /** Optional class session this board was attached to. */
  sessionId?: string
  /** Optional preview image (data: URL or asset URL) for the index card. */
  thumbnail?: string
  /** Tldraw persistenceKey — derived from id, exposed for routing. */
  persistenceKey: string
  /** "private" = only the creator + explicit invitees can open it;
   *  "public" = anyone in the workspace can view (still requires sign-in).
   *  Defaults to "public" for new boards — most whiteboards are
   *  shared brainstorms, and teachers were finding the private-by-
   *  default surprising. Flip to private from the board settings
   *  when a solo scratchpad is genuinely needed. */
  visibility?: "private" | "public"
  /** Optional list of user ids the creator invited into a private
   *  board. Members can view + edit. Owner is implicit (createdBy)
   *  and isn't repeated here. */
  invitedUserIds?: string[]
}

// One row per student-initiated "let me edit this board too" ask.
// The board page surfaces pending rows for the owner with approve /
// deny buttons; approve flips status + appends the student to the
// board's invitedUserIds; deny leaves the board untouched. The
// student polls the same store to flip their button from "Requested"
// back to nothing once a decision lands.
export interface WhiteboardAccessRequest {
  id: string
  boardId: string
  studentId: string
  requestedAt: string
  status: "pending" | "approved" | "denied"
  /** When approved/denied — for the student's "decided X ago" hint. */
  decidedAt?: string
}

// Log of every email this workspace sent OUT (replies, invites,
// support acks). Surfaces in /dashboard/inbox under the "Sent" pill
// so admins can see "what we said back" alongside what came in.
// Stored client-side for the POC; a real backend would persist to
// the same email-log table the SMTP provider already writes to.
export interface SentEmail {
  id: string
  // ISO timestamp of the send (success or stub).
  sentAt: string
  // Display name of the user who fired the send when known (admin
  // who hit Reply on a doubt, owner who fired Contact-Support, …).
  fromName?: string
  // Recipient(s). Single string for the common one-recipient case;
  // string[] for fan-outs (community broadcast).
  to: string | string[]
  subject: string
  // Plain-text body (HTML stripped) so the inbox preview reads
  // cleanly without rendering arbitrary HTML.
  preview: string
  // Optional context the writer can use to route a click back to the
  // source surface ("/dashboard/doubts/123", "/dashboard/portal/leads/...").
  contextUrl?: string
  // Free-form provenance: "doubt-reply" | "support-ack" | "manual" |
  // "contact-form-followup" — used to filter / group later.
  kind?: string
  // True when the email actually left the building (Zepto returned ok),
  // false for stubbed sends in dev when the provider isn't configured.
  delivered: boolean
}

export type NotificationChannel = "in-app" | "email" | "whatsapp"
export type NotificationStatus = "queued" | "sent" | "failed" | "read"
export interface Notification {
  id: string
  userId: string  // recipient
  channel: NotificationChannel
  type: string  // e.g. "live-session.scheduled", "assignment.graded"
  title: string
  body: string
  url?: string
  createdAt: string
  sentAt?: string
  readAt?: string
  status: NotificationStatus
  meta?: Record<string, unknown>
}

// ── Doubts / Q&A ────────────────────────────────────────────
// A doubt is a student-initiated question scoped to a course (and
// optionally a lesson). Teachers reply via replies[]; the thread is
// closed when status === "resolved". Lives on lms-store so the
// notification + email pipeline can reuse the same dispatcher.
export interface DoubtReply {
  id: string
  authorId: string
  body: string                  // Tiptap HTML
  createdAt: string
}
export interface Doubt {
  id: string
  studentId: string
  courseId?: string
  lessonId?: string
  title: string
  body: string                  // Tiptap HTML — student's question
  replies: DoubtReply[]
  status: "open" | "resolved"
  createdAt: string
  updatedAt: string
  // Pre-sale / unauthenticated enquiry context. When present, this
  // doubt was filed from the public course page by someone without a
  // student account; the dashboard surfaces the guest name + email,
  // and the reply flow emails the captured address directly instead
  // of going through a User record.
  guest?: {
    name: string
    email: string
    // Optional WhatsApp so the teacher can reply via WhatsApp + email
    // when the guest left a number on the public Q&A form.
    whatsapp?: string
  }
}

// ── Outbound messages (single + bulk) ───────────────────────
// A Message is one composer "send" event. recipientIds captures who
// the teacher sent it to; channels lists which delivery mechanisms
// were used. Stored so the dashboard can show "what was sent" history
// per student / per send, and so the teacher can resend.
// ── Student groups ─────────────────────────────────────────
// A free-form bucket the teacher can pin a set of student ids into.
// Used as a recipient picker in the message composer ("send to Cohort
// 5") and as a filter on the students list. `purpose` is the
// teacher's own note about what the group is for — drives nothing
// behaviour-wise, just shown in the UI to keep groups understandable
// three months later when someone forgets why "Cohort 5" exists.
// StudentGroup is the internal type name; the UI surfaces it as
// "Batch" since that's how teachers actually describe a cohort —
// the change is cosmetic only so we don't have to ripple a rename
// through every existing store usage and migration.
// "Community access" — how new members get in. Modelled like
// WhatsApp groups: open is "anyone in the workspace can join", closed
// is "owner adds people manually", invite-link uses a rotatable code
// that lets anyone with the link join, tag-gated requires the user to
// have a matching tag on their profile. teachers-only adds an
// orthogonal staff-only flag the UI layers on top of any visibility.
export type CommunityVisibility = "open" | "closed" | "invite-link" | "tag-gated"

export interface StudentGroup {
  id: string
  name: string                  // "Cohort 5", "Scholarship students"
  purpose?: string              // free-form description
  description?: string          // longer marketing-style blurb shown in batch detail
  color?: string                // optional hex/oklch tag colour
  // Optional course this batch is centered around. Drives the
  // "common interest" + member-suggestion UX in the batch detail page.
  courseId?: string
  memberIds: string[]           // user ids (students)
  // ── Community access controls ────────────────────────────────────
  // How members can join. Defaults to "closed" (owner adds manually)
  // for backwards compat with existing batches. UI flips to invite-
  // link / tag-gated / open per-community.
  visibility?: CommunityVisibility
  // Rotatable code attached to invite-link communities. Visitors
  // hitting /p/<tenant>/join/<code> auto-add themselves to memberIds.
  // Owner can rotate to invalidate outstanding share links.
  inviteCode?: string
  // List of tags. When visibility==="tag-gated", any user whose
  // profile has at least one of these tags can join. Case-insensitive
  // match; empty list with tag-gated effectively closes the community.
  requiredTags?: string[]
  // When true, only users with role "admin" or "instructor" can join.
  // Layered on top of `visibility`, so a "teachers-only open community"
  // is still discoverable by every staff member.
  teachersOnly?: boolean
  // Sub-spaces inside the batch's Common Room — General / Q&A /
  // Wins, etc. Each space has its own scoped feed. Optional so
  // existing batches keep working (we fall back to a synthetic
  // "General" space at render time).
  spaces?: BatchSpace[]
  // User id of whoever set this community up. Surfaced on the student
  // card ("created by Jane") so it feels less anonymous. Optional for
  // backwards compat with batches created before this field landed.
  createdBy?: string
  // ── Cohort window (Phase 3A) ─────────────────────────────────
  // When both startsAt + endsAt are set, the batch is a TIME-BOXED
  // cohort: closed common-room before startsAt, archive banner after
  // endsAt. Either field on its own is also valid — `startsAt`
  // without an end means "rolling cohort, opens on this date";
  // `endsAt` without a start means "wraps on this date".
  // ISO timestamps; both optional so existing batches stay
  // always-on by default.
  startsAt?: string
  endsAt?: string
  createdAt: string
  updatedAt: string
}

// A Space is a feed inside a Batch — think of it as a Slack channel
// scoped to the cohort. Defaults shipped with a fresh batch:
// General, Q&A, Wins. Admins can rename, reorder, or add more.
export interface BatchSpace {
  id: string
  name: string                  // "General", "Q&A", "Wins"
  emoji?: string                // visual anchor in the picker — defaults derived per name
  description?: string          // one-line hint shown above the feed
  layout?: "feed" | "forum"     // forum = thread-list view; default feed
  order: number
}

// ── Common Room (per-batch community feed) ──────────────────
// Each batch gets its own social space — a feed of posts that
// members can comment on + react to. Teacher moderates (pin, hide)
// but doesn't gate content. Posts are stored separately from the
// batch record so we can prune / paginate them independently as a
// batch grows.
export interface BatchPost {
  id: string
  batchId: string               // owning StudentGroup id
  spaceId?: string              // which space inside the batch this lives in
  authorId: string              // user id (student or teacher)
  // Body may now be rich-text HTML (Tiptap) or plain text — we render
  // through the same RichTextContent component that the blog uses,
  // so legacy plain bodies still display fine.
  body: string
  // Optional embed URL (YouTube / Vimeo / direct mp4) detected from
  // the composer toolbar. Renders as an inline player above the body.
  embedUrl?: string
  // Files uploaded straight from the composer — images / videos / PDFs / etc.
  // Each rendered inline in the post card with a type-aware preview
  // (image → <img>, video → <video controls>, other → download chip).
  attachments?: Array<{
    url: string
    name: string
    contentType?: string
    sizeBytes?: number
  }>
  // Pinned posts float to the top of the feed in display order.
  // Multiple pins are allowed — the teacher decides ordering by
  // pinning oldest first or newest last.
  pinned: boolean
  // Featured is the teacher's "spotlight this" flag — independent of
  // Pinned. Pinned posts stick to the top of the feed; Featured posts
  // get a highlighted card treatment + a "Featured" badge regardless
  // of where they sit in the order.
  featured?: boolean
  // Teacher moderation flag. Hidden posts stay in storage but are
  // filtered out of the member-facing feed. Keeps an audit trail
  // without the irreversibility of a hard delete.
  hidden: boolean
  // Emoji → reactor user ids. Same shape as blog reactions so a
  // visitor can toggle their own reaction off without bumping the
  // global count.
  reactions?: Record<string, string[]>
  comments: BatchPostComment[]
  createdAt: string
  updatedAt: string
}

export interface BatchPostComment {
  id: string
  authorId: string
  body: string
  hidden: boolean
  reactions?: Record<string, string[]>
  createdAt: string
}

// Default Spaces a fresh batch gets. Members hit the General feed
// out of the box; teachers can rename, reorder, or add more. Lives
// at the store boundary so any code (server-side later) can derive
// them without rebuilding the constant.
export const DEFAULT_BATCH_SPACES: BatchSpace[] = [
  { id: "space-general", name: "General",    emoji: "💬", description: "Anything goes — say hi, share progress.", layout: "feed",  order: 0 },
  { id: "space-qa",      name: "Q&A",        emoji: "❓", description: "Ask questions, help each other.",         layout: "forum", order: 1 },
  { id: "space-wins",    name: "Wins",       emoji: "🎉", description: "Celebrate breakthroughs + milestones.",   layout: "feed",  order: 2 },
]

// Read the spaces for a batch, falling back to the defaults when the
// batch hasn't customised them yet. Callers should use this rather
// than reading `batch.spaces` directly so a pre-existing batch
// (created before Spaces shipped) renders as if it had defaults.
export function getBatchSpaces(batch: StudentGroup): BatchSpace[] {
  if (batch.spaces && batch.spaces.length > 0) {
    return [...batch.spaces].sort((a, b) => a.order - b.order)
  }
  return DEFAULT_BATCH_SPACES
}

export type MessageChannel = "in-app" | "email" | "whatsapp"
export interface MessageAttachment {
  url: string
  filename: string
  size?: number
  mime?: string
}
export interface Message {
  id: string
  senderId: string              // teacher / admin user id
  recipientIds: string[]        // every student this message went to
  channels: MessageChannel[]
  subject: string
  body: string                  // Tiptap HTML
  attachments?: MessageAttachment[]
  // "marketing" | "reminder" | "live-class" | "custom" — drives some
  // copy + email template choice. Free-form; UI surfaces the common
  // ones but accepts anything.
  category?: string
  // When this was a bulk send, the optional saved label so the
  // teacher can find it again ("Cohort 5 reminder").
  label?: string
  createdAt: string
}

// Assignments cover three teacher-graded work types: homework "assignment",
// long-form "project", and offline "test" (vs. quizzes, which are timed and
// can self-grade). Most assignments are *follow-ups* to a specific lesson
// or live session — the teacher hands them out at the end of a class — so
// they carry an optional lessonId / sessionId pointer in addition to courseId.
//
// Teachers can attach a rich set of resources (links, files, videos, plain
// notes) when posting an assignment. Distribution is via in-app/email/WhatsApp
// notifications using the same dispatcher as live classes. Each assignment
// has a shareToken so a public /assignment/<token> URL can be sent through
// any channel.
export type AssignmentKind = "assignment" | "project" | "test"
export type AssignmentResourceType = "link" | "file" | "video" | "note"
export interface AssignmentResource {
  id: string
  type: AssignmentResourceType
  label: string
  url?: string  // present for link / file / video
  note?: string  // present for "note" type (free-form text instructions)
  sizeBytes?: number  // only for "file"
}
export interface Assignment {
  id: string
  title: string
  description: string
  courseId: string
  // Source-of-truth pointers. A lesson-linked assignment shows up inline on
  // the student's lesson page; a session-linked one shows up on the live-
  // class follow-up. Both are optional — purely course-level assignments
  // (e.g. capstone projects) still work.
  lessonId?: string
  sessionId?: string
  kind: AssignmentKind
  dueAt?: string  // ISO
  maxScore: number  // points; default 100
  resources?: AssignmentResource[]
  // Public share token — opaque URL slug used by /assignment/<token>.
  shareToken?: string
  createdAt: string
}

// Open-tracking entries. One row per (assignment, student) the first time the
// student opens the public assignment page. Lets the teacher see who's
// actually looked at the work, distinct from who has submitted.
export interface AssignmentView {
  id: string
  assignmentId: string
  studentId: string
  viewedAt: string
}
export interface AssignmentSubmission {
  id: string
  assignmentId: string
  studentId: string
  submittedAt: string
  contentUrl?: string  // student-provided link (Drive/Github/file URL)
  notes?: string
  score?: number
  feedback?: string
  gradedAt?: string
  gradedBy?: string
  status: "submitted" | "graded"
}

// Aggregated read-model for the performance dashboard. Per-course breakdowns
// live in `byCourse`; the top-level fields are the cross-course rollup.
export interface PerformanceSummary {
  attendance: { totalSessions: number; attended: number; rate: number }
  quizzes: { attempts: number; passed: number; passRate: number; avgScore: number; pending: number }
  assignments: { total: number; submitted: number; graded: number; avgScore: number }
  byCourse: Array<{
    courseId: string
    courseTitle: string
    attendance: { totalSessions: number; attended: number; rate: number }
    quizzes: { attempts: number; avgScore: number; passed: number }
    assignments: { total: number; submitted: number; graded: number; avgScore: number }
  }>
}

export interface AnalyticsData {
  totalRevenue: number
  totalStudents: number
  totalCourses: number
  totalEnrollments: number
  completionRate: number
  averageRating: number
  revenueByMonth: { month: string; revenue: number }[]
  enrollmentsByMonth: { month: string; count: number }[]
  topCourses: { courseId: string; title: string; enrollments: number; revenue: number }[]
  studentProgress: { completed: number; inProgress: number; notStarted: number }
}

// ==================== INITIAL DATA ====================

const initialUsers: User[] = [
  {
    id: "user-admin",
    name: "Admin User",
    email: "admin@thebigclass.com",
    role: "admin",
    bio: "Platform administrator",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-instructor-1",
    name: "Sarah Chen",
    email: "sarah@thebigclass.com",
    avatar: "/placeholder.svg?height=100&width=100",
    role: "instructor",
    bio: "Senior Full-Stack Developer with 10+ years of experience. Passionate about teaching web technologies.",
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "user-instructor-2",
    name: "Michael Roberts",
    email: "michael@thebigclass.com",
    avatar: "/placeholder.svg?height=100&width=100",
    role: "instructor",
    bio: "Data Science expert and ML engineer. Building AI solutions for 8 years.",
    createdAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "user-student-1",
    name: "Alex Thompson",
    email: "alex@example.com",
    avatar: "/placeholder.svg?height=100&width=100",
    role: "student",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "user-student-2",
    name: "Emma Wilson",
    email: "emma@example.com",
    avatar: "/placeholder.svg?height=100&width=100",
    role: "student",
    createdAt: "2026-03-15T00:00:00Z",
  },
  {
    id: "user-student-3",
    name: "James Lee",
    email: "james@example.com",
    role: "student",
    createdAt: "2026-04-01T00:00:00Z",
  },
]

const initialCourses: Course[] = [
  {
    id: "course-1",
    title: "Complete Full-Stack JavaScript Bootcamp",
    slug: "fullstack-javascript-bootcamp",
    description: "Master modern JavaScript from fundamentals to advanced full-stack development. Build real-world projects with React, Node.js, and MongoDB.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    instructor: initialUsers[1],
    price: 99.99,
    originalPrice: 199.99,
    currency: "USD",
    category: "Web Development",
    level: "intermediate",
    language: "English",
    modules: [
      {
        id: "mod-1-1",
        title: "JavaScript Fundamentals",
        description: "Core JavaScript concepts and ES6+ features",
        order: 1,
        lessons: [
          { id: "les-1-1-1", title: "Introduction to JavaScript", description: "Getting started with JS", type: "video", content: "https://example.com/video1.mp4", duration: 15, order: 1, isPreview: true },
          { id: "les-1-1-2", title: "Variables and Data Types", description: "Understanding JS data types", type: "video", content: "https://example.com/video2.mp4", duration: 20, order: 2, isPreview: false },
          { id: "les-1-1-3", title: "Functions and Scope", description: "Deep dive into functions", type: "video", content: "https://example.com/video3.mp4", duration: 25, order: 3, isPreview: false },
          { id: "les-1-1-4", title: "Module 1 Quiz", description: "Test your knowledge", type: "quiz", content: "quiz-1", duration: 10, order: 4, isPreview: false },
        ],
      },
      {
        id: "mod-1-2",
        title: "React Fundamentals",
        description: "Building modern UIs with React",
        order: 2,
        lessons: [
          { id: "les-1-2-1", title: "Introduction to React", description: "Why React and setup", type: "video", content: "https://example.com/video4.mp4", duration: 20, order: 1, isPreview: true },
          { id: "les-1-2-2", title: "Components and Props", description: "Building reusable components", type: "video", content: "https://example.com/video5.mp4", duration: 30, order: 2, isPreview: false },
          { id: "les-1-2-3", title: "State and Hooks", description: "Managing component state", type: "video", content: "https://example.com/video6.mp4", duration: 35, order: 3, isPreview: false },
          { id: "les-1-2-4", title: "React Best Practices", description: "Writing clean React code", type: "text", content: "# React Best Practices\n\nLearn the industry standards...", duration: 15, order: 4, isPreview: false },
        ],
      },
      {
        id: "mod-1-3",
        title: "Node.js and Express",
        description: "Server-side JavaScript",
        order: 3,
        lessons: [
          { id: "les-1-3-1", title: "Node.js Basics", description: "Server-side JS fundamentals", type: "video", content: "https://example.com/video7.mp4", duration: 25, order: 1, isPreview: false },
          { id: "les-1-3-2", title: "Building REST APIs", description: "Create robust APIs", type: "video", content: "https://example.com/video8.mp4", duration: 40, order: 2, isPreview: false },
          { id: "les-1-3-3", title: "Authentication & Security", description: "Secure your applications", type: "video", content: "https://example.com/video9.mp4", duration: 35, order: 3, isPreview: false },
        ],
      },
    ],
    totalDuration: 270,
    totalLessons: 11,
    enrolledCount: 1247,
    rating: 4.8,
    reviewCount: 342,
    status: "published",
    features: ["11 hours of video content", "Downloadable resources", "Certificate of completion", "Lifetime access", "30-day money-back guarantee"],
    requirements: ["Basic HTML/CSS knowledge", "A computer with internet access", "Willingness to learn"],
    whatYouLearn: ["Build full-stack web applications", "Master modern JavaScript ES6+", "Create REST APIs with Node.js", "Build UIs with React", "Deploy applications to production"],
    certificateTemplate: "modern",
    createdAt: "2026-02-15T00:00:00Z",
    updatedAt: "2026-05-10T00:00:00Z",
  },
  {
    id: "course-2",
    title: "Data Science with Python",
    slug: "data-science-python",
    description: "Learn data science from scratch. Master Python, Pandas, NumPy, and machine learning fundamentals with hands-on projects.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    instructor: initialUsers[2],
    price: 79.99,
    originalPrice: 149.99,
    currency: "USD",
    category: "Data Science",
    level: "beginner",
    language: "English",
    modules: [
      {
        id: "mod-2-1",
        title: "Python for Data Science",
        description: "Python fundamentals for data analysis",
        order: 1,
        lessons: [
          { id: "les-2-1-1", title: "Python Basics", description: "Getting started with Python", type: "video", content: "https://example.com/ds-video1.mp4", duration: 20, order: 1, isPreview: true },
          { id: "les-2-1-2", title: "Data Structures", description: "Lists, dicts, and more", type: "video", content: "https://example.com/ds-video2.mp4", duration: 25, order: 2, isPreview: false },
          { id: "les-2-1-3", title: "NumPy Essentials", description: "Numerical computing with NumPy", type: "video", content: "https://example.com/ds-video3.mp4", duration: 30, order: 3, isPreview: false },
        ],
      },
      {
        id: "mod-2-2",
        title: "Data Analysis with Pandas",
        description: "Master data manipulation",
        order: 2,
        lessons: [
          { id: "les-2-2-1", title: "Pandas DataFrames", description: "Working with tabular data", type: "video", content: "https://example.com/ds-video4.mp4", duration: 35, order: 1, isPreview: false },
          { id: "les-2-2-2", title: "Data Cleaning", description: "Handle missing and messy data", type: "video", content: "https://example.com/ds-video5.mp4", duration: 30, order: 2, isPreview: false },
          { id: "les-2-2-3", title: "Data Visualization", description: "Create compelling charts", type: "video", content: "https://example.com/ds-video6.mp4", duration: 25, order: 3, isPreview: false },
        ],
      },
    ],
    totalDuration: 165,
    totalLessons: 6,
    enrolledCount: 892,
    rating: 4.7,
    reviewCount: 198,
    status: "published",
    features: ["6+ hours of content", "Real-world datasets", "Jupyter notebooks", "Certificate of completion"],
    requirements: ["No prior programming experience needed", "Basic math skills"],
    whatYouLearn: ["Python programming", "Data analysis with Pandas", "Data visualization", "Statistical analysis"],
    certificateTemplate: "achievement",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-05-05T00:00:00Z",
  },
  {
    id: "course-3",
    title: "UI/UX Design Masterclass",
    slug: "ui-ux-design-masterclass",
    description: "Become a professional UI/UX designer. Learn design thinking, Figma, prototyping, and user research.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    instructor: initialUsers[1],
    price: 69.99,
    currency: "USD",
    category: "Design",
    level: "beginner",
    language: "English",
    modules: [
      {
        id: "mod-3-1",
        title: "Design Fundamentals",
        description: "Core design principles",
        order: 1,
        lessons: [
          { id: "les-3-1-1", title: "Design Thinking", description: "Problem-solving framework", type: "video", content: "https://example.com/design-video1.mp4", duration: 25, order: 1, isPreview: true },
          { id: "les-3-1-2", title: "Color Theory", description: "Using colors effectively", type: "video", content: "https://example.com/design-video2.mp4", duration: 20, order: 2, isPreview: false },
          { id: "les-3-1-3", title: "Typography", description: "Font selection and pairing", type: "video", content: "https://example.com/design-video3.mp4", duration: 20, order: 3, isPreview: false },
        ],
      },
    ],
    totalDuration: 65,
    totalLessons: 3,
    enrolledCount: 456,
    rating: 4.9,
    reviewCount: 87,
    status: "published",
    features: ["Design templates", "Figma files", "Certificate"],
    requirements: ["No design experience needed"],
    whatYouLearn: ["Design thinking process", "Figma mastery", "User research", "Prototyping"],
    certificateTemplate: "classic",
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
]

const initialEnrollments: Enrollment[] = [
  {
    id: "enroll-1",
    courseId: "course-1",
    studentId: "user-student-1",
    enrolledAt: "2026-04-01T00:00:00Z",
    progress: 75,
    lastAccessedAt: "2026-05-15T10:30:00Z",
    completedLessons: ["les-1-1-1", "les-1-1-2", "les-1-1-3", "les-1-1-4", "les-1-2-1", "les-1-2-2", "les-1-2-3", "les-1-2-4"],
    currentLessonId: "les-1-3-1",
  },
  {
    id: "enroll-2",
    courseId: "course-2",
    studentId: "user-student-1",
    enrolledAt: "2026-04-15T00:00:00Z",
    progress: 33,
    lastAccessedAt: "2026-05-14T15:00:00Z",
    completedLessons: ["les-2-1-1", "les-2-1-2"],
    currentLessonId: "les-2-1-3",
  },
  {
    id: "enroll-3",
    courseId: "course-1",
    studentId: "user-student-2",
    enrolledAt: "2026-03-20T00:00:00Z",
    completedAt: "2026-05-01T00:00:00Z",
    progress: 100,
    lastAccessedAt: "2026-05-01T00:00:00Z",
    completedLessons: ["les-1-1-1", "les-1-1-2", "les-1-1-3", "les-1-1-4", "les-1-2-1", "les-1-2-2", "les-1-2-3", "les-1-2-4", "les-1-3-1", "les-1-3-2", "les-1-3-3"],
    certificateId: "CERT-A1B2C3D4",
  },
  {
    id: "enroll-4",
    courseId: "course-3",
    studentId: "user-student-3",
    enrolledAt: "2026-05-01T00:00:00Z",
    progress: 0,
    lastAccessedAt: "2026-05-01T00:00:00Z",
    completedLessons: [],
  },
]

const initialQuizzes: Quiz[] = [
  {
    id: "quiz-1",
    title: "JavaScript Fundamentals Quiz",
    description: "Test your understanding of JavaScript basics",
    courseId: "course-1",
    moduleId: "mod-1-1",
    lessonId: "les-1-1-4",
    questions: [
      {
        id: "q1",
        question: "What keyword is used to declare a constant variable in JavaScript?",
        type: "multiple-choice",
        options: ["var", "let", "const", "define"],
        correctAnswer: 2,
        explanation: "The 'const' keyword is used to declare constants that cannot be reassigned.",
        points: 10,
      },
      {
        id: "q2",
        question: "JavaScript is a statically typed language.",
        type: "true-false",
        options: ["True", "False"],
        correctAnswer: 1,
        explanation: "JavaScript is dynamically typed, meaning variable types are determined at runtime.",
        points: 10,
      },
      {
        id: "q3",
        question: "What is the output of: typeof null?",
        type: "multiple-choice",
        options: ["null", "undefined", "object", "string"],
        correctAnswer: 2,
        explanation: "This is a known quirk in JavaScript - typeof null returns 'object'.",
        points: 10,
      },
      {
        id: "q4",
        question: "Which method adds an element to the end of an array?",
        type: "multiple-choice",
        options: ["unshift()", "push()", "pop()", "shift()"],
        correctAnswer: 1,
        explanation: "push() adds elements to the end, while unshift() adds to the beginning.",
        points: 10,
      },
      {
        id: "q5",
        question: "What does '===' operator check?",
        type: "multiple-choice",
        options: ["Value only", "Type only", "Both value and type", "Reference"],
        correctAnswer: 2,
        explanation: "=== is the strict equality operator that checks both value and type.",
        points: 10,
      },
    ],
    timeLimit: 10,
    passingScore: 60,
    maxAttempts: 3,
    shuffleQuestions: true,
    showAnswers: true,
    gradingMode: "auto",
    createdAt: "2026-02-20T00:00:00Z",
  },
]

const initialQuizAttempts: QuizAttempt[] = [
  {
    id: "attempt-1",
    quizId: "quiz-1",
    studentId: "user-student-1",
    answers: { q1: 2, q2: 1, q3: 2, q4: 1, q5: 2 },
    score: 100,
    passed: true,
    startedAt: "2026-04-10T10:00:00Z",
    completedAt: "2026-04-10T10:08:00Z",
    timeSpent: 480,
    status: "graded",
  },
  {
    id: "attempt-2",
    quizId: "quiz-1",
    studentId: "user-student-2",
    answers: { q1: 2, q2: 0, q3: 1, q4: 1, q5: 0 },
    score: 60,
    passed: true,
    startedAt: "2026-03-25T14:00:00Z",
    completedAt: "2026-03-25T14:12:00Z",
    timeSpent: 720,
    status: "graded",
  },
]

const initialAnnouncements: Announcement[] = [
  {
    id: "ann-1",
    title: "Welcome to The Big Class LMS!",
    content: "We are excited to have you on board. Explore our courses and start your learning journey today. If you have any questions, feel free to reach out to our support team.",
    authorId: "user-admin",
    priority: "high",
    status: "published",
    publishedAt: "2026-05-01T00:00:00Z",
    createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "ann-2",
    title: "New Course: Advanced React Patterns",
    content: "We just launched our new Advanced React Patterns course! Learn about render props, compound components, and more. Early bird discount available for the first 100 students.",
    courseId: "course-1",
    authorId: "user-instructor-1",
    priority: "normal",
    status: "published",
    publishedAt: "2026-05-10T00:00:00Z",
    createdAt: "2026-05-10T00:00:00Z",
  },
  {
    id: "ann-3",
    title: "Scheduled Maintenance",
    content: "The platform will undergo scheduled maintenance on May 20th from 2:00 AM to 4:00 AM UTC. During this time, the platform may be temporarily unavailable.",
    authorId: "user-admin",
    priority: "urgent",
    status: "published",
    publishedAt: "2026-05-15T00:00:00Z",
    createdAt: "2026-05-15T00:00:00Z",
  },
]

const initialDiscussions: Discussion[] = [
  {
    id: "disc-1",
    courseId: "course-1",
    lessonId: "les-1-1-2",
    authorId: "user-student-1",
    title: "Difference between let and const?",
    content: "Can someone explain when to use let vs const? I understand const cannot be reassigned, but when should I prefer one over the other?",
    replies: [
      {
        id: "reply-1",
        authorId: "user-instructor-1",
        content: "Great question! Use const by default for all variables. Only use let when you know the variable needs to be reassigned. This makes your code more predictable and easier to understand.",
        isAnswer: true,
        createdAt: "2026-04-02T09:30:00Z",
      },
      {
        id: "reply-2",
        authorId: "user-student-2",
        content: "Thanks for the explanation! This really helped clarify things for me too.",
        isAnswer: false,
        createdAt: "2026-04-02T10:15:00Z",
      },
    ],
    isPinned: true,
    isResolved: true,
    createdAt: "2026-04-02T09:00:00Z",
  },
]

// ==================== STORE ====================

interface LMSStore {
  // True once every slice has been hydrated from localStorage AND
  // the cross-browser server blob has been pulled in. Detail pages
  // (course/quiz/assignment edit) gate their "not found" message on
  // this so a hard refresh doesn't show an empty screen while the
  // data is still loading.
  hydrated: boolean
  // Users
  users: User[]
  students: User[]
  instructors: User[]
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  getUserById: (id: string) => User | undefined
  addUser: (user: User) => void
  updateUser: (id: string, updates: Partial<User>) => void
  deleteUser: (id: string) => void
  
  // Courses
  courses: Course[]
  addCourse: (course: Course) => void
  updateCourse: (id: string, updates: Partial<Course>) => void
  deleteCourse: (id: string) => void
  getCourseById: (id: string) => Course | undefined
  getCourseBySlug: (slug: string) => Course | undefined
  
  // Enrollments
  enrollments: Enrollment[]
  enrollStudent: (courseId: string, studentId: string) => void
  unenrollStudent: (enrollmentId: string) => void
  updateProgress: (enrollmentId: string, lessonId: string) => void
  getStudentEnrollments: (studentId: string) => Enrollment[]
  getCourseEnrollments: (courseId: string) => Enrollment[]
  isEnrolled: (courseId: string, studentId: string) => boolean
  
  // Quizzes
  quizzes: Quiz[]
  quizAttempts: QuizAttempt[]
  addQuiz: (quiz: Quiz) => void
  updateQuiz: (id: string, updates: Partial<Quiz>) => void
  deleteQuiz: (id: string) => void
  /** Re-pull quizzes from localStorage. Used by surfaces (e.g. the
   *  assignment editor) that may have stale data because another tab
   *  added a quiz after this tab's store hydrated. */
  refreshQuizzes: () => void
  getQuizById: (id: string) => Quiz | undefined
  submitQuizAttempt: (attempt: QuizAttempt) => void
  gradeQuizAttempt: (attemptId: string, grade: {
    questionGrades: Record<string, QuizQuestionGrade>
    teacherFeedback?: string
    gradedBy?: string
  }) => void
  getQuizAttempts: (quizId: string, studentId: string) => QuizAttempt[]
  getAttemptsForQuiz: (quizId: string) => QuizAttempt[]
  
  // Announcements
  announcements: Announcement[]
  addAnnouncement: (announcement: Announcement) => void
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => void
  
  // Discussions
  discussions: Discussion[]
  addDiscussion: (discussion: Discussion) => void
  addReply: (discussionId: string, reply: DiscussionReply) => void

  // Reviews — per-course, per-student. Adding one auto-recomputes the
  // owning course's rating + reviewCount so the marketing surfaces stay
  // in sync without a separate aggregation pass.
  reviews: Review[]
  addReview: (review: Review) => void
  // `includeSpam` exposes the full set (including flagged-as-spam) for
  // the teacher's management view. Public surfaces should leave it false.
  getReviewsForCourse: (courseId: string, includeSpam?: boolean) => Review[]
  getReviewByStudent: (courseId: string, studentId: string) => Review | undefined
  // Post / update a teacher reply on a review. Pass empty string to clear.
  replyToReview: (reviewId: string, reply: string) => void
  // Toggle the spam flag. Spam reviews are excluded from the public list
  // AND from the rating aggregate — flipping recomputes the course's
  // rating so the displayed score immediately reflects the change.
  markReviewSpam: (reviewId: string, spam: boolean) => void
  // Hard delete — for blatant abuse or duplicates the teacher wants gone
  // permanently. Also recomputes the course's rating.
  deleteReview: (reviewId: string) => void

  // ── Doubts (Q&A) ───────────────────────────────────────────
  doubts: Doubt[]
  addDoubt: (doubt: Doubt) => void
  replyToDoubt: (doubtId: string, reply: DoubtReply) => void
  setDoubtStatus: (doubtId: string, status: Doubt["status"]) => void
  deleteDoubt: (doubtId: string) => void
  updateDoubt: (doubtId: string, patch: Partial<Doubt>) => void
  getDoubtsForStudent: (studentId: string) => Doubt[]
  getDoubtsForCourse: (courseId: string) => Doubt[]

  // ── Outbound messages (composer history) ──────────────────
  messages: Message[]
  addMessage: (message: Message) => void
  deleteMessage: (id: string) => void
  getMessagesForRecipient: (studentId: string) => Message[]

  // ── Student groups ────────────────────────────────────────
  studentGroups: StudentGroup[]
  addStudentGroup: (group: StudentGroup) => void
  updateStudentGroup: (id: string, patch: Partial<StudentGroup>) => void
  deleteStudentGroup: (id: string) => void
  addStudentsToGroup: (groupId: string, studentIds: string[]) => void
  removeStudentsFromGroup: (groupId: string, studentIds: string[]) => void
  getGroupsForStudent: (studentId: string) => StudentGroup[]

  // Common Room feed — one batch's posts at a time. Internally we
  // keep all posts in a single tenant-scoped slice and filter on
  // read; the API surface presents them per-batch (optionally scoped
  // to a Space inside the batch).
  batchPosts: BatchPost[]
  getPostsForBatch: (batchId: string, spaceId?: string) => BatchPost[]
  addBatchPost: (post: BatchPost) => void
  updateBatchPost: (postId: string, patch: Partial<BatchPost>) => void
  deleteBatchPost: (postId: string) => void
  toggleBatchPostPin: (postId: string) => void
  toggleBatchPostFeatured: (postId: string) => void
  toggleBatchPostReaction: (postId: string, emoji: string, userId: string) => void
  addBatchPostComment: (postId: string, comment: BatchPostComment) => void
  setBatchPostCommentHidden: (postId: string, commentId: string, hidden: boolean) => void
  toggleBatchPostCommentReaction: (
    postId: string,
    commentId: string,
    emoji: string,
    userId: string,
  ) => void

  // Live sessions
  liveSessions: LiveSession[]
  addLiveSession: (session: LiveSession) => void
  updateLiveSession: (id: string, updates: Partial<LiveSession>) => void
  deleteLiveSession: (id: string) => void
  // In-house room controls. openRoom flips the state machine so
  // students in the waiting room get auto-beamed in; startRoom is
  // called when the teacher's connection is actually live; endRoom
  // closes the class and appends a stub recording entry.
  openLiveRoom: (id: string) => void
  startLiveRoom: (id: string) => void
  endLiveRoom: (id: string, recording?: Omit<LiveRecording, "id">) => void
  addLiveRecording: (id: string, recording: Omit<LiveRecording, "id">) => void
  getLiveSessionById: (id: string) => LiveSession | undefined
  getSessionsForCourse: (courseId: string) => LiveSession[]

  // Whiteboards (standalone instructor boards — tldraw canvas state in
  // IndexedDB, metadata here).
  whiteboards: Whiteboard[]
  addWhiteboard: (board: Whiteboard) => void
  updateWhiteboard: (id: string, updates: Partial<Whiteboard>) => void
  deleteWhiteboard: (id: string) => void
  getWhiteboardById: (id: string) => Whiteboard | undefined

  // Student "give me edit access" requests against existing boards.
  whiteboardAccessRequests: WhiteboardAccessRequest[]
  requestWhiteboardEditAccess: (boardId: string, studentId: string) => WhiteboardAccessRequest | undefined
  decideWhiteboardAccessRequest: (requestId: string, approved: boolean) => void

  // Attendance
  attendance: AttendanceRecord[]
  recordJoin: (sessionId: string, studentId: string) => AttendanceRecord
  recordLeave: (recordId: string) => void
  getAttendanceForSession: (sessionId: string) => AttendanceRecord[]
  getAttendanceForStudent: (studentId: string) => AttendanceRecord[]

  // Notifications
  notifications: Notification[]
  addNotifications: (entries: Notification[]) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (userId: string) => void
  getUserNotifications: (userId: string) => Notification[]

  // Outbound email log — every email we send goes here so the Inbox
  // can surface a "Sent" view alongside what came in. Cap at the
  // last ~500 entries to keep localStorage manageable.
  sentEmails: SentEmail[]
  logSentEmail: (entry: SentEmail) => void

  // Assignments
  assignments: Assignment[]
  addAssignment: (assignment: Assignment) => void
  updateAssignment: (id: string, updates: Partial<Assignment>) => void
  deleteAssignment: (id: string) => void
  getAssignmentById: (id: string) => Assignment | undefined
  getAssignmentByToken: (token: string) => Assignment | undefined
  getAssignmentsForCourse: (courseId: string) => Assignment[]
  getAssignmentsForLesson: (lessonId: string) => Assignment[]
  getAssignmentsForSession: (sessionId: string) => Assignment[]

  submissions: AssignmentSubmission[]
  submitAssignment: (submission: AssignmentSubmission) => void
  gradeSubmission: (id: string, grade: { score: number; feedback?: string; gradedBy?: string }) => void
  getSubmissionsForAssignment: (assignmentId: string) => AssignmentSubmission[]
  getSubmissionsForStudent: (studentId: string) => AssignmentSubmission[]

  // Tracking
  assignmentViews: AssignmentView[]
  recordAssignmentView: (assignmentId: string, studentId: string) => void
  getViewsForAssignment: (assignmentId: string) => AssignmentView[]

  // Performance
  getStudentPerformance: (studentId: string) => PerformanceSummary

  // Analytics
  getAnalytics: () => AnalyticsData
}

const LMSContext = createContext<LMSStore | null>(null)

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`
}

export function LMSProvider({ children }: { children: ReactNode }) {
  // Resolve which tenant's data this browser is reading. Computed once at
  // mount; if the user switches tenants, the page reloads (override is in
  // localStorage + query), and the provider re-mounts with the new slug.
  const tenantSlug = readCurrentTenantSlug()
  // On first boot post-multi-tenant upgrade, copy any legacy LMS data into
  // the platform-owner workspace so existing dev data isn't lost.
  if (typeof window !== "undefined") migrateLegacyKeys("platform")

  // Every per-tenant slice starts EMPTY. A freshly-signed-up workspace
  // shouldn't see any seed users/courses/etc. — those belong to the legacy
  // platform install only, and are restored via the localStorage migration
  // step (see migrateLegacyKeys). Tenants created via /signup get their
  // initial owner-user written directly to localStorage on signup.
  const [users, setUsers] = useState<User[]>([])
  const [usersHydrated, setUsersHydrated] = useState(false)
  // currentUser is *derived* from the users array via currentUserId so that
  // profile edits made through updateUser (e.g. from the Settings page) are
  // immediately visible everywhere that reads currentUser. Previously this
  // was its own useState, which let the profile drift out of sync.
  // currentUser is *derived* below from the users array (matching the
  // current tenant's ownerEmail) — see the useMemo. The explicit override
  // here is null at boot and only used when the consumer explicitly calls
  // setCurrentUser to impersonate someone other than the tenant owner.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Persist the signed-in user id per tenant + browser. Without this,
  // a page refresh dropped currentUserId back to null and the fallback
  // chain (tenant owner → first admin) stamped a stranger's identity
  // on the student — the "John. doe reappearing" report. Hydrated
  // once on mount; rewritten by setCurrentUser. Survives reloads;
  // cleared on explicit sign-out below.
  const CURRENT_USER_KEY = `thebigclass.t.${tenantSlug}.lms.currentUserId.v1`
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CURRENT_USER_KEY)
      if (saved) setCurrentUserId(saved)
    } catch {
      /* private browsing — keep null */
    }
  }, [CURRENT_USER_KEY])

  // Explicit "this browser is signed out" marker. Without it, the
  // tenant-owner fallback below would keep stamping the workspace
  // owner as the currentUser even after the visitor clicked Sign out
  // (which is how "John. doe" kept reappearing in the portal header).
  // The flag is per-tenant + per-browser so signing out of acme-inc
  // doesn't sign you out of every workspace cached in this browser.
  const SIGNED_OUT_KEY = `thebigclass.t.${tenantSlug}.signedOut.v1`
  const [signedOut, setSignedOutState] = useState(false)
  useEffect(() => {
    try {
      setSignedOutState(window.localStorage.getItem(SIGNED_OUT_KEY) === "1")
    } catch {
      /* private browsing — leave default */
    }
  }, [SIGNED_OUT_KEY])

  // Pull the server-side blob for this tenant on mount. The helper
  // memoises the in-flight promise per slug so every slice's hydrate
  // effect awaiting it dedupes to ONE network call. Once the server
  // returns data, each key is written into localStorage and a
  // re-hydration effect (below) re-reads every slice so the in-memory
  // state reflects the cross-browser canonical values.
  const [serverHydrated, setServerHydrated] = useState(false)
  useEffect(() => {
    let cancelled = false
    void ensureTenantBlobPulled(tenantSlug).then(() => {
      if (!cancelled) setServerHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  // Hydrate the users list from localStorage on mount, and persist on
  // every change after hydration. Wrapped in try/catch so private-browsing
  // / quota-exceeded errors don't crash the app.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(tk(tenantSlug, "users"))
      if (raw) {
        const parsed = JSON.parse(raw) as User[]
        if (Array.isArray(parsed) && parsed.length > 0) setUsers(parsed)
      }
    } catch { /* ignore */ }
    setUsersHydrated(true)
  }, [])
  useEffect(() => {
    if (!usersHydrated) return
    // Used to be a bare `catch { /* ignore */ }` which silently dropped
    // profile photo + cover saves once the users blob hit the 5 MB
    // localStorage quota. Now we emit on the storage-error bus so the
    // Settings page can surface a real toast and the user knows their
    // last edit didn't actually persist.
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.users, users, (err) =>
      reportStorageError("users", err),
    )
  }, [users, usersHydrated, tenantSlug])

  // Cross-frame sync — pick up users updates from the parent dashboard
  // when this provider is mounted in an iframe (the public portal
  // preview reads users to render instructor cards / faculty pages).
  useEffect(() => {
    if (!usersHydrated) return
    const key = tk(tenantSlug, "users")
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue) as User[]
        if (Array.isArray(parsed)) setUsers(parsed)
      } catch { /* ignore */ }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [usersHydrated, tenantSlug])

  // Stamp `lastLoginAt` on the user that just signed in. The login
  // page writes `thebigclass.pendingLogin` (the identifier they typed
  // + a timestamp). Once we hydrate, we find the matching user and
  // write the timestamp, then clear the breadcrumb. Falls back to
  // stamping currentUser if the identifier doesn't match any row —
  // that covers the demo flow where the user signs in via phone but
  // there's no exact email match.
  useEffect(() => {
    if (!usersHydrated) return
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem("thebigclass.pendingLogin")
    } catch { return }
    if (!raw) return
    let parsed: { identifier?: string; at?: string } | null = null
    try {
      parsed = JSON.parse(raw) as { identifier?: string; at?: string }
    } catch { /* ignore */ }
    const at = parsed?.at || new Date().toISOString()
    const id = (parsed?.identifier || "").trim().toLowerCase()
    setUsers((prev) => {
      const match =
        prev.find((u) => u.email?.toLowerCase() === id) ||
        prev.find((u) => u.phone === parsed?.identifier) ||
        prev.find((u) => u.role === "admin") ||
        null
      if (!match) return prev
      return prev.map((u) => (u.id === match.id ? { ...u, lastLoginAt: at } : u))
    })
    try { window.localStorage.removeItem("thebigclass.pendingLogin") } catch { /* ignore */ }
  }, [usersHydrated])

  const addUser = useCallback((user: User) => {
    setUsers((prev) => [user, ...prev])
  }, [])
  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)))
  }, [])
  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => {
      const target = prev.find((u) => u.id === id)
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "user",
          label: target.name || target.email || "User",
          sublabel: target.email,
          payload: target,
        })
      }
      return prev.filter((u) => u.id !== id)
    })
  }, [])
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesHydrated, setCoursesHydrated] = useState(false)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [enrollmentsHydrated, setEnrollmentsHydrated] = useState(false)

  // Hydrate courses (and enrollments) from localStorage so edits persist
  // across reloads, matching the pattern used for quizzes/users.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(tk(tenantSlug, "courses"))
      if (raw) {
        const parsed = JSON.parse(raw) as Course[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Self-heal duplicate-id rows on hydration. A previous bug
          // could land the same id twice in storage, which then makes
          // every <list>.map(c => <X key={c.id} />) downstream throw
          // the "two children with the same key" warning. Dedupe by
          // id keeping the FIRST occurrence (newer data is already
          // merged-in-place by updateCourse, so first === canonical).
          // The persist effect below writes the cleaned array back so
          // the heal is permanent after one load.
          const seen = new Set<string>()
          const deduped = parsed.filter((c) => {
            if (!c || !c.id || seen.has(c.id)) return false
            seen.add(c.id)
            return true
          })
          setCourses(deduped)
        }
      }
    } catch { /* ignore */ }
    setCoursesHydrated(true)
  }, [])
  useEffect(() => {
    if (!coursesHydrated) return
    const key = tk(tenantSlug, "courses")
    persistCoursesWithFallback(key, courses)
    // Mirror to server too — bypass the quota fallback (server doesn't
    // share the 5 MB localStorage budget) so cross-browser visitors
    // get the full course list, not the trimmed local cache.
    mirrorSliceToServer(tenantSlug, KEY_SUFFIXES.courses, courses)
  }, [courses, coursesHydrated, tenantSlug])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(tk(tenantSlug, "enrollments"))
      if (raw) {
        const parsed = JSON.parse(raw) as Enrollment[]
        if (Array.isArray(parsed)) setEnrollments(parsed)
      }
    } catch { /* ignore */ }
    setEnrollmentsHydrated(true)
  }, [])
  useEffect(() => {
    if (!enrollmentsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.enrollments, enrollments)
  }, [enrollments, enrollmentsHydrated, tenantSlug])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizzesHydrated, setQuizzesHydrated] = useState(false)
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([])
  const [attemptsHydrated, setAttemptsHydrated] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [liveSessionsHydrated, setLiveSessionsHydrated] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [attendanceHydrated, setAttendanceHydrated] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsHydrated, setNotificationsHydrated] = useState(false)
  // Outbound email log — capped at the last ~500 entries so localStorage
  // doesn't bloat across years of activity. Newest first.
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([])
  const [sentEmailsHydrated, setSentEmailsHydrated] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentsHydrated, setAssignmentsHydrated] = useState(false)
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([])
  const [submissionsHydrated, setSubmissionsHydrated] = useState(false)
  const [assignmentViews, setAssignmentViews] = useState<AssignmentView[]>([])
  const [assignmentViewsHydrated, setAssignmentViewsHydrated] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsHydrated, setReviewsHydrated] = useState(false)
  const [doubts, setDoubts] = useState<Doubt[]>([])
  const [doubtsHydrated, setDoubtsHydrated] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesHydrated, setMessagesHydrated] = useState(false)
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [studentGroupsHydrated, setStudentGroupsHydrated] = useState(false)
  const [batchPosts, setBatchPosts] = useState<BatchPost[]>([])
  const [batchPostsHydrated, setBatchPostsHydrated] = useState(false)
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([])
  const [whiteboardsHydrated, setWhiteboardsHydrated] = useState(false)
  const [whiteboardAccessRequests, setWhiteboardAccessRequests] = useState<
    WhiteboardAccessRequest[]
  >([])
  const [whiteboardAccessRequestsHydrated, setWhiteboardAccessRequestsHydrated] =
    useState(false)

  // Generic localStorage hydration / persistence for each new slice.
  useEffect(() => {
    try {
      const hydrate = <T,>(key: string, set: (v: T[]) => void) => {
        const raw = window.localStorage.getItem(key)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) set(parsed as T[])
      }
      hydrate<LiveSession>(tk(tenantSlug, "liveSessions"), setLiveSessions)
      hydrate<AttendanceRecord>(tk(tenantSlug, "attendance"), setAttendance)
      hydrate<Notification>(tk(tenantSlug, "notifications"), setNotifications)
      hydrate<SentEmail>(tk(tenantSlug, "sentEmails"), setSentEmails)
      hydrate<Assignment>(tk(tenantSlug, "assignments"), setAssignments)
      hydrate<AssignmentSubmission>(tk(tenantSlug, "submissions"), setSubmissions)
      hydrate<AssignmentView>(tk(tenantSlug, "assignmentViews"), setAssignmentViews)
      hydrate<Review>(tk(tenantSlug, "reviews"), setReviews)
      hydrate<Doubt>(tk(tenantSlug, "doubts"), setDoubts)
      hydrate<Message>(tk(tenantSlug, "messages"), setMessages)
      hydrate<StudentGroup>(tk(tenantSlug, "studentGroups"), setStudentGroups)
      hydrate<BatchPost>(tk(tenantSlug, "batchPosts"), setBatchPosts)
      hydrate<Whiteboard>(tk(tenantSlug, "whiteboards"), setWhiteboards)
      hydrate<WhiteboardAccessRequest>(
        tk(tenantSlug, "whiteboardAccessRequests"),
        setWhiteboardAccessRequests,
      )
    } catch { /* ignore */ }
    setLiveSessionsHydrated(true)
    setAttendanceHydrated(true)
    setNotificationsHydrated(true)
    setSentEmailsHydrated(true)
    setAssignmentsHydrated(true)
    setSubmissionsHydrated(true)
    setAssignmentViewsHydrated(true)
    setReviewsHydrated(true)
    setDoubtsHydrated(true)
    setMessagesHydrated(true)
    setStudentGroupsHydrated(true)
    setBatchPostsHydrated(true)
    setWhiteboardsHydrated(true)
    setWhiteboardAccessRequestsHydrated(true)
  }, [])
  useEffect(() => {
    if (!liveSessionsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.liveSessions, liveSessions)
  }, [liveSessions, liveSessionsHydrated, tenantSlug])
  useEffect(() => {
    if (!attendanceHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.attendance, attendance)
  }, [attendance, attendanceHydrated, tenantSlug])
  useEffect(() => {
    if (!notificationsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.notifications, notifications)
  }, [notifications, notificationsHydrated, tenantSlug])
  useEffect(() => {
    if (!sentEmailsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.sentEmails, sentEmails)
  }, [sentEmails, sentEmailsHydrated, tenantSlug])
  useEffect(() => {
    if (!assignmentsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.assignments, assignments)
  }, [assignments, assignmentsHydrated, tenantSlug])
  useEffect(() => {
    if (!submissionsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.submissions, submissions)
  }, [submissions, submissionsHydrated, tenantSlug])
  useEffect(() => {
    if (!assignmentViewsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.assignmentViews, assignmentViews)
  }, [assignmentViews, assignmentViewsHydrated, tenantSlug])
  useEffect(() => {
    if (!reviewsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.reviews, reviews)
  }, [reviews, reviewsHydrated, tenantSlug])
  useEffect(() => {
    if (!doubtsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.doubts, doubts)
  }, [doubts, doubtsHydrated, tenantSlug])
  useEffect(() => {
    if (!messagesHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.messages, messages)
  }, [messages, messagesHydrated, tenantSlug])
  useEffect(() => {
    if (!studentGroupsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.studentGroups, studentGroups)
  }, [studentGroups, studentGroupsHydrated, tenantSlug])
  useEffect(() => {
    if (!batchPostsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.batchPosts, batchPosts)
  }, [batchPosts, batchPostsHydrated, tenantSlug])
  useEffect(() => {
    if (!whiteboardsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.whiteboards, whiteboards)
  }, [whiteboards, whiteboardsHydrated, tenantSlug])
  useEffect(() => {
    if (!whiteboardAccessRequestsHydrated) return
    persistTenantSlice(
      tenantSlug,
      KEY_SUFFIXES.whiteboardAccessRequests,
      whiteboardAccessRequests,
    )
  }, [whiteboardAccessRequests, whiteboardAccessRequestsHydrated, tenantSlug])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(tk(tenantSlug, "quizzes"))
      if (raw) {
        const parsed = JSON.parse(raw) as Quiz[]
        if (Array.isArray(parsed) && parsed.length > 0) setQuizzes(parsed)
      }
    } catch { /* ignore */ }
    setQuizzesHydrated(true)
  }, [])
  useEffect(() => {
    if (!quizzesHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.quizzes, quizzes)
  }, [quizzes, quizzesHydrated, tenantSlug])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(tk(tenantSlug, "quizAttempts"))
      if (raw) {
        const parsed = JSON.parse(raw) as QuizAttempt[]
        if (Array.isArray(parsed)) setQuizAttempts(parsed)
      }
    } catch { /* ignore */ }
    setAttemptsHydrated(true)
  }, [])
  useEffect(() => {
    if (!attemptsHydrated) return
    persistTenantSlice(tenantSlug, KEY_SUFFIXES.quizAttempts, quizAttempts)
  }, [quizAttempts, attemptsHydrated, tenantSlug])

  // Server re-hydrate. Once the cross-browser blob arrives and is
  // unpacked into localStorage, re-read every slice so the in-memory
  // state catches up. Without this, an incognito visitor would see
  // the defaults (which the slice useStates were seeded with) even
  // though localStorage now has the canonical server data.
  useEffect(() => {
    if (!serverHydrated) return
    const readArray = <T,>(name: KeyName): T[] | null => {
      try {
        const raw = window.localStorage.getItem(tk(tenantSlug, name))
        if (!raw) return null
        const parsed = JSON.parse(raw) as unknown
        return Array.isArray(parsed) ? (parsed as T[]) : null
      } catch {
        return null
      }
    }
    const usersData = readArray<User>("users"); if (usersData) setUsers(usersData)
    const coursesData = readArray<Course>("courses"); if (coursesData) setCourses(coursesData)
    const enrollmentsData = readArray<Enrollment>("enrollments"); if (enrollmentsData) setEnrollments(enrollmentsData)
    const quizzesData = readArray<Quiz>("quizzes"); if (quizzesData) setQuizzes(quizzesData)
    const attemptsData = readArray<QuizAttempt>("quizAttempts"); if (attemptsData) setQuizAttempts(attemptsData)
    const liveSessionsData = readArray<LiveSession>("liveSessions"); if (liveSessionsData) setLiveSessions(liveSessionsData)
    const attendanceData = readArray<AttendanceRecord>("attendance"); if (attendanceData) setAttendance(attendanceData)
    const notificationsData = readArray<Notification>("notifications"); if (notificationsData) setNotifications(notificationsData)
    const sentEmailsData = readArray<SentEmail>("sentEmails"); if (sentEmailsData) setSentEmails(sentEmailsData)
    const assignmentsData = readArray<Assignment>("assignments"); if (assignmentsData) setAssignments(assignmentsData)
    const submissionsData = readArray<AssignmentSubmission>("submissions"); if (submissionsData) setSubmissions(submissionsData)
    const assignmentViewsData = readArray<AssignmentView>("assignmentViews"); if (assignmentViewsData) setAssignmentViews(assignmentViewsData)
    const reviewsData = readArray<Review>("reviews"); if (reviewsData) setReviews(reviewsData)
    const doubtsData = readArray<Doubt>("doubts"); if (doubtsData) setDoubts(doubtsData)
    const messagesData = readArray<Message>("messages"); if (messagesData) setMessages(messagesData)
    const studentGroupsData = readArray<StudentGroup>("studentGroups"); if (studentGroupsData) setStudentGroups(studentGroupsData)
    const batchPostsData = readArray<BatchPost>("batchPosts"); if (batchPostsData) setBatchPosts(batchPostsData)
    const whiteboardsData = readArray<Whiteboard>("whiteboards"); if (whiteboardsData) setWhiteboards(whiteboardsData)
    const whiteboardAccessData = readArray<WhiteboardAccessRequest>("whiteboardAccessRequests"); if (whiteboardAccessData) setWhiteboardAccessRequests(whiteboardAccessData)
  }, [serverHydrated, tenantSlug])

  // Derived state
  const students = users.filter(u => u.role === "student")
  const instructors = users.filter(u => u.role === "instructor")

  // currentUser resolution order:
  //   1. explicit override via setCurrentUser (e.g. super-admin impersonate)
  //   2. user whose email matches the current tenant's ownerEmail (the
  //      person who signed up — the natural admin)
  //   3. first admin / instructor in the workspace
  //   4. null (rare — empty workspace right at signup, fixed once the
  //      owner user is seeded into LMS storage)
  // currentUser is ONLY whoever explicitly signed in. The previous
  // fallback chain — "tenant owner by email" then "first admin/
  // instructor in the workspace array" — was a dev convenience that
  // misfired badly in multi-user setups:
  //   • Incognito visitors got auto-stamped as the workspace owner.
  //   • A non-owner visitor (e.g. a student in a fresh browser) got
  //     stamped as whichever staff member appeared first in
  //     `users[]`, which is how "John. deo" kept appearing in
  //     accounts that had nothing to do with him.
  // If there's no explicit currentUserId, we hand back null and let
  // the layout's auth gate route the visitor to /login. signup +
  // sign-in both call setCurrentUser(user), which writes the id to
  // localStorage, so the legitimate "I'm the workspace owner who
  // just signed up" path still works.
  const currentUser = signedOut
    ? null
    : currentUserId
      ? users.find((u) => u.id === currentUserId) ?? null
      : null

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserId(user?.id ?? null)
    // Persist the sign-in/sign-out intent across reloads so the
    // tenant-owner fallback can't undo a deliberate sign-out and a
    // deliberate sign-in clears any stale "signed out" marker from a
    // previous session. We also remember the signed-in user's id so
    // a refresh keeps the student/teacher signed in as themselves
    // rather than dropping back to the tenant-owner fallback.
    try {
      if (user) {
        window.localStorage.removeItem(SIGNED_OUT_KEY)
        window.localStorage.setItem(CURRENT_USER_KEY, user.id)
        setSignedOutState(false)
      } else {
        window.localStorage.setItem(SIGNED_OUT_KEY, "1")
        window.localStorage.removeItem(CURRENT_USER_KEY)
        setSignedOutState(true)
      }
    } catch {
      /* private browsing — in-memory state still flips below */
    }
  }, [SIGNED_OUT_KEY, CURRENT_USER_KEY])

  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users])
  
  const addCourse = useCallback((course: Course) => {
    // Dedupe by id — the new-course form pre-allocates the id and the
    // submit handler could fire twice on double-click or a Strict-Mode
    // double-render, which would otherwise plant the same row twice
    // and trigger React's "Encountered two children with the same key"
    // warning on the courses list.
    setCourses(prev => (prev.some(c => c.id === course.id) ? prev : [...prev, course]))
  }, [])
  
  const updateCourse = useCallback((id: string, updates: Partial<Course>) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
  }, [])
  
  const deleteCourse = useCallback((id: string) => {
    setCourses(prev => {
      const target = prev.find(c => c.id === id)
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "course",
          label: target.title || "Course",
          sublabel: `${target.modules?.length ?? 0} modules`,
          payload: target,
        })
      }
      return prev.filter(c => c.id !== id)
    })
  }, [])
  
  const getCourseById = useCallback((id: string) => courses.find(c => c.id === id), [courses])
  const getCourseBySlug = useCallback((slug: string) => courses.find(c => c.slug === slug), [courses])
  
  const enrollStudent = useCallback((courseId: string, studentId: string) => {
    const enrollment: Enrollment = {
      id: generateId("enroll"),
      courseId,
      studentId,
      enrolledAt: new Date().toISOString(),
      progress: 0,
      lastAccessedAt: new Date().toISOString(),
      completedLessons: [],
    }
    setEnrollments(prev => [...prev, enrollment])
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, enrolledCount: c.enrolledCount + 1 } : c))
  }, [])

  // Remove an enrollment by id and decrement the course's enrolledCount
  // so the catalog stats stay correct. No-op when the enrollment was
  // already deleted (idempotent).
  const unenrollStudent = useCallback((enrollmentId: string) => {
    setEnrollments(prev => {
      const target = prev.find(e => e.id === enrollmentId)
      if (!target) return prev
      setCourses(cs => cs.map(c =>
        c.id === target.courseId
          ? { ...c, enrolledCount: Math.max(0, c.enrolledCount - 1) }
          : c,
      ))
      return prev.filter(e => e.id !== enrollmentId)
    })
  }, [])
  
  const updateProgress = useCallback((enrollmentId: string, lessonId: string) => {
    setEnrollments(prev => prev.map(e => {
      if (e.id !== enrollmentId) return e
      const completedLessons = e.completedLessons.includes(lessonId) 
        ? e.completedLessons 
        : [...e.completedLessons, lessonId]
      const course = courses.find(c => c.id === e.courseId)
      const progress = course ? Math.round((completedLessons.length / course.totalLessons) * 100) : 0
      return {
        ...e,
        completedLessons,
        progress,
        lastAccessedAt: new Date().toISOString(),
        currentLessonId: lessonId,
        completedAt: progress === 100 ? new Date().toISOString() : e.completedAt,
      }
    }))
  }, [courses])
  
  const getStudentEnrollments = useCallback((studentId: string) => 
    enrollments.filter(e => e.studentId === studentId), [enrollments])
  
  const getCourseEnrollments = useCallback((courseId: string) => 
    enrollments.filter(e => e.courseId === courseId), [enrollments])
  
  const isEnrolled = useCallback((courseId: string, studentId: string) => 
    enrollments.some(e => e.courseId === courseId && e.studentId === studentId), [enrollments])
  
  const addQuiz = useCallback((quiz: Quiz) => {
    setQuizzes(prev => [...prev, quiz])
  }, [])

  // Re-read quizzes from localStorage. The store hydrates once on
  // mount and otherwise stays in memory, so a quiz created in
  // another tab (e.g. the "Create new quiz" link from the assignment
  // editor opens a new tab) isn't visible in this tab's array until
  // a manual refresh. This action lets a button pull the latest.
  const refreshQuizzes = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(tk(tenantSlug, "quizzes"))
      if (!raw) return
      const parsed = JSON.parse(raw) as Quiz[]
      if (Array.isArray(parsed)) setQuizzes(parsed)
    } catch { /* ignore */ }
  }, [tenantSlug])

  const updateQuiz = useCallback((id: string, updates: Partial<Quiz>) => {
    setQuizzes(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
  }, [])

  const deleteQuiz = useCallback((id: string) => {
    setQuizzes(prev => {
      const target = prev.find(q => q.id === id)
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "quiz",
          label: target.title || "Quiz",
          sublabel: `${target.questions?.length ?? 0} question${(target.questions?.length ?? 0) === 1 ? "" : "s"}`,
          payload: target,
        })
      }
      return prev.filter(q => q.id !== id)
    })
  }, [])

  const getQuizById = useCallback((id: string) => quizzes.find(q => q.id === id), [quizzes])

  const submitQuizAttempt = useCallback((attempt: QuizAttempt) => {
    setQuizAttempts(prev => [...prev, attempt])
    // Fire instructor notification on every submission — in-app +
    // email + WhatsApp via buildNotifications' default channel set.
    // Wrapped in setTimeout to defer until after this render commit
    // settles, so addNotifications doesn't dispatch a state update
    // inside another setState call (React 19 dev warning).
    try {
      const quiz = quizzes.find((q) => q.id === attempt.quizId)
      if (!quiz) return
      const course = courses.find((c) => c.id === quiz.courseId)
      const instructor = course?.instructor
      if (!instructor) return
      const student = users.find((u) => u.id === attempt.studentId)
      const studentName = student?.name ?? "A student"
      const needsReview = attempt.status === "pending-review"
      const payload = quizSubmittedNotification({
        studentName,
        quizTitle: quiz.title,
        quizId: quiz.id,
        score: attempt.score,
        passed: attempt.passed,
        needsReview,
      })
      const entries = buildNotifications([instructor], payload)
      // Defer to avoid setState-during-render in callers that
      // submit immediately on render (rare, but cheap to guard).
      setTimeout(() => {
        setNotifications((prev) => [...entries, ...prev])
      }, 0)
    } catch {
      // Swallow — a failed notification must never block the
      // student's attempt from being saved.
    }
  }, [quizzes, courses, users])

  const gradeQuizAttempt = useCallback((attemptId: string, grade: {
    questionGrades: Record<string, QuizQuestionGrade>
    teacherFeedback?: string
    gradedBy?: string
  }) => {
    setQuizAttempts(prev => prev.map(a => {
      if (a.id !== attemptId) return a
      const quiz = quizzes.find(q => q.id === a.quizId)
      if (!quiz) return a
      const totalPoints = quiz.questions.reduce((acc, q) => acc + q.points, 0)
      let earned = 0
      for (const q of quiz.questions) {
        if (grade.questionGrades[q.id]?.correct) earned += q.points
      }
      const score = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0
      return {
        ...a,
        questionGrades: grade.questionGrades,
        teacherFeedback: grade.teacherFeedback,
        gradedBy: grade.gradedBy,
        gradedAt: new Date().toISOString(),
        score,
        passed: score >= quiz.passingScore,
        status: "graded",
      }
    }))
  }, [quizzes])

  const getQuizAttempts = useCallback((quizId: string, studentId: string) =>
    quizAttempts.filter(a => a.quizId === quizId && a.studentId === studentId), [quizAttempts])

  const getAttemptsForQuiz = useCallback((quizId: string) =>
    quizAttempts.filter(a => a.quizId === quizId), [quizAttempts])
  
  const addAnnouncement = useCallback((announcement: Announcement) => {
    setAnnouncements(prev => [announcement, ...prev])
  }, [])
  
  const updateAnnouncement = useCallback((id: string, updates: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }, [])
  
  const addDiscussion = useCallback((discussion: Discussion) => {
    setDiscussions(prev => [discussion, ...prev])
  }, [])
  
  const addReply = useCallback((discussionId: string, reply: DiscussionReply) => {
    setDiscussions(prev => prev.map(d =>
      d.id === discussionId ? { ...d, replies: [...d.replies, reply] } : d
    ))
  }, [])

  // --- Reviews ---
  // Recompute one course's rating + reviewCount from a given reviews
  // list. Spam reviews don't count toward either number, so flipping the
  // spam flag (or hard-deleting) immediately bumps the displayed score.
  const recomputeCourseRating = useCallback((courseId: string, all: Review[]) => {
    const counted = all.filter((r) => r.courseId === courseId && !r.isSpam)
    const avg =
      counted.length > 0
        ? Math.round(
            (counted.reduce((a, r) => a + r.rating, 0) / counted.length) * 10,
          ) / 10
        : 0
    setCourses((cs) =>
      cs.map((c) =>
        c.id === courseId ? { ...c, rating: avg, reviewCount: counted.length } : c,
      ),
    )
  }, [])

  // Adding a review replaces any prior review by the same student on the
  // same course (one-per-student) and re-derives the course's rating +
  // reviewCount so the public catalogue / detail pages don't need to
  // aggregate on every render.
  //
  // Edits are rate-limited via reviewEditWindow (MAX_REVIEW_EDITS_PER_WINDOW
  // edits per REVIEW_EDIT_WINDOW_MS rolling window). Once a student burns
  // through the budget, this guard rejects further writes until the
  // oldest tracked edit ages out — at which point edits re-enable
  // automatically. The UI checks the same window so the form disables
  // before submit, but this is the last line of defence.
  const addReview = useCallback((review: Review) => {
    setReviews((prev) => {
      const existing = prev.find(
        (r) => r.courseId === review.courseId && r.studentId === review.studentId,
      )
      const now = new Date()
      const nowIso = now.toISOString()
      if (existing) {
        // Lifetime cap: once a student has used all edits, permanently locked.
        const { editsLeft } = reviewEditWindow(existing, now.getTime())
        if (editsLeft === 0) return prev
      }
      const without = prev.filter((r) => r !== existing)
      const merged: Review = existing
        ? {
            ...existing,
            rating: review.rating,
            comment: review.comment,
            editCount: (existing.editCount ?? 0) + 1,
            // Append this edit's timestamp and prune anything older
            // than the rolling window. Keeps the array bounded and
            // means a single old edit doesn't permanently consume a
            // slot from the user's daily allowance.
            editTimestamps: [
              ...(existing.editTimestamps ?? []).filter(
                (t) => now.getTime() - new Date(t).getTime() < REVIEW_EDIT_WINDOW_MS,
              ),
              nowIso,
            ],
            updatedAt: nowIso,
          }
        : review
      const next = [merged, ...without]
      recomputeCourseRating(review.courseId, next)
      return next
    })
  }, [recomputeCourseRating])

  const getReviewsForCourse = useCallback(
    (courseId: string, includeSpam = false) =>
      reviews
        .filter((r) => r.courseId === courseId && (includeSpam || !r.isSpam))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews],
  )

  const getReviewByStudent = useCallback(
    (courseId: string, studentId: string) =>
      reviews.find((r) => r.courseId === courseId && r.studentId === studentId),
    [reviews],
  )

  const replyToReview = useCallback((reviewId: string, reply: string) => {
    const trimmed = reply.trim()
    setReviews((prev) =>
      prev.map((r) =>
        r.id !== reviewId
          ? r
          : trimmed
            ? { ...r, teacherReply: trimmed, teacherReplyAt: new Date().toISOString() }
            : // Empty reply == clear it; drop both fields.
              { ...r, teacherReply: undefined, teacherReplyAt: undefined },
      ),
    )
  }, [])

  const markReviewSpam = useCallback((reviewId: string, spam: boolean) => {
    setReviews((prev) => {
      const next = prev.map((r) => (r.id === reviewId ? { ...r, isSpam: spam } : r))
      const target = next.find((r) => r.id === reviewId)
      if (target) recomputeCourseRating(target.courseId, next)
      return next
    })
  }, [recomputeCourseRating])

  const deleteReview = useCallback((reviewId: string) => {
    setReviews((prev) => {
      const target = prev.find((r) => r.id === reviewId)
      const next = prev.filter((r) => r.id !== reviewId)
      if (target) {
        recomputeCourseRating(target.courseId, next)
        pushToTrash({
          id: target.id,
          kind: "review",
          label: `Review (${target.rating}★)`,
          sublabel: (target.comment ?? "").slice(0, 80),
          payload: target,
        })
      }
      return next
    })
  }, [recomputeCourseRating])

  // --- Doubts (Q&A) ---
  const addDoubt = useCallback((doubt: Doubt) => {
    setDoubts((prev) => [doubt, ...prev])
  }, [])
  const replyToDoubt = useCallback((doubtId: string, reply: DoubtReply) => {
    setDoubts((prev) =>
      prev.map((d) =>
        d.id === doubtId
          ? { ...d, replies: [...d.replies, reply], updatedAt: new Date().toISOString() }
          : d,
      ),
    )
  }, [])
  const setDoubtStatus = useCallback((doubtId: string, status: Doubt["status"]) => {
    setDoubts((prev) =>
      prev.map((d) =>
        d.id === doubtId ? { ...d, status, updatedAt: new Date().toISOString() } : d,
      ),
    )
  }, [])
  const deleteDoubt = useCallback((doubtId: string) => {
    setDoubts((prev) => {
      const target = prev.find((d) => d.id === doubtId)
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "doubt",
          label: target.title || "Doubt",
          sublabel: `${target.replies?.length ?? 0} repl${(target.replies?.length ?? 0) === 1 ? "y" : "ies"}`,
          payload: target,
        })
      }
      return prev.filter((d) => d.id !== doubtId)
    })
  }, [])
  const getDoubtsForStudent = useCallback(
    (studentId: string) => doubts.filter((d) => d.studentId === studentId),
    [doubts],
  )
  const getDoubtsForCourse = useCallback(
    (courseId: string) => doubts.filter((d) => d.courseId === courseId),
    [doubts],
  )
  // Teacher can clean up a question's title/body for grammar or context
  // without changing its meaning. Records who edited and when.
  const updateDoubt = useCallback(
    (doubtId: string, patch: Partial<Pick<Doubt, "title" | "body">>) => {
      setDoubts((prev) =>
        prev.map((d) =>
          d.id === doubtId
            ? { ...d, ...patch, updatedAt: new Date().toISOString() }
            : d,
        ),
      )
    },
    [],
  )

  // --- Messages (composer history) ---
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [message, ...prev])
  }, [])
  const deleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])
  const getMessagesForRecipient = useCallback(
    (studentId: string) => messages.filter((m) => m.recipientIds.includes(studentId)),
    [messages],
  )

  // --- Student groups ---
  const addStudentGroup = useCallback((group: StudentGroup) => {
    setStudentGroups((prev) => [group, ...prev])
  }, [])
  const updateStudentGroup = useCallback((id: string, patch: Partial<StudentGroup>) => {
    setStudentGroups((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g,
      ),
    )
  }, [])
  const deleteStudentGroup = useCallback((id: string) => {
    setStudentGroups((prev) => {
      const target = prev.find((g) => g.id === id)
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "student-group",
          label: target.name || "Group",
          sublabel: `${target.memberIds?.length ?? 0} member${(target.memberIds?.length ?? 0) === 1 ? "" : "s"}`,
          payload: target,
        })
      }
      return prev.filter((g) => g.id !== id)
    })
  }, [])
  const addStudentsToGroup = useCallback((groupId: string, studentIds: string[]) => {
    setStudentGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        const set = new Set([...g.memberIds, ...studentIds])
        return { ...g, memberIds: [...set], updatedAt: new Date().toISOString() }
      }),
    )
  }, [])
  const removeStudentsFromGroup = useCallback((groupId: string, studentIds: string[]) => {
    setStudentGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        const drop = new Set(studentIds)
        return { ...g, memberIds: g.memberIds.filter((id) => !drop.has(id)), updatedAt: new Date().toISOString() }
      }),
    )
  }, [])
  const getGroupsForStudent = useCallback(
    (studentId: string) => studentGroups.filter((g) => g.memberIds.includes(studentId)),
    [studentGroups],
  )

  // --- Common Room (per-batch feed) ---
  const getPostsForBatch = useCallback(
    (batchId: string, spaceId?: string) =>
      batchPosts.filter(
        (p) =>
          p.batchId === batchId &&
          (spaceId == null || (p.spaceId ?? "space-general") === spaceId),
      ),
    [batchPosts],
  )
  const addBatchPost = useCallback((post: BatchPost) => {
    setBatchPosts((prev) => [post, ...prev])
  }, [])
  const updateBatchPost = useCallback((postId: string, patch: Partial<BatchPost>) => {
    setBatchPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p,
      ),
    )
  }, [])
  const deleteBatchPost = useCallback((postId: string) => {
    setBatchPosts((prev) => prev.filter((p) => p.id !== postId))
  }, [])
  const toggleBatchPostPin = useCallback((postId: string) => {
    setBatchPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, pinned: !p.pinned, updatedAt: new Date().toISOString() }
          : p,
      ),
    )
  }, [])
  // Featured is the spotlight flag — independent of Pinned. Toggling
  // it gives the post a highlighted card on the feed without changing
  // its sort order. Lets a teacher say "look at this" without
  // disrupting chronological flow.
  const toggleBatchPostFeatured = useCallback((postId: string) => {
    setBatchPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, featured: !p.featured, updatedAt: new Date().toISOString() }
          : p,
      ),
    )
  }, [])
  // Visitor toggle pattern matching blog reactions — same shape so a
  // future "everyone's reactions" surface can render both. userId is
  // the LMS user id; for an in-batch reaction the user must be
  // signed in (no anon reactions inside a community space).
  const toggleBatchPostReaction = useCallback(
    (postId: string, emoji: string, userId: string) => {
      setBatchPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          const reactions = { ...(p.reactions ?? {}) }
          const owners = reactions[emoji] ?? []
          const already = owners.includes(userId)
          const next = already
            ? owners.filter((id) => id !== userId)
            : [...owners, userId]
          if (next.length === 0) delete reactions[emoji]
          else reactions[emoji] = next
          return { ...p, reactions, updatedAt: new Date().toISOString() }
        }),
      )
    },
    [],
  )
  const addBatchPostComment = useCallback(
    (postId: string, comment: BatchPostComment) => {
      setBatchPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...p.comments, comment],
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      )
    },
    [],
  )
  const setBatchPostCommentHidden = useCallback(
    (postId: string, commentId: string, hidden: boolean) => {
      setBatchPosts((prev) =>
        prev.map((p) =>
          p.id !== postId
            ? p
            : {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === commentId ? { ...c, hidden } : c,
                ),
                updatedAt: new Date().toISOString(),
              },
        ),
      )
    },
    [],
  )
  const toggleBatchPostCommentReaction = useCallback(
    (postId: string, commentId: string, emoji: string, userId: string) => {
      setBatchPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          return {
            ...p,
            comments: p.comments.map((c) => {
              if (c.id !== commentId) return c
              const reactions = { ...(c.reactions ?? {}) }
              const owners = reactions[emoji] ?? []
              const already = owners.includes(userId)
              const next = already
                ? owners.filter((id) => id !== userId)
                : [...owners, userId]
              if (next.length === 0) delete reactions[emoji]
              else reactions[emoji] = next
              return { ...c, reactions }
            }),
            updatedAt: new Date().toISOString(),
          }
        }),
      )
    },
    [],
  )

  // --- Live sessions ---
  const addLiveSession = useCallback((session: LiveSession) => {
    setLiveSessions(prev => [...prev, session])
    // Seed the backend state record at creation time. Without this, a same-
    // tick call sequence like `addLiveSession(s); openLiveRoom(s.id)` would
    // race — openLiveRoom's lookup wouldn't yet see the new session, and the
    // backend would miss the metadata (scheduledAt, title) needed by cross-
    // browser students later.
    if (session.provider === "in-house") {
      void pushRoomState(session.roomCode ?? session.id, {
        state: (session.roomState as "scheduled" | "open" | "live" | "ended" | undefined) ?? "scheduled",
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
        title: session.title,
      })
    }
  }, [])
  const updateLiveSession = useCallback((id: string, updates: Partial<LiveSession>) => {
    const before = liveSessions.find((s) => s.id === id)
    setLiveSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    // Forward reschedule-relevant fields to the backend so cross-browser
    // students see the new time / title without needing a manual refresh.
    // Only fires when a field that actually changed is in the patch.
    if (before && before.provider === "in-house") {
      const patch: Parameters<typeof pushRoomState>[1] = {}
      if (updates.scheduledAt && updates.scheduledAt !== before.scheduledAt) {
        patch.scheduledAt = updates.scheduledAt
      }
      if (updates.durationMinutes && updates.durationMinutes !== before.durationMinutes) {
        patch.durationMinutes = updates.durationMinutes
      }
      if (updates.title && updates.title !== before.title) {
        patch.title = updates.title
      }
      if (Object.keys(patch).length > 0) {
        void pushRoomState(before.roomCode ?? before.id, patch)
      }
    }
  }, [liveSessions])
  // In-house room controls. Each flips a step of the state machine
  // and stamps the corresponding timestamp. Callers should branch on
  // session.provider === "in-house" before invoking — for external
  // providers (Zoom/Meet) we don't own the lifecycle so these are
  // no-ops by design (the update goes through, but nothing else
  // pays attention to it).
  const openLiveRoom = useCallback((id: string) => {
    // Look up the session BEFORE updating state so we can push metadata to the
    // backend (scheduledAt, title) alongside the state change. Cross-browser
    // students depend on this — without the push, they never learn the host
    // opened the room.
    const session = liveSessions.find((s) => s.id === id)
    setLiveSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, roomState: "open" as const, roomOpenedAt: new Date().toISOString() }
          : s,
      ),
    )
    if (session) {
      void pushRoomState(session.roomCode ?? session.id, {
        state: "open",
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
        title: session.title,
      })
    }
  }, [liveSessions])

  const startLiveRoom = useCallback((id: string) => {
    const session = liveSessions.find((s) => s.id === id)
    setLiveSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, roomState: "live" as const, roomStartedAt: new Date().toISOString() }
          : s,
      ),
    )
    if (session) {
      void pushRoomState(session.roomCode ?? session.id, {
        state: "live",
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
        title: session.title,
      })
    }
  }, [liveSessions])

  const addLiveRecording = useCallback(
    (id: string, recording: Omit<LiveRecording, "id">) => {
      setLiveSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                recordings: [
                  ...(s.recordings ?? []),
                  { ...recording, id: generateId("rec") },
                ],
              }
            : s,
        ),
      )
    },
    [],
  )

  // Ending the room flips state to "ended" and (optionally) appends a
  // recording. Callers typically pass a stub recording entry with
  // pending=true; the encoding pipeline replaces it later via
  // updateLiveSession with the real URL.
  const endLiveRoom = useCallback(
    (id: string, recording?: Omit<LiveRecording, "id">) => {
      const endedAt = new Date().toISOString()
      const session = liveSessions.find((s) => s.id === id)
      setLiveSessions((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s
          const recordings = recording
            ? [
                ...(s.recordings ?? []),
                { ...recording, id: generateId("rec") },
              ]
            : s.recordings
          return {
            ...s,
            roomState: "ended" as const,
            roomEndedAt: endedAt,
            wasHeld: true,
            recordings,
          }
        }),
      )
      if (session) {
        void pushRoomState(session.roomCode ?? session.id, {
          state: "ended",
          recordingUrl: recording?.url ?? null,
        })
      }
    },
    [liveSessions],
  )

  const deleteLiveSession = useCallback((id: string) => {
    setLiveSessions(prev => {
      const target = prev.find(s => s.id === id)
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "live-session",
          label: target.title || "Class",
          sublabel: target.scheduledAt ? new Date(target.scheduledAt).toLocaleString() : undefined,
          payload: target,
        })
      }
      return prev.filter(s => s.id !== id)
    })
  }, [])
  const getLiveSessionById = useCallback((id: string) => liveSessions.find(s => s.id === id), [liveSessions])
  const getSessionsForCourse = useCallback((courseId: string) =>
    liveSessions.filter(s => s.courseId === courseId), [liveSessions])

  // --- Whiteboards (metadata only; canvas state lives in IndexedDB via tldraw) ---
  const addWhiteboard = useCallback((board: Whiteboard) => {
    setWhiteboards(prev => [board, ...prev])
  }, [])
  const updateWhiteboard = useCallback((id: string, updates: Partial<Whiteboard>) => {
    setWhiteboards(prev => prev.map(b => b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b))
  }, [])
  const deleteWhiteboard = useCallback((id: string) => {
    setWhiteboards(prev => {
      const target = prev.find(b => b.id === id)
      if (target) {
        // Soft-delete via the shared trash store so the Undo toast +
        // /dashboard/trash list both work. The whiteboard's scene
        // (elements, appState, files) lives outside the metadata row —
        // we only need to snapshot the Whiteboard itself; the canvas
        // data stays put in localStorage/backend, keyed by
        // persistenceKey, so a restore picks up exactly where the
        // teacher left off.
        pushToTrash({
          id: target.id,
          kind: "whiteboard",
          label: target.title || "Whiteboard",
          sublabel: `Last edited ${new Date(target.updatedAt).toLocaleDateString()}`,
          payload: target,
        })
      }
      return prev.filter(b => b.id !== id)
    })
    // tldraw's IndexedDB state for this board is orphaned but harmless; users
    // rarely re-create with the exact same id, and "Forget local data" in the
    // browser handles the cleanup if needed.
  }, [])
  const getWhiteboardById = useCallback((id: string) => whiteboards.find(b => b.id === id), [whiteboards])

  // --- Whiteboard edit-access requests ---
  // Idempotent: if the student already has a pending request on this
  // board, return the existing row instead of stacking duplicates.
  // The board page reads the same row to flip the student's button
  // into "Requested" state.
  const requestWhiteboardEditAccess = useCallback(
    (boardId: string, studentId: string): WhiteboardAccessRequest | undefined => {
      const existing = whiteboardAccessRequests.find(
        (r) => r.boardId === boardId && r.studentId === studentId && r.status === "pending",
      )
      if (existing) return existing
      const record: WhiteboardAccessRequest = {
        id: generateId("wbreq"),
        boardId,
        studentId,
        requestedAt: new Date().toISOString(),
        status: "pending",
      }
      setWhiteboardAccessRequests((prev) => [record, ...prev])
      return record
    },
    [whiteboardAccessRequests],
  )

  // Owner decision. Approve also writes the student into the board's
  // invitedUserIds so the next /p/<tenant>/my/whiteboards/<id> render
  // drops readOnly for them. Deny just records the decision so the
  // student's "Requested" pill flips back without granting access.
  const decideWhiteboardAccessRequest = useCallback(
    (requestId: string, approved: boolean) => {
      const req = whiteboardAccessRequests.find((r) => r.id === requestId)
      if (!req || req.status !== "pending") return
      setWhiteboardAccessRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: approved ? "approved" : "denied", decidedAt: new Date().toISOString() }
            : r,
        ),
      )
      if (approved) {
        setWhiteboards((prev) =>
          prev.map((b) => {
            if (b.id !== req.boardId) return b
            const current = b.invitedUserIds ?? []
            if (current.includes(req.studentId)) return b
            return {
              ...b,
              invitedUserIds: [...current, req.studentId],
              updatedAt: new Date().toISOString(),
            }
          }),
        )
      }
    },
    [whiteboardAccessRequests],
  )

  // --- Attendance ---
  const recordJoin = useCallback((sessionId: string, studentId: string) => {
    // De-dupe within a single session: if there's an open record (no leftAt)
    // for this student/session, return it instead of creating a new one.
    const existing = attendance.find(r => r.sessionId === sessionId && r.studentId === studentId && !r.leftAt)
    if (existing) return existing
    const record: AttendanceRecord = {
      id: generateId("att"),
      sessionId,
      studentId,
      joinedAt: new Date().toISOString(),
    }
    setAttendance(prev => [...prev, record])
    return record
  }, [attendance])
  const recordLeave = useCallback((recordId: string) => {
    setAttendance(prev => prev.map(r => r.id === recordId ? { ...r, leftAt: new Date().toISOString() } : r))
  }, [])
  const getAttendanceForSession = useCallback((sessionId: string) =>
    attendance.filter(r => r.sessionId === sessionId), [attendance])
  const getAttendanceForStudent = useCallback((studentId: string) =>
    attendance.filter(r => r.studentId === studentId), [attendance])

  // --- Notifications ---
  const addNotifications = useCallback((entries: Notification[]) => {
    if (entries.length === 0) return
    setNotifications(prev => [...entries, ...prev])
  }, [])
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: "read", readAt: new Date().toISOString() } : n))
  }, [])
  const markAllNotificationsRead = useCallback((userId: string) => {
    setNotifications(prev => prev.map(n =>
      n.userId === userId && n.status !== "read"
        ? { ...n, status: "read", readAt: new Date().toISOString() }
        : n
    ))
  }, [])
  const getUserNotifications = useCallback((userId: string) =>
    notifications.filter(n => n.userId === userId && n.channel === "in-app"), [notifications])

  // --- Outbound email log ---
  // Append newest-first, trim to 500. Caller is responsible for
  // generating the id + sentAt; we don't enrich here so the wrapper
  // stays a pure log surface.
  const logSentEmail = useCallback((entry: SentEmail) => {
    setSentEmails(prev => {
      const next = [entry, ...prev]
      return next.length > 500 ? next.slice(0, 500) : next
    })
  }, [])

  // --- Assignments ---
  const addAssignment = useCallback((assignment: Assignment) => {
    setAssignments(prev => [...prev, assignment])
  }, [])
  const updateAssignment = useCallback((id: string, updates: Partial<Assignment>) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }, [])
  const deleteAssignment = useCallback((id: string) => {
    // Snapshot both arrays from inside their respective setters so we
    // get the latest values without holding stale closures. We push to
    // trash from setSubmissions because by then we have both pieces.
    let assignmentSnap: Assignment | undefined
    setAssignments(prev => {
      assignmentSnap = prev.find(a => a.id === id)
      return prev.filter(a => a.id !== id)
    })
    setSubmissions(prev => {
      const related = prev.filter(s => s.assignmentId === id)
      if (assignmentSnap) {
        pushToTrash({
          id: assignmentSnap.id,
          kind: "assignment",
          label: assignmentSnap.title || "Assignment",
          sublabel: `${related.length} submission${related.length === 1 ? "" : "s"}`,
          payload: { assignment: assignmentSnap, submissions: related },
        })
      }
      return prev.filter(s => s.assignmentId !== id)
    })
  }, [])
  const getAssignmentById = useCallback((id: string) => assignments.find(a => a.id === id), [assignments])
  const getAssignmentByToken = useCallback(
    (token: string) => assignments.find(a => a.shareToken === token),
    [assignments],
  )
  const getAssignmentsForCourse = useCallback((courseId: string) =>
    assignments.filter(a => a.courseId === courseId), [assignments])
  const getAssignmentsForLesson = useCallback((lessonId: string) =>
    assignments.filter(a => a.lessonId === lessonId), [assignments])
  const getAssignmentsForSession = useCallback((sessionId: string) =>
    assignments.filter(a => a.sessionId === sessionId), [assignments])

  // --- Assignment views (open-tracking) ---
  const recordAssignmentView = useCallback((assignmentId: string, studentId: string) => {
    setAssignmentViews(prev => {
      // De-dupe: keep the first view per (assignment, student). Re-opens
      // don't pollute the timeline — the teacher just needs to know the
      // student got eyes on the work.
      if (prev.some(v => v.assignmentId === assignmentId && v.studentId === studentId)) return prev
      return [
        ...prev,
        {
          id: generateId("aview"),
          assignmentId,
          studentId,
          viewedAt: new Date().toISOString(),
        },
      ]
    })
  }, [])
  const getViewsForAssignment = useCallback((assignmentId: string) =>
    assignmentViews.filter(v => v.assignmentId === assignmentId), [assignmentViews])

  const submitAssignment = useCallback((submission: AssignmentSubmission) => {
    setSubmissions(prev => {
      // Replace any prior submission from the same student for the same
      // assignment — the latest take is the canonical one.
      const filtered = prev.filter(s => !(s.assignmentId === submission.assignmentId && s.studentId === submission.studentId))
      return [submission, ...filtered]
    })
    // Fire instructor notification — in-app + email + WhatsApp via
    // buildNotifications' default channels. Wrapped in setTimeout to
    // defer state update outside the current commit (matches the
    // submitQuizAttempt path).
    try {
      const assignment = assignments.find((a) => a.id === submission.assignmentId)
      if (!assignment) return
      const course = courses.find((c) => c.id === assignment.courseId)
      const instructor = course?.instructor
      if (!instructor) return
      const student = users.find((u) => u.id === submission.studentId)
      const studentName = student?.name ?? "A student"
      const payload = assignmentSubmittedNotification({
        studentName,
        assignmentTitle: assignment.title,
        assignmentId: assignment.id,
        hasNotes: !!submission.notes?.trim(),
      })
      const entries = buildNotifications([instructor], payload)
      setTimeout(() => {
        setNotifications((prev) => [...entries, ...prev])
      }, 0)
    } catch {
      // Notifications are best-effort — never block the submission.
    }
  }, [assignments, courses, users])
  const gradeSubmission = useCallback((id: string, grade: { score: number; feedback?: string; gradedBy?: string }) => {
    setSubmissions(prev => {
      const target = prev.find((s) => s.id === id)
      const next = prev.map(s => s.id === id ? {
        ...s,
        score: grade.score,
        feedback: grade.feedback,
        gradedBy: grade.gradedBy,
        gradedAt: new Date().toISOString(),
        status: "graded" as const,
      } : s)
      // After grading is recorded in state, fan out an in-app notification
      // AND a transactional email to the student so they hear about the
      // grade immediately. Both are fire-and-forget — a missing student /
      // assignment record (data drift) or a network blip on the email
      // route should never block the grade itself.
      if (target) {
        const assignment = assignments.find((a) => a.id === target.assignmentId)
        const student = users.find((u) => u.id === target.studentId)
        const course = assignment ? courses.find((c) => c.id === assignment.courseId) : undefined
        if (assignment && student) {
          const passed =
            assignment.maxScore > 0 &&
            grade.score / assignment.maxScore >= 0.5
          const learnUrl = course
            ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/learn/${course.slug}`
            : process.env.NEXT_PUBLIC_APP_URL ?? ""
          // In-app notification — appears in the student's notifications
          // tray on next read. `addNotifications` is defined further down
          // in the file; we set it via a setter so the closure is fine.
          setNotifications((cur) => [
            ...cur,
            {
              id: generateId("notif"),
              userId: student.id,
              channel: "in-app",
              type: "assignment.graded",
              title: passed ? "Your submission was graded" : "Your submission needs work",
              body: `${assignment.title}: ${grade.score}/${assignment.maxScore}${grade.feedback ? ` — "${grade.feedback.slice(0, 140)}${grade.feedback.length > 140 ? "…" : ""}"` : ""}`,
              url: learnUrl,
              createdAt: new Date().toISOString(),
              status: "sent",
            },
          ])
          // Email — only fires when the student has an email on file. The
          // route falls back to a stub when ZEPTO_API_KEY isn't set in dev
          // so this call is safe everywhere.
          if (student.email) {
            const subject = passed
              ? `Graded: ${assignment.title} — ${grade.score}/${assignment.maxScore}`
              : `Feedback on ${assignment.title}`
            const html = `
              <p>Hi ${escapeHtml(student.name)},</p>
              <p>Your submission for <strong>${escapeHtml(assignment.title)}</strong>${course ? ` in <strong>${escapeHtml(course.title)}</strong>` : ""} has been graded.</p>
              <p style="font-size:20px;margin:16px 0;"><strong>Score: ${grade.score} / ${assignment.maxScore}</strong></p>
              ${grade.feedback ? `<p><strong>Feedback from your instructor:</strong></p><blockquote style="margin:0 0 12px;padding:8px 12px;border-left:3px solid #d4d4d8;background:#fafafa;">${escapeHtml(grade.feedback).replace(/\n/g, "<br/>")}</blockquote>` : ""}
              ${course ? `<p><a href="${learnUrl}" style="display:inline-block;padding:10px 16px;background:#0a3024;color:#fff;text-decoration:none;border-radius:6px;">Open course</a></p>` : ""}
            `
            void fetch("/api/email/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: [{ email: student.email, name: student.name }],
                subject,
                html,
              }),
            }).catch(() => { /* don't block grade on email failure */ })
          }
        }
      }
      return next
    })
  }, [assignments, users, courses])
  const getSubmissionsForAssignment = useCallback((assignmentId: string) =>
    submissions.filter(s => s.assignmentId === assignmentId), [submissions])
  const getSubmissionsForStudent = useCallback((studentId: string) =>
    submissions.filter(s => s.studentId === studentId), [submissions])

  // --- Performance rollup ---
  const getStudentPerformance = useCallback((studentId: string): PerformanceSummary => {
    const studentEnrollments = enrollments.filter(e => e.studentId === studentId)
    const enrolledCourseIds = new Set(studentEnrollments.map(e => e.courseId))

    const relevantSessions = liveSessions.filter(s => enrolledCourseIds.has(s.courseId) && s.status !== "cancelled")
    const studentAttendance = attendance.filter(r => r.studentId === studentId)
    const attendedSessionIds = new Set(studentAttendance.map(r => r.sessionId))
    const attendedCount = relevantSessions.filter(s => attendedSessionIds.has(s.id)).length

    const studentQuizAttempts = quizAttempts.filter(a => a.studentId === studentId)
    const gradedQuizzes = studentQuizAttempts.filter(a => (a.status ?? "graded") === "graded")
    const passedQuizzes = gradedQuizzes.filter(a => a.passed).length
    const pendingQuizzes = studentQuizAttempts.length - gradedQuizzes.length
    const avgQuizScore = gradedQuizzes.length > 0
      ? Math.round(gradedQuizzes.reduce((acc, a) => acc + a.score, 0) / gradedQuizzes.length)
      : 0

    const relevantAssignments = assignments.filter(a => enrolledCourseIds.has(a.courseId))
    const studentSubs = submissions.filter(s => s.studentId === studentId)
    const gradedSubs = studentSubs.filter(s => s.status === "graded" && typeof s.score === "number")
    const avgAssignmentScore = gradedSubs.length > 0
      ? Math.round(gradedSubs.reduce((acc, s) => {
          const a = assignments.find(x => x.id === s.assignmentId)
          const pct = a && a.maxScore > 0 ? ((s.score ?? 0) / a.maxScore) * 100 : 0
          return acc + pct
        }, 0) / gradedSubs.length)
      : 0

    const byCourse = studentEnrollments.map(e => {
      const course = courses.find(c => c.id === e.courseId)
      const cSessions = relevantSessions.filter(s => s.courseId === e.courseId)
      const cAttended = cSessions.filter(s => attendedSessionIds.has(s.id)).length
      const cQuizIds = new Set(quizzes.filter(q => q.courseId === e.courseId).map(q => q.id))
      const cQuizGraded = gradedQuizzes.filter(a => cQuizIds.has(a.quizId))
      const cAvgQuiz = cQuizGraded.length > 0
        ? Math.round(cQuizGraded.reduce((acc, a) => acc + a.score, 0) / cQuizGraded.length)
        : 0
      const cAssigns = relevantAssignments.filter(a => a.courseId === e.courseId)
      const cSubs = studentSubs.filter(s => cAssigns.some(a => a.id === s.assignmentId))
      const cGradedSubs = cSubs.filter(s => s.status === "graded" && typeof s.score === "number")
      const cAvgAssign = cGradedSubs.length > 0
        ? Math.round(cGradedSubs.reduce((acc, s) => {
            const a = assignments.find(x => x.id === s.assignmentId)
            const pct = a && a.maxScore > 0 ? ((s.score ?? 0) / a.maxScore) * 100 : 0
            return acc + pct
          }, 0) / cGradedSubs.length)
        : 0
      return {
        courseId: e.courseId,
        courseTitle: course?.title ?? "Untitled course",
        attendance: {
          totalSessions: cSessions.length,
          attended: cAttended,
          rate: cSessions.length > 0 ? Math.round((cAttended / cSessions.length) * 100) : 0,
        },
        quizzes: {
          attempts: cQuizGraded.length,
          avgScore: cAvgQuiz,
          passed: cQuizGraded.filter(a => a.passed).length,
        },
        assignments: {
          total: cAssigns.length,
          submitted: cSubs.length,
          graded: cGradedSubs.length,
          avgScore: cAvgAssign,
        },
      }
    })

    return {
      attendance: {
        totalSessions: relevantSessions.length,
        attended: attendedCount,
        rate: relevantSessions.length > 0 ? Math.round((attendedCount / relevantSessions.length) * 100) : 0,
      },
      quizzes: {
        attempts: studentQuizAttempts.length,
        passed: passedQuizzes,
        passRate: gradedQuizzes.length > 0 ? Math.round((passedQuizzes / gradedQuizzes.length) * 100) : 0,
        avgScore: avgQuizScore,
        pending: pendingQuizzes,
      },
      assignments: {
        total: relevantAssignments.length,
        submitted: studentSubs.length,
        graded: gradedSubs.length,
        avgScore: avgAssignmentScore,
      },
      byCourse,
    }
  }, [enrollments, liveSessions, attendance, quizAttempts, assignments, submissions, courses, quizzes])

  const getAnalytics = useCallback((): AnalyticsData => {
    const totalRevenue = courses.reduce((acc, c) => acc + (c.price * c.enrolledCount), 0)
    const totalStudents = users.filter(u => u.role === "student").length
    const completedEnrollments = enrollments.filter(e => e.progress === 100).length
    const completionRate = enrollments.length > 0 ? (completedEnrollments / enrollments.length) * 100 : 0
    const averageRating = courses.reduce((acc, c) => acc + c.rating, 0) / courses.length
    
    return {
      totalRevenue,
      totalStudents,
      totalCourses: courses.length,
      totalEnrollments: enrollments.length,
      completionRate,
      averageRating,
      revenueByMonth: [
        { month: "Jan", revenue: 12500 },
        { month: "Feb", revenue: 18200 },
        { month: "Mar", revenue: 22800 },
        { month: "Apr", revenue: 28400 },
        { month: "May", revenue: 34200 },
      ],
      enrollmentsByMonth: [
        { month: "Jan", count: 145 },
        { month: "Feb", count: 210 },
        { month: "Mar", count: 285 },
        { month: "Apr", count: 340 },
        { month: "May", count: 420 },
      ],
      topCourses: courses.map(c => ({
        courseId: c.id,
        title: c.title,
        enrollments: c.enrolledCount,
        revenue: c.price * c.enrolledCount,
      })).sort((a, b) => b.enrollments - a.enrollments).slice(0, 5),
      studentProgress: {
        completed: completedEnrollments,
        inProgress: enrollments.filter(e => e.progress > 0 && e.progress < 100).length,
        notStarted: enrollments.filter(e => e.progress === 0).length,
      },
    }
  }, [courses, enrollments, users])

  // Trash restore handlers — when the user clicks Restore on
  // /dashboard/trash, each LMS-owned kind re-imports the snapshot
  // into the relevant state slice. Returning true tells the trash
  // service to clear the entry.
  useEffect(() => {
    const off = registerRestoreHandler(
      ["user", "course", "quiz", "review", "doubt", "student-group", "live-session", "assignment", "whiteboard"],
      (entry) => {
        switch (entry.kind) {
          case "user":          setUsers(prev => prev.some(u => u.id === (entry.payload as User).id) ? prev : [...prev, entry.payload as User]); return true
          case "course":        setCourses(prev => prev.some(c => c.id === (entry.payload as Course).id) ? prev : [...prev, entry.payload as Course]); return true
          case "quiz":          setQuizzes(prev => prev.some(q => q.id === (entry.payload as Quiz).id) ? prev : [...prev, entry.payload as Quiz]); return true
          case "review":        setReviews(prev => prev.some(r => r.id === (entry.payload as Review).id) ? prev : [...prev, entry.payload as Review]); return true
          case "doubt":         setDoubts(prev => prev.some(d => d.id === (entry.payload as Doubt).id) ? prev : [entry.payload as Doubt, ...prev]); return true
          case "student-group": setStudentGroups(prev => prev.some(g => g.id === (entry.payload as StudentGroup).id) ? prev : [entry.payload as StudentGroup, ...prev]); return true
          case "live-session":  setLiveSessions(prev => prev.some(s => s.id === (entry.payload as LiveSession).id) ? prev : [...prev, entry.payload as LiveSession]); return true
          case "whiteboard":    setWhiteboards(prev => prev.some(b => b.id === (entry.payload as Whiteboard).id) ? prev : [entry.payload as Whiteboard, ...prev]); return true
          case "assignment": {
            const p = entry.payload as { assignment: Assignment; submissions: AssignmentSubmission[] }
            setAssignments(prev => prev.some(a => a.id === p.assignment.id) ? prev : [...prev, p.assignment])
            setSubmissions(prev => {
              const have = new Set(prev.map(s => s.id))
              return [...prev, ...p.submissions.filter(s => !have.has(s.id))]
            })
            return true
          }
        }
        return false
      },
    )
    return off
  }, [])

  // Aggregate hydration flag — true once every slice has read its
  // localStorage seed AND the cross-browser server pull has settled.
  // Detail/edit pages gate their "not found" rendering on this so a
  // hard refresh shows a loader instead of "entity missing".
  const hydrated =
    serverHydrated &&
    usersHydrated &&
    coursesHydrated &&
    enrollmentsHydrated &&
    quizzesHydrated &&
    attemptsHydrated &&
    liveSessionsHydrated &&
    assignmentsHydrated &&
    submissionsHydrated &&
    doubtsHydrated

  return (
    <LMSContext.Provider value={{
      hydrated,
      users,
      students,
      instructors,
      currentUser,
      setCurrentUser,
      getUserById,
      addUser,
      updateUser,
      deleteUser,
      courses,
      addCourse,
      updateCourse,
      deleteCourse,
      getCourseById,
      getCourseBySlug,
      enrollments,
      enrollStudent,
      unenrollStudent,
      updateProgress,
      getStudentEnrollments,
      getCourseEnrollments,
      isEnrolled,
      quizzes,
      quizAttempts,
      addQuiz,
      updateQuiz,
      deleteQuiz,
      refreshQuizzes,
      getQuizById,
      submitQuizAttempt,
      gradeQuizAttempt,
      getQuizAttempts,
      getAttemptsForQuiz,
      announcements,
      addAnnouncement,
      updateAnnouncement,
      discussions,
      addDiscussion,
      addReply,
      reviews,
      addReview,
      getReviewsForCourse,
      getReviewByStudent,
      replyToReview,
      markReviewSpam,
      deleteReview,
      doubts,
      addDoubt,
      replyToDoubt,
      setDoubtStatus,
      deleteDoubt,
      updateDoubt,
      getDoubtsForStudent,
      getDoubtsForCourse,
      messages,
      addMessage,
      deleteMessage,
      getMessagesForRecipient,
      studentGroups,
      addStudentGroup,
      updateStudentGroup,
      deleteStudentGroup,
      addStudentsToGroup,
      removeStudentsFromGroup,
      getGroupsForStudent,
      batchPosts,
      getPostsForBatch,
      addBatchPost,
      updateBatchPost,
      deleteBatchPost,
      toggleBatchPostPin,
      toggleBatchPostFeatured,
      toggleBatchPostReaction,
      addBatchPostComment,
      setBatchPostCommentHidden,
      toggleBatchPostCommentReaction,
      liveSessions,
      addLiveSession,
      updateLiveSession,
      deleteLiveSession,
      openLiveRoom,
      startLiveRoom,
      endLiveRoom,
      addLiveRecording,
      getLiveSessionById,
      getSessionsForCourse,
      whiteboards,
      addWhiteboard,
      updateWhiteboard,
      deleteWhiteboard,
      getWhiteboardById,
      whiteboardAccessRequests,
      requestWhiteboardEditAccess,
      decideWhiteboardAccessRequest,
      attendance,
      recordJoin,
      recordLeave,
      getAttendanceForSession,
      getAttendanceForStudent,
      notifications,
      addNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      getUserNotifications,
      sentEmails,
      logSentEmail,
      assignments,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      getAssignmentById,
      getAssignmentByToken,
      getAssignmentsForCourse,
      getAssignmentsForLesson,
      getAssignmentsForSession,
      submissions,
      submitAssignment,
      gradeSubmission,
      getSubmissionsForAssignment,
      getSubmissionsForStudent,
      assignmentViews,
      recordAssignmentView,
      getViewsForAssignment,
      getStudentPerformance,
      getAnalytics,
    }}>
      {children}
    </LMSContext.Provider>
  )
}

export function useLMS() {
  const context = useContext(LMSContext)
  if (!context) {
    throw new Error("useLMS must be used within an LMSProvider")
  }
  return context
}
