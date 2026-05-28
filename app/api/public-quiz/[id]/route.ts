// Public quiz API — stores quiz data server-side so that shared links
// work across browsers/devices. When a teacher shares a quiz, the
// frontend PUTs the quiz JSON here. When a guest opens the link and
// the quiz isn't in their localStorage, the quiz page GETs it from
// here as a fallback.
//
// Storage: JSON files under .public-quizzes/<id>.json. Simple, no DB
// needed for the POC. Production swap: move to Postgres/Redis.

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

const DIR = path.join(process.cwd(), ".public-quizzes")
const ID_RE = /^[a-z0-9_-]+$/i

function quizPath(id: string): string {
  return path.join(DIR, `${id}.json`)
}

// GET — fetch a published quiz by ID
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!id || !ID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid quiz ID" }, { status: 400 })
  }
  const fp = quizPath(id)
  if (!existsSync(fp)) {
    return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 })
  }
  try {
    const raw = await readFile(fp, "utf-8")
    const quiz = JSON.parse(raw)
    return NextResponse.json({ ok: true, quiz })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to read quiz" }, { status: 500 })
  }
}

// PUT — publish/update a quiz for public access
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!id || !ID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid quiz ID" }, { status: 400 })
  }
  try {
    const body = await req.json()
    if (!body.quiz) {
      return NextResponse.json({ ok: false, error: "Missing quiz data" }, { status: 400 })
    }
    if (!existsSync(DIR)) await mkdir(DIR, { recursive: true })
    await writeFile(quizPath(id), JSON.stringify(body.quiz, null, 2), "utf-8")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    )
  }
}
