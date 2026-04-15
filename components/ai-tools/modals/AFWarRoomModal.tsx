'use client'

import { useState } from 'react'
import {
  Shield,
  CheckCircle2,
  Circle,
  Target,
  TrendingUp,
  TrendingDown,
  Gem,
  Zap,
} from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type SeasonStance = 'contender' | 'retool' | 'rebuild'

type ActionItem = {
  id: string
  label: string
  horizon: 'now' | 'week' | 'season'
}

const STANCE_STYLES: Record<SeasonStance, { label: string; text: string; bg: string; border: string; icon: React.ReactNode }> = {
  contender: {
    label: 'Contender',
    text: 'text-amber-200',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <Gem className="h-3.5 w-3.5" />,
  },
  retool: {
    label: 'Retool',
    text: 'text-violet-200',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    icon: <Target className="h-3.5 w-3.5" />,
  },
  rebuild: {
    label: 'Rebuild',
    text: 'text-sky-200',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    icon: <Zap className="h-3.5 w-3.5" />,
  },
}

/**
 * Executive premium signature: the most visually distinct modal in the
 * system. Large hero with a "season stance" read (contender / retool /
 * rebuild), a 2x2 strategy framework, and an interactive checkbox-style
 * AI action checklist across now/week/season horizons.
 *
 * TODO: wire to `/api/league/war-room?leagueId=…` when ready. UI expects
 * `{ stance: SeasonStance, strengths: string[], weaknesses: string[],
 * shortTerm: string, longTerm: string, actions: ActionItem[] }`.
 */
export function AFWarRoomModal({
  open,
  onClose,
  leagueName,
}: {
  open: boolean
  onClose: () => void
  leagueName: string
}) {
  const stance: SeasonStance = 'contender' // placeholder — real API will set
  const stanceStyle = STANCE_STYLES[stance]
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="AF War Room"
      subtitle="Executive strategy command center"
      accentColor="rose"
      icon={<Shield className="h-5 w-5" />}
      chimmyPrompt={`Give me a full strategic analysis and action plan for ${leagueName}`}
    >
      {/* Premium hero — biggest surface in the system, confirms the executive feel */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.12] via-violet-500/[0.06] to-transparent">
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-rose-300/70">
              Season Stance
            </p>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${stanceStyle.bg} ${stanceStyle.border} ${stanceStyle.text}`}
            >
              {stanceStyle.icon}
              {stanceStyle.label}
            </div>
          </div>
          <p className="mt-2 text-[17px] font-black leading-tight tracking-tight text-white/95">
            {leagueName}: push for the title.
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
            Roster core is elite at RB and WR, but the schedule tightens in weeks 12-14. Execute
            short-term moves now to secure a bye, then play the long game at the deadline.
          </p>
        </div>
      </div>

      {/* Strategy framework — 2x2 grid */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
        Strategy Framework
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <StrategyCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          title="Strengths"
          items={['Elite RB1/RB2 duo', 'Consistent WR core', 'Top-5 schedule']}
          accent="emerald"
        />
        <StrategyCard
          icon={<TrendingDown className="h-4 w-4 text-red-400" />}
          title="Weaknesses"
          items={['TE depth fragile', 'Bye week clustering', 'No elite QB2']}
          accent="red"
        />
        <StrategyCard
          icon={<Target className="h-4 w-4 text-cyan-400" />}
          title="Short-Term"
          items={['Stream TE this week', 'Lock in WR2 start', 'Monitor RB touches']}
          accent="cyan"
        />
        <StrategyCard
          icon={<Shield className="h-4 w-4 text-violet-400" />}
          title="Long-Term"
          items={['Deadline: trade for TE1', 'Stash rookie RB', 'Plan for week 14 bye']}
          accent="violet"
        />
      </div>

      {/* Interactive action checklist */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
        AI Action Checklist
      </p>
      <div className="space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        {PLACEHOLDER_ACTIONS.map((action) => {
          const done = checked.has(action.id)
          const horizonStyle = HORIZON_STYLES[action.horizon]
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => toggle(action.id)}
              className="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-white/[0.03]"
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/20" />
              )}
              <span
                className={`flex-1 text-[11px] leading-snug ${
                  done ? 'text-white/30 line-through' : 'text-white/70'
                }`}
              >
                {action.label}
              </span>
              <span
                className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest ${horizonStyle.bg} ${horizonStyle.text}`}
              >
                {horizonStyle.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Progress footer */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
        <span>Execution Progress</span>
        <span className="text-rose-300">
          {checked.size} / {PLACEHOLDER_ACTIONS.length}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-violet-500 transition-all duration-300"
          style={{ width: `${(checked.size / PLACEHOLDER_ACTIONS.length) * 100}%` }}
        />
      </div>
    </AIToolModalShell>
  )
}

// ── Strategy card ────────────────────────────────────────────────────

function StrategyCard({
  icon,
  title,
  items,
  accent,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
  accent: 'emerald' | 'red' | 'cyan' | 'violet'
}) {
  const bgMap: Record<string, string> = {
    emerald: 'border-emerald-500/10 bg-emerald-500/[0.03]',
    red: 'border-red-500/10 bg-red-500/[0.03]',
    cyan: 'border-cyan-500/10 bg-cyan-500/[0.03]',
    violet: 'border-violet-500/10 bg-violet-500/[0.03]',
  }
  return (
    <div className={`rounded-xl border p-3 ${bgMap[accent] ?? ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-bold text-white/80">{title}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-[10px] leading-snug text-white/50">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Placeholders ─────────────────────────────────────────────────────

const HORIZON_STYLES: Record<ActionItem['horizon'], { label: string; text: string; bg: string }> = {
  now: { label: 'Now', text: 'text-red-300', bg: 'bg-red-500/10' },
  week: { label: 'Week', text: 'text-amber-300', bg: 'bg-amber-500/10' },
  season: { label: 'Season', text: 'text-violet-300', bg: 'bg-violet-500/10' },
}

const PLACEHOLDER_ACTIONS: ActionItem[] = [
  { id: '1', label: 'Submit FAAB bid on top waiver RB', horizon: 'now' },
  { id: '2', label: 'Lock in TE streamer before Thursday', horizon: 'week' },
  { id: '3', label: 'Propose trade for WR2 upgrade', horizon: 'week' },
  { id: '4', label: 'Evaluate season-long schedule arc', horizon: 'season' },
  { id: '5', label: 'Plan playoff roster construction', horizon: 'season' },
]
