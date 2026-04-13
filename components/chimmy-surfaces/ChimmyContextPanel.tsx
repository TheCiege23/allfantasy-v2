'use client'

import React from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'

export interface ChimmyContextPanelSection {
  title: string
  content: React.ReactNode
}

export interface ChimmyContextPanelProps {
  /** Panel title */
  title?: string
  sections: ChimmyContextPanelSection[]
  /** Quick action at the bottom */
  footerAction?: { label: string; onClick: () => void }
  className?: string
}

export default function ChimmyContextPanel({
  title = 'Chimmy Insights',
  sections,
  footerAction,
  className = '',
}: ChimmyContextPanelProps) {
  return (
    <aside className={`flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>

      <div className="flex flex-col gap-4">
        {sections.map((section, i) => (
          <div key={i}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-white/40">
              {section.title}
            </p>
            <div>{section.content}</div>
          </div>
        ))}
      </div>

      {footerAction && (
        <button
          onClick={footerAction.onClick}
          className="mt-auto flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {footerAction.label}
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </aside>
  )
}
