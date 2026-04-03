'use client'

type AIShortcutsGridProps = {
  leagueName?: string
  onShortcut: (prompt: string) => void
}

type ShortcutDef = {
  icon: string
  label: string
  description: string
  buildPrompt: (leagueLabel: string) => string
}

const SHORTCUTS: ShortcutDef[] = [
  {
    icon: '📊',
    label: 'Start/Sit',
    description: 'Who should I start?',
    buildPrompt: (L) => `Help me with my start/sit decisions for ${L}`,
  },
  {
    icon: '🔄',
    label: 'Trade Value',
    description: 'Evaluate a trade',
    buildPrompt: (L) => `Analyze a trade for ${L}`,
  },
  {
    icon: '⚠️',
    label: 'Waiver Wire',
    description: 'Best pickups',
    buildPrompt: (L) => `Who should I add off waivers in ${L}?`,
  },
  {
    icon: '📈',
    label: 'Trending Players',
    description: "Who's hot/cold",
    buildPrompt: () => 'Which players are trending up or down?',
  },
  {
    icon: '🏆',
    label: 'Power Rankings',
    description: "How's my team?",
    buildPrompt: (L) => `Give me power rankings for ${L}`,
  },
  {
    icon: '🩺',
    label: 'Injury Impact',
    description: 'Assess my injuries',
    buildPrompt: (L) => `Analyze injury impacts on my roster in ${L}`,
  },
]

export function AIShortcutsGrid({ leagueName, onShortcut }: AIShortcutsGridProps) {
  const leagueLabel = leagueName?.trim() || 'my league'

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-normal uppercase tracking-widest text-white/30">AI TOOLS</p>
        <button
          type="button"
          onClick={() => {
            const prompt = `Give me a quick overview of what you can help with in ${leagueLabel}.`
            onShortcut(prompt)
            window.dispatchEvent(new CustomEvent('af-chimmy-shortcut', { detail: { prompt } }))
          }}
          className="text-[11px] font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          Ask Chimmy →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              const prompt = s.buildPrompt(leagueLabel)
              onShortcut(prompt)
              window.dispatchEvent(new CustomEvent('af-chimmy-shortcut', { detail: { prompt } }))
            }}
            className="cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 text-left transition-all hover:border-cyan-500/30 hover:bg-white/[0.07]"
          >
            <div className="text-[18px] leading-none">{s.icon}</div>
            <p className="mt-2 text-[11px] font-semibold text-white/80">{s.label}</p>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-white/40">{s.description}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
