"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react"

// Persist the users list to localStorage so students added through the
// portal survive page refreshes. The rest of the LMS store (courses,
// enrollments, quizzes…) is still in-memory; only users are user-editable
// from the dashboard right now, so that's the only slice we persist.
// Storage keys are tenant-scoped — every read/write goes through tk(slug, name).
// In production this becomes a `WHERE tenant_id = ?` filter on the backend; for
// now it keeps each workspace's localStorage data fully isolated so switching
// tenants in dev (?tenant=acme) gives you a clean slate.
import { readCurrentTenantSlug } from "./tenant-store"
import {
  deleteTenantUserIndex,
  upsertTenantUserIndex,
} from "./tenant-user-index-client"
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
  // Two-field bio model:
  //   • `bio` — short Bio (≤55 chars, plain text). Shown
  //     on instructor cards, hero taglines, anywhere we need a
  //     single-line elevator pitch.
  //   • `about` — long-form "tell more about yourself" content.
  //     Stored as Tiptap HTML so it can carry headings, links,
  //     lists, embeds. Surfaced in the "About <name>" card on the
  //     public teacher detail page.
  // Old data only had `bio` and used it for both — the teacher
  // profile page used to truncate `bio` for the tagline and show
  // the rest in About. That model conflated two intents (short
  // pitch vs. long story). Keeping both fields means the card
  // stays tight while the profile gets room to breathe.
  bio?: string
  about?: string
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
// Sprint C Recordings #34 — new lesson type "recording" lets the
// course curriculum reference an existing recording from the
// recordings library by sessionId (LiveSession.id) in `content`,
// instead of duplicating the video URL into the lesson. Why a new
// type instead of just a video URL: visibility tier (#25), watch-
// progress, transcript + chapters all flow from the recording
// metadata — copying the URL would lose those signals.
export type LessonType =
  | "video"
  | "text"
  | "pdf"
  | "document"
  | "embed"
  | "audio"
  | "quiz"
  | "live"
  | "recording"

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
  // Set the first time the publish-reminder runner sees this course
  // within its 24h pre-flight window. Prevents the runner from
  // firing again after the user dismisses or after the next mount.
  // Cleared by the form when publishAt is rescheduled or removed,
  // so a re-scheduled publish gets its own reminder cycle.
  publishReminderSentAt?: string
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
  // Marketing — teacher-set override for the instructor's public
  // profile rail. When true, this course beats the auto-pick
  // (highest enrolment) and becomes the "Most popular" card on
  // /p/<tenant>/instructors/<handle>. Falls back to the auto-pick
  // when unset. A teacher should only flag one — multiple flags
  // are tolerated (first one wins by createdAt asc).
  featureOnInstructorProfile?: boolean
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
  // ── Draft / Publish workflow ────────────────────────────────
  // The course row itself is what students see — every public surface
  // (catalogue, /courses/<slug>, /learn/<slug>) reads from the
  // top-level fields. Editor changes are stashed under `draft` and
  // only flow to the top-level fields when the teacher hits Publish.
  // This means a teacher can iterate on title / pricing / modules
  // without students seeing half-finished edits.
  //
  // `draft` carries any subset of editable fields (title, subtitle,
  // description, thumbnail, modules, etc.). On publish we merge it
  // into the canonical fields and append the snapshot to `versions`.
  // null / absent draft = no pending changes.
  draft?: CourseDraft | null
  draftUpdatedAt?: string
  // Snapshot history. Each version is a frozen copy of the
  // canonical fields at the moment Publish was clicked. Latest
  // first. Used by the version-preview UI; deleting the course
  // cascades all versions with it (they're embedded on the row).
  versions?: CourseVersion[]
  // ISO timestamp of the most recent publish. Distinct from
  // updatedAt (which moves on every save, draft or not) — used by
  // the dashboard "last published" copy and the public site's
  // sitemap lastmod.
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

// Editable subset of a Course that the editor stashes under
// `draft`. We intentionally don't include lifecycle / aggregate
// fields (status, enrolledCount, rating, reviewCount, publishAt)
// — those are operational, not content edits. The keys match the
// canonical Course type so applying the draft is a shallow merge.
export interface CourseDraft {
  title?: string
  subtitle?: string
  slug?: string
  description?: string
  thumbnail?: string
  introVideoUrl?: string
  category?: string
  tags?: string[]
  level?: Course["level"]
  language?: string
  price?: number
  originalPrice?: number
  currency?: string
  earlyBirdPrice?: number
  earlyBirdUntil?: string
  coupons?: Coupon[]
  coInstructorIds?: string[]
  modules?: Module[]
  totalDuration?: number
  totalLessons?: number
  visibility?: CourseVisibility
  accessPassword?: string
  certificateEligible?: boolean
  certificateTemplate?: string
  features?: string[]
  requirements?: string[]
  whatYouLearn?: string[]
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string[]
  ogImage?: string
  accessModel?: Course["accessModel"]
  checkoutBumpProductId?: string
  coachingProductId?: string
  defaultBatchId?: string
}

// A frozen snapshot of a course at the moment Publish was clicked.
// Just the content fields — operational state (enrolledCount,
// rating) is intentionally excluded so a Restore doesn't reset
// counts. Tagged with a monotonically increasing version number +
// the user who published.
export interface CourseVersion {
  id: string
  version: number
  publishedAt: string
  publishedById?: string
  publishedByName?: string
  note?: string
  snapshot: CourseDraft & {
    // Versions are immutable so we capture content-equivalent fields
    // here too. Stored as a partial — only fields with values on the
    // course at publish time are written.
    instructorId?: string
  }
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
  // Author of the quiz — used by the list card to render an owner
  // avatar pill. Optional because legacy quizzes in storage may
  // predate this field; the UI falls back to "Unknown" in that case.
  createdBy?: string
}

export interface QuizQuestionGrade {
  // Instructor's per-question verdict. Falls back to auto-comparison when absent.
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
  // Instructor / instructor reply, posted from the reviews-management page.
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
  // Pre-class agenda — what the teacher plans to cover. Shown in
  // the waiting room (so students arrive knowing what's coming)
  // and in a side panel during the class. Each item is optional
  // minutes so a teacher can hint pacing without locking it in.
  // Empty array = no agenda set; the surfaces collapse cleanly.
  // Per-item progress markers added during the live class:
  //   • `done`        — host clicked the ✓ on this item
  //   • `skipped`     — host clicked ⏭ (didn't cover, moving on)
  //   • `markedAt`    — ISO timestamp of the last mark; used by the
  //                     late-joiner recap to show "covered at 11:42".
  // All three are optional so old agendas (without markers) keep
  // rendering through their inferred-from-elapsed-time logic.
  agenda?: Array<{ title: string; minutes?: number; done?: boolean; skipped?: boolean; markedAt?: string }>
  /**
   * Pre-staged polls (CL6) — composed at scheduling time, fired
   * one-click during class from the host's Poll panel. Each entry
   * keeps a question + 2-4 options; the host clicks Launch when
   * timing is right (no mid-lecture composition). Once fired, the
   * entry's `launchedPollId` is set so the host sees "Launched"
   * and the entry isn't re-launchable in the same session.
   */
  prestagedPolls?: Array<{
    id: string
    question: string
    options: string[]
    launchedPollId?: string
  }>
  // Per-class chat enablement. Default behaviour is "on" — most
  // classes benefit from chat. Instructors running focused
  // recording-only or lecture-style sessions can flip this off
  // before opening the room. `undefined` is treated as enabled so
  // existing classes (created before this field existed) keep
  // working as they always have.
  chatEnabled?: boolean
  // The video recording — usually the platform's auto-export (Zoom cloud,
  // Meet recording, Loom, YouTube unlisted). Inline-embedded when shown.
  recordingUrl?: string
  // Sprint B Recordings #25 — per-recording visibility tier.
  // Independent of course-level visibility because teachers
  // sometimes want a public class but a "members-only" recording
  // (e.g. live audience freely accessible; replay reserved for paid
  // tier). Defaults to "enrolled" when omitted (= existing
  // behaviour: enrolled students can rewatch).
  //   • public     anyone with the link
  //   • enrolled   only enrolled students of the course (default)
  //   • community  only members of the attached community
  //   • link-only  unlisted — anyone with the link (URL-secret model)
  recordingVisibility?: "public" | "enrolled" | "community" | "link-only"
  // Slides, PDFs, links, embeds, notes — anything the teacher wants to
  // make available to students who attended (or to no-shows as catch-up).
  materials?: SessionMaterial[]
  // Class chat transcript — captured during the live class and
  // persisted alongside the recording on End. Pulled from LiveKit's
  // chat data channel via the ChatTranscriptRecorder. Renders in
  // the recording details sheet under "Class chat" so a viewer
  // re-watching the class also gets the side-channel context.
  // Empty/undefined for classes without chat or for older sessions.
  chatTranscript?: Array<{
    id: string
    /** Participant identity from LiveKit; matches the `from` field
     *  on the chat data channel. */
    fromId?: string
    /** Display name (resolved at capture time so we don't have to
     *  re-resolve on render). */
    fromName?: string
    /** Plain text. Same content the student typed; we don't strip
     *  formatting because LiveKit's default chat is plain-text. */
    text: string
    /** ISO timestamp. Sorted ascending on persist. */
    sentAt: string
  }>
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
  /** Lesson IDs this board is attached to as a resource. A board
   *  can appear in multiple lessons across multiple courses — e.g.
   *  a Fishbone for a recurring "root-cause" mini-unit. The lesson
   *  page reads this in reverse via `getWhiteboardsForLesson`. */
  attachedToLessons?: string[]
  /** Community (batch) IDs this board has been posted to. Tracked
   *  on the board side so the card can display a "posted to N
   *  communities" indicator without scanning the entire posts list. */
  postedToBatches?: string[]
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
// optionally a lesson). Instructors reply via replies[]; the thread is
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
// members can comment on + react to. Instructor moderates (pin, hide)
// but doesn't gate content. Posts are stored separately from the
// batch record so we can prune / paginate them independently as a
// batch grows.
// Post-type taxonomy.
//   • announcement — host-only by convention; pinned styling + the
//                    fan-out path triggers on launch.
//   • question     — student wants an answer. Surfaces a "Mark as
//                    answered" affordance; resolved questions show
//                    a green check and credit helpfulness to the
//                    commenter who got marked.
//   • win          — student win; visually warmer, optionally
//                    cross-posts to the public Wall of Love when
//                    the workspace opts in.
//   • discussion   — default; the catch-all chat / thought post.
// Legacy posts without a `type` field render as "discussion".
export type BatchPostType = "announcement" | "question" | "win" | "discussion"

export interface BatchPost {
  id: string
  batchId: string               // owning StudentGroup id
  spaceId?: string              // which space inside the batch this lives in
  authorId: string              // user id (student or teacher)
  /** What kind of post is this? See BatchPostType. Defaults to
   *  "discussion" at render time when absent (every pre-C2 post). */
  type?: BatchPostType
  /** Set on question-type posts when the host (or any commenter) marks
   *  the question answered. ISO timestamp. The comment that resolved
   *  it (when known) is tracked separately in answeredByCommentId so
   *  helpfulness points can be credited to its author. */
  answeredAt?: string
  answeredByCommentId?: string
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
  // Instructor moderation flag. Hidden posts stay in storage but are
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
// Sprint C Communities #25 — expanded default channel set. The
// spec called for Announcements / General / Q&A / Off-topic /
// Resources. We keep Wins (existing default) and add the rest so
// fresh communities ship with the structure most cohorts settle on
// after a few weeks anyway. Order matches the typical scan path:
// top-down importance.
export const DEFAULT_BATCH_SPACES: BatchSpace[] = [
  { id: "space-announcements", name: "Announcements", emoji: "📣", description: "Instructor posts only — read first.", layout: "feed", order: 0 },
  { id: "space-general", name: "General", emoji: "💬", description: "Anything goes — say hi, share progress.", layout: "feed", order: 1 },
  { id: "space-qa", name: "Q&A", emoji: "❓", description: "Ask questions, help each other.", layout: "forum", order: 2 },
  { id: "space-wins", name: "Wins", emoji: "🎉", description: "Celebrate breakthroughs + milestones.", layout: "feed", order: 3 },
  { id: "space-resources", name: "Resources", emoji: "📚", description: "Curated reading + tools + links.", layout: "feed", order: 4 },
  { id: "space-off-topic", name: "Off-topic", emoji: "🛋️", description: "Memes, life, the lounge.", layout: "feed", order: 5 },
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
// Instructors can attach a rich set of resources (links, files, videos, plain
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
  annotatedUrl?: string  // URL of teacher-annotated image (drawn over student's submission)
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
  /** Live enrollment count derived from the enrollments array.
   *  Prefer this over `course.enrolledCount` (which is a stale
   *  denormalized cache and can drift after deletes / restores). */
  getEnrolledCount: (courseId: string) => number
  /** Returns the next available slug, suffixing `-2`, `-3`… when the
   *  base is already in use. Pass `excludeId` to ignore the course
   *  you're editing so a no-op save doesn't bump its own slug. */
  resolveUniqueSlug: (base: string, excludeId?: string) => string
  /** Live progress for an enrollment, derived from the enrollment's
   *  completedLessons intersected with the course's CURRENT lesson
   *  ids. Use this instead of `enrollment.progress` whenever the
   *  course's curriculum may have changed since enrollment. */
  getEnrollmentProgress: (enrollmentId: string) => number
  /** Stash editor edits without touching the public-facing course
   *  fields. Merge-style — pass only the keys you're changing. */
  saveCourseDraft: (id: string, patch: CourseDraft) => void
  /** Discard the pending draft, reverting the editor to the last
   *  published state. */
  discardCourseDraft: (id: string) => void
  /** Apply the pending draft to the canonical fields, append a new
   *  version snapshot, and clear the draft. The optional `note`
   *  shows up in the versions list. */
  publishCourseDraft: (id: string, note?: string) => void
  /** Roll the canonical fields back to a previous version. The
   *  current state is captured as a fresh version first so the
   *  restore is itself undoable. */
  restoreCourseVersion: (id: string, versionId: string) => void

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
  /** All whiteboards a given lesson has been attached to — reverse
   *  index of `whiteboard.attachedToLessons`. */
  getWhiteboardsForLesson: (lessonId: string) => Whiteboard[]

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
  annotateSubmission: (id: string, annotatedUrl: string) => void
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

// Minimal HTML escape for user-controlled strings we drop straight
// into a post body. We're not building a sanitiser — Tiptap rendering
// already strips dangerous tags on the way out — this just stops a
// session title with literal `<` from breaking the surrounding
// markup. Five replacements is enough for the surface area.
function escapeHtmlForPost(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
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

  // Process the `thebigclass.pendingLogin` breadcrumb the /login page
  // drops after a successful sign-in. Two jobs:
  //   1. Stamp `lastLoginAt` on the matching user row.
  //   2. Promote that user into `currentUserId` so the LMS store
  //      treats them as the signed-in user.
  //
  // Job (2) was missing — the login page wrote the breadcrumb but
  // nothing in the LMS store actually flipped currentUserId, so the
  // sidebar showed "Signed out / Guest" right after a successful
  // login. The user's access token + tenant were set correctly, but
  // the LMS provider couldn't tell who was signed in. Now we set
  // currentUserId AND mirror it to the persistent key in one go so
  // a refresh keeps them signed in.
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
    let matchedUserId: string | null = null
    setUsers((prev) => {
      const match =
        prev.find((u) => u.email?.toLowerCase() === id) ||
        prev.find((u) => u.phone === parsed?.identifier) ||
        prev.find((u) => u.role === "admin") ||
        null
      if (!match) return prev
      matchedUserId = match.id
      return prev.map((u) => (u.id === match.id ? { ...u, lastLoginAt: at } : u))
    })
    // Promote to currentUser + clear any stale signed-out marker.
    // setUsers' updater above runs synchronously in React 19, so
    // matchedUserId is populated by the time we read it.
    //
    // CRITICAL: the breadcrumb is the dashboard auth gate's "login
    // in progress, don't bounce yet" signal. Removing it without a
    // successful promotion strands the gate — it sees a null user,
    // no pending breadcrumb, and redirects back to /login. This
    // effect can fire transiently against the wrong tenant slug
    // (mid-render storage-key reshuffle, hydration tick before the
    // user record is fetched, etc.); if so, leave the breadcrumb
    // alone so a later tick can complete the promotion.
    if (matchedUserId) {
      setCurrentUserId(matchedUserId)
      try {
        window.localStorage.setItem(CURRENT_USER_KEY, matchedUserId)
        window.localStorage.removeItem(SIGNED_OUT_KEY)
        window.localStorage.removeItem("thebigclass.pendingLogin")
      } catch { /* private browsing — in-memory state still flips */ }
      setSignedOutState(false)
    }
    // No matched user → DO NOT remove the breadcrumb. We log once in
    // dev so the failure mode is visible without spamming on every
    // re-run when the same effect fires a second time before users
    // hydrate. The next render (after users load / tenant slug
    // stabilises) gets another shot.
  }, [usersHydrated, CURRENT_USER_KEY, SIGNED_OUT_KEY])

  const addUser = useCallback((user: User) => {
    setUsers((prev) => [user, ...prev])
    // Mirror the (email → tenant) mapping into the backend index so
    // cross-tenant webhooks (Razorpay payments coming in for this
    // person from an external context) can resolve to this workspace
    // in O(1) instead of walking every tenant blob by email. Fire-
    // and-forget — failures degrade to the legacy email-walk path,
    // not to a broken signup.
    if (user.email && tenantSlug) {
      void upsertTenantUserIndex(user.email, tenantSlug, user.id)
    }
  }, [tenantSlug])
  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers((prev) => {
      const before = prev.find((u) => u.id === id)
      const next = prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
      // Keep the email index in sync with whatever the new email is.
      // On an email change the old (email, slug) row becomes stale —
      // drop it so a webhook for the prior address doesn't keep
      // resolving to this tenant. Then upsert the new one. We can't
      // narrow the delete by email alone (would clear OTHER tenants
      // for that user), so we pass the slug too.
      const after = next.find((u) => u.id === id)
      if (after && tenantSlug) {
        const oldEmail = before?.email?.toLowerCase()
        const newEmail = after.email?.toLowerCase()
        if (oldEmail && newEmail && oldEmail !== newEmail) {
          void deleteTenantUserIndex({ email: oldEmail, slug: tenantSlug })
        }
        if (newEmail) {
          void upsertTenantUserIndex(newEmail, tenantSlug, after.id)
        }
      }
      return next
    })
  }, [tenantSlug])
  // Cascade delete a user (typically a student). Removes:
  //   * the user row itself
  //   * every enrollment the user owned
  //   * every assignment submission the user made
  //   * every quiz attempt
  //   * every attendance record
  //   * every doubt the user raised (and replies they wrote on others' doubts)
  //   * every message-thread row where the user is the lone recipient
  //   * group memberships referencing the user
  // The full bundle is pushed to Trash so an undo restores the
  // student together with their work — undo used to bring back a
  // bare user shell with everything they'd done permanently gone.
  // Cascade delete a user (typically a student). Removes related
  // enrollments, submissions, quiz attempts, attendance, doubts,
  // single-recipient messages, and group memberships. The full
  // bundle is pushed to Trash so an undo restores the student
  // together with the work they'd done.
  //
  // Implementation note: we snapshot each slice through its setter's
  // callback form (rather than closing over `enrollments` etc.) so
  // this callback doesn't have to be declared AFTER every state
  // declaration it touches, and so it never reads a stale array
  // from a closure that was created at mount.
  const deleteUser = useCallback((id: string) => {
    // Holders populated inside the setter callbacks below; pushed to
    // Trash once every collection has reported in.
    let targetUser: User | undefined
    let targetEnrollments: Enrollment[] = []
    let targetSubmissions: AssignmentSubmission[] = []
    let targetAttempts: QuizAttempt[] = []
    let targetAttendance: AttendanceRecord[] = []
    let targetDoubts: Doubt[] = []
    let targetMessages: Message[] = []
    let groupIds: string[] = []

    setUsers((prev) => {
      targetUser = prev.find((u) => u.id === id)
      // Drop the (email, slug) row from the backend lookup index in
      // the same tick we drop the user locally. Stale rows aren't
      // fatal — the webhook resolver still double-checks the tenant
      // blob before trusting a match — but keeping the index honest
      // avoids cross-tenant routing surprises after a delete. Fired
      // from inside the setter callback so we have a guaranteed
      // synchronous read of the user's email.
      if (targetUser?.email && tenantSlug) {
        void deleteTenantUserIndex({
          email: targetUser.email,
          slug: tenantSlug,
        })
      }
      return targetUser ? prev.filter((u) => u.id !== id) : prev
    })
    setEnrollments((prev) => {
      targetEnrollments = prev.filter((e) => e.studentId === id)
      return prev.filter((e) => e.studentId !== id)
    })
    setSubmissions((prev) => {
      targetSubmissions = prev.filter((s) => s.studentId === id)
      return prev.filter((s) => s.studentId !== id)
    })
    setQuizAttempts((prev) => {
      targetAttempts = prev.filter((a) => a.studentId === id)
      return prev.filter((a) => a.studentId !== id)
    })
    setAttendance((prev) => {
      targetAttendance = prev.filter((a) => a.studentId === id)
      return prev.filter((a) => a.studentId !== id)
    })
    setDoubts((prev) => {
      targetDoubts = prev.filter((d) => d.studentId === id)
      // Strip the deleted user's replies from OTHER students' doubts.
      return prev
        .filter((d) => d.studentId !== id)
        .map((d) => ({ ...d, replies: d.replies.filter((r) => r.authorId !== id) }))
    })
    setMessages((prev) => {
      targetMessages = prev.filter(
        (m) => m.recipientIds.length === 1 && m.recipientIds[0] === id,
      )
      return prev
        .filter((m) => !(m.recipientIds.length === 1 && m.recipientIds[0] === id))
        .map((m) =>
          m.recipientIds.includes(id)
            ? { ...m, recipientIds: m.recipientIds.filter((r) => r !== id) }
            : m,
        )
    })
    setStudentGroups((prev) => {
      groupIds = prev.filter((g) => g.memberIds.includes(id)).map((g) => g.id)
      return prev.map((g) =>
        g.memberIds.includes(id)
          ? { ...g, memberIds: g.memberIds.filter((m) => m !== id), updatedAt: new Date().toISOString() }
          : g,
      )
    })

    // Defer the trash push by a tick so all the setters have run and
    // populated the holders. Without this, the bundle could be pushed
    // with empty arrays under React 18's strict batching.
    setTimeout(() => {
      if (!targetUser) return
      pushToTrash({
        id: targetUser.id,
        kind: "user",
        label: targetUser.name || targetUser.email || "User",
        sublabel: targetUser.email,
        payload: {
          user: targetUser,
          enrollments: targetEnrollments,
          submissions: targetSubmissions,
          quizAttempts: targetAttempts,
          attendance: targetAttendance,
          doubts: targetDoubts,
          messages: targetMessages,
          groupIds,
        },
      })
    }, 0)
  }, [])
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesHydrated, setCoursesHydrated] = useState(false)
  // Mirror of `courses` for use inside async / event-listener
  // callbacks that would otherwise close over a stale array.
  // Specifically: the cross-store auto-community-join effect (Gap 11)
  // fires whenever the storefront grants a course entitlement —
  // useState closures inside that effect would see the courses
  // array at registration time, missing any later additions.
  const coursesRef = useRef<Course[]>([])
  useEffect(() => {
    coursesRef.current = courses
  }, [courses])
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

  // Auto-publish-at reminder runner. 24h before a scheduled publish
  // we ping the course owner (in-app + email) so they get a final
  // review window before the course goes live. Without this, a
  // teacher who scheduled the launch a week ago finds themselves
  // surprised when a typo lands on the homepage.
  //
  // Implementation: client-side checker that runs every 5 min while
  // the dashboard is open. Each course can only fire once — we stamp
  // `publishReminderSentAt` after firing so subsequent ticks skip
  // it. Resetting `publishAt` (or pushing it further out) on the
  // edit form clears the stamp so the next scheduled publish gets
  // its own reminder.
  const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000
  useEffect(() => {
    if (!coursesHydrated) return
    const tick = () => {
      const now = Date.now()
      const toFire: Course[] = []
      for (const c of courses) {
        if (!c.publishAt) continue
        if (c.status !== "draft") continue
        if (c.publishReminderSentAt) continue
        const target = Date.parse(c.publishAt)
        if (!Number.isFinite(target)) continue
        // Inside the 24h pre-flight window AND still in the future.
        if (target - now > REMINDER_WINDOW_MS) continue
        if (target <= now) continue
        toFire.push(c)
      }
      if (toFire.length === 0) return
      // Resolve the recipient — the course's primary instructor (we
      // already have an embedded `instructor` shape). Skip silently
      // if we can't find a matching User row to attach prefs to.
      setCourses((prev) =>
        prev.map((c) =>
          toFire.find((t) => t.id === c.id)
            ? { ...c, publishReminderSentAt: new Date().toISOString() }
            : c,
        ),
      )
      // Notifications fire OUT of the state setter to avoid loops.
      for (const c of toFire) {
        const teacher = users.find((u) => u.id === c.instructor?.id)
        if (!teacher) continue
        const hours = Math.max(1, Math.round((Date.parse(c.publishAt!) - now) / 3_600_000))
        const entries = buildNotifications(
          [teacher],
          {
            type: "course.publish-reminder",
            title: `"${c.title}" goes live in about ${hours}h`,
            body: `Scheduled to publish at ${new Date(c.publishAt!).toLocaleString()}. Final preview link in the dashboard.`,
            url: `/dashboard/courses/${c.id}`,
            meta: { courseId: c.id, kind: "course.publish-reminder" },
          },
          { channels: ["in-app", "email"] },
        )
        addNotifications(entries)
      }
    }
    // Tick immediately on hydrate, then every 5 min while the tab
    // stays open. Long enough that we don't burn re-renders; short
    // enough that the 24h window is meaningful at 23h59m boundary.
    tick()
    const interval = window.setInterval(tick, 5 * 60 * 1000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coursesHydrated])

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

    // Cross-browser login bridge. The pendingLogin breadcrumb handler
    // above (~L2082) runs on `usersHydrated` and uses the *local*
    // users seed — which is empty for fresh browsers / incognito /
    // first login after signup, so the match fails and the breadcrumb
    // sits in localStorage forever. The DashboardAuthGate then waits
    // for the breadcrumb to clear and shows its spinner indefinitely.
    //
    // Server re-hydrate is the moment we *do* have the real users
    // list, so attempt a second match here using the freshly-parsed
    // `usersData` directly (NOT React state — that's still mid-batch).
    // If a match is found, set currentUserId + remove the breadcrumb
    // exactly the way the original handler does. This is one-shot per
    // tenantSlug change and idempotent (no breadcrumb → no work), so
    // it can't loop even if `serverHydrated` flips multiple times.
    try {
      const rawBreadcrumb = window.localStorage.getItem("thebigclass.pendingLogin")
      if (rawBreadcrumb && usersData && usersData.length > 0) {
        const parsed = JSON.parse(rawBreadcrumb) as { identifier?: string; at?: string }
        const id = (parsed?.identifier || "").trim().toLowerCase()
        const match =
          usersData.find((u) => u.email?.toLowerCase() === id) ||
          usersData.find((u) => u.phone === parsed?.identifier) ||
          usersData.find((u) => u.role === "admin") ||
          null
        if (match) {
          setCurrentUserId(match.id)
          window.localStorage.setItem(CURRENT_USER_KEY, match.id)
          window.localStorage.removeItem(SIGNED_OUT_KEY)
          window.localStorage.removeItem("thebigclass.pendingLogin")
          setSignedOutState(false)
        }
      }
    } catch {
      /* breadcrumb missing / invalid / private browsing — fine */
    }

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
  
  // Returns a slug that doesn't collide with any existing course.
  // Appends `-2`, `-3`… until a free one is found. `excludeId` lets
  // an edit save its own (unchanged) slug without bumping it.
  const resolveUniqueSlug = useCallback(
    (base: string, excludeId?: string): string => {
      const seed = (base || "course").trim() || "course"
      const taken = new Set(
        courses.filter(c => c.id !== excludeId).map(c => c.slug).filter(Boolean),
      )
      if (!taken.has(seed)) return seed
      let n = 2
      while (taken.has(`${seed}-${n}`)) n++
      return `${seed}-${n}`
    },
    [courses],
  )

  const addCourse = useCallback((course: Course) => {
    // Dedupe by id — the new-course form pre-allocates the id and the
    // submit handler could fire twice on double-click or a Strict-Mode
    // double-render, which would otherwise plant the same row twice
    // and trigger React's "Encountered two children with the same key"
    // warning on the courses list.
    //
    // Also de-collide the slug. Two courses named "Math 101" used to
    // both get the slug `math-101`; `getCourseBySlug` returns the
    // first match, so the second course became unreachable at its
    // public URL. We resolve a unique suffix here so the second
    // course gets `math-101-2` without the caller having to know.
    setCourses(prev => {
      if (prev.some(c => c.id === course.id)) return prev
      const taken = new Set(prev.map(c => c.slug).filter(Boolean))
      let slug = course.slug || "course"
      if (taken.has(slug)) {
        let n = 2
        while (taken.has(`${slug}-${n}`)) n++
        slug = `${slug}-${n}`
      }
      return [...prev, { ...course, slug }]
    })
  }, [])

  const updateCourse = useCallback((id: string, updates: Partial<Course>) => {
    setCourses(prev =>
      prev.map(c => {
        if (c.id !== id) return c
        // If the slug is being changed, enforce uniqueness against all
        // OTHER courses' slugs. Saving the same slug we already have
        // is fine (no-op edit shouldn't bump us to `-2`).
        let next: Course = { ...c, ...updates, updatedAt: new Date().toISOString() }
        if (typeof updates.slug === "string" && updates.slug !== c.slug) {
          const taken = new Set(
            prev.filter(o => o.id !== id).map(o => o.slug).filter(Boolean),
          )
          let s = updates.slug || "course"
          if (taken.has(s)) {
            let n = 2
            while (taken.has(`${s}-${n}`)) n++
            s = `${s}-${n}`
          }
          next = { ...next, slug: s }
        }
        return next
      }),
    )
  }, [])

  // ── Draft / Publish workflow ────────────────────────────────
  // Editor edits flow through saveCourseDraft → publishCourseDraft.
  // updateCourse stays the low-level setter for operational fields
  // (status, publishAt, ratings, enrollment counts). Content edits
  // should go through the draft path so students never see a
  // half-finished change.
  const saveCourseDraft = useCallback((id: string, patch: CourseDraft) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const nextDraft: CourseDraft = { ...(c.draft ?? {}), ...patch }
        return {
          ...c,
          draft: nextDraft,
          draftUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const discardCourseDraft = useCallback((id: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, draft: null, draftUpdatedAt: undefined, updatedAt: new Date().toISOString() }
          : c,
      ),
    )
  }, [])

  const publishCourseDraft = useCallback((id: string, note?: string) => {
    setCourses((prev) => {
      // Read the current user via the latest setter callback so the
      // captured author on the version is accurate even if the user
      // signed in between mount and publish.
      const publisher = currentUserId
        ? users.find((u) => u.id === currentUserId) ?? null
        : null
      return prev.map((c) => {
        if (c.id !== id) return c
        const draft = c.draft ?? {}
        // Merge draft into the canonical fields. Only keys present
        // in the draft override; nothing else moves.
        const applied: Course = {
          ...c,
          ...draft,
          // operational fields stay where they were
          status: c.status,
          enrolledCount: c.enrolledCount,
          rating: c.rating,
          reviewCount: c.reviewCount,
        }
        // Snapshot AFTER the apply so version N == the public state
        // immediately after publish (Restore is then "go back to
        // what students were seeing on Mar 14").
        const nextVersionNumber = (c.versions?.[0]?.version ?? 0) + 1
        const snapshot: CourseVersion = {
          id: generateId("ver"),
          version: nextVersionNumber,
          publishedAt: new Date().toISOString(),
          publishedById: publisher?.id,
          publishedByName: publisher?.name,
          note,
          snapshot: {
            title: applied.title,
            subtitle: applied.subtitle,
            slug: applied.slug,
            description: applied.description,
            thumbnail: applied.thumbnail,
            introVideoUrl: applied.introVideoUrl,
            category: applied.category,
            tags: applied.tags,
            level: applied.level,
            language: applied.language,
            price: applied.price,
            originalPrice: applied.originalPrice,
            currency: applied.currency,
            earlyBirdPrice: applied.earlyBirdPrice,
            earlyBirdUntil: applied.earlyBirdUntil,
            coupons: applied.coupons,
            coInstructorIds: applied.coInstructorIds,
            modules: applied.modules,
            totalDuration: applied.totalDuration,
            totalLessons: applied.totalLessons,
            visibility: applied.visibility,
            accessPassword: applied.accessPassword,
            certificateEligible: applied.certificateEligible,
            certificateTemplate: applied.certificateTemplate,
            features: applied.features,
            requirements: applied.requirements,
            whatYouLearn: applied.whatYouLearn,
            seoTitle: applied.seoTitle,
            seoDescription: applied.seoDescription,
            seoKeywords: applied.seoKeywords,
            ogImage: applied.ogImage,
            accessModel: applied.accessModel,
            checkoutBumpProductId: applied.checkoutBumpProductId,
            coachingProductId: applied.coachingProductId,
            defaultBatchId: applied.defaultBatchId,
            instructorId: applied.instructor?.id,
          },
        }
        return {
          ...applied,
          draft: null,
          draftUpdatedAt: undefined,
          publishedAt: snapshot.publishedAt,
          versions: [snapshot, ...(c.versions ?? [])],
          updatedAt: new Date().toISOString(),
        }
      })
    })
  }, [currentUserId, users])

  const restoreCourseVersion = useCallback((id: string, versionId: string) => {
    setCourses((prev) => {
      const publisher = currentUserId
        ? users.find((u) => u.id === currentUserId) ?? null
        : null
      return prev.map((c) => {
        if (c.id !== id) return c
        const target = (c.versions ?? []).find((v) => v.id === versionId)
        if (!target) return c
        // First, snapshot the CURRENT state so the restore is itself
        // undoable from the versions list.
        const nextVersionNumber = (c.versions?.[0]?.version ?? 0) + 1
        const preRestoreSnapshot: CourseVersion = {
          id: generateId("ver"),
          version: nextVersionNumber,
          publishedAt: new Date().toISOString(),
          publishedById: publisher?.id,
          publishedByName: publisher?.name,
          note: `Auto-saved before restoring "v${target.version}"`,
          snapshot: {
            title: c.title,
            subtitle: c.subtitle,
            slug: c.slug,
            description: c.description,
            thumbnail: c.thumbnail,
            introVideoUrl: c.introVideoUrl,
            category: c.category,
            tags: c.tags,
            level: c.level,
            language: c.language,
            price: c.price,
            originalPrice: c.originalPrice,
            currency: c.currency,
            earlyBirdPrice: c.earlyBirdPrice,
            earlyBirdUntil: c.earlyBirdUntil,
            coupons: c.coupons,
            coInstructorIds: c.coInstructorIds,
            modules: c.modules,
            totalDuration: c.totalDuration,
            totalLessons: c.totalLessons,
            visibility: c.visibility,
            accessPassword: c.accessPassword,
            certificateEligible: c.certificateEligible,
            certificateTemplate: c.certificateTemplate,
            features: c.features,
            requirements: c.requirements,
            whatYouLearn: c.whatYouLearn,
            seoTitle: c.seoTitle,
            seoDescription: c.seoDescription,
            seoKeywords: c.seoKeywords,
            ogImage: c.ogImage,
            accessModel: c.accessModel,
            checkoutBumpProductId: c.checkoutBumpProductId,
            coachingProductId: c.coachingProductId,
            defaultBatchId: c.defaultBatchId,
            instructorId: c.instructor?.id,
          },
        }
        // Apply the target snapshot onto the canonical fields.
        const restored: Course = {
          ...c,
          // shallow-merge — only fields present in the snapshot
          // override (versions are stored as a partial).
          ...target.snapshot,
          // discard any pending draft — the user explicitly chose
          // to take this version instead.
          draft: null,
          draftUpdatedAt: undefined,
          publishedAt: new Date().toISOString(),
          versions: [preRestoreSnapshot, ...(c.versions ?? [])],
          updatedAt: new Date().toISOString(),
        }
        return restored
      })
    })
  }, [currentUserId, users])

  // Cascade delete. Removing a course also removes everything that
  // points at it — enrollments, assignments + their submissions and
  // open-views, live sessions + their attendance, course-scoped
  // quizzes + their attempts, doubts, reviews. Without this the
  // related rows used to dangle with a dead `courseId`, and an
  // undo from Trash could only restore the bare shell.
  //
  // The complete bundle is pushed to Trash so Restore brings the
  // course back together with its children — same UX as
  // `deleteAssignment` which already does this for submissions.
  const deleteCourse = useCallback((id: string) => {
    const target = courses.find(c => c.id === id)
    if (!target) return

    const targetEnrollments = enrollments.filter(e => e.courseId === id)
    const targetAssignments = assignments.filter(a => a.courseId === id)
    const assignmentIds = new Set(targetAssignments.map(a => a.id))
    const targetSubmissions = submissions.filter(s => assignmentIds.has(s.assignmentId))
    const targetAssignmentViews = assignmentViews.filter(v => assignmentIds.has(v.assignmentId))
    const targetSessions = liveSessions.filter(s => s.courseId === id)
    const sessionIds = new Set(targetSessions.map(s => s.id))
    const targetAttendance = attendance.filter(a => sessionIds.has(a.sessionId))
    const targetQuizzes = quizzes.filter(q => q.courseId === id)
    const quizIds = new Set(targetQuizzes.map(q => q.id))
    const targetAttempts = quizAttempts.filter(a => quizIds.has(a.quizId))
    const targetDoubts = doubts.filter(d => d.courseId === id)
    const targetReviews = reviews.filter(r => r.courseId === id)

    pushToTrash({
      id: target.id,
      kind: "course",
      label: target.title || "Course",
      sublabel: `${target.modules?.length ?? 0} modules · ${targetEnrollments.length} student${targetEnrollments.length === 1 ? "" : "s"}`,
      payload: {
        course: target,
        enrollments: targetEnrollments,
        assignments: targetAssignments,
        submissions: targetSubmissions,
        assignmentViews: targetAssignmentViews,
        liveSessions: targetSessions,
        attendance: targetAttendance,
        quizzes: targetQuizzes,
        quizAttempts: targetAttempts,
        doubts: targetDoubts,
        reviews: targetReviews,
      },
    })

    setCourses(prev => prev.filter(c => c.id !== id))
    setEnrollments(prev => prev.filter(e => e.courseId !== id))
    setAssignments(prev => prev.filter(a => a.courseId !== id))
    setSubmissions(prev => prev.filter(s => !assignmentIds.has(s.assignmentId)))
    setAssignmentViews(prev => prev.filter(v => !assignmentIds.has(v.assignmentId)))
    setLiveSessions(prev => prev.filter(s => s.courseId !== id))
    setAttendance(prev => prev.filter(a => !sessionIds.has(a.sessionId)))
    setQuizzes(prev => prev.filter(q => q.courseId !== id))
    setQuizAttempts(prev => prev.filter(a => !quizIds.has(a.quizId)))
    setDoubts(prev => prev.filter(d => d.courseId !== id))
    setReviews(prev => prev.filter(r => r.courseId !== id))
  }, [courses, enrollments, assignments, submissions, assignmentViews, liveSessions, attendance, quizzes, quizAttempts, doubts, reviews])

  const getCourseById = useCallback((id: string) => courses.find(c => c.id === id), [courses])
  const getCourseBySlug = useCallback((slug: string) => courses.find(c => c.slug === slug), [courses])
  // Live enrollment count — derived from the enrollments array so it
  // can't drift relative to `course.enrolledCount` (the denormalized
  // cache that the rest of the store still increments / decrements
  // for any UI that hasn't been migrated to this getter).
  const getEnrolledCount = useCallback(
    (courseId: string) => enrollments.filter(e => e.courseId === courseId).length,
    [enrollments],
  )
  
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
    // Detect the 99→100 transition BEFORE the state update so we
    // can fire the teacher congrats notification exactly once per
    // enrollment. We compute against the current enrollments snapshot
    // (the closed-over `enrollments` array). Without this guard,
    // replaying a lesson after completion would re-notify every time.
    const before = enrollments.find((e) => e.id === enrollmentId)
    let completionEvent:
      | { courseId: string; studentId: string }
      | null = null
    if (before && !before.completedAt && enrollmentId !== "preview") {
      const course = courses.find((c) => c.id === before.courseId)
      const currentLessonIds = new Set(
        (course?.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id)),
      )
      const wouldComplete = before.completedLessons.includes(lessonId)
        ? before.completedLessons
        : [...before.completedLessons, lessonId]
      const aliveDone = wouldComplete.filter((id) => currentLessonIds.has(id))
      const total = currentLessonIds.size
      const nextProgress = total > 0
        ? Math.min(100, Math.round((aliveDone.length / total) * 100))
        : 0
      if (nextProgress === 100) {
        completionEvent = { courseId: before.courseId, studentId: before.studentId }
      }
    }
    setEnrollments(prev => prev.map(e => {
      if (e.id !== enrollmentId) return e
      const course = courses.find(c => c.id === e.courseId)
      // Lesson ids that still exist on the course RIGHT NOW. We use
      // these both as the denominator and as a filter on the stored
      // `completedLessons` so a lesson the teacher deleted after the
      // student finished it doesn't keep counting toward 100%.
      const currentLessonIds = new Set(
        (course?.modules ?? []).flatMap(m => m.lessons.map(l => l.id)),
      )
      const completedLessons = e.completedLessons.includes(lessonId)
        ? e.completedLessons
        : [...e.completedLessons, lessonId]
      const completedAlive = completedLessons.filter(id => currentLessonIds.has(id))
      const total = currentLessonIds.size
      const progress = total > 0
        ? Math.min(100, Math.round((completedAlive.length / total) * 100))
        : 0
      return {
        ...e,
        completedLessons,
        progress,
        lastAccessedAt: new Date().toISOString(),
        currentLessonId: lessonId,
        completedAt: progress === 100 ? new Date().toISOString() : e.completedAt,
      }
    }))
    // Fire teacher congrats. Already gated above (no completedAt
    // before, real enrollment, 100% projected) so this branch only
    // executes on the actual finish-line tick.
    if (completionEvent) {
      const course = courses.find((c) => c.id === completionEvent.courseId)
      const student = users.find((u) => u.id === completionEvent.studentId)
      const teacher = course?.instructor?.id
        ? users.find((u) => u.id === course.instructor.id)
        : null
      if (course && student && teacher) {
        const entries = buildNotifications(
          [teacher],
          {
            type: "course.completed",
            title: `🎉 ${student.name} finished ${course.title}`,
            body: `Send a quick congrats — students love being seen on the finish line.`,
            url: `/dashboard/students/${student.id}`,
            meta: {
              courseId: course.id,
              studentId: student.id,
              kind: "course.completed",
            },
          },
          { channels: ["in-app", "email"] },
        )
        addNotifications(entries)
      }
    }
  }, [courses, users, enrollments])

  // Live progress derivation — recomputes from the enrollment's
  // completedLessons intersected with the course's CURRENT lesson
  // ids. Use this on display surfaces (lists, dashboards, student
  // home) so a curriculum edit reflects immediately without waiting
  // for the next updateProgress tick.
  const getEnrollmentProgress = useCallback(
    (enrollmentId: string): number => {
      const e = enrollments.find(x => x.id === enrollmentId)
      if (!e) return 0
      const course = courses.find(c => c.id === e.courseId)
      const ids = new Set(
        (course?.modules ?? []).flatMap(m => m.lessons.map(l => l.id)),
      )
      if (ids.size === 0) return 0
      const done = e.completedLessons.filter(id => ids.has(id)).length
      return Math.min(100, Math.round((done / ids.size) * 100))
    },
    [enrollments, courses],
  )
  
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
  // When a doubt is filed (by an enrolled student OR a guest from
  // the public course page) we also drop an in-app notification on
  // the instructor's bell so they don't have to remember to check
  // the inbox. Without this the doubt only surfaced via email +
  // the dashboard inbox, and instructors complained that the bell
  // counter understated how much was actually waiting on them.
  const addDoubt = useCallback((doubt: Doubt) => {
    setDoubts((prev) => [doubt, ...prev])
    // Resolve target instructor through the latest courses snapshot
    // via the setter callback so we don't capture a stale closure.
    setCourses((prevCourses) => {
      const course = prevCourses.find((c) => c.id === doubt.courseId)
      if (!course) return prevCourses
      // Notify the primary instructor + any co-instructors. We
      // de-dupe so a teacher who's listed twice (legacy data)
      // doesn't get two bell pings.
      const recipientIds = new Set<string>()
      if (course.instructor?.id) recipientIds.add(course.instructor.id)
      for (const id of course.coInstructorIds ?? []) recipientIds.add(id)
      // Don't ping the student / teacher who just asked their own question.
      recipientIds.delete(doubt.studentId)
      if (recipientIds.size > 0) {
        const askerLabel = doubt.guest?.name?.trim() || "A student"
        const askerSuffix = doubt.guest?.name?.trim()
          ? ` (guest${doubt.guest.email ? ` · ${doubt.guest.email}` : ""})`
          : ""
        const notifs: Notification[] = [...recipientIds].map((uid) => ({
          id: generateId("notif"),
          userId: uid,
          channel: "in-app",
          type: "doubt.asked",
          title: `New question on "${course.title}"`,
          body: `${askerLabel}${askerSuffix}: ${doubt.title.slice(0, 200)}`,
          url: `/dashboard/doubts`,
          createdAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          status: "sent",
          meta: { doubtId: doubt.id, courseId: course.id },
        }))
        // Defer the notification push to the next tick — pushing
        // inside the courses setter keeps state coherent but the
        // notifications slice has its own setter that we trigger
        // outside the render to avoid React's "setState during
        // render" warning.
        setTimeout(() => {
          setNotifications((prevNotifs) => [...notifs, ...prevNotifs])
        }, 0)
      }
      return prevCourses
    })
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
  // Instructor can clean up a question's title/body for grammar or context
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
    // Seed three system posts so a newly-created batch never opens to
    // an empty feed (the #1 reason cohorts feel dead on day 1). These
    // are real BatchPosts owned by the creator — they can edit, pin,
    // or delete any of them. The Welcome post pins automatically so it
    // anchors the top of the feed for the first month.
    //
    // We only seed when the batch is created with no posts yet. The
    // check is implicit (a brand-new batch can't have posts), so this
    // is safe to call here. If a workspace export later re-adds an
    // existing batch via addStudentGroup, we'd risk duplicating the
    // seeds — but workspace import goes through a different code path
    // (setStudentGroups directly), so this is fine in practice.
    const nowIso = new Date().toISOString()
    const authorId = group.createdBy ?? group.memberIds?.[0] ?? "system"
    const seeded: BatchPost[] = [
      {
        id: `${group.id}-seed-welcome-${Date.now()}`,
        batchId: group.id,
        spaceId: "space-general",
        authorId,
        body:
          `<p>Welcome to <strong>${escapeHtml(group.name)}</strong> 👋</p>` +
          `<p>This is your home base — questions, wins, schedule changes, everything lives here.</p>` +
          `<p>Tap <em>Introduce yourself</em> below to say hi. We'll do this together.</p>`,
        pinned: true,
        hidden: false,
        comments: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: `${group.id}-seed-intro-${Date.now() + 1}`,
        batchId: group.id,
        spaceId: "space-general",
        authorId,
        body:
          `<p><strong>Introduce yourself 👋</strong></p>` +
          `<p>Drop a reply with:</p>` +
          `<ul><li>Your name + where you're tuning in from</li>` +
          `<li>One thing you're trying to build</li>` +
          `<li>One thing you hope to walk out of this cohort with</li></ul>`,
        pinned: false,
        hidden: false,
        comments: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: `${group.id}-seed-whatyouget-${Date.now() + 2}`,
        batchId: group.id,
        spaceId: "space-general",
        authorId,
        body:
          `<p><strong>What you'll get from ${escapeHtml(group.name)}</strong></p>` +
          `<ul>` +
          `<li>Live sessions — show up, ask, leave with answers</li>` +
          `<li>Every class recorded with chapters and a chat transcript</li>` +
          `<li>This common room — questions get answered, wins get celebrated</li>` +
          `</ul>` +
          `<p>Edit this post any time to make it yours.</p>`,
        pinned: false,
        hidden: false,
        comments: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ]
    setBatchPosts((prev) => [...seeded, ...prev])
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
  // Propagate a freshly-finalised recording URL into any curriculum
  // lesson that was scheduled to play this live class. Matches by
  // `lesson.type === "live"` + `lesson.content === sessionId` — the
  // exact shape the curriculum editor stamps when an instructor
  // attaches an existing live session to a lesson. We swap the
  // lesson's type to "video" so the student player swaps from the
  // live-placeholder UI to an actual recording inline; the original
  // session id is preserved in lesson.resources for trace-back.
  //
  // Idempotent: we never overwrite a lesson that's already pointing
  // at a non-live URL (manual override wins) and we don't re-write
  // when the lesson already shows the same URL. Wrapped in setCourses
  // updater form so we don't depend on stale closure courses[].
  const propagateRecordingToLessons = useCallback(
    (sessionId: string, recordingUrl: string) => {
      if (!recordingUrl) return
      setCourses((prev) => {
        let changed = false
        const next = prev.map((c) => {
          let courseChanged = false
          const modules = c.modules.map((m) => {
            let moduleChanged = false
            const lessons = m.lessons.map((l) => {
              if (l.type !== "live") return l
              if (l.content !== sessionId) return l
              if (l.content === recordingUrl) return l // already
              moduleChanged = true
              return {
                ...l,
                type: "video" as const,
                content: recordingUrl,
                // Stash a back-reference so the editor can show
                // "Originally a live class · auto-linked when the
                // recording was ready" and an instructor can choose
                // to revert.
                resources: [
                  ...(l.resources ?? []),
                  { label: "Original live class id", url: sessionId },
                ],
              }
            })
            if (moduleChanged) {
              courseChanged = true
              return { ...m, lessons }
            }
            return m
          })
          if (courseChanged) {
            changed = true
            return { ...c, modules }
          }
          return c
        })
        return changed ? next : prev
      })
    },
    [],
  )

  // Fire a recording-ready notification to every enrolled student
  // when a class's recording URL appears for the first time. Honours
  // the existing notifications dispatcher so channel prefs + email
  // delivery work out of the box. We swallow the event for sessions
  // without a courseId — those are ad-hoc rooms with no audience.
  const fireRecordingReadyNotification = useCallback(
    (sessionId: string, recordingUrl: string) => {
      const session = liveSessions.find((s) => s.id === sessionId)
      if (!session || !session.courseId) return
      const course = courses.find((c) => c.id === session.courseId)
      if (!course) return
      const enrolledIds = new Set(
        enrollments
          .filter((e) => e.courseId === session.courseId)
          .map((e) => e.studentId),
      )
      const recipients = users.filter((u) => enrolledIds.has(u.id))
      if (recipients.length === 0) return
      const minutes = session.durationMinutes
        ? `${session.durationMinutes} min`
        : "your class"
      const entries = buildNotifications(
        recipients,
        {
          type: "live-session.recording-ready",
          title: `📼 Recording ready — ${session.title}`,
          body: `${course.title}: yesterday's class recording is up (${minutes}). Watch when you can.`,
          // Deep link sends them to the recordings hub. The recording
          // row will resolve from session.id naturally.
          url: `/dashboard/recordings?q=${encodeURIComponent(session.title)}`,
          meta: {
            sessionId,
            courseId: course.id,
            kind: "live-session.recording-ready",
            recordingUrl,
          },
        },
        // Skip WhatsApp by default — recording-ready is informational,
        // not urgent. The dispatcher will still respect a user's
        // explicit opt-in for the channel.
        { channels: ["in-app", "email"] },
      )
      addNotifications(entries)
    },
    // We deliberately exclude `addNotifications` from the deps. It's
    // declared later in this provider; the reference inside the
    // closure is fine because the callback runs post-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveSessions, courses, enrollments, users],
  )

  // Sprint A Communities #19 — when a class recording becomes
  // available, auto-post it to the course's attached community
  // (`course.defaultBatchId`) so members get the recording in their
  // feed without having to dig through the recordings library. We
  // skip when no community is attached, when no permanent record
  // exists yet (transient recording URL pre-finalisation), or when
  // a previous auto-post for this session already exists (dedupe).
  const autoCrossPostRecordingToCommunity = useCallback(
    (sessionId: string, recordingUrl: string) => {
      const session = liveSessions.find((s) => s.id === sessionId)
      if (!session || !session.courseId) return
      const course = courses.find((c) => c.id === session.courseId)
      // No attached community on the course → nothing to cross-post to.
      if (!course?.defaultBatchId) return
      // Dedupe: scan existing posts for a marker pointing at this
      // session. Auto-posts carry the marker
      // `data-recording-session="<id>"` in their HTML body, which we
      // can grep without a separate index.
      const marker = `data-recording-session="${sessionId}"`
      const existing = batchPosts.find(
        (p) => p.batchId === course.defaultBatchId && (p.body ?? "").includes(marker),
      )
      if (existing) return
      // Author: prefer the session's host (real human signature);
      // fall back to first admin in the workspace so the post still
      // ships if the host has been deleted since.
      const authorId =
        session.hostId ?? users.find((u) => u.role === "admin")?.id
      if (!authorId) return
      const duration = session.durationMinutes
        ? ` · ${session.durationMinutes} min`
        : ""
      // Plain HTML body — renders through the same RichTextContent
      // the rest of the community feed uses. Inline play link points
      // at recordings hub with the title as the search query so the
      // student lands on the right row.
      const body =
        `<p data-recording-session="${sessionId}">` +
        `📼 <strong>Recording from today's class is up.</strong></p>` +
        `<p>${escapeHtmlForPost(session.title)}${duration}.</p>` +
        `<p>` +
        `<a href="/dashboard/recordings?q=${encodeURIComponent(session.title)}">Watch the recording →</a>` +
        `</p>`
      const now = new Date().toISOString()
      setBatchPosts((prev) => [
        ...prev,
        {
          id: generateId("post"),
          batchId: course.defaultBatchId!,
          authorId,
          body,
          // Pinned for 24h-worth of feed visibility; admins can
          // unpin if it crowds the top. We don't enforce auto-
          // unpin server-side — the existing feed has very few
          // pinned posts in practice.
          pinned: true,
          hidden: false,
          comments: [],
          createdAt: now,
          updatedAt: now,
          // Carry the recording URL on the post so the future
          // "click to play inline" enhancement can find it without
          // re-parsing the body.
          embedUrl: recordingUrl,
        },
      ])
    },
    // Deliberately exclude setBatchPosts (stable from useState); we
    // also exclude batchPosts to avoid re-running the cb every time
    // a post lands. The dedupe check uses the latest via the lookup
    // at call-time — race window is too narrow to matter (two
    // recording-ready events for the same session in the same tick
    // would be a backend bug, not a hot path).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveSessions, courses, users, batchPosts],
  )

  const updateLiveSession = useCallback((id: string, updates: Partial<LiveSession>) => {
    const before = liveSessions.find((s) => s.id === id)
    setLiveSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    // Recording URL just arrived (e.g. from the egress poller's
    // backfill) → wire it into any lesson that scheduled this class
    // AND ping every enrolled student so they don't have to refresh
    // their library to discover the new content.
    if (updates.recordingUrl && updates.recordingUrl !== before?.recordingUrl) {
      propagateRecordingToLessons(id, updates.recordingUrl)
      fireRecordingReadyNotification(id, updates.recordingUrl)
      // Sprint A Communities #19 — also fan into the attached
      // community feed. Idempotent — see dedupe inside.
      autoCrossPostRecordingToCommunity(id, updates.recordingUrl)
    }
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
  }, [liveSessions, propagateRecordingToLessons, fireRecordingReadyNotification, autoCrossPostRecordingToCommunity])
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
            // Set recordingUrl directly so the class detail page's
            // "Watch recording" card appears as soon as the host ends
            // the class with a URL in hand. Previously this field was
            // never touched here — only recordings[] was updated —
            // so /dashboard/classes/[id] never showed the Watch button
            // even though /host did (host reads recordings[last]).
            // When recording is still pending (egress in flight), we
            // leave the field undefined; the EndedHostScreen poller
            // backfills it via updateLiveSession once the URL arrives.
            ...(recording?.url ? { recordingUrl: recording.url } : {}),
          }
        }),
      )
      if (session) {
        void pushRoomState(session.roomCode ?? session.id, {
          state: "ended",
          recordingUrl: recording?.url ?? null,
        })
      }
      // If the host ended with a real recording URL in hand (most
      // hosts; the egress poller fills it later for the rest), wire
      // it into any lesson that was waiting on this class AND notify
      // every enrolled student that the playback is ready.
      if (recording?.url) {
        propagateRecordingToLessons(id, recording.url)
        fireRecordingReadyNotification(id, recording.url)
        // Sprint A Communities #19 — also fan into the attached
        // community feed when the host ends with a recording URL.
        autoCrossPostRecordingToCommunity(id, recording.url)
      }
    },
    [liveSessions, propagateRecordingToLessons, fireRecordingReadyNotification, autoCrossPostRecordingToCommunity],
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
  // Reverse index: scan once per call (linear in board count). Cheap
  // enough — workspaces don't carry tens of thousands of boards, and
  // the lesson page renders this a handful of times per mount.
  const getWhiteboardsForLesson = useCallback(
    (lessonId: string) =>
      whiteboards.filter((b) => (b.attachedToLessons ?? []).includes(lessonId)),
    [whiteboards],
  )

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
  const annotateSubmission = useCallback((id: string, annotatedUrl: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, annotatedUrl } : s))
  }, [])
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
          case "user": {
            // Cascade restore — pair with the cascade in deleteUser
            // above. Old user-trash entries were a bare User; we
            // keep the fallback so legacy trash entries still restore.
            const payload = entry.payload as
              | User
              | {
                user: User
                enrollments: Enrollment[]
                submissions: AssignmentSubmission[]
                quizAttempts: QuizAttempt[]
                attendance: AttendanceRecord[]
                doubts: Doubt[]
                messages: Message[]
                groupIds: string[]
              }
            const bundle = "user" in payload ? payload : null
            const user = bundle ? bundle.user : (payload as User)
            setUsers(prev => prev.some(u => u.id === user.id) ? prev : [...prev, user])
            if (bundle) {
              const mergeById = <T extends { id: string }>(prev: T[], add: T[]): T[] => {
                if (add.length === 0) return prev
                const have = new Set(prev.map(x => x.id))
                return [...prev, ...add.filter(x => !have.has(x.id))]
              }
              setEnrollments(prev => mergeById(prev, bundle.enrollments))
              setSubmissions(prev => mergeById(prev, bundle.submissions))
              setQuizAttempts(prev => mergeById(prev, bundle.quizAttempts))
              setAttendance(prev => mergeById(prev, bundle.attendance))
              setDoubts(prev => mergeById(prev, bundle.doubts))
              setMessages(prev => mergeById(prev, bundle.messages))
              if (bundle.groupIds.length > 0) {
                const wanted = new Set(bundle.groupIds)
                setStudentGroups(prev => prev.map(g =>
                  wanted.has(g.id) && !g.memberIds.includes(user.id)
                    ? { ...g, memberIds: [...g.memberIds, user.id], updatedAt: new Date().toISOString() }
                    : g,
                ))
              }
            }
            return true
          }
          case "course": {
            // Cascade restore — pair with the cascade in deleteCourse
            // (every child collection it removed is in this payload).
            // Old course-trash entries were a bare Course; we still
            // handle that shape via the fallback so legacy trash
            // entries don't get stuck un-restorable.
            const payload = entry.payload as
              | Course
              | {
                course: Course
                enrollments: Enrollment[]
                assignments: Assignment[]
                submissions: AssignmentSubmission[]
                assignmentViews: AssignmentView[]
                liveSessions: LiveSession[]
                attendance: AttendanceRecord[]
                quizzes: Quiz[]
                quizAttempts: QuizAttempt[]
                doubts: Doubt[]
                reviews: Review[]
              }
            const bundle = "course" in payload ? payload : null
            const course = bundle ? bundle.course : (payload as Course)
            setCourses(prev => prev.some(c => c.id === course.id) ? prev : [...prev, course])
            if (bundle) {
              const mergeById = <T extends { id: string }>(prev: T[], add: T[]): T[] => {
                if (add.length === 0) return prev
                const have = new Set(prev.map(x => x.id))
                return [...prev, ...add.filter(x => !have.has(x.id))]
              }
              setEnrollments(prev => mergeById(prev, bundle.enrollments))
              setAssignments(prev => mergeById(prev, bundle.assignments))
              setSubmissions(prev => mergeById(prev, bundle.submissions))
              setAssignmentViews(prev => mergeById(prev, bundle.assignmentViews))
              setLiveSessions(prev => mergeById(prev, bundle.liveSessions))
              setAttendance(prev => mergeById(prev, bundle.attendance))
              setQuizzes(prev => mergeById(prev, bundle.quizzes))
              setQuizAttempts(prev => mergeById(prev, bundle.quizAttempts))
              setDoubts(prev => mergeById(prev, bundle.doubts))
              setReviews(prev => mergeById(prev, bundle.reviews))
            }
            return true
          }
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

  // Cross-store auto-join (Phase 3C — Gap 11). The storefront
  // dispatches `entitlement.course-granted` whenever a buyer is
  // granted access to a course; we look up the course, find its
  // defaultBatchId, and add the buyer to that batch's memberIds
  // here. Idempotent — memberIds.includes() guards against
  // duplicate appends from the next-step page's belt-and-braces
  // join. Runs in BOTH directions: a guest who never opens the
  // post-purchase page still ends up in the community.
  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ customerId?: string; courseId?: string }>).detail
      if (!detail?.customerId || !detail?.courseId) return
      const course = coursesRef.current.find((c) => c.id === detail.courseId)
      const defaultBatchId = course?.defaultBatchId
      if (!defaultBatchId) return
      setStudentGroups((prev) =>
        prev.map((g) =>
          g.id === defaultBatchId && !g.memberIds.includes(detail.customerId!)
            ? {
              ...g,
              memberIds: [...g.memberIds, detail.customerId!],
              updatedAt: new Date().toISOString(),
            }
            : g,
        ),
      )
    }
    window.addEventListener("entitlement.course-granted", handler)
    return () => window.removeEventListener("entitlement.course-granted", handler)
  }, [])

  // Cross-store auto-join for **paid community** products. Same
  // pattern as the course path above — the storefront fires
  // `entitlement.community-granted` with the StudentGroup id; we
  // add the buyer to that group's memberIds (idempotent). The
  // optional welcomeMessage from the product config is posted to
  // the group's General space if one exists, so the new member
  // lands on a friendly first post instead of an empty feed.
  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{
        customerId?: string
        communityId?: string
        welcomeMessage?: string
        productTitle?: string
      }>).detail
      if (!detail?.customerId || !detail?.communityId) return

      let targetGroupName: string | undefined
      setStudentGroups((prev) =>
        prev.map((g) => {
          if (g.id !== detail.communityId) return g
          targetGroupName = g.name
          if (g.memberIds.includes(detail.customerId!)) return g
          return {
            ...g,
            memberIds: [...g.memberIds, detail.customerId!],
            updatedAt: new Date().toISOString(),
          }
        }),
      )

      // Post the welcome message — best-effort, swallows errors so
      // a missing batchPosts store can't break the purchase flow.
      const msg = detail.welcomeMessage?.trim()
      if (msg && detail.communityId) {
        try {
          const nowIso = new Date().toISOString()
          setBatchPosts((prev) => [
            {
              id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              batchId: detail.communityId!,
              authorId: "system",
              type: "announcement",
              body: msg,
              createdAt: nowIso,
              updatedAt: nowIso,
              reactions: {},
              pinned: false,
              hidden: false,
              comments: [],
            },
            ...prev,
          ])
        } catch {
          /* welcome-post failure must not break checkout */
        }
      }
      // Light telemetry breadcrumb — useful for the demo so the
      // creator can see "new member joined" without checking the
      // DB. Coalesced into a single console line, never thrown.
      try {
        console.info(
          "[community-join]",
          detail.productTitle ?? "community product",
          "→",
          targetGroupName ?? detail.communityId,
        )
      } catch {
        /* fine */
      }
    }
    window.addEventListener("entitlement.community-granted", handler)
    return () => window.removeEventListener("entitlement.community-granted", handler)
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
      getEnrolledCount,
      resolveUniqueSlug,
      getEnrollmentProgress,
      saveCourseDraft,
      discardCourseDraft,
      publishCourseDraft,
      restoreCourseVersion,
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
      getWhiteboardsForLesson,
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
      annotateSubmission,
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
