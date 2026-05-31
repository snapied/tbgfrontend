// Dashboard product tours — one TourStep[] per surface. Mounted by
// pages via <ProductTour tourId="…" steps={…} /> + opened by the
// floating "Show me around" pill (auto-shown on first visit) or the
// header's <TakeATourButton tourId="…" />.
//
// Pattern matches the existing tours in app/dashboard/courses/page.tsx
// and components/student/tours.ts — kept here so the dashboard pages
// stay focused on their actual UI and the copy lives in one searchable
// place. Bump the `tourId` suffix (v1 → v2 …) whenever a step is
// added/removed/significantly reworded so returning users see the
// updated tour instead of remembering "I already did this one".

import type { TourStep } from "@/components/tour/product-tour"

// ============================================================
// Engagement (students → engagement)
// ============================================================
export const ENGAGEMENT_TOUR_ID = "engagement-v1"
export const ENGAGEMENT_TOUR: TourStep[] = [
  {
    title: "See who's leaning in (and who's slipping)",
    body:
      "Every learner ranked by recent activity, time spent, and submissions. Spot champions to reward and at-risk students to nudge — before they ghost.",
    emoji: "📈",
    placement: "center",
  },
  {
    target: "[data-tour='engagement-filters']",
    title: "Filter by cohort or stage",
    body:
      "Narrow to a course, batch, or stage (new, active, at-risk, dormant). The leaderboard re-ranks live.",
    emoji: "🎛️",
    placement: "bottom",
  },
  {
    target: "[data-tour='engagement-bulk']",
    title: "Act on a group, not one by one",
    body:
      "Select a few rows and send a reminder, kick off a check-in, or move them into a batch in one go.",
    emoji: "⚡",
    placement: "bottom",
  },
  {
    title: "Pin this to your weekly rhythm",
    body:
      "5 minutes here on a Monday catches drop-offs while they're recoverable. We surface 'haven't logged in for 7+ days' automatically.",
    emoji: "🔔",
    placement: "center",
  },
]

// ============================================================
// Communities (= /dashboard/batches in code)
// ============================================================
export const COMMUNITIES_TOUR_ID = "communities-v1"
export const COMMUNITIES_TOUR: TourStep[] = [
  {
    title: "Communities — where your cohort happens",
    body:
      "Each card is a batch with its own member list and common room. Use them for cohort discussions, doubt threads, peer accountability, or a permanent home for a course's alumni.",
    emoji: "👥",
    placement: "center",
  },
  {
    target: "[data-tour='communities-new']",
    title: "Spin up a new community",
    body:
      "Optionally link it to a course so enrollments auto-join. Members can post, react, and reply — and you can pin announcements at the top.",
    emoji: "➕",
    placement: "bottom",
  },
  {
    target: "[data-tour='communities-search']",
    title: "Find a community quickly",
    body:
      "Type a course name or topic — search is fuzzy so 'jee phyics' finds 'JEE Physics Crew'.",
    emoji: "🔍",
    placement: "bottom",
  },
  {
    title: "Pop in daily — it compounds",
    body:
      "10 minutes a day in the common room reads as 'always around' to students. That's the difference between 'their course' and 'their teacher'.",
    emoji: "💬",
    placement: "center",
  },
]

// ============================================================
// Live Classes (/dashboard/classes)
// ============================================================
export const LIVE_CLASSES_TOUR_ID = "live-classes-v1"
export const LIVE_CLASSES_TOUR: TourStep[] = [
  {
    title: "Run every live class from one place",
    body:
      "In-house rooms (no Zoom needed) or paste a Meet/Zoom/Teams link — both end up here with the same invite, reminder, and recording flow.",
    emoji: "🎥",
    placement: "center",
  },
  {
    target: "[data-tour='classes-new']",
    title: "Schedule a class",
    body:
      "Pick a course or skip it for a 1:1 doubt-clearing or prospect call. Choose attendees, set the time, and we'll send reminders at T-3h / T-1h / T-15m on email + WhatsApp.",
    emoji: "📅",
    placement: "bottom",
  },
  {
    target: "[data-tour='classes-filters']",
    title: "Upcoming vs past vs cancelled",
    body:
      "Tabs filter the list. Past classes carry their recording, attendance, and chat transcript — handy for make-up sessions.",
    emoji: "🗂️",
    placement: "bottom",
  },
  {
    title: "One click to start",
    body:
      "Open any scheduled class → 'Open the room' admits waiting students instantly. Until then they sit in a branded lobby with a punctuality stat for your last 5 classes.",
    emoji: "▶️",
    placement: "center",
  },
]

// ============================================================
// Calendar (/dashboard/calendar)
// ============================================================
export const CALENDAR_TOUR_ID = "calendar-v1"
export const CALENDAR_TOUR: TourStep[] = [
  {
    title: "Your week, the way you actually teach",
    body:
      "Every live class, assignment due date, and cohort milestone in one view. Switch between month / week / day — the same data, different lens.",
    emoji: "🗓️",
    placement: "center",
  },
  {
    target: "[data-tour='calendar-view-toggle']",
    title: "Switch month / week / day",
    body:
      "Month for planning, week for the current sprint, day for back-to-back live classes. Click any event to jump to its detail page.",
    emoji: "🔀",
    placement: "bottom",
  },
  {
    title: "Drop it into Google / Apple Calendar",
    body:
      "Every class has a 'Subscribe' link on its detail page (ICS feed). Once subscribed, edits push out automatically — no re-share dance.",
    emoji: "📲",
    placement: "center",
  },
]

// ============================================================
// Recordings (/dashboard/recordings)
// ============================================================
export const RECORDINGS_TOUR_ID = "recordings-v1"
export const RECORDINGS_TOUR: TourStep[] = [
  {
    title: "Every class, replayable forever",
    body:
      "In-house live classes auto-record on stop and land here within minutes. We transcribe them too — student-searchable on day one.",
    emoji: "📼",
    placement: "center",
  },
  {
    target: "[data-tour='recordings-search']",
    title: "Search by what was said",
    body:
      "Type a word and we'll surface the recording AND jump straight to the moment it was spoken — powered by the auto-transcript.",
    emoji: "🔍",
    placement: "bottom",
  },
  {
    target: "[data-tour='recordings-actions']",
    title: "Attach, share, or repurpose",
    body:
      "One recording → add to a course as a lesson, drop into a playlist, share with a private link, or download the transcript as study notes.",
    emoji: "🪄",
    placement: "bottom",
  },
  {
    title: "Make recordings part of your product",
    body:
      "Pro tip: paid courses with a 'recordings from last cohort' module convert better than a course with no proof.",
    emoji: "💡",
    placement: "center",
  },
]

// ============================================================
// Whiteboards home (/dashboard/whiteboards)
// ============================================================
export const WHITEBOARDS_HOME_TOUR_ID = "whiteboards-home-v1"
export const WHITEBOARDS_HOME_TOUR: TourStep[] = [
  {
    title: "Infinite whiteboards, ready when you teach",
    body:
      "Pre-build problem sets, flow diagrams, or mind maps. Open one mid-class and you're not scrambling to draw.",
    emoji: "🎨",
    placement: "center",
  },
  {
    target: "[data-tour='whiteboards-new']",
    title: "Start a new board",
    body:
      "Blank canvas, or pick a template (graph paper, frame layout, Venn, etc.). Boards are real-time-collaborative — students can join from the live class.",
    emoji: "➕",
    placement: "bottom",
  },
  {
    target: "[data-tour='whiteboards-search']",
    title: "Find a board by topic",
    body:
      "Title + tag search. Tag a board with the chapter / unit and you'll find it again in seconds next year.",
    emoji: "🔖",
    placement: "bottom",
  },
  {
    title: "Reuse, don't redraw",
    body:
      "Duplicate any board to start from a known-good template — and the original stays clean for next time.",
    emoji: "♻️",
    placement: "center",
  },
]

// ============================================================
// Whiteboard editor (/dashboard/whiteboards/[id])
// ============================================================
export const WHITEBOARD_EDITOR_TOUR_ID = "whiteboard-editor-v1"
export const WHITEBOARD_EDITOR_TOUR: TourStep[] = [
  {
    title: "Welcome to your whiteboard",
    body:
      "Excalidraw under the hood — sketch, draw shapes, drop arrows, embed images, write formulas. Everything autosaves.",
    emoji: "✏️",
    placement: "center",
  },
  {
    target: "[data-tour='wb-title']",
    title: "Name it",
    body:
      "Click the title to rename. Naming it now means you'll actually find it later — 'Class 9 · Triangles · Pythagoras intro' beats 'Untitled (47)'.",
    emoji: "📝",
    placement: "bottom",
  },
  {
    target: "[data-tour='wb-visibility']",
    title: "Private or share with students",
    body:
      "Private = only you. Shared = students with the link can view (you control whether they can also edit). Use shared for collaborative problem-solving.",
    emoji: "🔐",
    placement: "bottom",
  },
  {
    title: "Use it live",
    body:
      "Open this board inside a live class and the canvas becomes co-editable in real time. Great for solving a problem together with the cohort.",
    emoji: "🎥",
    placement: "center",
  },
]

// ============================================================
// Presentations (/dashboard/presentations)
// ============================================================
export const PRESENTATIONS_TOUR_ID = "presentations-v1"
export const PRESENTATIONS_TOUR: TourStep[] = [
  {
    title: "AI Presentations",
    body:
      "Create stunning presentations in seconds. Just type your topic, pick a language and slide count, and let AI generate a full deck — complete with themes, layouts, and images.",
    placement: "center",
  },
  {
    title: "Generate with AI",
    body:
      "Type your topic in the input box, choose English or Hindi, pick how many slides (up to 15), and hit Generate. The AI builds your outline and slides automatically.",
    target: "[data-tour='pres-create']",
    placement: "bottom",
  },
  {
    title: "Your Presentations",
    body:
      "All your presentations appear here as cards. Click any card to open the editor. Use the 3-dot menu to duplicate, share, or delete.",
    target: "[data-tour='pres-list']",
    placement: "top",
  },
  {
    title: "Search",
    body:
      "Use the search bar to quickly find presentations by name. Press / to focus the search bar from anywhere.",
    target: "[data-tour='pres-search']",
    placement: "bottom",
  },
]
