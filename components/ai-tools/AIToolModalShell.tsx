'use client'

import { useEffect, useRef } from 'react'
import { X, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'

export type AIToolModalShellProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  accentColor?: string
  icon?: React.ReactNode
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  onRefresh?: () => void
  refreshing?: boolean
  chimmyPrompt?: string
  chimmyContext?: Record<string, unknown>
  actions?: React.ReactNode
  children: React.ReactNode
}

export function AIToolModalShell({
  open,
  onClose,
  title,
  subtitle,
  accentColor = 'cyan',
  icon,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'No data available yet.',
  onRefresh,
  refreshing = false,
  chimmyPrompt,
  chimmyContext,
  actions,
  children,
}: AIToolModalShellProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const accentMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
    cyan: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', text: 'text-cyan-400', glow: 'shadow-[0_0_40px_rgba(6,182,212,0.06)]' },
    purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/5', text: 'text-purple-400', glow: 'shadow-[0_0_40px_rgba(168,85,247,0.06)]' },
    amber: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-400', glow: 'shadow-[0_0_40px_rgba(245,158,11,0.06)]' },
    emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-400', glow: 'shadow-[0_0_40px_rgba(16,185,129,0.06)]' },
    red: { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-400', glow: 'shadow-[0_0_40px_rgba(239,68,68,0.06)]' },
    rose: { border: 'border-rose-500/20', bg: 'bg-rose-500/5', text: 'text-rose-400', glow: 'shadow-[0_0_40px_rgba(244,63,94,0.06)]' },
    violet: { border: 'border-violet-500/20', bg: 'bg-violet-500/5', text: 'text-violet-400', glow: 'shadow-[0_0_40px_rgba(139,92,246,0.06)]' },
    sky: { border: 'border-sky-500/20', bg: 'bg-sky-500/5', text: 'text-sky-400', glow: 'shadow-[0_0_40px_rgba(14,165,233,0.06)]' },
  }

  const accent = accentMap[accentColor] ?? accentMap.cyan

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/[0.08] bg-[#080d1a] sm:max-w-xl sm:rounded-2xl ${accent.glow}`}
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Header */}
        <div className={`shrink-0 border-b ${accent.border} px-5 pb-4 pt-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}>
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-[16px] font-black tracking-tight text-white">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[11px] text-white/40">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/40 transition hover:bg-white/[0.06] hover:text-white/60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/40 transition hover:bg-white/[0.06] hover:text-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent]">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent.bg}`}>
                <Loader2 className={`h-6 w-6 animate-spin ${accent.text}`} />
              </div>
              <p className="mt-4 text-[13px] text-white/40">Analyzing...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
                <X className="h-6 w-6 text-red-400" />
              </div>
              <p className="mt-4 text-[13px] text-red-300/80">{error}</p>
              {onRefresh && (
                <button type="button" onClick={onRefresh} className="mt-3 text-[12px] font-semibold text-cyan-300 hover:text-cyan-200">
                  Try again
                </button>
              )}
            </div>
          ) : empty ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent.bg}`}>
                {icon}
              </div>
              <p className="mt-4 text-[13px] text-white/40">{emptyMessage}</p>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/[0.06] px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {actions}
            </div>
            {chimmyPrompt && (
              <Link
                href={getChimmyChatHrefWithPrompt(chimmyPrompt, chimmyContext ?? {})}
                className={`inline-flex items-center gap-1.5 rounded-lg ${accent.bg} ${accent.border} border px-3 py-1.5 text-[11px] font-semibold ${accent.text} transition hover:brightness-110`}
              >
                Ask Chimmy
              </Link>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
