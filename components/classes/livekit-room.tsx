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
  useTracks,
} from "@livekit/components-react"
import { Track, VideoPresets } from "livekit-client"
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
        {children ?? <LiveKitVideoUI />}
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
export function LiveKitVideoUI() {
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
    <>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
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
        controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: true }}
        variation="minimal"
      />
    </>
  )
}
