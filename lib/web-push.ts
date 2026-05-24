"use client"

// Web Push primitive — Sprint C Communities #48.
//
// Lightweight client wrapper around the W3C Push API + Service
// Worker registration. Powers the eventual "ping me on my phone
// when someone mentions me in a community" flow. This file does the
// browser-side dance; server-side VAPID + send is a backend
// concern (see comments below for the contract).
//
// Why ship the client primitive without a server today:
//   • Push permission UX is the hard human bit. Once a user
//     subscribes, the server can fan messages in via the existing
//     buildNotifications dispatcher whenever we wire that up.
//   • Keeps the surface tested + the subscription endpoint stable.
//
// Browser support: Chrome / Firefox / Edge / Safari 16.4+. We
// detect lack of support and short-circuit — never crash.
//
// Permission states we surface:
//   "unsupported"  — browser has no PushManager
//   "default"      — user hasn't decided yet
//   "granted"      — subscribed (or ready to)
//   "denied"       — user said no; can't re-prompt without manual
//                    re-enable in browser settings
//
// Storage: we cache the latest known PushSubscription JSON in
// localStorage so the dashboard can show "you're subscribed on
// this device" without round-tripping to the server.

import { useCallback, useEffect, useState } from "react"

const SUBSCRIPTION_CACHE_KEY = "thebigclass.webpush.subscription.v1"
const VAPID_PUBLIC_KEY_META = "vidyanxt-vapid-public-key"

export type WebPushState = "unsupported" | "default" | "granted" | "denied"

interface UseWebPushApi {
  state: WebPushState
  subscription: PushSubscription | null
  /** Trigger the permission prompt + subscribe. Returns the new
   *  subscription on success, null on failure / unsupported. */
  enable: () => Promise<PushSubscription | null>
  /** Unsubscribe — flips the permission to "default" from our app's
   *  point of view; the browser-side permission stays until the
   *  user clears it in browser settings. */
  disable: () => Promise<boolean>
}

function readCached(): PushSubscription | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SUBSCRIPTION_CACHE_KEY)
    if (!raw) return null
    // We can't reconstruct a PushSubscription instance from JSON —
    // but the consumer typically only needs the endpoint + keys to
    // send a test push or display "subscribed" state. We return a
    // structural impostor that's good enough for that.
    const parsed = JSON.parse(raw) as PushSubscriptionJSON
    return parsed as unknown as PushSubscription
  } catch {
    return null
  }
}

function writeCached(sub: PushSubscription | null): void {
  if (typeof window === "undefined") return
  try {
    if (sub) {
      window.localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(sub.toJSON()))
    } else {
      window.localStorage.removeItem(SUBSCRIPTION_CACHE_KEY)
    }
  } catch {
    /* best-effort */
  }
}

/** Read the public VAPID key from the document meta tag. The server
 *  injects it at SSR (or we ship it at build time as NEXT_PUBLIC_*).
 *  Returning null short-circuits subscribe() with a clean error
 *  instead of a confusing low-level browser exception. */
function getVapidKey(): Uint8Array | null {
  if (typeof window === "undefined") return null
  const meta = document
    .querySelector<HTMLMetaElement>(`meta[name="${VAPID_PUBLIC_KEY_META}"]`)
    ?.content
  const env = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
  const key = env || meta
  if (!key) return null
  // VAPID key is base64-url-encoded; convert to the Uint8Array the
  // Push API wants.
  try {
    const padded = key + "=".repeat((4 - (key.length % 4)) % 4)
    const b64 = padded.replace(/-/g, "+").replace(/_/g, "/")
    const raw = atob(b64)
    const out = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

export function useWebPush(): UseWebPushApi {
  const [state, setState] = useState<WebPushState>("default")
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  // Detect support + load existing state once on mount. The Push API
  // permission is global per origin, so we don't need to re-check
  // on every render. We do refresh on visibilitychange so a user
  // who toggled permissions in another tab sees the right state on
  // return.
  useEffect(() => {
    let cancelled = false
    const detect = async () => {
      if (typeof window === "undefined") return
      if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
        if (!cancelled) setState("unsupported")
        return
      }
      const perm = Notification.permission
      if (cancelled) return
      setState(perm === "default" ? "default" : (perm as WebPushState))
      // Pick up an existing subscription from the SW registration.
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = (await reg?.pushManager.getSubscription()) ?? null
        if (cancelled) return
        if (sub) {
          setSubscription(sub)
          writeCached(sub)
        } else {
          const cached = readCached()
          if (cached) setSubscription(cached)
        }
      } catch {
        /* private mode / no SW — fall back to cached state */
        const cached = readCached()
        if (cached) setSubscription(cached)
      }
    }
    void detect()
    const onVis = () => {
      if (document.visibilityState === "visible") void detect()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [])

  const enable = useCallback(async (): Promise<PushSubscription | null> => {
    if (typeof window === "undefined") return null
    if (state === "unsupported") return null
    const vapid = getVapidKey()
    if (!vapid) {
      // No key configured — surface as denied so callers don't
      // re-prompt forever. Configuration is a one-time admin task.
      // eslint-disable-next-line no-console
      console.warn("[web-push] No VAPID public key — set NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY or inject a meta tag.")
      return null
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission as WebPushState)
        return null
      }
      setState("granted")
      // Ensure the service worker is registered (caller's app
      // should already have done this on load; we no-op if so).
      const reg =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/service-worker.js"))
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapid,
      })
      setSubscription(sub)
      writeCached(sub)
      // Hand the subscription to the backend so future
      // notifications can fan in via Web Push. The endpoint is a
      // simple POST that stores the subscription against the
      // current user; the dispatcher reads it back when sending.
      try {
        await fetch("/api/notifications/web-push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        })
      } catch {
        /* network — silent; the local cache still works so the UI
           shows "subscribed". A re-sync runs from the dashboard
           on next reload. */
      }
      return sub
    } catch {
      return null
    }
  }, [state])

  const disable = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      setSubscription(null)
      writeCached(null)
      try {
        await fetch("/api/notifications/web-push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub?.toJSON() ?? {}),
        })
      } catch {
        /* network — silent */
      }
      return true
    } catch {
      return false
    }
  }, [])

  return { state, subscription, enable, disable }
}
