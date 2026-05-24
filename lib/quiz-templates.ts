// Quiz template library — 18 starter quizzes covering K-12, higher
// education, entrance prep, engineering, management, product, and
// the core STEM subjects.
//
// Each template ships with a small set of plausible starter questions
// so the teacher lands on a real-feeling quiz they can edit, not a
// blank form. They're seeds — the picker dialog shows the title,
// description, audience tags, and a small content preview; the
// teacher tweaks individual questions after the quiz is created.
//
// The `subjects` array drives the filter chips in the picker. Multiple
// tags per template are fine and intentional — JEE Mathematics is
// both "Maths" and "Entrance prep", a system-design quiz hits both
// "Engineering" and "Technology".

import type { Quiz, QuizQuestion } from "@/lib/lms-store"

/** Audience / topic tags shown as filter chips on the picker. */
export type QuizSubject =
  | "K-12"
  | "Higher Ed"
  | "Entrance prep"
  | "Maths"
  | "Science"
  | "Engineering"
  | "Technology"
  | "Management"
  | "Product"
  | "General"

export interface QuizTemplate {
  /** Stable key — used by the picker grid and `pick` callbacks. */
  key: string
  /** Short title — fits on one card line. */
  title: string
  /** Two-line pitch shown under the title in the picker. */
  description: string
  /** Subject / audience tags — filter chips + card metadata. */
  subjects: QuizSubject[]
  /** Loose grouping shown as a sub-header in the picker. */
  category: "Classroom" | "Higher education" | "Engineering" | "Management" | "Entrance prep"
  /** Default grading + scoring shape baked into the seeded quiz. */
  gradingMode: Quiz["gradingMode"]
  passingScore: number
  timeLimit?: number
  /** Real starter questions — the teacher edits these inline after the
   *  quiz is created. We keep them short and editable. */
  questions: Omit<QuizQuestion, "id">[]
}

// ── Templates ───────────────────────────────────────────────────────

export const QUIZ_TEMPLATES: QuizTemplate[] = [
  // ── Classroom (general, K-12) ──────────────────────────────────────
  {
    key: "pop-quiz",
    title: "Pop quiz",
    description: "Quick 5-question check-in to confirm students caught the main ideas.",
    subjects: ["General", "K-12"],
    category: "Classroom",
    gradingMode: "auto",
    passingScore: 60,
    timeLimit: 10,
    questions: [
      { question: "What was the most important concept from today's class?", type: "short-answer", correctAnswer: "", points: 2 },
      { question: "True or false: the concept applies in real-world scenarios.", type: "true-false", options: ["True", "False"], correctAnswer: 0, points: 1 },
      { question: "Which of these best describes today's main idea?", type: "multiple-choice", options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: 0, points: 2 },
    ],
  },
  {
    key: "module-assessment",
    title: "End-of-module assessment",
    description: "Graded 10-question test covering everything in a module. 70% to pass.",
    subjects: ["General", "K-12", "Higher Ed"],
    category: "Classroom",
    gradingMode: "auto",
    passingScore: 70,
    timeLimit: 30,
    questions: [
      { question: "Sample MCQ — replace with your own.", type: "multiple-choice", options: ["A", "B", "C", "D"], correctAnswer: 0, points: 2 },
      { question: "Define the term in your own words.", type: "short-answer", correctAnswer: "", points: 3 },
    ],
  },
  {
    key: "reflection",
    title: "Reflection prompt",
    description: "Single open-ended question — teacher reviews each response.",
    subjects: ["General", "K-12", "Higher Ed"],
    category: "Classroom",
    gradingMode: "teacher",
    passingScore: 0,
    questions: [
      { question: "What's one thing you learned today and one thing you're still unsure about?", type: "long-answer", correctAnswer: "", points: 5 },
    ],
  },
  {
    key: "k12-reading-comp",
    title: "Reading comprehension",
    description: "Short passage + 4 inference questions. Tunes critical reading for primary/secondary classes.",
    subjects: ["K-12"],
    category: "Classroom",
    gradingMode: "auto",
    passingScore: 60,
    timeLimit: 15,
    questions: [
      { question: "PASSAGE: [paste your passage here] — What is the author's main argument?", type: "short-answer", correctAnswer: "", points: 3 },
      { question: "Which sentence best supports the author's claim?", type: "multiple-choice", options: ["Sentence 1", "Sentence 2", "Sentence 3", "Sentence 4"], correctAnswer: 0, points: 2 },
      { question: "What can you infer about the protagonist?", type: "short-answer", correctAnswer: "", points: 3 },
      { question: "True or false: the passage describes a real event.", type: "true-false", options: ["True", "False"], correctAnswer: 0, points: 1 },
    ],
  },
  {
    key: "k12-math-fluency",
    title: "Math fluency drill",
    description: "Eight quick arithmetic questions. Times tables, fractions, basic algebra.",
    subjects: ["K-12", "Maths"],
    category: "Classroom",
    gradingMode: "auto",
    passingScore: 75,
    timeLimit: 8,
    questions: [
      { question: "7 × 8 = ?", type: "short-answer", correctAnswer: "56", points: 1 },
      { question: "What is 3/4 + 1/8?", type: "multiple-choice", options: ["4/12", "7/8", "1", "5/8"], correctAnswer: 1, points: 1 },
      { question: "Solve for x: 2x + 5 = 17", type: "short-answer", correctAnswer: "6", points: 2 },
      { question: "Which is greater: 0.6 or 5/8?", type: "multiple-choice", options: ["0.6", "5/8", "They are equal"], correctAnswer: 1, points: 1 },
    ],
  },
  {
    key: "k12-vocabulary",
    title: "Vocabulary check",
    description: "Synonyms · antonyms · usage in a sentence. K-12 word-of-the-week scaffold.",
    subjects: ["K-12"],
    category: "Classroom",
    gradingMode: "auto",
    passingScore: 70,
    timeLimit: 10,
    questions: [
      { question: "Synonym for 'meticulous'?", type: "multiple-choice", options: ["Careless", "Thorough", "Quick", "Loud"], correctAnswer: 1, points: 1 },
      { question: "Antonym for 'abundant'?", type: "multiple-choice", options: ["Plentiful", "Scarce", "Generous", "Heavy"], correctAnswer: 1, points: 1 },
      { question: "Use 'resilient' in a sentence.", type: "short-answer", correctAnswer: "", points: 2 },
    ],
  },

  // ── Higher Education ───────────────────────────────────────────────
  {
    key: "highered-essay",
    title: "Essay with rubric",
    description: "One long-response prompt graded against a 4-point rubric. Instructor reviews each.",
    subjects: ["Higher Ed"],
    category: "Higher education",
    gradingMode: "teacher",
    passingScore: 60,
    timeLimit: 60,
    questions: [
      { question: "Discuss the impact of [topic] on [field]. Use at least two sources and 500-800 words. Rubric: thesis (4) · evidence (4) · analysis (4) · clarity (4).", type: "long-answer", correctAnswer: "", points: 16 },
    ],
  },
  {
    key: "highered-case-study",
    title: "Case study analysis",
    description: "Case prompt + four guided questions. Used in business, law, medicine, ethics courses.",
    subjects: ["Higher Ed", "Management"],
    category: "Higher education",
    gradingMode: "teacher",
    passingScore: 65,
    timeLimit: 45,
    questions: [
      { question: "CASE: [paste case here]. What is the central problem facing the decision-maker?", type: "long-answer", correctAnswer: "", points: 5 },
      { question: "Identify the key stakeholders and their conflicting interests.", type: "long-answer", correctAnswer: "", points: 5 },
      { question: "Propose two viable courses of action. Argue for one.", type: "long-answer", correctAnswer: "", points: 8 },
      { question: "What's the most defensible ethical framework to apply here?", type: "short-answer", correctAnswer: "", points: 4 },
    ],
  },

  // ── Engineering ────────────────────────────────────────────────────
  {
    key: "code-review",
    title: "Code review quiz",
    description: "Short code snippets with bugs to spot. Tunes review skills in CS / SE classes.",
    subjects: ["Engineering", "Technology"],
    category: "Engineering",
    gradingMode: "auto",
    passingScore: 70,
    timeLimit: 20,
    questions: [
      { question: "What's the bug in: `for (let i = 0; i <= arr.length; i++) { … }`?", type: "multiple-choice", options: ["Should be < not <=", "Should start at 1", "Should use forEach", "No bug"], correctAnswer: 0, points: 2 },
      { question: "Which is the most idiomatic JS way to deep-clone a plain object?", type: "multiple-choice", options: ["JSON.parse(JSON.stringify(x))", "Object.assign({}, x)", "structuredClone(x)", "Spread {...x}"], correctAnswer: 2, points: 2 },
      { question: "Identify a race condition in the supplied snippet.", type: "long-answer", correctAnswer: "", points: 4 },
    ],
  },
  {
    key: "algo-complexity",
    title: "Algorithm complexity",
    description: "Big-O for common algorithms — sorting, searching, graph traversal.",
    subjects: ["Engineering", "Technology", "Maths"],
    category: "Engineering",
    gradingMode: "auto",
    passingScore: 70,
    timeLimit: 15,
    questions: [
      { question: "Worst-case time complexity of QuickSort?", type: "multiple-choice", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], correctAnswer: 2, points: 1 },
      { question: "Space complexity of recursive BFS on a tree of depth d, branching b?", type: "multiple-choice", options: ["O(b)", "O(bd)", "O(b^d)", "O(d)"], correctAnswer: 2, points: 2 },
      { question: "Which gives the tightest bound on binary search?", type: "multiple-choice", options: ["Θ(n)", "Θ(log n)", "Θ(n log n)", "Θ(1)"], correctAnswer: 1, points: 1 },
    ],
  },
  {
    key: "system-design",
    title: "System design fundamentals",
    description: "Open-ended scenarios — design a URL shortener, a chat service, a notifications system.",
    subjects: ["Engineering", "Technology"],
    category: "Engineering",
    gradingMode: "teacher",
    passingScore: 70,
    timeLimit: 45,
    questions: [
      { question: "Design a URL shortener that handles 10K req/s. Discuss data model, hash strategy, cache, and bottlenecks.", type: "long-answer", correctAnswer: "", points: 10 },
      { question: "What trade-offs does eventual consistency introduce, and when is it acceptable?", type: "long-answer", correctAnswer: "", points: 5 },
    ],
  },

  // ── Management / Product ───────────────────────────────────────────
  {
    key: "pm-scenarios",
    title: "Project management scenarios",
    description: "Situational MCQs — scope creep, risk, dependencies. Aligned to PMBOK / PMP-style framing.",
    subjects: ["Management"],
    category: "Management",
    gradingMode: "auto",
    passingScore: 70,
    timeLimit: 20,
    questions: [
      { question: "A stakeholder requests a new feature mid-sprint. What's the PM's first move?", type: "multiple-choice", options: ["Approve immediately", "Reject outright", "Log it and triage against the product roadmap", "Escalate to the CEO"], correctAnswer: 2, points: 2 },
      { question: "Which risk-response strategy means buying insurance against a risk?", type: "multiple-choice", options: ["Avoid", "Mitigate", "Transfer", "Accept"], correctAnswer: 2, points: 1 },
      { question: "Define the critical path in your own words.", type: "short-answer", correctAnswer: "", points: 2 },
    ],
  },
  {
    key: "product-sense",
    title: "Product sense interview",
    description: "Open-ended design + prioritisation questions. Common at FAANG/PM interview prep.",
    subjects: ["Product", "Management"],
    category: "Management",
    gradingMode: "teacher",
    passingScore: 70,
    timeLimit: 30,
    questions: [
      { question: "How would you improve onboarding for a meditation app? Walk through user, goal, friction, solution, success metric.", type: "long-answer", correctAnswer: "", points: 8 },
      { question: "You have time for one of three features this quarter. How do you decide? Name the framework you'd use.", type: "long-answer", correctAnswer: "", points: 6 },
    ],
  },

  // ── Science ────────────────────────────────────────────────────────
  {
    key: "physics-laws",
    title: "Physics laws check",
    description: "MCQs on Newton's laws, conservation, kinematics. Mid-secondary level.",
    subjects: ["Science", "K-12", "Higher Ed"],
    category: "Classroom",
    gradingMode: "auto",
    passingScore: 65,
    timeLimit: 15,
    questions: [
      { question: "Which Newton's law explains why a seatbelt protects you in a crash?", type: "multiple-choice", options: ["First", "Second", "Third", "Universal gravitation"], correctAnswer: 0, points: 1 },
      { question: "An object in free fall on Earth (ignoring air) accelerates at approximately…", type: "multiple-choice", options: ["1 m/s²", "9.8 m/s²", "32 m/s²", "0 m/s²"], correctAnswer: 1, points: 1 },
      { question: "Calculate momentum: 5 kg × 4 m/s.", type: "short-answer", correctAnswer: "20", points: 1 },
    ],
  },
  {
    key: "chem-equations",
    title: "Chemistry equations",
    description: "Balance equations, identify reaction types, predict products. Secondary / first-year college.",
    subjects: ["Science", "Higher Ed"],
    category: "Classroom",
    gradingMode: "auto",
    passingScore: 65,
    timeLimit: 20,
    questions: [
      { question: "Balance: __ H₂ + __ O₂ → __ H₂O. Enter the three coefficients separated by spaces.", type: "short-answer", correctAnswer: "2 1 2", points: 2 },
      { question: "What type of reaction is CH₄ + 2O₂ → CO₂ + 2H₂O?", type: "multiple-choice", options: ["Synthesis", "Decomposition", "Combustion", "Single replacement"], correctAnswer: 2, points: 1 },
      { question: "Predict the product: HCl + NaOH →", type: "short-answer", correctAnswer: "NaCl + H2O", points: 2 },
    ],
  },

  // ── Entrance prep ──────────────────────────────────────────────────
  {
    key: "jee-maths",
    title: "JEE Mathematics drill",
    description: "Single-correct MCQs on calculus, algebra, coordinate geometry. JEE-style difficulty + timing.",
    subjects: ["Entrance prep", "Maths"],
    category: "Entrance prep",
    gradingMode: "auto",
    passingScore: 60,
    timeLimit: 30,
    questions: [
      { question: "If f(x) = x² + 2x, then f'(2) = ?", type: "multiple-choice", options: ["4", "6", "8", "2"], correctAnswer: 1, points: 3 },
      { question: "Integral of (1/x) dx is…", type: "multiple-choice", options: ["x", "ln|x| + C", "−1/x² + C", "1/x²"], correctAnswer: 1, points: 3 },
      { question: "Distance between (1,2) and (4,6)?", type: "multiple-choice", options: ["3", "4", "5", "6"], correctAnswer: 2, points: 3 },
    ],
  },
  {
    key: "neet-biology",
    title: "NEET Biology MCQs",
    description: "Single-correct biology MCQs — cell, genetics, human physiology. NEET-style framing.",
    subjects: ["Entrance prep", "Science"],
    category: "Entrance prep",
    gradingMode: "auto",
    passingScore: 60,
    timeLimit: 25,
    questions: [
      { question: "Site of cellular respiration in a eukaryote?", type: "multiple-choice", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi"], correctAnswer: 1, points: 2 },
      { question: "Which blood vessel carries oxygenated blood AWAY from the heart?", type: "multiple-choice", options: ["Pulmonary artery", "Pulmonary vein", "Aorta", "Vena cava"], correctAnswer: 2, points: 2 },
      { question: "A genetic disorder caused by trisomy 21 is…", type: "multiple-choice", options: ["Turner", "Down", "Klinefelter", "Cri-du-chat"], correctAnswer: 1, points: 2 },
    ],
  },
  {
    key: "gmat-ds",
    title: "GMAT data sufficiency",
    description: "Classic DS items — judge if each statement is sufficient, alone or together. 2-minute pacing.",
    subjects: ["Entrance prep", "Management", "Maths"],
    category: "Entrance prep",
    gradingMode: "auto",
    passingScore: 60,
    timeLimit: 20,
    questions: [
      { question: "Is x > 0? (1) x² > 0  (2) x > -1. Which statements are sufficient?", type: "multiple-choice", options: ["(1) alone", "(2) alone", "Both together but neither alone", "Each alone", "Neither"], correctAnswer: 4, points: 3 },
      { question: "Is n even? (1) n + 1 is odd  (2) 2n is even. Which statements are sufficient?", type: "multiple-choice", options: ["(1) alone", "(2) alone", "Both together but neither alone", "Each alone", "Neither"], correctAnswer: 0, points: 3 },
    ],
  },
]

/** Subjects derived from the template set — drives filter chips so a
 *  new subject tag is a one-edit addition. */
export const QUIZ_TEMPLATE_SUBJECTS: QuizSubject[] = (() => {
  const set = new Set<QuizSubject>()
  for (const t of QUIZ_TEMPLATES) for (const s of t.subjects) set.add(s)
  return Array.from(set)
})()

/** Lookup helper used by the picker dialog after the user clicks. */
export function getQuizTemplate(key: string): QuizTemplate | undefined {
  return QUIZ_TEMPLATES.find((t) => t.key === key)
}
