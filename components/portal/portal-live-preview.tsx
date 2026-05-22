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

import { useEffect, useRef, useState } from "react"
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePortal } from "@/lib/portal-store"
import { useOrgSettings } from "@/lib/org-settings"

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
  /** Defaults to "/" — pass "/about" / "/teachers" / etc. to deep-link. */
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

  // Auto-refresh: subscribe to the parent's portal config + org
  // settings. When ANY brand-shaped field changes, debounce 500 ms and
  // bump the iframe key so the preview re-mounts. Same-window writers
  // don't fire the `storage` event, so without this the iframe would
  // only update after a manual refresh or cross-window edit.
  const { config } = usePortal()
  const { settings } = useOrgSettings()
  useEffect(() => {
    if (!autoRefresh) return
    if (firstChangeSkip.current) {
      // Don't bump on the initial mount — the iframe is already
      // loading with the current state.
      firstChangeSkip.current = false
      return
    }
    const t = window.setTimeout(() => setReloadKey((k) => k + 1), 500)
    return () => window.clearTimeout(t)
  }, [autoRefresh, config, settings])

  const fullUrl = `/p/${tenant}${path === "/" ? "" : path}`

  // Measure the visible width of the iframe container so we can scale
  // the iframe DOWN when the desktop viewport (1280) is wider than
  // the available column. ResizeObserver fires on dashboard resize +
  // sidebar collapse so the preview stays sharp.
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setContainerWidth(w)
    })
    observer.observe(el)
    setContainerWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const viewportW = DEVICE_VIEWPORT_W[device]
  // Only scale when the available column is narrower than the desired
  // viewport. Scaling > 1 would blur the iframe; we never enlarge.
  const scale = containerWidth > 0 && containerWidth < viewportW
    ? containerWidth / viewportW
    : 1
  // The outer wrapper is the SCALED size (so flex layout sees the
  // real visible dimensions); the inner wrapper is the unscaled size
  // that the iframe renders at; transform: scale() shrinks the inner
  // to fit the outer.
  const visibleW = Math.min(viewportW * scale, viewportW)
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

      {/* Frame. The container is full-width; the inner wrapper is the
          scaled visible size, centered. The iframe itself renders at
          the chosen viewport width (e.g. 1280 for desktop) and gets
          scaled down to fit. */}
      <div
        ref={containerRef}
        className="flex items-start justify-center overflow-hidden rounded-xl border border-border bg-muted/30"
        style={{ height: `${height}px` }}
      >
        <div
          style={{
            width: visibleW,
            height: visibleH,
            overflow: "hidden",
          }}
        >
          <iframe
            ref={iframeRef}
            // Bump on reloadKey so the SPA re-mounts and re-reads from
            // localStorage. The PortalProvider also listens for `storage`
            // events from other windows, so most edits reflect without
            // needing this manual refresh.
            key={reloadKey}
            src={fullUrl}
            title="Portal preview"
            className="block border-0 bg-background transition-all"
            style={{
              width: viewportW,
              height: naturalH,
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: "top left",
            }}
          />
        </div>
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
