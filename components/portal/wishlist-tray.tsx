"use client"

// WishlistTray — Sprint B Brand #21.
//
// Floating bottom-right chip that surfaces the visitor's saved-for-
// later course count. Click → opens a popover with the saved courses
// + remove + "browse all" link.
//
// Rendered once at the portal layout root so it's reachable from
// every page (home, courses, course detail, blog).
//
// Behaviour rules:
//   • Hidden when count === 0 (nothing to surface; chip would be
//     visual clutter).
//   • Auto-hides on /courses pages so it doesn't double up with the
//     in-page list (the user is already looking at the catalog).
//   • Click outside / Escape closes the popover.

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Heart, X } from "lucide-react"
import { useWishlist } from "@/lib/wishlist"
import { useLMS } from "@/lib/lms-store"
import { cn } from "@/lib/utils"

interface Props {
  /** Tenant slug — same one the wishlist hook keys on. */
  tenantSlug: string
  /** Base path for course links — typically `/p/<tenant>`. */
  basePath: string
}

export function WishlistTray({ tenantSlug, basePath }: Props) {
  const wishlist = useWishlist(tenantSlug)
  const { courses } = useLMS()
  const pathname = usePathname() ?? ""
  const [open, setOpen] = useState(false)

  // Hide on the courses catalogue — visitor is already browsing the
  // full list, the tray would be redundant.
  const hideOnPath = pathname.endsWith("/courses") || pathname.endsWith("/courses/")

  // Close on Escape so keyboard users can dismiss without hunting
  // for the X button.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (wishlist.ids.length === 0 || hideOnPath) return null

  // Resolve the saved course ids against the live catalogue. Stale
  // ids (course unpublished / deleted) silently drop — we don't
  // garbage-collect localStorage here because re-publishing the
  // course should bring the entry back without re-favouriting.
  const savedCourses = wishlist.ids
    .map((id) => courses.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <>
          {/* Backdrop — captures outside-clicks. Transparent so the
              tray sits on top of whatever page state is underneath. */}
          <div
            className="fixed inset-0"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label="Your saved courses"
            className="relative mb-3 w-80 rounded-xl border border-border bg-card p-3 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">
                Saved for later · {savedCourses.length}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {savedCourses.slice(0, 8).map((c) => (
                <li
                  key={c.id}
                  className="group flex items-center gap-2 rounded-md border border-border bg-background p-1.5 text-[12.5px]"
                >
                  {c.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnail}
                      alt=""
                      className="h-10 w-14 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-14 shrink-0 rounded bg-muted" />
                  )}
                  <Link
                    href={`${basePath}/courses/details/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="min-w-0 flex-1 truncate font-medium hover:text-primary"
                  >
                    {c.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => wishlist.remove(c.id)}
                    aria-label={`Remove ${c.title} from wishlist`}
                    className="rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
              {savedCourses.length > 8 && (
                <li className="py-1 text-center text-[11px] text-muted-foreground">
                  +{savedCourses.length - 8} more — open Courses to see all
                </li>
              )}
            </ul>
            <Link
              href={`${basePath}/courses`}
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Browse all courses →
            </Link>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Wishlist · ${wishlist.ids.length} saved`}
        className={cn(
          "group flex h-12 items-center gap-2 rounded-full border border-border bg-background pl-3 pr-4 text-sm font-semibold shadow-lg transition-all hover:shadow-xl",
          open && "ring-2 ring-primary/40",
        )}
      >
        <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
        <span>{wishlist.ids.length}</span>
        <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
          saved
        </span>
      </button>
    </div>
  )
}
