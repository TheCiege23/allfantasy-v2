'use client'

import React from 'react'
import { ShieldAlert } from 'lucide-react'

export type ChimmyRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ChimmyRiskBadgeProps {
  level: ChimmyRiskLevel
  label?: string
  className?: string
}

const LEVEL_STYLES: Record<ChimmyRiskLevel, { badge: string; icon: string }> = {
  low:      { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: 'text-emerald-400' },
  medium:   { badge: 'bg-amber-500/20  text-amber-300  border-amber-500/30',  icon: 'text-amber-400'  },
  high:     { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: 'text-orange-400' },
  critical: { badge: 'bg-red-500/20    text-red-300    border-red-500/30',    icon: 'text-red-400'    },
}

const DEFAULT_LABELS: Record<ChimmyRiskLevel, string> = {
  low:      'Low Risk',
  medium:   'Moderate Risk',
  high:     'High Risk',
  critical: 'Critical Risk',
}

export default function ChimmyRiskBadge({ level, label, className = '' }: ChimmyRiskBadgeProps) {
  const styles = LEVEL_STYLES[level]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${styles.badge} ${className}`}
    >
      <ShieldAlert className={`h-3 w-3 ${styles.icon}`} />
      {label ?? DEFAULT_LABELS[level]}
    </span>
  )
}
