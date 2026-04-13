'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

export interface ChimmyRightRailPanelProps {
  title?: string
  children: React.ReactNode
  /** Sticky on scroll */
  sticky?: boolean
  className?: string
}

export default function ChimmyRightRailPanel({
  title = 'Chimmy',
  children,
  sticky = true,
  className = '',
}: ChimmyRightRailPanelProps) {
  return (
    <aside
      className={`w-full rounded-2xl border border-white/10 bg-slate-900/80 ${sticky ? 'sticky top-6' : ''} ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </aside>
  )
}
