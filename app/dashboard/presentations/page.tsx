"use client"

// Presentations module — embeds the Presenton app in an iframe.
// Dashboard view: shows BigClass header + sidebar (normal layout)
// Editor view: goes fullscreen with a "Back" button
//
// IMPORTANT: Uses a SINGLE iframe that never re-mounts. Only the
// wrapper styling changes between normal and fullscreen mode.

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { ProductTour } from "@/components/tour/product-tour"
import { PRESENTATIONS_TOUR, PRESENTATIONS_TOUR_ID } from "@/components/dashboard/tours"

const ACCESS_TOKEN_KEY = "thebigclass.accessToken"

function presentationsUrl(): string {
  return process.env.NEXT_PUBLIC_PRESENTATIONS_URL || "http://localhost:4100"
}

export default function PresentationsPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loading, setLoading] = useState(true)
  const [iframeSrc, setIframeSrc] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  // Build iframe URL on mount with fresh token
  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    const base = `${presentationsUrl()}/presentation`
    setIframeSrc(token ? `${base}?token=${encodeURIComponent(token)}` : base)
  }, [])

  // Listen for messages from the iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "presenton:ready") setLoading(false)
      if (event.data?.type === "presenton:requestToken") {
        const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
        if (token && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: "bigclass:auth", token }, "*")
        }
      }
      // Track navigation inside iframe
      if (event.data?.type === "presenton:navigation") {
        const path = event.data.path as string
        const isEditorPage = path !== "/presentation" && path.startsWith("/presentation")
        setIsEditing(isEditorPage)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  // Fallback: detect editor by polling iframe URL
  useEffect(() => {
    if (!iframeRef.current) return
    const interval = setInterval(() => {
      try {
        const path = iframeRef.current?.contentWindow?.location.pathname
        if (path) {
          const isEditorPage = path !== "/presentation" && path.startsWith("/presentation")
          setIsEditing(isEditorPage)
        }
      } catch {
        // Cross-origin — can't read
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [iframeSrc])

  // Hide loading after timeout
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!iframeSrc) return null

  return (
    <>
      <ProductTour tourId={PRESENTATIONS_TOUR_ID} steps={PRESENTATIONS_TOUR} />

      {/* Single iframe — wrapper changes between normal and fullscreen */}
      <div
        className={
          isEditing
            ? "fixed inset-0 z-40 flex flex-col bg-background"
            : "relative h-[calc(100vh-64px)] w-full"
        }
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading presentations...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="h-full w-full flex-1 border-0"
          allow="clipboard-read; clipboard-write; fullscreen"
          title="Presentations"
          onLoad={() => setLoading(false)}
        />
      </div>
    </>
  )
}
