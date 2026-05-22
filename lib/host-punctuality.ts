"use client"

// "How punctual is this instructor?" — derived stats over their past
// classes. Surfaces in the student waiting room so the countdown
// reads with context ("instructor usually opens 2 min early") instead
// of as a raw clock.
//
// Source of truth: liveSessions in lms-store. We compute on demand
// (cheap — a handful of sessions per instructor) rather than caching.

import type { LiveSession } from "./lms-store"

export interface PunctualityStat {
  /** Number of past sessions considered (capped at MAX_SAMPLES). */
  sampleSize: number
  /** Median minutes the host opened the room vs scheduledAt.
   *  Negative = early, positive = late. Null when sampleSize === 0. */
  medianDiffMin: number | null
  /** Short, calming line for the lobby. Always present, even when
   *  there's no history (falls back to a neutral copy). */
  label: string
}

const MAX_SAMPLES = 5
// "Right on time" tolerance — anything within ±2 minutes reads as on
// time so we don't claim "1 min late" when the host's clock is just a
// few seconds out of sync.
const ON_TIME_TOLERANCE_MIN = 2

export function computeHostPunctuality(
  allSessions: readonly LiveSession[],
  hostId: string,
  /** Optional: exclude this session id (the one the student's waiting on). */
  excludeSessionId?: string,
): PunctualityStat {
  const past = allSessions
    .filter((s) => s.hostId === hostId)
    .filter((s) => s.id !== excludeSessionId)
    // Only count sessions where the host actually opened a room — no
    // signal from scheduled-but-cancelled or scheduled-but-no-show.
    .filter((s) => !!s.roomOpenedAt && !!s.scheduledAt)
    .sort((a, b) =>
      // Most recent first.
      (b.roomOpenedAt ?? "").localeCompare(a.roomOpenedAt ?? ""),
    )
    .slice(0, MAX_SAMPLES)

  if (past.length === 0) {
    return {
      sampleSize: 0,
      medianDiffMin: null,
      // Fallback copy is intentionally calm — no "no data" phrasing
      // that would make the student worry. Most first-timers are
      // perfectly punctual; we just don't have proof yet.
      label: "We'll beam you in the second the room opens.",
    }
  }

  const diffs = past
    .map((s) => {
      const opened = new Date(s.roomOpenedAt as string).getTime()
      const scheduled = new Date(s.scheduledAt).getTime()
      return Math.round((opened - scheduled) / 60_000)
    })
    .sort((a, b) => a - b)
  // Use median rather than mean — one outlier (host hit "Open" 90 min
  // early last week for a test) shouldn't dominate the reading.
  const mid = Math.floor(diffs.length / 2)
  const medianDiffMin =
    diffs.length % 2 === 1
      ? diffs[mid]
      : Math.round((diffs[mid - 1] + diffs[mid]) / 2)

  return {
    sampleSize: past.length,
    medianDiffMin,
    label: describePunctuality(medianDiffMin, past.length),
  }
}

function describePunctuality(diff: number, sampleSize: number): string {
  const sessionWord = sampleSize === 1 ? "class" : "classes"
  if (Math.abs(diff) <= ON_TIME_TOLERANCE_MIN) {
    // "Last N classes" reads better than "last 1 class" — singular
    // case below.
    return sampleSize === 1
      ? "Instructor opened their last class right on time."
      : `Instructor opened the last ${sampleSize} ${sessionWord} on time.`
  }
  if (diff < 0) {
    const min = Math.abs(diff)
    return `Instructor usually opens the room about ${min} min early.`
  }
  return `Instructor usually opens the room about ${diff} min after the scheduled time.`
}
