// Product-tour step arrays for every student-dashboard page. Pages
// import the ID + steps + mount <ProductTour /> + <TakeATourButton />.
// Centered "intro" cards (no target selector) keep each tour resilient
// to layout changes — pages can re-style freely without breaking
// element selectors here.

import type { TourStep } from "@/components/tour/product-tour"

export const STUDENT_HOME_TOUR_ID = "learn-home-v1"
export const STUDENT_HOME_TOUR: TourStep[] = [
  {
    title: "Welcome to your learning hub",
    body: "This is where every course, class, quiz, assignment, and notification lives. Everything you need in one place — branded by your workspace.",
    emoji: "🎓",
    placement: "center",
  },
  {
    title: "Continue where you left off",
    body: "The Continue learning card resumes the last lesson you opened. Click it any time to jump straight back in.",
    emoji: "▶️",
    placement: "center",
  },
  {
    title: "Live class countdown",
    body: "Your next scheduled class shows here with a live countdown. When it starts, the Join button takes you straight to the room.",
    emoji: "🎥",
    placement: "center",
  },
  {
    title: "Use the sidebar for everything else",
    body: "Inbox, billing, doubts, settings, status — all in the sidebar. Press ⌘K from anywhere to jump straight to a page.",
    emoji: "🧭",
    placement: "center",
  },
]

export const STUDENT_COURSES_TOUR_ID = "learn-courses-v1"
export const STUDENT_COURSES_TOUR: TourStep[] = [
  {
    title: "All your courses, one grid",
    body: "Every course you're enrolled in shows here with a progress bar. Click Continue to resume the last lesson.",
    emoji: "📚",
    placement: "center",
  },
  {
    title: "Filter by status",
    body: "Switch the tab to see only in-progress courses or just the ones you've completed.",
    emoji: "✅",
    placement: "center",
  },
  {
    title: "Search across courses",
    body: "Type a few letters of the title — the list fuzzy-matches as you go.",
    emoji: "🔍",
    placement: "center",
  },
]

export const STUDENT_CLASSES_TOUR_ID = "learn-classes-v1"
export const STUDENT_CLASSES_TOUR: TourStep[] = [
  {
    title: "Upcoming and past classes",
    body: "The Upcoming tab shows everything in the next 14 days. The Past tab keeps the last 30 days with watch-recording links.",
    emoji: "🗓️",
    placement: "center",
  },
  {
    title: "Join when it goes live",
    body: "When a class is in session, the card flips to a Live now badge and the Join button opens the room.",
    emoji: "🔴",
    placement: "center",
  },
  {
    title: "Watch what you missed",
    body: "Past classes link to their recording (when one was posted). Your full recordings hub is in the sidebar.",
    emoji: "📼",
    placement: "center",
  },
]

export const STUDENT_RECORDINGS_TOUR_ID = "learn-recordings-v1"
export const STUDENT_RECORDINGS_TOUR: TourStep[] = [
  {
    title: "Every recording in one table",
    body: "Replays from every class across every enrolled course live here, newest first.",
    emoji: "📺",
    placement: "center",
  },
  {
    title: "Watch in-page",
    body: "Click Watch to open the recording in a dialog — no new tab, captions and transcript appear when available.",
    emoji: "🍿",
    placement: "center",
  },
]

export const STUDENT_QUIZZES_TOUR_ID = "learn-quizzes-v1"
export const STUDENT_QUIZZES_TOUR: TourStep[] = [
  {
    title: "Quiz tracker",
    body: "Every quiz from your enrolled courses, joined with your best attempt. Status chips tell you what's still owed and what you've already passed.",
    emoji: "📝",
    placement: "center",
  },
  {
    title: "Quick filter: To do vs Done",
    body: "Switch the tab to focus on quizzes that still need an attempt or a retry.",
    emoji: "🎯",
    placement: "center",
  },
  {
    title: "Pending review is OK",
    body: "If your teacher grades quizzes manually, you'll see Pending review until they release the result.",
    emoji: "⏳",
    placement: "center",
  },
]

export const STUDENT_ASSIGNMENTS_TOUR_ID = "learn-assignments-v1"
export const STUDENT_ASSIGNMENTS_TOUR: TourStep[] = [
  {
    title: "Assignments and projects",
    body: "Everything your teachers have posted, joined with your submission status. Overdue items rise to the top so nothing slips.",
    emoji: "📋",
    placement: "center",
  },
  {
    title: "Open to submit or review",
    body: "Click Open & submit to add your work. Once graded, the row flips to your score and feedback.",
    emoji: "✍️",
    placement: "center",
  },
]

export const STUDENT_DOUBTS_TOUR_ID = "learn-doubts-v1"
export const STUDENT_DOUBTS_TOUR: TourStep[] = [
  {
    title: "Every question you've asked",
    body: "Doubts you've raised inside lessons land here as threads. Replies from your teachers appear in-place.",
    emoji: "❓",
    placement: "center",
  },
  {
    title: "Resolve when it's answered",
    body: "Mark a doubt resolved once you're satisfied so your teacher knows the thread is closed.",
    emoji: "✅",
    placement: "center",
  },
  {
    title: "Ask new ones from a lesson",
    body: "To raise a new doubt, open the lesson and use the Ask a doubt button at the bottom of the page.",
    emoji: "💡",
    placement: "center",
  },
]

export const STUDENT_INBOX_TOUR_ID = "learn-inbox-v1"
export const STUDENT_INBOX_TOUR: TourStep[] = [
  {
    title: "Your notification inbox",
    body: "Every announcement, class invite, quiz grade, and reply lands here. The bell in the header opens the same list as a popover.",
    emoji: "📥",
    placement: "center",
  },
  {
    title: "Mark all read in one click",
    body: "Use the Mark all read button to clear the unread counter when you're done catching up.",
    emoji: "🧹",
    placement: "center",
  },
  {
    title: "Choose how you hear from us",
    body: "In Settings → Notifications, toggle Email and WhatsApp on or off. The in-app inbox always stays available.",
    emoji: "🔔",
    placement: "center",
  },
]

export const STUDENT_BILLING_TOUR_ID = "learn-billing-v1"
export const STUDENT_BILLING_TOUR: TourStep[] = [
  {
    title: "Your purchase history",
    body: "Every order you've placed on this workspace shows up here with status, amount, and a link to the full receipt.",
    emoji: "🧾",
    placement: "center",
  },
  {
    title: "Receipts open in-page",
    body: "Click any row to reach the original receipt page where you can copy the order link or download what you bought.",
    emoji: "🔗",
    placement: "center",
  },
]

export const STUDENT_SETTINGS_TOUR_ID = "learn-settings-v1"
export const STUDENT_SETTINGS_TOUR: TourStep[] = [
  {
    title: "Profile, channels, and time zone",
    body: "Update your display name + phone, choose how you want to hear from your teachers, and set the time zone your class schedules render in.",
    emoji: "⚙️",
    placement: "center",
  },
  {
    title: "Opting out of WhatsApp is fine",
    body: "Turn it off here and class invites + grade notifications skip WhatsApp automatically. Critical security messages always come through every channel.",
    emoji: "📴",
    placement: "center",
  },
  {
    title: "One Save button",
    body: "Changes don't write in the background. Hit Save changes when you're happy — the button stays disabled until something is actually different.",
    emoji: "💾",
    placement: "center",
  },
]
