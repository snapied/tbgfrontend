"use client"

// Send-DM dialog. Spawns from member profile sheets or anywhere a
// user wants to start a private 1:1 conversation. After send, the
// DM lands in the Inbox under the new "Direct messages" filter.

import { useState } from "react"
import { Send, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { sendDirectMessage } from "@/lib/direct-messages"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  senderId: string
  recipient: { id: string; name: string }
}

export function SendDMDialog({ open, onOpenChange, senderId, recipient }: Props) {
  const [body, setBody] = useState("")

  function send() {
    const msg = sendDirectMessage({ senderId, recipientId: recipient.id, body })
    if (!msg) {
      toast.error("Couldn't send — empty message or invalid recipient.")
      return
    }
    toast.success(`Sent privately to ${recipient.name}.`)
    setBody("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Send a private message
          </DialogTitle>
          <DialogDescription>
            Only you and{" "}
            <span className="font-semibold text-foreground">{recipient.name}</span> can see this.
            Lands in their Inbox under <span className="font-medium">Direct messages</span>.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 1500))}
          placeholder={`Write to ${recipient.name}…`}
          rows={5}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send()
          }}
        />
        <p className="text-right text-[10px] tabular-nums text-muted-foreground">
          {body.length} / 1500 · ⌘/Ctrl + Enter to send
        </p>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button onClick={send} disabled={!body.trim()} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Send privately
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
