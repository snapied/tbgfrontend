"use client"

// Back button that uses browser history (router.back()) instead of
// a hardcoded href. Falls back to a provided href if there's no
// history (e.g. user opened the page directly from a shared link).

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  label?: string
  fallbackHref?: string
  className?: string
}

export function BackButton({ label = "Back", fallbackHref, className }: Props) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back()
        } else if (fallbackHref) {
          router.push(fallbackHref)
        } else {
          router.back()
        }
      }}
    >
      <ArrowLeft className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  )
}
