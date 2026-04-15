'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftRight,
  Crosshair,
  Crown,
  Flame,
  Shield,
  ShieldAlert,
  Swords,
  Target,
  Sparkles,
} from 'lucide-react'
import { getChimmyChatHref } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import type { UserLeague } from '@/app/dashboard/types'
import { AIToolCard } from './AIToolCard'
import type { AIToolCardConfig } from './types'
import { StartSitModal } from './modals/StartSitModal'
import { TradeValueModal } from './modals/TradeValueModal'
import { WaiverWireModal } from './modals/WaiverWireModal'
import { TrendingPlayersModal } from './modals/TrendingPlayersModal'
import { PowerRankingsModal } from './modals/PowerRankingsModal'
import { InjuryImpactModal } from './modals/InjuryImpactModal'
import { AFWarRoomModal } from './modals/AFWarRoomModal'
import { MatchupPrepModal } from './modals/MatchupPrepModal'

type ToolId =
  | 'startSit'
  | 'trade'
  | 'waiver'
  | 'trending'
  | 'power'
  | 'injury'
  | 'warRoom'
  | 'matchupPrep'

/**
 * Tool card configs. `insight` is a realistic placeholder preview — when
 * real data is available per tool, swap these out for live values. Same
 * for `freshness` — these are currently static "Ready" states; wire to
 * real recency signals per tool as backends come online.
 */
const TOOL_CONFIGS: (AIToolCardConfig & { id: ToolId })[] = [
  {
    id: 'startSit',
    title: 'Start/Sit',
    subtitle: 'Tactical lineup decisions',
    icon: <Crosshair className="h-[18px] w-[18px]" />,
    accent: 'cyan',
    insight: 'Flex swap flagged · 2 lineup issues',
    freshness: { status: 'live', label: 'Live' },
  },
  {
    id: 'trade',
    title: 'Trade Value',
    subtitle: 'Evaluate and rebalance any deal',
    icon: <ArrowLeftRight className="h-[18px] w-[18px]" />,
    accent: 'purple',
    insight: 'Market trending +3 · fairness 52/100',
    freshness: { status: 'recent', label: '6m ago' },
  },
  {
    id: 'waiver',
    title: 'Waiver Wire',
    subtitle: 'Best pickups ranked by urgency',
    icon: <Target className="h-[18px] w-[18px]" />,
    accent: 'emerald',
    insight: '3 high-value adds · $14 FAAB median',
    freshness: { status: 'recent', label: '12m ago' },
  },
  {
    id: 'trending',
    title: 'Trending',
    subtitle: "Who's hot, who's cold",
    icon: <Flame className="h-[18px] w-[18px]" />,
    accent: 'amber',
    insight: '5 risers · 4 fallers this week',
    freshness: { status: 'live', label: 'Live' },
  },
  {
    id: 'power',
    title: 'Power Rankings',
    subtitle: 'League standings and momentum',
    icon: <Crown className="h-[18px] w-[18px]" />,
    accent: 'violet',
    insight: "You're #4 · ↑2 from last week",
    freshness: { status: 'recent', label: '1h ago' },
  },
  {
    id: 'injury',
    title: 'Injury Impact',
    subtitle: 'Roster availability risk',
    icon: <ShieldAlert className="h-[18px] w-[18px]" />,
    accent: 'red',
    insight: '2 questionable · 1 IR candidate',
    freshness: { status: 'live', label: 'Live' },
  },
  {
    id: 'warRoom',
    title: 'AF War Room',
    subtitle: 'Season strategy command center',
    icon: <Shield className="h-[18px] w-[18px]" />,
    accent: 'rose',
    status: 'new',
    insight: 'Contender read · 4 action items',
    freshness: { status: 'recent', label: 'New' },
  },
  {
    id: 'matchupPrep',
    title: 'Matchup Prep',
    subtitle: 'Opponent scouting + game plan',
    icon: <Swords className="h-[18px] w-[18px]" />,
    accent: 'sky',
    insight: '+4.2 pt edge · 64% win chance',
    freshness: { status: 'recent', label: '20m ago' },
  },
]

export function AIToolsGrid({ leagues }: { leagues: UserLeague[] }) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)

  const activeLeague = useMemo(() => leagues[0] ?? null, [leagues])
  const leagueId = activeLeague?.id ?? ''
  const leagueName = activeLeague?.name ?? 'my league'
  const sport = String(activeLeague?.sport ?? 'NFL')

  return (
    <section className="space-y-4" data-testid="ai-tools-grid">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 ring-1 ring-white/[0.06]">
            <Sparkles className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-tight text-white/90">AI Tools</p>
            <p className="text-[10px] leading-none text-white/35">
              Mini AI workspaces — tap to open
            </p>
          </div>
        </div>
        <Link
          href={getChimmyChatHref({ source: 'dashboard' })}
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-500/15"
        >
          Ask Chimmy →
        </Link>
      </div>

      {/* Tool card grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {TOOL_CONFIGS.map((config) => (
          <AIToolCard
            key={config.id}
            config={config}
            onClick={() => setActiveTool(config.id)}
          />
        ))}
      </div>

      {/* Modals — one per tool, rendered unconditionally; internal `open` gate */}
      <StartSitModal
        open={activeTool === 'startSit'}
        onClose={() => setActiveTool(null)}
        leagueId={leagueId}
        leagueName={leagueName}
      />
      <TradeValueModal
        open={activeTool === 'trade'}
        onClose={() => setActiveTool(null)}
        leagueId={leagueId}
        leagueName={leagueName}
      />
      <WaiverWireModal
        open={activeTool === 'waiver'}
        onClose={() => setActiveTool(null)}
        leagueId={leagueId}
        leagueName={leagueName}
      />
      <TrendingPlayersModal
        open={activeTool === 'trending'}
        onClose={() => setActiveTool(null)}
        sport={sport}
      />
      <PowerRankingsModal
        open={activeTool === 'power'}
        onClose={() => setActiveTool(null)}
        leagueId={leagueId}
        leagueName={leagueName}
      />
      <InjuryImpactModal
        open={activeTool === 'injury'}
        onClose={() => setActiveTool(null)}
        sport={sport}
      />
      <AFWarRoomModal
        open={activeTool === 'warRoom'}
        onClose={() => setActiveTool(null)}
        leagueName={leagueName}
      />
      <MatchupPrepModal
        open={activeTool === 'matchupPrep'}
        onClose={() => setActiveTool(null)}
        leagueId={leagueId}
        leagueName={leagueName}
        sport={sport}
      />
    </section>
  )
}
