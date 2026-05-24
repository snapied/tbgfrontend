"use client"

// BreakoutRoomsPanel — Sprint C Classes #17 consumer UI.
//
// Sits in the teacher's right-rail tools tab. Drives the
// useBreakoutRooms primitive with three jobs:
//
//   1. Create N rooms in one shot ("Split into 6 rooms of 4").
//   2. Auto-assign every participant currently in the session into
//      the rooms, load-balanced (least-full first).
//   3. Move individuals between rooms via a kebab menu — fixes the
//      common "the group of 3 is too quiet, pull Anita in" need.
//   4. Merge back: pulls everyone into the main session.
//
// We deliberately don't model "rooms have their own audio/video"
// — that's a LiveKit-side concern. The panel orchestrates intent;
// the LiveKit hooks pick up `breakoutRooms` from the session
// metadata and join people into the right sub-room.

import { useState } from "react"
import { Layers, Plus, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useBreakoutRooms } from "@/lib/live-class-features"

interface ParticipantLite {
  id: string
  name: string
}

interface Props {
  sessionId: string
  participants: ParticipantLite[]
  /** Optional close handler — when omitted the panel renders without
   *  a header X (useful inline; not in a sheet). */
  onClose?: () => void
}

export function BreakoutRoomsPanel({ sessionId, participants, onClose }: Props) {
  const breakouts = useBreakoutRooms(sessionId)
  const [count, setCount] = useState<number>(3)
  const [sizeHint, setSizeHint] = useState<number>(4)

  const handleCreate = () => {
    if (count < 1) return
    breakouts.createRooms(count, sizeHint)
  }
  const handleAutoAssign = () => {
    if (participants.length === 0) return
    breakouts.autoAssign(participants.map((p) => p.id))
  }

  const assigned = new Set(breakouts.rooms.flatMap((r) => r.participants))
  const unassigned = participants.filter((p) => !assigned.has(p.id))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="h-4 w-4" />
          Breakout rooms
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close breakouts panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {breakouts.rooms.length === 0 ? (
        <div className="space-y-2.5 rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <p className="text-[12.5px] text-muted-foreground">
            Split the class into small groups for discussion or pair work. Auto-assign distributes
            everyone evenly; merge back when you&apos;re done.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]" htmlFor="bo-count">
                Rooms
              </Label>
              <Input
                id="bo-count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]" htmlFor="bo-size">
                Target size
              </Label>
              <Input
                id="bo-size"
                type="number"
                min={2}
                max={20}
                value={sizeHint}
                onChange={(e) => setSizeHint(Math.max(2, Number(e.target.value) || 2))}
              />
            </div>
          </div>
          <Button size="sm" onClick={handleCreate} className="w-full">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create {count} {count === 1 ? "room" : "rooms"}
          </Button>
        </div>
      ) : (
        <>
          {/* Header strip */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoAssign}
              disabled={unassigned.length === 0}
            >
              Auto-assign {unassigned.length || "all"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    `End breakouts and pull all ${assigned.size} participants back?`,
                  )
                ) {
                  breakouts.mergeBack()
                }
              }}
            >
              Merge back
            </Button>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {assigned.size}/{participants.length} placed
            </span>
          </div>

          {/* Room list */}
          <ul className="space-y-2">
            {breakouts.rooms.map((room) => (
              <li
                key={room.id}
                className="rounded-lg border border-border bg-card p-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12.5px] font-semibold">{room.label}</p>
                  <span className="text-[10.5px] text-muted-foreground tabular-nums">
                    {room.participants.length} in
                  </span>
                </div>
                {room.participants.length === 0 ? (
                  <p className="mt-1.5 text-[11px] italic text-muted-foreground">
                    Empty — drop someone in below.
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {room.participants.map((pid) => {
                      const p = participants.find((x) => x.id === pid)
                      return (
                        <li key={pid} className="flex items-center justify-between gap-2 text-[11.5px]">
                          <span className="truncate">{p?.name ?? "Unknown"}</span>
                          <Select
                            value={room.id}
                            onValueChange={(toRoomId) => breakouts.movePeer(pid, toRoomId)}
                          >
                            <SelectTrigger className="h-6 w-24 text-[10.5px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {breakouts.rooms.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* Unassigned bench — surfaces participants not in any
              breakout. Useful when a late joiner walks in and the
              auto-assign needs a refresh. */}
          {unassigned.length > 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Not in a breakout · {unassigned.length}
              </p>
              <ul className="mt-1.5 space-y-1">
                {unassigned.slice(0, 10).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="truncate">{p.name}</span>
                    {breakouts.rooms[0] && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-6 px-1.5 text-[10.5px]")}
                        onClick={() => breakouts.movePeer(p.id, breakouts.rooms[0].id)}
                      >
                        Place
                      </Button>
                    )}
                  </li>
                ))}
                {unassigned.length > 10 && (
                  <li className="text-[10.5px] text-muted-foreground">
                    +{unassigned.length - 10} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
