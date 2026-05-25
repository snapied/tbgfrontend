"use client"

// Recording chapter extraction from a WebVTT transcript.
//
// Strategy: VTT cues already carry timestamps. We don't have
// "chapter" metadata in the captions, so we infer chapter boundaries
// by scanning cue text for cues that look like the *start* of a
// new section:
//   • Transition phrases ("Now let's", "Moving on", "Next up",
//     "Alright so", "Let's talk about", "Up next")
//   • Question-mark cues at sentence boundaries (lectures often
//     pivot with "Any questions?" → next topic)
//   • Cues that contain a noun-phrase that the LAST chapter
//     didn't (rough topic-shift signal)
//
// Bounded at 5-12 chapters — fewer feels useless, more becomes a
// table of contents nobody scans. Spacing > 90s enforced so a
// single dense paragraph doesn't spawn 5 chapters in a row.
//
// This is not LLM-grade summarisation — it's the cheap fallback
// that works without an API call. When a transcription provider
// returns real chapter metadata (Whisper-large with diarisation,
// or Rev.ai's chapter API), the player should prefer those and
// fall back to this parser.

export interface RecordingChapter {
  id: string
  /** Start time in seconds from the recording's beginning. */
  startSec: number
  /** Short label — the cue text that triggered the chapter, trimmed. */
  title: string
}

const TRANSITION_RE = /\b(now let'?s|moving on|next up|alright so|let'?s talk about|up next|so let'?s|let'?s look at|let'?s dive into|to start|to begin|first up|finally|in conclusion|to wrap up|that brings us to|let'?s switch|switching gears|onto|on to|let me show you|i want to show)\b/i

interface VttCue {
  startSec: number
  text: string
}

/** Parses VTT into a flat list of cues. Times are seconds from
 *  the start of the recording. Skips NOTE blocks + cue settings. */
function parseVtt(vtt: string): VttCue[] {
  if (!vtt) return []
  const lines = vtt.replace(/\r/g, "").split("\n")
  const cues: VttCue[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    // Cue header looks like "00:00:12.500 --> 00:00:14.000"
    if (line.includes("-->")) {
      const startStr = line.split("-->")[0].trim()
      const startSec = parseVttTime(startStr)
      i++
      const parts: string[] = []
      while (i < lines.length && lines[i].trim() !== "") {
        parts.push(lines[i].trim())
        i++
      }
      const text = parts
        .join(" ")
        // Strip any HTML / VTT formatting tags (<v Speaker>, <c.classname>, etc.)
        .replace(/<[^>]+>/g, "")
        .trim()
      if (Number.isFinite(startSec) && text) cues.push({ startSec, text })
    }
    i++
  }
  return cues
}

/** HH:MM:SS.mmm | MM:SS.mmm | SS.mmm → seconds. */
function parseVttTime(s: string): number {
  const parts = s.split(":").map((p) => p.trim())
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1])
  }
  return Number(parts[0])
}

/** Score a cue 0-3 by how chapter-worthy it looks. */
function scoreCue(cue: VttCue): number {
  let score = 0
  if (TRANSITION_RE.test(cue.text)) score += 2
  // Question-mark cues are weak signals on their own but become
  // stronger when paired with a topic word.
  if (/\?/.test(cue.text) && /\b(about|on|into|with|for)\b/i.test(cue.text)) score += 1
  // All-caps or ≥3 capitalised words in a row (often section
  // headings spoken aloud, e.g. "OUR FIRST TOPIC")
  if (/\b([A-Z]{2,}\b\s*){2,}/.test(cue.text)) score += 1
  return score
}

/** Build a chapter label from a cue. Picks the noun-ish phrase
 *  after the transition trigger when present; otherwise the first
 *  ~8 words of the cue. Capped at ~60 chars. */
function chapterTitleFromCue(cue: VttCue): string {
  const m = cue.text.match(TRANSITION_RE)
  if (m && m.index !== undefined) {
    const after = cue.text.slice(m.index + m[0].length).trim()
    if (after) {
      const trimmed = after.split(/[.!?]/)[0].trim()
      return clip(trimmed, 60)
    }
  }
  return clip(cue.text.split(/[.!?]/)[0].trim(), 60)
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + "…"
}

/** Public API — extract up to ~12 chapters from a VTT transcript.
 *  Enforces ≥90s spacing between chapters so a dense passage
 *  doesn't spawn a cluster. Returns [] when input is empty or the
 *  recording is too short to chapter usefully (< 5 minutes). */
export function deriveChaptersFromVtt(vtt: string): RecordingChapter[] {
  const cues = parseVtt(vtt)
  if (cues.length === 0) return []
  const totalSec = cues[cues.length - 1]?.startSec ?? 0
  if (totalSec < 300) return []  // < 5 min — chapters are noise

  const MIN_SPACING_SEC = 90
  const MAX_CHAPTERS = 12

  // First pass: collect candidates that scored ≥2 (strong signal).
  const candidates = cues
    .map((c) => ({ cue: c, score: scoreCue(c) }))
    .filter((x) => x.score >= 2)

  // Always include an intro chapter at the first cue so the rail
  // doesn't start at minute 4 of a 60-min recording.
  const out: RecordingChapter[] = [{
    id: "ch-0",
    startSec: cues[0].startSec,
    title: clip(cues[0].text.split(/[.!?]/)[0].trim(), 60) || "Intro",
  }]

  for (const { cue } of candidates) {
    if (out.length >= MAX_CHAPTERS) break
    const lastStart = out[out.length - 1].startSec
    if (cue.startSec - lastStart < MIN_SPACING_SEC) continue
    out.push({
      id: `ch-${out.length}`,
      startSec: cue.startSec,
      title: chapterTitleFromCue(cue),
    })
  }

  // If after that we still only have the intro chapter, fall back
  // to evenly-spaced auto-chapters (every ~10 min) so the rail
  // doesn't render as a single useless pill.
  if (out.length === 1 && totalSec > 600) {
    const step = Math.max(600, Math.round(totalSec / 6))
    let t = step
    while (t < totalSec && out.length < MAX_CHAPTERS) {
      // Find the cue closest to this timestamp.
      const cue = cues.find((c) => c.startSec >= t) ?? cues[cues.length - 1]
      out.push({
        id: `ch-${out.length}`,
        startSec: cue.startSec,
        title: clip(cue.text.split(/[.!?]/)[0].trim(), 60) || `Chapter ${out.length}`,
      })
      t += step
    }
  }

  return out
}

/** Format seconds as `H:MM:SS` (or `MM:SS` for < 1h). */
export function formatChapterTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`
}
