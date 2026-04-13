'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

export interface ChimmyLauncherButtonProps {
  /** Label shown in the button */
  label?: string
  /** Notification dot (e.g. new insight available) */
  hasNotification?: boolean
  onClick?: () => void
  className?: string
}

export default function ChimmyLauncherButton({
  label = 'Ask Chimmy',
  hasNotification = false,
  onClick,
  className = '',
}: ChimmyLauncherButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-indigo-500 active:scale-95 transition-all duration-150 ${className}`}
    >
      <Sparkles className="h-4 w-4" />
      {label}
      {hasNotification && (
        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-slate-900" />
      )}
    </button>
  )
}
