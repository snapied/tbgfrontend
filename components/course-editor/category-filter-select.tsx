"use client"

// Grouped category filter for browse pages (public /courses, dashboard
// course list, anywhere else we surface a "filter by category" dropdown).
//
// Differs from CategoryCombobox in two key ways:
//   1. Read-from-data — only shows categories that actually exist in the
//      provided `available` set, so a user never picks a filter that
//      returns zero results.
//   2. Standard shadcn Select (with SelectGroup + SelectLabel headings),
//      not a Popover/Command. Filter dropdowns are short here because we
//      already trimmed to what's present, so search isn't worth the
//      complexity.
//
// Categories that aren't in the predefined taxonomy (custom names typed
// by a teacher via the "Custom / Other" flow) bucket into an "Other"
// group at the bottom so they remain reachable.

import { useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CATEGORY_GROUPS } from "@/lib/course-categories"

// Sentinel for the "show everything" option. Not "" — shadcn Select
// rejects empty string values.
export const ALL_CATEGORIES_VALUE = "all"

interface Props {
  value: string
  onChange: (value: string) => void
  // Categories that actually have items in the current dataset. Anything
  // not in this set is omitted from the dropdown; anything in this set
  // but not in CATEGORY_GROUPS lands in the "Other" bucket.
  available: string[]
  placeholder?: string
  className?: string
  // Label shown on the "select all" option. Defaults to "All categories".
  allLabel?: string
}

export function CategoryFilterSelect({
  value,
  onChange,
  available,
  placeholder = "Category",
  className,
  allLabel = "All categories",
}: Props) {
  const { groupsWithAvailable, customOthers } = useMemo(() => {
    // Drop empty / whitespace entries before anything else — shadcn's
    // Select (Radix) throws at render time if any SelectItem receives an
    // empty string value, so a stray course with category === "" used to
    // crash the whole page.
    const availSet = new Set(available.filter((c) => c.trim()))
    const known = new Set<string>(CATEGORY_GROUPS.flatMap((g) => g.items))
    const groupsWithAvailable = CATEGORY_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((i) => availSet.has(i)) }))
      .filter((g) => g.items.length > 0)
    const customOthers = [...availSet]
      .filter((c) => !known.has(c))
      .sort((a, b) => a.localeCompare(b))
    return { groupsWithAvailable, customOthers }
  }, [available])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("w-44", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[60vh]">
        <SelectItem value={ALL_CATEGORIES_VALUE}>{allLabel}</SelectItem>
        {groupsWithAvailable.map((g) => (
          <SelectGroup key={g.group}>
            <SelectLabel>{g.group}</SelectLabel>
            {g.items.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectGroup>
        ))}
        {customOthers.length > 0 && (
          <SelectGroup>
            <SelectLabel>Other</SelectLabel>
            {customOthers.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
