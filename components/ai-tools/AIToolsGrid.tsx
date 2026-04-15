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
import { AIToolCard, type AIToolCardConfig } from './AIToolCard'
import { StartSitModal } from './modals/StartSitModal'
import { TradeValueModal } from './modals/TradeValueModal'
import { WaiverWireModal } from './modals/WaiverWireModal'
import { TrendingPlayersModal } from './modals/TrendingPlayersModal'
import { PowerRankingsModal } from './modals/PowerRankingsModal'
import { InjuryImpactModal } from './modals/InjuryImpactModal'
import { AFWarRoomModal } from './modals/AFWarRoomModal'
import { MatchupPrepModal } from './modals/MatchupPrepModal'

type ToolId = 'startSit' | 'trade' | 'waiver' | 'trending' | 'power' | 'injury' | 'warRoom' | 'matchupPrep'

const TOOL_CONFIGS: AIToolCardConfig[] = [
  { id: 'startSit', title: 'Start/Sit', subtitle: 'Tactical lineup decisions', icon: <Crosshair className="h-4.5 w-4.5" />, accent: 'cyan' },
  { id: 'trade', title: 'Trade Value', subtitle: 'Market analysis console', icon: <ArrowLeftRight className="h-4.5 w-4.5" />, accent: 'purple' },
  { id: 'waiver', title: 'Waiver Wire', subtitle: 'Opportunity scanner', icon: <Target className="h-4.5 w-4.5" />, accent: 'emerald' },
  { id: 'trending', title: 'Trending', subtitle: 'Movement board', icon: <Flame className="h-4.5 w-4.5" />, accent: 'amber' },
  { id: 'power', title: 'Power Rankings', subtitle: 'League intelligence', icon: <Crown className="h-4.5 w-4.5" />, accent: 'violet' },
  { id: 'injury', title: 'Injury Impact', subtitle: 'Risk and availability', icon: <ShieldAlert className="h-4.5 w-4.5" />, accent: 'red' },
  { id: 'warRoom', title: 'AF War Room', subtitle: 'Executive strategy', icon: <Shield className="h-4.5 w-4.5" />, accent: 'rose', status: 'new' as const },
  { id: 'matchupPrep', title: 'Matchup Prep', subtitle: 'Pregame intelligence', icon: <Swords className="h-4.5 w-4.5" />, accent: 'sky' },
]

export function AIToolsGrid({ leagues }: { leagues: UserLeague[] }) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)

  const activeLeague = useMemo(() => leagues[0] ?? null, [leagues])
  const leagueId = activeLeague?.id ?? ''
  const leagueName = activeLeague?.name ?? 'my league'
  const sport = String(activeLeague?.sport ?? 'NFL')

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/15 to-purple-500/15">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-tight text-white/80">AI Tools</p>
            <p className="text-[9px] text-white/25">Intelligence at your fingertips</p>
          </div>
        </div>
        <Link
          href={getChimmyChatHref({ source: 'dashboard' })}
          className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.06] px-2.5 py-1 text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-500/10"
        >
          Ask Chimmy
        </Link>
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOOL_CONFIGS.map((config) => (
          <AIToolCard
            key={config.id}
            config={config}
            onClick={() => setActiveTool(config.id as ToolId)}
          />
        ))}
      </div>

      {/* Modals */}
      <StartSitModal open={activeTool === 'startSit'} onClose={() => setActiveTool(null)} leagueId={leagueId} leagueName={leagueName} />
      <TradeValueModal open={activeTool === 'trade'} onClose={() => setActiveTool(null)} leagueId={leagueId} leagueName={leagueName} />
      <WaiverWireModal open={activeTool === 'waiver'} onClose={() => setActiveTool(null)} leagueId={leagueId} leagueName={leagueName} />
      <TrendingPlayersModal open={activeTool === 'trending'} onClose={() => setActiveTool(null)} sport={sport} />
      <PowerRankingsModal open={activeTool === 'power'} onClose={() => setActiveTool(null)} leagueId={leagueId} leagueName={leagueName} />
      <InjuryImpactModal open={activeTool === 'injury'} onClose={() => setActiveTool(null)} sport={sport} />
      <AFWarRoomModal open={activeTool === 'warRoom'} onClose={() => setActiveTool(null)} leagueName={leagueName} />
      <MatchupPrepModal open={activeTool === 'matchupPrep'} onClose={() => setActiveTool(null)} leagueId={leagueId} leagueName={leagueName} sport={sport} />
    </section>
  )
}
