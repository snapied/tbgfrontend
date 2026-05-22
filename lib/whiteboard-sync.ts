"use client"

// Multiplayer Excalidraw via Yjs + y-excalidraw, transported over the
// LiveKit data channel.
//
// Why the previous home-grown protocol kept producing "one-way only"
// sessions and we now use y-protocols/sync verbatim:
//
//   The old code (TAG_SYNC_REQUEST / TAG_SYNC_RESPONSE with full Y.Doc
//   state) had three bugs that, combined, made directional sync flap:
//   1. A joiner only fired ONE sync request. If the response packet was
//      dropped, lost to a transient disconnect, or rejected because the
//      full Y.Doc state exceeded LiveKit's data-channel payload limit,
//      that joiner stayed permanently out of sync.
//   2. Sync was only triggered on the LOCAL participant's connect. If a
//      peer joined the room AFTER us we never proactively sent them
//      anything — they had to send the request first, and if their
//      request beat their own subscription up we missed it.
//   3. Seeding Y.Array from Excalidraw's already-loaded scene BEFORE the
//      handshake meant two participants who both had the same backend
//      scene ended up with DUPLICATE Y.Map containers wrapping identical
//      elements (different Y IDs, same Excalidraw IDs).
//
// New design:
//   - Wire protocol is y-protocols/sync (state-vector exchange — same
//     protocol y-websocket / y-webrtc use, which is battle-tested).
//   - Every participant-connect (local OR remote) triggers a sync step 1
//     so late joiners are guaranteed to be told the state, even if their
//     own outbound request raced subscription.
//   - Periodic state-vector ping every 15 s recovers from any one-off
//     dropped delta — the next ping diffs state vectors and re-sends
//     only the missing pieces.
//   - Excalidraw's scene is CACHED in a ref before the binding constructs;
//     we seed Y.Array ONLY after the sync handshake had a chance to land
//     (700 ms timeout) and only if Y.Array is still empty, so a joiner
//     who got state from a peer never double-seeds.

import { useEffect, useMemo, useRef, useState, useCallback, type MutableRefObject } from "react"
// `useMaybeRoomContext` returns `undefined` instead of throwing when no
// LiveKitRoom provider is mounted. This is critical because the
// whiteboard editor (/dashboard/whiteboards/[id]) is a standalone tool
// — there's no live room around it — while the in-call whiteboard
// (inside the LivekitRoom on /p/.../live/...) reuses the same hook
// and needs the room for the data-channel transport. One hook, two
// hosts, no crash.
import { useMaybeRoomContext } from "@livekit/components-react"
import { RoomEvent, ConnectionState } from "livekit-client"
import * as Y from "yjs"
import * as awarenessProtocol from "y-protocols/awareness"
import * as syncProtocol from "y-protocols/sync"
import * as encoding from "lib0/encoding"
import * as decoding from "lib0/decoding"
import { ExcalidrawBinding } from "y-excalidraw"
import { generateNKeysBetween } from "fractional-indexing"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"

// Repair invalid fractional indices in-place. Excalidraw 0.18 requires
// every element's `index` field to be a fractional-indexing key whose
// first character is a letter (a-z / A-Z) — e.g. "a0", "Zz". Anything
// else ("0", "1", "", undefined) trips
// `invalid order key head: 0` from inside the fractional-indexing
// library at render time and crashes the whole canvas.
//
// We DON'T use Excalidraw's own `restoreElements` for this any more —
// dynamically importing it caused two separate problems: (a) the
// `@excalidraw/excalidraw` package reads `navigator.platform` at
// module-eval time, which crashes Next.js's SSR build chain even from
// a "use client" file; (b) when bundled via Turbopack's split chunks
// the function's internal references became unbound at runtime
// (`ReferenceError: restoreElements is not defined`).
//
// `fractional-indexing` is a tiny pure-JS dep that y-excalidraw
// already pulls in transitively, so it's free of charge. We just
// generate N fresh keys when any element has a bad one — order is
// preserved (we generate sequentially), and elements that already
// have valid keys are left untouched.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeIndices<T extends { id?: string; index?: any; containerId?: string }>(
  elements: T[],
): T[] {
  if (!Array.isArray(elements) || elements.length === 0) return elements
  let needsRepair = false
  let prev: string | undefined
  for (const el of elements) {
    const idx = el?.index
    // Each index must (a) start with a letter, AND (b) be strictly
    // greater than its predecessor — Excalidraw's
    // `isValidFractionalIndex` enforces both invariants. An array of
    // individually-valid-looking keys can still trip the validator if
    // it's out of order ("Zz", "a0", "b1" — all valid keys, but Zz > a0
    // so the sequence is rejected).
    if (typeof idx !== "string" || !/^[a-zA-Z]/.test(idx)) {
      needsRepair = true
      break
    }
    if (prev !== undefined && !(idx > prev)) {
      needsRepair = true
      break
    }
    prev = idx
  }
  // Additional invariant Excalidraw 0.18 enforces: a bound text element
  // (one with `containerId` referencing a container shape) must appear
  // AFTER its container in the fractional-index ordering. The dev-mode
  // validator floods the console with
  // "Fractional indices invariant for bound elements has been compromised"
  // when violated. We detect the violation here and trigger the same
  // repair path that handles invalid indices.
  const idToPos = new Map<string, number>()
  for (let i = 0; i < elements.length; i++) {
    const id = elements[i]?.id
    if (typeof id === "string") idToPos.set(id, i)
  }
  let boundOrderingBroken = false
  for (let i = 0; i < elements.length; i++) {
    const cid = elements[i]?.containerId
    if (typeof cid !== "string") continue
    const cPos = idToPos.get(cid)
    if (cPos !== undefined && cPos > i) {
      boundOrderingBroken = true
      break
    }
  }
  if (!needsRepair && !boundOrderingBroken) return elements

  // If only the bound ordering is broken, move each offending text after
  // its container so the array order matches the invariant before we
  // assign sequential keys. Without this, the fresh keys would just lock
  // the wrong order in place.
  let ordered: T[] = elements
  if (boundOrderingBroken) {
    ordered = [...elements]
    for (let pass = 0; pass < 5; pass++) {
      let moved = false
      for (let i = 0; i < ordered.length; i++) {
        const cid = ordered[i]?.containerId
        if (typeof cid !== "string") continue
        const cIdx = ordered.findIndex((e) => e?.id === cid)
        if (cIdx > i) {
          const [el] = ordered.splice(i, 1)
          // cIdx shifted left by one after the splice; insert AFTER container.
          ordered.splice(cIdx, 0, el)
          moved = true
          break
        }
      }
      if (!moved) break
    }
  }

  // Repair by reassigning ALL indices to a fresh strictly-ordered
  // sequence ["a0", "a1", "a2", …]. We can't selectively replace only
  // the bad ones — that risks producing a mixed sequence that fails the
  // ordering check even though every individual key is valid.
  const keys = generateNKeysBetween(null, null, ordered.length)
  return ordered.map((el, i) => ({ ...el, index: keys[i] }))
}

export const WB_CHANNEL_TOPIC = "whiteboard:v4"

// Outer envelope — first varUint tells receivers which lane the body
// belongs to. Matches y-websocket's framing so the y-protocols/sync
// internals can be reused unchanged.
const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const MESSAGE_QUERY_AWARENESS = 3

// LiveKit's `publishData` rejects anything > 65535 bytes with
// "Message too large". For an active board (especially right after a
// sync step 1 / step 2 handshake) the Y.Doc state easily exceeds that.
// We split oversized payloads into chunks with a small header and
// reassemble on the receiver side BEFORE dispatching the outer
// envelope. This is why the whiteboard sync silently went dark while
// cursors (always tiny) kept working.
//
// Wire format for a chunk packet (envelope byte = 0xFE):
//   [0xFE][msgId u16 LE][chunkIndex u16 LE][chunkCount u16 LE][payload…]
// Receiver buffers by (peerIdentity, msgId), reassembles when all
// chunks are present, then recursively processes the reassembled
// payload as if it had arrived in one piece.
const MESSAGE_CHUNK = 0xfe
const CHUNK_HEADER_BYTES = 1 + 2 + 2 + 2 // tag + id + index + count
// Below LK's 65535 ceiling with margin for the chunk header.
const MAX_PUBLISH_BYTES = 60_000

// Symbol-typed origin marker — used to tag updates that came in over the
// data channel so our own update-broadcaster doesn't re-broadcast them
// (feedback loop). A Symbol can't be accidentally collided with by other
// callers writing into the same Y.Doc.
const REMOTE_ORIGIN = Symbol.for("whiteboard-sync:remote")

// Resync cadence. Even with reliable LK delivery, a participant could miss
// a delta if they reconnect mid-broadcast. The state-vector exchange is
// tiny (tens of bytes) so 15 s is cheap.
const RESYNC_INTERVAL_MS = 15_000

// Time we wait for any peer to answer our initial sync step 1 before
// assuming we're alone and seeding Y.Array from the locally-loaded scene.
const SEED_AFTER_SYNC_DELAY_MS = 700

const CURSOR_PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#a855f7",
]
export function cursorColorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CURSOR_PALETTE[h % CURSOR_PALETTE.length]
}

interface UseWhiteboardSyncOpts {
  persistenceKey: string
  apiRef: MutableRefObject<ExcalidrawImperativeAPI | null>
  participantName: string
  enabled: boolean
}

// Diagnostic counters — bump on every send/recv so the console shows at a
// glance that the channel is alive in both directions.
let dbgSentSync = 0
let dbgRecvSync = 0

// Cheap, log-friendly description of a Yjs transaction origin. The
// binding uses `this` (an ExcalidrawBinding instance) as its origin; our
// remote-applied updates use the REMOTE_ORIGIN Symbol; locally-typed
// seed transactions use `null`. Useful for figuring out why a packet
// was/wasn't broadcast.
function describeOrigin(origin: unknown): string {
  if (origin === REMOTE_ORIGIN) return "REMOTE"
  if (origin == null) return "null"
  if (typeof origin === "symbol") return `Symbol(${origin.description ?? ""})`
  if (typeof origin === "object") return origin.constructor?.name ?? "object"
  return String(origin)
}

export function useWhiteboardSync({
  persistenceKey,
  apiRef,
  participantName,
  enabled,
}: UseWhiteboardSyncOpts) {
  // undefined when the whiteboard is the standalone dashboard editor;
  // a Room when we're rendered inside a LiveKit class. Every consumer
  // below already guards on `room` before doing transport work.
  const room = useMaybeRoomContext()
  const [active, setActive] = useState(false)

  const ydocRef = useRef<Y.Doc | null>(null)
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null)
  const bindingRef = useRef<ExcalidrawBinding | null>(null)
  // Snapshot of the scene Excalidraw was holding when the binding mounted.
  // Used as the seed source if we discover no peers have data (so we don't
  // wipe the canvas just because we're the first in the room).
  const cachedSceneRef = useRef<ReadonlyArray<unknown> | null>(null)

  // Create the Y.Doc + Awareness once per board (persistenceKey).
  useEffect(() => {
    const ydoc = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(ydoc)
    ydocRef.current = ydoc
    awarenessRef.current = awareness
    return () => {
      try {
        bindingRef.current?.destroy()
      } catch {
        /* binding may not exist yet */
      }
      bindingRef.current = null
      awareness.destroy()
      ydoc.destroy()
      ydocRef.current = null
      awarenessRef.current = null
      cachedSceneRef.current = null
    }
  }, [persistenceKey])

  // Stable colour for this participant.
  const localColor = useMemo(() => {
    const id = room?.localParticipant?.identity ?? "anon"
    return cursorColorFor(id)
  }, [room])

  // Bind ONCE per board. Deps are intentionally minimal — we never want
  // the binding to tear down because a participant's name or colour
  // changed, because the gap between teardown and re-attach drops local
  // edits on the floor.
  useEffect(() => {
    if (!enabled) return
    const ydoc = ydocRef.current
    const awareness = awarenessRef.current
    if (!ydoc || !awareness) return

    let timer: ReturnType<typeof setInterval> | null = null
    let mounted = true
    const attach = () => {
      if (!mounted) return true
      // Guard against multiple bindings on the same Y.Doc — would
      // produce echoed writes and double-observed remote events.
      if (bindingRef.current) return true
      const api = apiRef.current
      if (!api) return false

      // Snapshot the scene BEFORE constructing the binding. y-excalidraw's
      // constructor does `api.updateScene({ elements: yjsToExcalidraw(yArr) })`
      // unconditionally. If yArr is empty, that call wipes Excalidraw. We
      // keep the snapshot so the sync effect below can decide whether to
      // seed Y.Doc from it (only when no peer answers the sync request).
      const sceneSnapshot = api.getSceneElements().map((el) => ({ ...el }))
      cachedSceneRef.current = sceneSnapshot

      // Monkey-patch updateScene to repair fractional indices on every
      // call. y-excalidraw 2.0.12 was built against Excalidraw 0.17,
      // which didn't enforce fractional indexing. 0.18 rejects elements
      // whose `index` field isn't a key starting with a letter ("a0",
      // "Zz", …) and throws "invalid order key head: 0" mid-render.
      // The binding's remote-change handler calls
      // `api.updateScene({ elements })` without sanitising, so any
      // remote element produced by an older client (or an in-flight
      // freshly-drawn element whose index hasn't been finalised) blows
      // up the entire canvas. Running every updateScene through
      // sanitizeIndices normalises indices in place.
      //
      // sanitizeIndices is a sync, pure-JS helper above — no dynamic
      // import races, no SSR navigator crashes.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const realUpdateScene = api.updateScene.bind(api) as (data: any) => void
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(api as any).updateScene = (sceneData: any) => {
        try {
          if (sceneData && Array.isArray(sceneData.elements)) {
            sceneData.elements = sanitizeIndices(sceneData.elements)
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("[whiteboard-sync] sanitizeIndices in updateScene patch threw:", err)
        }
        return realUpdateScene(sceneData)
      }

      const yElements = ydoc.getArray<Y.Map<unknown>>("elements")
      const yAssets = ydoc.getMap<unknown>("assets")

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bindingRef.current = new ExcalidrawBinding(yElements, yAssets, api as any, awareness)
        // eslint-disable-next-line no-console
        console.info(
          `[whiteboard-sync] binding attached · key=${persistenceKey} · cachedScene=${sceneSnapshot.length}`,
        )
        // Parallel diagnostic onChange. If this fires but `onYUpdate`
        // doesn't, then the binding's diff-and-write path isn't
        // detecting changes — usually means `lastKnownElements` got out
        // of sync with the scene (e.g. duplicate yElements entries
        // making `areElementsSame` mis-conclude they match) and the
        // binding silently no-ops on every edit.
        let dbgChangeCount = 0
        const sceneEls = api.getSceneElements()
        let dbgLastLen = sceneEls.length
        let dbgLastVer = sceneEls.reduce((s, e) => s + (e.version ?? 0), 0)
        api.onChange((els) => {
          dbgChangeCount++
          const len = els.length
          const ver = els.reduce((s, e) => s + (e.version ?? 0), 0)
          if (len !== dbgLastLen || ver !== dbgLastVer) {
            // eslint-disable-next-line no-console
            console.debug(
              `[whiteboard-sync] excalidraw change #${dbgChangeCount}: len ${dbgLastLen}→${len}, verSum ${dbgLastVer}→${ver}`,
            )
            dbgLastLen = len
            dbgLastVer = ver
          }
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[whiteboard-sync] failed to attach Excalidraw binding", err)
      }
      return true
    }

    if (!attach()) {
      timer = setInterval(() => {
        if (attach() && timer) {
          clearInterval(timer)
          timer = null
        }
      }, 100)
    }

    return () => {
      mounted = false
      if (timer) clearInterval(timer)
      try {
        bindingRef.current?.destroy()
      } catch {
        /* may already be torn down */
      }
      bindingRef.current = null
    }
  }, [enabled, apiRef, persistenceKey])

  // Push name + colour into awareness as those change. Doesn't touch the
  // binding.
  useEffect(() => {
    if (!enabled) return
    const awareness = awarenessRef.current
    if (!awareness) return
    const id = room?.localParticipant?.identity ?? "anon"
    awareness.setLocalStateField("user", { name: participantName, color: localColor, id })
  }, [enabled, participantName, localColor, room])

  // LiveKit transport — y-protocols/sync over the data channel.
  useEffect(() => {
    if (!enabled || !room) return
    const ydoc = ydocRef.current
    const awareness = awarenessRef.current
    if (!ydoc || !awareness) return

    setActive(room.state === ConnectionState.Connected)

    // ─── Outbound ──────────────────────────────────────────────────────
    // Low-level raw send — does not chunk. Used for already-small
    // payloads (cursors, single-element deltas, individual chunks).
    //
    // We swallow ConnectionError silently for unreliable sends (cursor
    // moves) because LiveKit's room.state can lag behind its actual
    // publisher PeerConnection state — during a transient reconnect the
    // room reports "connected" while the publisher PC is already
    // closed, and every cursor move fires "could not establish
    // Publisher connection, state: closed" until LK fully reconnects.
    // The 15 s state-vector resync recovers any element sync deltas
    // that get dropped during the same window, so logging that lane
    // too is just noise.
    const sendRaw = (body: Uint8Array, reliable: boolean) => {
      if (room.state !== ConnectionState.Connected) return
      room.localParticipant
        .publishData(body, { reliable, topic: WB_CHANNEL_TOPIC })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          // ConnectionError on the unreliable lane = transient publisher
          // PC close. Silently drop; the next packet will retry once LK
          // re-establishes.
          if (!reliable && /could not establish.*Publisher|state: closed/i.test(msg)) {
            return
          }
          // eslint-disable-next-line no-console
          console.warn(
            `[whiteboard-sync] publishData failed (${body.length}B reliable=${reliable}):`,
            err,
          )
        })
    }

    // Chunking sender. If payload fits, sends raw. Otherwise splits
    // into ≤60KB chunks tagged with MESSAGE_CHUNK and reassembled by
    // the receiver. LiveKit's data-channel hard ceiling is 65535 bytes
    // per publish call; without chunking, a sync step 2 with a fully
    // populated Y.Doc just gets rejected and nothing flows.
    let outgoingChunkId = 0
    const send = (body: Uint8Array, reliable: boolean) => {
      if (body.length <= MAX_PUBLISH_BYTES) {
        sendRaw(body, reliable)
        return
      }
      const msgId = outgoingChunkId++ & 0xffff
      const count = Math.ceil(body.length / MAX_PUBLISH_BYTES)
      // eslint-disable-next-line no-console
      console.debug(
        `[whiteboard-sync] chunking ${body.length}B into ${count} pieces (msgId=${msgId})`,
      )
      for (let i = 0; i < count; i++) {
        const start = i * MAX_PUBLISH_BYTES
        const end = Math.min(start + MAX_PUBLISH_BYTES, body.length)
        const slice = body.subarray(start, end)
        const chunk = new Uint8Array(CHUNK_HEADER_BYTES + slice.length)
        chunk[0] = MESSAGE_CHUNK
        chunk[1] = msgId & 0xff
        chunk[2] = (msgId >> 8) & 0xff
        chunk[3] = i & 0xff
        chunk[4] = (i >> 8) & 0xff
        chunk[5] = count & 0xff
        chunk[6] = (count >> 8) & 0xff
        chunk.set(slice, CHUNK_HEADER_BYTES)
        sendRaw(chunk, reliable)
      }
    }

    // Receiver-side reassembly buffer. Key = `${peerIdentity}:${msgId}`.
    // We key by peer so two peers can use overlapping msgIds without
    // collision. Buffers age out after 30 s (unlikely to need recovery
    // that long after).
    const chunkBuffers = new Map<
      string,
      { parts: Array<Uint8Array | undefined>; remaining: number; expiresAt: number }
    >()
    const CHUNK_BUFFER_TTL_MS = 30_000
    const reapInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, buf] of chunkBuffers) {
        if (buf.expiresAt < now) chunkBuffers.delete(key)
      }
    }, 5_000)

    // Broadcast sync step 1 — small state-vector message. Peers reply
    // with the diff we're missing and (per the y-websocket protocol)
    // their own state vector so we can reply with what they're missing.
    const broadcastSyncStep1 = () => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      syncProtocol.writeSyncStep1(encoder, ydoc)
      dbgSentSync++
      // eslint-disable-next-line no-console
      console.debug(`[whiteboard-sync] → sync step 1 (sent=${dbgSentSync})`)
      send(encoding.toUint8Array(encoder), true)
    }

    // Broadcast a tiny "query my awareness" so newly-joined peers learn
    // about everyone's cursors without waiting for someone to move.
    const broadcastAwarenessQuery = () => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_QUERY_AWARENESS)
      send(encoding.toUint8Array(encoder), true)
    }

    const broadcastLocalAwareness = () => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          Array.from(awareness.getStates().keys()),
        ),
      )
      send(encoding.toUint8Array(encoder), true)
    }

    // Local Y.Doc edits — fired by the binding when Excalidraw changes.
    // Diagnostic logging here is load-bearing: when sync silently
    // misbehaves the FIRST question is always "did the binding write
    // to ydoc?". Without this log we can't distinguish "binding didn't
    // fire" from "broadcast didn't fire" from "peer dropped".
    const onYUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE_ORIGIN) {
        // eslint-disable-next-line no-console
        console.debug(
          `[whiteboard-sync] ydoc update from REMOTE — no echo (${update.length}B)`,
        )
        return
      }
      dbgSentSync++
      // eslint-disable-next-line no-console
      console.debug(
        `[whiteboard-sync] → ydoc update ${update.length}B origin=${describeOrigin(origin)} (sent=${dbgSentSync})`,
      )
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      syncProtocol.writeUpdate(encoder, update)
      send(encoding.toUint8Array(encoder), true)
    }
    ydoc.on("update", onYUpdate)

    // Local awareness changes — cursor moves etc.
    const onAwarenessUpdate = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (origin === REMOTE_ORIGIN) return
      const changedClients = added.concat(updated).concat(removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      )
      // Awareness is high-frequency — unreliable lane is fine for cursors,
      // but we want reliability for join/leave so the cursor doesn't
      // ghost. Use reliable for added/removed, unreliable for plain
      // updates (cursor moves).
      const reliable = added.length > 0 || removed.length > 0
      send(encoding.toUint8Array(encoder), reliable)
    }
    awareness.on("update", onAwarenessUpdate)

    // ─── Inbound ───────────────────────────────────────────────────────
    const onData = (
      payload: Uint8Array,
      participant?: { identity?: string } | unknown,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== WB_CHANNEL_TOPIC) return
      if (payload.length < 1) return
      // Chunked-message reassembly. Buffered by (peerIdentity, msgId);
      // when all chunks arrive we concatenate and recursively dispatch
      // as if the original payload had come in one piece.
      if (payload[0] === MESSAGE_CHUNK) {
        if (payload.length < CHUNK_HEADER_BYTES) return
        const msgId = payload[1] | (payload[2] << 8)
        const index = payload[3] | (payload[4] << 8)
        const count = payload[5] | (payload[6] << 8)
        const data = payload.subarray(CHUNK_HEADER_BYTES)
        const peerId =
          (typeof participant === "object" &&
            participant !== null &&
            "identity" in participant &&
            typeof (participant as { identity?: unknown }).identity === "string"
            ? (participant as { identity: string }).identity
            : "unknown")
        const key = `${peerId}:${msgId}`
        let buf = chunkBuffers.get(key)
        if (!buf) {
          buf = {
            parts: new Array(count),
            remaining: count,
            expiresAt: Date.now() + CHUNK_BUFFER_TTL_MS,
          }
          chunkBuffers.set(key, buf)
        }
        if (buf.parts[index] === undefined) {
          buf.parts[index] = data
          buf.remaining--
        }
        if (buf.remaining === 0) {
          chunkBuffers.delete(key)
          let total = 0
          for (const part of buf.parts) total += part?.length ?? 0
          const reassembled = new Uint8Array(total)
          let offset = 0
          for (const part of buf.parts) {
            if (part) {
              reassembled.set(part, offset)
              offset += part.length
            }
          }
          // eslint-disable-next-line no-console
          console.debug(
            `[whiteboard-sync] reassembled chunked msg ${reassembled.length}B from ${count} pieces (peer=${peerId})`,
          )
          // Recurse with the full payload. The recursive call won't see
          // MESSAGE_CHUNK in byte 0 — it'll route to the right handler.
          onData(reassembled, participant, _kind, topic)
        }
        return
      }
      try {
        const decoder = decoding.createDecoder(payload)
        const messageType = decoding.readVarUint(decoder)
        if (messageType === MESSAGE_SYNC) {
          dbgRecvSync++
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, MESSAGE_SYNC)
          // We dispatch the sync sub-message manually instead of calling
          // syncProtocol.readSyncMessage. Why: that function's apply-side
          // catch block always fires `console.error('Caught error while
          // handling a Yjs update', err)` even when our custom error
          // handler also ran — Turbopack escalates that to a runtime
          // overlay even though the session continues. Re-implementing
          // the three-case switch here lets us silently absorb the known
          // y-excalidraw observer crash ("Cannot read properties of
          // undefined (reading 'id')") that fires when an image arrives
          // whose asset hasn't loaded yet; the next resync vector
          // re-applies the missed delta.
          const syncSubType = decoding.readVarUint(decoder)
          if (syncSubType === syncProtocol.messageYjsSyncStep1) {
            // Reply with our state encoded as step 2 against their state vector.
            const remoteStateVector = decoding.readVarUint8Array(decoder)
            syncProtocol.writeSyncStep2(encoder, ydoc, remoteStateVector)
          } else if (
            syncSubType === syncProtocol.messageYjsSyncStep2 ||
            syncSubType === syncProtocol.messageYjsUpdate
          ) {
            const update = decoding.readVarUint8Array(decoder)
            try {
              Y.applyUpdate(ydoc, update, REMOTE_ORIGIN)
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn(
                "[whiteboard-sync] applyUpdate observer threw — packet absorbed, will recover on next 15s resync:",
                err instanceof Error ? err.message : err,
              )
            }
          }
          // eslint-disable-next-line no-console
          console.debug(
            `[whiteboard-sync] ← sync msg subtype=${syncSubType} (recv=${dbgRecvSync})`,
          )
          // If the read produced a response (step1 → step2), send it.
          // Length 1 = only the outer envelope byte was written.
          if (encoding.length(encoder) > 1) {
            send(encoding.toUint8Array(encoder), true)
          }
        } else if (messageType === MESSAGE_AWARENESS) {
          const update = decoding.readVarUint8Array(decoder)
          awarenessProtocol.applyAwarenessUpdate(awareness, update, REMOTE_ORIGIN)
        } else if (messageType === MESSAGE_QUERY_AWARENESS) {
          // Reply with our full awareness state so the asker learns
          // about all currently-known cursors at once.
          broadcastLocalAwareness()
        }
      } catch (err) {
        // A single corrupt or out-of-band packet shouldn't break the
        // session — log and move on.
        // eslint-disable-next-line no-console
        console.warn("[whiteboard-sync] inbound parse threw:", err)
      }
    }
    room.on(RoomEvent.DataReceived, onData)

    // ─── Triggers ──────────────────────────────────────────────────────
    // 1) On local (re)connect: ask everyone for state.
    const onStateChange = () => {
      const connected = room.state === ConnectionState.Connected
      setActive(connected)
      if (connected) {
        broadcastSyncStep1()
        broadcastAwarenessQuery()
      }
    }
    room.on(RoomEvent.ConnectionStateChanged, onStateChange)

    // 2) On a REMOTE participant joining: push our state to them. This is
    //    the half of the handshake the old code missed — a late joiner's
    //    own sync-step-1 request could race their subscription, so we
    //    can't rely on it. Existing peers proactively broadcasting fixes
    //    "host's scene didn't show up for the student".
    const onParticipantConnected = () => {
      // Slight delay so the joiner's data-channel subscription has time
      // to settle. LK's "participantConnected" can fire before the joiner
      // is ready to receive data.
      setTimeout(() => {
        broadcastSyncStep1()
        broadcastLocalAwareness()
      }, 150)
    }
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected)

    // 3) Periodic resync — recovers from any dropped delta. State-vector
    //    messages are tiny, no-op if everyone is already in sync (peer's
    //    diff is empty).
    const resyncTimer = setInterval(() => {
      if (room.state === ConnectionState.Connected) broadcastSyncStep1()
    }, RESYNC_INTERVAL_MS)

    // 4) Seed Y.Doc from the cached Excalidraw scene IF (a) we have a
    //    cached scene, and (b) after the sync handshake had a chance to
    //    land, Y.Array is still empty. This prevents the "fresh refresh
    //    wipes the canvas" bug without causing duplicates when a peer
    //    DID send us state.
    const seedTimer = setTimeout(() => {
      const yElements = ydoc.getArray<Y.Map<unknown>>("elements")
      const cached = cachedSceneRef.current ?? []
      if (yElements.length === 0 && cached.length > 0) {
        // eslint-disable-next-line no-console
        console.info(
          `[whiteboard-sync] no peer state after ${SEED_AFTER_SYNC_DELAY_MS}ms — seeding ${cached.length} elements from local scene`,
        )
        ydoc.transact(() => {
          const seeds: Y.Map<unknown>[] = cached.map((el, i) => {
            const m = new Y.Map<unknown>()
            m.set("pos", String(i + 1).padStart(8, "0"))
            m.set("el", { ...(el as object) })
            return m
          })
          yElements.push(seeds)
        })
      }
    }, SEED_AFTER_SYNC_DELAY_MS)

    // Initial handshake fires immediately if we're already connected.
    if (room.state === ConnectionState.Connected) {
      broadcastSyncStep1()
      broadcastAwarenessQuery()
    }

    // 5) Cursor cleanup when a peer leaves.
    const onParticipantLeft = (p: { identity: string }) => {
      const states = awareness.getStates()
      const stale: number[] = []
      states.forEach((s, clientId) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = (s as any)?.user
        if (u?.id === p.identity) stale.push(clientId)
      })
      if (stale.length > 0) {
        awarenessProtocol.removeAwarenessStates(awareness, stale, REMOTE_ORIGIN)
      }
    }
    room.on(RoomEvent.ParticipantDisconnected, onParticipantLeft)

    return () => {
      clearInterval(resyncTimer)
      clearInterval(reapInterval)
      clearTimeout(seedTimer)
      chunkBuffers.clear()
      room.off(RoomEvent.ConnectionStateChanged, onStateChange)
      room.off(RoomEvent.DataReceived, onData)
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, onParticipantLeft)
      ydoc.off("update", onYUpdate)
      awareness.off("update", onAwarenessUpdate)
      if (room.state === ConnectionState.Connected) {
        try {
          awarenessProtocol.removeAwarenessStates(
            awareness,
            [awareness.clientID],
            "local",
          )
        } catch {
          /* during teardown, ignore */
        }
      }
    }
  }, [enabled, room, persistenceKey])

  // Pointer handler from the binding — wire into Excalidraw's
  // onPointerUpdate so cursor moves get broadcast as awareness deltas.
  const onPointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number; tool: "pointer" | "laser" }; button: "down" | "up" }) => {
      const binding = bindingRef.current
      if (!binding) return
      binding.onPointerUpdate(payload)
    },
    [],
  )

  return {
    onPointerUpdate,
    active,
    localColor,
  }
}
