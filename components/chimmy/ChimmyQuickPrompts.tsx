'use client'

import React from 'react'

export interface ChimmyQuickPromptChip {
  id: string
  label: string
  prompt: string
}

export interface ChimmyQuickPromptsProps {
  /** Suggested prompts (e.g. from getDefaultChimmyChips). Click sets prompt for user to send or edit. */
  chips: ChimmyQuickPromptChip[]
  /** Called with chip.prompt when user clicks a chip */
  onSelect: (prompt: string) => void
  /** Max chips to show (default 4) */
  maxVisible?: number
  className?: string
}

/**
 * Quick prompt chips for Chimmy. Calm, clear labels. No dead buttons — every chip calls onSelect(prompt).
 */
export default function ChimmyQuickPrompts({
  chips,
  onSelect,
  maxVisible = 4,
  className = '',
}: ChimmyQuickPromptsProps) {
  const visible = chips.slice(0, maxVisible)
  if (visible.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {visible.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSelect(chip.prompt)}
          className="px-3 py-2 rounded-xl border border-white/20 bg-white/5 text-sm text-white/80 hover:bg-white/10 hover:border-white/30 transition min-h-[44px]"
          data-chimmy-quick-prompt={chip.id}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
