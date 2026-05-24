"use client"

// AddToCalendarMenu — dropdown that gives the user every realistic
// way to put a class on their calendar in one click.
//
// Three deep-link routes (Google / Outlook / Apple) handle most
// users without leaving the browser; the ICS download is the
// fallback for everything else (Thunderbird, Spark, Outlook
// desktop, third-party apps). All four are powered by the same
// CalendarEvent payload so labels + times match across providers.

import { CalendarCheck, ChevronDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  appleCalendarHref,
  downloadIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from "@/lib/calendar-ics"

interface Props {
  event: CalendarEvent
  /** Label override — defaults to "Add to calendar". Useful when
   *  this lives next to other CTAs and needs to be terse. */
  label?: string
  /** Match the parent's button rhythm — defaults to outline. */
  variant?: "outline" | "ghost" | "default"
}

export function AddToCalendarMenu({ event, label = "Add to calendar", variant = "outline" }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant}>
          <CalendarCheck className="mr-1.5 h-4 w-4" />
          {label}
          <ChevronDown className="ml-1.5 h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <a
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mr-2 text-lg leading-none" aria-hidden>📅</span>
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={outlookCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mr-2 text-lg leading-none" aria-hidden>📨</span>
            Outlook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          {/* data: URL — Safari opens directly in Apple Calendar.
              Other browsers will just download the .ics, which is
              the same outcome as the manual download option below. */}
          <a href={appleCalendarHref(event)}>
            <span className="mr-2 text-lg leading-none" aria-hidden>🍎</span>
            Apple Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => downloadIcs(event)}>
          <Download className="mr-2 h-4 w-4" />
          Download .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
