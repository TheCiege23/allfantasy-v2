'use client'

import React from 'react'
import { Bell, X } from 'lucide-react'

export interface ChimmyNotification {
  id: string
  message: string
  /** Severity affects icon/color */
  severity?: 'info' | 'warning' | 'success' | 'critical'
  /** Optional CTA */
  ctaLabel?: string
  onCta?: () => void
}

export interface ChimmyNotificationRendererProps {
  notifications: ChimmyNotification[]
  onDismiss?: (id: string) => void
  className?: string
}

const SEVERITY_STYLES: Record<NonNullable<ChimmyNotification['severity']>, string> = {
  info:     'border-blue-500/30 bg-blue-500/10 text-blue-200',
  warning:  'border-amber-500/30 bg-amber-500/10 text-amber-200',
  success:  'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  critical: 'border-red-500/30 bg-red-500/10 text-red-200',
}

export default function ChimmyNotificationRenderer({
  notifications,
  onDismiss,
  className = '',
}: ChimmyNotificationRendererProps) {
  if (notifications.length === 0) return null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {notifications.map((n) => {
        const styles = SEVERITY_STYLES[n.severity ?? 'info']
        return (
          <div key={n.id} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${styles}`}>
            <Bell className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 leading-relaxed">{n.message}</p>
            <div className="flex items-center gap-2 shrink-0">
              {n.ctaLabel && n.onCta && (
                <button
                  onClick={n.onCta}
                  className="rounded-lg bg-white/15 px-2 py-0.5 text-xs font-medium hover:bg-white/20 transition-colors"
                >
                  {n.ctaLabel}
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(n.id)}
                  className="rounded-lg p-1 hover:bg-white/10 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
