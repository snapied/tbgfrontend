"use client"

// Thin wrapper around shadcn's primitive Breadcrumb that takes a
// simple array of crumbs and renders them with the dashboard's
// muted style. Lives in the layout slot above the page title on deep
// detail pages so the teacher always knows where in the hierarchy
// they are — e.g. "Classes › Algebra basics › Host" — instead of
// guessing from the URL.

import { Fragment } from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export interface BreadcrumbCrumb {
  /** Display label. Truncates with ellipsis on narrow viewports. */
  label: string
  /** Omit for the current page (renders as plain text, not a link). */
  href?: string
}

interface Props {
  crumbs: BreadcrumbCrumb[]
  className?: string
}

export function DashboardBreadcrumbs({ crumbs, className }: Props) {
  if (crumbs.length === 0) return null
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="text-xs">
        {/* Each crumb is one <li>; the separator is its OWN <li>
            sibling — never a child of the previous item. Nested <li>
            triggers a React 19 hydration error in Next 16. We use a
            React.Fragment to group an item + its following separator
            without introducing a wrapper element. */}
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <Fragment key={`${c.label}-${i}`}>
              <BreadcrumbItem>
                {isLast || !c.href ? (
                  <BreadcrumbPage className="max-w-[28ch] truncate">
                    {c.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={c.href}
                      className="max-w-[28ch] truncate hover:text-foreground"
                    >
                      {c.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
