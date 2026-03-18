'use client'

/**
 * Displays IDP lineup warning from trade evaluation when present.
 */

import { AlertTriangle } from 'lucide-react'

interface Props {
  idpLineupWarning: string | null | undefined
  className?: string
}

export function IdpTradeLineupWarning({ idpLineupWarning, className = '' }: Props) {
  if (!idpLineupWarning || !idpLineupWarning.trim()) return null

  return (
    <div
      className={`flex gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-200 ${className}`}
      role="alert"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <span>{idpLineupWarning}</span>
    </div>
  )
}
