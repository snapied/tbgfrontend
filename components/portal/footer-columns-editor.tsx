"use client"

// Footer columns editor. Each column has a heading + a list of links.
// Links can be:
//   • Internal — "/courses", "/teachers", "/blog/some-post"
//   • External — "https://twitter.com/…"
//   • Email — "mailto:hello@example.com"
//
// We don't enforce any of that — the footer renderer detects the form
// at render time. The editor just makes adding/removing columns and
// links fast.

import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  type PortalFooterColumn,
  generatePortalId,
} from "@/lib/portal-store"
import { PathInput } from "@/components/portal/path-input"

interface Props {
  columns: PortalFooterColumn[]
  onChange: (next: PortalFooterColumn[]) => void
}

export function FooterColumnsEditor({ columns, onChange }: Props) {
  const upsertColumn = (id: string, patch: Partial<PortalFooterColumn>) =>
    onChange(columns.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const removeColumn = (id: string) =>
    onChange(columns.filter((c) => c.id !== id))
  const moveColumn = (id: string, dir: -1 | 1) => {
    const idx = columns.findIndex((c) => c.id === id)
    if (idx === -1) return
    const next = idx + dir
    if (next < 0 || next >= columns.length) return
    const arr = columns.slice()
    const [m] = arr.splice(idx, 1)
    arr.splice(next, 0, m)
    onChange(arr)
  }
  const addColumn = () =>
    onChange([
      ...columns,
      {
        id: generatePortalId("col"),
        heading: "New column",
        links: [],
      },
    ])

  return (
    <div className="space-y-3">
      {columns.map((col, idx) => (
        <Card key={col.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={col.heading}
                onChange={(e) => upsertColumn(col.id, { heading: e.target.value })}
                placeholder="Column heading"
                className="flex-1 text-base font-semibold"
              />
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={idx === 0}
                  onClick={() => moveColumn(col.id, -1)}
                  title="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={idx === columns.length - 1}
                  onClick={() => moveColumn(col.id, 1)}
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeColumn(col.id)}
                  title="Delete column"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-2 pl-6">
              {col.links.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={l.label}
                    onChange={(e) =>
                      upsertColumn(col.id, {
                        links: col.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                      })
                    }
                    placeholder="Label (e.g. Privacy)"
                    className="w-40 shrink-0"
                  />
                  <PathInput
                    value={l.href}
                    onChange={(v) =>
                      upsertColumn(col.id, {
                        links: col.links.map((x, j) => (j === i ? { ...x, href: v } : x)),
                      })
                    }
                    placeholder="/privacy  or  https://...  or  mailto:hello@example.com"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      upsertColumn(col.id, {
                        links: col.links.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  upsertColumn(col.id, { links: [...col.links, { label: "", href: "" }] })
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add link
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addColumn}>
        <Plus className="mr-1.5 h-4 w-4" /> Add column
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Internal links (e.g. <code className="rounded bg-muted px-1 font-mono">/privacy</code>) auto-resolve to
        your portal. External (<code className="rounded bg-muted px-1 font-mono">https://…</code>) and email
        (<code className="rounded bg-muted px-1 font-mono">mailto:</code>) work too. Columns with zero links are
        hidden on the public site.
      </p>
    </div>
  )
}

