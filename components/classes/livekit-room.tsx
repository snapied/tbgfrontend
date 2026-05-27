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

import { useMemo, useCallback, useRef } from "react"
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
  useChat,
  useLocalParticipant,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
  useParticipantContext,
  usePinnedTracks,
  useLayoutContext,
  isTrackReference,
  useDataChannel,
} from "@livekit/components-react"
import { RoomEvent, Track, VideoPresets, AudioPresets } from "livekit-client"
import { useRaisedHands, readRaisedHands, _applyNetworkSync } from "@/lib/raised-hands"
import { useLivePoll, _applyPollNetworkSync } from "@/lib/live-poll"
import { Hand, Monitor } from "lucide-react"
import {
  ComprehensionCheckHost,
  ComprehensionCheckStudent,
} from "@/components/classes/comprehension-check-bar"
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
  /** Scheduled start (ISO) + planned duration (minutes). When both
   *  are provided AND `isHost` is true, the in-call pill renders a
   *  live "Time left / +N over" chip so a host running long sees
   *  it. Ad-hoc rooms can omit. */
  scheduledAt?: string
  durationMinutes?: number
  /** When set, every chat message that flows through the LiveKit
   *  ControlBar chat is buffered to a tenant-scoped localStorage
   *  key keyed by sessionId. The host page reads + persists this
   *  to session.chatTranscript on End so the recording carries
   *  the side-channel context. Omit for ad-hoc rooms with no
   *  session entity. */
  sessionId?: string
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
  scheduledAt,
  durationMinutes,
  sessionId,
  onLeft,
  className,
  children,
}: LiveKitRoomProps) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const roomName = livekitRoomName(roomCode)

  // ─── Frozen identity ─────────────────────────────────────────────────────
  // Once the first valid token arrives, we lock everything into refs.
  // All subsequent parent re-renders (e.g. the 3s session-state poll,
  // inline user objects being recreated) use these frozen values so the
  // LKRoom key and the token prop NEVER change — tearing the WebRTC
  // engine down mid-negotiation is what causes NegotiationError.
  const frozenRoomName = useRef<string | null>(null)
  const frozenUserId   = useRef<string | null>(null)
  // Frozen token: once set, this ref is the single source of truth for
  // the <LKRoom token> prop. We never pass a new token after connection.
  const frozenToken    = useRef<string | null>(null)

  // Stable identity fingerprint — collapses user.name + user.email into
  // one string so the effect dep doesn't fire on every parent re-render
  // that produces a new (but identical) inline `user` object.
  // Only re-runs when the values actually differ.
  const userFingerprint = useMemo(
    () => `${user.id}::${user.name}::${user.email ?? ""}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.id, user.name, user.email],
  )

  useEffect(() => {
    // ── Guard: already connected ─────────────────────────────────────
    // If we have a frozen token the engine is (or was) live. Never
    // re-fetch — that would deliver a new token to <LKRoom>, trigger a
    // disconnect+reconnect cycle, and throw NegotiationError exactly
    // when the old negotiation is still in flight.
    if (frozenToken.current) return

    let cancelled = false
    setError(null)
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
        // Freeze identity + token the moment the first valid token arrives.
        // All future renders use these refs — none of these values will
        // change again for the lifetime of this component mount.
        if (!frozenRoomName.current) frozenRoomName.current = roomName
        if (!frozenUserId.current)   frozenUserId.current   = user.id
        if (!frozenToken.current)    frozenToken.current    = t
        setToken(t)
      })
      .catch((e) => {
        if (cancelled) return
        setError(String(e?.message ?? e))
      })
    return () => {
      cancelled = true
    }
  // userFingerprint is the stable dep that replaces user.name + user.email.
  // roomName and isHost are included because a different room or role
  // genuinely needs a new token. frozenToken.current is read inside but
  // intentionally NOT listed — it's a ref (mutable, not reactive).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, userFingerprint, isHost])

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
      // Audio capture config for the microphone.
      //
      // echoCancellation is intentionally OFF:
      //   When the host plays audio through speakers (YouTube, a demo video,
      //   music) while mic is live, the browser's echo canceller treats that
      //   output audio as "room echo" and aggressively suppresses the mic
      //   signal — including the host's own voice. The result is a recording
      //   where voices disappear during any speaker playback.
      //   AEC is valuable on laptop speakers where the mic physically picks up
      //   the speaker. For classroom screen-share + video playback scenarios,
      //   the cost (lost voice) outweighs the benefit. Hosts typically use
      //   headphones anyway; even on laptop speakers, voice suppression is
      //   more disruptive than mild echo.
      //
      // autoGainControl + noiseSuppression stay on — they clean up
      // background noise without interfering with intentional audio.
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: false,   // see note above
        noiseSuppression: true,
        channelCount: 1,
        sampleRate: 48000,
      },
      // Screen share audio capture.
      //
      // Setting audio: true here tells LiveKit to request audio permission
      // when the user clicks the screen-share button. This causes Chrome/Edge
      // to show the "Share tab audio" checkbox in their screen picker UI.
      // Without this option, that checkbox is never offered and tab audio
      // (YouTube, demo videos, etc.) is NEVER captured or sent to LiveKit,
      // so it can't be in the recording no matter what.
      //
      // suppression: false — don't apply voice noise suppression to
      // screen-share audio; it's designed for system/media audio, not voice,
      // and the suppressor would mangle music/video audio noticeably.
      screenShareCaptureDefaults: {
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      },
      publishDefaults: {
        videoEncoding: VideoPresets.h1080.encoding,
        screenShareEncoding: VideoPresets.h1440.encoding,
        // Music-high-quality Opus preset: 48 kbps stereo-capable
        // vs the default ~32 kbps. Noticeably sharper voice in a
        // classroom setting where bandwidth is rarely the bottleneck.
        audioPreset: AudioPresets.musicHighQuality,
        // Screen share audio: use the music-high-quality preset so that
        // YouTube, demo videos, and music shared via "Share tab audio"
        // are reproduced faithfully in the recording. The default audio
        // preset (~32 kbps) is too lossy for music/video content.
        screenShareAudioPreset: AudioPresets.musicHighQuality,
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

  // Use the frozen identity for the key — this is the critical guard.
  // Falls back to the live values the very first render after token arrives
  // (refs are populated just before setToken, so they should always be set
  // by the time we reach here, but the fallback makes TypeScript happy).
  const stableRoomName = frozenRoomName.current ?? roomName
  const stableUserId   = frozenUserId.current   ?? user.id

  return (
    <div className={className} style={{ position: "relative" }} data-lk-theme="default">
      {/* Stable key + frozen token — the two guards against NegotiationError.
          key: derived from frozen room+user, never changes after connect.
          token: always frozenToken.current (the first valid token), never
          a new one — LKRoom reacts to a token change by disconnecting,
          which tears the engine while negotiation may still be in flight. */}
      <LKRoom
        key={`${stableRoomName}-${stableUserId}`}
        token={frozenToken.current ?? token}
        serverUrl={LIVEKIT_URL}
        connect={true}
        video
        audio
        options={roomOptions}
        style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}
        onDisconnected={() => onLeft?.()}
      >
        {children ?? (
          <LiveKitVideoUI
            isHost={isHost}
            chatEnabled={chatEnabled}
            scheduledAt={scheduledAt}
            durationMinutes={durationMinutes}
            sessionId={sessionId}
          />
        )}
        <RoomAudioRenderer />
        <LiveCaptions speakerName={user.name} />
        {sessionId && <RaisedHandsNetworkSync sessionId={sessionId} />}
        {sessionId && <LivePollNetworkSync sessionId={sessionId} />}
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
  scheduledAt,
  durationMinutes,
  sessionId,
}: {
  isHost?: boolean
  /** Per-class override for the LiveKit ControlBar chat icon.
   *  Defaults to enabled. Instructors running focused / recording-
   *  only sessions can flip this off on the class detail page. */
  chatEnabled?: boolean
  /** Optional schedule bounds, forwarded to the host-only pill
   *  so a teacher running long sees a visible over-time chip. */
  scheduledAt?: string
  durationMinutes?: number
  /** When set, the chat transcript recorder buffers every chat
   *  message to localStorage so the host can persist it to the
   *  session record on End. */
  sessionId?: string
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

  const room = useRoomContext()
  const { localParticipant } = useLocalParticipant()

  // Listen for MUTE commands from the host via DataChannel
  useEffect(() => {
    if (!room) return
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload))
        const isMuteCommand = data.type === "MUTE_ALL" || (data.type === "MUTE_USER" && data.userId === localParticipant?.identity)
        
        // If we are a student and a mute command targets us, turn off the mic
        if (!isHost && isMuteCommand && room.localParticipant) {
          room.localParticipant.setMicrophoneEnabled(false)
        }
      } catch (err) {
        // ignore JSON parse errors from other data messages
      }
    }
    room.on(RoomEvent.DataReceived, handleData)
    return () => {
      room.off(RoomEvent.DataReceived, handleData)
    }
  }, [room, isHost, localParticipant?.identity])

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
        {isHost && (
          <LiveIndicatorPill
            scheduledAt={scheduledAt}
            durationMinutes={durationMinutes}
          />
        )}
        {/* Side-effect-only recorder. Captures every chat message
            from the LiveKit data channel into localStorage so the
            host page can persist them to session.chatTranscript on
            End. Runs for every participant (host + students), each
            writing their own view; on End the host's flush is the
            one that lands in the session because the host page
            owns updateLiveSession. */}
        {sessionId && <ChatTranscriptRecorder sessionId={sessionId} />}
        {/* All-participants compliance banner — "this class is being
            recorded" must be visible whenever the room is recording.
            Renders only when recording is actually on. */}
        <LiveRecordingBanner hideForHost={isHost} />
        {/* In-class comprehension check.
            Host: read-only ratio in top-right of stage + amber alert
            when >30% are lost.
            Student: "With you / Lost" toggle pill anchored
            bottom-left over the video. Both update via tenant-
            scoped storage (same broadcast pattern as live polls). */}
        {sessionId && (
          <ComprehensionCheckMount sessionId={sessionId} isHost={isHost} />
        )}
        <VideoStage sessionId={sessionId} tracks={tracks} />
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

// ============================================================
// VideoStage — the main video grid / focus layout.
//
// Two modes:
//   1. Grid mode (no screen share): all camera tracks in a GridLayout.
//   2. Focus mode (screen share active): the screen-share track fills
//      the center as a FocusLayout; camera tracks sit in a vertical
//      CarouselLayout on the right side (like Google Meet).
//
// Each tile renders with an explicit `trackRef` prop — this is what
// fixes the "No TrackRef" crash that happened when `<ParticipantTile>`
// was rendered without context.
//
// Active speaker highlighting: tiles of currently speaking
// participants get a pulsing green glow border via CSS.
// ============================================================
function VideoStage({
  sessionId,
  tracks,
}: {
  sessionId?: string
  tracks: ReturnType<typeof useTracks>
}) {
  const { localParticipant } = useLocalParticipant()

  // Separate screen-share tracks from camera tracks.
  const screenShareTracks = tracks.filter(
    (t) => t.source === Track.Source.ScreenShare,
  )
  const cameraTracks = tracks.filter(
    (t) => t.source === Track.Source.Camera,
  )

  // Focus on the first screen share if any exist.
  const focusTrack = screenShareTracks[0]

  if (focusTrack && isTrackReference(focusTrack)) {
    const isLocalScreenShare = focusTrack.participant.identity === localParticipant.identity
    // ── Focus mode: screen share centered, cameras in sidebar ──
    return (
      <div
        className="lk-focus-layout-wrapper"
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          gap: 4,
        }}
      >
        {/* Screen share — fills the remaining space */}
        <div style={{ flex: 1, minWidth: 0, position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isLocalScreenShare ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg bg-black/60 border border-white/5 text-white/80">
              <div className="rounded-full bg-white/10 p-4">
                <Monitor className="h-8 w-8 text-blue-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-white">You are sharing your screen</h3>
                <p className="mt-1 text-sm">To avoid the infinite mirror effect, your screen is hidden from you.</p>
              </div>
            </div>
          ) : (
            <FocusLayoutContainer style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FocusLayout trackRef={focusTrack} />
            </FocusLayoutContainer>
          )}
        </div>

        {/* Camera sidebar — vertical strip on the right */}
        {cameraTracks.length > 0 && (
          <div
            style={{
              width: 200,
              maxWidth: "25%",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              overflowY: "auto",
            }}
          >
            {cameraTracks.map((trackRef) =>
              isTrackReference(trackRef) ? (
                <div
                  key={trackRef.participant.sid + "-" + trackRef.source}
                  style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}
                  className={trackRef.participant.isSpeaking ? "lk-speaking" : ""}
                >
                  <ParticipantTile trackRef={trackRef}>
                    {sessionId && <RaisedHandBadge sessionId={sessionId} />}
                  </ParticipantTile>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Grid mode: no screen share, everyone in a grid ──
  if (tracks.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
        }}
      >
        Waiting for participants to enable their camera…
      </div>
    )
  }

  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTileWithSpeaker sessionId={sessionId} />
    </GridLayout>
  )
}

// Wrapper rendered inside GridLayout. GridLayout provides a
// `trackRef` prop to each child automatically. We use this to read
// `isSpeaking` for the active-speaker glow, and pass it down to
// ParticipantTile so it can establish the ParticipantContext for
// the raised-hand badge.
function ParticipantTileWithSpeaker({
  sessionId,
  trackRef,
}: {
  sessionId?: string
  trackRef?: ReturnType<typeof useTracks>[0]
}) {
  const isSpeaking = trackRef?.participant?.isSpeaking ?? false

  return (
    <div
      style={{ position: "relative", height: "100%" }}
      className={isSpeaking ? "lk-speaking" : ""}
    >
      <ParticipantTile trackRef={trackRef}>
        {sessionId && <RaisedHandBadge sessionId={sessionId} />}
      </ParticipantTile>
    </div>
  )
}

function RaisedHandBadge({ sessionId }: { sessionId: string }) {
  const participant = useParticipantContext()
  const raisedHands = useRaisedHands(sessionId)
  const isRaised = raisedHands.some((h) => h.userId === participant.identity)

  if (!isRaised) return null
  return (
    <div className="absolute left-2 top-2 z-10 rounded-full bg-blue-500 p-1.5 text-white shadow-md animate-bounce">
      <Hand className="h-4 w-4" />
    </div>
  )
}

// Mounts the right comprehension check variant for the local
// participant. Host sees the live ratio + alert; students see the
// With-you / Lost toggle. Floats over the video stage via absolute
// positioning so it doesn't push the GridLayout around.
function ComprehensionCheckMount({
  sessionId,
  isHost,
}: {
  sessionId: string
  isHost: boolean
}) {
  const { localParticipant } = useLocalParticipant()
  const userId = localParticipant?.identity ?? null

  if (isHost) {
    return (
      <div className="pointer-events-none absolute right-3 top-14 z-20 flex max-w-xs flex-col items-end gap-1.5">
        <ComprehensionCheckHost sessionId={sessionId} />
      </div>
    )
  }
  if (!userId) return null
  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2">
      <ComprehensionCheckStudent sessionId={sessionId} userId={userId} />
    </div>
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
function LiveIndicatorPill({
  scheduledAt,
  durationMinutes,
}: {
  /** ISO start time of the scheduled session. When provided, the
   *  pill renders a "Time left" / "+N over" indicator so the host
   *  notices when class is running long. Omit for ad-hoc rooms
   *  where there's no planned end. */
  scheduledAt?: string
  /** Planned duration in minutes. Used together with `scheduledAt`
   *  to compute the over-time flip points (amber at any overrun,
   *  red after +15 min). */
  durationMinutes?: number
} = {}) {
  const participants = useParticipants()
  const room = useRoomContext()
  const remoteCount = Math.max(0, participants.length - 1)
  const [isRecording, setIsRecording] = useState<boolean>(
    () => room?.isRecording ?? false,
  )
  // Live clock tick — 30s is enough for human-readable time-left
  // copy (the eye doesn't notice second-by-second changes in a
  // minutes-scale countdown).
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    if (!scheduledAt || !durationMinutes) return
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [scheduledAt, durationMinutes])
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

  // Compute "time left" or "+over" based on scheduled bounds.
  // Three visual states:
  //   • white  — class is in-window (most of the call)
  //   • amber  — past `scheduledAt + durationMinutes` by 0–14 min
  //   • red    — past +15 min (this is the "wrap up RIGHT now" cue)
  // Returns null if we don't have enough info to compute (ad-hoc
  // rooms), so the pill renders its old layout.
  const timeChip = (() => {
    if (!scheduledAt || !durationMinutes) return null
    const startMs = Date.parse(scheduledAt)
    if (!Number.isFinite(startMs)) return null
    const endMs = startMs + durationMinutes * 60_000
    const diffMs = endMs - now
    const overMin = Math.floor(-diffMs / 60_000)
    if (diffMs >= 0) {
      // Still in window. Show "Time left: Xh Ym" (with the hours
      // dropped under 60 min for compactness).
      const totalMin = Math.ceil(diffMs / 60_000)
      const label = totalMin >= 60
        ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
        : `${totalMin}m`
      return { label: `Time left: ${label}`, color: "#ffffff" as const, bg: "rgba(255,255,255,0.08)" as const }
    }
    // Past the planned end.
    const color = overMin >= 15 ? "#fca5a5" : "#fbbf24"
    const bg = overMin >= 15 ? "rgba(239,68,68,0.18)" : "rgba(251,191,36,0.18)"
    return { label: `+${Math.max(1, overMin)}m over`, color, bg }
  })()

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
      {timeChip && (
        <>
          <span style={{ opacity: 0.6 }}>·</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background: timeChip.bg,
              color: timeChip.color,
              textTransform: "none",
              fontWeight: 600,
              letterSpacing: 0,
            }}
            title="Class is running over its scheduled time"
          >
            {timeChip.label}
          </span>
        </>
      )}
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

// ============================================================
// Chat transcript recorder + reader.
//
// Inside the LiveKit room context, `useChat()` exposes the running
// list of chat messages. We render this side-effect-only component
// near the top of the video UI so messages get buffered to
// localStorage as they arrive. The host page reads from the same
// key on End Class and persists to session.chatTranscript.
//
// Storage key: `thebigclass.chatTranscript.v1.<sessionId>` —
// tenant-namespacing isn't needed because session ids are already
// globally unique. Buffer is replaced on every render so duplicate
// messages from re-mounts don't accumulate.
// ============================================================

const CHAT_TRANSCRIPT_KEY = (sessionId: string) =>
  `thebigclass.chatTranscript.v1.${sessionId}`

export interface ChatTranscriptEntry {
  id: string
  fromId?: string
  fromName?: string
  text: string
  sentAt: string
}

/** Reads the buffered chat for a session out of localStorage.
 *  Called by the host page on End Class to persist to the
 *  session record. Returns [] when nothing's been captured. */
export function readChatTranscript(sessionId: string): ChatTranscriptEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CHAT_TRANSCRIPT_KEY(sessionId))
    if (!raw) return []
    const arr = JSON.parse(raw) as ChatTranscriptEntry[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/** Clears the buffer after a successful persist. Keeps localStorage
 *  from accumulating dead transcripts across many ended classes. */
export function clearChatTranscript(sessionId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(CHAT_TRANSCRIPT_KEY(sessionId))
  } catch {
    /* private mode — nothing to clean up */
  }
}

function ChatTranscriptRecorder({ sessionId }: { sessionId: string }) {
  const { chatMessages } = useChat()
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return
    const entries: ChatTranscriptEntry[] = chatMessages.map((m) => ({
      // Use LiveKit's per-message id when present; fall back to a
      // stable composite so duplicates from re-renders dedupe.
      id: (m as { id?: string }).id ?? `${m.from?.identity ?? "anon"}-${m.timestamp}`,
      fromId: m.from?.identity,
      fromName: m.from?.name ?? m.from?.identity,
      text: m.message,
      sentAt: new Date(m.timestamp).toISOString(),
    }))
    try {
      window.localStorage.setItem(CHAT_TRANSCRIPT_KEY(sessionId), JSON.stringify(entries))
    } catch {
      /* quota exceeded — drop silently; the recording itself is the source of truth */
    }
  }, [sessionId, chatMessages])
  return null
}

function RaisedHandsNetworkSync({ sessionId }: { sessionId: string }) {
  const { localParticipant } = useLocalParticipant()

  const { send } = useDataChannel("raised-hands", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      // Ignore our own broadcast unless it's a SYNC_REQUEST from someone else
      if (data.userId === localParticipant.identity && data.type !== "SYNC_REQUEST") return
      
      if (data.type === "SYNC_REQUEST") {
        // Someone joined late and asked for current hands.
        // If our hand is currently raised, we broadcast it so they know.
        const currentHands = readRaisedHands(sessionId)
        const mine = currentHands.find((h) => h.userId === localParticipant.identity)
        if (mine) {
          send(new TextEncoder().encode(JSON.stringify({
            type: "RAISE",
            user: { id: mine.userId, name: mine.name },
            visibility: mine.visibility,
            raisedAt: mine.raisedAt,
            userId: mine.userId,
            sessionId
          })), { reliable: true })
        }
      } else {
        // Someone else's hand changed. Apply to local storage without loop.
        _applyNetworkSync(sessionId, data)
      }
    } catch {}
  })

  // Listen for local changes triggered by OUR actions, and broadcast them
  useEffect(() => {
    if (!sessionId || !localParticipant) return
    const onLocalChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.sessionId !== sessionId) return
      // Add the caller's ID so receivers can ignore echo
      detail.senderId = localParticipant.identity
      send(new TextEncoder().encode(JSON.stringify(detail)), { reliable: true })
    }
    window.addEventListener("tbc-raised-hands-local-change", onLocalChange)
    return () => window.removeEventListener("tbc-raised-hands-local-change", onLocalChange)
  }, [sessionId, send, localParticipant])

  // On mount, broadcast a SYNC_REQUEST so others tell us their hands
  useEffect(() => {
    if (!sessionId || !localParticipant) return
    const timer = setTimeout(() => {
      send(new TextEncoder().encode(JSON.stringify({ type: "SYNC_REQUEST", sessionId, userId: localParticipant.identity })), { reliable: true })
    }, 1000)
    return () => clearTimeout(timer)
  }, [sessionId, send, localParticipant])

  return null
}

function LivePollNetworkSync({ sessionId }: { sessionId: string }) {
  const { localParticipant } = useLocalParticipant()
  const currentPoll = useLivePoll(sessionId)

  const { send } = useDataChannel("live-poll", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      if (data.senderId === localParticipant.identity && data.type !== "POLL_SYNC_REQUEST") return
      
      if (data.type === "POLL_SYNC_REQUEST") {
        if (currentPoll) {
          send(new TextEncoder().encode(JSON.stringify({
            sessionId,
            poll: currentPoll,
            senderId: localParticipant.identity
          })), { reliable: true })
        }
      } else {
        _applyPollNetworkSync(sessionId, data.poll)
      }
    } catch {}
  })

  // Listen for local changes
  useEffect(() => {
    if (!sessionId || !localParticipant) return
    const onLocalChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.sessionId !== sessionId) return
      detail.senderId = localParticipant.identity
      send(new TextEncoder().encode(JSON.stringify(detail)), { reliable: true })
    }
    window.addEventListener("tbc-poll-local-change", onLocalChange)
    return () => window.removeEventListener("tbc-poll-local-change", onLocalChange)
  }, [sessionId, send, localParticipant])

  // Sync request on mount
  useEffect(() => {
    if (!sessionId || !localParticipant) return
    const timer = setTimeout(() => {
      send(new TextEncoder().encode(JSON.stringify({ type: "POLL_SYNC_REQUEST", sessionId, senderId: localParticipant.identity })), { reliable: true })
    }, 1000)
    return () => clearTimeout(timer)
  }, [sessionId, send, localParticipant])

  return null
}
