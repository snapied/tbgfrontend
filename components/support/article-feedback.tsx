"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export function ArticleFeedback() {
  const [feedbackState, setFeedbackState] = useState<"idle" | "submitted">("idle")

  if (feedbackState === "submitted") {
    return (
      <div className="mt-16 border-t pt-8 flex items-center gap-2 text-success">
        <CheckCircle2 className="h-5 w-5" />
        <p className="text-sm font-medium">Thank you for your feedback!</p>
      </div>
    )
  }

  return (
    <div className="mt-16 border-t pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">Was this article helpful?</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setFeedbackState("submitted")}>
          Yes
        </Button>
        <Button variant="outline" size="sm" onClick={() => setFeedbackState("submitted")}>
          No
        </Button>
      </div>
    </div>
  )
}
