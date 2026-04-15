'use client'

export type AIToolCardConfig = {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  accent: string
  preview?: string | null
  status?: 'ready' | 'loading' | 'new'
}

const accentStyles: Record<string, { border: string; iconBg: string; hoverBorder: string; statusDot: string }> = {
  cyan: { border: 'border-cyan-500/[0.08]', iconBg: 'bg-cyan-500/10 text-cyan-400', hoverBorder: 'hover:border-cyan-500/25', statusDot: 'bg-cyan-400' },
  purple: { border: 'border-purple-500/[0.08]', iconBg: 'bg-purple-500/10 text-purple-400', hoverBorder: 'hover:border-purple-500/25', statusDot: 'bg-purple-400' },
  amber: { border: 'border-amber-500/[0.08]', iconBg: 'bg-amber-500/10 text-amber-400', hoverBorder: 'hover:border-amber-500/25', statusDot: 'bg-amber-400' },
  emerald: { border: 'border-emerald-500/[0.08]', iconBg: 'bg-emerald-500/10 text-emerald-400', hoverBorder: 'hover:border-emerald-500/25', statusDot: 'bg-emerald-400' },
  red: { border: 'border-red-500/[0.08]', iconBg: 'bg-red-500/10 text-red-400', hoverBorder: 'hover:border-red-500/25', statusDot: 'bg-red-400' },
  rose: { border: 'border-rose-500/[0.08]', iconBg: 'bg-rose-500/10 text-rose-400', hoverBorder: 'hover:border-rose-500/25', statusDot: 'bg-rose-400' },
  violet: { border: 'border-violet-500/[0.08]', iconBg: 'bg-violet-500/10 text-violet-400', hoverBorder: 'hover:border-violet-500/25', statusDot: 'bg-violet-400' },
  sky: { border: 'border-sky-500/[0.08]', iconBg: 'bg-sky-500/10 text-sky-400', hoverBorder: 'hover:border-sky-500/25', statusDot: 'bg-sky-400' },
}

export function AIToolCard({ config, onClick }: { config: AIToolCardConfig; onClick: () => void }) {
  const s = accentStyles[config.accent] ?? accentStyles.cyan

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full rounded-2xl border ${s.border} bg-[#0b1020]/80 p-4 text-left transition-all duration-200 ${s.hoverBorder} hover:bg-[#0d1328] hover:shadow-lg active:scale-[0.98]`}
      data-testid={`ai-tool-card-${config.id}`}
    >
      {/* Status dot */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${s.statusDot} opacity-60`} />
        <span className="text-[8px] font-semibold uppercase tracking-widest text-white/20">
          {config.status === 'new' ? 'New' : 'Ready'}
        </span>
      </div>

      {/* Icon */}
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconBg} transition-transform duration-200 group-hover:scale-105`}>
        {config.icon}
      </div>

      {/* Title */}
      <h3 className="mt-3 text-[13px] font-bold tracking-tight text-white/90">{config.title}</h3>

      {/* Subtitle */}
      <p className="mt-0.5 text-[10px] leading-snug text-white/35">{config.subtitle}</p>

      {/* Micro preview */}
      {config.preview && (
        <p className="mt-2 line-clamp-1 rounded-md bg-white/[0.03] px-2 py-1 text-[9px] font-medium text-white/30">
          {config.preview}
        </p>
      )}
    </button>
  )
}
