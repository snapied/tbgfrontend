"use client"

// "Open in ChatGPT / Open in Claude" — the Apidog-style affordance for
// help docs. Each button opens the assistant's web app with a SHORT
// prompt pre-filled in the URL query, so the reader can immediately ask
// questions about the doc they're looking at.
//
//   • ChatGPT — https://chatgpt.com/?q=<prompt>     The `q` param
//     pre-fills the composer.
//   • Claude  — https://claude.ai/new?q=<prompt>    The `q` param
//     pre-fills a new chat's composer.
//
// IMPORTANT: the deep-link query must stay small. chatgpt.com /
// claude.ai reject an over-long URL with HTTP 431 (Request Header
// Fields Too Large), and encodeURIComponent roughly triples the byte
// count. So the URL carries only `urlPrompt` (instruction + title +
// lede + link), while the FULL article text rides the Copy button via
// `copyPrompt`. Both strings are built in lib/help-llm-prompt.ts (a
// plain module, so server components can build them too).
//
// No API key, no backend — just deep links + clipboard.

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { clampForUrl } from "@/lib/help-llm-prompt"

function openWith(base: string, urlPrompt: string) {
  // Defensive clamp again at click time — even if a caller forgets,
  // the link can never grow long enough to 431.
  const q = clampForUrl(urlPrompt)
  const sep = base.includes("?") ? "&" : "?"
  window.open(`${base}${sep}q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer")
}

export function OpenInLLM({
  urlPrompt,
  copyPrompt,
  label = "Ask AI about this:",
  className,
  size = "sm",
}: {
  /** Short prompt placed in the assistant's `?q=` deep link. */
  urlPrompt: string
  /** Full prompt copied to the clipboard (no length limit). Defaults to
   *  urlPrompt when a caller has nothing longer to offer. */
  copyPrompt?: string
  label?: string
  className?: string
  size?: "sm" | "default"
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyPrompt ?? urlPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be blocked (insecure context / permissions). Fall
      // back to a no-op rather than throwing in the UI.
    }
  }

  return (
    <div className={className}>
      <span className="mr-1 hidden text-xs font-medium text-muted-foreground sm:inline">
        {label}
      </span>
      <div className="inline-flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={() => openWith("https://chatgpt.com/", urlPrompt)}
        >
          <ChatGptIcon className="mr-1.5 h-4 w-4" />
          Open in ChatGPT
        </Button>
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={() => openWith("https://claude.ai/new", urlPrompt)}
        >
          <ClaudeIcon className="mr-1.5 h-4 w-4" />
          Open in Claude
        </Button>
        <Button
          type="button"
          variant="ghost"
          size={size}
          onClick={copy}
          aria-label="Copy the full article as a prompt for any AI tool"
          title="Copy as prompt"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Brand glyphs. Drawn with currentColor so they inherit the button's
// text color (and recolour in dark mode) instead of shipping raster
// assets. Marks are simplified, recognisable silhouettes.
function ChatGptIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A5.98 5.98 0 0 0 10.6.02 6.05 6.05 0 0 0 4.84 4.2 5.98 5.98 0 0 0 .86 7.1a6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .52 4.9 6.05 6.05 0 0 0 6.51 2.9A5.98 5.98 0 0 0 13.4 23.98a6.05 6.05 0 0 0 5.77-4.2 5.98 5.98 0 0 0 3.98-2.9 6.05 6.05 0 0 0-.74-7.06zM13.4 22.43a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.78.78 0 0 0 .4-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.5 4.5zM3.74 18.3a4.48 4.48 0 0 1-.54-3.01l.14.08 4.78 2.76a.78.78 0 0 0 .78 0l5.84-3.37v2.33a.07.07 0 0 1-.03.06l-4.83 2.79a4.5 4.5 0 0 1-6.14-1.64zM2.48 7.88a4.48 4.48 0 0 1 2.35-1.97v5.68a.78.78 0 0 0 .39.68l5.84 3.37-2.02 1.17a.07.07 0 0 1-.07 0l-4.83-2.79a4.5 4.5 0 0 1-1.65-6.14zm16.6 3.86l-5.84-3.38 2.02-1.16a.07.07 0 0 1 .07 0l4.83 2.78a4.5 4.5 0 0 1-.68 8.12V12.4a.78.78 0 0 0-.4-.67zm2.01-3.03l-.14-.09-4.78-2.76a.78.78 0 0 0-.78 0L9.55 9.23V6.9a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.45 12.85l-2.02-1.16a.07.07 0 0 1-.04-.06V6.06a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.78 2.76a.78.78 0 0 0-.4.68zm1.1-2.37l2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z" />
    </svg>
  )
}

function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4.7 15.55l4.16-2.34.07-.2-.07-.11h-.2l-.7-.05-2.36-.06-2.05-.09-1.98-.1-.5-.11L0 11.79l.05-.31.42-.28.6.05 1.33.09 2 .14 1.45.08 2.15.23h.34l.05-.14-.12-.08-.09-.09-2.13-1.44-2.3-1.53-1.21-.88-.65-.44-.33-.42-.14-.91.59-.65.79.05.2.06.8.62 1.72 1.33 2.24 1.65.33.27.13-.09.02-.07-.15-.25-1.22-2.2-1.3-2.24-.58-.93-.15-.56a2.7 2.7 0 0 1-.1-.66l.68-.92L6 .47l.9.12.38.33.56 1.27 .9 2.02 1.41 2.74.41.81.22.75.08.23h.14V9.9l.12-1.56.21-1.91.2-2.46.08-.7.32-.77.64-.42.5.24.4.59-.06.38-.24 1.55-.46 2.41-.3 1.62h.17l.2-.2.81-1.07 1.36-1.7.6-.68.7-.74.45-.36h.85l.63.93-.28.96-.88 1.11-.73.94-1.04 1.41-.65 1.12.06.09.16-.02 2.4-.5 1.3-.24 1.55-.27.7.33.08.33-.28.68-1.66.4-1.95.4-2.9.68-.04.03.04.05 1.3.12.56.03h1.37l2.54.19.67.44.4.54-.07.41-1.02.52-1.38-.33-3.23-.77-1.1-.27h-.16v.1l.93.9 1.7 1.54 2.13 1.98.1.49-.27.39-.29-.04-1.86-1.4-.72-.63-1.62-1.37h-.11v.15l.38.55 1.97 2.96.1.9-.14.3-.51.18-.56-.1-1.15-1.62-1.19-1.82-.96-1.63-.12.07-.57 6.07-.27.31-.61.24-.51-.39-.27-.63.27-1.23.32-1.6.26-1.28.24-1.58.14-.53-.01-.04-.12.02-1.2 1.65-1.83 2.47-1.45 1.55-.35.14-.6-.31.06-.56.34-.5 2-2.54.41-.54v-.28h-.05L4.74 19.5l-1.27.16-.55-.51.07-.84.26-.27 2.16-1.49z" />
    </svg>
  )
}
