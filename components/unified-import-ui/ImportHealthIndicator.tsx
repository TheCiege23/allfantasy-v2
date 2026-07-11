'use client'

/**
 * Phase 4.2 — Import health / completeness indicator.
 *
 * Renders a color-graded status pill + short detail from `deriveImportHealth`.
 * Pure presentational — the derivation lives in `import-health.ts` so it can be
 * unit-tested without the DOM.
 */
import { CheckCircle2, AlertTriangle, Circle, XCircle } from 'lucide-react'
import { deriveImportHealth, type ImportHealthInput } from './import-health'

const TONE_CLASSES: Record<'positive' | 'caution' | 'critical' | 'neutral', {
  bg: string
  border: string
  text: string
  dot: string
}> = {
  positive: {
    bg: 'bg-emerald-500/[0.08]',
    border: 'border-emerald-500/25',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]',
  },
  caution: {
    bg: 'bg-amber-500/[0.08]',
    border: 'border-amber-500/25',
    text: 'text-amber-300',
    dot: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]',
  },
  critical: {
    bg: 'bg-red-500/[0.08]',
    border: 'border-red-500/25',
    text: 'text-red-300',
    dot: 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]',
  },
  neutral: {
    bg: 'bg-white/[0.06]',
    border: 'border-white/12',
    text: 'text-white/80',
    dot: 'bg-white/40',
  },
}

function Icon({ tone, className }: { tone: 'positive' | 'caution' | 'critical' | 'neutral'; className: string }) {
  if (tone === 'positive') return <CheckCircle2 className={className} aria-hidden />
  if (tone === 'caution') return <AlertTriangle className={className} aria-hidden />
  if (tone === 'critical') return <XCircle className={className} aria-hidden />
  return <Circle className={className} aria-hidden />
}

export function ImportHealthIndicator({ input }: { input: ImportHealthInput }) {
  const health = deriveImportHealth(input)
  const t = TONE_CLASSES[health.tone]
  return (
    <div
      data-testid="import-health-indicator"
      data-health-status={health.status}
      className={`warroom-card warroom-fade-in-stagger flex items-start gap-3 rounded-2xl border ${t.border} ${t.bg} p-4`}
    >
      <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.bg} ${t.border} border`}>
        <Icon tone={health.tone} className={`h-4 w-4 ${t.text}`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${t.dot}`} aria-hidden />
          <p className={`text-[13px] font-black uppercase tracking-wide ${t.text}`}>{health.label}</p>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-white/70">{health.detail}</p>
      </div>
    </div>
  )
}
