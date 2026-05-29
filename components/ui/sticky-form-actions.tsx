"use client"

// Renders Save + Cancel buttons at the top AND bottom of a form when
// the form is tall enough (>600px). On short forms, only the bottom
// buttons are shown. The bottom bar sticks to the viewport bottom so
// it's always reachable without scrolling.

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Save, X } from "lucide-react"

interface Props {
  onSave: () => void
  onCancel?: () => void
  saving?: boolean
  disabled?: boolean
  saveLabel?: string
  cancelLabel?: string
  /** Ref to the form container — used to measure height */
  formRef: React.RefObject<HTMLElement | null>
}

export function StickyFormActions({
  onSave,
  onCancel,
  saving,
  disabled,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  formRef,
}: Props) {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const el = formRef.current
    if (!el) return
    const check = () => setShowTop(el.scrollHeight > 600)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [formRef])

  const buttons = (
    <div className="flex items-center justify-end gap-2">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-1.5 h-3.5 w-3.5" />
          {cancelLabel}
        </Button>
      )}
      <Button type="button" onClick={onSave} disabled={disabled || saving}>
        {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
        {saving ? "Saving..." : saveLabel}
      </Button>
    </div>
  )

  return (
    <>
      {showTop && (
        <div className="mb-4 border-b border-border pb-4">
          {buttons}
        </div>
      )}
      <div className="sticky bottom-0 z-10 -mx-1 mt-6 border-t border-border bg-card/95 px-1 py-3 backdrop-blur">
        {buttons}
      </div>
    </>
  )
}
