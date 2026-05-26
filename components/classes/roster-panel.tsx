"use client"

import { useParticipants, useLocalParticipant } from "@livekit/components-react"
import { Mic, MicOff, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export function RosterPanel({ onClose }: { onClose: () => void }) {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()

  const handleMuteAll = () => {
    if (!localParticipant) return
    const msg = JSON.stringify({ type: "MUTE_ALL" })
    localParticipant.publishData(new TextEncoder().encode(msg), { reliable: true })
  }

  const handleMuteUser = (userId: string) => {
    if (!localParticipant) return
    const msg = JSON.stringify({ type: "MUTE_USER", userId })
    localParticipant.publishData(new TextEncoder().encode(msg), { reliable: true })
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-card w-full">
      <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Participants ({participants.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 px-2 text-xs">
          Close
        </Button>
      </div>

      <div className="p-4 border-b border-border">
        <Button variant="outline" size="sm" className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleMuteAll}>
          <MicOff className="h-4 w-4" />
          Mute All Students
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {participants.map((p) => {
            const isAudioMuted = !p.isMicrophoneEnabled
            const isMe = p.identity === localParticipant?.identity
            return (
              <div key={p.identity} className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-medium">
                    {p.name || p.identity} {isMe && "(You)"}
                  </span>
                </div>
                {!isMe && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleMuteUser(p.identity)}
                    title={isAudioMuted ? "Already muted" : "Mute participant"}
                    disabled={isAudioMuted}
                  >
                    {isAudioMuted ? <MicOff className="h-4 w-4 text-destructive/70" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
