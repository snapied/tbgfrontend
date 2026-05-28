"use client"

// Client for /api/ai/*. Returns typed shapes that the course editor
// can drop straight into local state.
//
// availability() pings /api/ai/status — we use it to hide the
// "Generate with AI" buttons when the backend can't reach a provider.
// Cached for the lifetime of the page so the editor doesn't re-ping
// every render.

import { ACCESS_TOKEN_KEY } from "./billing-client"

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface AIStatus {
  /** True when both a provider key is configured AND the plan
   *  includes AI. This is what the "Generate with AI" buttons gate
   *  on — they hide unless this is true. */
  available: boolean
  /** Backend has at least one provider key (GROQ_API_KEY or
   *  OPENAI_API_KEY). False = backend env is missing the key. */
  configured: boolean
  /** Caller's plan tier includes AI (Pro+). False on Starter. */
  planAllowed: boolean
}

let _availability: Promise<boolean> | null = null
export function isAIAvailable(): Promise<boolean> {
  if (_availability) return _availability
  // Status is auth + plan gated now ("available" only when a provider
  // is configured AND the caller's plan includes AI). The route
  // requires the access token so we send it the same way every other
  // /api/* fetch does.
  _availability = fetch(`${apiBase()}/api/ai/status`, {
    headers: authHeaders(),
    credentials: "include",
  })
    .then((r) => (r.ok ? r.json() : { available: false }))
    .then((j: { available?: boolean }) => !!j.available)
    .catch(() => false)
  return _availability
}

// Richer counterpart used by the status page so we can show which
// gate is blocking AI — "provider not configured" vs "plan doesn't
// include AI" — instead of a single ambiguous "not available".
// Not cached so the status page always reflects current state.
export async function fetchAIStatus(): Promise<AIStatus> {
  try {
    const res = await fetch(`${apiBase()}/api/ai/status`, {
      headers: authHeaders(),
      credentials: "include",
    })
    if (!res.ok) {
      return { available: false, configured: false, planAllowed: false }
    }
    const j = (await res.json()) as Partial<AIStatus>
    return {
      available: !!j.available,
      configured: !!j.configured,
      planAllowed: !!j.planAllowed,
    }
  } catch {
    return { available: false, configured: false, planAllowed: false }
  }
}

interface ErrorResult { error: string }

export async function aiCourseTitles(input: { topic: string; audience?: string }): Promise<{ titles: string[] } | ErrorResult> {
  return post("/api/ai/title", input)
}

export async function aiCourseDescription(input: { title: string; topic?: string; audience?: string }): Promise<{ description: string } | ErrorResult> {
  return post("/api/ai/description", input)
}

export interface AIModuleOutline {
  title: string
  description: string
  lessons: { title: string; estimatedMinutes: number }[]
}
export async function aiCourseOutline(input: { title: string; topic?: string; audience?: string }): Promise<{ modules: AIModuleOutline[] } | ErrorResult> {
  return post("/api/ai/outline", input)
}

export async function aiLessonContent(input: { lessonTitle: string; courseTitle: string; context?: string }): Promise<{ content: string } | ErrorResult> {
  return post("/api/ai/lesson", input)
}

// "Rewrite this" — used by the whiteboard text-element refiner and
// anywhere we want a single AI pass over an arbitrary string. Modes
// match the backend: improve (default), shorten, expand, grammar.
export async function aiRefineText(input: {
  text: string
  mode?: "improve" | "shorten" | "expand" | "grammar"
  context?: string
}): Promise<{ text: string } | ErrorResult> {
  return post("/api/ai/refine", input)
}

// ── Domain-specific generators wired across the dashboard ──────────

export async function aiAssignmentDescription(input: {
  title: string
  courseTitle?: string
  dueInDays?: number
}): Promise<{ content: string } | ErrorResult> {
  return post("/api/ai/assignment", input)
}

export async function aiStudyNotes(input: {
  topic: string
  audience?: string
}): Promise<{ content: string } | ErrorResult> {
  return post("/api/ai/notes", input)
}

export interface AIBlogMeta {
  subtitle: string
  tags: string[]
  seoTitle: string
  seoDescription: string
}
export async function aiBlogMeta(input: {
  title: string
  body?: string
}): Promise<AIBlogMeta | ErrorResult> {
  return post("/api/ai/blog-meta", input)
}

export interface AISeoMeta {
  seoTitle: string
  seoDescription: string
  keywords: string[]
}
export async function aiSeoMeta(input: {
  pageTitle: string
  body?: string
  kind?: "course" | "product" | "page" | "blog"
}): Promise<AISeoMeta | ErrorResult> {
  return post("/api/ai/seo", input)
}

export interface AIQuizQuestion {
  question: string
  type: "multiple-choice" | "true-false" | "short-answer"
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  points: number
}
export async function aiQuizQuestions(input: {
  topic: string
  count?: number
  difficulty?: "easy" | "medium" | "hard"
}): Promise<{ questions: AIQuizQuestion[] } | ErrorResult> {
  return post("/api/ai/quiz", input)
}

export async function aiProductDescription(input: {
  name: string
  kind?: string
  priceInr?: number
}): Promise<{ content: string } | ErrorResult> {
  return post("/api/ai/product", input)
}

export async function aiDoubtReply(input: {
  question: string
  context?: string
  tone?: "concise" | "detailed" | "encouraging"
}): Promise<{ content: string } | ErrorResult> {
  return post("/api/ai/doubt-reply", input)
}

async function post<T>(path: string, body: unknown): Promise<T | ErrorResult> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    try {
      return (await res.json()) as ErrorResult
    } catch {
      return { error: `Request failed (${res.status})` }
    }
  }
  return (await res.json()) as T
}

// ── Full-course AI builder (SSE streaming) ──────────────────────────

export interface CourseBuilderInput {
  title: string
  description?: string
  category?: string
  audience?: string
  level?: "beginner" | "intermediate" | "advanced"
  language?: string
  tone?: string
  duration?: string
  price?: number
  originalPrice?: number
  keywords?: string[]
  quizPerModule?: boolean
  customInstructions?: string
}

export interface CourseBuilderProgress {
  stage: string
  step: number
  totalSteps: number
  detail?: string
}

export interface GeneratedLesson {
  title: string
  content: string
  estimatedMinutes: number
}

export interface GeneratedQuizQuestion {
  question: string
  type: "multiple-choice" | "true-false" | "short-answer"
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  points: number
}

export interface GeneratedModule {
  title: string
  description: string
  lessons: GeneratedLesson[]
  quiz?: GeneratedQuizQuestion[]
}

export interface GeneratedCourse {
  title: string
  subtitle: string
  description: string
  category: string
  tags: string[]
  level: "beginner" | "intermediate" | "advanced"
  language: string
  modules: GeneratedModule[]
  whatYouLearn: string[]
  requirements: string[]
  features: string[]
  seoTitle: string
  seoDescription: string
  seoKeywords: string[]
  faq: { question: string; answer: string }[]
  promoText: string
  failedLessons: number
}

/**
 * Calls the full-course AI builder endpoint with SSE streaming.
 * Returns the complete GeneratedCourse on success, or an ErrorResult.
 */
export async function aiGenerateFullCourse(
  input: CourseBuilderInput,
  onProgress: (p: CourseBuilderProgress) => void,
  signal?: AbortSignal,
): Promise<GeneratedCourse | ErrorResult> {
  const res = await fetch(`${apiBase()}/api/ai/generate-course`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(input),
    signal,
  })

  if (!res.ok) {
    try {
      return (await res.json()) as ErrorResult
    } catch {
      return { error: `Request failed (${res.status})` }
    }
  }

  const reader = res.body?.getReader()
  if (!reader) return { error: "Streaming not supported" }

  const decoder = new TextDecoder()
  let buffer = ""
  let result: GeneratedCourse | ErrorResult = { error: "Generation did not complete" }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE frames (split on double newline).
      const frames = buffer.split("\n\n")
      // Keep the last partial frame in the buffer.
      buffer = frames.pop() ?? ""

      for (const frame of frames) {
        if (!frame.trim()) continue
        let eventType = "message"
        let data = ""
        for (const line of frame.split("\n")) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            data += line.slice(6)
          }
        }
        if (!data) continue
        try {
          const parsed = JSON.parse(data)
          if (eventType === "progress") {
            onProgress(parsed as CourseBuilderProgress)
          } else if (eventType === "complete") {
            result = parsed as GeneratedCourse
          } else if (eventType === "error") {
            result = { error: parsed.error ?? "Generation failed" }
          }
        } catch {
          // Malformed frame — skip.
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) {
      return { error: "Generation cancelled" }
    }
    return { error: err instanceof Error ? err.message : "Stream reading failed" }
  }

  return result
}
