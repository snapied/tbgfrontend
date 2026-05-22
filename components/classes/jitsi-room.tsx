"use client"

// Embedded Jitsi Meet room.
//
// Drops into the in-class shell as a full-bleed iframe. Owns the video / audio
// surface; the surrounding chrome (header, chat sidebar, control bar) stays in
// the parent layout. We don't try to proxy Jitsi's own controls — they live
// inside the iframe and are toggled via `executeCommand`.

import { useEffect, useRef, useState } from "react"
import { ExternalLink, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  IS_PUBLIC_JITSI,
  JITSI_DOMAIN,
  JITSI_PROTOCOL,
  JITSI_USE_SSL,
  fetchJitsiToken,
  jitsiRoomName,
  jitsiRoomUrl,
  type JitsiTokenUser,
} from "@/lib/jitsi"

// Loose typing for the IFrame API handle. The SDK doesn't ship strict types.
// We only need the two methods we actually call.
export interface JitsiApi {
  executeCommand: (command: string, ...args: unknown[]) => void
  addListener?: (event: string, fn: (...args: unknown[]) => void) => void
  dispose?: () => void
}

interface JitsiRoomProps {
  /** Room code or session id. Get-or-create semantics — same code → same room. */
  roomCode: string
  user: JitsiTokenUser
  /** When true, the user joins as moderator (can mute/kick others on self-host). */
  isHost: boolean
  /** Toolbar buttons to expose inside the iframe. */
  toolbarButtons?: string[]
  onApiReady?: (api: JitsiApi) => void
  onLeft?: () => void
  className?: string
}

const DEFAULT_TOOLBAR = [
  "microphone",
  "camera",
  "desktop",
  "fullscreen",
  "hangup",
  "chat",
  "raisehand",
  "tileview",
  "settings",
]

export function JitsiRoom({
  roomCode,
  user,
  isHost,
  toolbarButtons = DEFAULT_TOOLBAR,
  onApiReady,
  onLeft,
  className,
}: JitsiRoomProps) {
  const [jwt, setJwt] = useState<string | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [launched, setLaunched] = useState(false)
  // Other-participant count comes from Jitsi's IFrame API events. 0 = nobody
  // else is in the room with you (real or perceived); >0 = Jitsi sees the
  // other person and you can debug video/audio from there.
  const [otherCount, setOtherCount] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<JitsiApi | null>(null)
  const roomName = jitsiRoomName(roomCode)

  // Diagnostic: log the EXACT Jitsi room URL once on mount. Both host and
  // student should see the same URL in DevTools — if they differ, that's the
  // smoking gun for "we're in different rooms".
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info(
      `[jitsi] joining ${isHost ? "host" : "guest"} room → ${JITSI_PROTOCOL}://${JITSI_DOMAIN}/${roomName} (input roomCode: "${roomCode}", user: "${user.name}")`,
    )
  }, [roomName, isHost, roomCode, user.name])

  // On public Jitsi (meet.jit.si, ffmuc, framatalk) iframe embedding is either
  // blocked (X-Frame-Options) or moderator-gated. Render a launcher that opens
  // the same room in a new tab — first joiner becomes moderator, no login.
  // When the user moves to JaaS or self-hosted (IS_PUBLIC_JITSI = false), the
  // iframe path takes over automatically — the JWT we mint there carries
  // moderator=true, so the host bypasses any lobby gate.
  if (IS_PUBLIC_JITSI) {
    const url = jitsiRoomUrl(roomCode, user.name)
    return (
      <div className={className}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl bg-card p-8 text-center">
          <Radio className="h-8 w-8 text-primary" />
          <div className="space-y-1">
            <p className="font-serif text-lg font-semibold">
              {launched ? "Class running in a new tab" : isHost ? "Open the class room" : "Join the class"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {launched
                ? "Switch to the Jitsi tab to talk. Close that tab to end the call. You can reopen it anytime — same room."
                : isHost
                  ? "You join as moderator automatically. No login or sign-up. Your students get beamed in the moment they open the join link."
                  : "Click join, allow camera + mic in the next tab. No login required."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              size="lg"
              onClick={() => {
                setLaunched(true)
                onApiReady?.({
                  // Stub for callers expecting an api handle. New-tab mode doesn't
                  // expose Jitsi commands across windows — degrade gracefully.
                  executeCommand: () => undefined,
                  addListener: () => undefined,
                  dispose: () => undefined,
                })
              }}
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {launched ? "Reopen Jitsi tab" : isHost ? "Open class room" : "Join class"}
              </a>
            </Button>
            {launched && onLeft && (
              <Button size="lg" variant="outline" onClick={onLeft}>
                I&apos;m done
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Joining as <span className="font-medium text-foreground">{user.name}</span>
            {isHost ? " (instructor)" : ""}.
          </p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    let cancelled = false

    // Preload external_api.js manually WITHOUT crossorigin="anonymous". The
    // @jitsi/react-sdk sets that attribute on its own script tag, which makes
    // the browser require Access-Control-Allow-Origin on the response. The
    // Jitsi nginx config doesn't send that header by default, so the SDK's
    // load fails with a generic "Script load error". Loading the same URL
    // ourselves with no crossorigin attribute bypasses the CORS check; once
    // window.JitsiMeetExternalAPI is defined globally, the SDK sees it and
    // reuses it instead of trying to load again. The same trick fixes the
    // self-signed-cert + cross-origin combination on local dev.
    const ensureExternalApi = (): Promise<void> =>
      new Promise((resolve, reject) => {
        if (typeof window === "undefined") return resolve()
        if ((window as unknown as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI) {
          return resolve()
        }
        const src = `${JITSI_PROTOCOL}://${JITSI_DOMAIN}/external_api.js`
        const existing = document.querySelector<HTMLScriptElement>(`script[data-jitsi-preload="${src}"]`)
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true })
          existing.addEventListener("error", () => reject(new Error("external_api.js load failed")), { once: true })
          return
        }
        const s = document.createElement("script")
        s.src = src
        s.async = true
        s.dataset.jitsiPreload = src
        s.onload = () => resolve()
        s.onerror = () => reject(new Error("external_api.js load failed"))
        document.head.appendChild(s)
      })

    Promise.all([
      fetchJitsiToken({ roomName, user, moderator: isHost }),
      ensureExternalApi(),
    ])
      .then(([t]) => {
        if (cancelled) return
        setJwt(t ?? undefined)
        setReady(true)
      })
      .catch((e) => {
        if (cancelled) return
        // Surface the failure in the console; the loading card stays up so the
        // user sees something instead of a blank iframe.
        console.error("[JitsiRoom] preload failed", e)
      })

    return () => {
      cancelled = true
    }
  }, [roomName, user.id, user.name, user.email, isHost])

  // Instantiate JitsiMeetExternalAPI directly (rather than via the @jitsi/react-sdk
  // wrapper) so we can pass `noSSL: true` when we're targeting a local HTTP
  // Jitsi at http://localhost:8000 — otherwise the SDK forces HTTPS and the
  // iframe URL points at https://localhost:8443 (untrusted self-signed cert).
  useEffect(() => {
    if (!ready) return
    if (typeof window === "undefined") return
    const ExternalAPI = (window as unknown as { JitsiMeetExternalAPI?: new (domain: string, opts: Record<string, unknown>) => JitsiApi })
      .JitsiMeetExternalAPI
    if (!ExternalAPI || !containerRef.current) return

    // Clear any previous iframe before re-mounting (Strict Mode double-effect, jwt change, etc).
    containerRef.current.innerHTML = ""

    const api = new ExternalAPI(JITSI_DOMAIN, {
      roomName,
      jwt,
      parentNode: containerRef.current,
      width: "100%",
      height: "100%",
      noSSL: !JITSI_USE_SSL,
      userInfo: { displayName: user.name, email: user.email ?? "" },
      configOverwrite: {
        prejoinPageEnabled: false,
        prejoinConfig: { enabled: false },
        requireDisplayName: false,
        disableProfile: true,
        startWithAudioMuted: !isHost,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        enableClosePage: false,
        hideConferenceTimer: false,
        hideConferenceSubject: true,
        disableInviteFunctions: true,
        enableInsecureRoomNameWarning: false,
        disable1On1Mode: false,
        startTileView: false,
        disableTileEnlargement: false,
        toolbarButtons,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        MOBILE_APP_PROMO: false,
        JITSI_WATERMARK_LINK: "",
        BRAND_WATERMARK_LINK: "",
        HIDE_INVITE_MORE_HEADER: true,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
        DEFAULT_BACKGROUND: "#0b0c0e",
        DEFAULT_LOCAL_DISPLAY_NAME: user.name || "Guest",
        DEFAULT_REMOTE_DISPLAY_NAME: "Participant",
        APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Live class",
        NATIVE_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Live class",
        PROVIDER_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Live class",
      },
    })

    apiRef.current = api

    // Style the iframe the SDK injects so it fills the container.
    queueMicrotask(() => {
      const iframe = containerRef.current?.querySelector("iframe")
      if (iframe) {
        iframe.style.width = "100%"
        iframe.style.height = "100%"
        iframe.style.border = "0"
      }
    })

    if (api.addListener) {
      if (onLeft) {
        api.addListener("videoConferenceLeft", () => onLeft())
        api.addListener("readyToClose", () => onLeft())
      }
      api.addListener("participantJoined", () => {
        setOtherCount((c) => {
          console.info("[jitsi] another participant joined → count =", c + 1)
          return c + 1
        })
      })
      api.addListener("participantLeft", () => {
        setOtherCount((c) => Math.max(0, c - 1))
      })
      api.addListener("videoConferenceJoined", () => {
        console.info("[jitsi] videoConferenceJoined (we're now in the room)")
      })
    }
    onApiReady?.(api)

    return () => {
      try {
        api.dispose?.()
      } catch {}
      apiRef.current = null
    }
    // We intentionally omit toolbarButtons / callbacks so we don't re-mount the
    // iframe on every parent re-render — those values are captured at first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, jwt, roomName, isHost, user.id, user.name, user.email])

  if (!ready) {
    return (
      <div className={className} aria-busy>
        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black/40 text-xs text-white/60">
          Connecting to room…
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ position: "relative" }}>
      {/* Diagnostic badge — both host and student should show the SAME
          text here. If they differ, you're in different Jitsi rooms.
          Remove once you're happy the sync is solid. */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 5,
          padding: "4px 10px",
          borderRadius: 6,
          background: "rgba(15, 23, 42, 0.85)",
          color: "white",
          fontSize: 10,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <span>{JITSI_PROTOCOL}://{JITSI_DOMAIN} · {roomName}</span>
        <span style={{ opacity: 0.75 }}>
          {isHost ? "host" : "guest"} · others here: {otherCount}
        </span>
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
