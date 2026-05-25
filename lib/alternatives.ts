// Data source for /alternatives/<slug> SEO pages.
//
// Each entry describes one named rival platform. The shared page
// renders all of them with the same shape so adding a 7th is a
// one-entry append.
//
// Editorial rules:
//   • State facts about the rival that are public on their pricing
//     or feature pages. No invented numbers.
//   • Use "Most teachers report" / "frequently raised" / "regularly
//     surfaces in reviews" framing instead of definitive negative
//     claims when the data isn't from the rival's own page.
//   • Migration steps describe what we actually support — CSV import,
//     workspace export, branding apply, etc.
//   • Tone is comparative-but-respectful: the visitor is leaving a
//     tool they probably liked at some point. Don't pile on.

export type Verdict = "yes" | "partial" | "no"

export interface FeatureMatrixRow {
  feature: string
  detail: string
  rival:  { kind: Verdict; note?: string }
  ours:   { kind: Verdict; note?: string }
}

export interface AlternativeEntry {
  slug: string
  name: string
  /** Short body for menu + meta description. */
  shortPitch: string
  /** Hero subhead — long-form value pitch. */
  heroSubhead: string
  /** 3-4 above-the-fold check bullets. */
  heroBullets: string[]
  /** 3-6 pain points teachers leaving this rival typically cite. */
  painPoints: Array<{ title: string; body: string }>
  /** Per-USP contrast copy. Re-used across all 8 pages with rival-
   *  specific phrasing. */
  uspContrasts: {
    commission: string
    dataPortability: string
    bundled: string
    indiaFirst: string
  }
  /** 8-12 row feature-vs-rival matrix. */
  featureMatrix: FeatureMatrixRow[]
  /** 5-step migration playbook. */
  migrationSteps: string[]
  /** 4-6 frequent questions. */
  faqs: Array<{ q: string; a: string }>
  /** Closing CTA headline. */
  ctaHeadline: string
  /** Optional cost-calculator inputs. Drives the visual savings
   *  estimator on the alternative page. */
  costExample?: {
    monthlyRevenueINR: number
    rivalEffectiveRate: number   // e.g. 0.05 for 5% transaction fee
    rivalRateLabel: string       // "5% on Basic plan"
    monthlySubscriptionINR?: number // their plan fee, if relevant
  }
  /** Tints the hero illustration + accent across the page. */
  accent: "blue" | "purple" | "teal" | "pink" | "orange" | "indigo" | "amber" | "rose"
  /** One-word vibe shown in the hero ribbon under the H1. */
  category: string
}

const COMMON_FEATURES = (rival: string, opts: {
  rivalCommissionNote?: string
  rivalCommunity?: Verdict
  rivalLiveClasses?: Verdict
  rivalLiveNote?: string
  rivalIndiaPay?: Verdict
  rivalExport?: Verdict
  rivalExportNote?: string
}): FeatureMatrixRow[] => [
  {
    feature: "Live classes built into the platform",
    detail: "Schedule, host, record without renting a third-party seat.",
    rival: { kind: opts.rivalLiveClasses ?? "no", note: opts.rivalLiveNote },
    ours:  { kind: "yes", note: "LiveKit-powered, polls + hands + agenda built in" },
  },
  {
    feature: "Recordings with chapters + transcript",
    detail: "Auto-chapter markers parsed from the transcript; chat persists alongside the video.",
    rival: { kind: "no" },
    ours:  { kind: "yes" },
  },
  {
    feature: "Whiteboard with 25+ templates",
    detail: "K-12 grade-band scaffolds, brainstorms, SWOT, mind maps. Multi-cursor.",
    rival: { kind: "no" },
    ours:  { kind: "yes" },
  },
  {
    feature: "Quizzes with 18 ready templates",
    detail: "Including entrance-prep scaffolds (JEE / NEET / GMAT) + code review + essay rubrics.",
    rival: { kind: "partial", note: "Generic quizzes — no entrance-test or code templates" },
    ours:  { kind: "yes" },
  },
  {
    feature: "Cohort community with @-mentions",
    detail: "Post types (Announcement / Question / Win / Discussion), member directory.",
    rival: { kind: opts.rivalCommunity ?? "partial", note: opts.rivalCommunity === "yes" ? undefined : "Community add-on, usually paid" },
    ours:  { kind: "yes" },
  },
  {
    feature: "Certificates with designer + verify",
    detail: "17+ templates, drag-drop designer, bulk-issue from CSV, public verify URL.",
    rival: { kind: "partial", note: "PDF only, no designer" },
    ours:  { kind: "yes" },
  },
  {
    feature: "Zero commission on creator earnings",
    detail: "Flat subscription, no per-transaction skim by the platform.",
    rival: { kind: "partial", note: opts.rivalCommissionNote ?? "Charged on lower tiers / specific products" },
    ours:  { kind: "yes" },
  },
  {
    feature: "Workspace export (CSV / JSON)",
    detail: "Per-entity + full-workspace dump on every plan, free tier included.",
    rival: { kind: opts.rivalExport ?? "partial", note: opts.rivalExportNote ?? "CSV only, often gated on paid tier" },
    ours:  { kind: "yes" },
  },
  {
    feature: "India-native (UPI + WhatsApp + INR)",
    detail: "Native UPI checkout, WhatsApp notifications, Hindi / Tamil portals.",
    rival: { kind: opts.rivalIndiaPay ?? "no" },
    ours:  { kind: "yes" },
  },
]

const COMMON_USP = (rival: string): AlternativeEntry["uspContrasts"] => ({
  commission:      `Most ${rival} sellers we've talked to wanted a flat subscription with no per-sale percentage. That's what we ship — payments settle from your own gateway account straight to your bank, and the platform never sees the money.`,
  dataPortability: `Your students, your courses, your orders — all exportable to CSV or JSON in one click on every plan (including the free Starter tier). No "upgrade to export" gate.`,
  bundled:         `${rival} typically covers 2-3 surfaces and assumes you'll bolt the rest with other subscriptions. We ship live classes + courses + community + whiteboard + quizzes + certificates + the analytics view — one login, one student record, one bill.`,
  indiaFirst:      `UPI native, WhatsApp notifications built in, Hindi and Tamil portals out of the box. INR pricing without the FX dance. Indian coaching centres and creators don't have to retrofit a US-built platform.`,
})

const COMMON_MIGRATION = (rival: string): string[] => [
  `Export your student roster from ${rival} (most platforms ship a CSV under "Students" or "Members"). Map the columns to name + email + WhatsApp.`,
  `Bulk-import the CSV into /dashboard/students. We dedupe by email so re-running the import is safe.`,
  `Recreate your courses — the curriculum builder lets you drag modules + lessons, paste video embed URLs, and upload PDFs without a wizard. Most teams get 5 courses across in an afternoon.`,
  `Apply your brand — logo, primary colour, custom domain. The portal-template picker has 7 starting points if you want to refresh the look while you're at it.`,
  `Send a one-shot announcement to your students that you've moved, with the new portal URL. The in-app + email + WhatsApp dispatcher fires once; reminders auto-schedule if you want.`,
]

export const ALTERNATIVES: AlternativeEntry[] = [
  // ── Teachable ──────────────────────────────────────────────────
  {
    slug: "teachable",
    name: "Teachable",
    shortPitch: "All-in-one workspace for live + cohort + community — without per-transaction fees on lower tiers.",
    heroSubhead:
      "If you're shipping a course on Teachable but craving live classes, a real cohort community, India-native payments, and zero per-transaction fees on every plan — you're not alone. Most teachers we onboard from Teachable started looking because of either the transaction-fee model or the missing live + community surfaces. Here's a workspace that ships all of it from day one.",
    heroBullets: [
      "Zero per-transaction fees on every plan",
      "Live classes + recordings + whiteboard built in",
      "UPI + WhatsApp + Hindi / Tamil out of the box",
      "One-click workspace export, free tier included",
    ],
    painPoints: [
      { title: "Transaction fees on lower tiers", body: "Per-transaction fees apply on the Free and Basic plans — they only go to zero on the higher subscription. Teachers running on the entry tier feel the squeeze on every sale." },
      { title: "No native live classes", body: "Teaching live means embedding a third-party meeting URL. There's no built-in cohort room with attendance, polls, raised hands, or auto-chaptered recordings." },
      { title: "Community is a separate purchase", body: "The community feature is an add-on, not the same brand-and-billing as the course platform. Switching context between two tools every day adds up." },
      { title: "Branding gates on higher tiers", body: "Stripping the Teachable badge, custom domain, and full white-label come on the Professional plan and up. Solo creators on Basic ship with platform branding visible." },
      { title: "India payments are an afterthought", body: "USD-first checkout, third-party-card-only by default. UPI / Razorpay-style native checkout takes manual setup, and WhatsApp notifications aren't a first-class delivery channel." },
      { title: "Export is partial", body: "Student export and order export work, but a single workspace dump that includes courses, materials, branding, and the rest isn't one click." },
    ],
    uspContrasts: COMMON_USP("Teachable"),
    featureMatrix: COMMON_FEATURES("Teachable", {
      rivalCommissionNote: "5% on Basic, $1+10% on Free",
      rivalCommunity: "partial",
      rivalLiveClasses: "no",
      rivalIndiaPay: "no",
      rivalExport: "partial",
    }),
    migrationSteps: COMMON_MIGRATION("Teachable"),
    faqs: [
      { q: "How long does the Teachable → The Big Class migration take?", a: "A weekend for most teams. Student CSV import takes 5 minutes; recreating 5-10 courses with their materials usually takes a Saturday." },
      { q: "Can I keep my current Teachable domain?", a: "Yes. Drop your CNAME on /dashboard/portal/domain and we'll provision a fresh SSL certificate. Your old Teachable URL can redirect once you flip." },
      { q: "What about my paid students mid-cohort?", a: "Add them as students in your new workspace (the CSV import dedupes by email). Their access carries forward; you can refund and reissue on the new platform if you want a clean ledger." },
      { q: "Do I lose my course completion data?", a: "If you export progress from Teachable as a CSV before migrating, we can import it as a static reference. Forward-looking progress is tracked natively from day one." },
      { q: "What's the actual cost difference?", a: "Depends on your sales volume. If you're processing ~$5,000/month on Teachable Basic with 5% transaction fees, that's $250/month skimmed. Our Studio plan is a fixed monthly cost regardless of sales volume." },
    ],
    ctaHeadline: "Migrate from Teachable this weekend.",
    accent: "blue",
    category: "All-in-one course platform",
    costExample: {
      monthlyRevenueINR: 4_00_000,
      rivalEffectiveRate: 0.05,
      rivalRateLabel: "5% transaction fee on Basic plan",
      monthlySubscriptionINR: 3_300,
    },
  },

  // ── Kajabi ──────────────────────────────────────────────────────
  {
    slug: "kajabi",
    name: "Kajabi",
    shortPitch: "Same all-in-one promise — without the steep starting price or the missing live-class primitive.",
    heroSubhead:
      "Kajabi pioneered the all-in-one creator platform — and creators love the breadth. The two things we hear most from teams leaving: the steep starting price gates serious features behind the higher tiers, and live cohort classes still need a third-party tool bolted on. Here's the same breadth at a fraction of the entry cost, with a real live-class room built into every plan.",
    heroBullets: [
      "Live cohort classes built in — not a third-party embed",
      "Whiteboard + 25+ templates inside every class",
      "Free Starter forever (no 14-day-trial pressure)",
      "UPI + WhatsApp + Hindi / Tamil out of the box",
    ],
    painPoints: [
      { title: "Steep starting price for serious features", body: "Custom domains, removing the platform badge, and the higher contact and product caps live on the mid+ tiers. Solo teachers feel pushed to upgrade before they have the revenue to justify it." },
      { title: "Live classes aren't native", body: "Hosting a cohort means pasting a third-party meeting URL and managing attendance + recording outside the platform. There's no built-in room with polls, raised hands, or chapter-marked recordings." },
      { title: "Community is functional but separate-feeling", body: "Kajabi Communities ship as their own surface. The cohort feed, posts, and mentions work — but the integration with courses and live classes feels assembled rather than woven." },
      { title: "Whiteboard? Not really.", body: "Teaching Class 5 maths, Class 11 chemistry, or a coding workshop? You'd need a separate hosted whiteboard licence on top — Kajabi doesn't ship one." },
      { title: "USD-first, no UPI", body: "Built for the US creator market. UPI / Razorpay-style native checkout means manual integration. WhatsApp notifications aren't a built-in delivery channel." },
    ],
    uspContrasts: COMMON_USP("Kajabi"),
    featureMatrix: COMMON_FEATURES("Kajabi", {
      rivalCommissionNote: "0% on all plans (but high entry-tier subscription)",
      rivalCommunity: "yes",
      rivalLiveClasses: "no",
      rivalIndiaPay: "no",
      rivalExport: "partial",
    }),
    migrationSteps: COMMON_MIGRATION("Kajabi"),
    faqs: [
      { q: "Is The Big Class really cheaper than Kajabi?", a: "On the entry tier, yes — meaningfully. Free Starter ships unlimited students up to a cap; paid plans are flat fees with the same surfaces unlocked on every tier (no 'upgrade to remove our branding' tax)." },
      { q: "Do I lose the email / pipeline features?", a: "We ship a notifications dispatcher (in-app + email + WhatsApp) but don't try to replace a dedicated email marketing platform. Most teams keep their email tool and let us handle the in-product delivery." },
      { q: "Can I host live classes today?", a: "Yes — every plan ships the LiveKit-powered room with polls, raised hands, in-class agenda, and auto-chaptered recordings. No third-party meeting tool required." },
      { q: "What about my Kajabi pipelines and funnels?", a: "Recreate the landing pages with our portal page builder (drag-arranged sections, custom HTML, per-page SEO). Email sequences live in your email tool; we hook into them via the API." },
      { q: "How does data export work?", a: "Per-entity CSV / JSON export is one click from /dashboard/portal/profile. A full workspace dump (every course, student, order, certificate, blog post, brand asset) is also available." },
    ],
    ctaHeadline: "Get the same breadth at the entry tier.",
    accent: "purple",
    category: "All-in-one creator platform",
    costExample: {
      monthlyRevenueINR: 6_00_000,
      rivalEffectiveRate: 0,
      rivalRateLabel: "0% transaction fee, high subscription floor",
      monthlySubscriptionINR: 12_500,
    },
  },

  // ── Thinkific ──────────────────────────────────────────────────
  {
    slug: "thinkific",
    name: "Thinkific",
    shortPitch: "Same course-builder polish — with the live cohort room, the whiteboard, and India-native checkout that Thinkific doesn't.",
    heroSubhead:
      "Thinkific's course builder is genuinely excellent — drag-drop modules, multiple lesson types, clean student player. Most teams leaving aren't unhappy with the course experience. They want what Thinkific doesn't ship: a built-in live cohort room, a teaching whiteboard, native UPI checkout for Indian students, and a cohort community that doesn't require a separate tool. Here's everything they have, plus the rest.",
    heroBullets: [
      "Same drag-drop course builder polish",
      "Plus a native live room with cohort tooling",
      "Plus whiteboard + 25+ teaching templates",
      "UPI · WhatsApp · Hindi · INR — built in",
    ],
    painPoints: [
      { title: "Live classes live outside the product", body: "Thinkific's strength is async courses. To run a live cohort session, you embed a third-party meeting URL and manage attendance + recording externally." },
      { title: "No native whiteboard", body: "Teaching live? You'll need a separate hosted-whiteboard subscription on top. Students sign in to two tools." },
      { title: "Community sold separately", body: "Thinkific Communities is a separate product line. Same student, but two surfaces and two subscriptions to keep aligned." },
      { title: "Transaction fees on the Free plan", body: "The free plan caps you and applies per-transaction fees. Going to zero fees means moving up to a paid plan." },
      { title: "USD-first checkout", body: "Built for the US creator market. UPI / Razorpay-style native checkout requires manual setup. WhatsApp notifications aren't a built-in channel." },
    ],
    uspContrasts: COMMON_USP("Thinkific"),
    featureMatrix: COMMON_FEATURES("Thinkific", {
      rivalCommissionNote: "10% on Free, 0% on paid plans",
      rivalCommunity: "partial",
      rivalLiveClasses: "no",
      rivalIndiaPay: "no",
      rivalExport: "partial",
    }),
    migrationSteps: COMMON_MIGRATION("Thinkific"),
    faqs: [
      { q: "Is the course builder as good as Thinkific's?", a: "It's drag-drop with the same lesson types (video, text, PDF, quiz, download) plus inline embeds for common design tools and slide decks. Most teams find parity by the second course they recreate." },
      { q: "What about my custom student app / branding?", a: "Custom domain + brand colours + logos + 17 fonts ship on every plan, including free. The 7 portal templates give you a starting point if you want to refresh the look while migrating." },
      { q: "Does live class recording attach to a lesson?", a: "Yes — recordings auto-pin to the parent class card, with chapter markers parsed from the transcript and class chat persisted alongside the video." },
      { q: "How do I bring my quizzes across?", a: "Manually for now — most teams take the opportunity to upgrade their question bank by starting from one of our 18 quiz templates (including JEE / NEET / GMAT scaffolds)." },
      { q: "What happens to my Thinkific subdomain?", a: "Keep both running side-by-side during migration. Cut over by updating your CNAME when you're confident the new portal is feature-complete for your students." },
    ],
    ctaHeadline: "Keep the course polish. Add the live room.",
    accent: "teal",
    category: "Course platform",
    costExample: {
      monthlyRevenueINR: 3_00_000,
      rivalEffectiveRate: 0.1,
      rivalRateLabel: "10% transaction fee on Free plan",
      monthlySubscriptionINR: 0,
    },
  },

  // ── Podia ──────────────────────────────────────────────────────
  {
    slug: "podia",
    name: "Podia",
    shortPitch: "Same simplicity — with deeper teaching tooling and India-native payments that Podia doesn't ship.",
    heroSubhead:
      "Podia's pitch is simplicity, and it delivers — selling courses, downloads, and memberships is genuinely easy. What Podia doesn't ship: native live classes with cohort tooling, a teaching whiteboard, entrance-prep quiz templates, and India-native UPI / WhatsApp. Here's the same simplicity, with the depth that coaching centres and serious educators actually need.",
    heroBullets: [
      "Native live cohort classes with polls + hands + agenda",
      "Whiteboard with 25+ K-12 grade-band templates",
      "18 quiz templates (JEE / NEET / GMAT / K-12)",
      "UPI · WhatsApp · Hindi · INR — built in",
    ],
    painPoints: [
      { title: "Live classes aren't a first-class product", body: "Podia ships a basic 'live' product type — but no built-in cohort room with polls, raised hands, chapter-marked recordings, or in-class agenda checklists." },
      { title: "No whiteboard", body: "Coaching K-12 maths, NEET biology, or a code workshop? You'd add a separate hosted-whiteboard subscription on top." },
      { title: "Quizzes are basic", body: "MCQs and a basic question builder — no entrance-prep templates, no code-review formats, no auto-graded rubrics for long-form answers." },
      { title: "Community is light", body: "Posts and comments work, but @-mentions, post types, and a dedicated member directory take you to the edge of what's supported." },
      { title: "USD-first", body: "Built for the US market. UPI / Razorpay-style native checkout requires manual setup. WhatsApp notifications aren't a built-in delivery channel." },
    ],
    uspContrasts: COMMON_USP("Podia"),
    featureMatrix: COMMON_FEATURES("Podia", {
      rivalCommissionNote: "8% on Free, 0% on paid plans",
      rivalCommunity: "partial",
      rivalLiveClasses: "partial",
      rivalLiveNote: "Basic 'live' product type, no cohort tooling",
      rivalIndiaPay: "no",
      rivalExport: "partial",
    }),
    migrationSteps: COMMON_MIGRATION("Podia"),
    faqs: [
      { q: "Is The Big Class as easy to set up as Podia?", a: "60-second signup with a fresh subdomain, drag-drop course builder, one-click portal template. Same simplicity baseline — with the depth on tap when you need it." },
      { q: "Will I lose the simplicity I love about Podia?", a: "Simple-and-Advanced toggles on the course + class forms keep the simple flow as the default. Advanced unlocks the cohort tooling, certificate template designer, and the rest. You opt in when you need it." },
      { q: "Can I sell digital downloads + memberships like I do today?", a: "Yes — 8 product kinds including digital downloads, memberships, bundles, sessions, and license keys. Same checkout experience your buyers expect." },
      { q: "What about live workshops?", a: "Schedule them like any class — students join the built-in cohort room with one tap, you get attendance + recording + auto-chapters for free." },
      { q: "Email marketing?", a: "We ship a cross-channel notifications dispatcher (in-app + email + WhatsApp) for product events. For broadcast email campaigns, keep your dedicated email tool and connect via our API." },
    ],
    ctaHeadline: "Keep it simple. Add the depth.",
    accent: "pink",
    category: "Course + download platform",
    costExample: {
      monthlyRevenueINR: 2_50_000,
      rivalEffectiveRate: 0.08,
      rivalRateLabel: "8% transaction fee on Free plan",
      monthlySubscriptionINR: 0,
    },
  },

  // ── Gumroad ────────────────────────────────────────────────────
  {
    slug: "gumroad",
    name: "Gumroad",
    shortPitch: "When you outgrow the link-in-bio checkout — and need courses, classes, community, and a real student record.",
    heroSubhead:
      "Gumroad is brilliant for one-shot digital sales — a link, a checkout, done. But when your audience grows and they start asking for cohort access, live sessions, a community to hang out in, or progress tracking — Gumroad shows its checkout-first nature. Most creators we onboard from Gumroad aren't unhappy with checkout; they've just outgrown the surface around it. Here's the rest of the academy, bolted onto the same simplicity.",
    heroBullets: [
      "Sell courses, memberships, sessions — not just downloads",
      "Live cohort classes + recordings + community built in",
      "Per-student progress tracking + certificates",
      "Lower long-term cost than Gumroad's transaction fees on volume",
    ],
    painPoints: [
      { title: "Per-transaction fees on every sale", body: "Gumroad takes a per-transaction fee on every sale, on top of the gateway fee. On modest monthly volume that compounds quickly into a meaningful skim." },
      { title: "No real course experience", body: "Gumroad ships downloadable files. Drip schedule, modules, lessons, completion tracking, certificates — none of that ships natively." },
      { title: "No community", body: "Customers buy and leave. There's no cohort feed, no member directory, no shared room where buyers turn into a community of practice." },
      { title: "No live classes", body: "No native room. No attendance. No recording. If you want to teach live, you point your audience at a third-party meeting URL." },
      { title: "Limited student record", body: "Customer records track purchases, not progress. No 'where's Maya in the Hooks course' visibility for you or her." },
    ],
    uspContrasts: COMMON_USP("Gumroad"),
    featureMatrix: COMMON_FEATURES("Gumroad", {
      rivalCommissionNote: "10% per transaction on every plan",
      rivalCommunity: "no",
      rivalLiveClasses: "no",
      rivalIndiaPay: "partial",
      rivalExport: "partial",
      rivalExportNote: "Sales CSV only, no full-workspace dump",
    }),
    migrationSteps: COMMON_MIGRATION("Gumroad"),
    faqs: [
      { q: "Do I lose the link-in-bio simplicity?", a: "No — every product gets a public sales page at a clean URL, and your full storefront sits on your own subdomain. Pinning a single product to your bio works the same way." },
      { q: "What about my Gumroad customer list?", a: "Export it as CSV from Gumroad, drop it into /dashboard/students, and they're in your workspace with their past purchase history attributed. They get a 'you're now in our cohort' welcome email." },
      { q: "Will my checkout convert as well?", a: "Same one-page checkout pattern. Plus UPI / Razorpay-style native checkout for Indian buyers — typically a step-up in conversion for INR audiences." },
      { q: "Can I still sell standalone digital downloads?", a: "Yes — downloads are one of 8 product kinds. Same one-time purchase, instant delivery, no DRM nonsense." },
      { q: "Math on the fee difference?", a: "Process ~$2,000/month on Gumroad and you're paying ~$200/month in transaction fees. Our Studio plan is a flat monthly cost regardless of volume." },
    ],
    ctaHeadline: "Outgrow link-in-bio. Keep the simplicity.",
    accent: "orange",
    category: "Link-in-bio digital storefront",
    costExample: {
      monthlyRevenueINR: 2_00_000,
      rivalEffectiveRate: 0.1,
      rivalRateLabel: "10% per transaction on every plan",
      monthlySubscriptionINR: 0,
    },
  },

  // ── LearnWorlds ────────────────────────────────────────────────
  {
    slug: "learnworlds",
    name: "LearnWorlds",
    shortPitch: "Same interactive-learner ambition — with the live cohort, native whiteboard, and India-first plumbing LearnWorlds doesn't quite ship.",
    heroSubhead:
      "LearnWorlds takes the interactive-learner angle seriously — interactive videos, in-video quizzes, course player polish. Most teams leaving aren't unhappy with the course experience; they want what's still missing: a real live cohort room with polls and recordings, a native whiteboard, and India-first payments + delivery. Here's everything you liked, plus the rest.",
    heroBullets: [
      "Native live cohort room with polls, hands, agenda",
      "Whiteboard with 25+ K-12 grade-band templates",
      "Per-transaction fees on lower tiers — gone",
      "UPI · WhatsApp · Hindi · INR — built in",
    ],
    painPoints: [
      { title: "Transaction fees on the entry tier", body: "Transaction fees apply on the Starter plan; going to zero requires moving up. Solo teachers feel the squeeze before their revenue justifies the upgrade." },
      { title: "Live classes via integration", body: "LearnWorlds connects to a third-party meeting tool — but doesn't ship its own room with cohort-specific tooling (polls, raised hands, chapter-marked recordings, in-class agenda)." },
      { title: "Whiteboard absent", body: "Teaching live? Add a separate hosted-whiteboard licence. Students sign in to two tools." },
      { title: "Community feels added-on", body: "Community functionality exists but doesn't feel woven into the course + live experience the way an integrated cohort does." },
      { title: "USD-first checkout", body: "Built for the US creator market. UPI / Razorpay-style native checkout means manual setup; WhatsApp isn't a built-in notifications channel." },
    ],
    uspContrasts: COMMON_USP("LearnWorlds"),
    featureMatrix: COMMON_FEATURES("LearnWorlds", {
      rivalCommissionNote: "5% on Starter, 0% on higher plans",
      rivalCommunity: "partial",
      rivalLiveClasses: "partial",
      rivalLiveNote: "Via third-party integration only",
      rivalIndiaPay: "no",
      rivalExport: "partial",
    }),
    migrationSteps: COMMON_MIGRATION("LearnWorlds"),
    faqs: [
      { q: "Will I lose interactive video?", a: "Inline embeds support video providers with question overlays via course quizzes attached to the lesson. Not a 1:1 replica of LearnWorlds' interactive-video editor, but the learning outcome — checkpoint questions inside a video — is supported." },
      { q: "Does the student player feel as polished?", a: "Clean per-lesson progress, sidebar curriculum, completion checkmarks, certificate trigger on course finish. Most teams find the bar comparable by the second course they migrate." },
      { q: "What about SCORM imports?", a: "Native SCORM import isn't on the platform today. Most teams take the migration as an opportunity to rebuild against our native module + lesson structure." },
      { q: "Can I keep my LearnWorlds branding + domain?", a: "Yes. Custom domain + brand colours + logos + 17 fonts ship on every plan." },
      { q: "How does the math work on transaction fees?", a: "If you're processing ~$3,000/month on LearnWorlds Starter at 5% transaction fees, that's $150/month skimmed. Our Studio plan is a flat monthly cost regardless of volume." },
    ],
    ctaHeadline: "Keep the interactive ambition. Lose the gaps.",
    accent: "indigo",
    category: "Interactive learning platform",
    costExample: {
      monthlyRevenueINR: 5_00_000,
      rivalEffectiveRate: 0.05,
      rivalRateLabel: "5% transaction fee on Starter",
      monthlySubscriptionINR: 2_500,
    },
  },

  // ── Graphy ─────────────────────────────────────────────────────
  {
    slug: "graphy",
    name: "Graphy",
    shortPitch: "Same India-built ambition — without the per-transaction commission ladder and with a deeper teaching surface.",
    heroSubhead:
      "Graphy ships from India for India, and they nailed several things: UPI-first checkout, an app-store presence, and an end-to-end course pipeline. What we hear most from teams leaving: the commission ladder bites as revenue grows, the live cohort experience still feels bolted-on, and the whiteboard / quiz template depth doesn't quite match what an Indian coaching centre or K-12 academy actually needs. Here's a workspace that ships the depth.",
    heroBullets: [
      "Zero commission on every plan, including Starter",
      "Native live cohort room with polls + hands + agenda",
      "Whiteboard with 25+ K-12 grade-band templates",
      "18 quiz templates — JEE / NEET / GMAT / K-12 / code / essay",
    ],
    painPoints: [
      { title: "Commission climbs with your revenue", body: "Lower tiers carry per-transaction fees that compound as monthly sales grow. Teams crossing ₹3-5 lakh / month feel the squeeze and start modelling the move." },
      { title: "Live classes feel assembled, not woven", body: "Recorded course delivery is excellent. The live cohort experience — polls, raised hands, in-class agenda, auto-chapter recordings, comprehension checks — isn't on the same level." },
      { title: "Whiteboard depth is light", body: "A whiteboard surface exists, but K-12 grade-band templates (KG number boxes, fraction circles, periodic table skeletons, algebra workspaces) aren't shipped out of the box." },
      { title: "Quiz templates are generic", body: "Quizzes work, but entrance-prep-specific scaffolds (JEE Maths pacing, NEET Biology MCQs, GMAT data sufficiency) aren't pre-built. Coaching centres rebuild them from scratch." },
      { title: "Community is functional but separate-feeling", body: "Community tooling exists. Post-types (Announcement / Question / Win / Discussion), per-community notification levels, and the same dispatcher firing across in-app + email + WhatsApp aren't quite stitched the same way." },
    ],
    uspContrasts: COMMON_USP("Graphy"),
    featureMatrix: COMMON_FEATURES("Graphy", {
      rivalCommissionNote: "Transaction fees apply on lower tiers",
      rivalCommunity: "partial",
      rivalLiveClasses: "partial",
      rivalLiveNote: "Live exists, but cohort tooling (polls, hands, agenda) is light",
      rivalIndiaPay: "partial",
      rivalExport: "partial",
    }),
    migrationSteps: COMMON_MIGRATION("Graphy"),
    faqs: [
      { q: "Isn't Graphy also India-first?", a: "Yes — UPI, INR pricing, app presence. We ship the same India primitives plus deeper teaching tooling: 25+ whiteboard templates, 18 quiz templates with entrance-prep scaffolds, and a native live cohort room with polls + raised hands + agenda + comprehension checks." },
      { q: "Will my students notice the move?", a: "They get a fresh portal on your custom domain with a one-shot 'we've moved' email + WhatsApp notification. The login is on the new portal, but their library + progress carry over via the migration import." },
      { q: "What about my Graphy app integration?", a: "Your students access via the responsive portal on your subdomain — works on mobile browsers without a separate app install. If you need a native mobile shell later, we'll work with you on it." },
      { q: "What's the math on commission?", a: "If you're processing ₹5,00,000 / month on a Graphy tier with 3% transaction fees, that's ₹15,000 / month skimmed. Our paid plans are flat fees regardless of sales volume — at that level, you save ~₹10,000 / month after subscription costs." },
      { q: "Can I migrate course videos as-is?", a: "Yes — paste your hosted video embed URLs into the course builder. We don't re-host video, so you keep your existing CDN. Per-lesson progress tracking activates from the day the student starts on the new platform." },
    ],
    ctaHeadline: "Indian-built. Without the commission ladder.",
    accent: "amber",
    category: "India-built creator platform",
    costExample: {
      monthlyRevenueINR: 5_00_000,
      rivalEffectiveRate: 0.03,
      rivalRateLabel: "3% transaction fee on lower tiers",
      monthlySubscriptionINR: 4_500,
    },
  },

  // ── TagMango ───────────────────────────────────────────────────
  {
    slug: "tagmango",
    name: "TagMango",
    shortPitch: "Same creator-mobile-first focus — with the deeper teaching surface and zero-commission commitment Indian educators ask for.",
    heroSubhead:
      "TagMango leans into mobile-first creator tooling — chat, community, content drops — and creators love the mobile experience. What we hear most from teams leaving: the live cohort surface isn't as classroom-grade as serious coaching centres need, the whiteboard + quiz template depth is light, and revenue-share fees compound as the cohort grows. Here's the workspace built for the depth.",
    heroBullets: [
      "Zero commission on every plan, including Starter",
      "Native live cohort room with polls, hands, agenda",
      "25+ whiteboard templates + 18 quiz templates",
      "Native UPI · WhatsApp · Hindi · Tamil + custom domain",
    ],
    painPoints: [
      { title: "Live cohort surface is light", body: "Voice / video rooms exist, but classroom-grade tooling (polls during the lesson, raised-hand queue, agenda checklist, chapter-marked recordings, comprehension check) isn't there. Coaching centres feel it." },
      { title: "Whiteboard isn't a first-class teaching surface", body: "Drawing tools work, but K-12 grade-band templates (KG number boxes, fraction circles, algebra workspaces, periodic table) aren't pre-built scaffolds you can drop into a lesson." },
      { title: "Quiz tooling is basic", body: "Quizzes / polls work for engagement, but entrance-prep templates (JEE Mathematics drill, NEET Biology MCQs, GMAT data sufficiency) with time caps + mistake review aren't shipped out of the box." },
      { title: "Revenue-share compounds at scale", body: "Per-transaction revenue-share fees scale with your sales. A ₹5-10 lakh / month creator pays significant fees on top of the gateway charge — flat-fee platforms break even quickly at that volume." },
      { title: "Branding gates higher tiers", body: "Custom domain, removing platform attribution, and white-label depth typically need a paid upgrade. Solo creators on entry tier ship with platform branding visible." },
    ],
    uspContrasts: COMMON_USP("TagMango"),
    featureMatrix: COMMON_FEATURES("TagMango", {
      rivalCommissionNote: "Revenue-share fees on every plan",
      rivalCommunity: "yes",
      rivalLiveClasses: "partial",
      rivalLiveNote: "Voice/video exists, no in-class polls / agenda / chapters",
      rivalIndiaPay: "partial",
      rivalExport: "partial",
    }),
    migrationSteps: COMMON_MIGRATION("TagMango"),
    faqs: [
      { q: "TagMango is mobile-first — do you match that?", a: "Our portal is responsive — students access classes, courses, and the community on mobile browsers without installing a separate app. Live class join, whiteboard view, and quiz attempts all work on phone. We deliberately skipped the 'every creator needs an app' overhead in favour of one fast portal." },
      { q: "Will my paid community members carry over?", a: "Export your member list from TagMango as CSV (most platforms ship this under members / subscribers). Drop it into our /dashboard/students with the subscription tier mapped, and they're in your workspace with their access carried forward." },
      { q: "What's the cost difference at my volume?", a: "Most coaching centres processing ₹5,00,000+ / month on TagMango pay ₹40-60k+ / month in revenue-share fees. Our paid plans are flat — usually a ₹30k+ swing in your favour at that revenue tier, before counting the depth of features." },
      { q: "What about my chat-based community?", a: "Our community ships with 4 post types (Announcement / Question / Win / Discussion), @-mentions, file uploads with type-aware previews, post editing, per-community notification levels, and a 24h snooze. Closer to a chat-grade workspace than a feed." },
      { q: "Can I keep selling memberships?", a: "Yes — memberships are one of 8 product kinds. Recurring billing, grace periods, retry logic, dunning all ship out of the box." },
    ],
    ctaHeadline: "Stop paying revenue-share. Keep the mobile-first feel.",
    accent: "rose",
    category: "Creator-mobile platform",
    costExample: {
      monthlyRevenueINR: 8_00_000,
      rivalEffectiveRate: 0.06,
      rivalRateLabel: "Revenue-share fees compound at scale",
      monthlySubscriptionINR: 2_000,
    },
  },
]

export function listAlternativeSlugs(): string[] {
  return ALTERNATIVES.map((a) => a.slug)
}

export function getAlternative(slug: string): AlternativeEntry | null {
  return ALTERNATIVES.find((a) => a.slug === slug) ?? null
}
