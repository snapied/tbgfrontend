// Prompt builders for the "Open in ChatGPT / Claude" help affordance.
//
// Plain module — NO "use client" — so a server component (the article
// page) can call these and pass the resulting strings to the client
// <OpenInLLM> as props. (A client-only export called from the server
// throws "can't invoke a client function from the server".)
//
// Two prompts per surface, because the two destinations have very
// different size budgets:
//
//   • urlPrompt  — goes in the assistant's `?q=` deep link. Kept SHORT
//     and clamped, because chatgpt.com / claude.ai reject an over-long
//     query with HTTP 431 (the encoded URL exceeds the server's header
//     limit). It carries the instruction + title + lede + a link back
//     to the article — enough to start the conversation.
//   • copyPrompt — goes to the clipboard via the Copy button. Carries
//     the FULL article text (or the full docs table of contents), since
//     the clipboard has no length limit.

// Conservative cap on the ENCODED query length. encodeURIComponent can
// roughly triple a string (every space → %20, every newline → %0A), and
// browsers / the assistant servers start refusing somewhere around a few
// KB. 1800 encoded chars keeps the whole URL comfortably under typical
// 8 KB request-header limits with room for the origin + path.
const MAX_URL_QUERY = 1800

// Defensive backstop: if a urlPrompt is somehow still too long once
// encoded, shrink it (by raw length, measured against the encoded size)
// and add an ellipsis rather than emit a link that 431s.
export function clampForUrl(prompt: string): string {
  if (encodeURIComponent(prompt).length <= MAX_URL_QUERY) return prompt
  let lo = 0
  let hi = prompt.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (encodeURIComponent(prompt.slice(0, mid)).length <= MAX_URL_QUERY) lo = mid
    else hi = mid - 1
  }
  return prompt.slice(0, lo).trimEnd() + "…"
}

export interface LlmPrompts {
  urlPrompt: string
  copyPrompt: string
}

// Per-article prompts. `lede` is the one-line summary; `body` is the
// full plain-text article (used only for Copy).
export function articlePrompts(opts: {
  title: string
  lede: string
  body: string
  url: string
}): LlmPrompts {
  const urlPrompt =
    `I'm reading "${opts.title}" in The Big Class help docs (${opts.url}). ` +
    `Please open it and help me — answer my questions about it, summarise ` +
    `it, or walk me through the steps.\n\n${opts.lede}`

  const copyPrompt =
    `I'm reading a help article from The Big Class (an online teaching ` +
    `platform). Please help me with it — answer my questions, summarise ` +
    `it, or walk me through the steps.\n\n` +
    `Article: "${opts.title}"\n` +
    `Source: ${opts.url}\n\n` +
    `--- ARTICLE ---\n${opts.body}\n--- END ARTICLE ---`

  return { urlPrompt: clampForUrl(urlPrompt), copyPrompt }
}

// Docs-index prompts. The URL form stays short (just points the
// assistant at the docs home); the Copy form carries the full table of
// contents so a reader can paste it and ask "which guide covers X?".
export function docsIndexPrompts(
  tableOfContents: { title: string; body: string; href: string }[],
  docsHome = "https://thebigclass.com/help",
): LlmPrompts {
  const urlPrompt =
    `I'm using The Big Class (an online teaching platform). Browse their ` +
    `help docs at ${docsHome} and help me find the right guide for my ` +
    `question, then answer it.`

  const lines = tableOfContents.map(
    (t) => `- ${t.title} (https://thebigclass.com${t.href}): ${t.body}`,
  )
  const copyPrompt =
    `I'm using The Big Class (an online teaching platform). Here is the ` +
    `table of contents of their help docs. Help me find the right guide ` +
    `for my question, and answer it if you can.\n\n` +
    `Docs home: ${docsHome}\n\n${lines.join("\n")}`

  return { urlPrompt: clampForUrl(urlPrompt), copyPrompt }
}
