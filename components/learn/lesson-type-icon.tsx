// Shared icon mapping for a lesson type. Used on every curriculum
// outline (dashboard preview, public course page, learn-sidebar) so a
// "live" lesson always shows the radio icon, an "embed" always the
// webhook icon, etc. The curriculum editor has its own TYPE_META map
// for the picker — this is the rendering-side equivalent.

import {
  FileText,
  type LucideIcon,
  Music,
  Play,
  Radio,
  Sparkles,
  Type as TypeIcon,
  Webhook,
} from "lucide-react"
import type { LessonType } from "@/lib/lms-store"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<LessonType, LucideIcon> = {
  video:    Play,
  text:     TypeIcon,
  pdf:      FileText,
  document: FileText,
  embed:    Webhook,
  audio:    Music,
  quiz:     Sparkles,
  live:     Radio,
}

const LABEL_MAP: Record<LessonType, string> = {
  video:    "Video",
  text:     "Reading",
  pdf:      "PDF",
  document: "Document",
  embed:    "Embed",
  audio:    "Audio",
  quiz:     "Quiz",
  live:     "Live class",
}

export function lessonTypeLabel(type: LessonType): string {
  return LABEL_MAP[type] ?? "Lesson"
}

export function LessonTypeIcon({
  type,
  className,
}: {
  type: LessonType
  className?: string
}) {
  const Icon = ICON_MAP[type] ?? Play
  return <Icon className={cn("h-4 w-4", className)} />
}
