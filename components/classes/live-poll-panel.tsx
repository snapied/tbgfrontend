"use client"

// LivePollPanel — single component that branches on `isHost`:
//   • Host       — composer (question + 2-4 options) + launch /
//                  close / clear controls + live result bars.
//   • Student    — vote buttons (or read-only result bars when
//                  closed); their previous vote is remembered.
// One poll per session at a time. Lives in tenant-scoped
// localStorage via lib/live-poll; both surfaces poll the same
// channel every 1.5s. Wire into the host page's stage rail next
// to breakouts/agenda.

import { useEffect, useState } from "react"
import { BarChart3, Play, PlusCircle, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  castVote,
  clearPoll,
  closePoll,
  launchPoll,
  tallyPoll,
  useLivePoll,
  type LivePoll,
} from "@/lib/live-poll"

interface Props {
  sessionId: string
  /** Host vs student branch — host gets the composer, student
   *  gets the vote buttons. */
  isHost: boolean
  /** Stable id of the current viewer (used to key their vote).
   *  Signed-in user id or a guest-* fallback. */
  viewerId: string
  /** Optional close handler — when set the host panel renders an
   *  X in the header so the rail can be dismissed. */
  onClose?: () => void
  /** Fired on host-side immediately after a poll is launched.
   *  Host page uses this to fan out notifications to enrolled
   *  students + invited co-instructors. */
  onLaunched?: (poll: LivePoll) => void
  /** Fired on host-side when the poll closes. Carries the live
   *  poll snapshot so the consumer can compute winner / total
   *  votes for the notification body. */
  onClosed?: (poll: LivePoll) => void
  /** Pre-staged polls composed at scheduling time (CL6). Each
   *  unlaunched entry renders as a one-tap launcher above the
   *  composer. Already-launched entries hide. */
  prestagedPolls?: Array<{
    id: string
    question: string
    options: string[]
    launchedPollId?: string
  }>
  /** Fired after a pre-staged poll is launched so the host page
   *  can persist `launchedPollId` to the LiveSession. */
  onPrestagedLaunched?: (prestagedId: string, launchedPollId: string) => void
}

export function LivePollPanel({ sessionId, isHost, viewerId, onClose, onLaunched, onClosed, prestagedPolls, onPrestagedLaunched }: Props) {
  const poll = useLivePoll(sessionId)

  if (isHost) return <HostPanel sessionId={sessionId} poll={poll} onClose={onClose} onLaunched={onLaunched} onClosed={onClosed} prestagedPolls={prestagedPolls} onPrestagedLaunched={onPrestagedLaunched} />
  return <StudentPanel sessionId={sessionId} poll={poll} viewerId={viewerId} />
}

function HostPanel({
  sessionId,
  poll,
  onClose,
  onLaunched,
  onClosed,
  prestagedPolls,
  onPrestagedLaunched,
}: {
  sessionId: string
  poll: ReturnType<typeof useLivePoll>
  onClose?: () => void
  onLaunched?: (poll: LivePoll) => void
  onClosed?: (poll: LivePoll) => void
  prestagedPolls?: Array<{ id: string; question: string; options: string[]; launchedPollId?: string }>
  onPrestagedLaunched?: (prestagedId: string, launchedPollId: string) => void
}) {
  // Composer state — only mounted when no poll is live OR the
  // host wants to launch another after closing this one.
  const [composerOpen, setComposerOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState<string[]>(["", ""])

  // Reset the composer whenever a new poll lands. Otherwise the
  // previous draft sticks around stale.
  useEffect(() => {
    if (poll && !poll.closedAt) {
      setComposerOpen(false)
      setQuestion("")
      setOptions(["", ""])
    }
  }, [poll?.id, poll?.closedAt])

  const launchable = question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2

  const Header = (
    <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Live poll</p>
        <p className="text-[11px] text-muted-foreground">
          One poll at a time · students see it instantly
        </p>
      </div>
      {onClose && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close panel">
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )

  // Pre-staged polls (CL6) — composed at scheduling, fired one-tap
  // here. Filter to those not-yet-launched.
  const availablePrestaged = (prestagedPolls ?? []).filter((p) => !p.launchedPollId)

  function launchPrestaged(staged: { id: string; question: string; options: string[] }) {
    const next = launchPoll(sessionId, {
      question: staged.question,
      optionLabels: staged.options,
    })
    onLaunched?.(next)
    onPrestagedLaunched?.(staged.id, next.id)
  }

  // No poll active → composer or "Launch poll" CTA.
  if (!poll) {
    return (
      <div className="flex h-full flex-col">
        {Header}
        {/* Pre-staged launchers (CL6). One tap fires the poll —
            zero typing mid-lecture. */}
        {availablePrestaged.length > 0 && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/[0.04] p-2.5">
            <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              Pre-staged · {availablePrestaged.length} ready
            </p>
            <ul className="space-y-1">
              {availablePrestaged.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => launchPrestaged(p)}
                    className="group flex w-full items-center gap-2 rounded-md border border-primary/20 bg-card px-2 py-1.5 text-left text-[12px] transition-all hover:border-primary hover:shadow-sm"
                    title={`Launch poll: ${p.question}`}
                  >
                    <span className="line-clamp-1 min-w-0 flex-1 font-medium text-foreground">
                      {p.question || "(untitled)"}
                    </span>
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground opacity-90 transition-opacity group-hover:opacity-100">
                      Launch →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!composerOpen ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {availablePrestaged.length > 0
                ? "Pre-staged polls above — or compose a new one."
                : "No poll running. Launch one to gauge the room."}
            </p>
            <Button size="sm" onClick={() => setComposerOpen(true)}>
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              {availablePrestaged.length > 0 ? "New poll" : "Launch poll"}
            </Button>
          </div>
        ) : (
          <Composer
            question={question}
            setQuestion={setQuestion}
            options={options}
            setOptions={setOptions}
            launchable={launchable}
            onCancel={() => setComposerOpen(false)}
            onLaunch={() => {
              const next = launchPoll(sessionId, {
                question,
                optionLabels: options,
              })
              // Composer auto-closes via the effect above. Fire
              // the host-side launched callback so the parent can
              // fan out notifications to enrolled students +
              // invited co-instructors.
              onLaunched?.(next)
            }}
          />
        )}
      </div>
    )
  }

  // Poll is live (or closed) → results view + host controls.
  const tally = tallyPoll(poll)
  const total = Object.keys(poll.votes).length
  return (
    <div className="flex h-full flex-col">
      {Header}
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-foreground">{poll.question}</p>
        <p className="text-[11px] text-muted-foreground">
          {total} {total === 1 ? "vote" : "votes"}
          {poll.closedAt && " · poll closed"}
        </p>
      </div>
      <ResultBars tally={tally} />
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {!poll.closedAt ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              closePoll(sessionId)
              onClosed?.(poll)
            }}
          >
            Close poll
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={() => {
              clearPoll(sessionId)
              setComposerOpen(true)
            }}>
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> New poll
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => clearPoll(sessionId)}
            >
              Clear
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function StudentPanel({
  sessionId,
  poll,
  viewerId,
}: {
  sessionId: string
  poll: ReturnType<typeof useLivePoll>
  viewerId: string
}) {
  if (!poll) return null

  const myVote = poll.votes[viewerId]
  const locked = !!poll.closedAt

  // Already voted and poll still open — remove from view
  if (myVote && !locked) return null

  const tally = tallyPoll(poll)
  const total = Object.keys(poll.votes).length

  return (
    <div className="space-y-3 rounded-md border border-primary/20 bg-primary/[0.04] p-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Live poll
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{poll.question}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {total} {total === 1 ? "vote" : "votes"}
          {locked && " · closed"}
        </p>
      </div>
      {locked ? (
        <ResultBars tally={tally} />
      ) : (
        <div className="space-y-1.5">
          {poll.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => castVote(sessionId, viewerId, opt.id)}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/40"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultBars({ tally }: { tally: ReturnType<typeof tallyPoll> }) {
  const winner = Math.max(...tally.map((t) => t.count), 0)
  return (
    <ol className="mt-3 space-y-2">
      {tally.map((t) => {
        const isWinner = winner > 0 && t.count === winner
        return (
          <li key={t.optionId} className="space-y-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className={cn("font-medium text-foreground", isWinner && "text-primary")}>
                {t.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {t.count} · {t.pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", isWinner ? "bg-primary" : "bg-primary/40")}
                style={{ width: `${t.pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Composer({
  question,
  setQuestion,
  options,
  setOptions,
  launchable,
  onCancel,
  onLaunch,
}: {
  question: string
  setQuestion: (v: string) => void
  options: string[]
  setOptions: (v: string[]) => void
  launchable: boolean
  onCancel: () => void
  onLaunch: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Question
        </label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Should we cover hooks today or next week?"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Options (2–4)
        </label>
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={o}
              onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`Option ${i + 1}`}
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setOptions(options.filter((_, j) => j !== i))}
                aria-label="Remove option"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        {options.length < 4 && (
          <Button
            variant="outline"
            size="sm"
            className="custom_accent_button"
            onClick={() => setOptions([...options, ""])}
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add option
          </Button>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" className="custom_accent_button" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={!launchable} onClick={onLaunch}>
          <Play className="mr-1.5 h-3.5 w-3.5" /> Launch poll
        </Button>
      </div>
    </div>
  )
}
