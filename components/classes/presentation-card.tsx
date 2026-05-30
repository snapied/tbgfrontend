"use client"

// Presentation recap card — shown on:
//   - Teacher's EndedHostScreen (host/page.tsx)
//   - Student's EndedScreen (live/[sessionId]/page.tsx)
//   - Teacher's class detail page (classes/[id]/page.tsx)
//
// Shows the auto-generated or manually-triggered recap deck status,
// with download and (for teachers) generate/regenerate actions.

import { useCallback, useEffect, useState } from "react"
import { FileText, Download, RefreshCw, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { apiBase } from "@/lib/jitsi"

interface PresentationInfo {
  id: number
  roomCode: string
  title: string
  status: "pending" | "generating" | "ready" | "failed"
  fileUrl: string | null
  fileSizeBytes: number | null
  slideCount: number | null
  meta: {
    sources: string[]
    generatedAt: string
    conceptCount: number
    hasTranscript: boolean
    hasWhiteboards: boolean
  } | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PresentationCard({
  roomCode,
  isTeacher = false,
}: {
  roomCode: string
  isTeacher?: boolean
}) {
  const [presentation, setPresentation] = useState<PresentationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchPresentation = useCallback(async () => {
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(
        `${apiBase()}/api/presentations/${encodeURIComponent(roomCode)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        },
      )
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      const presentations: PresentationInfo[] = data.presentations ?? []
      setPresentation(presentations[0] ?? null)
    } catch {
      // Silent fail — feature is additive
    } finally {
      setLoading(false)
    }
  }, [roomCode])

  useEffect(() => {
    fetchPresentation()
  }, [fetchPresentation])

  // Poll while generating
  useEffect(() => {
    if (!presentation || presentation.status !== "generating") return
    const interval = setInterval(fetchPresentation, 4000)
    return () => clearInterval(interval)
  }, [presentation?.status, fetchPresentation])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(
        `${apiBase()}/api/presentations/${encodeURIComponent(roomCode)}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to generate" }))
        toast.error(err.error || "Failed to generate presentation")
        setGenerating(false)
        return
      }
      toast.success("Generating class recap presentation...")
      // Refresh to pick up the new generating state
      await fetchPresentation()
    } catch {
      toast.error("Failed to start presentation generation")
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    // Delete existing then regenerate
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      await fetch(
        `${apiBase()}/api/presentations/${encodeURIComponent(roomCode)}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        },
      )
      setPresentation(null)
      await handleGenerate()
    } catch {
      toast.error("Failed to regenerate")
    }
  }

  // Don't render anything while loading
  if (loading) return null

  // No presentation yet — show generate button for teachers
  if (!presentation) {
    if (!isTeacher) return null
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-violet-500/10 text-violet-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Class recap slides</p>
              <p className="text-xs text-muted-foreground">
                AI-generated presentation from your class
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3 w-3" />
                Generate recap
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Generating state
  if (presentation.status === "generating") {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-violet-500/10 text-violet-600">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium">Creating recap slides...</p>
              <p className="text-xs text-muted-foreground">
                AI is building your class presentation
              </p>
            </div>
          </div>
          <Badge variant="outline">Processing...</Badge>
        </CardContent>
      </Card>
    )
  }

  // Failed state
  if (presentation.status === "failed") {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-destructive/10 text-destructive">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Presentation failed</p>
              <p className="text-xs text-muted-foreground">
                {presentation.errorMessage || "Something went wrong"}
              </p>
            </div>
          </div>
          {isTeacher && (
            <Button size="sm" variant="outline" onClick={handleRegenerate}>
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Ready state
  return (
    <Card className="border-violet-500/30 bg-violet-500/5">
      <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-violet-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Class recap presentation</p>
            <p className="text-xs text-muted-foreground">
              {presentation.slideCount} slides
              {presentation.fileSizeBytes
                ? ` · ${formatBytes(presentation.fileSizeBytes)}`
                : ""}
              {presentation.meta?.hasTranscript ? " · from transcript" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTeacher && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRegenerate}
              title="Regenerate presentation"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          {presentation.fileUrl && (
            <Button asChild size="sm">
              <a
                href={presentation.fileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-1.5 h-3 w-3" />
                Download .pptx
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
