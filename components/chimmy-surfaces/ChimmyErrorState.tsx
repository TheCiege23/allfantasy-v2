'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export interface ChimmyErrorStateProps {
  message?: string
  detail?: string
  onRetry?: () => void
  className?: string
}

export default function ChimmyErrorState({
  message = "Chimmy couldn't load insights right now.",
  detail,
  onRetry,
  className = '',
}: ChimmyErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 text-center ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 border border-red-500/25">
        <AlertTriangle className="h-5 w-5 text-red-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{message}</p>
        {detail && <p className="mt-1 text-xs text-white/40 max-w-xs">{detail}</p>}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  )
}
