"use client"

// LiveKit-backed live class room.
//
// Exposed as a wrapper that holds the LKRoom context. The caller decides
// what renders inside — typically <LiveKitVideoUI /> for the standard
// video grid, but also things like <WhiteboardCanvas enableSync /> which
// use the same LiveKit data channel for multiplayer sync.
//
// Default-call usage:
//   <LiveKitRoom roomCode user isHost>
//     <LiveKitVideoUI />
//   </LiveKitRoom>
//
// Call + multiplayer whiteboard (host page tabs):
//   <LiveKitRoom roomCode user isHost>
//     <Tabs>
//       <Tab value="video">    <LiveKitVideoUI /> </Tab>
//       <Tab value="whiteboard"><WhiteboardCanvas enableSync ... /> </Tab>
//     </Tabs>
//   </LiveKitRoom>
//
// The lower-level GridLayout/ParticipantTile pair is used rather than the
// bundled <VideoConference> because the latter has a known placeholder-swap
// crash. The lower-level path is more stable.

import { useMemo } from "react"
import {
  LiveKitRoom as LKRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  // LayoutContextProvider wraps any subtree that uses LiveKit's
  // layout-aware components — most prominently ControlBar (which
  // reads pinned-tile / chat-open state from the context). Without
  // it, ControlBar throws "Tried to access LayoutContext context
  // outside a LayoutContextProvider provider." on mount. Newer
  // @livekit/components-react versions decoupled it from the
  // VideoConference component so we have to mount it ourselves.
  LayoutContextProvider,
  useTracks,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react"
import { RoomEvent, Track, VideoPresets } from "livekit-client"
import "@livekit/components-styles"
import {
  LIVEKIT_URL,
  fetchLiveKitToken,
  livekitRoomName,
  type LiveKitTokenUser,
} from "@/lib/livekit"
import { useEffect, useState, type ReactNode } from "react"
import { LiveCaptions } from "./live-captions"

interface LiveKitRoomProps {
  /** Room code or session id. Same code → same room (get-or-create). */
  roomCode: string
  user: LiveKitTokenUser
  /** When true, the user is granted `roomAdmin` permission (mute/kick others). */
  isHost: boolean
  /** Per-class chat enablement. Forwarded to the default
   *  LiveKitVideoUI's ControlBar. Defaults to true; only the
   *  default child reads this — custom `children` should consume
   *  it themselves if they want to honour the toggle. */
  chatEnabled?: boolean
  onLeft?: () => void
  className?: string
  /**
   * What renders inside the room context. Defaults to the standard video
   * grid + control bar (<LiveKitVideoUI />). Pass custom children to share
   * the same LiveKit connection between the call UI and adjacent surfaces
   * (e.g. a multiplayer whiteboard).
   */
  children?: ReactNode
}

export function LiveKitRoom({
  roomCode,
  user,
  isHost,
  chatEnabled = true,
  onLeft,
  className,
  children,
}: LiveKitRoomProps) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const roomName = livekitRoomName(roomCode)

  useEffect(() => {
    let cancelled = false
    setError(null)
    // Diagnostic — host + student should print the SAME roomName in
    // DevTools. If they differ, they're in different LiveKit rooms and
    // won't see each other. The room code derivation is shared
    // (canonicalRoomCode), so this is mostly to confirm in the field.
    // eslint-disable-next-line no-console
    console.info(
      `[livekit] joining as ${isHost ? "host" : "guest"} · room=${roomName} · user=${user.name} (${user.id})`,
    )
    fetchLiveKitToken({ roomName, user, moderator: isHost })
      .then((t) => {
        if (cancelled) return
        if (!t) {
          setError(
            "Live-room token endpoint returned no token. Check LIVEKIT_API_KEY / LIVEKIT_API_SECRET on the backend.",
          )
          return
        }
        setToken(t)
      })
      .catch((e) => {
        if (cancelled) return
        setError(String(e?.message ?? e))
      })
    return () => {
      cancelled = true
    }
  }, [roomName, user.id, user.name, user.email, isHost])

  // Memoize room options once per token to avoid the @livekit/components-react
  // track-array drift bug — re-creating the options object on every render
  // makes the inner Room treat each render as "joined a new room" and double
  // -registers track refs.
  const roomOptions = useMemo(
    () => ({
      adaptiveStream: true,
      dynacast: true,
      // Capture the camera at 1080p so the recording (which encodes at 1080p
      // via LiveKit Egress) has a sharp source instead of upscaled 720p.
      // Screen share gets a higher cap because slides/IDE detail matters.
      videoCaptureDefaults: {
        resolution: VideoPresets.h1080.resolution,
      },
      publishDefaults: {
        videoEncoding: VideoPresets.h1080.encoding,
        screenShareEncoding: VideoPresets.h1440.encoding,
      },
    }),
    [],
  )

  if (error) {
    return (
      <div className={className}>
        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black/40 p-6 text-center text-xs text-white/70">
          <div>
            <p className="font-medium text-white">Couldn&apos;t join the room</p>
            <p className="mt-1 text-white/60">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className={className} aria-busy>
        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black/40 text-xs text-white/60">
          Connecting to room…
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ position: "relative" }} data-lk-theme="default">
      {/* Stable key on LKRoom — never changes once we have a token, so React
          never tears down and remounts the Room mid-call. */}
      <LKRoom
        key={`${roomName}-${user.id}`}
        token={token}
        serverUrl={LIVEKIT_URL}
        connect
        video
        audio
        options={roomOptions}
        style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}
        onDisconnected={() => onLeft?.()}
      >
        {children ?? <LiveKitVideoUI isHost={isHost} chatEnabled={chatEnabled} />}
        <RoomAudioRenderer />
        <LiveCaptions speakerName={user.name} />
      </LKRoom>
    </div>
  )
}

// Standard video UI — active-speaker grid + control bar. Exposed so callers
// of LiveKitRoom that want the default call surface can render it inside
// their own layout while sharing the LiveKit connection with adjacent
// surfaces (whiteboard, etc.).
export function LiveKitVideoUI({
  isHost = false,
  chatEnabled = true,
}: {
  isHost?: boolean
  /** Per-class override for the LiveKit ControlBar chat icon.
   *  Defaults to enabled. Instructors running focused / recording-
   *  only sessions can flip this off on the class detail page. */
  chatEnabled?: boolean
} = {}) {
  // No placeholders. The bundled placeholder logic in @livekit/components-react
  // races the real-track swap and throws "Element not part of the array …
  // _camera_placeholder not in _camera_TR_xxx" inside GridLayout/FocusLayout.
  // Without placeholders, participants who haven't published their camera
  // simply don't have a tile yet — they appear the instant they enable cam.
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  return (
    // Wrap the whole UI subtree in LayoutContextProvider so the
    // ControlBar (and chat sub-panel) can read pinned/focused-tile
    // state. The provider needs to be a parent of every layout-aware
    // child — wrapping the entire return value is the smallest safe
    // change. Without this wrapper the host page throws on mount.
    <LayoutContextProvider>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {/* Host-only pill: live status + participant count + recording
            indicator. Pinned top-right, doesn't interfere with the
            video grid below it. Students get a smaller compliance
            banner via LiveRecordingBanner instead. */}
        {isHost && <LiveIndicatorPill />}
        {/* All-participants compliance banner — "this class is being
            recorded" must be visible whenever the room is recording.
            Renders only when recording is actually on. */}
        <LiveRecordingBanner hideForHost={isHost} />
        {tracks.length > 0 ? (
          <GridLayout tracks={tracks} style={{ height: "100%" }}>
            <ParticipantTile />
          </GridLayout>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
            }}
          >
            Waiting for someone to turn on their camera…
          </div>
        )}
      </div>
      <ControlBar
        // Chat is enabled — LiveKit's built-in panel covers the
        // 80% case (text, slow-mode-by-host, message history while
        // present). Custom moderation (pin, mute, slow-mode toggle)
        // is a follow-up; the gap between "no chat" and "any chat"
        // is the bigger UX win.
        controls={{ microphone: true, camera: true, screenShare: true, chat: chatEnabled, leave: true }}
        variation="minimal"
      />
    </LayoutContextProvider>
  )
}

// Host-only status pill. Mounts inside LiveKitVideoUI so it inherits
// the LiveKit room context — no prop drilling. Renders:
//   🟢 LIVE · N watching · ◉ Recording (when active)
//
// Participant count uses LiveKit's `useParticipants` which includes
// remote participants only — we subtract the host themselves from
// the count rather than the SDK doing it, because the local
// participant is identified separately and a "watching" count
// shouldn't include the broadcaster.
function LiveIndicatorPill() {
  const participants = useParticipants()
  const room = useRoomContext()
  const remoteCount = Math.max(0, participants.length - 1)
  const [isRecording, setIsRecording] = useState<boolean>(
    () => room?.isRecording ?? false,
  )
  // LiveKit emits a Room event when recording status flips; subscribe
  // so the pill updates without forcing a parent re-render. Default
  // state is read above so initial paint is correct.
  useEffect(() => {
    if (!room) return
    const sync = () => setIsRecording(room.isRecording)
    room.on(RoomEvent.RecordingStatusChanged, sync)
    sync()
    return () => {
      room.off(RoomEvent.RecordingStatusChanged, sync)
    }
  }, [room])

  return (
    <div
      // pointer-events-none so this never blocks clicks on tiles
      // beneath it. The badge itself is purely informational.
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 20,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.72)",
        color: "white",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }}
      aria-live="polite"
    >
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#22c55e",
          boxShadow: "0 0 0 4px rgba(34,197,94,0.18)",
          animation: "lk-live-pulse 2s ease-in-out infinite",
        }}
      />
      <span>Live</span>
      <span style={{ opacity: 0.6 }}>·</span>
      <span style={{ textTransform: "none", fontWeight: 500 }}>
        {remoteCount} watching
      </span>
      {isRecording && (
        <>
          <span style={{ opacity: 0.6 }}>·</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "#fca5a5",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#ef4444",
                animation: "lk-rec-pulse 1.4s ease-in-out infinite",
              }}
            />
            Recording
          </span>
        </>
      )}
      {/* Inline keyframes so we don't need a separate CSS file or
          a tailwind utility. Repeats are bounded to two animations
          to keep the GPU work negligible. */}
      <style>{`
        @keyframes lk-live-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(34,197,94,0.18); }
          50%      { box-shadow: 0 0 0 6px rgba(34,197,94,0.05); }
        }
        @keyframes lk-rec-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// Compliance banner — visible to every participant whenever the
// room is being recorded. Required by privacy law in most regions
// (GDPR, CCPA, India's DPDP Act). Renders a slim red bar at the
// top of the video pane; hides itself if the host already sees the
// recording indicator in the host pill (no double-banner stack).
function LiveRecordingBanner({ hideForHost }: { hideForHost: boolean }) {
  const room = useRoomContext()
  const [isRecording, setIsRecording] = useState<boolean>(
    () => room?.isRecording ?? false,
  )
  useEffect(() => {
    if (!room) return
    const sync = () => setIsRecording(room.isRecording)
    room.on(RoomEvent.RecordingStatusChanged, sync)
    sync()
    return () => {
      room.off(RoomEvent.RecordingStatusChanged, sync)
    }
  }, [room])
  if (!isRecording) return null
  if (hideForHost) return null
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: "rgba(239,68,68,0.92)",
        color: "white",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
      role="status"
    >
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "white",
          animation: "lk-rec-pulse 1.4s ease-in-out infinite",
        }}
      />
      This class is being recorded
    </div>
  )
}
