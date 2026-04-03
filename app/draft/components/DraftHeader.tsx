'use client'

import { Settings } from 'lucide-react'

type Props = {
  title: string
  subtitle?: string
  onOpenSettings?: () => void
  rightSlot?: React.ReactNode
}

export function DraftHeader({ title, subtitle, onOpenSettings, rightSlot }: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0d1117] px-3 py-2">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold text-white">{title}</h1>
        {subtitle ? <p className="text-[10px] text-white/45">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg border border-white/[0.08] p-2 text-white/60 hover:bg-white/[0.06]"
            aria-label="Draft settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </header>
  )
}
