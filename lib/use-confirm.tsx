"use client"

// App-wide replacement for window.confirm / window.alert. Mount the
// <ConfirmProvider> once at the root, then call useConfirm() from any
// component:
//
//   const confirm = useConfirm()
//   if (await confirm({ title: "Delete this course?", destructive: true })) {
//     deleteCourse(id)
//   }
//
// Returns a promise that resolves to true/false. Replaces the native
// browser dialog (which can't be styled, looks foreign on macOS/Windows,
// and breaks the visual flow) with a shadcn AlertDialog that picks up
// the tenant's theme.

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

export interface ConfirmOptions {
  title: string
  description?: string
  // What the primary action says. Defaults to "Confirm" (or "Delete"
  // when destructive=true so the consequence is obvious without
  // having to spell it out at every call site).
  confirmLabel?: string
  cancelLabel?: string
  // Paints the primary button in the destructive color and changes
  // the default label to "Delete". Use for anything irreversible.
  destructive?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface PendingConfirm extends ConfirmOptions {
  resolve: (v: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve })
    })
  }, [])

  const close = (value: boolean) => {
    if (pending) pending.resolve(value)
    setPending(null)
  }

  const confirmLabel =
    pending?.confirmLabel ?? (pending?.destructive ? "Delete" : "Confirm")
  const cancelLabel = pending?.cancelLabel ?? "Cancel"

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title ?? ""}</AlertDialogTitle>
            {pending?.description && (
              <AlertDialogDescription>{pending.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={cn(
                pending?.destructive &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>")
  return ctx
}
