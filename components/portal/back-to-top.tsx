"use client"

// Floating "back to top" pill. Appears only after the visitor has
// scrolled past 1.5 viewports — i.e. they're deep enough that
// scrolling back manually feels like work. Stays out of the way on
// short pages so the chrome doesn't feel noisy on a 1-screen
// landing. Fade-in / fade-out via opacity + pointer-events for
// keyboard a11y; smooth-scroll respects `prefers-reduced-motion`.

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const threshold = () => window.innerHeight * 1.5
    const onScroll = () => setVisible(window.scrollY > threshold())
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => {
        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" })
      }}
      className={cn(
        "fixed bottom-6 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full",
        "border border-border bg-background/85 text-foreground shadow-lg backdrop-blur",
        "transition-opacity duration-200 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  )
}
