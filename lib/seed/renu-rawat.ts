"use client"

// Comprehensive demo seed for the **renu-rawat** tenant —
// a K12 instructor running a multi-subject coaching academy.
// Populates every persistence slice with realistic data so the
// dashboard, store, portal, community, docs, and analytics are
// all immediately demo-ready.
//
// Idempotent by default: skips seeding if the tenant already has
// any LMS data. Pass { force: true } to wipe and reseed.
//
// Usage:
//   import { seedRenuRawat } from "@/lib/seed/renu-rawat"
//   seedRenuRawat()       // safe — only seeds if empty
//   seedRenuRawat({ force: true }) // wipes + reseeds
//
// All writes go to tenant-scoped localStorage keys following the
// existing pattern: `thebigclass.t.renu-rawat.<store>.<slice>.v1`.
// The tenant itself is registered in the global tenants list at
// `thebigclass.platform.tenants.v1`. Re-renders happen on next
// page load — the caller usually does `window.location.reload()`
// after a successful seed.

const TENANT_SLUG = "renu-rawat"
const TENANT_NAME = "Renu Rawat"
const TENANT_NAME_LONG = "Renu Rawat · K12 Coaching Academy"
const OWNER_EMAIL = "renu@renu-rawat.com"
const OWNER_PHONE = "+91 98101 12233"

// ─── tiny utilities ─────────────────────────────────────────────

const k = (slice: string) => `thebigclass.t.${TENANT_SLUG}.${slice}.v1`
const id = (prefix: string, n?: number) =>
  `${prefix}-${n != null ? n.toString().padStart(3, "0") : Math.random().toString(36).slice(2, 8)}`
const iso = (daysOffset = 0, hour = 12) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
const nowIso = () => new Date().toISOString()

// Safe localStorage write. Swallows quota errors so a single
// oversized slice can't break the entire seed run.
function writeKey(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`[seed] failed to write ${key}:`, err)
  }
}

function readKey<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

// ─── Tenant registration ────────────────────────────────────────

const TENANTS_KEY = "thebigclass.platform.tenants.v1"

function ensureTenantRegistered(): void {
  const existing = readKey<Array<{ slug: string }>>(TENANTS_KEY) ?? []
  if (existing.some((t) => t.slug === TENANT_SLUG)) return
  const tenant = {
    id: id("tenant"),
    slug: TENANT_SLUG,
    name: TENANT_NAME_LONG,
    plan: "starter",
    status: "active",
    ownerEmail: OWNER_EMAIL,
    ownerName: TENANT_NAME,
    ownerPhone: OWNER_PHONE,
    country: "IN",
    useCase: "school",
    branding: {
      primaryColor: "#7c3aed",
      accentColor: "#f59e0b",
    },
    emailVerifiedAt: nowIso(),
    createdAt: iso(-90),
  }
  writeKey(TENANTS_KEY, [...existing, tenant])
}

// ─── People — instructor + admins + 25 students ────────────────

const STUDENT_NAMES: Array<{ name: string; gender?: "male" | "female" }> = [
  { name: "Aarav Sharma", gender: "male" },
  { name: "Aanya Verma", gender: "female" },
  { name: "Vihaan Gupta", gender: "male" },
  { name: "Diya Singh", gender: "female" },
  { name: "Arjun Patel", gender: "male" },
  { name: "Ishita Reddy", gender: "female" },
  { name: "Reyansh Iyer", gender: "male" },
  { name: "Saanvi Nair", gender: "female" },
  { name: "Krishna Joshi", gender: "male" },
  { name: "Myra Mehta", gender: "female" },
  { name: "Aditya Rao", gender: "male" },
  { name: "Anika Pillai", gender: "female" },
  { name: "Kabir Banerjee", gender: "male" },
  { name: "Pari Chatterjee", gender: "female" },
  { name: "Shaurya Malhotra", gender: "male" },
  { name: "Navya Kapoor", gender: "female" },
  { name: "Vedant Bhatt", gender: "male" },
  { name: "Riya Khanna", gender: "female" },
  { name: "Atharv Desai", gender: "male" },
  { name: "Aadhya Menon", gender: "female" },
  { name: "Ishaan Trivedi", gender: "male" },
  { name: "Tara Mishra", gender: "female" },
  { name: "Yuvraj Saxena", gender: "male" },
  { name: "Avni Goswami", gender: "female" },
  { name: "Dev Chauhan", gender: "male" },
]

const SCHOOLS = [
  "DPS Indirapuram", "Amity International", "DAV Public", "Springdales", "Lotus Valley",
  "Sanskar Vidyalaya", "Vasant Valley", "Step by Step", "Mother's International", "St. Xavier's",
]

const CLASS_OPTIONS: Array<{ class: "6" | "7" | "8" | "9" | "10"; age: number }> = [
  { class: "6", age: 11 }, { class: "7", age: 12 }, { class: "8", age: 13 },
  { class: "9", age: 14 }, { class: "10", age: 15 },
]

interface SeedUser {
  id: string
  name: string
  email: string
  avatar?: string
  role: "admin" | "instructor" | "student"
  bio?: string
  about?: string
  phone?: string
  age?: number
  gender?: "male" | "female"
  school?: string
  schoolBoard?: string
  notificationChannels?: { email?: boolean; inApp?: boolean; whatsapp?: boolean }
  createdAt: string
  lastLoginAt?: string
}

function buildUsers(): { all: SeedUser[]; renu: SeedUser; students: SeedUser[]; admin: SeedUser } {
  const renu: SeedUser = {
    id: "u-renu",
    name: "Renu Rawat",
    email: OWNER_EMAIL,
    avatar: "/people/teacher-1.jpg",
    role: "instructor",
    phone: OWNER_PHONE,
    bio: "K12 educator · 14 years teaching Maths & Science · CBSE + ICSE",
    about:
      "I teach Class 6–10 students from across India in small batches. My approach is the opposite of rote — every concept starts with a real-world hook, every doubt gets a one-on-one explanation. Parents tell me what makes their kids actually enjoy class is the live whiteboard sessions where we work through problems together.",
    notificationChannels: { email: true, inApp: true, whatsapp: true },
    createdAt: iso(-90),
    lastLoginAt: iso(0, 9),
  }
  const admin: SeedUser = {
    id: "u-admin-asha",
    name: "Asha Mehrotra",
    email: "asha@renu-rawat.com",
    role: "admin",
    phone: "+91 98101 88899",
    bio: "Operations · runs the back office",
    notificationChannels: { email: true, inApp: true },
    createdAt: iso(-85),
    lastLoginAt: iso(-1, 14),
  }
  const coTeacher: SeedUser = {
    id: "u-co-vikram",
    name: "Vikram Singh",
    email: "vikram@renu-rawat.com",
    avatar: "/people/teacher-2.jpg",
    role: "instructor",
    phone: "+91 98101 55677",
    bio: "Science teacher · IIT Delhi alum · loves explaining the impossible",
    about:
      "I take the Physics + Chemistry threads in Class 9–10. My students like that I show why before what.",
    notificationChannels: { email: true, inApp: true },
    createdAt: iso(-80),
    lastLoginAt: iso(0, 11),
  }
  const students: SeedUser[] = STUDENT_NAMES.map((s, i) => {
    const cls = CLASS_OPTIONS[i % CLASS_OPTIONS.length]
    const handle = s.name.toLowerCase().replace(/\s+/g, ".")
    return {
      id: `u-stud-${i.toString().padStart(2, "0")}`,
      name: s.name,
      email: `${handle}@school.local`,
      role: "student",
      phone: `+91 9${(8000000000 + i * 113711).toString().slice(0, 9)}`,
      age: cls.age,
      gender: s.gender,
      school: SCHOOLS[i % SCHOOLS.length],
      schoolBoard: i % 3 === 0 ? "ICSE" : "CBSE",
      bio: `Class ${cls.class} · ${SCHOOLS[i % SCHOOLS.length]}`,
      notificationChannels: { email: true, inApp: true, whatsapp: i % 2 === 0 },
      createdAt: iso(-Math.floor(60 - i * 1.5)),
      lastLoginAt: iso(-Math.floor(Math.random() * 5), 10 + (i % 8)),
    }
  })
  return {
    renu,
    admin,
    students,
    all: [renu, admin, coTeacher, ...students],
  }
}

// ─── Courses + modules + lessons ───────────────────────────────

interface SeedLesson {
  id: string
  title: string
  description?: string
  content?: string
  estimatedMinutes?: number
  videoUrl?: string
  isUnlocked?: boolean
}
interface SeedModule {
  id: string
  title: string
  description?: string
  lessons: SeedLesson[]
}
interface SeedCourse {
  id: string
  title: string
  subtitle?: string
  description: string
  categoryId?: string
  instructorIds: string[]
  thumbnail?: string
  visibility: "public" | "private" | "unlisted" | "password"
  modules: SeedModule[]
  totalLessons: number
  totalDuration: number
  enrollmentCount: number
  status: "draft" | "published" | "archived"
  publishedAt?: string
  createdAt: string
  updatedAt: string
  level?: "Beginner" | "Intermediate" | "Advanced"
  language?: string
  rating?: number
  ratingCount?: number
  pricing?: { type: "paid" | "free"; amount?: number; currency?: string }
  defaultBatchId?: string
  slug?: string
  outcomes?: string[]
  features?: string[]
}

function makeLesson(slug: string, title: string, mins: number, body: string): SeedLesson {
  return {
    id: `les-${slug}`,
    title,
    description: body,
    content: `<h2>${title}</h2><p>${body}</p><p>Worked example: pick up one problem at a time, write each step, never skip ahead. Doubts in the chat get answered live.</p>`,
    estimatedMinutes: mins,
    isUnlocked: true,
  }
}

function buildCourses(renuId: string, vikramId: string): SeedCourse[] {
  const c1: SeedCourse = {
    id: "course-math-class9",
    slug: "class-9-maths-foundation",
    title: "Class 9 Mathematics — CBSE Foundation",
    subtitle: "Build the rock-solid algebra and geometry base you'll lean on for Class 10 + competitive exams",
    description:
      "<p>This is the full CBSE Class 9 Maths curriculum, taught the way I wish someone had taught me — every chapter starts with where it shows up in real life, then we build the maths up from first principles. Includes solved past-paper questions, weekly live doubt sessions, and a downloadable formula handbook.</p>",
    categoryId: "cat-math",
    instructorIds: [renuId],
    thumbnail: "/features/courses.jpg",
    visibility: "public",
    level: "Intermediate",
    language: "English",
    rating: 4.8,
    ratingCount: 47,
    pricing: { type: "paid", amount: 4999, currency: "INR" },
    enrollmentCount: 18,
    status: "published",
    publishedAt: iso(-60),
    createdAt: iso(-75),
    updatedAt: iso(-3),
    defaultBatchId: "grp-class9-batch-3",
    outcomes: [
      "Master every Class 9 Maths chapter in the CBSE syllabus",
      "Solve 90%+ of the textbook + RD Sharma exercises confidently",
      "Build the algebraic intuition you'll need in Class 10 + JEE prep",
      "Get unstuck on word problems via weekly live doubt sessions",
    ],
    features: [
      "12 hours of recorded lessons", "Weekly live doubt classes (every Saturday 5 PM IST)",
      "Downloadable formula handbook (PDF)", "Chapter-wise quizzes with explanations",
    ],
    modules: [
      {
        id: "mod-c9-num", title: "Number Systems",
        lessons: [
          makeLesson("c9-num-1", "Rational vs irrational numbers", 32, "Where each kind shows up and the trick to identifying them at a glance."),
          makeLesson("c9-num-2", "Real numbers on the number line", 28, "Visualising √2, √3 geometrically — the spiral construction."),
          makeLesson("c9-num-3", "Exponent rules + simplification drill", 25, "Five rules, twenty examples, one cheat sheet."),
        ],
      },
      {
        id: "mod-c9-poly", title: "Polynomials",
        lessons: [
          makeLesson("c9-poly-1", "Degree, terms, and the zero of a polynomial", 30, "What 'zero' means geometrically vs algebraically."),
          makeLesson("c9-poly-2", "Remainder + factor theorem", 35, "When and why these shortcuts work."),
          makeLesson("c9-poly-3", "Algebraic identities — the 6 you can't live without", 40, "From (a+b)² all the way to (a+b+c)² — derived, not memorised."),
        ],
      },
      {
        id: "mod-c9-geo", title: "Geometry — Lines, Triangles, Circles",
        lessons: [
          makeLesson("c9-geo-1", "Lines + angles — the theorems that come back every year", 38, "Pair of angles, parallel lines, transversal proofs."),
          makeLesson("c9-geo-2", "Triangles — congruency criteria", 42, "SSS / SAS / ASA / RHS — when to reach for which."),
          makeLesson("c9-geo-3", "Circle theorems set 1 — equal chords, perpendiculars", 36, "Six theorems, one beautiful diagram each."),
          makeLesson("c9-geo-4", "Constructions — bisectors, tangents, polygons", 28, "Step-by-step on the whiteboard."),
        ],
      },
      {
        id: "mod-c9-stat", title: "Statistics & Probability",
        lessons: [
          makeLesson("c9-stat-1", "Mean, median, mode — when each is the right one", 26, "Real datasets where the wrong choice misleads."),
          makeLesson("c9-stat-2", "Frequency distributions + cumulative frequency", 30, "Reading + building the table."),
          makeLesson("c9-stat-3", "Intro to probability — the experiment view", 24, "Why we count outcomes, not events."),
        ],
      },
    ],
    totalLessons: 13,
    totalDuration: 414,
  }
  const c2: SeedCourse = {
    id: "course-sci-class8",
    slug: "class-8-science-cbse",
    title: "Class 8 Science — Concepts that Stick",
    subtitle: "Physics, Chemistry, Biology — taught with experiments you can actually do at home",
    description:
      "<p>The Class 8 CBSE Science syllabus, taught the way the chapters were meant to be — through experiments. Every concept lands with a do-it-at-home demonstration so the kid doesn't just memorise; they see it happen.</p>",
    categoryId: "cat-science",
    instructorIds: [vikramId, renuId],
    thumbnail: "/features/quizzes.jpg",
    visibility: "public",
    level: "Beginner",
    language: "English",
    rating: 4.9,
    ratingCount: 32,
    pricing: { type: "paid", amount: 3999, currency: "INR" },
    enrollmentCount: 14,
    status: "published",
    publishedAt: iso(-45),
    createdAt: iso(-60),
    updatedAt: iso(-2),
    defaultBatchId: "grp-class8-batch-2",
    outcomes: [
      "Cover every Class 8 Science chapter with worked examples",
      "Run 25+ home experiments with a parent-approved safety guide",
      "Build curiosity that survives into Class 9 + 10",
    ],
    features: [
      "30 lesson videos + experiment guides", "Live Saturday demo class (alternating physics/chemistry)",
      "Printable practical worksheet pack", "Doubts inbox + WhatsApp support",
    ],
    modules: [
      {
        id: "mod-c8-phys", title: "Physics — Force, Friction, Sound",
        lessons: [
          makeLesson("c8-phys-1", "Force — push, pull, and effects of force", 28, "Real demos with water bottles + rubber bands."),
          makeLesson("c8-phys-2", "Friction — friend or enemy?", 32, "Sketch + experiment of why we want it (and why we don't)."),
          makeLesson("c8-phys-3", "Sound — vibration, pitch, amplitude", 30, "Using your phone's tone generator + glass-of-water demo."),
        ],
      },
      {
        id: "mod-c8-chem", title: "Chemistry — Materials around us",
        lessons: [
          makeLesson("c8-chem-1", "Synthetic fibres & plastics", 26, "Where they came from and what they replaced."),
          makeLesson("c8-chem-2", "Metals + non-metals — what changes when we mix them", 34, "Three home-safe experiments."),
          makeLesson("c8-chem-3", "Coal + petroleum — where energy actually comes from", 28, "Why this matters for your generation specifically."),
        ],
      },
      {
        id: "mod-c8-bio", title: "Biology — Life processes",
        lessons: [
          makeLesson("c8-bio-1", "Crop production — from seed to harvest", 30, "Walked through with photographs from a friend's farm."),
          makeLesson("c8-bio-2", "Microorganisms — friends + foes", 28, "Yogurt experiment + germ-tracking demonstration."),
          makeLesson("c8-bio-3", "Reproduction in animals — at a Class 8 level", 32, "Clean, factual, age-appropriate."),
          makeLesson("c8-bio-4", "Reaching adolescence — the science of puberty", 35, "Honest, kind, never embarrassing. Parent-friendly."),
        ],
      },
    ],
    totalLessons: 10,
    totalDuration: 303,
  }
  const c3: SeedCourse = {
    id: "course-eng-grammar",
    slug: "english-grammar-rebooted",
    title: "English Grammar Rebooted (Class 6–8)",
    subtitle: "20 grammar rules that catch 90% of the errors in school essays",
    description:
      "<p>Most kids learn grammar as a list of rules they forget by Monday. This course flips it — we start from the 20 most common mistakes in school essays and reverse-engineer the rules from there.</p>",
    categoryId: "cat-english",
    instructorIds: [renuId],
    thumbnail: "/features/whiteboard.jpg",
    visibility: "public",
    level: "Beginner",
    language: "English",
    rating: 4.7,
    ratingCount: 19,
    pricing: { type: "paid", amount: 1999, currency: "INR" },
    enrollmentCount: 22,
    status: "published",
    publishedAt: iso(-30),
    createdAt: iso(-40),
    updatedAt: iso(-1),
    outcomes: [
      "Catch and fix the 20 most common essay mistakes",
      "Use commas, semicolons, and apostrophes the way published writers do",
      "Build a habit of editing your own writing before submitting",
    ],
    features: [
      "20 short lessons (under 15 mins each)", "Editing drills with before/after answer keys",
      "Saturday Q&A session with Renu", "Free 'Common Mistakes' PDF",
    ],
    modules: [
      {
        id: "mod-eng-fund", title: "The 5 building blocks",
        lessons: [
          makeLesson("eng-fund-1", "Sentence vs fragment — the simplest test", 12, "If it can stand alone with a period, it's a sentence."),
          makeLesson("eng-fund-2", "Subject-verb agreement, the way it usually breaks", 14, "Five real classroom examples."),
          makeLesson("eng-fund-3", "Tense — past / present / future / perfect", 18, "Why 'have done' isn't the same as 'did'."),
        ],
      },
      {
        id: "mod-eng-mistakes", title: "Top 10 mistakes (with fixes)",
        lessons: [
          makeLesson("eng-mist-1", "Comma splices and run-ons", 13, "Why two sentences need a period, not a comma."),
          makeLesson("eng-mist-2", "Its vs it's, your vs you're, their vs there", 11, "The five-second trick that works every time."),
          makeLesson("eng-mist-3", "Apostrophes — possession vs contraction", 12, "A diagram you can pin above your desk."),
          makeLesson("eng-mist-4", "Active vs passive voice — when to switch", 15, "Why your essays sound dull when you don't choose."),
        ],
      },
    ],
    totalLessons: 7,
    totalDuration: 95,
  }
  const c4: SeedCourse = {
    id: "course-jee-foundation",
    slug: "class-10-math-jee-foundation",
    title: "Class 10 Maths + JEE Foundation Bridge",
    subtitle: "Crack Class 10 board topics and lay the JEE base in one course",
    description:
      "<p>If you're heading toward JEE / NEET in two years, Class 10 is where your foundation either holds or cracks. This course covers every CBSE Class 10 chapter to mastery, then bridges into the JEE Foundation way of thinking — function notation, problem-solving frameworks, time management on tricky questions.</p>",
    categoryId: "cat-math",
    instructorIds: [renuId, vikramId],
    thumbnail: "/features/courses.jpg",
    visibility: "public",
    level: "Advanced",
    language: "English",
    rating: 4.9,
    ratingCount: 28,
    pricing: { type: "paid", amount: 8999, currency: "INR" },
    enrollmentCount: 11,
    status: "published",
    publishedAt: iso(-20),
    createdAt: iso(-30),
    updatedAt: iso(-1),
    defaultBatchId: "grp-class10-batch-1",
    outcomes: [
      "Score 90%+ in CBSE Class 10 Maths boards",
      "Get the JEE Foundation way of thinking 1 year earlier than peers",
      "Build a problem-solving framework you'll lean on for 4+ years",
    ],
    features: [
      "20+ hours of recorded content", "3x weekly live problem-solving sessions",
      "Mock test pack — 8 full-length papers with answer keys",
      "1-on-1 doubt resolution within 24 hours",
    ],
    modules: [
      {
        id: "mod-c10-arith", title: "Arithmetic Progressions",
        lessons: [
          makeLesson("c10-ap-1", "What's an AP, what's not", 24, "The pattern check that takes 5 seconds."),
          makeLesson("c10-ap-2", "nth term + sum formulae — both derivations", 32, "Why memorising without derivation hurts on tricky problems."),
          makeLesson("c10-ap-3", "Real-world AP problems (loan EMIs, stadium seats)", 28, "Where the formulas actually appear."),
        ],
      },
      {
        id: "mod-c10-trig", title: "Trigonometry — boards + foundation",
        lessons: [
          makeLesson("c10-trig-1", "All 6 ratios from one triangle", 30, "Why we have 6, not just 3."),
          makeLesson("c10-trig-2", "The 4 critical identities", 28, "sin²+cos², 1+tan², 1+cot² — derived, then drilled."),
          makeLesson("c10-trig-3", "Heights and distances — the angle trick", 25, "Building up to the boards question type."),
        ],
      },
      {
        id: "mod-c10-coord", title: "Coordinate Geometry",
        lessons: [
          makeLesson("c10-cg-1", "Distance + section formulae", 22, "Both proved on the whiteboard."),
          makeLesson("c10-cg-2", "Area of triangle from 3 points", 18, "The shoelace trick — board-allowed and faster."),
        ],
      },
      {
        id: "mod-c10-bridge", title: "JEE Foundation bridge",
        lessons: [
          makeLesson("c10-jee-1", "Function notation — what 'f(x)' really means", 30, "Half of JEE feels alien because nobody explains this."),
          makeLesson("c10-jee-2", "Sets + relations — vocabulary you'll use forever", 28, "Pre-Class-11 vocabulary, done now."),
        ],
      },
    ],
    totalLessons: 10,
    totalDuration: 265,
  }
  const c5: SeedCourse = {
    id: "course-fdn-class6",
    slug: "class-6-foundation-builder",
    title: "Class 6 Foundation Builder — Maths & Science",
    subtitle: "Catch up + get ahead before your Class 7 syllabus lands",
    description:
      "<p>The summer-vacation course for Class 6 students stepping into Class 7. Covers the high-yield concepts that recur in Class 7-8 syllabi — integers, fractions, basic algebra, light + sound — at a relaxed pace.</p>",
    categoryId: "cat-math",
    instructorIds: [renuId],
    thumbnail: "/features/community.jpg",
    visibility: "public",
    level: "Beginner",
    language: "English",
    rating: 4.6,
    ratingCount: 12,
    pricing: { type: "paid", amount: 2499, currency: "INR" },
    enrollmentCount: 9,
    status: "published",
    publishedAt: iso(-12),
    createdAt: iso(-18),
    updatedAt: iso(-1),
    defaultBatchId: "grp-class6-batch-1",
    outcomes: [
      "Walk into Class 7 already confident with integers + algebra basics",
      "Hold your own when the chapter on simple equations lands",
      "Build a 'I can figure this out' attitude that lasts",
    ],
    features: [
      "12 short lessons (10–15 min each)", "Friendly weekend live class",
      "Printable practice worksheets", "Parent-progress weekly update",
    ],
    modules: [
      {
        id: "mod-c6-int", title: "Integers + Operations",
        lessons: [
          makeLesson("c6-int-1", "Negative numbers — why they exist", 12, "Temperature, debt, sea level — three intuitions that stick."),
          makeLesson("c6-int-2", "Addition + subtraction on the number line", 13, "Visual first, rules later."),
          makeLesson("c6-int-3", "Multiplication + division — the sign rules", 14, "Drilled with mini-problems."),
        ],
      },
      {
        id: "mod-c6-frac", title: "Fractions + Decimals",
        lessons: [
          makeLesson("c6-frac-1", "Equivalent fractions — the visual proof", 12, "Pizza-slice intuition."),
          makeLesson("c6-frac-2", "Comparing + ordering — three ways", 15, "Pick the easiest for the situation."),
        ],
      },
      {
        id: "mod-c6-light", title: "Light + Shadows",
        lessons: [
          makeLesson("c6-light-1", "Why we see things at all", 14, "The light-bounces-into-eye explanation."),
          makeLesson("c6-light-2", "Shadows — why they're sharp or fuzzy", 13, "Phone-torch experiment included."),
        ],
      },
    ],
    totalLessons: 7,
    totalDuration: 93,
  }
  return [c1, c2, c3, c4, c5]
}

// ─── Enrollments — distribute students across courses ──────────

interface SeedEnrollment {
  id: string
  courseId: string
  userId: string
  status: "active" | "completed" | "paused" | "dropped"
  progress: number  // 0..100
  enrolledAt: string
  completedAt?: string
  lastViewedAt?: string
  certificateIssued?: boolean
}

function buildEnrollments(students: SeedUser[], courses: SeedCourse[]): SeedEnrollment[] {
  const out: SeedEnrollment[] = []
  students.forEach((s, i) => {
    // Distribute by index across courses (no random for determinism)
    const targetCourseIds = [
      courses[i % courses.length].id,
      courses[(i + 1) % courses.length].id,
    ]
    if (i % 3 === 0) targetCourseIds.push(courses[(i + 2) % courses.length].id)
    targetCourseIds.forEach((courseId, j) => {
      const progress = Math.min(100, Math.max(5, 10 + ((i * 7 + j * 23) % 90)))
      out.push({
        id: id(`enr-${i}-${j}`),
        courseId,
        userId: s.id,
        status: progress >= 100 ? "completed" : "active",
        progress,
        enrolledAt: iso(-Math.floor(40 - i)),
        lastViewedAt: iso(-Math.floor(Math.random() * 7)),
        certificateIssued: progress >= 100,
      })
    })
  })
  return out
}

// ─── Quizzes + attempts ────────────────────────────────────────

interface SeedQuiz {
  id: string
  title: string
  description: string
  courseId: string
  moduleId?: string
  questions: Array<{
    id: string
    question: string
    type: "multiple-choice" | "true-false" | "short-answer" | "long-answer"
    options?: string[]
    correctAnswer?: number | string
    points: number
  }>
  timeLimit?: number
  passingScore: number
  maxAttempts: number
  shuffleQuestions: boolean
  showAnswers: boolean
  gradingMode: "auto" | "teacher"
  createdAt: string
  createdBy?: string
}

function buildQuizzes(renuId: string): SeedQuiz[] {
  return [
    {
      id: "quiz-c9-num", title: "Number Systems — Quick Check",
      description: "5-minute check after the Class 9 Number Systems module.",
      courseId: "course-math-class9", moduleId: "mod-c9-num",
      questions: [
        { id: "q1", question: "Which of these is irrational?", type: "multiple-choice", options: ["1.414", "√2", "22/7", "0.333…"], correctAnswer: 1, points: 1 },
        { id: "q2", question: "Every rational number can be written as a terminating or repeating decimal.", type: "true-false", options: ["True", "False"], correctAnswer: 0, points: 1 },
        { id: "q3", question: "Simplify: 2^3 × 2^4", type: "multiple-choice", options: ["2^7", "2^12", "4^7", "8"], correctAnswer: 0, points: 1 },
        { id: "q4", question: "In your own words: why is √2 considered irrational?", type: "short-answer", correctAnswer: "", points: 2 },
      ],
      timeLimit: 5, passingScore: 60, maxAttempts: 3, shuffleQuestions: false, showAnswers: true,
      gradingMode: "auto", createdAt: iso(-30), createdBy: renuId,
    },
    {
      id: "quiz-c9-poly", title: "Polynomials Drill",
      description: "10 problems covering the 6 identities + remainder theorem.",
      courseId: "course-math-class9", moduleId: "mod-c9-poly",
      questions: [
        { id: "q1", question: "(a+b)² equals?", type: "multiple-choice", options: ["a² + b²", "a² + 2ab + b²", "a² − 2ab + b²", "2a + 2b"], correctAnswer: 1, points: 1 },
        { id: "q2", question: "If p(x) = x² − 4, then p(2) =", type: "multiple-choice", options: ["0", "4", "8", "−4"], correctAnswer: 0, points: 1 },
        { id: "q3", question: "The factor theorem says: x − a is a factor iff p(a) = ?", type: "short-answer", correctAnswer: "0", points: 2 },
      ],
      timeLimit: 12, passingScore: 70, maxAttempts: 2, shuffleQuestions: true, showAnswers: true,
      gradingMode: "auto", createdAt: iso(-22), createdBy: renuId,
    },
    {
      id: "quiz-c8-phys", title: "Force & Friction Concept Check",
      description: "Class 8 Physics — quick recall.",
      courseId: "course-sci-class8", moduleId: "mod-c8-phys",
      questions: [
        { id: "q1", question: "Friction always acts ___ to the direction of motion.", type: "multiple-choice", options: ["parallel", "opposite", "perpendicular", "random"], correctAnswer: 1, points: 1 },
        { id: "q2", question: "Sliding friction is greater than rolling friction.", type: "true-false", options: ["True", "False"], correctAnswer: 0, points: 1 },
        { id: "q3", question: "Give one real-life example where friction is helpful.", type: "short-answer", correctAnswer: "", points: 2 },
      ],
      timeLimit: 8, passingScore: 60, maxAttempts: 3, shuffleQuestions: false, showAnswers: true,
      gradingMode: "auto", createdAt: iso(-15), createdBy: renuId,
    },
    {
      id: "quiz-eng-common", title: "Top 10 Common Mistakes — Spot the Error",
      description: "Read each sentence; spot the mistake; type the fix.",
      courseId: "course-eng-grammar",
      questions: [
        { id: "q1", question: "Which is correct: 'Its raining' or 'It's raining'?", type: "multiple-choice", options: ["Its raining", "It's raining"], correctAnswer: 1, points: 1 },
        { id: "q2", question: "Find the error: 'Their going to the park.'", type: "short-answer", correctAnswer: "they're", points: 2 },
        { id: "q3", question: "Subject-verb agreement: 'The team ___ winning.' (is / are)", type: "multiple-choice", options: ["is", "are"], correctAnswer: 0, points: 1 },
      ],
      timeLimit: 10, passingScore: 70, maxAttempts: 5, shuffleQuestions: true, showAnswers: true,
      gradingMode: "auto", createdAt: iso(-10), createdBy: renuId,
    },
    {
      id: "quiz-c10-trig", title: "Trigonometry Mock — 30 min",
      description: "Class 10 boards-style — 12 questions, ramping difficulty.",
      courseId: "course-jee-foundation", moduleId: "mod-c10-trig",
      questions: [
        { id: "q1", question: "sin 30° equals?", type: "multiple-choice", options: ["1/2", "√3/2", "1", "1/√2"], correctAnswer: 0, points: 1 },
        { id: "q2", question: "sin²θ + cos²θ = ?", type: "short-answer", correctAnswer: "1", points: 1 },
        { id: "q3", question: "If sin θ = 3/5, what is cos θ (assume acute)?", type: "multiple-choice", options: ["3/5", "4/5", "5/3", "5/4"], correctAnswer: 1, points: 2 },
      ],
      timeLimit: 30, passingScore: 70, maxAttempts: 2, shuffleQuestions: true, showAnswers: false,
      gradingMode: "auto", createdAt: iso(-8), createdBy: renuId,
    },
    {
      id: "quiz-c6-int", title: "Integers — Friendly Self-Check",
      description: "No timer, no pressure — just make sure the basics are solid.",
      courseId: "course-fdn-class6", moduleId: "mod-c6-int",
      questions: [
        { id: "q1", question: "(−3) + (+5) = ?", type: "multiple-choice", options: ["−8", "−2", "+2", "+8"], correctAnswer: 2, points: 1 },
        { id: "q2", question: "(−4) × (−3) = ?", type: "multiple-choice", options: ["−12", "+12", "−7", "+7"], correctAnswer: 1, points: 1 },
        { id: "q3", question: "True or false: zero is neither positive nor negative.", type: "true-false", options: ["True", "False"], correctAnswer: 0, points: 1 },
      ],
      passingScore: 50, maxAttempts: 5, shuffleQuestions: false, showAnswers: true,
      gradingMode: "auto", createdAt: iso(-6), createdBy: renuId,
    },
  ]
}

interface SeedQuizAttempt {
  id: string
  quizId: string
  userId: string
  answers: Array<{ questionId: string; value: number | string }>
  score: number
  passed: boolean
  status: "graded" | "pending-review"
  startedAt: string
  submittedAt: string
}

function buildQuizAttempts(students: SeedUser[], quizzes: SeedQuiz[]): SeedQuizAttempt[] {
  const out: SeedQuizAttempt[] = []
  quizzes.forEach((q, qi) => {
    // Pick ~8 students per quiz, score deterministically
    students.slice(qi * 3, qi * 3 + 8).forEach((s, si) => {
      const total = q.questions.reduce((a, x) => a + x.points, 0)
      const earned = Math.min(total, Math.round(total * (0.45 + ((qi * 7 + si * 11) % 50) / 100)))
      const score = Math.round((earned / total) * 100)
      out.push({
        id: id(`att-${qi}-${si}`),
        quizId: q.id,
        userId: s.id,
        answers: q.questions.map((qq) => ({ questionId: qq.id, value: qq.correctAnswer ?? "" })),
        score,
        passed: score >= q.passingScore,
        status: q.questions.some((qq) => qq.type === "short-answer" || qq.type === "long-answer")
          ? (si === 0 ? "pending-review" : "graded")
          : "graded",
        startedAt: iso(-Math.floor(qi * 3 + si), 11),
        submittedAt: iso(-Math.floor(qi * 3 + si), 12),
      })
    })
  })
  return out
}

// ─── Student groups / batches / cohorts ────────────────────────

interface SeedGroup {
  id: string
  name: string
  description?: string
  courseId?: string
  memberIds: string[]
  visibility?: "open" | "closed" | "invite-link" | "tag-gated"
  createdBy?: string
  startsAt?: string
  endsAt?: string
  createdAt: string
  updatedAt: string
}

function buildGroups(students: SeedUser[], renuId: string): SeedGroup[] {
  return [
    {
      id: "grp-class6-batch-1",
      name: "Class 6 · Foundation Batch (Summer 2026)",
      description: "Small-batch foundation builders for Class 6 students stepping into Class 7.",
      courseId: "course-fdn-class6",
      memberIds: students.filter((_, i) => i % 5 === 0).map((s) => s.id),
      visibility: "closed",
      createdBy: renuId,
      startsAt: iso(-12), endsAt: iso(40),
      createdAt: iso(-15), updatedAt: iso(-1),
    },
    {
      id: "grp-class8-batch-2",
      name: "Class 8 · Science Batch B",
      description: "Weekly live Science class + doubts forum.",
      courseId: "course-sci-class8",
      memberIds: students.filter((_, i) => i % 4 === 0).map((s) => s.id),
      visibility: "closed",
      createdBy: renuId,
      startsAt: iso(-45), endsAt: iso(120),
      createdAt: iso(-50), updatedAt: iso(0),
    },
    {
      id: "grp-class9-batch-3",
      name: "Class 9 · Maths Cohort C",
      description: "The full CBSE Class 9 Maths cohort. Weekly doubt class on Saturdays.",
      courseId: "course-math-class9",
      memberIds: students.filter((_, i) => i % 3 === 0).map((s) => s.id),
      visibility: "closed",
      createdBy: renuId,
      startsAt: iso(-60), endsAt: iso(180),
      createdAt: iso(-75), updatedAt: iso(-1),
    },
    {
      id: "grp-class10-batch-1",
      name: "Class 10 · Boards + JEE Foundation",
      description: "The high-intensity batch — 3 live classes a week, 1:1 doubt support.",
      courseId: "course-jee-foundation",
      memberIds: students.filter((_, i) => i % 2 === 0).slice(0, 8).map((s) => s.id),
      visibility: "closed",
      createdBy: renuId,
      startsAt: iso(-20), endsAt: iso(220),
      createdAt: iso(-30), updatedAt: iso(0),
    },
  ]
}

// ─── Batch posts (community feed) ──────────────────────────────

interface SeedBatchPost {
  id: string
  batchId: string
  authorId: string
  type?: "announcement" | "question" | "win" | "discussion"
  body: string
  pinned: boolean
  hidden: boolean
  reactions?: Record<string, string[]>
  comments: Array<{ id: string; authorId: string; body: string; createdAt: string }>
  createdAt: string
  updatedAt: string
}

function buildBatchPosts(groups: SeedGroup[], students: SeedUser[], renuId: string): SeedBatchPost[] {
  const out: SeedBatchPost[] = []
  const samples = [
    { type: "announcement" as const, pinned: true, body: "<p><strong>Saturday class moved to 5 PM IST</strong> this week — power cut at my building. Join from <a href='#'>the usual room</a>. Recording will be posted Sunday morning as always.</p>" },
    { type: "win" as const, pinned: false, body: "<p>🎉 Big win — Aanya cleared the school olympiad pre-selection with a top-decile score. Keep showing up to the live classes, this is what consistency looks like.</p>" },
    { type: "discussion" as const, pinned: false, body: "<p>Quick poll — for the next live class, do you want to (a) revisit polynomials or (b) start triangles? Comment with A or B.</p>" },
    { type: "question" as const, pinned: false, body: "<p>If sin θ = 3/5, why is cos θ = 4/5 and not −4/5? Confused about when to keep the negative sign.</p>" },
    { type: "announcement" as const, pinned: false, body: "<p>Mock test #3 results are up. Average crossed 72% — great work. Top 3 will get a 1:1 strategy session with me this weekend.</p>" },
    { type: "discussion" as const, pinned: false, body: "<p>Sharing a really clean derivation video for the Pythagoras theorem — <a href='#'>worth 4 mins</a>. Watch before Saturday's class.</p>" },
  ]
  groups.forEach((g, gi) => {
    samples.forEach((s, si) => {
      const authorId = s.type === "question" ? students[(gi + si) % students.length].id : renuId
      out.push({
        id: `bp-${gi}-${si}`,
        batchId: g.id,
        authorId,
        type: s.type,
        body: s.body,
        pinned: s.pinned,
        hidden: false,
        reactions: si % 2 === 0 ? { "👍": students.slice(0, 5 + si).map((x) => x.id), "🎉": students.slice(0, 2 + si).map((x) => x.id) } : {},
        comments: si === 1
          ? [
              { id: `c-${gi}-${si}-1`, authorId: students[0].id, body: "Congrats Aanya!! 🎊", createdAt: iso(-Math.floor(si * 3 - 1), 14) },
              { id: `c-${gi}-${si}-2`, authorId: students[1].id, body: "Inspired — I want to be on this list next quarter.", createdAt: iso(-Math.floor(si * 3 - 1), 15) },
            ]
          : [],
        createdAt: iso(-Math.floor(si * 3 + gi * 2), 10 + si),
        updatedAt: iso(-Math.floor(si * 3 + gi * 2), 10 + si),
      })
    })
  })
  return out
}

// ─── Live sessions ─────────────────────────────────────────────

interface SeedLiveSession {
  id: string
  courseId: string
  batchId?: string
  title: string
  description?: string
  provider?: string
  scheduledAt: string
  durationMinutes?: number
  meetingUrl?: string
  recordingUrl?: string
  attendees?: string[]
  startedAt?: string
  endedAt?: string
  createdAt: string
  hostId?: string
  summary?: string
}

function buildLiveSessions(courses: SeedCourse[], students: SeedUser[], renuId: string): SeedLiveSession[] {
  return [
    {
      id: "live-001", courseId: courses[0].id, batchId: "grp-class9-batch-3",
      title: "Class 9 Maths — Polynomials Live Doubt Class",
      description: "Walked through identities + factor theorem with worked examples.",
      provider: "livekit", scheduledAt: iso(-7, 17), durationMinutes: 75,
      meetingUrl: "/p/renu-rawat/live/RWT-901", recordingUrl: "/recordings/live-001.mp4",
      attendees: students.slice(0, 12).map((s) => s.id),
      startedAt: iso(-7, 17), endedAt: iso(-7, 18),
      createdAt: iso(-10), hostId: renuId,
      summary: "Covered (a+b+c)² derivation + 6 RD Sharma exercise problems. Pending: factor-theorem worksheet.",
    },
    {
      id: "live-002", courseId: courses[1].id, batchId: "grp-class8-batch-2",
      title: "Class 8 Science — Friction Live Demo",
      description: "Live demonstration of static vs kinetic friction with table-top setup.",
      provider: "livekit", scheduledAt: iso(-3, 17), durationMinutes: 60,
      meetingUrl: "/p/renu-rawat/live/RWT-902", recordingUrl: "/recordings/live-002.mp4",
      attendees: students.slice(2, 12).map((s) => s.id),
      startedAt: iso(-3, 17), endedAt: iso(-3, 18),
      createdAt: iso(-7), hostId: renuId,
      summary: "Demoed 4 setups; Q&A on coefficient of friction. Homework: try the salt + ice experiment.",
    },
    {
      id: "live-003", courseId: courses[3].id, batchId: "grp-class10-batch-1",
      title: "Class 10 · Trigonometry Mock Walkthrough",
      description: "Solved last week's 30-min mock paper — explained the trick on Q7.",
      provider: "livekit", scheduledAt: iso(-1, 17), durationMinutes: 90,
      meetingUrl: "/p/renu-rawat/live/RWT-903", recordingUrl: "/recordings/live-003.mp4",
      attendees: students.slice(0, 8).map((s) => s.id),
      startedAt: iso(-1, 17), endedAt: iso(-1, 18, ),
      createdAt: iso(-4), hostId: renuId,
      summary: "Q7 has a sneaky absolute-value step that most students missed. Re-attempt for the next mock.",
    },
    {
      id: "live-004", courseId: courses[0].id, batchId: "grp-class9-batch-3",
      title: "Class 9 · Geometry Constructions Live",
      description: "Hands-on construction of perpendicular bisector + angle bisector.",
      provider: "livekit", scheduledAt: iso(3, 17), durationMinutes: 75,
      meetingUrl: "/p/renu-rawat/live/RWT-904",
      attendees: [],
      createdAt: iso(-2), hostId: renuId,
    },
    {
      id: "live-005", courseId: courses[1].id, batchId: "grp-class8-batch-2",
      title: "Class 8 · Microorganisms Q&A",
      description: "After-school doubt clearing for Microorganisms chapter.",
      provider: "livekit", scheduledAt: iso(5, 16), durationMinutes: 60,
      meetingUrl: "/p/renu-rawat/live/RWT-905",
      attendees: [],
      createdAt: iso(-1), hostId: renuId,
    },
    {
      id: "live-006", courseId: courses[2].id,
      title: "English Grammar Live · Comma Splices",
      description: "Editing 10 real essays together — fixing comma splices live.",
      provider: "livekit", scheduledAt: iso(7, 17), durationMinutes: 60,
      meetingUrl: "/p/renu-rawat/live/RWT-906",
      attendees: [],
      createdAt: iso(-1), hostId: renuId,
    },
  ]
}

// ─── Assignments + submissions ─────────────────────────────────

interface SeedAssignment {
  id: string
  courseId: string
  title: string
  description: string
  instructions?: string
  dueDate: string
  maxPoints: number
  status: "published" | "draft"
  createdAt: string
  updatedAt: string
}
interface SeedSubmission {
  id: string
  assignmentId: string
  userId: string
  content: string
  submittedAt: string
  grade?: number
  feedback?: string
  status: "submitted" | "graded" | "late"
}

function buildAssignments(): SeedAssignment[] {
  return [
    {
      id: "asg-c9-poly", courseId: "course-math-class9",
      title: "Polynomials — 12 problem set",
      description: "Solve all 12 problems, show every step. Due Saturday before the live class.",
      instructions: "Use the formula handbook. Don't skip steps — partial credit is given for working.",
      dueDate: iso(2, 23), maxPoints: 24, status: "published",
      createdAt: iso(-10), updatedAt: iso(-1),
    },
    {
      id: "asg-c8-friction", courseId: "course-sci-class8",
      title: "Friction — home experiment report",
      description: "Do the sliding-vs-rolling friction experiment. Write a 1-page report with photos.",
      instructions: "Include hypothesis, materials, observation, conclusion. Photos compulsory.",
      dueDate: iso(4, 23), maxPoints: 15, status: "published",
      createdAt: iso(-7), updatedAt: iso(-1),
    },
    {
      id: "asg-eng-edit", courseId: "course-eng-grammar",
      title: "Edit-your-own-essay",
      description: "Bring an essay you wrote in the last 30 days. Apply the 5 rules. Submit before and after.",
      dueDate: iso(6, 23), maxPoints: 10, status: "published",
      createdAt: iso(-4), updatedAt: iso(0),
    },
    {
      id: "asg-c10-trig", courseId: "course-jee-foundation",
      title: "Trigonometry mock paper — 8 questions",
      description: "Full-length mock. 1 hour. Submit scanned solutions.",
      dueDate: iso(-2, 23), maxPoints: 40, status: "published",
      createdAt: iso(-12), updatedAt: iso(-2),
    },
  ]
}

function buildSubmissions(assignments: SeedAssignment[], students: SeedUser[]): SeedSubmission[] {
  const out: SeedSubmission[] = []
  assignments.forEach((a, ai) => {
    students.slice(ai * 3, ai * 3 + 7).forEach((s, si) => {
      const grade = ai === 3 && si === 0 ? undefined : Math.round(a.maxPoints * (0.5 + (((ai + si) * 7) % 40) / 100))
      out.push({
        id: `sub-${ai}-${si}`,
        assignmentId: a.id,
        userId: s.id,
        content: `<p>Submission for ${a.title}.</p><p>Worked solutions attached.</p>`,
        submittedAt: iso(-Math.floor(2 + si), 22),
        grade,
        feedback: grade != null && grade > 0 ? "Solid working. Watch step 4 — write the negative explicitly." : undefined,
        status: grade != null ? "graded" : "submitted",
      })
    })
  })
  return out
}

// ─── Reviews ───────────────────────────────────────────────────

interface SeedReview {
  id: string
  courseId: string
  userId: string
  userName: string
  rating: number
  text: string
  createdAt: string
  status?: "published" | "hidden"
}

function buildReviews(students: SeedUser[]): SeedReview[] {
  const samples = [
    "Renu ma'am is genuinely the reason I started enjoying maths. The way she explains identities you actually remember them.",
    "My son's grade jumped from 68% to 86% in one term. Worth every rupee.",
    "Live classes are the best part — you can ask anything and she'll spend 10 minutes on it.",
    "Best foundation course for Class 9 — covers more than school + the worksheets are excellent.",
    "Vikram sir's physics explanations are mind-blowing. Honestly better than my school teacher.",
    "Wish I had this kind of teacher in school. Concept clarity is 10/10.",
    "Saturday doubt sessions are a lifesaver before tests.",
    "My daughter looks forward to the class now — that says it all.",
    "Math became fun again. Not even kidding.",
    "Recommended to 3 of my friends already.",
  ]
  return samples.slice(0, 9).map((text, i) => ({
    id: `rev-${i.toString().padStart(2, "0")}`,
    courseId: ["course-math-class9", "course-sci-class8", "course-eng-grammar", "course-jee-foundation", "course-fdn-class6"][i % 5],
    userId: students[i].id,
    userName: students[i].name,
    rating: i % 7 === 0 ? 4 : 5,
    text,
    createdAt: iso(-Math.floor(i * 4 + 5)),
    status: "published",
  }))
}

// ─── Doubts inbox ──────────────────────────────────────────────

interface SeedDoubt {
  id: string
  courseId?: string
  lessonId?: string
  userId?: string
  studentName: string
  studentEmail?: string
  question: string
  body?: string
  replies: Array<{ id: string; authorId: string; body: string; createdAt: string }>
  status: "open" | "answered" | "closed"
  createdAt: string
  updatedAt: string
}

function buildDoubts(students: SeedUser[], renuId: string): SeedDoubt[] {
  const qs = [
    { q: "In Q3 of the polynomials drill — how do I factorize x³ − 8?", c: "course-math-class9" },
    { q: "Why do we need rolling friction if sliding friction is the same idea?", c: "course-sci-class8" },
    { q: "What's the difference between 'I have done' and 'I did' really?", c: "course-eng-grammar" },
    { q: "Stuck on Q6 of the trig mock — getting 4/5 instead of 3/5", c: "course-jee-foundation" },
    { q: "When the integer is in brackets, why do we square the sign?", c: "course-fdn-class6" },
    { q: "Will the live recording be available after the class? Missed the last one.", c: "course-math-class9" },
  ]
  return qs.map((d, i) => ({
    id: `dbt-${i.toString().padStart(2, "0")}`,
    courseId: d.c,
    userId: students[i].id,
    studentName: students[i].name,
    studentEmail: students[i].email,
    question: d.q,
    body: `<p>${d.q}</p>`,
    replies: i < 4
      ? [
          {
            id: `r-${i}-1`,
            authorId: renuId,
            body: i === 0
              ? "Use the formula a³ − b³ = (a − b)(a² + ab + b²). Here a = x, b = 2. Try it again and send me the working."
              : "Great question — I'll cover this in Saturday's live class with a worked diagram. Drop a reminder in the cohort feed if I forget!",
            createdAt: iso(-Math.floor(i * 2)),
          },
        ]
      : [],
    status: i < 4 ? "answered" : "open",
    createdAt: iso(-Math.floor(i * 2 + 1)),
    updatedAt: iso(-Math.floor(i * 2)),
  }))
}

// ─── Whiteboards ───────────────────────────────────────────────

interface SeedWhiteboard {
  id: string
  title: string
  description?: string
  persistenceKey?: string
  visibility?: "public" | "private"
  createdBy: string
  invitedUserIds?: string[]
  createdAt: string
  updatedAt: string
}

function buildWhiteboards(renuId: string, students: SeedUser[]): SeedWhiteboard[] {
  return [
    {
      id: "wb-c9-poly", title: "Class 9 — Polynomial identities derived",
      description: "Live-class worked board: derivation of (a+b)², (a+b)³, factor theorem in one canvas.",
      persistenceKey: "tldraw:wb-c9-poly",
      visibility: "public", createdBy: renuId,
      invitedUserIds: students.slice(0, 12).map((s) => s.id),
      createdAt: iso(-7), updatedAt: iso(-6),
    },
    {
      id: "wb-c8-friction", title: "Class 8 — Friction experiment diagram",
      description: "Block-on-table FBD + experiment setup sketch.",
      persistenceKey: "tldraw:wb-c8-friction",
      visibility: "public", createdBy: renuId,
      invitedUserIds: students.slice(2, 12).map((s) => s.id),
      createdAt: iso(-3), updatedAt: iso(-3),
    },
    {
      id: "wb-c10-trig", title: "Class 10 — Trig mock walkthrough",
      description: "All 8 questions solved on the same canvas, color-coded by chapter.",
      persistenceKey: "tldraw:wb-c10-trig",
      visibility: "public", createdBy: renuId,
      invitedUserIds: students.slice(0, 8).map((s) => s.id),
      createdAt: iso(-1), updatedAt: iso(-1),
    },
    {
      id: "wb-c9-geo", title: "Class 9 — Geometry construction (perpendicular bisector)",
      description: "Step-by-step construction with compass — captured live.",
      persistenceKey: "tldraw:wb-c9-geo",
      visibility: "public", createdBy: renuId,
      invitedUserIds: students.slice(0, 12).map((s) => s.id),
      createdAt: iso(-14), updatedAt: iso(-14),
    },
  ]
}

// ─── Store products + orders + entitlements ────────────────────

interface SeedProduct {
  id: string
  kind: "course" | "download" | "bundle" | "membership" | "session" | "webinar" | "license" | "community"
  title: string
  subtitle?: string
  slug: string
  description: string
  coverImageUrl?: string
  pricing:
    | { type: "free" }
    | { type: "one-time"; amount: number; currency: string; comparePrice?: number }
    | { type: "subscription"; amount: number; currency: string; intervalDays: 30 | 90 | 180 | 365; trialDays?: number }
    | { type: "pay-what-you-want"; minAmount: number; suggestedAmount?: number; currency: string }
  delivery:
    | { kind: "course-access"; courseId: string }
    | { kind: "file-download"; files: Array<{ id: string; filename: string; url: string; sizeBytes?: number; mime?: string }> }
    | { kind: "bundle"; childProductIds: string[] }
    | { kind: "membership"; includedProductIds: string[] }
    | { kind: "session"; durationMinutes: number; bookingUrl?: string }
    | { kind: "webinar"; meetingUrl?: string; scheduledAt?: string }
    | { kind: "license"; keyPool?: string[]; keyTemplate?: string }
    | { kind: "community"; linkedCommunityId: string; welcomeMessage?: string; includedProductIds?: string[] }
  features?: string[]
  outcomes?: string[]
  tags?: string[]
  status: "draft" | "published" | "archived"
  publishedAt?: string
  inventoryLimit?: number
  inventorySold: number
  refundPolicy?: string
  createdAt: string
  updatedAt: string
}

function buildProducts(): SeedProduct[] {
  return [
    {
      id: "prod-c9-math", kind: "course",
      title: "Class 9 Maths — CBSE Foundation",
      subtitle: "12 hours of recorded lessons + weekly live doubt class",
      slug: "class-9-maths-foundation",
      description: "<p>The full CBSE Class 9 Maths curriculum. Recorded lessons + weekly live doubt class + chapter quizzes.</p>",
      coverImageUrl: "/features/courses.jpg",
      pricing: { type: "one-time", amount: 4999, currency: "INR", comparePrice: 6999 },
      delivery: { kind: "course-access", courseId: "course-math-class9" },
      features: ["12+ hours recorded", "Weekly live doubt class", "Formula handbook PDF", "WhatsApp doubt support"],
      outcomes: ["Master Class 9 Maths", "Strong base for Class 10 + JEE"],
      tags: ["maths", "class-9", "cbse"],
      status: "published", publishedAt: iso(-60),
      inventorySold: 18, refundPolicy: "14 days, no questions asked",
      createdAt: iso(-75), updatedAt: iso(-3),
    },
    {
      id: "prod-c8-sci", kind: "course",
      title: "Class 8 Science — Concepts that Stick",
      subtitle: "Physics, Chemistry, Biology + 25 home experiments",
      slug: "class-8-science",
      description: "<p>The Class 8 Science syllabus taught with home experiments. Includes printable practical worksheets.</p>",
      coverImageUrl: "/features/quizzes.jpg",
      pricing: { type: "one-time", amount: 3999, currency: "INR" },
      delivery: { kind: "course-access", courseId: "course-sci-class8" },
      features: ["30 lesson videos", "Weekend live demo class", "25 home experiments", "Doubts inbox"],
      tags: ["science", "class-8"],
      status: "published", publishedAt: iso(-45),
      inventorySold: 14, refundPolicy: "14-day refund",
      createdAt: iso(-60), updatedAt: iso(-2),
    },
    {
      id: "prod-jee-bundle", kind: "bundle",
      title: "Class 10 → JEE Foundation · Complete Bundle",
      subtitle: "Class 10 Maths + Science + Mock Test Pack — save ₹3,000",
      slug: "class-10-jee-bundle",
      description: "<p>Class 10 Maths + Science course access, plus the JEE Foundation mock test pack. Built for serious students aiming at JEE / NEET.</p>",
      coverImageUrl: "/features/community.jpg",
      pricing: { type: "one-time", amount: 11999, currency: "INR", comparePrice: 14997 },
      delivery: { kind: "bundle", childProductIds: ["prod-c9-math", "prod-c8-sci", "prod-mock-test"] },
      features: ["3 full courses", "8 full-length mock tests", "1:1 doubt sessions"],
      status: "published", publishedAt: iso(-20),
      inventorySold: 11, refundPolicy: "14-day refund · pro-rated",
      createdAt: iso(-30), updatedAt: iso(-1),
    },
    {
      id: "prod-membership", kind: "membership",
      title: "All-Access Membership · Annual",
      subtitle: "Every current + future course, all year — ₹12,999/yr",
      slug: "all-access-annual",
      description: "<p>Full access to every course on the academy for a year. New courses get added at no extra cost. Cancel anytime.</p>",
      coverImageUrl: "/features/storefront.jpg",
      pricing: { type: "subscription", amount: 12999, currency: "INR", intervalDays: 365, trialDays: 7 },
      delivery: { kind: "membership", includedProductIds: ["prod-c9-math", "prod-c8-sci", "prod-jee-bundle", "prod-eng-grammar"] },
      features: ["All current courses", "All future courses", "Priority doubt support", "7-day free trial"],
      tags: ["membership", "all-access"],
      status: "published", publishedAt: iso(-25),
      inventorySold: 7, refundPolicy: "7-day trial; no refund after first charge",
      createdAt: iso(-35), updatedAt: iso(-1),
    },
    {
      id: "prod-community", kind: "community",
      title: "The Parents' Circle · Monthly",
      subtitle: "Subscription-gated parent community — what's working, what's not",
      slug: "parents-circle",
      description: "<p>A private community for parents of Class 6–10 students. Monthly live Q&A with Renu, weekly tips, and a peer feed where parents share what's actually working.</p>",
      coverImageUrl: "/features/community.jpg",
      pricing: { type: "subscription", amount: 499, currency: "INR", intervalDays: 30 },
      delivery: {
        kind: "community",
        linkedCommunityId: "grp-class9-batch-3",
        welcomeMessage: "Welcome — pinned posts have the weekly study plan template. Say hi in the intros thread.",
      },
      features: ["Monthly live Q&A", "Weekly study tips", "Private parent forum"],
      status: "published", publishedAt: iso(-15),
      inventorySold: 23, refundPolicy: "Cancel anytime",
      createdAt: iso(-20), updatedAt: iso(-1),
    },
    {
      id: "prod-1on1", kind: "session",
      title: "1:1 Strategy Session with Renu",
      subtitle: "45-minute personalised study plan",
      slug: "renu-1on1",
      description: "<p>Book a 1:1 session to map out a 6-month study plan for your child. Comes with a written plan emailed after the call.</p>",
      pricing: { type: "one-time", amount: 1499, currency: "INR" },
      delivery: { kind: "session", durationMinutes: 45, bookingUrl: "https://cal.com/renu-rawat/strategy-call" },
      features: ["45-min Zoom call", "Written 6-month plan", "Followup email after 4 weeks"],
      status: "published", publishedAt: iso(-30),
      inventorySold: 12, refundPolicy: "Full refund if cancelled 24h ahead",
      createdAt: iso(-40), updatedAt: iso(-5),
    },
    {
      id: "prod-mock-test", kind: "download",
      title: "Class 10 Mock Test Pack · 8 papers",
      subtitle: "Full-length CBSE pattern papers with answer keys",
      slug: "class-10-mock-tests",
      description: "<p>Eight full-length mock papers with detailed answer keys. PDF download.</p>",
      pricing: { type: "one-time", amount: 999, currency: "INR" },
      delivery: { kind: "file-download", files: [{ id: "f-1", filename: "class-10-mocks-vol-1.pdf", url: "/files/mocks-v1.pdf", sizeBytes: 4_200_000, mime: "application/pdf" }] },
      features: ["8 full-length mocks", "Detailed answer keys", "Topic-wise mark allocation"],
      status: "published", publishedAt: iso(-18),
      inventorySold: 34, refundPolicy: "Digital download — no refund",
      createdAt: iso(-25), updatedAt: iso(-2),
    },
    {
      id: "prod-eng-grammar", kind: "course",
      title: "English Grammar Rebooted",
      subtitle: "Class 6–8 · 20 rules that fix 90% of mistakes",
      slug: "english-grammar-rebooted",
      description: "<p>Self-paced English grammar course for Class 6–8 students.</p>",
      coverImageUrl: "/features/whiteboard.jpg",
      pricing: { type: "one-time", amount: 1999, currency: "INR" },
      delivery: { kind: "course-access", courseId: "course-eng-grammar" },
      features: ["20 short lessons", "Editing drills", "Free common-mistakes PDF"],
      status: "published", publishedAt: iso(-30),
      inventorySold: 22, refundPolicy: "14-day refund",
      createdAt: iso(-40), updatedAt: iso(-1),
    },
  ]
}

interface SeedCoupon {
  id: string
  code: string
  discount: { type: "percent" | "fixed"; value: number }
  appliesToProductIds?: string[]
  validFrom?: string
  validUntil?: string
  maxUses?: number
  uses: number
  oneTimePerCustomer?: boolean
  createdAt: string
}

function buildCoupons(): SeedCoupon[] {
  return [
    {
      id: "coup-early", code: "EARLYBIRD20", discount: { type: "percent", value: 20 },
      validFrom: iso(-30), validUntil: iso(14), maxUses: 100, uses: 12,
      oneTimePerCustomer: true, createdAt: iso(-30),
    },
    {
      id: "coup-summer", code: "SUMMER500", discount: { type: "fixed", value: 500 },
      appliesToProductIds: ["prod-c9-math", "prod-c8-sci", "prod-eng-grammar"],
      validFrom: iso(-10), validUntil: iso(45), maxUses: 50, uses: 6,
      oneTimePerCustomer: false, createdAt: iso(-10),
    },
    {
      id: "coup-parent", code: "PARENT100", discount: { type: "percent", value: 100 },
      appliesToProductIds: ["prod-community"],
      validFrom: iso(-5), validUntil: iso(60), maxUses: 25, uses: 3,
      oneTimePerCustomer: true, createdAt: iso(-5),
    },
  ]
}

interface SeedOrder {
  id: string
  productId: string
  productSnapshot: { title: string; kind: string }
  customerId: string
  customerEmail: string
  customerName: string
  subtotal: number
  discount: number
  total: number
  currency: string
  couponCode?: string
  status: "paid" | "pending" | "refunded" | "failed"
  paymentMethod: "razorpay" | "free" | "stub"
  paymentReference?: string
  createdAt: string
  paidAt?: string
}

function buildOrders(students: SeedUser[], products: SeedProduct[]): SeedOrder[] {
  const out: SeedOrder[] = []
  products.slice(0, 6).forEach((p, pi) => {
    students.slice(pi * 2, pi * 2 + 4).forEach((s, si) => {
      const amount = p.pricing.type === "one-time"
        ? p.pricing.amount
        : p.pricing.type === "subscription"
          ? p.pricing.amount
          : p.pricing.type === "pay-what-you-want"
            ? p.pricing.minAmount
            : 0
      const discount = si === 0 ? Math.floor(amount * 0.2) : 0
      out.push({
        id: `ord-${pi}-${si}`,
        productId: p.id,
        productSnapshot: { title: p.title, kind: p.kind },
        customerId: s.id,
        customerEmail: s.email,
        customerName: s.name,
        subtotal: amount,
        discount,
        total: amount - discount,
        currency: "INR",
        couponCode: si === 0 ? "EARLYBIRD20" : undefined,
        status: "paid",
        paymentMethod: "razorpay",
        paymentReference: `pay_${id("rzp").slice(0, 12)}`,
        createdAt: iso(-Math.floor(pi * 3 + si + 2), 14),
        paidAt: iso(-Math.floor(pi * 3 + si + 2), 14),
      })
    })
  })
  return out
}

interface SeedEntitlement {
  id: string
  customerId: string
  productId: string
  type: "course" | "download" | "session" | "webinar" | "license" | "membership" | "community"
  reference?: string
  expiresAt?: string
  source: "purchase" | "manual" | "trial" | "gift"
  grantedAt: string
  orderId?: string
}

function buildEntitlements(orders: SeedOrder[], products: SeedProduct[]): SeedEntitlement[] {
  return orders.map((o, i) => {
    const p = products.find((x) => x.id === o.productId)
    let type: SeedEntitlement["type"] = "course"
    let reference: string | undefined = undefined
    if (p) {
      if (p.delivery.kind === "course-access") { type = "course"; reference = p.delivery.courseId }
      else if (p.delivery.kind === "file-download") { type = "download"; reference = p.id }
      else if (p.delivery.kind === "session") { type = "session"; reference = p.id }
      else if (p.delivery.kind === "webinar") { type = "webinar"; reference = p.id }
      else if (p.delivery.kind === "license") { type = "license"; reference = `KEY-${id("lic")}` }
      else if (p.delivery.kind === "membership" || p.delivery.kind === "bundle") { type = "membership"; reference = p.id }
      else if (p.delivery.kind === "community") { type = "community"; reference = p.delivery.linkedCommunityId }
    }
    return {
      id: `ent-${i.toString().padStart(3, "0")}`,
      customerId: o.customerId,
      productId: o.productId,
      type,
      reference,
      source: "purchase" as const,
      grantedAt: o.paidAt ?? o.createdAt,
      orderId: o.id,
    }
  })
}

// ─── Portal config + pages + blog + faculty + testimonials ──────

interface SeedPortalConfig {
  brand: {
    siteName: string
    tagline?: string
    logoUrl?: string
    primaryColor: string
    accentColor: string
    headingFont?: string
    bodyFont?: string
    headerLayout?: string
    footerLayout?: string
    hidePoweredBy?: boolean
    hideAttribution?: boolean
    ogImage?: string
  }
  socials?: { instagram?: string; youtube?: string; linkedin?: string; twitter?: string }
  defaultSeo?: { title?: string; description?: string }
  announcementBar?: { enabled: boolean; message?: string; ctaLabel?: string; ctaUrl?: string }
}

function buildPortalConfig(): SeedPortalConfig {
  return {
    brand: {
      siteName: "Renu Rawat · K12 Coaching",
      tagline: "Where Class 6–10 maths and science finally make sense.",
      logoUrl: "/people/teacher-1.jpg",
      primaryColor: "#7c3aed",
      accentColor: "#f59e0b",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
      headerLayout: "split-classic",
      footerLayout: "multi-column",
      ogImage: "/features/courses.jpg",
    },
    socials: {
      instagram: "https://instagram.com/renu.rawat.teaches",
      youtube: "https://youtube.com/@renurawat",
    },
    defaultSeo: {
      title: "Renu Rawat · CBSE + ICSE Maths and Science Tutor",
      description: "Live K12 classes for Maths and Science. Class 6–10 · CBSE + ICSE · small batches · weekly doubt sessions.",
    },
    announcementBar: {
      enabled: true,
      message: "✨ Summer cohort starts June 15 — limited seats",
      ctaLabel: "Join now",
      ctaUrl: "/p/renu-rawat/store",
    },
  }
}

interface SeedPortalPage {
  id: string
  slug: string
  title: string
  status: "published" | "draft"
  sections: Array<{ id: string; type: string; data: Record<string, unknown> }>
  seo?: { title?: string; description?: string }
  showInNav?: boolean
  navLabel?: string
  navOrder?: number
  createdAt: string
  updatedAt: string
}

function buildPortalPages(): SeedPortalPage[] {
  return [
    {
      id: "page-home", slug: "home", title: "Home",
      status: "published", showInNav: true, navLabel: "Home", navOrder: 0,
      sections: [
        { id: "s-1", type: "hero", data: {
          eyebrow: "K12 · Maths + Science · Small batches",
          headline: "Where Class 6–10 maths finally makes sense.",
          subhead: "14 years teaching CBSE + ICSE students. Live classes, weekly doubts, formula handbooks. Join the cohort that 200+ parents already trust.",
          primaryCta: { label: "See our courses", href: "/p/renu-rawat/store" },
          secondaryCta: { label: "Watch a sample class", href: "#" },
          backgroundImage: "/features/courses.jpg",
        }},
        { id: "s-2", type: "stats", data: {
          stats: [
            { label: "Students enrolled", value: "180+" },
            { label: "Live classes / week", value: "8" },
            { label: "Avg score lift", value: "+18%" },
            { label: "Parent satisfaction", value: "4.9 / 5" },
          ],
        }},
        { id: "s-3", type: "courses-grid", data: { limit: 6, showPrices: true }},
        { id: "s-4", type: "testimonials", data: { limit: 4, featuredOnly: false }},
        { id: "s-5", type: "faculty", data: { limit: 3 }},
        { id: "s-6", type: "cta", data: {
          headline: "Ready to see the difference?",
          body: "Book a 1:1 strategy call — we'll map out a 6-month plan for your child.",
          ctaLabel: "Book a session", ctaUrl: "/p/renu-rawat/store/renu-1on1",
        }},
      ],
      seo: { title: "Renu Rawat · K12 Maths + Science · CBSE / ICSE", description: "Live K12 classes for Maths and Science. Class 6–10 · small batches · weekly doubt sessions." },
      createdAt: iso(-60), updatedAt: iso(-2),
    },
    {
      id: "page-about", slug: "about", title: "About",
      status: "published", showInNav: true, navLabel: "About", navOrder: 1,
      sections: [
        { id: "s-1", type: "hero", data: {
          eyebrow: "About the academy",
          headline: "Run by teachers, built for parents.",
          subhead: "Renu has taught 1,500+ students across 14 years. Vikram joined in 2023 to take the senior physics + chemistry threads.",
        }},
        { id: "s-2", type: "rich-text", data: { html: "<p>We're a small, deliberate academy. We don't take more students than we can give attention to. Every batch is capped at 15 — so doubt questions actually get answered, not deferred.</p><p>Our promise to parents: weekly progress updates, 24h doubt resolution, and a culture where asking 'silly' questions is celebrated.</p>" }},
        { id: "s-3", type: "faculty", data: { limit: 5 }},
      ],
      createdAt: iso(-55), updatedAt: iso(-3),
    },
    {
      id: "page-courses", slug: "courses", title: "Courses",
      status: "published", showInNav: true, navLabel: "Courses", navOrder: 2,
      sections: [
        { id: "s-1", type: "hero", data: { headline: "Every course we currently teach", subhead: "Pick a course, see the syllabus, enroll." }},
        { id: "s-2", type: "courses-grid", data: { limit: 12, showPrices: true }},
      ],
      createdAt: iso(-50), updatedAt: iso(-2),
    },
    {
      id: "page-contact", slug: "contact", title: "Contact",
      status: "published", showInNav: true, navLabel: "Contact", navOrder: 4,
      sections: [
        { id: "s-1", type: "hero", data: { headline: "Talk to us", subhead: "WhatsApp is fastest. Email also works." }},
        { id: "s-2", type: "contact-form", data: { fields: ["name", "email", "phone", "message"] }},
      ],
      createdAt: iso(-45), updatedAt: iso(-3),
    },
  ]
}

interface SeedPortalFaculty {
  id: string
  userId?: string
  name: string
  role: string
  bio?: string
  photo?: string
  socials?: { instagram?: string; linkedin?: string }
  expertise?: string[]
  courseIds?: string[]
  featured?: boolean
  order?: number
}

function buildPortalFaculty(): SeedPortalFaculty[] {
  return [
    { id: "fac-renu", userId: "u-renu", name: "Renu Rawat", role: "Founder · Maths Lead", bio: "14 years teaching K12 Maths · CBSE + ICSE", photo: "/people/teacher-1.jpg", expertise: ["Maths Class 6-10", "Trigonometry", "Algebra"], courseIds: ["course-math-class9", "course-jee-foundation", "course-fdn-class6", "course-eng-grammar"], featured: true, order: 0 },
    { id: "fac-vikram", userId: "u-co-vikram", name: "Vikram Singh", role: "Science Lead · Physics + Chemistry", bio: "IIT Delhi alum · 9 years teaching Class 9-10 Science", photo: "/people/teacher-2.jpg", expertise: ["Physics Class 9-10", "Chemistry"], courseIds: ["course-sci-class8", "course-jee-foundation"], featured: true, order: 1 },
    { id: "fac-asha", userId: "u-admin-asha", name: "Asha Mehrotra", role: "Operations · Parent Liaison", bio: "Runs the back office, talks to parents, schedules everything", featured: false, order: 2 },
  ]
}

interface SeedTestimonial {
  id: string
  authorName: string
  authorRole?: string
  avatar?: string
  courseId?: string
  rating: number
  quote: string
  featured?: boolean
  aboutInstructorId?: string
  createdAt: string
  status: "published" | "pending" | "hidden"
}

function buildPortalTestimonials(): SeedTestimonial[] {
  const list = [
    { name: "Anjali Sharma", role: "Parent of Vihaan, Class 9", quote: "Vihaan went from dreading maths to looking forward to Saturday class. Renu has a gift for making hard things feel doable.", rating: 5, featured: true, about: "u-renu" },
    { name: "Rajesh Verma", role: "Parent of Aanya, Class 10", quote: "We tried 3 other tutors before Renu. This is the only one where Aanya's marks moved — from 71% to 89% in two terms.", rating: 5, featured: true, about: "u-renu" },
    { name: "Priya Iyer", role: "Parent of Ishita, Class 8", quote: "The home experiments in Vikram sir's class are what got Ishita actually interested in science. She talks about them at dinner.", rating: 5, featured: true, about: "u-co-vikram" },
    { name: "Sandeep Reddy", role: "Parent of Reyansh, Class 9", quote: "The weekly progress updates Renu sends are gold. I know exactly where my child is struggling.", rating: 5, featured: false, about: "u-renu" },
    { name: "Meena Joshi", role: "Parent of Krishna, Class 7", quote: "Honest, kind teacher. Doesn't make children feel stupid for asking basics. Worth every rupee.", rating: 5, featured: false, about: "u-renu" },
  ]
  return list.map((t, i) => ({
    id: `tst-${i.toString().padStart(2, "0")}`,
    authorName: t.name,
    authorRole: t.role,
    quote: t.quote,
    rating: t.rating,
    featured: t.featured,
    aboutInstructorId: t.about,
    createdAt: iso(-Math.floor(i * 5 + 10)),
    status: "published" as const,
  }))
}

interface SeedBlogPost {
  id: string
  slug: string
  title: string
  excerpt?: string
  coverImage?: string
  body: string
  authorId?: string
  tags?: string[]
  categories?: string[]
  allowComments?: boolean
  allowLikes?: boolean
  status: "published" | "draft" | "scheduled"
  publishedAt?: string
  pinned?: boolean
  seo?: { title?: string; description?: string }
  comments?: Array<{ id: string; authorName: string; body: string; createdAt: string }>
  reactions?: Record<string, string[]>
  createdAt: string
  updatedAt: string
}

function buildBlogPosts(): SeedBlogPost[] {
  return [
    {
      id: "post-001", slug: "how-i-teach-trigonometry",
      title: "How I teach trigonometry so it actually sticks",
      excerpt: "Most students lose trigonometry by Day 3 because nobody bothers to derive the identities. Here's the approach that lands every term.",
      coverImage: "/features/whiteboard.jpg",
      body: "<h2>The problem with how trig is usually taught</h2><p>In most classrooms, the teacher writes sin²θ + cos²θ = 1 on the board and moves on. Three weeks later, every student forgot why. That's the trap.</p><h2>What I do instead</h2><p>I spend the first 20 minutes drawing the unit circle <em>by hand</em>. Slowly. Then we derive each identity from the picture. By the end of the class, students don't memorise the identities — they re-derive them when needed.</p><p>The trick: every Saturday, we pick one identity and prove it together on the whiteboard. Three months in, my Class 10 students can derive all 4 critical identities cold.</p>",
      authorId: "u-renu", tags: ["trigonometry", "teaching", "class-10"], categories: ["Teaching"],
      allowComments: true, allowLikes: true,
      status: "published", publishedAt: iso(-25), pinned: true,
      seo: { title: "How I teach trigonometry so it actually sticks · Renu Rawat", description: "A teacher's approach to making trigonometry intuitive — derive the identities, don't memorise them." },
      reactions: { "❤️": ["v-001", "v-002", "v-003", "v-004"], "🔥": ["v-005", "v-006"] },
      createdAt: iso(-26), updatedAt: iso(-25),
    },
    {
      id: "post-002", slug: "common-mistakes-class-9-maths",
      title: "The 5 mistakes Class 9 students make in maths exams (and how to avoid them)",
      excerpt: "After grading 1,000+ papers, the same five mistakes keep showing up. Here's the list — and the 30-second fix for each.",
      coverImage: "/features/courses.jpg",
      body: "<h2>Mistake #1 — Skipping the working</h2><p>Even when the answer is right, partial credit only comes if your steps are written. Show every line.</p><h2>Mistake #2 — Sign errors in factorisation</h2><p>Especially in (x² − 9) vs (x² + 9). Take 3 seconds to double-check the sign before you write the factors.</p><p>... [3 more mistakes]</p>",
      authorId: "u-renu", tags: ["class-9", "exam-tips"], categories: ["Exam Prep"],
      allowComments: true, allowLikes: true,
      status: "published", publishedAt: iso(-15), pinned: false,
      reactions: { "❤️": ["v-007", "v-008"] },
      createdAt: iso(-16), updatedAt: iso(-15),
    },
    {
      id: "post-003", slug: "home-experiments-class-8-science",
      title: "5 home experiments for Class 8 Science (parents — these are 30 mins each)",
      excerpt: "Five experiments you can do at home this weekend that match Class 8 chapters. Materials cost: under ₹200 total.",
      coverImage: "/features/quizzes.jpg",
      body: "<h2>1. Sliding vs rolling friction</h2><p>Materials: a book, a few marbles, a smooth surface. Push the book directly, then with marbles underneath. Time the slide. Observe.</p><h2>2. Sound + vibration</h2><p>Stretch a rubber band over an open box. Pluck. Observe.</p><p>...</p>",
      authorId: "u-co-vikram", tags: ["science", "class-8", "parents"], categories: ["Parents"],
      allowComments: true,
      status: "published", publishedAt: iso(-10),
      createdAt: iso(-12), updatedAt: iso(-10),
    },
    {
      id: "post-004", slug: "summer-cohort-2026",
      title: "Summer cohort 2026 — open for enrolment",
      excerpt: "Three batches starting June 15. Maths, Science, English. Limited seats — 15 per batch.",
      body: "<p>The summer cohort is now open. Three batches:</p><ul><li>Class 6 Foundation — June 15 to August 30</li><li>Class 8 Science — June 20 to September 5</li><li>Class 9 Maths — June 22 to September 10</li></ul><p>15 seats per batch. Book by clicking the course on the store page.</p>",
      authorId: "u-renu", tags: ["announcement", "enrolment"], categories: ["Announcements"],
      status: "published", publishedAt: iso(-3), pinned: true,
      createdAt: iso(-4), updatedAt: iso(-3),
    },
    {
      id: "post-005", slug: "draft-class-10-strategy",
      title: "Class 10 Boards strategy — a 6-month roadmap",
      excerpt: "Coming next week — the month-by-month plan I give to every Class 10 student.",
      body: "<p>Draft — finalising in 2 days.</p>",
      authorId: "u-renu", tags: ["class-10", "strategy"],
      status: "draft",
      createdAt: iso(-1), updatedAt: iso(0),
    },
  ]
}

// ─── Wall of love entries ──────────────────────────────────────

interface SeedWallEntry {
  id: string
  kind: "image" | "video" | "quote" | "link"
  url?: string
  caption?: string
  studentId?: string
  studentName?: string
  courseId?: string
  vibe?: "love" | "win" | "creative" | "milestone"
  featured?: boolean
  createdAt: string
  reactions?: Record<string, string[]>
}

function buildWall(students: SeedUser[]): SeedWallEntry[] {
  return [
    { id: "wall-001", kind: "quote", caption: "Cleared the school maths olympiad pre-selection. Top 10%!", studentId: students[1].id, studentName: students[1].name, courseId: "course-math-class9", vibe: "win", featured: true, createdAt: iso(-7) },
    { id: "wall-002", kind: "quote", caption: "Scored 92% in unit test 3 — first time over 90 ever.", studentId: students[0].id, studentName: students[0].name, courseId: "course-jee-foundation", vibe: "milestone", featured: true, createdAt: iso(-10) },
    { id: "wall-003", kind: "quote", caption: "Built my first physics simulation in Scratch — friction!", studentId: students[2].id, studentName: students[2].name, courseId: "course-sci-class8", vibe: "creative", featured: true, createdAt: iso(-12) },
    { id: "wall-004", kind: "quote", caption: "I finally understand trigonometry. THANK YOU.", studentId: students[3].id, studentName: students[3].name, courseId: "course-jee-foundation", vibe: "love", featured: false, createdAt: iso(-15) },
    { id: "wall-005", kind: "quote", caption: "Got class topper this term — Renu ma'am you're a wizard.", studentId: students[5].id, studentName: students[5].name, courseId: "course-math-class9", vibe: "win", featured: true, createdAt: iso(-18) },
    { id: "wall-006", kind: "quote", caption: "Edited my own essay using the 5 rules — got an A!", studentId: students[7].id, studentName: students[7].name, courseId: "course-eng-grammar", vibe: "milestone", featured: false, createdAt: iso(-22) },
  ]
}

// ─── Certificates ──────────────────────────────────────────────

interface SeedCertificate {
  id: string
  studentName: string
  email: string
  courseName: string
  completionDate: string
  grade?: string
  instructorName: string
  template: string
  status: "issued" | "pending"
  batchId: string
  createdAt: string
}
interface SeedCertBatch {
  id: string
  courseName: string
  template: string
  totalRows: number
  successCount: number
  failureCount: number
  status: "completed" | "processing"
  createdAt: string
  createdBy: string
  certificates: SeedCertificate[]
}

function buildCertificates(students: SeedUser[]): SeedCertBatch[] {
  const winners = students.slice(0, 7)
  return [
    {
      id: "cert-batch-001",
      courseName: "Class 9 Maths · CBSE Foundation",
      template: "classic-gold",
      totalRows: winners.length,
      successCount: winners.length,
      failureCount: 0,
      status: "completed",
      createdAt: iso(-12),
      createdBy: "u-renu",
      certificates: winners.map((s, i) => ({
        id: `cert-${i.toString().padStart(3, "0")}`,
        studentName: s.name,
        email: s.email,
        courseName: "Class 9 Maths · CBSE Foundation",
        completionDate: iso(-12 - i),
        grade: ["A+", "A", "A", "B+", "A", "A+", "B"][i],
        instructorName: "Renu Rawat",
        template: "classic-gold",
        status: "issued",
        batchId: "cert-batch-001",
        createdAt: iso(-12),
      })),
    },
  ]
}

// ─── Docs ──────────────────────────────────────────────────────

interface SeedDoc {
  id: string
  ownerId: string
  spaceId?: string
  icon?: string
  title: string
  contentHtml?: string
  content?: unknown[]
  blocks: Array<{ id: string; type: string; data: Record<string, unknown> }>
  audience:
    | { kind: "private" }
    | { kind: "workspace-admin" }
    | { kind: "workspace-everyone" }
    | { kind: "community"; communityId: string }
    | { kind: "course"; courseId: string }
    | { kind: "public" }
  status: "draft" | "published"
  publicSlug?: string
  seo?: { title?: string; description?: string }
  createdAt: string
  updatedAt: string
  version: number
}

function buildDocs(): SeedDoc[] {
  const wrap = (html: string): SeedDoc["content"] => [{ type: "rich-text", id: "tt-1", data: { html } }]
  return [
    {
      id: "doc-handbook",
      ownerId: "u-renu",
      icon: "📘",
      title: "Class 9 Maths · Course Handbook",
      contentHtml: "<h2>Welcome to Class 9 Maths</h2><p>This handbook is the source of truth for everything about this batch — schedule, doubt policy, grading, refunds.</p><h2>Schedule</h2><ul><li>Live classes: Tuesdays + Thursdays 5–6 PM IST</li><li>Doubt class: Saturdays 5–6 PM IST</li><li>Recordings posted within 24 hours</li></ul><h2>Grading + assessment</h2><p>Weekly quizzes + monthly mock tests. Quiz attempts: 3 per student. Mock tests: 1 attempt, no repeats.</p><h2>Refund window</h2><p>14 days, full refund, no questions asked. After 14 days, prorated based on lessons watched.</p>",
      content: wrap("<h2>Welcome to Class 9 Maths</h2><p>This handbook is the source of truth for everything about this batch.</p>"),
      blocks: [],
      audience: { kind: "course", courseId: "course-math-class9" },
      status: "published",
      createdAt: iso(-40),
      updatedAt: iso(-3),
      version: 4,
    },
    {
      id: "doc-parent-faq",
      ownerId: "u-renu",
      icon: "❓",
      title: "Parent FAQ",
      contentHtml: "<h2>Frequently asked questions</h2><h3>How is this different from my child's school class?</h3><p>Small batch (15 students max), live doubt resolution, recorded for review, weekly progress updates to parents.</p><h3>What if my child misses a class?</h3><p>Recording is posted within 24h. Doubts can be asked in the cohort feed.</p><h3>Do you handle Class 11–12?</h3><p>Not currently. We focus exclusively on Class 6–10 so we can do it really well.</p>",
      content: wrap("<h2>Frequently asked questions</h2><p>How is this different from school?</p>"),
      blocks: [],
      audience: { kind: "public" },
      status: "published",
      publicSlug: "parent-faq",
      seo: { title: "Parent FAQ · Renu Rawat K12 Coaching", description: "Common questions from parents about the academy — schedule, refunds, missed classes." },
      createdAt: iso(-30),
      updatedAt: iso(-5),
      version: 3,
    },
    {
      id: "doc-class-recap",
      ownerId: "u-renu",
      icon: "🎬",
      title: "Class Recap · Week 6 (Polynomials)",
      contentHtml: "<h2>What we covered</h2><ul><li>(a+b+c)² derivation</li><li>Factor theorem walkthrough</li><li>6 RD Sharma exercise problems solved</li></ul><h2>Recording</h2><p>🔗 <a href='/dashboard/recordings/live-001'>Recording · 75 min</a></p><h2>Homework</h2><ul><li>Polynomials problem set (12 problems, due Saturday)</li><li>Watch the factor-theorem refresher video</li></ul>",
      content: wrap("<h2>What we covered</h2><p>(a+b+c)² derivation, factor theorem.</p>"),
      blocks: [],
      audience: { kind: "community", communityId: "grp-class9-batch-3" },
      status: "published",
      createdAt: iso(-7),
      updatedAt: iso(-6),
      version: 2,
    },
    {
      id: "doc-internal-sop",
      ownerId: "u-renu",
      icon: "🛠",
      title: "Internal SOP · Live class delivery",
      contentHtml: "<h2>5 minutes before class</h2><ol><li>Test mic + camera</li><li>Open whiteboard + last week's notes</li><li>Join the LiveKit room as host</li></ol><h2>During class</h2><ol><li>Open with last week's homework review (10 min)</li><li>New concept (25 min)</li><li>Worked examples (20 min)</li><li>Q&A (15 min)</li></ol><h2>After class</h2><ol><li>Save whiteboard</li><li>Post recap to community feed</li><li>WhatsApp parents if any homework changed</li></ol>",
      content: wrap("<h2>5 minutes before class</h2><ol><li>Test mic + camera</li></ol>"),
      blocks: [],
      audience: { kind: "workspace-admin" },
      status: "published",
      createdAt: iso(-25),
      updatedAt: iso(-2),
      version: 6,
    },
    {
      id: "doc-blog-draft",
      ownerId: "u-renu",
      icon: "📝",
      title: "How parents can help with maths at home (draft)",
      contentHtml: "<h2>Outline</h2><ul><li>Why most parent help backfires</li><li>3 things to do instead</li><li>When to step back entirely</li></ul>",
      content: wrap("<h2>Outline</h2><p>Coming soon.</p>"),
      blocks: [],
      audience: { kind: "private" },
      status: "draft",
      createdAt: iso(-2),
      updatedAt: iso(0),
      version: 1,
    },
  ]
}

// ─── Org settings ──────────────────────────────────────────────

interface SeedOrgSettings {
  organisationName: string
  logoUrl?: string
  brandPrimaryColor: string
  brandAccentColor: string
  tagline?: string
  defaultCurrency: string
  notifications?: {
    batchCompletion?: boolean
    verificationAlerts?: boolean
    weeklySummary?: boolean
    newEnrollment?: boolean
    assignmentSubmitted?: boolean
  }
}

function buildOrgSettings(): SeedOrgSettings {
  return {
    organisationName: "Renu Rawat · K12 Coaching Academy",
    logoUrl: "/people/teacher-1.jpg",
    brandPrimaryColor: "#7c3aed",
    brandAccentColor: "#f59e0b",
    tagline: "Where Class 6–10 maths and science finally make sense.",
    defaultCurrency: "INR",
    notifications: {
      batchCompletion: true,
      verificationAlerts: true,
      weeklySummary: true,
      newEnrollment: true,
      assignmentSubmitted: true,
    },
  }
}

// ─── Master seed orchestrator ──────────────────────────────────

export interface SeedResult {
  seeded: boolean
  reason?: string
  counts?: Record<string, number>
}

export function seedRenuRawat(options?: { force?: boolean }): SeedResult {
  if (typeof window === "undefined") {
    return { seeded: false, reason: "Server-side — seed must run in the browser." }
  }

  const existingUsers = readKey<unknown[]>(k("lms.users"))
  if (!options?.force && Array.isArray(existingUsers) && existingUsers.length > 0) {
    return {
      seeded: false,
      reason: "Renu Rawat tenant already has data. Pass { force: true } to wipe + reseed.",
    }
  }

  ensureTenantRegistered()

  // Build all data
  const { all: users, renu, students, admin } = buildUsers()
  void admin
  const courses = buildCourses(renu.id, "u-co-vikram")
  const enrollments = buildEnrollments(students, courses)
  const quizzes = buildQuizzes(renu.id)
  const quizAttempts = buildQuizAttempts(students, quizzes)
  const groups = buildGroups(students, renu.id)
  const batchPosts = buildBatchPosts(groups, students, renu.id)
  const liveSessions = buildLiveSessions(courses, students, renu.id)
  const assignments = buildAssignments()
  const submissions = buildSubmissions(assignments, students)
  const reviews = buildReviews(students)
  const doubts = buildDoubts(students, renu.id)
  const whiteboards = buildWhiteboards(renu.id, students)
  const products = buildProducts()
  const coupons = buildCoupons()
  const orders = buildOrders(students, products)
  const entitlements = buildEntitlements(orders, products)
  const portalConfig = buildPortalConfig()
  const portalPages = buildPortalPages()
  const portalFaculty = buildPortalFaculty()
  const portalTestimonials = buildPortalTestimonials()
  const blogPosts = buildBlogPosts()
  const wallEntries = buildWall(students)
  const certificateBatches = buildCertificates(students)
  const docs = buildDocs()
  const orgSettings = buildOrgSettings()

  // Persist — LMS slices
  writeKey(k("lms.users"), users)
  writeKey(k("lms.courses"), courses)
  writeKey(k("lms.enrollments"), enrollments)
  writeKey(k("lms.quizzes"), quizzes)
  writeKey(k("lms.quizAttempts"), quizAttempts)
  writeKey(k("lms.studentGroups"), groups)
  writeKey(k("lms.batchPosts"), batchPosts)
  writeKey(k("lms.liveSessions"), liveSessions)
  writeKey(k("lms.assignments"), assignments)
  writeKey(k("lms.submissions"), submissions)
  writeKey(k("lms.reviews"), reviews)
  writeKey(k("lms.doubts"), doubts)
  writeKey(k("lms.whiteboards"), whiteboards)
  writeKey(k("lms.notifications"), [])
  writeKey(k("lms.attendance"), [])
  writeKey(k("lms.messages"), [])

  // Persist — store
  writeKey(k("store.products"), products)
  writeKey(k("store.coupons"), coupons)
  writeKey(k("store.orders"), orders)
  writeKey(k("store.entitlements"), entitlements)
  writeKey(k("store.subscriptions"), [])

  // Persist — portal (write to both draft + live slots so the
  // public portal renders without needing a manual publish)
  writeKey(k("portal.config"), portalConfig)
  writeKey(k("portal.live.config"), portalConfig)
  writeKey(k("portal.pages"), portalPages)
  writeKey(k("portal.live.pages"), portalPages)
  writeKey(k("portal.faculty"), portalFaculty)
  writeKey(k("portal.live.faculty"), portalFaculty)
  writeKey(k("portal.testimonials"), portalTestimonials)
  writeKey(k("portal.live.testimonials"), portalTestimonials)
  writeKey(k("portal.posts"), blogPosts)
  writeKey(k("portal.live.posts"), blogPosts)
  writeKey(k("portal.leads"), [])
  writeKey(k("portal.versions"), [])
  writeKey(k("portal.lastEditedAt"), nowIso())
  writeKey(k("portal.lastPublishedAt"), nowIso())

  // Persist — wall, referrals, certificates, docs, org settings
  writeKey(k("wall"), wallEntries)
  writeKey(k("referrals"), [])
  writeKey(k("certificates"), certificateBatches)
  writeKey(k("docs"), docs)
  writeKey(k("docs.spaces"), [])
  writeKey(k("docReferences"), [])
  writeKey(k("orgSettings"), orgSettings)

  return {
    seeded: true,
    counts: {
      users: users.length,
      courses: courses.length,
      lessons: courses.reduce((a, c) => a + c.totalLessons, 0),
      enrollments: enrollments.length,
      quizzes: quizzes.length,
      quizAttempts: quizAttempts.length,
      liveSessions: liveSessions.length,
      assignments: assignments.length,
      submissions: submissions.length,
      reviews: reviews.length,
      doubts: doubts.length,
      whiteboards: whiteboards.length,
      groups: groups.length,
      batchPosts: batchPosts.length,
      products: products.length,
      coupons: coupons.length,
      orders: orders.length,
      entitlements: entitlements.length,
      portalPages: portalPages.length,
      portalFaculty: portalFaculty.length,
      portalTestimonials: portalTestimonials.length,
      blogPosts: blogPosts.length,
      wallEntries: wallEntries.length,
      certificates: certificateBatches.reduce((a, b) => a + b.certificates.length, 0),
      docs: docs.length,
    },
  }
}

/** Wipe the renu-rawat tenant data — useful before a force reseed. */
export function clearRenuRawat(): void {
  if (typeof window === "undefined") return
  const slices = [
    "lms.users", "lms.courses", "lms.enrollments", "lms.quizzes", "lms.quizAttempts",
    "lms.studentGroups", "lms.batchPosts", "lms.liveSessions", "lms.assignments",
    "lms.submissions", "lms.reviews", "lms.doubts", "lms.whiteboards",
    "lms.notifications", "lms.attendance", "lms.messages",
    "store.products", "store.coupons", "store.orders", "store.entitlements", "store.subscriptions",
    "portal.config", "portal.live.config", "portal.pages", "portal.live.pages",
    "portal.faculty", "portal.live.faculty", "portal.testimonials", "portal.live.testimonials",
    "portal.posts", "portal.live.posts", "portal.leads", "portal.versions",
    "portal.lastEditedAt", "portal.lastPublishedAt",
    "wall", "referrals", "certificates", "docs", "docs.spaces", "docReferences", "orgSettings",
  ]
  for (const s of slices) {
    try { window.localStorage.removeItem(k(s)) } catch { /* ignore */ }
  }
}
