"use client"

// Experiments admin — create/edit/observe A/B experiments.
//
// Layout:
//   • Header with "Create experiment" CTA
//   • Per-experiment card: name, status pill, variants table with
//     exposures / conversions / rate / lift, action row (pause,
//     ship winner, reroll, delete)
//   • Create / edit dialog with key + variants + weights + goals
//
// Storage is all client-side localStorage. See lib/experiments.ts for
// the storage shape and the consumer-side `useExperiment` hook that
// reads these configs.

import { useMemo, useState } from "react"
import {
  BarChart3,
  Beaker,
  Code,
  Copy,
  Info,
  MapPin,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTenant } from "@/lib/tenant-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  buildExperimentReport,
  useExperimentsAdmin,
  type ExperimentConfig,
  type ExperimentVariant,
} from "@/lib/experiments"
import {
  PREBUILT_EXPERIMENTS,
  materialisePrebuilt,
  prebuiltFor,
  type PrebuiltExperiment,
} from "@/lib/experiments-registry"

export default function ExperimentsAdminPage() {
  const { currentTenant } = useTenant()
  const slug = currentTenant?.slug ?? ""
  const admin = useExperimentsAdmin(slug)
  const confirm = useConfirm()

  const [dialogState, setDialogState] = useState<
    { mode: "create" } | { mode: "edit"; config: ExperimentConfig } | null
  >(null)

  // Pre-built experiments that aren't yet running. Filter the
  // catalog against the configs the admin already created so we
  // don't surface "spin up Hero CTA" when it's already live.
  const liveKeys = new Set(admin.configs.map((c) => c.key))
  const availablePrebuilts = PREBUILT_EXPERIMENTS.filter((p) => !liveKeys.has(p.key))

  // Materialise + persist a pre-built. Status stays "draft" so the
  // teacher reviews variants + weights + status before flipping it
  // to "running". Toast routes them back to the new card.
  const spinUpPrebuilt = (p: PrebuiltExperiment) => {
    admin.upsert(materialisePrebuilt(p))
    toast.success(
      `"${p.name}" spun up as a draft. Set status to "Running" when you're ready.`,
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Beaker className="h-3.5 w-3.5" />
            Experiments
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">
            A/B experiments
          </h1>
          <p className="text-muted-foreground">
            Test variations of copy, layout, or pricing against your real visitors.
            Each visitor sticks to the variant they first saw — reports stay honest.
          </p>
        </div>
        <Button onClick={() => setDialogState({ mode: "create" })}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create experiment
        </Button>
      </div>

      {/* What this module does — explanatory card. Renders once
          at the top so a teacher landing here for the first time
          gets the mental model in 30 seconds. Collapses out of the
          way after they've created their first experiment because
          they've internalised the concept by then. */}
      {admin.configs.length === 0 && (
        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold">1. Spin up a test</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Pick one of the pre-built tests below — they&apos;re wired into
                  your portal already.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <PlayCircle className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold">2. Set it running</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Visitors get sticky assignments — same person always sees the
                  same variant.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Trophy className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold">3. Ship the winner</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Lift table tells you which variant wins. One click sends it to
                  100% traffic.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pre-built experiments — quick-create cards for the experiments
          this product already wires into surfaces. The two below
          (Hero CTA copy, Course price display) cover the highest-
          conversion-lift surfaces. Filtered out once the teacher
          spins one up so the list stays honest. */}
      {availablePrebuilts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-[13px] font-bold uppercase tracking-wider">
              Pre-built tests · ready to spin up
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground">
            These experiments are already wired into your portal. Click &ldquo;Spin up&rdquo;
            and we&apos;ll create the config with the right variant ids — you just
            set the traffic split and start.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {availablePrebuilts.map((p) => (
              <PrebuiltExperimentCard key={p.key} prebuilt={p} onSpinUp={() => spinUpPrebuilt(p)} />
            ))}
          </div>
        </div>
      )}

      {/* Live experiments list — own header + count for scanability. */}
      {admin.configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <Beaker className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-semibold">No live experiments yet</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Pick one of the pre-built tests above, or build a custom test from scratch.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setDialogState({ mode: "create" })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Build a custom test
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <h2 className="text-[13px] font-bold uppercase tracking-wider">
            Your experiments · {admin.configs.length}
          </h2>
          <div className="space-y-4">
            {admin.configs.map((cfg) => (
              <ExperimentCard
                key={cfg.key}
                config={cfg}
                admin={admin}
                onEdit={() => setDialogState({ mode: "edit", config: cfg })}
                onDelete={async () => {
                  const ok = await confirm({
                    title: `Delete experiment "${cfg.name}"?`,
                    description:
                      "This removes the config + every recorded exposure/conversion. Variant assignments live on so visitors don't suddenly flip variants if you re-create it under the same key.",
                    destructive: true,
                    confirmLabel: "Delete",
                  })
                  if (!ok) return
                  admin.remove(cfg.key)
                  admin.clearEvents(cfg.key)
                  toast.success("Experiment deleted.")
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create / edit dialog */}
      {dialogState && (
        <ExperimentDialog
          mode={dialogState.mode}
          initial={dialogState.mode === "edit" ? dialogState.config : undefined}
          existingKeys={admin.configs.map((c) => c.key)}
          onCancel={() => setDialogState(null)}
          onSave={(cfg) => {
            admin.upsert(cfg)
            setDialogState(null)
            toast.success(`Experiment ${dialogState.mode === "edit" ? "updated" : "created"}.`)
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Per-experiment card with report + action row
// ============================================================

/** Pre-built experiment card — surfaces a catalog entry as a
 *  quick-create tile. Each card is a self-contained "ready to ship"
 *  proposal: shows the surface that consumes it, the variant
 *  framings, and a single "Spin up" button. Materialises the
 *  default config in draft state so the teacher reviews before
 *  flipping to running. */
function PrebuiltExperimentCard({
  prebuilt,
  onSpinUp,
}: {
  prebuilt: PrebuiltExperiment
  onSpinUp: () => void
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2.5">
          <span className="text-xl leading-none">{prebuilt.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{prebuilt.name}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {prebuilt.description}
            </p>
          </div>
        </div>
        <p className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {prebuilt.surface}
        </p>
        <ul className="space-y-0.5 text-[11px] text-muted-foreground">
          {prebuilt.variants.map((v) => (
            <li key={v.id} className="truncate">
              · {v.label}
            </li>
          ))}
        </ul>
        <Button size="sm" className="w-full" onClick={onSpinUp}>
          <Plus className="mr-1 h-3 w-3" />
          Spin up
        </Button>
      </CardContent>
    </Card>
  )
}

function ExperimentCard({
  config,
  admin,
  onEdit,
  onDelete,
}: {
  config: ExperimentConfig
  admin: ReturnType<typeof useExperimentsAdmin>
  onEdit: () => void
  onDelete: () => void
}) {
  const confirm = useConfirm()
  // Pull events live so the report ticks up when a visitor converts
  // in another tab and we re-render. (Localstorage events fire on
  // setItem from a *different* document; we re-derive on render to
  // catch same-tab activity.)
  const report = useMemo(
    () => buildExperimentReport(config, admin.events(config.key)),
    [config, admin],
  )

  const totalConversions = report.variants.reduce((sum, v) => sum + v.conversions, 0)

  const flipStatus = (next: ExperimentConfig["status"]) => {
    admin.upsert({ ...config, status: next, updatedAt: new Date().toISOString() })
  }

  const shipWinner = async (variantId: string) => {
    const label = config.variants.find((v) => v.id === variantId)?.label ?? variantId
    const ok = await confirm({
      title: `Ship "${label}" to 100% of traffic?`,
      description:
        "All visitors will see this variant immediately. The experiment stays in the dashboard for reporting — you can revert by unsetting the winner.",
      confirmLabel: "Ship winner",
    })
    if (!ok) return
    admin.upsert({
      ...config,
      status: "completed",
      winnerVariantId: variantId,
      updatedAt: new Date().toISOString(),
    })
    toast.success(`"${label}" is now the default for everyone.`)
  }

  const unshipWinner = () => {
    admin.upsert({
      ...config,
      winnerVariantId: undefined,
      updatedAt: new Date().toISOString(),
    })
    toast.info("Winner cleared. Resume / pause the experiment to control traffic.")
  }

  const rerollEveryone = async () => {
    const ok = await confirm({
      title: "Reroll every visitor's assignment?",
      description:
        "Existing variant assignments get dropped. The next time a visitor lands they get a fresh random pick. Reports up to this point stay intact, but lift will look discontinuous from here on.",
      destructive: true,
      confirmLabel: "Reroll",
    })
    if (!ok) return
    admin.clearAssignments(config.key)
    toast.success("Assignments cleared. Visitors will re-roll on next exposure.")
  }

  const clearReportData = async () => {
    const ok = await confirm({
      title: "Clear recorded data?",
      description:
        "Drops every exposure + conversion for this experiment. The config + assignments stay. Use when you've fixed an instrumentation bug and want a clean slate.",
      destructive: true,
      confirmLabel: "Clear data",
    })
    if (!ok) return
    admin.clearEvents(config.key)
    toast.success("Data cleared.")
  }

  // Resolve to a pre-built definition so the card can render a
  // "Running on:" surface tag — connects the experiment back to the
  // place in the product where it actually shows. Returns null for
  // custom experiments the teacher created from scratch; in that
  // case we omit the surface tag rather than fake one.
  const prebuilt = prebuiltFor(config.key)

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{config.name}</CardTitle>
              <StatusPill status={config.status} />
              {config.winnerVariantId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Trophy className="h-3 w-3" />
                  Winner shipped
                </span>
              )}
            </div>
            <CardDescription className="mt-1">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {config.key}
              </code>{" "}
              {config.description && <span className="ml-1.5">· {config.description}</span>}
            </CardDescription>
            {/* Surface indicator — tells the teacher exactly where
                this experiment is rendering. Without this, an
                experiment in the admin felt floating ("what is
                this affecting?"). Custom experiments (no pre-built
                match) show a neutral note instead. */}
            {prebuilt ? (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <MapPin className="h-3 w-3" />
                Running on: {prebuilt.surface}
              </p>
            ) : (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                <Info className="h-3 w-3" />
                Custom experiment — wire <code className="font-mono">useExperiment</code> in your code
              </p>
            )}
          </div>
          {/* Action row — primary action morphs by status */}
          <div className="flex flex-wrap items-center gap-1.5">
            {config.status === "running" ? (
              <Button variant="outline" size="sm" onClick={() => flipStatus("paused")}>
                <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
                Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => flipStatus("running")}>
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Start
              </Button>
            )}
            {config.winnerVariantId && (
              <Button variant="ghost" size="sm" onClick={unshipWinner}>
                Clear winner
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={rerollEveryone} title="Reroll all visitor assignments">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={clearReportData} title="Clear recorded events">
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
              title="Delete experiment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {/* Headline numbers */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-1 text-[12px] text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{report.totalExposures.toLocaleString()}</span> total exposures
          </span>
          <span>
            <span className="font-semibold text-foreground">{totalConversions.toLocaleString()}</span> total conversions
          </span>
          {report.leaderLiftVsControl !== null && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                report.leaderLiftVsControl >= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
              )}
            >
              {report.leaderLiftVsControl >= 0 ? "+" : ""}
              {(report.leaderLiftVsControl * 100).toFixed(1)}% lift vs control
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Variants table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Variant</th>
                <th className="py-2 pr-3 text-right">Weight</th>
                <th className="py-2 pr-3 text-right">Exposures</th>
                <th className="py-2 pr-3 text-right">Conversions</th>
                <th className="py-2 pr-3 text-right">Rate</th>
                <th className="py-2 pl-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {report.variants.map((v, i) => {
                const isWinner = config.winnerVariantId === v.variantId
                const isControl = i === 0
                const isLeader =
                  report.variants.length > 1 &&
                  v === [...report.variants].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))[0] &&
                  !isControl
                const trafficShare = (() => {
                  const total = config.variants.reduce(
                    (s, x) => s + Math.max(0, x.weight),
                    0,
                  )
                  if (total <= 0) return 0
                  const me = config.variants.find((x) => x.id === v.variantId)?.weight ?? 0
                  return Math.max(0, me) / total
                })()
                return (
                  <tr key={v.variantId} className="border-b border-border/50">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{v.variantLabel}</span>
                        {isControl && (
                          <span className="rounded-full bg-muted px-1.5 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                            Control
                          </span>
                        )}
                        {isWinner && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                        {isLeader && !isWinner && (
                          <span className="rounded-full bg-emerald-500/15 px-1.5 text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            Leader
                          </span>
                        )}
                      </div>
                      <code className="block text-[10.5px] text-muted-foreground">{v.variantId}</code>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {(trafficShare * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{v.exposures.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{v.conversions.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">
                      {v.rate === null ? "—" : `${(v.rate * 100).toFixed(2)}%`}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      {!isWinner && config.status !== "draft" && v.exposures > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shipWinner(v.variantId)}
                          className="gap-1.5 text-[11px]"
                        >
                          <Trophy className="h-3 w-3" />
                          Ship
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Per-event conversion breakdown — only render when at least
            one variant has tagged events, otherwise the section is
            noise. */}
        {report.variants.some((v) => Object.keys(v.byEvent).length > 0) && (
          <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="-mt-0.5 mr-1 inline h-3 w-3" />
              Conversions by event
            </p>
            <div className="mt-2 space-y-1.5">
              {Array.from(
                new Set(
                  report.variants.flatMap((v) => Object.keys(v.byEvent)),
                ),
              ).map((eventName) => (
                <div key={eventName} className="flex items-center gap-3 text-[12px]">
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">{eventName}</code>
                  <div className="flex flex-1 items-center gap-3">
                    {report.variants.map((v) => (
                      <span key={v.variantId} className="tabular-nums">
                        <span className="text-muted-foreground">{v.variantLabel}: </span>
                        <span className="font-semibold">{v.byEvent[eventName] ?? 0}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusPill({ status }: { status: ExperimentConfig["status"] }) {
  const map: Record<ExperimentConfig["status"], { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    running: { label: "Running", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    paused: { label: "Paused", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    completed: { label: "Completed", cls: "bg-primary/10 text-primary" },
  }
  const m = map[status]
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider", m.cls)}>
      {m.label}
    </span>
  )
}

// ============================================================
// Create / edit dialog
// ============================================================

function ExperimentDialog({
  mode,
  initial,
  existingKeys,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit"
  initial?: ExperimentConfig
  existingKeys: string[]
  onCancel: () => void
  onSave: (cfg: ExperimentConfig) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [key, setKey] = useState(initial?.key ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [status, setStatus] = useState<ExperimentConfig["status"]>(initial?.status ?? "draft")
  const [goals, setGoals] = useState<string>((initial?.goals ?? []).join(", "))
  const [variants, setVariants] = useState<ExperimentVariant[]>(
    initial?.variants ?? [
      { id: "control", label: "Control", weight: 1 },
      { id: "variant-b", label: "Variant B", weight: 1 },
    ],
  )

  // Slugify the name → key when the user hasn't manually edited the
  // key. Stops once they type into the key field directly so we don't
  // overwrite their custom slug.
  const [keyTouched, setKeyTouched] = useState(mode === "edit")
  const onNameChange = (v: string) => {
    setName(v)
    if (!keyTouched) {
      setKey(
        v
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 48),
      )
    }
  }

  // ID auto-derives from label when empty. Keeps the dialog quick
  // for the common path; advanced users can override.
  const updateVariant = (idx: number, patch: Partial<ExperimentVariant>) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v
        const next = { ...v, ...patch }
        if (patch.label !== undefined && (v.id === "" || v.id === slugify(v.label))) {
          next.id = slugify(patch.label)
        }
        return next
      }),
    )
  }
  const removeVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx))
  }
  const addVariant = () => {
    const n = variants.length
    setVariants((prev) => [
      ...prev,
      { id: `variant-${String.fromCharCode(97 + n)}`, label: `Variant ${String.fromCharCode(64 + n + 1)}`, weight: 1 },
    ])
  }

  const keyClash =
    mode === "create" && existingKeys.includes(key) ? "An experiment with this key already exists." : ""
  const variantIdClash = (() => {
    const ids = variants.map((v) => v.id)
    return ids.length !== new Set(ids).size ? "Variant IDs must be unique." : ""
  })()
  const errors = {
    name: name.trim() ? "" : "Name is required.",
    key: key.trim() ? keyClash : "Key is required.",
    variants: variants.length < 2 ? "At least two variants are required." : variantIdClash,
  }
  const hasError = Object.values(errors).some(Boolean)

  const submit = () => {
    if (hasError) return
    const now = new Date().toISOString()
    onSave({
      key: key.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      variants: variants.map((v) => ({
        id: v.id.trim() || slugify(v.label),
        label: v.label.trim() || v.id,
        weight: Math.max(0, Number(v.weight) || 0),
      })),
      goals: goals
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      winnerVariantId: initial?.winnerVariantId,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit experiment" : "Create experiment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-name">Name</Label>
              <Input
                id="exp-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Hero CTA — direct vs aspirational"
              />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-key">Key (used in code)</Label>
              <Input
                id="exp-key"
                value={key}
                onChange={(e) => {
                  setKeyTouched(true)
                  setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }}
                placeholder="hero-cta"
                className="font-mono text-sm"
                disabled={mode === "edit"}
              />
              {errors.key && <p className="text-[11px] text-destructive">{errors.key}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Description (optional)</Label>
            <Textarea
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What hypothesis are you testing?"
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ExperimentConfig["status"])}>
                <SelectTrigger id="exp-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (no traffic)</SelectItem>
                  <SelectItem value="running">Running (active)</SelectItem>
                  <SelectItem value="paused">Paused (keep assignments, stop new picks)</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-goals">
                Goals (comma-separated event names)
              </Label>
              <Input
                id="exp-goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="enroll, newsletter-signup"
              />
              <p className="text-[11px] text-muted-foreground">
                Convert calls with these names will be highlighted in the report.
              </p>
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Variants</Label>
              <Button variant="outline" size="sm" onClick={addVariant}>
                <Plus className="mr-1 h-3 w-3" /> Add variant
              </Button>
            </div>
            {errors.variants && <p className="text-[11px] text-destructive">{errors.variants}</p>}
            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-[2fr_2fr_1fr_auto]"
                >
                  <Input
                    value={v.label}
                    onChange={(e) => updateVariant(idx, { label: e.target.value })}
                    placeholder="Variant label"
                  />
                  <Input
                    value={v.id}
                    onChange={(e) => updateVariant(idx, { id: slugify(e.target.value) })}
                    placeholder="variant-id"
                    className="font-mono text-sm"
                  />
                  <Input
                    type="number"
                    value={v.weight}
                    onChange={(e) => updateVariant(idx, { weight: Number(e.target.value) || 0 })}
                    min={0}
                    placeholder="Weight"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(idx)}
                    className="text-destructive hover:text-destructive"
                    disabled={variants.length <= 2}
                    title={variants.length <= 2 ? "At least two variants required" : "Remove variant"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Traffic split is weight ÷ sum-of-weights. (1, 1) = 50/50, (3, 1) = 75/25. Zero
              weight stops new assignments to that variant without disturbing existing ones.
            </p>
          </div>

          {/* Implementation snippet — demoted behind <details>
              because 95% of teachers don't write code. Visible by
              default to anyone who chooses to expand it; the title
              "For developers" sets the expectation. Devs adding a
              brand-new experiment that isn't pre-built also need to
              add it to lib/experiments-registry.ts so the admin
              surfaces it as a "Running on:" tag — the snippet hint
              calls that out. */}
          {key && variants.length >= 2 && (
            <details className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
              <summary className="flex cursor-pointer select-none items-center gap-1.5 font-medium text-muted-foreground">
                <Code className="h-3.5 w-3.5" />
                For developers — code to wire this experiment into a surface
              </summary>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Snippet
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(snippetFor(key, variants))
                      toast.success("Snippet copied.")
                    }}
                    className="gap-1.5"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <pre className="mt-1.5 overflow-x-auto rounded bg-background p-2 text-[11px]">
                  <code>{snippetFor(key, variants)}</code>
                </pre>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  After wiring this, add an entry in{" "}
                  <code className="rounded bg-background px-1 font-mono text-[10.5px]">
                    lib/experiments-registry.ts
                  </code>{" "}
                  so this admin surfaces the &ldquo;Running on:&rdquo; tag and a Spin-up card.
                </p>
              </div>
            </details>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={submit} disabled={hasError}>
            {mode === "edit" ? "Save changes" : "Create experiment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function slugify(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
}

function snippetFor(key: string, variants: ExperimentVariant[]): string {
  const ids = variants.map((v) => `"${v.id}"`).join(", ")
  return `const exp = useExperiment({
  tenantSlug,
  key: "${key}",
  variantIds: [${ids}],
})
useEffect(() => exp.exposure(), [])

// Render based on exp.variant === "${variants[0]?.id ?? "control"}"
// Call exp.convert("your-goal-name") on success.`
}
