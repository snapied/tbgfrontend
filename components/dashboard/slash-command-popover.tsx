"use client"

// Slash-command popover for the community composer (C7).
//
// Shipped as a popover-from-button rather than a Tiptap suggestion
// plugin to avoid pulling in @tiptap/suggestion as a new dependency.
// The author clicks a "/" trigger next to the toolbar; a command
// palette opens with 8 inserts. Each command uses the editor ref
// the parent already holds (via onReady) to apply the change.
//
// Future upgrade: wrap the same commands in a Tiptap suggestion
// extension keyed to the literal "/" character. The command list
// below is the source of truth either way.

import { useMemo, useState } from "react"
import { type Editor } from "@tiptap/react"
import {
  AtSign,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Slash,
  Type,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SlashCommand {
  id: string
  label: string
  hint: string
  keywords: string[]
  icon: React.ElementType
  run: (editor: Editor) => void
}

const COMMANDS: SlashCommand[] = [
  {
    id: "heading-2", label: "Big heading", hint: "Section title",
    keywords: ["h2", "heading", "title", "big"],
    icon: Heading2,
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading-3", label: "Small heading", hint: "Sub-section",
    keywords: ["h3", "subheading", "sub"],
    icon: Heading3,
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet-list", label: "Bullet list", hint: "• one per line",
    keywords: ["bullets", "ul", "list"],
    icon: List,
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list", label: "Numbered list", hint: "1. 2. 3.",
    keywords: ["ol", "numbered", "ordered"],
    icon: ListOrdered,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "quote", label: "Quote", hint: "Block quote",
    keywords: ["blockquote", "quote", "cite"],
    icon: Quote,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code-block", label: "Code block", hint: "```",
    keywords: ["code", "snippet", "monospace", "pre"],
    icon: Code,
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider", label: "Divider", hint: "Horizontal rule",
    keywords: ["hr", "divider", "rule", "line"],
    icon: Minus,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "link", label: "Link", hint: "Add a hyperlink",
    keywords: ["link", "url", "href"],
    icon: LinkIcon,
    run: (e) => {
      const url = window.prompt("URL")?.trim()
      if (!url) return
      e.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    },
  },
  {
    id: "image", label: "Image URL", hint: "Embed an image",
    keywords: ["image", "img", "picture"],
    icon: ImageIcon,
    run: (e) => {
      const src = window.prompt("Image URL")?.trim()
      if (!src) return
      e.chain().focus().setImage({ src }).run()
    },
  },
  {
    id: "mention-cue", label: "@-mention cue", hint: "Inserts an @",
    keywords: ["mention", "tag", "@"],
    icon: AtSign,
    run: (e) => e.chain().focus().insertContent("@").run(),
  },
  {
    id: "paragraph", label: "Plain paragraph", hint: "Reset to body text",
    keywords: ["text", "paragraph", "p"],
    icon: Type,
    run: (e) => e.chain().focus().setParagraph().run(),
  },
]

interface Props {
  /** The Tiptap editor instance held by the parent composer. */
  editor: Editor | null
  /** Optional custom trigger; defaults to a slash-icon button. */
  trigger?: React.ReactNode
}

export function SlashCommandPopover({ editor, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.hint.toLowerCase().includes(q) ||
      c.keywords.some((k) => k.includes(q)),
    )
  }, [query])

  function run(cmd: SlashCommand) {
    if (!editor) return
    cmd.run(editor)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery("") }}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            disabled={!editor}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            title="Insert block — / commands"
            aria-label="Slash commands"
          >
            <Slash className="h-3 w-3" />
            Insert
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-border/60 p-2">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Type a command — "list", "code", "link"…'
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) {
                e.preventDefault()
                run(filtered[0])
              }
              if (e.key === "Escape") setOpen(false)
            }}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12.5px] outline-none focus:border-primary"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">No commands match.</li>
          ) : (
            filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => run(c)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <c.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold">{c.label}</span>
                    <span className="block text-[10.5px] text-muted-foreground">{c.hint}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="border-t border-border/60 px-2 py-1.5 text-[10px] text-muted-foreground">
          Tip: <kbd className="rounded border border-border bg-muted px-1 font-mono">↵</kbd> picks the top match.
        </p>
      </PopoverContent>
    </Popover>
  )
}
