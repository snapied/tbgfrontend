"use client"

// Announcement bar + popups, on one screen. The bar is a single object
// at config.announcementBar; popups are a list under config.popups.
// Both live behind enabled flags so a half-configured one doesn't fire.

import { useState } from "react"
import { Inbox, Megaphone, Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import {
  usePortal,
  generatePortalId,
  type PortalPopup,
} from "@/lib/portal-store"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"

// Public-site announcement bar + promotional popups — both are
// marketing surfaces (timed promos, sale strips, lead-capture
// popups), so they live behind the same marketingTools gate as the
// rest of the marketing toolkit.
export default function AnnouncementsPage() {
  return (
    <PlanFeatureGate feature="marketingTools">
      <AnnouncementsPageInner />
    </PlanFeatureGate>
  )
}

function AnnouncementsPageInner() {
  const { config, updateConfig } = usePortal()
  const bar = config.announcementBar
  const popups = config.popups

  const setBar = (patch: Partial<typeof bar>) =>
    updateConfig({ announcementBar: { ...bar, ...patch } })

  const addPopup = () => {
    const p: PortalPopup = {
      id: generatePortalId("popup"),
      enabled: false,
      title: "New popup",
      body: "",
      trigger: { type: "time", afterSec: 8 },
      frequency: "once-per-day",
    }
    updateConfig({ popups: [...popups, p] })
  }
  const updatePopup = (id: string, patch: Partial<PortalPopup>) => {
    updateConfig({ popups: popups.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  }
  const deletePopup = (id: string) =>
    updateConfig({ popups: popups.filter((p) => p.id !== id) })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-muted-foreground">
          The thin bar across the top of every page, plus popups that fire on time / scroll / exit.
        </p>
      </div>

      {/* Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Announcement bar
          </CardTitle>
          <CardDescription>
            One bar, shown on every page. Dismissals are remembered per visitor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label>Enabled</Label>
            <Switch checked={bar.enabled} onCheckedChange={(v) => setBar({ enabled: v })} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Input
              value={bar.message}
              onChange={(e) => setBar({ message: e.target.value })}
              placeholder="🎉 Cohort 5 enrolling now — save 20% until Friday."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CTA label</Label>
              <Input
                value={bar.cta?.label ?? ""}
                onChange={(e) => setBar({ cta: { label: e.target.value, href: bar.cta?.href ?? "" } })}
                placeholder="Enroll"
              />
            </div>
            <div className="space-y-2">
              <Label>CTA link</Label>
              <Input
                value={bar.cta?.href ?? ""}
                onChange={(e) => setBar({ cta: { label: bar.cta?.label ?? "", href: e.target.value } })}
                placeholder="/courses"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={bar.variant} onValueChange={(v) => setBar({ variant: v as typeof bar.variant })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (primary)</SelectItem>
                  <SelectItem value="promo">Promo (accent)</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dismissable</Label>
              <div className="flex items-center gap-3">
                <Switch checked={bar.dismissable} onCheckedChange={(v) => setBar({ dismissable: v })} />
                <Select
                  value={bar.dismissPersists ?? "session"}
                  onValueChange={(v) => setBar({ dismissPersists: v as "session" | "forever" })}
                  disabled={!bar.dismissable}
                >
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="session">For this session</SelectItem>
                    <SelectItem value="forever">Until message changes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Popups</CardTitle>
            <CardDescription>
              Trigger on time, scroll depth, or exit intent. Only the first eligible popup fires per page.
            </CardDescription>
          </div>
          <Button onClick={addPopup} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add popup
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {popups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No popups yet.</p>
          ) : (
            popups.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      value={p.title}
                      onChange={(e) => updatePopup(p.id, { title: e.target.value })}
                      className="font-medium"
                      placeholder="Popup title"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updatePopup(p.id, { enabled: !p.enabled })}
                      >
                        {p.enabled ? <><Eye className="mr-1 h-3.5 w-3.5" /> Enabled</> : <><EyeOff className="mr-1 h-3.5 w-3.5" /> Disabled</>}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deletePopup(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Trigger</Label>
                      <Select
                        value={p.trigger.type}
                        onValueChange={(v) =>
                          updatePopup(p.id, {
                            trigger:
                              v === "time"
                                ? { type: "time", afterSec: 8 }
                                : v === "scroll"
                                ? { type: "scroll", percent: 50 }
                                : { type: "exit-intent" },
                          })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time">After N seconds</SelectItem>
                          <SelectItem value="scroll">Scroll depth %</SelectItem>
                          <SelectItem value="exit-intent">Exit intent (desktop)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Frequency</Label>
                      <Select
                        value={p.frequency}
                        onValueChange={(v) => updatePopup(p.id, { frequency: v as typeof p.frequency })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once-per-visit">Once per visit</SelectItem>
                          <SelectItem value="once-per-day">Once per day</SelectItem>
                          <SelectItem value="always">Every page load</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {p.trigger.type === "time" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Seconds before showing</Label>
                      <Input
                        type="number"
                        min={0}
                        value={p.trigger.afterSec}
                        onChange={(e) =>
                          updatePopup(p.id, {
                            trigger: { type: "time", afterSec: Math.max(0, Number(e.target.value)) },
                          })
                        }
                        className="w-32"
                      />
                    </div>
                  )}
                  {p.trigger.type === "scroll" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Scroll percent (0–100)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={p.trigger.percent}
                        onChange={(e) =>
                          updatePopup(p.id, {
                            trigger: { type: "scroll", percent: Math.min(100, Math.max(0, Number(e.target.value))) },
                          })
                        }
                        className="w-32"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs">Body</Label>
                    <RichTextEditor
                      value={p.body}
                      onChange={(html) => updatePopup(p.id, { body: html })}
                      placeholder="What do you want to tell visitors?"
                      minHeight={120}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">CTA label</Label>
                      <Input
                        value={p.cta?.label ?? ""}
                        onChange={(e) => updatePopup(p.id, { cta: { label: e.target.value, href: p.cta?.href ?? "" } })}
                        placeholder="Enroll now"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">CTA link</Label>
                      <Input
                        value={p.cta?.href ?? ""}
                        onChange={(e) => updatePopup(p.id, { cta: { label: p.cta?.label ?? "", href: e.target.value } })}
                        placeholder="/courses"
                      />
                    </div>
                  </div>

                  {/* Lead-form capture — toggle on to replace the CTA
                      with an inline form. Submissions go straight to
                      the Lead inbox with source="popup:<title>". */}
                  <div className="rounded-md border border-dashed border-primary/30 bg-primary/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Label className="inline-flex items-center gap-1.5 text-xs">
                          <Inbox className="h-3.5 w-3.5 text-primary" />
                          Capture as lead form
                        </Label>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Replace the CTA with an inline form. Submissions land in your{" "}
                          <span className="font-mono">Lead inbox</span>.
                        </p>
                      </div>
                      <Switch
                        checked={!!p.leadForm?.enabled}
                        onCheckedChange={(v) => {
                          updatePopup(p.id, {
                            leadForm: {
                              enabled: v,
                              captureName: p.leadForm?.captureName ?? true,
                              captureEmail: true,
                              capturePhone: p.leadForm?.capturePhone ?? false,
                              captureMessage: p.leadForm?.captureMessage ?? false,
                              submitLabel: p.leadForm?.submitLabel ?? "Send",
                              successMessage:
                                p.leadForm?.successMessage ??
                                "Thanks — we'll be in touch shortly.",
                            },
                          })
                        }}
                      />
                    </div>
                    {p.leadForm?.enabled && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Capture fields
                          </Label>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                            <label className="inline-flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={p.leadForm.captureName}
                                onChange={(e) =>
                                  updatePopup(p.id, {
                                    leadForm: { ...p.leadForm!, captureName: e.target.checked },
                                  })
                                }
                                className="h-3.5 w-3.5"
                              />
                              Name
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <input
                                type="checkbox"
                                checked
                                disabled
                                className="h-3.5 w-3.5"
                              />
                              Email <span className="text-[10px]">(required)</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={p.leadForm.capturePhone}
                                onChange={(e) =>
                                  updatePopup(p.id, {
                                    leadForm: { ...p.leadForm!, capturePhone: e.target.checked },
                                  })
                                }
                                className="h-3.5 w-3.5"
                              />
                              Phone
                            </label>
                            <label className="inline-flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={p.leadForm.captureMessage}
                                onChange={(e) =>
                                  updatePopup(p.id, {
                                    leadForm: { ...p.leadForm!, captureMessage: e.target.checked },
                                  })
                                }
                                className="h-3.5 w-3.5"
                              />
                              Message
                            </label>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Submit button</Label>
                            <Input
                              value={p.leadForm.submitLabel}
                              onChange={(e) =>
                                updatePopup(p.id, {
                                  leadForm: { ...p.leadForm!, submitLabel: e.target.value },
                                })
                              }
                              placeholder="Get the guide"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Success message</Label>
                            <Input
                              value={p.leadForm.successMessage}
                              onChange={(e) =>
                                updatePopup(p.id, {
                                  leadForm: { ...p.leadForm!, successMessage: e.target.value },
                                })
                              }
                              placeholder="Thanks — we'll be in touch shortly."
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
