"use client"

// Searchable, grouped category picker.
//
// Built on Popover + cmdk (Command). Lists every category from
// lib/course-categories grouped by audience segment so a nursery-school
// teacher and a corporate trainer can both find their slot. The search
// box filters across the full list; an empty query shows the entire
// taxonomy — long, but cheap to scan because it's grouped.
//
// Custom categories: when the user picks "Custom / Other" (or types a
// value not in the taxonomy), the field swaps to a text input so they
// can name their own category. We save the typed string verbatim — the
// "Custom / Other" sentinel only ever lives in the picker UI, never in
// the underlying course record.

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check, ChevronsUpDown, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ALL_CATEGORIES, CATEGORY_GROUPS } from "@/lib/course-categories"

const CUSTOM_SENTINEL = "Custom / Other"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
  // When true, swaps the trigger/text-input border to destructive so the
  // combobox can show validation errors alongside shadcn <Input>s.
  error?: boolean
}

export function CategoryCombobox({
  value,
  onChange,
  placeholder = "Pick a category",
  id,
  className,
  disabled,
  error,
}: Props) {
  const [open, setOpen] = useState(false)

  // A value is "custom" if it's been set but doesn't match any predefined
  // category (or it explicitly matches the CUSTOM_SENTINEL, which we
  // immediately clear to give the user a clean slate to type into).
  const isCustom = value !== "" && !ALL_CATEGORIES.includes(value)
  const [customMode, setCustomMode] = useState(isCustom)
  const customInputRef = useRef<HTMLInputElement>(null)

  // Sync customMode if the parent swaps `value` programmatically (e.g.
  // form reset). Without this, a "Save → reset form" cycle would leave
  // the field stuck in customMode even after value is cleared.
  useEffect(() => { setCustomMode(isCustom) }, [isCustom])

  const enterCustomMode = (initial: string) => {
    setCustomMode(true)
    onChange(initial)
    // Defer focus until after the input renders.
    requestAnimationFrame(() => customInputRef.current?.focus())
  }

  const exitCustomMode = () => {
    setCustomMode(false)
    onChange("")
  }

  if (customMode) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Pencil className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={id}
              ref={customInputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your own category name"
              maxLength={60}
              disabled={disabled}
              className={cn("pl-8", error && "border-destructive focus-visible:ring-destructive/30")}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={exitCustomMode}
            disabled={disabled}
            title="Pick from the list instead"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            List
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Saved as-is. Up to 60 characters.
        </p>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={error || undefined}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            error && "border-destructive focus-visible:ring-destructive/30",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[280px] p-0"
      >
        <Command>
          <CommandInput placeholder="Search categories…" />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>No matching category.</CommandEmpty>
            {CATEGORY_GROUPS.map((g) => (
              <CommandGroup key={g.group} heading={g.group}>
                {g.items.map((item) => {
                  const selected = value === item
                  // Selecting "Custom / Other" doesn't actually save that
                  // sentinel — it flips into custom mode and starts the
                  // user with an empty input.
                  const handleSelect = () => {
                    setOpen(false)
                    if (item === CUSTOM_SENTINEL) {
                      enterCustomMode("")
                    } else {
                      onChange(item)
                    }
                  }
                  return (
                    <CommandItem
                      key={item}
                      value={`${item} ${g.group}`}
                      onSelect={handleSelect}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                      {item}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
