'use client'

import { Scale, ClipboardList, Target, MessageCircle, TrendingUp, Zap } from 'lucide-react'

const AI_VALUES = [
  {
    title: 'Trade Fairness Score',
    description: 'Paste any trade and get an instant AI fairness score. See who wins, who loses, and get smarter counter-offer suggestions.',
    icon: Scale,
    accent: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    title: 'Waiver Recommendations',
    description: 'Get a personalized add/drop list every week. AI factors your roster needs, injury reports, and upcoming schedules.',
    icon: ClipboardList,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    title: 'Live Draft Picks',
    description: 'Real-time AI suggestions during your mock or live draft. Know the value of every pick at every position.',
    icon: Target,
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    title: 'Chimmy — Your AI Coach',
    description: 'Ask anything: "Should I start Mahomes or Lamar?" or "Who should I drop?" Chimmy knows your league, your roster, and the matchups.',
    icon: MessageCircle,
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    title: 'Dynasty Rankings',
    description: 'Long-term player values built for dynasty leagues. Age curves, contract data, and prospect grades all in one place.',
    icon: TrendingUp,
    accent: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    title: 'War Room Tools',
    description: 'Everything you need pre-draft: mock drafts, ADP trends, tier boards, and keeper analysis — all AI-enhanced.',
    icon: Zap,
    accent: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
] as const

export default function LandingAIValue() {
  return (
    <section className="border-t px-4 py-14 sm:px-6 sm:py-20" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 15%, transparent)' }}>
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-400 mb-4">
            <Zap className="h-3.5 w-3.5" />
            Powered by AI
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text)' }}>
            AI that gives you the edge
          </h2>
          <p className="mt-2 max-w-md mx-auto text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
            Stop guessing. AllFantasy&apos;s AI coaches you through every decision — from draft day to the championship.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_VALUES.map(({ title, description, icon: Icon, accent, bg, border }) => (
            <div
              key={title}
              className={`rounded-2xl border ${border} ${bg} p-5 flex flex-col gap-3`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${accent}`} />
              </div>
              <div>
                <div className={`text-sm font-semibold ${accent}`}>{title}</div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
