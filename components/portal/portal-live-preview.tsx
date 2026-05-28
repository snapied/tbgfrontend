"use client"

// Embedded live preview of the tenant's public portal. Renders the
// actual public route inside an iframe so the dashboard previews are
// always 100% honest — no parallel "fake" component to drift out of
// sync with what the visitor sees.
//
// Device toggle constrains the iframe's max-width to the chosen
// breakpoint (no CSS transform/scale, no fake bezel) so the iframe
// renders at native size and edits in the dashboard reflect cleanly.
//
// Cross-frame sync: brand/portal changes made in the dashboard write
// to localStorage in the parent window. PortalProvider listens for
// the `storage` event in every same-origin context (including this
// iframe), so the preview re-renders automatically — no manual
// refresh needed in the common case.

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePortal } from "@/lib/portal-store"

type Device = "desktop" | "tablet" | "mobile"

// Width the iframe RENDERS at — i.e. what the public site sees as its
// viewport. We force a real desktop width even when the dashboard
// column is narrow (sidebar + half-screen split), and use CSS
// transform: scale() to fit the iframe visually into the available
// space. Without this the iframe rendered at the dashboard's column
// width (often ~600px), and the responsive site collapsed to its
// mobile layout — making "desktop preview" look identical to mobile.
const DEVICE_VIEWPORT_W: Record<Device, number> = {
  desktop: 1280,
  tablet: 820,
  mobile: 420,
}

interface Props {
  tenant: string
  /** Defaults to "/" — pass "/about" / "/instructors" / etc. to deep-link. */
  path?: string
  /** When true, the preview is full-bleed inside its container. */
  className?: string
  /** Show the device-toggle + URL + open + refresh chrome. */
  showChrome?: boolean
  /** Hide the device toggle (still shows refresh + open). */
  hideDeviceToggle?: boolean
  /** Force a specific device on first render. */
  defaultDevice?: Device
  /** Preview height in px. Defaults to 720. */
  height?: number
  /**
   * When true (default), the iframe reloads automatically — debounced —
   * whenever the portal config or org settings change in the parent
   * window. Same-window writers don't receive the `storage` event, so
   * inline edits on the same page (Brand, Home, etc.) need this nudge
   * to show up in the preview.
   */
  autoRefresh?: boolean
}

export function PortalLivePreview({
  tenant,
  path = "/",
  className,
  showChrome = true,
  hideDeviceToggle,
  defaultDevice = "desktop",
  height = 720,
  autoRefresh = true,
}: Props) {
  const [device, setDevice] = useState<Device>(defaultDevice)
  const [reloadKey, setReloadKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const firstChangeSkip = useRef(true)

  // The iframe loads with ?preview=true so the PortalProvider inside
  // it reads DRAFT data (not the published snapshot). Since parent
  // and iframe share localStorage on the same origin, draft writes
  // from the editor trigger a `storage` event in the iframe →
  // PortalProvider.hydrate() → real-time preview without reload.
  // We still bump reloadKey on publish/restore so the iframe picks
  // up any structural changes (new page, deleted section, etc.)
  // that the storage-event path might miss.
  const { lastPublishedAt } = usePortal()
  useEffect(() => {
    if (!autoRefresh) return
    if (firstChangeSkip.current) {
      firstChangeSkip.current = false
      return
    }
    const t = window.setTimeout(() => setReloadKey((k) => k + 1), 500)
    return () => window.clearTimeout(t)
  }, [autoRefresh, lastPublishedAt])

  const fullUrl = `/p/${tenant}${path === "/" ? "" : path}`
  const iframeSrc = `${fullUrl}${fullUrl.includes("?") ? "&" : "?"}preview=true&_t=${reloadKey}`

  // Measure the visible width of the iframe container BEFORE first
  // paint. Using useLayoutEffect (not useEffect) ensures the
  // synchronous measurement lands before the browser paints — so
  // the iframe never flashes at the wrong scale.
  //
  // Without this synchronous step, the first paint runs with
  // containerWidth=0 → scale=1 → the iframe renders at the full
  // 1280 desktop viewport. The container has overflow-hidden +
  // justify-center, so the user sees only the CENTER 600px of a
  // 1280px iframe — making the "Desktop" preview look cropped and
  // not at all like the actual public site.
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.clientWidth)
  }, [])
  // Continued size tracking (window resize, sidebar collapse, etc.)
  // can stay in a regular useEffect — those updates after first
  // paint are fine.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setContainerWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const viewportW = DEVICE_VIEWPORT_W[device]
  // Only scale when the available column is narrower than the desired
  // viewport. Scaling > 1 would blur the iframe; we never enlarge.
  // Gate on containerWidth > 0 so the pre-measurement render doesn't
  // mistakenly pick scale=1 with a too-wide iframe.
  const measured = containerWidth > 0
  const scale = measured && containerWidth < viewportW
    ? containerWidth / viewportW
    : 1
  // The outer wrapper is the SCALED visible size (so flex layout
  // sees the real visible dimensions); the inner wrapper is the
  // unscaled size the iframe renders at; transform: scale() shrinks
  // the inner to fit the outer. When the container is wider than
  // 1280, we render the iframe at exactly 1280 (matches the actual
  // desktop viewport of the public site).
  const visibleW = measured
    ? Math.min(viewportW * scale, containerWidth)
    : viewportW
  const naturalH = scale < 1 ? height / scale : height
  const visibleH = height

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showChrome && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Fake browser dots */}
            <div className="flex shrink-0 items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
            </div>
            <code className="ml-1 truncate rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {fullUrl}
            </code>
          </div>
          <div className="flex items-center gap-1">
            {!hideDeviceToggle && (
              <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
                <DeviceBtn active={device === "desktop"} onClick={() => setDevice("desktop")} title="Desktop">
                  <Monitor className="h-3.5 w-3.5" />
                </DeviceBtn>
                <DeviceBtn active={device === "tablet"} onClick={() => setDevice("tablet")} title="Tablet">
                  <Tablet className="h-3.5 w-3.5" />
                </DeviceBtn>
                <DeviceBtn active={device === "mobile"} onClick={() => setDevice("mobile")} title="Mobile">
                  <Smartphone className="h-3.5 w-3.5" />
                </DeviceBtn>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              title="Refresh preview"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" asChild title="Open in new tab">
              <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Frame. Container is full-width; the inner wrapper is the
          scaled visible size, centered. The iframe itself renders
          at the chosen viewport width (e.g. 1280 for desktop) and
          gets scaled down to fit. We hold off mounting the iframe
          until the container has been measured — without this,
          the first frame renders a 1280-wide iframe inside a
          narrower container, the overflow-hidden + justify-center
          flex centers it, and the user sees the middle-cropped
          chunk of a desktop layout that doesn't match the real
          public site. */}
      <div
        ref={containerRef}
        className="flex items-start justify-center overflow-hidden rounded-xl border border-border bg-muted/30"
        style={{ height: `${height}px` }}
      >
        {measured ? (
          <div
            style={{
              width: visibleW,
              height: visibleH,
              overflow: "hidden",
            }}
          >
            <iframe
              ref={iframeRef}
              // Bump on reloadKey so the SPA re-mounts and re-reads
              // from localStorage. PortalProvider also listens for
              // `storage` events from other windows, so most edits
              // reflect without needing this manual refresh.
              key={reloadKey}
              src={iframeSrc}
              title="Portal preview"
              className="block border-0 bg-background"
              style={{
                width: viewportW,
                height: naturalH,
                transform: scale < 1 ? `scale(${scale})` : undefined,
                transformOrigin: "top left",
              }}
            />
          </div>
        ) : (
          // Minimal placeholder for the one frame before measurement
          // lands. Matches the iframe's eventual background so the
          // hand-off is invisible.
          <div
            className="h-full w-full animate-pulse bg-background/60"
            aria-hidden
          />
        )}
      </div>
    </div>
  )
}

function DeviceBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
