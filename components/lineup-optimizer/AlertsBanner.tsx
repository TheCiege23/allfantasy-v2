'use client'

import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AlertsBanner({ alerts }: { alerts: string[] }) {
  if (!alerts.length) return null
  return (
    <div className="space-y-2" data-testid="lineup-optimizer-alerts">
      {alerts.map((alert, i) => {
        const lower = alert.toLowerCase()
        const urgent = lower.includes('out') || lower.includes('unfilled') || lower.includes('blocked')
        const caution = lower.includes('questionable') || lower.includes('risk') || lower.includes('caution')
        const Icon = urgent ? AlertCircle : caution ? AlertTriangle : Info
        const tone = urgent
          ? 'border-red-400/30 bg-red-500/10 text-red-100'
          : caution
            ? 'border-amber-400/25 bg-amber-500/10 text-amber-100'
            : 'border-sky-400/25 bg-sky-500/10 text-sky-100'
        return (
          <div
            key={`${alert}-${i}`}
            className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-sm', tone)}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span>{alert}</span>
          </div>
        )
      })}
    </div>
  )
}
