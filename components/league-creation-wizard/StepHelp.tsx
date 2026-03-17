'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type StepHelpProps = {
  /** Short tooltip on hover (native title). */
  title?: string
  /** Longer content shown in popover when clicking the icon. */
  children: React.ReactNode
  className?: string
}

/**
 * Small info icon that shows help text in a popover. Use for step-level or field-level explanations.
 */
export function StepHelp({ title, children, className }: StepHelpProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label="Help"
          className={cn(
            'inline-flex size-5 shrink-0 rounded-full text-white/40 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
            className
          )}
          onClick={(e) => {
            e.preventDefault()
            setOpen((v) => !v)
          }}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="max-w-[280px] text-sm text-white/90">
        {children}
      </PopoverContent>
    </Popover>
  )
}

export type StepHeaderProps = {
  title: string
  /** One-line description under the title. */
  description: string
  /** Optional help popover content. */
  help?: React.ReactNode
  /** Optional short tooltip for the help icon. */
  helpTitle?: string
}

/**
 * Consistent step header: title, description, optional help icon.
 */
export function StepHeader({ title, description, help, helpTitle }: StepHeaderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {help != null && (
          <StepHelp title={helpTitle}>{help}</StepHelp>
        )}
      </div>
      <p className="text-sm text-white/70">{description}</p>
    </div>
  )
}
