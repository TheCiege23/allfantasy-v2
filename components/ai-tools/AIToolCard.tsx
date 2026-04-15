'use client'

import type { AIToolCardConfig, AIToolAccent, FreshnessStatus } from './types'

// Re-export so existing grid imports `{ AIToolCardConfig }` from this file
// keep working without a churn-y import-path change.
export type { AIToolCardConfig } from './types'

// ── Accent palette ───────────────────────────────────────────────────
// Each tool picks a lane color; the card renders a muted version in the
// default state and a pronounced glow + stronger border on hover.

type AccentStyle = {
  border: string
  hoverBorder: string
  iconBg: string
  iconGlow: string
  ring: string
  dot: string
  insightBg: string
  insightText: string
  freshnessBg: string
  freshnessText: string
}

const ACCENT_STYLES: Record<AIToolAccent, AccentStyle> = {
  cyan: {
    border: 'border-cyan-500/[0.10]',
    hoverBorder: 'group-hover:border-cyan-400/35',
    iconBg: 'bg-cyan-500/10 text-cyan-300',
    iconGlow: 'group-hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)]',
    ring: 'group-hover:ring-cyan-400/25',
    dot: 'bg-cyan-400',
    insightBg: 'bg-cyan-500/[0.05] border-cyan-500/10',
    insightText: 'text-cyan-100/70',
    freshnessBg: 'bg-cyan-500/[0.08]',
    freshnessText: 'text-cyan-200/70',
  },
  purple: {
    border: 'border-purple-500/[0.10]',
    hoverBorder: 'group-hover:border-purple-400/35',
    iconBg: 'bg-purple-500/10 text-purple-300',
    iconGlow: 'group-hover:shadow-[0_0_24px_-6px_rgba(168,85,247,0.55)]',
    ring: 'group-hover:ring-purple-400/25',
    dot: 'bg-purple-400',
    insightBg: 'bg-purple-500/[0.05] border-purple-500/10',
    insightText: 'text-purple-100/70',
    freshnessBg: 'bg-purple-500/[0.08]',
    freshnessText: 'text-purple-200/70',
  },
  amber: {
    border: 'border-amber-500/[0.10]',
    hoverBorder: 'group-hover:border-amber-400/35',
    iconBg: 'bg-amber-500/10 text-amber-300',
    iconGlow: 'group-hover:shadow-[0_0_24px_-6px_rgba(245,158,11,0.55)]',
    ring: 'group-hover:ring-amber-400/25',
    dot: 'bg-amber-400',
    insightBg: 'bg-amber-500/[0.05] border-amber-500/10',
    insightText: 'text-amber-100/70',
    freshnessBg: 'bg-amber-500/[0.08]',
    freshnessText: 'text-amber-200/70',
  },
  emerald: {
    border: 'border-emerald-500/[0.10]',
    hoverBorder: 'group-hover:border-emerald-400/35',
    iconBg: 'bg-emerald-500/10 text-emerald-300',
    iconGlow: 'group-hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.55)]',
    ring: 'group-hover:ring-emerald-400/25',
    dot: 'bg-emerald-400',
    insightBg: 'bg-emerald-500/[0.05] border-emerald-500/10',
    insightText: 'text-emerald-100/70',
    freshnessBg: 'bg-emerald-500/[0.08]',
    freshnessText: 'text-emerald-200/70',
  },
  red: {
    border: 'border-red-500/[0.10]',
    hoverBorder: 'group-hover:border-red-400/35',
    iconBg: 'bg-red-500/10 text-red-300',
    iconGlow: 'group-hover:shadow-[0_0_24px_-6px_rgba(239,68,68,0.55)]',
    ring: 'group-hover:ring-red-400/25',
    dot: 'bg-red-400',
    insightBg: 'bg-red-500/[0.05] border-red-500/10',
    insightText: 'text-red-100/70',
    freshnessBg: 'bg-red-500/[0.08]',
    freshnessText: 'text-red-200/70',
  },
  rose: {
    border: 'border-rose-500/[0.10]',
    hoverBorder: 'group-hover:border-rose-400/35',
    iconBg: 'bg-rose-500/10 text-rose-300',
    iconGlow: 'group-hover:shadow-[0_0_24px_-6px_rgba(244,63,94,0.55)]',
    ring: 'group-hover:ring-rose-400/25',
    dot: 'bg-rose-400',
    insightBg: 'bg-rose-500/[0.05] border-rose-500/10',
    insightText: 'text-rose-100/70',
    freshnessBg: 'bg-rose-500/[0.08]',
    freshnessText: 'text-rose-200/70',
  },
  violet: {
    border: 'border-violet-500/[0.10]',
    hoverBorder: 'group-hover:border-violet-400/35',
    iconBg: 'bg-violet-500/10 text-violet-300',
    iconGlow: 'group-hover:shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)]',
    ring: 'group-hover:ring-violet-400/25',
    dot: 'bg-violet-400',
    insightBg: 'bg-violet-500/[0.05] border-violet-500/10',
    insightText: 'text-violet-100/70',
    freshnessBg: 'bg-violet-500/[0.08]',
    freshnessText: 'text-violet-200/70',
  },
  sky: {
    border: 'border-sky-500/[0.10]',
    hoverBorder: 'group-hover:border-sky-400/35',
    iconBg: 'bg-sky-500/10 text-sky-300',
    iconGlow: 'group-hover:shadow-[0_0_24px_-6px_rgba(14,165,233,0.55)]',
    ring: 'group-hover:ring-sky-400/25',
    dot: 'bg-sky-400',
    insightBg: 'bg-sky-500/[0.05] border-sky-500/10',
    insightText: 'text-sky-100/70',
    freshnessBg: 'bg-sky-500/[0.08]',
    freshnessText: 'text-sky-200/70',
  },
}

// ── Status pill helpers ──────────────────────────────────────────────

function statusLabel(config: AIToolCardConfig): string {
  if (config.status === 'new') return 'New'
  if (config.status === 'loading') return 'Syncing'
  return 'Ready'
}

function statusDotAnimation(status: FreshnessStatus | undefined): string {
  // The little dot in the top-right of each card. Live = pulsing; recent =
  // steady; stale/idle = dim.
  switch (status) {
    case 'live':
      return 'animate-pulse opacity-90'
    case 'recent':
      return 'opacity-80'
    case 'stale':
      return 'opacity-40'
    default:
      return 'opacity-60'
  }
}

// ── Card component ──────────────────────────────────────────────────

export function AIToolCard({
  config,
  onClick,
}: {
  config: AIToolCardConfig
  onClick: () => void
}) {
  const accent = ACCENT_STYLES[config.accent] ?? ACCENT_STYLES.cyan
  const label = statusLabel(config)
  const freshness = config.freshness
  const hasInsight = Boolean(config.insight && config.insight.trim().length > 0)

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        // Layout
        'group relative flex w-full flex-col rounded-2xl border p-4 text-left',
        // Base surface
        'bg-[#0b1020]/85 backdrop-blur-sm',
        accent.border,
        // Interaction
        'transition-all duration-200 ease-out',
        accent.hoverBorder,
        accent.iconGlow,
        'hover:-translate-y-0.5 hover:bg-[#0d1328]',
        'focus-visible:outline-none focus-visible:ring-2',
        accent.ring,
        'active:scale-[0.985]',
      ].join(' ')}
      data-testid={`ai-tool-card-${config.id}`}
    >
      {/* Top-right: pulsing status dot + label */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${accent.dot} ${statusDotAnimation(freshness?.status)}`}
        />
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/25">
          {label}
        </span>
      </div>

      {/* Icon tile — strong treatment, scales + glows on hover */}
      <div
        className={[
          'flex h-10 w-10 items-center justify-center rounded-xl',
          accent.iconBg,
          'transition-all duration-200',
          'group-hover:scale-[1.06]',
        ].join(' ')}
      >
        {config.icon}
      </div>

      {/* Title + subtitle block */}
      <div className="mt-3 flex-1">
        <h3 className="text-[13px] font-bold tracking-tight text-white/90">
          {config.title}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/35">
          {config.subtitle}
        </p>
      </div>

      {/* Optional preview insight — a one-liner of actual data */}
      {hasInsight ? (
        <div
          className={`mt-3 rounded-lg border px-2 py-1.5 text-[9px] font-medium leading-snug ${accent.insightBg} ${accent.insightText} line-clamp-2`}
        >
          {config.insight}
        </div>
      ) : null}

      {/* Freshness pill — only shown when we have a real live/recent signal */}
      {freshness && freshness.status !== 'idle' ? (
        <div
          className={`mt-2 inline-flex self-start items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${accent.freshnessBg} ${accent.freshnessText}`}
        >
          <span
            aria-hidden
            className={`inline-block h-1 w-1 rounded-full ${accent.dot} ${
              freshness.status === 'live' ? 'animate-pulse' : ''
            }`}
          />
          {freshness.label}
        </div>
      ) : null}
    </button>
  )
}
