"use client"

// 8 starter Doc templates seeded into the New Doc dialog + the
// onboarding picker. Each is a real editable doc once created — no
// special "template" type. We pre-fill blocks at creation time.
//
// Templates are deliberately hand-curated (not a marketplace). Each
// is shaped around a workflow Indian academies actually run.

import {
  emptyRichTextBlock,
  generateBlockId,
  type DocAudience,
  type DocBlock,
} from "@/lib/docs"

export interface DocTemplate {
  key: string
  emoji: string
  title: string
  description: string
  /** Recommended default audience when a teacher picks this template. */
  defaultAudience: DocAudience
  buildBlocks: () => DocBlock[]
}

function rich(html: string): DocBlock {
  return { id: generateBlockId(), type: "rich-text", data: { html } }
}
function heading(level: 2 | 3, text: string): DocBlock {
  return { id: generateBlockId(), type: "heading", data: { level, text } }
}
function callout(tone: "info" | "warn" | "success" | "tip", html: string): DocBlock {
  return { id: generateBlockId(), type: "callout", data: { tone, html } }
}
function divider(): DocBlock {
  return { id: generateBlockId(), type: "divider", data: {} }
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    key: "blank",
    emoji: "📝",
    title: "Blank doc",
    description: "Start from nothing — an empty rich-text block.",
    defaultAudience: { kind: "private" },
    buildBlocks: () => [emptyRichTextBlock()],
  },
  {
    key: "course-handbook",
    emoji: "📚",
    title: "Course handbook",
    description: "Syllabus, schedule, contact policy, rubrics, refund policy — the durable course companion.",
    defaultAudience: { kind: "private" }, // owner will attach to a course later
    buildBlocks: () => [
      heading(2, "Welcome to the course"),
      rich("<p>One paragraph on what students will learn + the outcome by the end of the cohort.</p>"),
      heading(2, "Schedule + delivery"),
      rich("<ul><li>Live classes on (days/times)</li><li>Recordings posted within 24h</li><li>Assignments due (cadence)</li></ul>"),
      heading(2, "How to ask questions"),
      callout("tip", "<p><strong>Stuck?</strong> Open <em>Doubts inbox</em> from the lesson player. We reply within 24 hours on weekdays.</p>"),
      heading(2, "Grading + completion"),
      rich("<p>Pass mark, attempt caps, certificate threshold, late-submission policy.</p>"),
      heading(2, "Refund + access policy"),
      rich("<p>Plain-English refund window. What happens to access if you leave the cohort.</p>"),
    ],
  },
  {
    key: "class-recap",
    emoji: "🎬",
    title: "Class recap template",
    description: "Post-class summary scaffold — covered, missed, action items, next class teaser.",
    defaultAudience: { kind: "community", communityId: "" }, // teacher picks community at create-time
    buildBlocks: () => [
      heading(2, "What we covered today"),
      rich("<ul><li>Topic 1 — one-line summary</li><li>Topic 2 — one-line summary</li></ul>"),
      heading(2, "Recording + chapters"),
      rich("<p><em>Embed the recording block here — it'll render the chapter chips.</em></p>"),
      heading(2, "Questions raised"),
      rich("<p>Add the top questions from class chat. Re-watchers see these in context.</p>"),
      heading(2, "Action items before next class"),
      callout("tip", "<p>Watch the recording at 1.25× if you missed live. Try the practice problems before next class.</p>"),
      heading(2, "Next class"),
      rich("<p>Date, topic, prep work.</p>"),
    ],
  },
  {
    key: "cohort-welcome",
    emoji: "👋",
    title: "Cohort welcome guide",
    description: "How to join classes, where doubts go, leaderboard rules, weekly rhythm.",
    defaultAudience: { kind: "community", communityId: "" },
    buildBlocks: () => [
      heading(2, "Welcome to the cohort"),
      rich("<p>Hi there 👋 We're going to do something hard and worth it. Here's how the next N weeks work.</p>"),
      heading(2, "Where everything lives"),
      rich("<ul><li>Live classes — Classes tab</li><li>Recordings — pinned in the feed after each class</li><li>Doubts — type from any lesson</li><li>Wins + announcements — community feed</li></ul>"),
      heading(2, "Weekly rhythm"),
      rich("<ul><li>Mon — new content drops</li><li>Wed — live class</li><li>Fri — assignment due</li><li>Sun — open office hours</li></ul>"),
      heading(2, "Leaderboard + points"),
      rich("<p>Attend live = 10 pts. Pass a quiz = 15 pts. Submit on time = 15 pts + 10 bonus for 80%+.</p>"),
      heading(2, "Code of conduct"),
      callout("info", "<p>Be kind. Be specific. No spam. We're here to learn together.</p>"),
    ],
  },
  {
    key: "late-submission-sop",
    emoji: "📋",
    title: "Late submission SOP",
    description: "Internal team SOP — how we handle late assignments + grade-extension requests.",
    defaultAudience: { kind: "workspace-admin" },
    buildBlocks: () => [
      heading(2, "When the request comes in"),
      rich("<ol><li>Check past extension count for this student</li><li>If first request — auto-approve up to 48h</li><li>If repeat — flag for instructor review</li></ol>"),
      heading(2, "Reply templates"),
      rich("<p>Use these as the base; personalise the first line.</p>"),
      callout("tip", "<p><strong>Approved:</strong> 'Got it — your extended deadline is &lt;date&gt;. Submit by then; no further extension on this assignment.'</p>"),
      callout("warn", "<p><strong>Declined:</strong> 'You've used your extensions for this cohort. The original deadline stands; partial credit applies for late submissions.'</p>"),
      heading(2, "Audit trail"),
      rich("<p>Log every extension in the student's profile note. Co-instructors should see it.</p>"),
    ],
  },
  {
    key: "parent-comms-template",
    emoji: "✉️",
    title: "Parent communication template",
    description: "Reusable copy for sending updates to K-12 parents — weekly progress + concerns.",
    defaultAudience: { kind: "workspace-admin" },
    buildBlocks: () => [
      heading(2, "Weekly progress note (positive)"),
      rich("<p>Hi &lt;parent name&gt;, this week &lt;student&gt; covered &lt;topic&gt; and &lt;specific win&gt;. Keep up the great support at home.</p>"),
      heading(2, "Concern flag"),
      callout("warn", "<p><strong>Use when:</strong> 2+ missed classes OR &lt;60% on last 2 quizzes OR a behavioural concern in class chat.</p>"),
      rich("<p>Hi &lt;parent name&gt;, wanted to flag that &lt;student&gt; has &lt;specific&gt; this week. Can we hop on a 10-min call this week? Suggesting &lt;day/time&gt;.</p>"),
      heading(2, "Tone rules"),
      rich("<ul><li>Lead with the specific, not the general</li><li>Suggest a next step</li><li>Default to WhatsApp; email for formal records</li></ul>"),
    ],
  },
  {
    key: "study-notes",
    emoji: "🧠",
    title: "Study notes",
    description: "Personal notes scaffold — for the teacher's own reference or for sharing with one cohort.",
    defaultAudience: { kind: "private" },
    buildBlocks: () => [
      heading(2, "Key concepts"),
      rich("<p>The 2-3 ideas that matter most.</p>"),
      heading(2, "Worked examples"),
      rich("<p>Step-by-step problems with the answer hidden until clicked.</p>"),
      heading(2, "Common mistakes"),
      callout("warn", "<p>The 3 errors students make most often, and the fix.</p>"),
      heading(2, "Self-check"),
      rich("<p>Try these on your own. Solutions in the next class.</p>"),
    ],
  },
  {
    key: "faq",
    emoji: "❓",
    title: "FAQ page",
    description: "Public-facing Q&A you can publish to your subdomain to absorb pre-sale questions.",
    defaultAudience: { kind: "public" },
    buildBlocks: () => [
      heading(2, "Who is this course for?"),
      rich("<p>One paragraph. Be specific about the student you serve best.</p>"),
      heading(2, "What do I need to start?"),
      rich("<p>Prerequisites, software, time commitment.</p>"),
      heading(2, "How is it structured?"),
      rich("<p>Live + async breakdown, weekly time investment.</p>"),
      heading(2, "What if I miss a live class?"),
      rich("<p>Recordings post within 24h with chapter markers + transcript.</p>"),
      heading(2, "Refund policy"),
      rich("<p>Plain-English window. Link to full policy.</p>"),
      heading(2, "Still have questions?"),
      callout("info", "<p>Drop a note via the contact form on our homepage — we reply within a business day.</p>"),
      divider(),
    ],
  },
]

export function getTemplate(key: string): DocTemplate | undefined {
  return DOC_TEMPLATES.find((t) => t.key === key)
}
