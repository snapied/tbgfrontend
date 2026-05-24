"use client"

// SkipToContent — Sprint C Brand #48.
//
// Visually-hidden link that becomes visible when a keyboard user
// tabs into it as the first focusable element on the page. Jumps
// focus past the nav into <main id="main-content"> so screen-reader
// + keyboard users don't have to skip through every header/sidebar
// link to reach the actual page content.
//
// Required pattern per WCAG 2.4.1 Bypass Blocks. We expose this as
// a single component so mounting it inside multiple layouts
// (portal + dashboard + auth) stays consistent — the styling and
// target id never drift across surfaces.
//
// Consumers must:
//   1. Mount <SkipToContent /> as the FIRST child of the layout.
//   2. Add `id="main-content"` to the page's <main> wrapper (or
//      override via the `target` prop).

interface Props {
  /** DOM id to focus when activated. Defaults to "main-content"
   *  which is the convention every layout in this app uses. */
  target?: string
  /** Visible label. Default copy works for English; pass through
   *  useT() output when mounting inside the public portal so it
   *  translates with the rest of the chrome. */
  label?: string
}

export function SkipToContent({
  target = "main-content",
  label = "Skip to main content",
}: Props) {
  return (
    <a
      href={`#${target}`}
      // Visually hidden until focused. We can't use the
      // `sr-only` Tailwind utility alone because that hides it
      // even on focus; we need the "focus:not-sr-only" pair so
      // tab-into reveals it as a real button on screen.
      //
      // Position: absolute + top:0/left:0 with z-50 ensures the
      // link paints on top of the sticky header / pill nav once
      // visible. We deliberately avoid `fixed` because some
      // layouts wrap their sticky chrome in a container with
      // its own stacking context.
      className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:inline-flex focus:items-center focus:rounded-md focus:border focus:border-primary focus:bg-background focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {label}
    </a>
  )
}
