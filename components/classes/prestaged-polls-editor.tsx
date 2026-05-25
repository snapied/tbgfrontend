"use client"

// Pre-staged polls editor — drops into the class scheduling form
// (advanced surface) so a host can compose 0-5 polls before class
// and fire each one with a single click during the lesson, instead
// of pausing mid-teach to type a question into a composer.
//
// Storage: lives on the LiveSession's `prestagedPolls` array.

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type PrestagedPoll = {
  id: string
  question: string
  options: string[]
  launchedPollId?: string
}

interface Props {
  polls: PrestagedPoll[]
  onChange: (next: PrestagedPoll[]) => void
}

const MAX_POLLS = 5
const MAX_OPTIONS = 4

function newPoll(): PrestagedPoll {
  return {
    id: `prestaged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: "",
    options: ["", ""],
  }
}

export function PrestagedPollsEditor({ polls, onChange }: Props) {
  function update(id: string, patch: Partial<PrestagedPoll>) {
    onChange(polls.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  function remove(id: string) {
    onChange(polls.filter((p) => p.id !== id))
  }
  function addOption(id: string) {
    const p = polls.find((x) => x.id === id)
    if (!p || p.options.length >= MAX_OPTIONS) return
    update(id, { options: [...p.options, ""] })
  }
  function removeOption(id: string, idx: number) {
    const p = polls.find((x) => x.id === id)
    if (!p || p.options.length <= 2) return
    update(id, { options: p.options.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-semibold">Pre-staged polls</p>
          <p className="text-xs text-muted-foreground">
            Compose up to {MAX_POLLS} polls now. Fire each one with one click during class — no
            mid-lecture typing.
          </p>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          {polls.length} / {MAX_POLLS}
        </span>
      </div>

      {polls.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No polls staged yet. They&rsquo;ll appear in the host poll panel during class as one-tap launchers.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {polls.map((p, idx) => (
            <li key={p.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Poll {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove poll ${idx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                value={p.question}
                onChange={(e) => update(p.id, { question: e.target.value })}
                placeholder="Question — e.g. Which approach do you prefer?"
                className="mt-2"
                maxLength={140}
              />
              <div className="mt-2 space-y-1.5">
                {p.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-[10px] font-bold text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) =>
                        update(p.id, {
                          options: p.options.map((o, j) => (i === j ? e.target.value : o)),
                        })
                      }
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="h-8 text-sm"
                      maxLength={80}
                    />
                    {p.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(p.id, i)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                        aria-label="Remove option"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {p.options.length < MAX_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => addOption(p.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" /> Add option
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {polls.length < MAX_POLLS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1"
          onClick={() => onChange([...polls, newPoll()])}
        >
          <Plus className="h-3.5 w-3.5" /> Add a poll
        </Button>
      )}
    </div>
  )
}
