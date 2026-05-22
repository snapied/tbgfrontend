"use client"

// Error boundary that wraps the <Excalidraw> render. We exist because
// Excalidraw 0.18 throws fractional-indexing errors ("invalid order key
// head: 0") from render-time code paths that we can't always
// pre-sanitise — if any in-memory element references a malformed
// neighbour index, generateNKeysBetween crashes deep inside Excalidraw.
//
// Catching at this level means the live page never goes blank. On
// catch we ALSO clear the per-board localStorage key so a refresh
// starts from a clean slate; the backend copy is sanitised on next
// load too because that path runs through the same sanitiser.

import { Component, type ReactNode } from "react"

const STORAGE_PREFIX = "vidyanxt.whiteboard."

interface Props {
  persistenceKey: string
  children: ReactNode
}

interface State {
  err: Error | null
}

export class WhiteboardErrorBoundary extends Component<Props, State> {
  state: State = { err: null }

  static getDerivedStateFromError(err: Error): State {
    return { err }
  }

  componentDidCatch(err: Error): void {
    // Best-effort: nuke the local cache so the next refresh doesn't
    // hit the same booby trap. Backend scene is sanitised on load.
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_PREFIX + this.props.persistenceKey)
      }
    } catch {
      /* localStorage may be unavailable in private mode etc */
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[whiteboard] caught render-time crash, cleared local cache for",
      this.props.persistenceKey,
      "·",
      err.message,
    )
  }

  handleReset = (): void => {
    this.setState({ err: null })
  }

  render(): ReactNode {
    if (this.state.err) {
      return (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            background: "var(--background, #fff)",
            color: "var(--foreground, #1f2937)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            Whiteboard couldn&apos;t load
          </div>
          <div style={{ fontSize: 12, maxWidth: 480, color: "#6b7280" }}>
            The saved canvas data is corrupted. We&apos;ve cleared the local
            copy — refresh the page and the canvas will start fresh (or
            re-sync from anyone else who&apos;s connected).
          </div>
          <button
            type="button"
            onClick={() => {
              this.handleReset()
              if (typeof window !== "undefined") window.location.reload()
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#1f2937",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload board
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
