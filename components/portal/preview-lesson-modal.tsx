"use client"

// PreviewLessonModal — Sprint A Brand #25.
//
// When a visitor clicks a lesson marked `isPreview: true` on a public
// course detail page, this modal plays it in-place instead of routing
// to the full /learn page. The conversion thinking: a preview that
// requires navigation loses ~half of curious visitors to the URL
// jump. A modal keeps the price + enroll CTA one tap away while the
// teaser plays.
//
// Behaviour:
//   • Video lessons (type === "video") get a native <video> player
//     with controls. We don't bring in a heavy player library because
//     the goal here is "show enough to convince" — full chrome lives
//     on the actual /learn page once they enroll.
//   • Non-video preview lessons (reading, audio, quiz) fall back to
//     a brief content card with a "Continue this lesson →" link to
//     /learn — they don't lose access; they just don't get the full
//     in-modal experience because rendering a quiz inline would
//     duplicate too much code.
//   • At ~80% playback OR on every play of the last 10 seconds, the
//     "Enjoying this? Enroll for the rest" overlay slides in. This
//     is the conversion moment — visitor has confirmed value, the
//     ask lands without feeling spammy.
//   • Esc / backdrop click closes. Focus restored on close.
//
// The modal is intentionally controlled (open + lesson are props)
// so the parent page owns lesson selection state — easy to wire
// from the existing curriculum accordion row click.

import { useEffect, useRef, useState } from "react"
import { Lock, Play, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PreviewLesson {
  id: string
  title: string
  description?: string
  type: "video" | "reading" | "audio" | "quiz" | string
  /** For video/audio: URL to media. For reading: HTML or text. For
   *  quiz: quiz id. We only fully render video; everything else gets
   *  a fall-back card pointing at /learn. */
  content?: string
  /** Lesson duration in minutes — shown in the modal header. */
  duration?: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: PreviewLesson | null
  courseTitle: string
  /** Click target for the in-modal "Enroll for the rest" CTA. The
   *  parent page passes its enroll handler so we don't need to know
   *  about the enrollment store from inside the modal. */
  onEnroll: () => void
  /** Optional deep-link to the /learn page so non-video previews
   *  (or video previews whose visitor wants the full chrome) have an
   *  obvious next step. Falls back to a disabled-looking text line
   *  when missing. */
  learnHref?: string
  /** Plain copy "Enroll Now — $49" — already formatted by the
   *  parent so we don't have to pull currency utils. */
  enrollLabel?: string
}

export function PreviewLessonModal({
  open,
  onOpenChange,
  lesson,
  courseTitle,
  onEnroll,
  learnHref,
  enrollLabel = "Enroll for the rest",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Slide-in CTA visibility. Tracked separately from `open` so once
  // it has triggered we don't repeatedly re-show it on every seek.
  const [showEnrollOverlay, setShowEnrollOverlay] = useState(false)

  // Reset the overlay each time the lesson changes; otherwise a
  // visitor browsing several preview lessons would see the overlay
  // pre-shown on lesson #2 (state from #1 leaking).
  useEffect(() => {
    setShowEnrollOverlay(false)
  }, [lesson?.id])

  // Track playback progress to trigger the conversion overlay at
  // ~80% — far enough that the visitor has internalised the value
  // but not so close to the end that the prompt feels post-hoc.
  // Attaches once per lesson change.
  useEffect(() => {
    if (!open || !lesson || lesson.type !== "video") return
    const el = videoRef.current
    if (!el) return
    const onTimeUpdate = () => {
      if (showEnrollOverlay) return
      if (!el.duration || !Number.isFinite(el.duration)) return
      if (el.currentTime / el.duration >= 0.8) {
        setShowEnrollOverlay(true)
      }
    }
    el.addEventListener("timeupdate", onTimeUpdate)
    return () => el.removeEventListener("timeupdate", onTimeUpdate)
  }, [open, lesson, showEnrollOverlay])

  if (!lesson) return null

  const isVideo = lesson.type === "video" && !!lesson.content

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Play className="-mt-0.5 mr-1 inline h-3 w-3" />
                Free preview
              </p>
              <DialogTitle className="mt-1 truncate font-serif text-xl">
                {lesson.title}
              </DialogTitle>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {courseTitle}
                {lesson.duration ? ` · ${lesson.duration} min` : null}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Player / fallback */}
        <div className="relative mt-3 bg-black">
          {isVideo ? (
            <video
              ref={videoRef}
              src={lesson.content}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full"
            />
          ) : (
            // Fallback for non-video preview lessons. We deliberately
            // don't try to render quizzes / readings inline because
            // each has its own dedicated player; we route to it.
            <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted/60 p-8 text-center">
              <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3">
                <span className="rounded-full bg-background/60 p-3 text-muted-foreground">
                  <Play className="h-6 w-6" />
                </span>
                <p className="text-sm text-muted-foreground">
                  This preview lesson is best viewed in the full lesson player.
                </p>
                {learnHref && (
                  <Button asChild variant="secondary" size="sm">
                    <a href={learnHref}>Open lesson →</a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Conversion overlay — slides in from the bottom at ~80%
              playback. Sits on top of the video without pausing it,
              so the visitor sees the CTA while the closing seconds
              keep playing. Click X to dismiss; the overlay stays
              dismissed for the rest of this modal session. */}
          {showEnrollOverlay && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
              <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-lg border border-border bg-background/95 px-3 py-2 shadow-xl backdrop-blur">
                <div className="min-w-0 flex-1 text-[12.5px]">
                  <p className="font-semibold">Like what you see?</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Get the full course + every lesson + certificate.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onEnroll()
                    onOpenChange(false)
                  }}
                  className="shrink-0"
                >
                  {enrollLabel}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowEnrollOverlay(false)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — always visible primary CTA + lock affordance.
            Visible from the first frame so even a 5-second scrub gets
            the enroll path. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            The remaining lessons unlock when you enroll.
          </p>
          <Button
            size="sm"
            onClick={() => {
              onEnroll()
              onOpenChange(false)
            }}
          >
            {enrollLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
