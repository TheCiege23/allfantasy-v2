'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

export interface ChimmyThinkingStateProps {
  message?: string
  /** Show animated pulse dots instead of spinner */
  variant?: 'spinner' | 'dots' | 'pulse'
  className?: string
}

function PulseDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

export default function ChimmyThinkingState({
  message = 'Chimmy is thinking…',
  variant = 'dots',
  className = '',
}: ChimmyThinkingStateProps) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 ${className}`}>
      {variant === 'spinner' && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
      )}
      {variant === 'dots' && <PulseDots />}
      {variant === 'pulse' && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-400 animate-pulse" />
      )}
      <p className="text-sm text-white/60 italic">{message}</p>
    </div>
  )
}
