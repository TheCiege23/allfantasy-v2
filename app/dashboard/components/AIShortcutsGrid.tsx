'use client'

import { useCallback, useState } from 'react'

type AIShortcutsGridProps = {
  leagueName?: string
  onShortcut: (prompt: string) => void
}

type ShortcutDef = {
  key: string
  icon: string
  label: string
  description: string
  buildPrompt: (leagueLabel: string) => string
  faq: string
}

const SHORTCUTS: ShortcutDef[] = [
  {
    key: 'start-sit',
    icon: '📊',
    label: 'Start/Sit',
    description: 'Who should I start?',
    buildPrompt: (L) => `Help me with my start/sit decisions for ${L}`,
    faq:
      "Tell Chimmy which players you're deciding between and your league's scoring settings. Chimmy analyzes matchup, recent form, and target share to give you a clear recommendation.",
  },
  {
    key: 'trade',
    icon: '🔄',
    label: 'Trade Value',
    description: 'Evaluate a trade',
    buildPrompt: (L) => `Analyze a trade for ${L}`,
    faq:
      'Paste or describe a trade offer. Chimmy evaluates both sides using dynasty/redraft values, your roster needs, and the other manager\'s historical performance.',
  },
  {
    key: 'waiver',
    icon: '⚠️',
    label: 'Waiver Wire',
    description: 'Best pickups',
    buildPrompt: (L) => `Who should I add off waivers in ${L}?`,
    faq:
      'Chimmy scans all available players in your league and ranks them by projected value, not just points. Considers matchup, snap share, and target share trends.',
  },
  {
    key: 'trending',
    icon: '📈',
    label: 'Trending Players',
    description: "Who's hot/cold",
    buildPrompt: () => 'Which players are trending up or down?',
    faq:
      "See who's rising or falling in value across all fantasy platforms based on recent news, snap counts, and injury reports.",
  },
  {
    key: 'power',
    icon: '🏆',
    label: 'Power Rankings',
    description: "How's my team?",
    buildPrompt: (L) => `Give me power rankings for ${L}`,
    faq:
      "Chimmy calculates your team's true strength score based on roster quality, upcoming schedule, and positional depth — not just record.",
  },
  {
    key: 'injury',
    icon: '🩺',
    label: 'Injury Impact',
    description: 'Assess my injuries',
    buildPrompt: (L) => `Analyze injury impacts on my roster in ${L}`,
    faq:
      'Tells you exactly how each injury affects your team: who to drop, who to pick up, and what Chimmy recommends as the replacement.',
  },
]

export function AIShortcutsGrid({ leagueName, onShortcut }: AIShortcutsGridProps) {
  const leagueLabel = leagueName?.trim() || 'my league'
  const [openFaqKey, setOpenFaqKey] = useState<string | null>(null)

  const toggleFaq = useCallback((key: string) => {
    setOpenFaqKey((k) => (k === key ? null : key))
  }, [])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30">AI TOOLS</p>
        <button
          type="button"
          onClick={() => {
            const prompt = `Give me a quick overview of what you can help with in ${leagueLabel}.`
            onShortcut(prompt)
            window.dispatchEvent(new CustomEvent('af-chimmy-shortcut', { detail: { prompt } }))
          }}
          className="text-[12px] font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          Ask Chimmy →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="relative">
            <button
              type="button"
              onClick={() => {
                const prompt = s.buildPrompt(leagueLabel)
                onShortcut(prompt)
                window.dispatchEvent(new CustomEvent('af-chimmy-shortcut', { detail: { prompt } }))
              }}
              className="relative w-full cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 pb-2 pr-9 text-left transition-all hover:border-cyan-500/30 hover:bg-white/[0.07]"
            >
              <div className="text-[18px] leading-none">{s.icon}</div>
              <p className="mt-2 text-[13px] font-semibold text-white/80">{s.label}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-white/40">{s.description}</p>
            </button>
            <button
              type="button"
              aria-label={`How ${s.label} works`}
              onClick={(e) => {
                e.stopPropagation()
                toggleFaq(s.key)
              }}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.05] text-[9px] text-white/30 transition-colors hover:bg-white/[0.10] hover:text-white/60"
            >
              ?
            </button>
            {openFaqKey === s.key ? (
              <div className="mt-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px] leading-snug text-white/55">
                {s.faq}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
