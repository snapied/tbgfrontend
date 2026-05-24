"use client"

// MobileTeacherControls — Sprint C Classes #46.
//
// Replaces the desktop top-bar with a thumb-reachable bottom tab
// row when the host opens the class on a phone. Three tabs covering
// the in-class jobs:
//   • Stage      — back to the video + whiteboard split
//   • Roster     — participants + hand-raise queue
//   • Tools      — record / share / end class
//
// Why a separate component instead of media-query-styling the
// desktop bar: the desktop top-bar has nuanced spacing assumptions
// (search box on the right, recording indicator pulsing on the
// right) that don't translate to a 320px width. Reimplementing the
// thumb-zone in mobile makes touch targets ≥44px and lets us
// reorder by importance without juggling responsive utility class
// stacks.
//
// Visibility:
//   • Renders inline on screens where the parent passes
//     `visible={true}` (typically gated on `useMediaQuery("(max-width: 768px)")`
//     at the call site).
//   • On wider screens the call site keeps the desktop top-bar
//     and skips mounting this component entirely.

import { Layers, Mic, MicOff, MoreHorizontal, PhoneOff, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Tab = "stage" | "roster" | "tools"

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  /** Pulse "live recording" indicator on the tools tab. */
  isRecording?: boolean
  /** Hand-raise queue count — surfaced as a badge on the roster
   *  tab so a teacher mid-explanation sees "Priya raised her
   *  hand" without flipping tabs. */
  raisedHandCount?: number
  /** Mic state — surfaced as the primary thumb action on the
   *  stage tab (toggle mute is the most-frequent in-call action). */
  micOn?: boolean
  onMicToggle?: () => void
  /** End-class hot button — fires the wrap wizard. Long-press
   *  pattern would be safer but adds complexity; we settle for a
   *  destructive variant so a misclick reads as "wait, that's red". */
  onEndClass?: () => void
}

export function MobileTeacherControls({
  active,
  onChange,
  isRecording,
  raisedHandCount,
  micOn,
  onMicToggle,
  onEndClass,
}: Props) {
  return (
    <div
      role="tablist"
      aria-label="Class controls"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur sm:hidden"
    >
      <div className="grid grid-cols-3">
        <TabButton
          active={active === "stage"}
          onClick={() => onChange("stage")}
          icon={<Layers className="h-4 w-4" />}
          label="Stage"
        />
        <TabButton
          active={active === "roster"}
          onClick={() => onChange("roster")}
          icon={<Users className="h-4 w-4" />}
          label="Roster"
          badge={raisedHandCount && raisedHandCount > 0 ? raisedHandCount : undefined}
        />
        <TabButton
          active={active === "tools"}
          onClick={() => onChange("tools")}
          icon={<MoreHorizontal className="h-4 w-4" />}
          label="Tools"
          indicator={isRecording}
        />
      </div>
      {/* Persistent action strip — mic toggle + end-class. Sits
          above the tab row so the most-frequent in-call action is
          one tap regardless of which tab the teacher is on. */}
      <div className="flex items-center gap-1.5 border-t border-border bg-card/40 px-3 py-1.5">
        <Button
          size="sm"
          variant={micOn ? "outline" : "default"}
          onClick={onMicToggle}
          className="flex-1 gap-1.5"
          aria-pressed={!micOn}
          aria-label={micOn ? "Mute mic" : "Unmute mic"}
        >
          {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          {micOn ? "Mute" : "Unmute"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onEndClass}
          className="gap-1.5"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          End
        </Button>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  indicator,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
  indicator?: boolean
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      // 44px minimum touch target per Apple HIG / WCAG 2.5.5.
      className={cn(
        "relative flex h-12 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className="relative">
        {icon}
        {indicator && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
        {badge !== undefined && (
          <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span>{label}</span>
    </button>
  )
}
