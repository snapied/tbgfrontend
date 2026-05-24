"use client"

// Shared rich-text editor for course descriptions, module descriptions,
// lesson "article" content, discussion posts, and anywhere else a teacher
// would write long-form prose. Built on Tiptap (ProseMirror) because it's
// headless, MIT, ships with a YouTube embed extension out of the box, and
// composes well with our existing shadcn UI.
//
// Contract:
//   - Controlled string of HTML (`value` / `onChange(html)`).
//   - Stable identity — content is only re-set from `value` when the
//     incoming HTML differs from the editor's current HTML, so typing
//     doesn't lose the caret.
//   - Image uploads route through the existing uploadAsset() helper so
//     a backend or data-URL fallback works the same as everywhere else
//     in the app.
//
// What renders the saved HTML on the public side: any container with the
// `.tiptap-content` class picks up the prose styles defined in
// app/globals.css.

import { useCallback, useEffect } from "react"
import { useEditor, EditorContent, type Editor, Extension } from "@tiptap/react"
import { Plugin } from "@tiptap/pm/state"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Youtube from "@tiptap/extension-youtube"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Undo,
  Youtube as YoutubeIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadAsset } from "@/lib/upload-asset"
import { toast } from "sonner"

// Custom Tiptap extension that lets a teacher paste OR drag-and-drop an
// image straight into the editor. Without this, ProseMirror's default
// handling treats clipboard images as inert HTML and drops them entirely.
//
// On paste: walks `clipboardData.items` for any `image/*` MIME type
//   (covers screenshots from Cmd-Shift-4, Slack copies, screenshot tools).
// On drop: walks `dataTransfer.files` for image files.
//
// In both cases the file is sent through `uploadAsset()` — same path the
// toolbar button uses — and the resulting URL gets inserted as a real
// <img> node. While the upload is in flight we insert a transient data:
// URL so the image appears immediately and isn't lost if the upload
// errors; once the upload resolves we replace it with the canonical URL.
type UploadFolderType = import("@/lib/upload-asset").UploadFolder
const makeImagePasteDrop = (folder: UploadFolderType) => Extension.create({
  name: "imagePasteDrop",
  addProseMirrorPlugins() {
    const handleFile = (view: import("@tiptap/pm/view").EditorView, file: File, posOverride?: number) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        // Insert the data URL immediately so the user sees the image right
        // away. We keep the inserted position so we can swap it with the
        // uploaded URL once the upload resolves.
        const pos = posOverride ?? view.state.selection.from
        const node = view.state.schema.nodes.image.create({ src: dataUrl })
        view.dispatch(view.state.tr.insert(pos, node))
        // Now try to upload; on success, replace the inline data URL with
        // the served URL so the saved HTML stays small.
        uploadAsset(file, folder).then(({ url }) => {
          // Find the image node we just inserted by walking from `pos`.
          const { state, dispatch } = view
          state.doc.descendants((n, p) => {
            if (n.type.name === "image" && n.attrs.src === dataUrl) {
              dispatch(state.tr.setNodeMarkup(p, undefined, { ...n.attrs, src: url }))
              return false
            }
            return true
          })
        }).catch(() => {
          // Upload failed — leave the data URL. It still works, just bloats
          // the saved HTML. Better than losing the image entirely.
        })
      }
      reader.readAsDataURL(file)
    }
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const items = Array.from(event.clipboardData?.items ?? [])
            const imageItem = items.find((i) => i.type.startsWith("image/"))
            if (!imageItem) return false
            const file = imageItem.getAsFile()
            if (!file) return false
            event.preventDefault()
            handleFile(view, file)
            return true
          },
          handleDrop(view, event) {
            const files = Array.from(event.dataTransfer?.files ?? [])
            const imageFile = files.find((f) => f.type.startsWith("image/"))
            if (!imageFile) return false
            event.preventDefault()
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
            handleFile(view, imageFile, coords?.pos)
            return true
          },
        },
      }),
    ]
  },
})

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  // Approx min editor body height (px). Helps fields not feel cramped on
  // tall pages without forcing a single height everywhere.
  minHeight?: number
  disabled?: boolean
  // When true, swaps the border to the destructive colour so the editor
  // can show a validation error the same way a shadcn <Input> does.
  error?: boolean
  // R2 folder for inline image uploads inside the editor. Pass "blog" from
  // the blog editor, "courses" from the course description field, etc.
  folder?: import("@/lib/upload-asset").UploadFolder
  // Fires once the Tiptap editor is ready. Lets the parent call commands
  // like `editor.commands.insertContent(...)` for things like mention
  // insertion that have to land at the current caret rather than being
  // appended to the value blob. Called again with null on unmount.
  onReady?: (editor: Editor | null) => void
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 180,
  disabled,
  error,
  folder = "general",
  onReady,
}: Props) {
  const editor = useEditor({
    // SSR-safe — Tiptap throws if it tries to access DOM during a server
    // render. Setting `immediatelyRender: false` defers mount to the client.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // We render headings starting at H2 — H1 is reserved for page
        // titles to keep the document outline coherent for screen readers
        // and SEO. Limiting the toolbar reinforces that.
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        // openOnClick stays off so clicking a link in the editor doesn't
        // navigate the author away from their work.
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      Image.configure({
        // Allow pasted base64 / data URLs so users can paste screenshots.
        allowBase64: true,
      }),
      Youtube.configure({
        // Privacy-enhanced mode so embeds don't drop tracking cookies
        // until the viewer plays the video.
        nocookie: true,
        modestBranding: true,
        controls: true,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start writing…",
      }),
      makeImagePasteDrop(folder),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        // .tiptap-content carries the prose styles; .tiptap is Tiptap's
        // own root class — keep both so external CSS can target either.
        class: cn(
          "tiptap tiptap-content focus:outline-none px-3 py-2.5",
          "prose-tiptap",
        ),
        style: `min-height: ${minHeight}px`,
      },
    },
  })

  // Sync external value changes back into the editor (e.g. a "reset to
  // saved" button, or initial async load). Only re-set when the HTML
  // genuinely differs — otherwise we'd nuke the caret on every keystroke.
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false })
    }
  }, [value, editor])

  // Surface the editor instance to the parent once it's ready. Lets
  // callers run commands (insertContent, focus, etc) without reaching
  // into Tiptap internals themselves.
  useEffect(() => {
    onReady?.(editor)
    return () => onReady?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  if (!editor) {
    // Lightweight placeholder before the editor mounts on the client —
    // keeps page layout stable so there's no jump.
    return (
      <div
        className={cn(
          "rounded-md border ",
          error ? "border-destructive" : "border-input",
          className,
        )}
        style={{ minHeight: minHeight + 44 /* toolbar */ }}
        aria-hidden
      />
    )
  }

  return (
    <div
      className={cn(
        // Default + focus surfaces match Input/Textarea — transparent
        // when idle so the field inherits its card, pure-white on
        // focus (bg-card = oklch(1 0 0)) so the active editor pops
        // out of any cream/muted parent.
        "overflow-hidden rounded-md border bg-transparent transition-[background-color] focus-within:bg-card focus-within:ring-2",
        error
          ? "border-destructive focus-within:ring-destructive/30"
          : "border-input focus-within:ring-ring/30",
        disabled && "opacity-60",
        className,
      )}
    >
      <Toolbar editor={editor} disabled={!!disabled} folder={folder} />
      <EditorContent editor={editor} />
    </div>
  )
}

// ---------- Toolbar ----------

function Toolbar({ editor, disabled, folder }: { editor: Editor; disabled: boolean; folder: import("@/lib/upload-asset").UploadFolder }) {
  // Prompt for a link URL, then set or unset based on selection state.
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL (leave blank to remove)", prev ?? "https://")
    if (url === null) return
    const trimmed = url.trim()
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run()
  }, [editor])

  // Image picker — opens the OS file picker directly. Instructors can also
  // paste / drag-drop images straight into the editor (handled by the
  // ImagePasteDrop extension above), and a remote URL still works via
  // the shift-click branch.
  const insertImage = useCallback((opts: { fromUrl?: boolean } = {}) => {
    if (opts.fromUrl) {
      const url = window.prompt("Image URL")
      if (!url) return
      editor.chain().focus().setImage({ src: url.trim() }).run()
      return
    }
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const { url: uploadedUrl } = await uploadAsset(file, folder)
        editor.chain().focus().setImage({ src: uploadedUrl }).run()
      } catch (err) {
        toast.error(`Image upload failed: ${(err as Error).message}`)
      }
    }
    input.click()
  }, [editor])

  const insertYoutube = useCallback(() => {
    const url = window.prompt("YouTube URL")
    if (!url) return
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run()
  }, [editor])

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background p-1"
      role="toolbar"
      aria-label="Text formatting"
    >
      <Group>
        <Btn
          label="Bold"
          shortcut="⌘B"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
        >
          <Bold className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Italic"
          shortcut="⌘I"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
        >
          <Italic className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={disabled}
        >
          <Code className="h-3.5 w-3.5" />
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
        >
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
        >
          <Quote className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
        >
          <Minus className="h-3.5 w-3.5" />
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          disabled={disabled}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          disabled={disabled}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          disabled={disabled}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn label="Link" active={editor.isActive("link")} onClick={setLink} disabled={disabled}>
          <LinkIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Insert image (or paste / drop one in)"
          onClick={insertImage}
          disabled={disabled}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="YouTube" onClick={insertYoutube} disabled={disabled}>
          <YoutubeIcon className="h-3.5 w-3.5" />
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn
          label="Undo"
          shortcut="⌘Z"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
        >
          <Undo className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          label="Redo"
          shortcut="⌘⇧Z"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
        >
          <Redo className="h-3.5 w-3.5" />
        </Btn>
      </Group>
    </div>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />
}

function Btn({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  // Tiptap's `.run()` returns boolean, image-upload returns Promise<void>,
  // and a few buttons return void — accept the union by discarding the
  // value here.
  onClick: () => unknown
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => { void onClick() }}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition",
        "hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
      )}
    >
      {children}
    </button>
  )
}
