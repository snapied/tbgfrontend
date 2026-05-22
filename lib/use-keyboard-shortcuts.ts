"use client"

// Lightweight keyboard-shortcut hook with two flavours of binding:
//
//   • Single key:        "/"  → focus search input
//                        "?"  → open shortcut overlay
//                        "n"  → context-aware "new"
//
//   • Sequence (Gmail-style "g then h"):
//                        "g h" → go home
//                        "g q" → go to quizzes
//
// Design notes:
//   • Skips when the user is typing in an input, textarea, contenteditable,
//     or any focused field that produces typing — otherwise pressing "n"
//     inside the search box would whisk them off to /new.
//   • A shortcut is captured ONLY when no modifier keys (Ctrl/Cmd/Alt) are
//     held. Browser shortcuts (Cmd+T, Cmd+L) stay untouched.
//   • Sequences have a 1.2 s window: press the second key within that or
//     the buffer resets. Matches the muscle memory most apps use.
//   • Multiple useKeyboardShortcuts instances stack — the layout binds
//     global shortcuts, individual pages bind page-local ones. Each
//     instance gets its own listener; order doesn't matter because every
//     handler stops propagation only via preventDefault on its own match.

import { useEffect, useRef } from "react"

export interface KeyboardShortcut {
  /** Either a single key ("n", "/") or a space-separated sequence ("g h"). */
  keys: string
  /** Group name shown in the overlay (e.g. "Navigation", "Actions"). */
  group?: string
  /** Human-readable description rendered in the overlay. */
  description: string
  /** Fires when the shortcut matches. */
  handler: (e: KeyboardEvent) => void
  /** When true (default), allow the shortcut even if the active element is
   *  a form field. Most shortcuts are false; "Escape" or modifier combos
   *  are the typical exceptions. */
  allowInFormField?: boolean
}

const SEQUENCE_WINDOW_MS = 1200

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  const tag = t.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (t.isContentEditable) return true
  // Some custom editors (tiptap, excalidraw) put role="textbox" on a
  // <div> — guard against those too.
  if (t.getAttribute("role") === "textbox") return true
  return false
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true,
): void {
  // Stable ref so handlers see the latest list without re-binding the
  // document listener on every render (callers usually inline-create the
  // array, which would otherwise churn the effect every paint).
  const ref = useRef(shortcuts)
  ref.current = shortcuts

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    let buffer: string[] = []
    let bufferAt = 0

    const onKey = (e: KeyboardEvent) => {
      // Bail on modifier keys — they belong to the OS / browser.
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const typing = isTypingTarget(e.target)
      const key = e.key

      // Allow Escape and the help overlay key to fall through to handlers
      // tagged as allowInFormField — closing the overlay from inside a
      // focused input is important.
      const candidates = ref.current.filter((s) =>
        typing ? s.allowInFormField === true : true,
      )
      if (candidates.length === 0) return

      // Try single-key shortcuts first. We match the literal `e.key`
      // (case-sensitive for "?", "/"; case-insensitive for letters).
      for (const s of candidates) {
        if (s.keys.includes(" ")) continue // sequence — handled below
        if (matchesSingle(s.keys, key)) {
          e.preventDefault()
          s.handler(e)
          buffer = []
          return
        }
      }

      // Sequence matching. Buffer accumulates printable single-character
      // keys; non-printable keys (Shift, Tab, …) and the modifier-only
      // events have already been filtered out.
      if (key.length === 1) {
        const now = Date.now()
        if (now - bufferAt > SEQUENCE_WINDOW_MS) buffer = []
        buffer.push(key.toLowerCase())
        bufferAt = now

        for (const s of candidates) {
          if (!s.keys.includes(" ")) continue
          const seq = s.keys.toLowerCase().split(/\s+/)
          // Look at the tail of the buffer matching the sequence length.
          const tail = buffer.slice(-seq.length)
          if (tail.length === seq.length && tail.every((k, i) => k === seq[i])) {
            e.preventDefault()
            s.handler(e)
            buffer = []
            return
          }
        }

        // Cap buffer at 8 keys so it doesn't grow unbounded.
        if (buffer.length > 8) buffer = buffer.slice(-8)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled])
}

function matchesSingle(spec: string, key: string): boolean {
  // Case-sensitive for punctuation ("?", "/"); case-insensitive for letters
  // so Caps Lock doesn't break anything.
  if (spec.length === 1 && /[a-z]/i.test(spec)) {
    return spec.toLowerCase() === key.toLowerCase()
  }
  return spec === key
}
