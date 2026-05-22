// Deterministic course-seed generator for the homepage "build a
// course in 60 seconds" widget.
//
// What it does
// ------------
// Takes whatever the visitor types ("Vedic maths for 10-14 year
// olds", "yoga for beginners", "UPSC history") and returns a fully
// populated CourseSeed: six modules with three lessons each, a
// suggested price in INR, a brand hue for the cover art, a sample
// student name for the certificate preview, and a few promise lines
// for the landing page mock.
//
// Why deterministic, not AI
// -------------------------
// The widget needs to feel magical in the visitor's browser. A 4-7s
// reveal animation is more compelling than a 12s round-trip to an
// LLM. We can swap to a real model later — the function signature
// here doesn't change, only the body.
//
// The "magic" is two things:
// 1. Category detection. Keywords in the input pick from ten
//    domain-specific module templates (yoga, coding, math, finance,
//    language, exam-prep, creative, wellness, business, general).
// 2. Topic interpolation. The detected topic gets folded back into
//    the module titles so the output reads as bespoke, not stock.
//
// The result is good enough that the visitor sees their topic
// reflected back in a real, usable course outline. They can sign up
// and the seed will already be in session storage waiting.

export interface CourseModule {
  title: string
  lessons: string[]
}

export interface CourseSeed {
  rawInput: string
  topic: string          // cleaned-up display version of input
  category: CourseCategory
  audienceHint?: string  // "for 10-14 year olds" if detected
  brandHue: number       // 0-360, drives cover-art gradient
  modules: CourseModule[]
  priceInr: number
  promiseLines: string[]  // 3 short bullets for the landing-page mock
  sampleStudentName: string
}

export type CourseCategory =
  | "math"
  | "yoga"
  | "coding"
  | "finance"
  | "language"
  | "exam-prep"
  | "creative"
  | "wellness"
  | "business"
  | "general"

// Keyword → category map. First match wins. Order matters — more
// specific categories sit above broader ones (exam-prep > general).
const CATEGORY_KEYWORDS: Array<[CourseCategory, RegExp]> = [
  ["exam-prep",  /\b(upsc|neet|jee|ssc|gate|cat|gmat|gre|ielts|toefl|clat|nift|exam|prep|civils|board)\b/i],
  ["yoga",       /\b(yoga|asana|pranayama|meditation|kundalini|hatha|vinyasa|ashtanga|mindfulness)\b/i],
  ["coding",     /\b(coding|programming|python|javascript|java\b|react|web|app|software|dev|developer|html|css|sql|data\s?science|machine\s?learning|ml\b|ai\b)\b/i],
  ["math",       /\b(math|maths|mathematics|algebra|geometry|calculus|arithmetic|vedic|abacus|number)\b/i],
  ["finance",    /\b(finance|financial|money|investment|invest|mutual\s?fund|stock|trading|crypto|tax|wealth|budget|personal\s?finance)\b/i],
  ["language",   /\b(language|english|hindi|spanish|french|german|mandarin|japanese|korean|sanskrit|tamil|telugu|urdu|speak)\b/i],
  ["creative",   /\b(art|paint|painting|drawing|sketch|music|guitar|piano|sitar|tabla|singing|vocal|dance|kathak|bharatnatyam|writing|poetry|photography|design|illustration)\b/i],
  ["wellness",   /\b(fitness|nutrition|diet|weight|sleep|mental|stress|wellness|health|workout|exercise|meditation|wellbeing)\b/i],
  ["business",   /\b(business|marketing|sales|startup|entrepreneur|freelance|brand|copywriting|content|growth|seo|leadership|management)\b/i],
]

function detectCategory(input: string): CourseCategory {
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(input)) return cat
  }
  return "general"
}

// Alternate phrasings per category. The generator hashes the raw
// input and picks one variant so the same topic always produces the
// same output (consistency within a session) but a different topic
// surfaces a different scaffold — fights the "every generation looks
// identical" feel that pure-template generators suffer from.
const TITLE_VARIANTS: Record<CourseCategory, string[][]> = {
  math: [
    ["Foundations & number sense",          "Building blocks of {topic}",        "Visual & geometric reasoning",     "Speed techniques",                "Real-world {topic}",                  "Capstone — apply everything"],
    ["Where math actually starts",          "Patterns you'll see everywhere",     "Drawing the problem",              "Mental-math shortcuts",            "Math in daily life",                  "Your first solved 50-question set"],
    ["Numbers, properly",                   "Operations that compound",           "Geometry without fear",            "Vedic-style tricks",               "Word problems decoded",               "A timed mock + post-mortem"],
  ],
  yoga: [
    ["Breath, posture, alignment",          "Foundational asanas",                "Sun salutations, properly",        "Building strength + flexibility",  "Restorative & yin practice",          "Your daily home flow"],
    ["Setting up your space",               "Your first asana set",               "Sun salutations, breath-by-breath","Strength through stillness",       "Wind down with restoratives",         "A 20-minute flow you'll keep"],
    ["Just breathe, with intention",        "Standing on solid ground",           "Surya Namaskar, demystified",      "Core, hips, backbends — safely",   "Yin practice + the off-day flow",     "Your sustainable home rhythm"],
  ],
  coding: [
    ["Setup & your first program",          "Variables, logic, control flow",     "Functions & data structures",      "Build a real project in {topic}",  "Debugging & best practices",          "Ship it live"],
    ["Tools without tears",                 "Logic that makes sense",             "Reusable functions + data",        "Build the smallest useful thing",  "Read errors like a senior dev",       "Deploy & share"],
    ["Hello, world — actually",             "Branching, looping, deciding",       "Modular code that scales",         "Your first deliverable project",   "Versioning + test basics",            "Live on the internet"],
  ],
  finance: [
    ["Money mindset",                       "Budgeting that lasts",               "Investing 101",                    "Mutual funds & SIPs deep-dive",    "Tax & insurance basics",              "Your 10-year wealth plan"],
    ["What you actually own",               "Income, expense, savings ratio",     "Risk, return, and your tolerance", "Index funds for India",            "Old vs new tax regime, plainly",      "A wealth plan you can stick to"],
    ["The honest baseline",                 "A budget that survives bad weeks",   "Equity, debt, gold — choosing",    "SIP design that compounds",        "Term + health insurance, decoded",    "Your annual review playbook"],
  ],
  language: [
    ["Sounds & script",                     "Greetings & introductions",          "Daily conversations",              "Verbs, tenses, sentence shape",    "Reading & listening practice",        "Real-life situations"],
    ["Hearing the rhythm",                  "Hello → small talk",                 "Shopping, directions, phone calls","Past, present, future",            "Songs, news, short stories",          "Travel + work + a real chat"],
    ["The alphabet, properly",              "First 100 useful words",             "Out in the city",                  "Joining ideas without panic",      "Reading you'll actually finish",      "Speak for 5 minutes, calmly"],
  ],
  "exam-prep": [
    ["Map the syllabus honestly",           "Core concepts that compound",        "Previous year analysis",           "Answer-writing technique",         "Mock tests + post-mortem",            "Revision & exam-day plan"],
    ["What's actually tested",              "Foundations that pay off",           "10-year question trends",          "Structure that scores",            "Iterate, don't repeat",               "Calm-under-pressure drills"],
    ["The syllabus, sliced thin",           "Quick-recall scaffolding",           "Trap-question playbook",           "Time per question, by section",    "First full-length attempt",           "The last-7-days routine"],
  ],
  creative: [
    ["Tools, materials, first marks",       "Foundations of {topic}",             "Your first finished piece",        "Developing voice & style",         "Critique & revision",                 "Your showcase piece"],
    ["Choosing your kit",                   "Holding it properly",                "From sketch to finished",          "Borrow, then break",               "Self-critique that helps",            "Scope small, finish well"],
    ["The first 10 minutes",                "Daily warm-up rhythm",               "One piece, start to end",          "Finding your through-line",        "Peer feedback rules",                 "Sharing without flinching"],
  ],
  wellness: [
    ["Where you actually are today",        "Daily habits that compound",         "Building your routine",            "Tracking without obsession",       "Troubleshooting plateaus",            "Sustaining for life"],
    ["Honest baseline",                     "Sleep, movement, food — in order",   "A 30-min morning, designed",       "What to log, what to ignore",      "Stress, recovery, the long game",     "Habit stacking for life"],
    ["Measure what matters",                "Three habits, daily",                "Designing the week",               "Reading the trends",               "Bored body, bored mind",              "The 5-year version of you"],
  ],
  business: [
    ["Define your offer crisply",           "Find your first customer",          "Pricing & packaging",              "Marketing fundamentals",           "First 100 customers",                 "Scale without losing the plot"],
    ["The one-line pitch",                  "Where they hang out",                "Anchor pricing + tiers",           "Channels that fit you",            "Sales conversations that close",      "Systems, not heroics"],
    ["Crisp, specific, valuable",           "Their search terms",                 "Pricing math + common traps",      "Content that compounds",           "Onboarding without dropoff",          "Hiring your first help"],
  ],
  general: [
    ["Welcome & your learning roadmap",     "Foundations of {topic}",             "Core techniques",                  "Going deeper",                     "Real-world application",              "Capstone & next steps"],
    ["Why {topic}",                         "First principles",                   "Method 1, 2, 3",                   "Intermediate moves",               "Case studies",                        "Final project + next steps"],
    ["How this course works",               "The ideas that matter most",         "Techniques you'll actually use",   "Edge cases + common traps",        "Putting it to work",                  "Capstone + your learning plan"],
  ],
}

// Lesson tuples that match the variants above 1:1 — same three
// lessons per slot, no per-variant tuning yet. Kept as a separate
// table so we can later evolve them independently of titles.
const LESSON_TUPLES: Record<CourseCategory, string[][]> = {
  math:        [["Why this works","Mental models","Quick wins"],["Core operations","Patterns & shortcuts","Practice round"],["Drawing the problem","Spatial tricks","Worked examples"],["Vedic-style shortcuts","Mental math drills","Timed practice"],["Money & measurement","Word-problem playbook","Daily-life puzzles"],["Mock test","Common-mistake clinic","Your final solve"]],
  yoga:        [["Set up your space","Diaphragmatic breath","Body scan"],["Standing postures","Seated postures","Restful poses"],["The 12-count Surya Namaskar","Breath synchronisation","Common corrections"],["Core sequence","Hip openers","Backbends safely"],["Calming the nervous system","Long-hold postures","Wind-down ritual"],["Designing a 20-min flow","Tracking progress","Building the habit"]],
  coding:      [["Tooling without tears","Hello, world","Reading errors"],["Names & types","If, else, loops","Mini-exercises"],["Functions you can reuse","Lists, dicts, sets","Code-along: parser"],["Scoping the MVP","Wiring it together","Polishing the edges"],["Reading stack traces","Git basics","Writing tests"],["Deploying to the web","Sharing for feedback","What to learn next"]],
  finance:     [["What you actually own","Income, expense, savings ratio","Building the habit"],["The 50-30-20 rule, adapted","Tracking without dread","Cutting silent leaks"],["Equity vs debt","Risk tolerance honestly","Starting small"],["Index funds for India","Reading a factsheet","SIP vs lumpsum"],["Old vs new regime","Term + health cover","Section 80C in plain English"],["Defining goals in rupees","Asset allocation","Reviewing once a year"]],
  language:    [["The alphabet, properly","Hearing the rhythm","First written words"],["Hello, who, where","Numbers 1–100","Days, time, weather"],["At the shop","Asking for directions","On the phone"],["Present tense","Past & future","Joining ideas"],["Short stories","Songs & subtitles","News in plain language"],["Travel & emergencies","Work & email","Holding a 5-min chat"]],
  "exam-prep": [["What's actually tested","Past-paper patterns","Your study calendar"],["Foundations first","Linking topics","Quick-recall cards"],["10-year question trends","High-yield areas","Trap-question playbook"],["Structure that scores","Time per question","Marker's eye view"],["First full-length attempt","Error log","Iterate, don't repeat"],["Spaced repetition deck","Last-7-days routine","Calm-under-pressure drills"]],
  creative:    [["Choosing your kit","Holding it properly","First 10 minutes"],["Core technique 1","Core technique 2","Daily warm-up"],["Picking a subject","Step-by-step walkthrough","Common pitfalls"],["Studying the masters","Borrow, then break","Finding your through-line"],["Self-critique that helps","Peer feedback rules","Reworking without grief"],["Scope it small, finish it well","Final polish checklist","Sharing without flinching"]],
  wellness:    [["Honest baseline","What to measure","What to ignore"],["Sleep first","Movement minimums","Hydration & food"],["A 30-min morning","A 10-min wind-down","Designing your week"],["What to log","Spotting trends","When to back off"],["Bored body, bored mind","Stress & recovery","Re-igniting the why"],["Habit stacking","Coach yourself","The 5-year version of you"]],
  business:    [["The one-line pitch","Who it's for","What you charge"],["Where they hang out","What they search","How to ask"],["Anchor pricing","Tiers that convert","Common mistakes"],["Channels that fit you","Content that compounds","Tracking what matters"],["Sales conversations","Onboarding without dropoff","Asking for the referral"],["Hiring your first help","Systems, not heroics","Saying no"]],
  general:     [["Why {topic}","How this course works","Setting yourself up"],["Core idea 1","Core idea 2","Practice round"],["Method 1","Method 2","Method 3"],["Intermediate moves","Edge cases","Common traps"],["Case study 1","Case study 2","Your turn"],["Final project","Building the habit","Where to go next"]],
}

// Legacy module-template alias. Earlier code wrote the seed via
// MODULE_TEMPLATES[category] directly; now we pick a variant on
// hash(input) so a topic gets its own scaffold. Kept as a default
// (variant 0) so callers that don't go through generateCourseSeed
// still resolve.
const MODULE_TEMPLATES: Record<CourseCategory, CourseModule[]> = {
  math: [
    { title: "Foundations & number sense",   lessons: ["Why this works",                "Mental models",                  "Quick wins"] },
    { title: "Building blocks of {topic}",    lessons: ["Core operations",               "Patterns & shortcuts",           "Practice round"] },
    { title: "Visual & geometric reasoning",  lessons: ["Drawing the problem",           "Spatial tricks",                 "Worked examples"] },
    { title: "Speed techniques",              lessons: ["Vedic-style shortcuts",         "Mental math drills",             "Timed practice"] },
    { title: "Real-world {topic}",            lessons: ["Money & measurement",           "Word-problem playbook",          "Daily-life puzzles"] },
    { title: "Capstone — apply everything",   lessons: ["Mock test",                     "Common-mistake clinic",          "Your final solve"] },
  ],
  yoga: [
    { title: "Breath, posture, alignment",    lessons: ["Set up your space",             "Diaphragmatic breath",           "Body scan"] },
    { title: "Foundational asanas",            lessons: ["Standing postures",             "Seated postures",                "Restful poses"] },
    { title: "Sun salutations, properly",      lessons: ["The 12-count Surya Namaskar",   "Breath synchronisation",         "Common corrections"] },
    { title: "Building strength + flexibility", lessons: ["Core sequence",                 "Hip openers",                    "Backbends safely"] },
    { title: "Restorative & yin practice",     lessons: ["Calming the nervous system",    "Long-hold postures",             "Wind-down ritual"] },
    { title: "Your daily home flow",           lessons: ["Designing a 20-min flow",       "Tracking progress",              "Building the habit"] },
  ],
  coding: [
    { title: "Setup & your first program",     lessons: ["Tooling without tears",         "Hello, world",                   "Reading errors"] },
    { title: "Variables, logic, control flow", lessons: ["Names & types",                 "If, else, loops",                "Mini-exercises"] },
    { title: "Functions & data structures",    lessons: ["Functions you can reuse",       "Lists, dicts, sets",             "Code-along: parser"] },
    { title: "Build a real project in {topic}", lessons: ["Scoping the MVP",              "Wiring it together",             "Polishing the edges"] },
    { title: "Debugging & best practices",     lessons: ["Reading stack traces",          "Git basics",                     "Writing tests"] },
    { title: "Ship it live",                   lessons: ["Deploying to the web",          "Sharing for feedback",           "What to learn next"] },
  ],
  finance: [
    { title: "Money mindset",                  lessons: ["What you actually own",         "Income, expense, savings ratio", "Building the habit"] },
    { title: "Budgeting that lasts",           lessons: ["The 50-30-20 rule, adapted",    "Tracking without dread",         "Cutting silent leaks"] },
    { title: "Investing 101",                  lessons: ["Equity vs debt",                "Risk tolerance honestly",        "Starting small"] },
    { title: "Mutual funds & SIPs deep-dive",  lessons: ["Index funds for India",         "Reading a factsheet",            "SIP vs lumpsum"] },
    { title: "Tax & insurance basics",         lessons: ["Old vs new regime",             "Term + health cover",            "Section 80C in plain English"] },
    { title: "Your 10-year wealth plan",       lessons: ["Defining goals in rupees",      "Asset allocation",               "Reviewing once a year"] },
  ],
  language: [
    { title: "Sounds & script",                lessons: ["The alphabet, properly",         "Hearing the rhythm",             "First written words"] },
    { title: "Greetings & introductions",      lessons: ["Hello, who, where",              "Numbers 1–100",                  "Days, time, weather"] },
    { title: "Daily conversations",            lessons: ["At the shop",                    "Asking for directions",          "On the phone"] },
    { title: "Verbs, tenses, sentence shape",  lessons: ["Present tense",                  "Past & future",                  "Joining ideas"] },
    { title: "Reading & listening practice",   lessons: ["Short stories",                  "Songs & subtitles",              "News in plain language"] },
    { title: "Real-life situations",           lessons: ["Travel & emergencies",           "Work & email",                   "Holding a 5-min chat"] },
  ],
  "exam-prep": [
    { title: "Map the syllabus honestly",       lessons: ["What's actually tested",         "Past-paper patterns",            "Your study calendar"] },
    { title: "Core concepts that compound",     lessons: ["Foundations first",              "Linking topics",                 "Quick-recall cards"] },
    { title: "Previous year analysis",          lessons: ["10-year question trends",         "High-yield areas",               "Trap-question playbook"] },
    { title: "Answer-writing technique",        lessons: ["Structure that scores",          "Time per question",              "Marker's eye view"] },
    { title: "Mock tests + post-mortem",        lessons: ["First full-length attempt",      "Error log",                      "Iterate, don't repeat"] },
    { title: "Revision & exam-day plan",        lessons: ["Spaced repetition deck",         "Last-7-days routine",            "Calm-under-pressure drills"] },
  ],
  creative: [
    { title: "Tools, materials, first marks",   lessons: ["Choosing your kit",              "Holding it properly",            "First 10 minutes"] },
    { title: "Foundations of {topic}",          lessons: ["Core technique 1",               "Core technique 2",               "Daily warm-up"] },
    { title: "Your first finished piece",       lessons: ["Picking a subject",              "Step-by-step walkthrough",       "Common pitfalls"] },
    { title: "Developing voice & style",        lessons: ["Studying the masters",           "Borrow, then break",             "Finding your through-line"] },
    { title: "Critique & revision",             lessons: ["Self-critique that helps",       "Peer feedback rules",            "Reworking without grief"] },
    { title: "Your showcase piece",             lessons: ["Scope it small, finish it well", "Final polish checklist",         "Sharing without flinching"] },
  ],
  wellness: [
    { title: "Where you actually are today",    lessons: ["Honest baseline",                "What to measure",                "What to ignore"] },
    { title: "Daily habits that compound",      lessons: ["Sleep first",                    "Movement minimums",              "Hydration & food"] },
    { title: "Building your routine",           lessons: ["A 30-min morning",               "A 10-min wind-down",             "Designing your week"] },
    { title: "Tracking without obsession",      lessons: ["What to log",                    "Spotting trends",                "When to back off"] },
    { title: "Troubleshooting plateaus",        lessons: ["Bored body, bored mind",         "Stress & recovery",              "Re-igniting the why"] },
    { title: "Sustaining for life",             lessons: ["Habit stacking",                 "Coach yourself",                 "The 5-year version of you"] },
  ],
  business: [
    { title: "Define your offer crisply",       lessons: ["The one-line pitch",             "Who it's for",                   "What you charge"] },
    { title: "Find your first customer",        lessons: ["Where they hang out",            "What they search",               "How to ask"] },
    { title: "Pricing & packaging",             lessons: ["Anchor pricing",                 "Tiers that convert",             "Common mistakes"] },
    { title: "Marketing fundamentals",          lessons: ["Channels that fit you",          "Content that compounds",         "Tracking what matters"] },
    { title: "First 100 customers",             lessons: ["Sales conversations",            "Onboarding without dropoff",     "Asking for the referral"] },
    { title: "Scale without losing the plot",   lessons: ["Hiring your first help",         "Systems, not heroics",           "Saying no"] },
  ],
  general: [
    { title: "Welcome & your learning roadmap", lessons: ["Why {topic}",                    "How this course works",          "Setting yourself up"] },
    { title: "Foundations of {topic}",          lessons: ["Core idea 1",                    "Core idea 2",                    "Practice round"] },
    { title: "Core techniques",                 lessons: ["Method 1",                       "Method 2",                       "Method 3"] },
    { title: "Going deeper",                    lessons: ["Intermediate moves",             "Edge cases",                     "Common traps"] },
    { title: "Real-world application",          lessons: ["Case study 1",                   "Case study 2",                   "Your turn"] },
    { title: "Capstone & next steps",           lessons: ["Final project",                  "Building the habit",             "Where to go next"] },
  ],
}

// Category → suggested price (INR) for the landing-page mock. These
// are rough Indian-market norms for a 6-module beginner course
// taught by an independent creator (not an institution).
const CATEGORY_PRICE: Record<CourseCategory, number> = {
  math:        999,
  yoga:        1499,
  coding:      2999,
  finance:     1999,
  language:    1499,
  "exam-prep": 4999,
  creative:    1799,
  wellness:    1299,
  business:    2499,
  general:     1499,
}

// Category → brand hue for the cover-art gradient. Hand-picked so
// each category has a recognisably different temperature.
const CATEGORY_HUE: Record<CourseCategory, number> = {
  math:        210, // cool blue
  yoga:        265, // calm violet
  coding:      150, // emerald
  finance:     45,  // gold
  language:    340, // rose
  "exam-prep": 195, // steel
  creative:    20,  // terracotta
  wellness:    170, // teal-mint
  business:    285, // royal purple
  general:     230, // indigo
}

// Three promise lines per category. These read as "why you'd buy
// this" bullets on the landing-page preview.
const CATEGORY_PROMISES: Record<CourseCategory, string[]> = {
  math:        ["6 modules · 18 short lessons",        "Vedic + visual techniques",        "Worked examples after every concept"],
  yoga:        ["Built for your living-room mat",       "No prior flexibility required",    "20-min daily flows you'll actually do"],
  coding:      ["Ship a real project, not just code",   "Tools that respect your time",     "Lifetime access to the source code"],
  finance:     ["INR-first, not US-first",              "No commission for any product",    "Spreadsheets + templates included"],
  language:    ["Speak in week one",                    "Audio for every lesson",           "Real-life conversations, not textbook"],
  "exam-prep": ["Mapped to the official syllabus",       "Past-paper analysis + answer keys", "Mock test + feedback included"],
  creative:    ["Daily 15-minute exercises",            "Build a real portfolio piece",     "Critique sessions with the teacher"],
  wellness:    ["No fad diets, no extremes",            "Habits that survive bad weeks",    "Tracker + check-ins built in"],
  business:    ["For Indian solo founders + freelancers", "Tools + templates that ship",    "First-customer playbook included"],
  general:     ["6 modules · 18 short lessons",          "Lifetime access",                  "Certificate of completion"],
}

// A small pool of plausibly-Indian sample names for the certificate
// preview. We rotate based on a hash of the topic so the same input
// gets a stable preview.
const SAMPLE_STUDENTS = [
  "Aanya Sharma",
  "Rohan Mehta",
  "Ananya Iyer",
  "Aarav Reddy",
  "Diya Krishnan",
  "Kabir Patel",
  "Saanvi Nair",
  "Vihaan Joshi",
  "Mira Banerjee",
  "Arjun Bhatt",
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// Pull a "for <audience>" hint out of the raw input so we can echo
// it back on the landing-page mock. e.g. "yoga for beginners" →
// "for beginners".
function extractAudience(input: string): string | undefined {
  const m = input.match(/\bfor\s+([a-z0-9\s\-]+?)(?:[.,;!?]|$)/i)
  if (!m) return undefined
  const trimmed = m[1].trim()
  if (trimmed.length < 3 || trimmed.length > 40) return undefined
  return trimmed
}

// Take whatever the user typed and produce a clean display version.
// "yoga for beginners 🧘" → "Yoga for beginners"
function cleanTopic(input: string): string {
  // Strip emoji + symbols, keep letters/numbers/spaces/hyphens/'+'.
  // We don't want to be too aggressive — Indian language names like
  // "Bharatnatyam" + words like "C++" should survive.
  const stripped = input
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!stripped) return "Your course"
  // Title-case the first word; leave the rest as typed (preserves
  // proper nouns like "UPSC", "Python", "Vedic").
  return stripped[0].toUpperCase() + stripped.slice(1)
}

// Substitute {topic} markers in module titles with a shortened topic
// noun. "Vedic maths for kids" → "{topic}" becomes "Vedic maths".
function interpolateTopic(text: string, topic: string): string {
  // For the short noun version, drop a trailing "for …" if present.
  const shortTopic = topic.replace(/\s+for\s+.+$/i, "").trim()
  // Keep it lowercase inside a sentence unless it's clearly an
  // acronym (all caps in original).
  const looksAcronym = /^[A-Z0-9\s]+$/.test(shortTopic)
  const display = looksAcronym ? shortTopic : shortTopic.toLowerCase()
  return text.replace(/\{topic\}/g, display || "your topic")
}

/**
 * The main entry point. Given a free-text topic, return a fully
 * populated CourseSeed ready to render.
 *
 * Variation: we pick one of the title-variant rows for this category
 * via a hash of the cleaned topic, so identical inputs always give
 * identical output (good for a consistent demo) while different
 * inputs surface different scaffolds (fights the "every output looks
 * the same" feel of pure template generators).
 */
export function generateCourseSeed(rawInput: string): CourseSeed {
  const cleaned = cleanTopic(rawInput)
  const category = detectCategory(rawInput)
  const audienceHint = extractAudience(rawInput)
  const variants = TITLE_VARIANTS[category]
  const lessonTuples = LESSON_TUPLES[category]
  const variantIdx = hash(cleaned) % variants.length
  const titleRow = variants[variantIdx]
  const modules: CourseModule[] = titleRow.map((title, i) => ({
    title:   interpolateTopic(title, cleaned),
    lessons: (lessonTuples[i] ?? []).map((l) => interpolateTopic(l, cleaned)),
  }))
  const studentIndex = hash(cleaned + "::student") % SAMPLE_STUDENTS.length
  return {
    rawInput,
    topic: cleaned,
    category,
    audienceHint,
    brandHue: CATEGORY_HUE[category],
    modules,
    priceInr: CATEGORY_PRICE[category],
    promiseLines: CATEGORY_PROMISES[category],
    sampleStudentName: SAMPLE_STUDENTS[studentIndex],
  }
}

// Localstorage / sessionstorage key. The signup flow reads from this
// when the visitor converts so the seed becomes their first real
// course draft.
export const COURSE_SEED_STORAGE_KEY = "thebigclass.course-seed.v1"

// Envelope written to sessionStorage — the seed plus an optional
// baked PNG of the cover (with title already drawn on the photo).
// We keep the seed and the thumbnail as siblings so a future tweak
// (e.g. add an audio intro field) doesn't have to migrate the cover.
export interface PersistedSeedEnvelope {
  seed: CourseSeed
  bakedThumbnail?: string  // data: URL (image/jpeg) of the composed cover
}

// Persist a generated seed so the signup flow can pick it up. We
// use sessionStorage (cleared on tab close) — a homepage doodle
// shouldn't follow the user across sessions if they didn't sign up.
export function persistCourseSeed(seed: CourseSeed, bakedThumbnail?: string): void {
  if (typeof window === "undefined") return
  try {
    const envelope: PersistedSeedEnvelope = { seed, bakedThumbnail }
    window.sessionStorage.setItem(COURSE_SEED_STORAGE_KEY, JSON.stringify(envelope))
  } catch {
    /* sessionStorage full or disabled — non-fatal */
  }
}

// ---------------------------------------------------------------
// Cover image picker
// ---------------------------------------------------------------
// Picks a real photograph for the course cover via Picsum
// (https://picsum.photos/), which serves random Unsplash photos
// keyed by a deterministic seed. We tried Loremflickr first but it
// rate-limited / 404'd intermittently — the photo showed in the
// homepage SVG preview but came back broken when the same URL was
// rendered through a plain <img> on the dashboard card. Picsum is
// slower-changing, has zero rate limits, and the same seed always
// returns the same image — exactly what we want.
//
// Picsum isn't topic-aware. We bias the seed with a category prefix
// (so all yoga courses pull from a different deterministic bucket
// than all coding courses) — the photos themselves are just
// "interesting photographs", not category-specific. The course title
// shows below the image on the card, so a beautiful generic photo
// reads as the cover; the title carries the meaning.

/**
 * Build a cover image URL for the seed. Same topic always picks
 * the same image (deterministic seed), different topics get
 * different images. Picsum URLs are plain ASCII — no escaping
 * gotchas, no rate limits, no CORS quirks.
 */
export function pickCoverImageUrl(seed: CourseSeed): string {
  const topicSlug = seed.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
  const picsumSeed = `${seed.category}-${topicSlug}-${hash(seed.topic) % 99999}`
  return `https://picsum.photos/seed/${encodeURIComponent(picsumSeed)}/800/500`
}

// ---------------------------------------------------------------
// Cover SVG renderer (kept for callers who still want an inline
// fallback — exports are unchanged so the type contract holds, but
// it's no longer used by the default course-creation path).
// ---------------------------------------------------------------
// Produces a fully self-contained SVG string for the course cover.
// We left this in place as a graceful fallback if the external
// image search ever stops responding.

// Module + lesson counts come from the seed; everything else is
// derived from the seed's category for category-specific motif
// rendering.
export interface CoverArtOptions {
  seed: CourseSeed
  // Optional override for the workspace mark in the top-right.
  // Defaults to "thebigclass" — the same wordmark we render in
  // the live preview component.
  brandLabel?: string
}

// Escape XML special characters in user-typed strings before they
// hit a <text> element. Without this an apostrophe + ampersand in
// the topic can corrupt the SVG.
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// SVG <text> doesn't auto-wrap. Hand-rolled word wrap by character
// budget — good enough for the topic strings we feed it (1-4 words
// typically). Returns an array of lines.
function wrapTitle(input: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = input.split(/\s+/).filter(Boolean)
  if (words.length === 0) return [input]
  const lines: string[] = []
  let current = ""
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w
    if (candidate.length <= maxCharsPerLine || current === "") {
      // Allow a long single word to overflow rather than break it
      // mid-word — better visual outcome than a hyphen.
      current = candidate
    } else {
      lines.push(current)
      current = w
      if (lines.length >= maxLines - 1) {
        // We're on the last allowed line — pack remaining words in
        // and ellipsise.
        const remaining = [w, ...words.slice(words.indexOf(w) + 1)].join(" ")
        const truncated =
          remaining.length > maxCharsPerLine
            ? remaining.slice(0, maxCharsPerLine - 1).trimEnd() + "…"
            : remaining
        lines.push(truncated)
        return lines
      }
    }
  }
  if (current) lines.push(current)
  return lines
}

// Topic-aware motif SVG fragment. Mirrors the React CoverMotif in
// instant-course-builder.tsx; kept as a duplicate here because this
// fn runs in a pure-string context (no JSX).
function motifSvg(category: CourseCategory): string {
  if (category === "yoga" || category === "wellness") {
    const rings = [140, 100, 60]
      .map(
        (r, i) =>
          `<circle cx="640" cy="120" r="${r}" fill="none" stroke="white" stroke-width="${1 + i * 0.4}"/>`,
      )
      .join("")
    const dots = [0, 45, 90, 135, 180, 225, 270, 315]
      .map((deg) => {
        const rad = (deg * Math.PI) / 180
        const cx = 640 + Math.cos(rad) * 90
        const cy = 120 + Math.sin(rad) * 90
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="white"/>`
      })
      .join("")
    return `<g opacity="0.35">${rings}${dots}</g>`
  }
  if (category === "coding") {
    return `<g opacity="0.3" stroke="white" stroke-width="6" fill="none" stroke-linecap="round">
      <path d="M600 90 L560 150 L600 210"/>
      <path d="M720 90 L760 150 L720 210"/>
      <line x1="650" y1="220" x2="685" y2="80"/>
    </g>`
  }
  if (category === "math") {
    let dots = ""
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 12; col++) {
        dots += `<circle cx="${70 + col * 60}" cy="${380 + row * 18}" r="1.4" fill="white" opacity="0.22"/>`
      }
    }
    return `<g>${dots}</g>`
  }
  if (category === "finance" || category === "business") {
    const bars = [80, 50, 100, 65, 120, 90, 140, 110]
      .map(
        (h, i) =>
          `<rect x="${560 + i * 26}" y="${210 - h}" width="14" height="${h}" rx="2" fill="white"/>`,
      )
      .join("")
    return `<g opacity="0.4">${bars}<line x1="555" y1="212" x2="780" y2="212" stroke="white" stroke-width="1.5"/></g>`
  }
  if (category === "language") {
    return `<g opacity="0.18">
      <text x="600" y="170" font-family="serif" font-size="120" font-weight="700" fill="white">A</text>
      <text x="700" y="120" font-family="serif" font-size="80" font-weight="700" fill="white">あ</text>
      <text x="540" y="120" font-family="serif" font-size="80" font-weight="700" fill="white">अ</text>
    </g>`
  }
  if (category === "exam-prep") {
    return `<g opacity="0.3" fill="white">
      <text x="600" y="170" font-family="serif" font-size="160" font-weight="800">?</text>
      <path d="M720 130 L740 160 L780 100" stroke="white" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`
  }
  if (category === "creative") {
    return `<g opacity="0.35">
      <path d="M520 200 Q620 60 760 140" stroke="white" stroke-width="14" stroke-linecap="round" fill="none"/>
      <circle cx="760" cy="140" r="14" fill="white"/>
    </g>`
  }
  // default — soft starburst
  const lines = Array.from({ length: 14 })
    .map((_, i) => {
      const deg = (i * 360) / 14
      const rad = (deg * Math.PI) / 180
      const x1 = 640 + Math.cos(rad) * 30
      const y1 = 140 + Math.sin(rad) * 30
      const x2 = 640 + Math.cos(rad) * 90
      const y2 = 140 + Math.sin(rad) * 90
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="white" stroke-width="2" stroke-linecap="round"/>`
    })
    .join("")
  return `<g opacity="0.28">${lines}</g>`
}

/**
 * Render the full course cover as a standalone SVG string. All text
 * is inside the SVG — eyebrow, brand mark, audience hint, multi-line
 * title, and three info pills (modules / lessons / Certificate).
 *
 * Output is meant to be either:
 *   1. Used as the `src` of an <img> via a data: URL (see
 *      `coverSvgToDataUrl`), or
 *   2. Written to disk verbatim — a designer can open it in Figma
 *      and tweak it.
 */
export function renderCoverSvg({ seed, brandLabel = "thebigclass" }: CoverArtOptions): string {
  const hue = seed.brandHue
  const totalLessons = seed.modules.reduce((n, m) => n + m.lessons.length, 0)
  const titleLines = wrapTitle(seed.topic, 18, 3)
  // Pick a title font size that keeps three lines from overflowing
  // the canvas. 64 looks great on a single line; 52 on two or three.
  const titleFontSize = titleLines.length === 1 ? 64 : 52
  const titleLineHeight = titleFontSize * 1.05
  // Anchor the title block to the bottom-left padding; each line
  // stacks downward from the first y position we set.
  const titleAnchorY = 380 - (titleLines.length - 1) * titleLineHeight
  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="48" y="${(titleAnchorY + i * titleLineHeight).toFixed(1)}">${xmlEscape(line)}</tspan>`,
    )
    .join("")
  const safeTopic = xmlEscape(seed.topic)
  const safeBrand = xmlEscape(brandLabel.toUpperCase())
  // IMPORTANT: uppercase before xml-escape, otherwise an ampersand
  // gets escaped to "&amp;" and the toUpperCase() call turns it into
  // "&AMP;" — an invalid XML entity that crashes parsers.
  const safeCat = xmlEscape(CATEGORY_LABEL[seed.category].toUpperCase())
  const safeAudience = seed.audienceHint
    ? xmlEscape(`For ${seed.audienceHint}`.toUpperCase())
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${safeTopic}">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="hsl(${hue}, 78%, 58%)"/>
      <stop offset="55%" stop-color="hsl(${(hue + 20) % 360}, 70%, 42%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 50) % 360}, 64%, 24%)"/>
    </linearGradient>
    <radialGradient id="lightA" cx="0.15" cy="0.10" r="0.5">
      <stop offset="0%"  stop-color="rgba(255,255,255,0.55)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <radialGradient id="lightB" cx="0.95" cy="0.85" r="0.6">
      <stop offset="0%"  stop-color="hsl(${(hue + 80) % 360}, 90%, 70%)" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <linearGradient id="titleSheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="rgba(255,255,255,1)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.78)"/>
    </linearGradient>
  </defs>

  <!-- background + ambient lights -->
  <rect width="800" height="500" fill="url(#grad)"/>
  <rect width="800" height="500" fill="url(#lightA)"/>
  <rect width="800" height="500" fill="url(#lightB)"/>

  <!-- category motif (decorative) -->
  ${motifSvg(seed.category)}

  <!-- eyebrow chip (top-left) -->
  <g>
    <rect x="40"  y="40" rx="14" ry="14" width="${10 + safeCat.length * 7.2}" height="22" fill="rgba(255,255,255,0.15)"/>
    <text x="50" y="55" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="white">${safeCat.toUpperCase()}</text>
  </g>

  <!-- brand mark (top-right) -->
  <text x="760" y="55" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="500" letter-spacing="1.5" fill="white" opacity="0.8">${safeBrand.toUpperCase()}</text>

  ${
    safeAudience
      ? `<!-- audience hint (above the title) -->
  <text x="48" y="${(titleAnchorY - 24).toFixed(1)}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" letter-spacing="2.5" fill="white" opacity="0.85">${safeAudience.toUpperCase()}</text>`
      : ""
  }

  <!-- title (multi-line) -->
  <text
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${titleFontSize}"
    font-weight="700"
    fill="url(#titleSheen)"
    style="letter-spacing: -0.5px;"
  >${titleTspans}</text>

  <!-- info pills (bottom-left) -->
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="white">
    <g>
      <rect x="48" y="424" rx="4" ry="4" width="92" height="22" fill="rgba(0,0,0,0.22)"/>
      <text x="58" y="439">${seed.modules.length} modules</text>
    </g>
    <g>
      <rect x="148" y="424" rx="4" ry="4" width="92" height="22" fill="rgba(0,0,0,0.22)"/>
      <text x="158" y="439">${totalLessons} lessons</text>
    </g>
    <g>
      <rect x="248" y="424" rx="4" ry="4" width="92" height="22" fill="rgba(0,0,0,0.22)"/>
      <text x="258" y="439">Certificate</text>
    </g>
  </g>
</svg>`
}

/**
 * Encode a cover SVG string as a data: URL safe for use in <img src>
 * or anywhere else a URL is expected (e.g. the Course.thumbnail
 * field). We URL-encode rather than base64 because URL encoding is
 * smaller for SVG and renders identically in every browser.
 */
export function coverSvgToDataUrl(svg: string): string {
  const cleaned = svg.replace(/\s+/g, " ").trim()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`
}

// ---------------------------------------------------------------
// Lesson body content generator
// ---------------------------------------------------------------
// Beyond the title + 1-2 line description, the teacher landing in
// the dashboard sees better autopilot when each lesson ships with a
// real, editable body — a walkthrough scaffold, an exercise prompt,
// and a takeaways block. This is what populates `lesson.content`
// (markdown) so when the creator clicks into the lesson editor
// they're staring at scaffold copy, not an empty textarea.
function lessonContent(args: {
  topic: string
  category: CourseCategory
  moduleTitle: string
  lessonTitle: string
  isFirstLesson: boolean
  isLastLesson: boolean
}): string {
  const { topic, category, moduleTitle, lessonTitle, isFirstLesson, isLastLesson } = args
  const tShort = topic.replace(/\s+for\s+.+$/i, "").trim() || "this topic"
  const tLower = tShort.toLowerCase()

  // Category-aware walkthrough steps. Each entry is a 3-step
  // outline tailored to how a lesson in that domain typically reads.
  const walkthroughSteps: Record<CourseCategory, string[]> = {
    math: [
      `Set the problem. Define what "${lessonTitle.toLowerCase()}" looks like with one concrete example.`,
      "Work it on paper. Show the steps clearly, narrating the why behind each one.",
      "Generalise. Pull out the rule the students can apply on their own.",
    ],
    yoga: [
      "Set up the body. Cue the breath, the gaze, and the foundation of the pose.",
      `Move into "${lessonTitle.toLowerCase()}" — slow tempo, hold for 5 breaths.`,
      "Counterpose + recover. A simple shape to release any tension just built up.",
    ],
    coding: [
      `Set up. Open the editor, scaffold a minimal file for "${lessonTitle.toLowerCase()}".`,
      "Demo. Type the code live; explain each line as you go.",
      "Save + run. Confirm it works; commit the snapshot for the student to reference.",
    ],
    finance: [
      `Frame it in rupees. One concrete number that "${lessonTitle.toLowerCase()}" applies to.`,
      "Work the math. Show the calculation with intermediate steps.",
      "Generalise. The rule of thumb students can carry into their own situation.",
    ],
    language: [
      "Listen first. Play the native-speaker clip; have learners mimic intonation.",
      `Drill 3 example phrases that use "${lessonTitle.toLowerCase()}".`,
      "Pair practice. Two-line dialogue students rehearse with a partner.",
    ],
    "exam-prep": [
      "Concept recap. The high-yield idea behind this question type, in plain language.",
      `Solve a past-paper question on "${lessonTitle.toLowerCase()}" with full marking-scheme commentary.`,
      "Common traps. Two things students typically get wrong here + how to avoid them.",
    ],
    creative: [
      "Demonstrate. Show your hand doing the technique — slow, repeated, in full view.",
      `Students try "${lessonTitle.toLowerCase()}" on a small canvas / phrase / loop.`,
      "Critique. Two things that worked; one thing to push further next time.",
    ],
    wellness: [
      "Why this matters. One sentence on what changes when this becomes a habit.",
      `Walk through "${lessonTitle.toLowerCase()}" — the exact micro-routine.`,
      "Track it. The single metric to watch over the next week.",
    ],
    business: [
      `Diagnose. What "${lessonTitle.toLowerCase()}" looks like working vs broken.`,
      "Template. The 1-page artefact students leave the lesson holding.",
      "Apply. A 10-minute exercise they do before the next lesson.",
    ],
    general: [
      `Set the frame. What we mean by "${lessonTitle.toLowerCase()}" + why it matters.`,
      "Walk through one worked example, step by step.",
      "Try it. A small exercise students complete before moving on.",
    ],
  }

  const tryIt: Record<CourseCategory, string> = {
    math:        `**Try it:** Solve 3 problems applying "${lessonTitle.toLowerCase()}" on your own. Aim for 2 minutes each. The solutions are at the bottom of this lesson.`,
    yoga:        `**Try it:** Hold the shape for 5 deep breaths. Note one thing that felt easier than expected and one thing that surprised you.`,
    coding:      `**Try it:** Modify the example to do something *slightly* different — change one variable, one parameter, one input. Run it and predict what happens before you do.`,
    finance:     `**Try it:** Plug your own numbers into the worked example. Write down the result and what surprised you.`,
    language:    `**Try it:** Record yourself saying the three example phrases out loud. Play it back. Note the one sound you want to work on next.`,
    "exam-prep": `**Try it:** Attempt one past-paper question on "${lessonTitle.toLowerCase()}" untimed. Then time yourself on the second attempt. Compare both.`,
    creative:    `**Try it:** 10-minute exercise — pick a small subject and apply the technique. Don't aim for finished; aim for explored.`,
    wellness:    `**Try it:** Schedule the micro-routine for the same time tomorrow morning. Set a reminder before you close this lesson.`,
    business:    `**Try it:** Fill in the template with one example from your own business / idea / portfolio. Don't try to make it perfect.`,
    general:     `**Try it:** Apply one idea from this lesson to your own work in the next 24 hours. Note what worked.`,
  }

  const takeaways: Record<CourseCategory, string[]> = {
    math: [
      "The rule, restated in your own words.",
      "When to use this technique vs. when to switch to a different one.",
      "One mistake to watch for in exam conditions.",
    ],
    yoga: [
      "The breath pattern that anchors this shape.",
      "The most common alignment correction.",
      "When to skip / modify this asana — listen to your body.",
    ],
    coding: [
      "The smallest working snippet, ready to copy-paste.",
      "The single concept this lesson exists to teach.",
      "What you'd Google if you forgot the syntax tomorrow.",
    ],
    finance: [
      "The formula or rule of thumb, in plain language.",
      "The number you should track monthly going forward.",
      "One common mistake to avoid.",
    ],
    language: [
      "The phrase you'll use most often.",
      "The grammar rule that connects this to the next lesson.",
      "One pronunciation tip specific to your mother tongue.",
    ],
    "exam-prep": [
      "The high-yield concept, in one sentence.",
      "The marking-scheme pattern examiners reward.",
      "The trap that costs students the most marks here.",
    ],
    creative: [
      "The single technique you practised.",
      "The detail that separates a beginner attempt from a confident one.",
      "What to study from someone else's work to push this further.",
    ],
    wellness: [
      "The routine, in one sentence.",
      "The metric you'll track.",
      "The condition under which you back off / modify.",
    ],
    business: [
      "The artefact you walked away with.",
      "The metric to watch on this part of the business.",
      "The next-action that compounds.",
    ],
    general: [
      "The core idea, in one sentence.",
      "The technique that ties it together.",
      "What you'd practise to lock it in.",
    ],
  }

  const positionTag = isFirstLesson
    ? "Section opener."
    : isLastLesson
      ? "Section closer."
      : ""

  const steps = walkthroughSteps[category]
    .map((step, i) => `${i + 1}. ${step}`)
    .join("\n")

  const takes = takeaways[category]
    .map((t) => `- ${t}`)
    .join("\n")

  // Compact template — keeps the three useful sections
  // (walkthrough / practice / takeaways) but drops the framing
  // paragraphs and scaffold disclaimer that bloated each seeded
  // lesson to ~1.5 KB. Cuts the localStorage footprint of a
  // generated course in half. Topic still appears via the steps;
  // the teacher fills in the rest in the editor.
  return `**${positionTag ? positionTag + " " : ""}On ${lessonTitle.toLowerCase()}** — in the context of ${tLower}.

**Walkthrough**

${steps}

**Practice**

${tryIt[category]}

**Takeaways**

${takes}`
}

// ---------------------------------------------------------------
// Lesson description generator
// ---------------------------------------------------------------
// Lesson titles are short (3-5 words). A teacher landing in the
// dashboard sees better autopilot when each lesson also has a
// 1-2 sentence "what we'll cover here" line — that's what this
// helper produces, derived purely from the lesson title + the
// module + the topic.
function lessonDescription(args: {
  topic: string
  category: CourseCategory
  moduleTitle: string
  lessonTitle: string
  isFirstLesson: boolean
  isLastLesson: boolean
}): string {
  const { topic, category, moduleTitle, lessonTitle, isFirstLesson, isLastLesson } = args
  const tShort = topic.replace(/\s+for\s+.+$/i, "").trim() || "this topic"
  const tLower = tShort.toLowerCase()
  if (isFirstLesson) {
    return `Kick off the section with a clear picture of what '${lessonTitle.toLowerCase()}' looks like in ${tLower}, why it matters, and what you'll be able to do by the end.`
  }
  if (isLastLesson) {
    return `Tie '${lessonTitle.toLowerCase()}' back to everything in '${moduleTitle.toLowerCase()}' with a short worked example you can revisit any time.`
  }
  // Mid-lesson — category-specific framing.
  switch (category) {
    case "yoga":
    case "wellness":
      return `Walk through '${lessonTitle.toLowerCase()}' step by step — breath cues, common corrections, and a 5-minute practice block at the end.`
    case "coding":
      return `Hands-on lesson on '${lessonTitle.toLowerCase()}' — a short walkthrough, a code-along, and one exercise you'll commit to your own repo.`
    case "math":
      return `Build intuition for '${lessonTitle.toLowerCase()}' with three worked examples, then practise on a curated mini-set with full solutions.`
    case "finance":
    case "business":
      return `Practical lesson on '${lessonTitle.toLowerCase()}' — concrete examples in Indian rupees, a downloadable worksheet, and the questions to ask yourself before acting.`
    case "language":
      return `Speak + listen practice for '${lessonTitle.toLowerCase()}'. Native-speaker audio, drill phrases, and a short conversation you'll be able to hold by the end.`
    case "exam-prep":
      return `Targeted prep on '${lessonTitle.toLowerCase()}' — high-yield content, past-paper patterns, and a quick mock so you know where you stand.`
    case "creative":
      return `Studio time on '${lessonTitle.toLowerCase()}' — a demo, a short exercise, and a critique prompt to push your piece further.`
    default:
      return `A focused lesson on '${lessonTitle.toLowerCase()}' inside ${tLower}. Keep it short, finish the exercise, move on.`
  }
}

// Friendly category labels for the eyebrow / preview UI.
export const CATEGORY_LABEL: Record<CourseCategory, string> = {
  math:        "Math & numeracy",
  yoga:        "Yoga & movement",
  coding:      "Coding & tech",
  finance:     "Finance & money",
  language:    "Language learning",
  "exam-prep": "Exam prep",
  creative:    "Creative arts",
  wellness:    "Wellness & habits",
  business:    "Business & freelance",
  general:     "General learning",
}

// Read the persisted seed back from sessionStorage. Returns null if
// nothing was saved or the saved blob is unreadable. The signup
// flow uses this to (a) show a "your course is waiting" preview
// in the left rail and (b) drop the seed in as a draft course
// in the new workspace's lms.courses.v1 slice on conversion.
//
// Backwards-compatible: tolerates the older flat-seed format (no
// envelope wrapper) so a tab that still has an old persisted seed
// loaded doesn't break after this version ships.
export function readPersistedSeed(): CourseSeed | null {
  const env = readPersistedSeedEnvelope()
  return env?.seed ?? null
}

// Read the full envelope (seed + optional baked thumbnail). Used
// by the signup flow when it needs both — the seed for the
// course skeleton, the thumbnail to set as the saved cover.
export function readPersistedSeedEnvelope(): PersistedSeedEnvelope | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(COURSE_SEED_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    // New envelope format.
    if ("seed" in parsed) {
      const env = parsed as PersistedSeedEnvelope
      if (!env.seed || !Array.isArray(env.seed.modules) || !env.seed.topic) return null
      return env
    }
    // Legacy flat-seed format (no envelope wrapper).
    const legacy = parsed as CourseSeed
    if (!Array.isArray(legacy.modules) || !legacy.topic) return null
    return { seed: legacy }
  } catch {
    return null
  }
}

export function clearPersistedSeed(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(COURSE_SEED_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// Shape that matches the lms.courses.v1 slice the dashboard reads
// from. Kept loose (records of strings) because the seeded course
// is a draft — the creator will edit titles + add real content
// before publishing.
export interface DraftCourse {
  id: string
  slug: string
  title: string
  description: string
  thumbnail: string            // data: URL of the generated SVG cover
  priceInr: number
  status: "draft"
  createdAt: string
  source: "homepage-builder-widget"
  modules: Array<{
    id: string
    title: string
    description: string
    lessons: Array<{
      id: string
      title: string
      description: string
      type: "video" | "text"
    }>
  }>
}

function smallId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled"
}

// Shape that matches the full Course type the LMS dashboard works
// with. Kept as a structural alias (not an import of Course) so
// this lib stays free of lms-store types — bundlers don't drag the
// store into the home-page chunk just to compute a default object.
export interface FullCourseInput {
  id: string
  title: string
  subtitle?: string
  slug: string
  description: string
  thumbnail: string
  instructor: { id: string; name: string; email: string; role: string }
  price: number
  currency: string
  category: string
  tags: string[]
  level: "beginner" | "intermediate" | "advanced"
  language: string
  modules: Array<{
    id: string
    title: string
    description: string
    order: number
    lessons: Array<{
      id: string
      title: string
      description: string
      type: "video" | "text"
      content: string
      duration: number
      order: number
      isPreview: boolean
    }>
  }>
  totalDuration: number
  totalLessons: number
  enrolledCount: number
  rating: number
  reviewCount: number
  status: "draft"
  features: string[]
  requirements: string[]
  whatYouLearn: string[]
  certificateTemplate: string
  createdAt: string
  updatedAt: string
}

const CATEGORY_TO_TAXONOMY: Record<CourseCategory, { category: string; level: "beginner" | "intermediate" | "advanced" }> = {
  math:        { category: "Education",         level: "beginner" },
  yoga:        { category: "Health & Fitness",  level: "beginner" },
  coding:      { category: "Technology",        level: "beginner" },
  finance:     { category: "Business",          level: "beginner" },
  language:    { category: "Language",          level: "beginner" },
  "exam-prep": { category: "Education",         level: "intermediate" },
  creative:    { category: "Arts",              level: "beginner" },
  wellness:    { category: "Health & Fitness",  level: "beginner" },
  business:    { category: "Business",          level: "beginner" },
  general:     { category: "General",           level: "beginner" },
}

/**
 * Convert a CourseSeed into the full Course shape the LMS dashboard
 * expects. Used by signed-in flows where the visitor's "Save as my
 * first course" should immediately create a real course they can
 * edit, not a half-shaped draft envelope.
 */
export function seedToFullCourse(
  seed: CourseSeed,
  instructor: { id: string; name: string; email: string; role: string },
  options?: { thumbnailOverride?: string },
): FullCourseInput {
  const now = new Date().toISOString()
  const taxonomy = CATEGORY_TO_TAXONOMY[seed.category]
  const totalLessons = seed.modules.reduce((n, m) => n + m.lessons.length, 0)
  // Cover precedence: a baked PNG (passed in by the homepage
  // composer that drew the title onto the photo) wins, falling
  // back to the bare Loremflickr URL when bake failed for any
  // reason (CORS, network, etc.).
  const thumbnail = options?.thumbnailOverride ?? pickCoverImageUrl(seed)
  return {
    id:    smallId("course"),
    title: seed.topic,
    subtitle: seed.audienceHint ? `Designed for ${seed.audienceHint}` : undefined,
    slug:  slugify(seed.topic),
    description: [
      seed.promiseLines.join(". "),
      seed.audienceHint ? `Designed for ${seed.audienceHint}.` : null,
    ].filter(Boolean).join(" "),
    thumbnail,
    instructor,
    price:    seed.priceInr,
    currency: "INR",
    category: taxonomy.category,
    tags:     [seed.category, ...(seed.audienceHint ? [seed.audienceHint] : [])],
    level:    taxonomy.level,
    language: "English",
    modules:  seed.modules.map((m, mi) => ({
      id:    smallId("module"),
      title: m.title,
      description: `Section ${mi + 1} of ${seed.modules.length} — ${m.lessons.length} short lessons. ${
        mi === 0
          ? "Start here."
          : mi === seed.modules.length - 1
            ? "Wrap up + apply what you've learned."
            : "Builds on the previous section."
      }`,
      order: mi,
      lessons: m.lessons.map((title, li) => ({
        id:          smallId("lesson"),
        title,
        description: lessonDescription({
          topic: seed.topic,
          category: seed.category,
          moduleTitle: m.title,
          lessonTitle: title,
          isFirstLesson: li === 0,
          isLastLesson: li === m.lessons.length - 1,
        }),
        // Default to "text" so `content` actually renders as the
        // lesson body — markdown the teacher can edit into a real
        // lesson without first having to switch the lesson type.
        type:        "text" as const,
        content:     lessonContent({
          topic: seed.topic,
          category: seed.category,
          moduleTitle: m.title,
          lessonTitle: title,
          isFirstLesson: li === 0,
          isLastLesson: li === m.lessons.length - 1,
        }),
        duration:    15,
        order:       li,
        isPreview:   li === 0 && mi === 0, // first lesson free preview
      })),
    })),
    totalDuration: totalLessons * 15,
    totalLessons,
    enrolledCount: 0,
    rating:        0,
    reviewCount:   0,
    status:        "draft",
    features:      seed.promiseLines,
    requirements:  [],
    whatYouLearn:  seed.modules.map((m) => m.title),
    certificateTemplate: "modern-gold", // safe default; teacher can swap later
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Convert a CourseSeed (homepage widget output) into a draft course
 * the dashboard can load. The signup flow writes the result into
 * the new tenant's lms.courses.v1 slice immediately after tenant
 * registration so the creator sees "your first course" already
 * waiting in the dashboard on first load.
 */
export function seedToDraftCourse(
  seed: CourseSeed,
  options?: { thumbnailOverride?: string },
): DraftCourse {
  const createdAt = new Date().toISOString()
  return {
    id:    smallId("course"),
    slug:  slugify(seed.topic),
    title: seed.topic,
    description: [
      seed.promiseLines.join(". "),
      seed.audienceHint ? `Designed for ${seed.audienceHint}.` : null,
    ].filter(Boolean).join(" "),
    thumbnail: options?.thumbnailOverride ?? pickCoverImageUrl(seed),
    priceInr:  seed.priceInr,
    status:    "draft",
    createdAt,
    source:    "homepage-builder-widget",
    modules:   seed.modules.map((m, mi) => ({
      id:    smallId("module"),
      title: m.title,
      description: `Section ${mi + 1} of ${seed.modules.length} — ${m.lessons.length} short lessons.`,
      lessons: m.lessons.map((title, li) => ({
        id:    smallId("lesson"),
        title,
        description: lessonDescription({
          topic: seed.topic,
          category: seed.category,
          moduleTitle: m.title,
          lessonTitle: title,
          isFirstLesson: li === 0,
          isLastLesson: li === m.lessons.length - 1,
        }),
        // Default to "video" — the most common lesson kind. The
        // creator can flip individual lessons to text/quiz/assignment
        // in the dashboard.
        type: "video" as const,
      })),
    })),
  }
}
