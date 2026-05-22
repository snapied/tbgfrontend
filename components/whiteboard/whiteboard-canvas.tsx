"use client"

// Reusable infinite-canvas whiteboard powered by Excalidraw (MIT-licensed).
//
// Persistence model:
//   1. **Backend** is the source of truth — scene JSON is stored on the server
//      at PUT /api/whiteboards/<key>/scene. Survives across browsers, devices,
//      and "clear site data". Reads happen on mount, writes are debounced to
//      avoid hammering the API while the user is drawing.
//   2. **localStorage** is a per-browser offline cache. If the backend is
//      unreachable (offline, dev server down), we still load and save locally
//      so the canvas keeps working. On next successful load the backend wins.
//
// Each canvas is addressed by a stable string `persistenceKey`:
//   wb-<id>             standalone instructor boards
//   session-<sessionId> in-class boards (one per session)

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import "@excalidraw/excalidraw/index.css"
import "./whiteboard-overrides.css"
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types"
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types"
import { generateNKeysBetween } from "fractional-indexing"
import { WhiteboardToolbar, type ToolKey } from "./whiteboard-toolbar"
import { WhiteboardZoomPanel } from "./whiteboard-zoom-panel"
import { WhiteboardErrorBoundary } from "./whiteboard-error-boundary"
import { WhiteboardAIRefineButton } from "./whiteboard-ai-refine"
import { useWhiteboardSync } from "@/lib/whiteboard-sync"

// Excalidraw loads asset chunks (worker, fonts) at runtime via
// `window.EXCALIDRAW_ASSET_PATH`. With Next.js + Turbopack the default
// resolution leans on `file://` URLs that the browser refuses to load
// from. Pointing the asset path at unpkg's CDN — locked to the exact
// version we have installed — fixes the static asset path BUT not the
// font-subsetting Web Worker. The worker is constructed with
// `new Worker(new URL("./subset-worker.chunk.js", import.meta.url))`
// inside the bundled library code, which Turbopack resolves to a
// `file:///...node_modules/.../subset-worker.chunk.js` URL.
//
// We can't `new Worker("https://unpkg.com/...")` directly either —
// the browser blocks cross-origin Worker construction with a
// SecurityError (same-origin policy on the *initial* script).
//
// Fix: shim `window.Worker` to wrap any rewritten Excalidraw URL
// in a same-origin `blob:` stub that pulls the actual script from
// the CDN via `importScripts` (classic workers) or dynamic `import()`
// (module workers). The blob URL satisfies the same-origin gate;
// unpkg's `Access-Control-Allow-Origin: *` header lets the fetch
// inside the worker proceed. The shim is a no-op for every other
// Worker — only paths matching `@excalidraw/excalidraw/dist/.../*.chunk.js`
// or `https://unpkg.com/@excalidraw/...` get rewritten. Must run
// BEFORE the Excalidraw dynamic import resolves; top-level side
// effect handles that.
if (typeof window !== "undefined") {
  const w = window as unknown as { EXCALIDRAW_ASSET_PATH?: string; __excalidrawWorkerShim?: boolean }
  w.EXCALIDRAW_ASSET_PATH = "https://unpkg.com/@excalidraw/excalidraw@0.18.1/dist/prod/"
  if (!w.__excalidrawWorkerShim) {
    w.__excalidrawWorkerShim = true
    const OriginalWorker = window.Worker
    // Pattern matches both dev/ and prod/ chunk paths so the shim
    // works regardless of which build Turbopack is hot-loading.
    const EXCALIDRAW_RE =
      /@excalidraw\/excalidraw\/dist\/(?:dev|prod)\/([^\s"']+\.chunk\.js)/
    const blobUrlCache = new Map<string, string>()
    const makeBlobShim = (cdnUrl: string, isModule: boolean): string => {
      const cached = blobUrlCache.get(cdnUrl + "|" + (isModule ? "m" : "c"))
      if (cached) return cached
      // Module workers can't use importScripts (spec forbids it);
      // fall back to a top-level dynamic import which respects CORS
      // headers from the remote origin.
      const stub = isModule
        ? `import(${JSON.stringify(cdnUrl)});`
        : `importScripts(${JSON.stringify(cdnUrl)});`
      const blob = new Blob([stub], { type: "application/javascript" })
      const url = URL.createObjectURL(blob)
      blobUrlCache.set(cdnUrl + "|" + (isModule ? "m" : "c"), url)
      return url
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function PatchedWorker(this: any, scriptURL: string | URL, options?: WorkerOptions) {
      let urlString = typeof scriptURL === "string" ? scriptURL : scriptURL.toString()
      const m = urlString.match(EXCALIDRAW_RE)
      if (m) {
        // Always rewrite to the prod path on the CDN — unpkg doesn't
        // ship dev/ in their published versions, but the worker logic
        // is identical between builds.
        const cdnUrl = `https://unpkg.com/@excalidraw/excalidraw@0.18.1/dist/prod/${m[1]}`
        urlString = makeBlobShim(cdnUrl, options?.type === "module")
      }
      return new OriginalWorker(urlString, options)
    }
    PatchedWorker.prototype = OriginalWorker.prototype
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).Worker = PatchedWorker
  }
}

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
        Loading whiteboard…
      </div>
    ),
  },
)

const STORAGE_PREFIX = "vidyanxt.whiteboard."
// Debounce: short enough that a navigate-away rarely loses work, long
// enough that we're not hammering the API on every cursor move.
const SAVE_DEBOUNCE_MS = 800
// How long the "Saved ✓" badge stays visible before fading back to idle.
const SAVED_CLEAR_MS = 3000

interface StoredScene {
  elements: ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

// Backend /api/whiteboards/* routes are auth-gated. Without the
// Bearer header they silently 401 — same class of bug as the
// live-room-state PUT (host's "Open the room" never reaching the
// backend). Send the access token explicitly so scene persistence
// + metadata patches actually land server-side.
const ACCESS_TOKEN_KEY = "thebigclass.accessToken"
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Coalesced refresh — same pattern as live-room-state.ts. When the
// access token goes stale, attempt a single refresh-cookie mint and
// retry the request once.
let _wbRefreshInFlight: Promise<boolean> | null = null
async function tryRefreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (_wbRefreshInFlight) return _wbRefreshInFlight
  _wbRefreshInFlight = fetch(`${apiBase()}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (r) => {
      if (!r.ok) return false
      const body = (await r.json().catch(() => null)) as { accessToken?: string } | null
      if (!body?.accessToken) return false
      window.localStorage.setItem(ACCESS_TOKEN_KEY, body.accessToken)
      return true
    })
    .catch(() => false)
    .finally(() => {
      _wbRefreshInFlight = null
    })
  return _wbRefreshInFlight
}

function readLocal(key: string): StoredScene | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredScene
    // Self-healing: if the cached scene contains any element with an
    // un-repairably bad shape (not an object, missing id), drop the
    // whole cache. The backend copy is sanitised on next load anyway.
    if (parsed && Array.isArray(parsed.elements)) {
      for (const el of parsed.elements) {
        if (!el || typeof el !== "object" || typeof (el as { id?: unknown }).id !== "string") {
          // eslint-disable-next-line no-console
          console.warn("[whiteboard-canvas] local cache has malformed element, dropping cache for", key)
          window.localStorage.removeItem(STORAGE_PREFIX + key)
          return null
        }
      }
    }
    return parsed
  } catch {
    // Parse failure → drop the cache so we don't keep hitting it.
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + key)
    } catch { /* ignore */ }
    return null
  }
}

// Excalidraw 0.18 enforces fractional-indexing on elements: the `index`
// field must be a valid Jitterbit-style key ("a0", "a1", "Zz", …). Older
// scenes stored before this requirement — and elements emitted by
// y-excalidraw before the schema bump — have plain numeric strings like
// "0" or "1", which trip Excalidraw's "invalid order key head: 0" runtime
// error at mount and take the whole whiteboard down.
//
// We DON'T use Excalidraw's `restoreElements` for this any more:
// dynamic-importing `@excalidraw/excalidraw` from this file used to
// cause two separate problems — (a) the package reads
// `navigator.platform` at module-eval time, blowing up Next.js SSR
// even from a "use client" file, and (b) under Turbopack's split-chunk
// bundling its internal references became unbound at runtime
// (`ReferenceError: restoreElements is not defined`). Instead we use
// `fractional-indexing` (a tiny pure-JS dep already in the tree via
// y-excalidraw) to generate fresh keys for any element missing one.
// Returns the sanitized array AND a flag indicating whether any repair
// was performed. Callers use the flag to decide whether to persist the
// repaired version back to the backend, permanently scrubbing the
// stored copy so future loads don't keep hitting the same bad data.
function sanitizeElementsWithFlag(
  elements: readonly ExcalidrawElement[] | undefined | unknown,
): { elements: ExcalidrawElement[]; repaired: boolean } {
  if (!Array.isArray(elements) || elements.length === 0) {
    return { elements: [], repaired: !Array.isArray(elements) && elements != null }
  }
  const els = sanitizeElements(elements)
  // Cheap reference check: if sanitizeElements returned the original
  // array (no repair needed), `els === elements` after the cast.
  return { elements: els, repaired: els !== (elements as ExcalidrawElement[]) }
}

function sanitizeElements(
  elements: readonly ExcalidrawElement[] | undefined | unknown,
): ExcalidrawElement[] {
  // Array.isArray guard: a non-array but truthy value (e.g. `{}`) used
  // to trip `(elements || []).reduce` deep inside restoreElements. Even
  // though we no longer use restoreElements, callers downstream
  // (Excalidraw's own initial mount) might, so we strict-array-check
  // here too.
  if (!Array.isArray(elements) || elements.length === 0) return []
  let needsRepair = false
  let badIdx: unknown = undefined
  let badPos = -1
  let prev: string | undefined
  for (let i = 0; i < elements.length; i++) {
    const idx = (elements[i] as { index?: unknown })?.index
    // Each index must (a) start with a letter, AND (b) be strictly
    // greater than its predecessor — Excalidraw's
    // `isValidFractionalIndex` enforces both. A mixed sequence of
    // individually-valid keys can still trip the validator if not
    // strictly increasing ("Zz" > "a0" lexicographically), so we
    // catch ordering violations too.
    if (typeof idx !== "string" || !/^[a-zA-Z]/.test(idx)) {
      needsRepair = true
      badIdx = idx
      badPos = i
      break
    }
    if (prev !== undefined && !(idx > prev)) {
      needsRepair = true
      badIdx = idx
      badPos = i
      break
    }
    prev = idx
  }
  // Bound-element invariant: a text element with `containerId` must come
  // AFTER its container in the index ordering. Excalidraw 0.18's
  // dev-mode validator floods the console
  // ("Fractional indices invariant for bound elements has been compromised")
  // when violated. Detect + trigger the same repair path.
  const idToPos = new Map<string, number>()
  for (let i = 0; i < elements.length; i++) {
    const id = (elements[i] as { id?: unknown })?.id
    if (typeof id === "string") idToPos.set(id, i)
  }
  let boundOrderingBroken = false
  for (let i = 0; i < elements.length; i++) {
    const cid = (elements[i] as { containerId?: unknown })?.containerId
    if (typeof cid !== "string") continue
    const cPos = idToPos.get(cid)
    if (cPos !== undefined && cPos > i) {
      boundOrderingBroken = true
      break
    }
  }
  if (!needsRepair && !boundOrderingBroken) return elements as ExcalidrawElement[]
  // eslint-disable-next-line no-console
  console.info(
    `[whiteboard-canvas] sanitizing ${elements.length} elements (bad index at pos ${badPos}:`,
    badIdx,
    `boundOrderingBroken=${boundOrderingBroken}) → repairing`,
  )
  // If only the bound ordering is broken, move each offending text after
  // its container BEFORE assigning sequential keys — otherwise the fresh
  // keys would just lock the wrong order in place.
  let ordered = elements as ExcalidrawElement[]
  if (boundOrderingBroken) {
    ordered = [...(elements as ExcalidrawElement[])]
    for (let pass = 0; pass < 5; pass++) {
      let moved = false
      for (let i = 0; i < ordered.length; i++) {
        const cid = (ordered[i] as { containerId?: unknown })?.containerId
        if (typeof cid !== "string") continue
        const cIdx = ordered.findIndex(
          (e) => (e as { id?: unknown })?.id === cid,
        )
        if (cIdx > i) {
          const [el] = ordered.splice(i, 1)
          ordered.splice(cIdx, 0, el)
          moved = true
          break
        }
      }
      if (!moved) break
    }
  }
  // Reassign ALL indices to a fresh strictly-ordered sequence ["a0",
  // "a1", "a2", …]. Selective replacement of only the bad ones risks
  // producing a mixed sequence that fails the ordering invariant even
  // though each individual key passes the head check.
  const keys = generateNKeysBetween(null, null, ordered.length)
  return ordered.map(
    (el, i) => ({ ...el, index: keys[i] }) as ExcalidrawElement,
  )
}

function writeLocal(key: string, scene: StoredScene): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(scene))
  } catch {
    // Quota — usually a board with lots of embedded images. We ignore here;
    // the backend write is authoritative anyway, so we just lose the offline
    // cache for this board, not the work itself.
  }
}

async function fetchRemote(key: string): Promise<StoredScene | null> {
  try {
    const res = await fetch(`${apiBase()}/api/whiteboards/${encodeURIComponent(key)}/scene`, {
      headers: authHeaders(),
      credentials: "include",
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    const j = (await res.json()) as { scene?: StoredScene }
    return j.scene ?? null
  } catch {
    return null
  }
}

async function saveRemote(
  key: string,
  scene: StoredScene,
  title?: string,
  opts: { keepalive?: boolean } = {},
): Promise<boolean> {
  const fire = () =>
    fetch(`${apiBase()}/api/whiteboards/${encodeURIComponent(key)}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      ...(opts.keepalive ? { keepalive: true } : {}),
      body: JSON.stringify({ scene, ...(title ? { title } : {}) }),
    })
  try {
    let res = await fire()
    // Same stale-token recovery as pushRoomState: on 401, try to
    // mint a fresh access token via the refresh cookie and retry
    // once. Saves the user from "oops, log out + back in mid-class"
    // when their access token quietly expired.
    if (res.status === 401) {
      const refreshed = await tryRefreshAccessToken()
      if (refreshed) res = await fire()
    }
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[whiteboard saveRemote] PUT failed ${res.status} for key=${key}` +
          (res.status === 401
            ? " — refresh cookie also expired; host must sign in again"
            : ""),
      )
    }
    return res.ok
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[whiteboard saveRemote] network error for key=${key}:`, err)
    return false
  }
}

export interface WhiteboardCanvasProps {
  /** Stable identifier — same key reopens the same canvas. */
  persistenceKey: string
  /** Disables editing. */
  readOnly?: boolean
  className?: string
  /** Optional title to store alongside the scene on the server. */
  title?: string
  /** Fired (debounced) when the user changes anything on the canvas. */
  onChange?: (thumbnailUrl: string | null) => void
  /**
   * When true and the component is mounted inside a `<LiveKitRoom>`, enable
   * multiplayer sync: element-list updates + named cursors broadcast over
   * the LiveKit data channel so everyone in the room sees the same canvas
   * with each others' cursors in real time.
   */
  enableSync?: boolean
  /** Display name attached to the local cursor when sync is enabled. */
  participantName?: string
}

export function WhiteboardCanvas({
  persistenceKey,
  readOnly,
  className,
  title,
  onChange,
  enableSync = false,
  participantName = "Guest",
}: WhiteboardCanvasProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | undefined>(undefined)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Custom toolbar tracks Excalidraw's active tool so the right button is
  // highlighted. We update from onChange (cheap; just reads activeTool.type).
  const [activeTool, setActiveTool] = useState<ToolKey>("selection")
  const [zoom, setZoom] = useState(1)
  // Save status — shown in the top-right of the canvas so the user can SEE
  // saves happening, instead of guessing.
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Multiplayer sync — Yjs document + y-excalidraw binding + LiveKit
  // data channel as transport. The binding owns element-list sync
  // entirely (CRDT merge); we just wire its onPointerUpdate handler
  // into Excalidraw so cursors broadcast via awareness.
  const {
    onPointerUpdate: syncOnPointerUpdate,
    active: syncActive,
  } = useWhiteboardSync({
    persistenceKey,
    apiRef,
    participantName,
    enabled: enableSync,
  })

  // Browser Fullscreen API. We fullscreen the *wrapper* div (not the whole
  // page) so the Excalidraw canvas, top-right UI, and our sticky-note button
  // all stay together and the rest of the dashboard chrome cleanly disappears.
  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (rootRef.current) {
        await rootRef.current.requestFullscreen()
      }
    } catch {
      // User-agent may deny (e.g. permission policy in an iframe). Silent fail.
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // Default appState applied to every load. Most important: gridSize forces
  // Excalidraw to render its dot grid in the background (Figjam-style). We
  // always override what was saved so boards created before the grid was a
  // default still get the dots.
  const DEFAULT_APP_STATE: Partial<AppState> = useMemo(
    () => ({
      // Excalidraw renders the dot grid only when BOTH flags are set: gridSize
      // determines spacing, gridModeEnabled is the on/off switch. Setting one
      // without the other yields no visible grid.
      gridSize: 20,
      gridModeEnabled: true,
      viewBackgroundColor: "#fefefe",
    }),
    [],
  )

  // Load: server first, localStorage second. Server wins because it survives
  // across browsers; localStorage is just a cache for offline / cold start.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const remote = await fetchRemote(persistenceKey)
      if (cancelled) return
      // Helper that builds the appState merge: saved state + forced grid on.
      // Forcing both flags overrides any old boards that were saved before
      // grid-on-by-default was a thing.
      const withGrid = (saved: Partial<AppState> | undefined) => ({
        ...DEFAULT_APP_STATE,
        ...(saved ?? {}),
        gridSize: 20,
        gridModeEnabled: true,
      })
      if (remote) {
        const { elements: cleanEls, repaired } = sanitizeElementsWithFlag(remote.elements)
        const cleanScene: StoredScene = {
          elements: cleanEls,
          appState: remote.appState ?? {},
          files: remote.files ?? {},
        }
        setInitialData({
          elements: cleanEls,
          appState: withGrid(remote.appState),
          files: remote.files ?? {},
        })
        // Refresh the offline cache with the SANITIZED scene — keeps the
        // local copy from re-poisoning subsequent loads.
        writeLocal(persistenceKey, cleanScene)
        // Persist the sanitized version back to the backend if we had
        // to repair anything. This permanently scrubs the bad fractional
        // indices from the source of truth, so peers loading later
        // don't keep hitting the same crash. We deliberately don't
        // await — backend write is best-effort, and the user already
        // sees the correct canvas in-flight.
        if (repaired) {
          // eslint-disable-next-line no-console
          console.info("[whiteboard-canvas] writing sanitized scene back to backend for", persistenceKey)
          void saveRemote(persistenceKey, cleanScene, titleRef.current)
        }
      } else {
        const local = readLocal(persistenceKey)
        if (local) {
          const { elements: cleanEls, repaired } = sanitizeElementsWithFlag(local.elements)
          setInitialData({
            elements: cleanEls,
            appState: withGrid(local.appState),
            files: local.files ?? {},
          })
          if (repaired) {
            writeLocal(persistenceKey, { ...local, elements: cleanEls })
          }
        } else {
          // Brand-new board — start with grid on and a clean background.
          setInitialData({ appState: DEFAULT_APP_STATE })
        }
      }
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [persistenceKey, DEFAULT_APP_STATE])

  // Debounced save on change. Excalidraw's onChange fires per pointer move
  // while drawing, so we coalesce to one write per second.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Auto-resets the "✓ Saved" badge back to idle so it doesn't sit forever.
  const savedClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the last-seen element version sum so we only save when content
  // actually changes (not on pointer moves, selections, viewport scrolls, etc.)
  const lastElementsVersionRef = useRef<number>(-1)
  const onChangeRef = useRef(onChange)
  const titleRef = useRef(title)
  useEffect(() => {
    onChangeRef.current = onChange
    titleRef.current = title
  }, [onChange, title])

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      // ── Tool & zoom mirroring (runs on every onChange) ────────────────────
      const t = appState.activeTool?.type
      let next: ToolKey | null = null
      if (t === "selection") next = "selection"
      else if (t === "eraser") next = "eraser"
      else if (t === "rectangle") next = "rectangle"
      else if (t === "ellipse") next = "ellipse"
      else if (t === "diamond") next = "diamond"
      else if (t === "arrow") next = "arrow"
      else if (t === "line") next = "line"
      else if (t === "text") next = "text"
      else if (t === "image") next = "image"
      else if (t === "freedraw") {
        next =
          appState.currentItemStrokeColor === "#facc15" && appState.currentItemOpacity < 80
            ? "highlighter"
            : "pen"
      }
      if (next) setActiveTool(next)

      const nextZoom = appState.zoom?.value ?? 1
      setZoom(nextZoom)

      // ── Save: only when elements actually changed ─────────────────────────
      // Excalidraw fires onChange for pointer moves, selections, viewport
      // scrolls, etc. — none of which are content changes. Comparing the sum
      // of element versions lets us skip all that noise.
      const versionSum = elements.reduce((s, el) => s + (el.version ?? 0), 0)
      if (versionSum === lastElementsVersionRef.current) return
      lastElementsVersionRef.current = versionSum

      // Multiplayer element sync is handled by the y-excalidraw binding
      // installed via useWhiteboardSync — it observes Excalidraw's
      // internals and pushes deltas to a Y.Doc that's transported over
      // the LiveKit data channel. Nothing extra to do here.

      setSaveStatus("saving")
      if (savedClearTimer.current) clearTimeout(savedClearTimer.current)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        // Wrap the whole async body in an outer try/catch + .catch.
        // setTimeout doesn't await the returned promise, so ANY uncaught
        // throw inside (including a dynamic import failure or a callback
        // throwing) becomes an unhandledRejection at the runtime level
        // — which Turbopack escalates into a noisy console error every
        // 800 ms while the user is drawing. We isolate failures here.
        ;(async () => {
          const trimmedAppState: Partial<AppState> = {
            viewBackgroundColor: appState.viewBackgroundColor,
            theme: appState.theme,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
            gridSize: appState.gridSize || 20,
            gridModeEnabled: true,
            currentItemFontFamily: appState.currentItemFontFamily,
            currentItemStrokeColor: appState.currentItemStrokeColor,
            currentItemBackgroundColor: appState.currentItemBackgroundColor,
          }
          // Snap elements to a real array. Excalidraw's onChange
          // contract says `readonly ExcalidrawElement[]`, but Turbopack
          // / React-19 HMR has been observed to occasionally hand
          // something whose prototype lacks `reduce` — defensively
          // materialising via Array.from neutralises that without
          // changing happy-path behaviour.
          const safeElements: ExcalidrawElement[] = Array.isArray(elements)
            ? (elements as ExcalidrawElement[])
            : Array.from(elements as ArrayLike<ExcalidrawElement>)
          const scene: StoredScene = {
            elements: safeElements,
            appState: trimmedAppState,
            files,
          }

          // localStorage write is instant — treat as the committed save.
          writeLocal(persistenceKey, scene)
          setSaveStatus("saved")
          savedClearTimer.current = setTimeout(() => setSaveStatus("idle"), SAVED_CLEAR_MS)

          // Generate thumbnail asynchronously (doesn't block save status).
          let thumbnail: string | null = null
          if (safeElements.length > 0) {
            try {
              const { exportToSvg } = await import("@excalidraw/excalidraw")
              const svg = await exportToSvg({
                elements: safeElements,
                appState: {
                  ...appState,
                  exportBackground: true,
                  viewBackgroundColor: appState.viewBackgroundColor || "#fefefe",
                },
                files,
              })
              const serializer = new XMLSerializer()
              const svgString = serializer.serializeToString(svg)
              thumbnail = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString)
            } catch {
              // thumbnail generation is best-effort
            }
          }

          void saveRemote(persistenceKey, scene, titleRef.current)
          onChangeRef.current?.(thumbnail)
        })().catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("[whiteboard-canvas] save timer threw:", err)
        })
      }, SAVE_DEBOUNCE_MS)
    },
    // Intentionally minimal deps — activeTool and zoom are set via refs/setters
    // so we don't need to recreate handleChange when they change.
    [persistenceKey],
  )

  // Flush on tab close, navigate-away, or tab-hide. The browser kills regular
  // fetch requests on navigation; keepalive (set inside saveRemote) lets the
  // request finish in the background. We also write to localStorage
  // synchronously so even if the request is cancelled, the next load picks up
  // the latest from local cache.
  useEffect(() => {
    const flush = () => {
      const api = apiRef.current
      if (!api) return
      const elements = api.getSceneElements() as unknown as ExcalidrawElement[]
      if (!elements || elements.length === 0) return // Safe guard to avoid empty save
      const appState = api.getAppState()
      const files = api.getFiles()
      const scene: StoredScene = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          theme: appState.theme,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          gridSize: appState.gridSize || 20,
          gridModeEnabled: true,
        },
        files,
      }
      writeLocal(persistenceKey, scene)
      // keepalive is essential here — the page is navigating away.
      void saveRemote(persistenceKey, scene, titleRef.current, { keepalive: true })
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("beforeunload", flush)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [persistenceKey])

  // Flush a pending save before unmount so the last stroke is committed.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        const api = apiRef.current
        if (!api) return
        const elements = api.getSceneElements() as unknown as ExcalidrawElement[]
        if (!elements || elements.length === 0) return // Safe guard to avoid empty save
        const appState = api.getAppState()
        const files = api.getFiles()
        const scene: StoredScene = {
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            theme: appState.theme,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
          files,
        }
        writeLocal(persistenceKey, scene)
        // Component is unmounting — likely a route change. Use keepalive so
        // the request lives past the navigation that's about to happen.
        void saveRemote(persistenceKey, scene, titleRef.current, { keepalive: true })
      }
    }
  }, [persistenceKey])

  const uiOptions = useMemo(
    () =>
      ({
        // Suppress the welcome screen entirely (also covered by CSS, but doing
        // it at the API level avoids a brief flash before the CSS kicks in).
        welcomeScreen: false,
        canvasActions: {
          // Hide noisy / power-user actions. The instructor doesn't need to
          // manage scenes from disk, change the canvas background, or see the
          // theme toggle hidden behind a menu.
          loadScene: false,
          changeViewBackgroundColor: false,
          clearCanvas: false,
          export: false as const,
          saveAsImage: false,
          saveToActiveFile: false,
          toggleTheme: false,
        },
      }),
    [],
  )

  if (!hydrated) {
    return (
      <div className={className} ref={rootRef}>
        <div className="flex h-full w-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
          Loading whiteboard…
        </div>
      </div>
    )
  }

  return (
    <div
      className={className}
      ref={rootRef}
      style={{
        position: "relative",
        // When fullscreen, the wrapper is taken over by the browser; force the
        // child Excalidraw canvas to fill the viewport so it doesn't sit
        // postage-stamped in the middle of a black background.
        ...(isFullscreen ? { width: "100vw", height: "100vh", background: "var(--background)" } : {}),
      }}
    >
      <WhiteboardErrorBoundary persistenceKey={persistenceKey}>
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api
          }}
          initialData={initialData}
          onChange={handleChange}
          // Cursor broadcast is delegated to the y-excalidraw binding's
          // onPointerUpdate. It encodes pointer state into Yjs awareness;
          // peers' Excalidraw instances render the cursor + label
          // natively via the same binding on their end.
          onPointerUpdate={syncOnPointerUpdate}
          // Tells Excalidraw to render the cursor stack + show the
          // "collaborators" UI affordances when sync is live.
          isCollaborating={syncActive}
          viewModeEnabled={readOnly}
          UIOptions={uiOptions}
          renderTopRightUI={() => (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
                style={{
                  background: "white",
                  color: "#1f2937",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isFullscreen ? "Exit full" : "Full screen"}
              </button>
            </div>
          )}
        />
      </WhiteboardErrorBoundary>
      {/* Save-status badge — rendered OUTSIDE Excalidraw so it re-renders
          on every React state update (renderTopRightUI is a stale closure). */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: isFullscreen ? 160 : 160,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid",
            display: "inline-block",
            transition: "all 0.2s",
            ...(saveStatus === "saving"
              ? { background: "#fef3c7", color: "#92400e", borderColor: "#fbbf24" }
              : saveStatus === "saved"
              ? { background: "#dcfce7", color: "#166534", borderColor: "#86efac" }
              : saveStatus === "error"
              ? { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }
              : { background: "rgba(255,255,255,0.9)", color: "#64748b", borderColor: "#e2e8f0" }),
          }}
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
            ? "✓ Saved"
            : saveStatus === "error"
            ? "⚠ Error"
            : "Ready"}
        </span>
      </div>
      {/* Custom Figjam/Freeform-style toolbar floats over the canvas. */}
      {!readOnly && (
        <WhiteboardToolbar
          api={apiRef.current}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          container={rootRef.current}
        />
      )}
      {/* Floating zoom panel */}
      <WhiteboardZoomPanel api={apiRef.current} zoom={zoom} />
      {/* Floating "AI refine" pill — appears only when a text element
          is selected. Backed by /api/ai/refine which is Pro+ plan-gated
          via requireMinimumPlan, so Starter never sees it. */}
      {!readOnly && <WhiteboardAIRefineButton api={apiRef.current} />}
    </div>
  )
}
