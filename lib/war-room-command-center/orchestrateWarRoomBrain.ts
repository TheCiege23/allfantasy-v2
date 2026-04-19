import 'server-only'

import type { LineupActionItem, LineupActionSummaryPayload } from '@/lib/lineup-actions/types'
import type { InjuryImpactDashboardResult } from '@/lib/injury-impact-dashboard/types'
import type { PowerRankingsDashboardResult } from '@/lib/power-rankings-dashboard/types'
import type { WaiverIntelligenceResult } from '@/lib/ai-tools-waiver/waiver-intelligence'
import type { TrendPlayerCard, TrendingDashboardResult } from '@/lib/trending-players/types'
import type { StartSitAnalyzeResult } from '@/lib/ai-tools-start-sit/runStartSitAnalysis'
import type { MatchupPrepDashboardResult } from '@/lib/matchup-prep-dashboard/types'
import { parseTrendPlayerId } from '@/lib/trending-players/parseTrendPlayerId'
import type {
  WarRoomActionItem,
  WarRoomActionSource,
  WarRoomConflict,
  WarRoomIngestionRow,
  WarRoomLinkToolId,
  WarRoomOrchestrationMeta,
  WarRoomStrategyId,
  WarRoomToggles,
} from './types'

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function normPlayerKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function canonicalPlayerKey(rawId: string | undefined): string {
  if (!rawId?.trim()) return ''
  const { platformId } = parseTrendPlayerId(rawId)
  return (platformId || rawId).trim().toLowerCase()
}

/** Ground War Room copy in deterministic trending fields (structured why + league fit), not snippet-only. */
function formatTrendPlayerDetail(card: TrendPlayerCard): string {
  const bits: string[] = []
  if (card.actionRecommendation) {
    bits.push(`Suggested stance: ${card.actionRecommendation}.`)
  }
  if (card.leagueRelevance && card.leagueRelevance !== 'unknown') {
    bits.push(`League fit: ${card.leagueRelevance.replace(/_/g, ' ')}.`)
  }
  if (card.projectedFantasyPoints != null && Number.isFinite(card.projectedFantasyPoints)) {
    bits.push(`League-scored projection snapshot ~${card.projectedFantasyPoints} pts.`)
  }
  if (card.structuredWhy?.length) {
    bits.push(card.structuredWhy.slice(0, 2).join(' '))
  }
  if (bits.length === 0) return card.snippet
  return `${card.snippet} ${bits.join(' ')}`.trim()
}

function urgencyTierFromScore(u: number): 'critical' | 'high' | 'medium' | 'low' {
  if (u >= 85) return 'critical'
  if (u >= 70) return 'high'
  if (u >= 50) return 'medium'
  return 'low'
}

function linkToolForLineupAction(a: LineupActionItem): WarRoomLinkToolId {
  switch (a.sourceModule) {
    case 'MatchupPrep':
      return 'matchupPrep'
    case 'InjuryImpact':
      return 'injury'
    case 'AFWarRoom':
      return 'warRoom'
    default:
      break
  }
  const msg = `${a.message} ${a.recommendedAction ?? ''}`.toLowerCase()
  if (msg.includes('trade') || a.reasonType === 'war_room') return 'trade'
  if (msg.includes('waiver')) return 'waiver'
  return 'startSit'
}

function urgencyFromLineupAction(a: LineupActionItem): number {
  const tier =
    a.urgency === 'urgent' ? 88 : a.urgency === 'soon' ? 74 : a.urgency === 'normal' ? 58 : 42
  const sev = a.severity === 'critical' ? 12 : a.severity === 'warning' ? 6 : 0
  return clamp(tier + sev, 28, 98)
}

type MutableAction = WarRoomActionItem & {
  _keys: string[]
  _playerIds: string[]
}

function stripInternal(m: MutableAction): WarRoomActionItem {
  const { _keys: _rk, _playerIds: _rp, ...rest } = m
  return rest
}

/** Collect structured candidates from each enabled tool (deterministic, data-grounded). */
export function orchestrateWarRoomBrain(args: {
  toggles: WarRoomToggles
  strategyMode: WarRoomStrategyId
  startSit: StartSitAnalyzeResult | null
  waiver: WaiverIntelligenceResult | null
  injury: InjuryImpactDashboardResult | null
  trending: TrendingDashboardResult | null
  power: PowerRankingsDashboardResult | null
  matchupPrep: MatchupPrepDashboardResult | null
  todayLineup: LineupActionSummaryPayload | null
  /** From `loadTradeValueWarRoomContext` — league scoring + team linkage. */
  tradeValue: Record<string, unknown> | null
  leagueScoringNote: string | null
  serverTimeIso: string
  analysisMode: 'league' | 'portfolio'
  timeSummary: string | null
  leagueScoringDigest: string | null
  ingestionHealth: WarRoomIngestionRow[]
  aggregatedSourceFlags: import('./types').WarRoomAggregatedSourceFlags
}): {
  actions: WarRoomActionItem[]
  conflicts: WarRoomConflict[]
  meta: WarRoomOrchestrationMeta
} {
  const raw: MutableAction[] = []

  const push = (a: Omit<MutableAction, 'rank'>) => {
    raw.push({ ...a, rank: 0 } as MutableAction)
  }

  if (args.toggles.includeTradeSuggestions && args.tradeValue && args.tradeValue.ok === true) {
    const tv = args.tradeValue as {
      ok: true
      summaryLine?: string
      leagueContextResolved?: boolean
      yourTeamClaimed?: boolean
    }
    const summary = typeof tv.summaryLine === 'string' ? tv.summaryLine : ''
    const urgency =
      tv.leagueContextResolved && tv.yourTeamClaimed ? 58 : tv.leagueContextResolved ? 52 : 46
    const confidence =
      tv.leagueContextResolved && tv.yourTeamClaimed ? 82 : tv.leagueContextResolved ? 74 : 62
    push({
      id: 'war-room-trade-value-context',
      urgency,
      confidence,
      title: 'Trade Value — league scoring linked',
      detail: summary || 'Open Trade Value to grade a deal with live projections and roster context.',
      source: 'trade',
      linkTool: 'trade',
      sourceTools: ['trade'],
      reasoning:
        tv.yourTeamClaimed && tv.leagueContextResolved
          ? 'Trade module has normalized scoring + your roster link — valuations align with this league.'
          : tv.leagueContextResolved
            ? 'Scoring rules resolved from league context; claim your team for full roster-aware pricing.'
            : 'League loaded; open Trade Value to resolve scoring before trusting dollar values.',
      confidenceNote: `Confidence reflects data linkage (scoring ${tv.leagueContextResolved ? 'on' : 'partial'}, roster ${tv.yourTeamClaimed ? 'linked' : 'unlinked'}).`,
      _keys: ['tradevalue', 'context'],
      _playerIds: [],
    })
  }

  if (args.toggles.includeStartSitRecommendations && args.startSit) {
    const bs = args.startSit.recommendations.bestStart
    const bst = args.startSit.recommendations.bestSit
    if (bs) {
      push({
        id: `ss-start-${bs.player.playerId}`,
        urgency: clamp(bs.confidence, 40, 95),
        confidence: bs.confidence,
        title: `Start ${bs.player.name}`,
        detail: bs.reason,
        source: 'start_sit',
        linkTool: 'startSit',
        sourceTools: ['startSit'],
        playerIds: [bs.player.playerId],
        expectedPayoff:
          bs.player.projectedPoints != null
            ? `~${bs.player.projectedPoints.toFixed(1)} pts projected (${args.leagueScoringNote ? 'league-scored' : 'projection'})`
            : null,
        biggestRisk:
          bs.player.weatherRiskLevel === 'high' || bs.player.weatherRiskLevel === 'extreme'
            ? bs.player.weatherSummary ?? 'Elevated weather volatility for this week.'
            : bs.player.injuryStatus
              ? `Injury/designation risk: ${bs.player.injuryStatus}`
              : null,
        biggestOpportunity:
          bs.player.ceiling != null && bs.player.projectedPoints != null
            ? `Ceiling ~${bs.player.ceiling.toFixed(1)} vs projection — upside lane if healthy.`
            : null,
        reasoning: 'Start/Sit used projections with your league scoring context when available.',
        confidenceNote: `Model confidence ${bs.confidence}/100 from synced stats.`,
        _keys: [normPlayerKey(bs.player.name), bs.player.playerId],
        _playerIds: [bs.player.playerId],
      })
    }
    if (bst) {
      push({
        id: `ss-sit-${bst.player.playerId}`,
        urgency: clamp(bst.confidence * 0.85, 35, 90),
        confidence: bst.confidence,
        title: `Sit ${bst.player.name}`,
        detail: bst.reason,
        source: 'start_sit',
        linkTool: 'startSit',
        sourceTools: ['startSit'],
        playerIds: [bst.player.playerId],
        biggestRisk: bst.player.injuryNewsSummary ?? null,
        reasoning: 'Sit call balances floor vs matchup/injury signals.',
        _keys: [normPlayerKey(bst.player.name), bst.player.playerId],
        _playerIds: [bst.player.playerId],
      })
    }

    const wxPlayers = args.startSit.players.filter(
      (p) => p.weatherRiskLevel === 'high' || p.weatherRiskLevel === 'extreme',
    )
    for (const p of wxPlayers.slice(0, 2)) {
      const wxU =
        p.weatherRiskLevel === 'extreme' ? 88 : p.weatherRiskLevel === 'high' ? 80 : 72
      push({
        id: `wx-${p.playerId}`,
        urgency: wxU,
        confidence: p.weatherRiskLevel === 'extreme' ? 68 : 60,
        title: `Weather factor: ${p.name}`,
        detail:
          p.weatherSummary ??
          'Outdoor forecast may materially affect passing/kicking — confirm game site vs home-stadium forecast.',
        source: 'start_sit',
        linkTool: 'startSit',
        sourceTools: ['startSit'],
        playerIds: [p.playerId],
        biggestRisk: p.weatherSummary ?? 'Weather volatility',
        reasoning: 'Weather-adjusted projections penalize outdoor pass/kick environments when data exists.',
        _keys: [normPlayerKey(p.name), p.playerId],
        _playerIds: [p.playerId],
      })
    }
  }

  if (args.toggles.includeWaiverSuggestions && args.waiver) {
    const picks = args.waiver.picks.slice(0, 5)
    for (const p of picks) {
      const u =
        p.urgency === 'critical' ? 92 : p.urgency === 'high' ? 78 : p.urgency === 'medium' ? 62 : 48
      push({
        id: `waiver-${p.playerId}-${p.rank}`,
        urgency: u,
        confidence: clamp(p.confidence, 0, 100),
        title: `Waiver: ${p.name}`,
        detail: p.why,
        source: 'waiver',
        linkTool: 'waiver',
        sourceTools: ['waiver'],
        playerIds: [p.playerId],
        estimatedEdgePts: p.effectiveProjection != null ? p.effectiveProjection : null,
        biggestRisk:
          p.shortTerm && p.injuryNewsSummary
            ? `Short-term add — injury context: ${p.injuryNewsSummary}`
            : p.shortTerm
              ? 'Short-term roster patch — verify role beyond this week.'
              : null,
        reasoning: `Waiver intel ranked adds using trending + needs + ${args.leagueScoringNote ? 'league scoring' : 'value'} signals.`,
        confidenceNote: `${p.tier.replace(/_/g, ' ')} tier`,
        _keys: [normPlayerKey(p.name), p.playerId],
        _playerIds: [p.playerId],
      })
    }
    const drops = args.waiver.suggestedDrops.slice(0, 3)
    for (const d of drops) {
      push({
        id: `drop-${d.playerId}`,
        urgency: 55,
        confidence: 55,
        title: `Consider dropping ${d.name}`,
        detail: d.reason,
        source: 'waiver',
        linkTool: 'waiver',
        sourceTools: ['waiver'],
        playerIds: [d.playerId],
        biggestOpportunity: 'Opens a roster spot for higher-upside adds.',
        reasoning: 'Drop candidates are bench/end-of-roster trims from your synced roster depth.',
        _keys: [normPlayerKey(d.name), d.playerId],
        _playerIds: [d.playerId],
      })
    }
  }

  if (args.toggles.includeTradeSuggestions && args.trending) {
    const g = args.trending.summary.biggestGainer
    if (g) {
      push({
        id: `trade-sell-${g.playerId}`,
        urgency: clamp(52 + g.trendScore * 0.06, 42, 86),
        confidence: clamp(g.confidence, 0, 100),
        title: `Trade value: ${g.name} is surging`,
        detail: formatTrendPlayerDetail(g),
        source: 'trade',
        linkTool: 'trade',
        sourceTools: ['trending', 'trade'],
        playerIds: [g.playerId],
        biggestOpportunity: 'Sell-high window if buyers overweight recent spike.',
        biggestRisk: 'If underlying role is stable, moving early may leave points on the table.',
        reasoning:
          g.actionRecommendation === 'sell' || g.actionRecommendation === 'hold'
            ? `Trending + stance (${g.actionRecommendation}) — validate with Trade Value before moving.`
            : 'Trending engine highlights velocity — pair with Trade Value for a fair package.',
        _keys: [normPlayerKey(g.name), g.playerId],
        _playerIds: [g.playerId],
      })
    }
    const f = args.trending.summary.biggestFaller
    if (f) {
      push({
        id: `trade-buy-${f.playerId}`,
        urgency: clamp(48 + Math.abs(f.trendDelta) * 0.12, 38, 78),
        confidence: clamp(f.confidence, 0, 100),
        title: `Trade value: ${f.name} sliding`,
        detail: formatTrendPlayerDetail(f),
        source: 'trade',
        linkTool: 'trade',
        sourceTools: ['trending', 'trade'],
        playerIds: [f.playerId],
        biggestOpportunity: 'Buy-low only if injury/role narrative supports a bounce-back.',
        biggestRisk: 'Falling knife risk if usage or health is structurally worse.',
        _keys: [normPlayerKey(f.name), f.playerId],
        _playerIds: [f.playerId],
      })
    }
  }

  if (args.toggles.includeInjuries && args.injury) {
    const rosterHits = args.injury.players
      .filter((x) => x.onRoster)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5)
    for (const pl of rosterHits) {
      push({
        id: `inj-${pl.sourceId}`,
        urgency: clamp(pl.impactScore, 30, 98),
        confidence: clamp(pl.confidence, 0, 100),
        title: `${pl.name}: ${pl.statusRaw}`,
        detail: pl.notes || 'Monitor practice and official designation.',
        source: 'injury',
        linkTool: 'injury',
        sourceTools: ['injury'],
        playerIds: [pl.sourceId],
        biggestRisk: 'Game-time decision risk can erase projected points.',
        reasoning: 'Injury Impact blends feed status with roster exposure.',
        _keys: [normPlayerKey(pl.name), pl.sourceId],
        _playerIds: [pl.sourceId],
      })
    }
  }

  if (args.toggles.includeTrendingPlayers && args.trending) {
    const g = args.trending.summary.biggestGainer
    if (g && !args.toggles.includeTradeSuggestions) {
      push({
        id: `trend-${g.playerId}`,
        urgency: clamp(50 + g.trendScore * 0.08, 40, 88),
        confidence: clamp(g.confidence, 0, 100),
        title: `Trending up: ${g.name}`,
        detail: formatTrendPlayerDetail(g),
        source: 'trend',
        linkTool: 'trending',
        sourceTools: ['trending'],
        playerIds: [g.playerId],
        _keys: [normPlayerKey(g.name), g.playerId],
        _playerIds: [g.playerId],
      })
    }
  }

  if (args.toggles.includePowerRankings && args.power && args.power.analysisScope !== 'none') {
    const my = args.power.teams.find((t) => t.isCurrentUser)
    if (my) {
      const floorFirst =
        args.strategyMode === 'conservative' || args.strategyMode === 'rebuilder' ? true : false
      const mom = my.momentumLabel
      const momBump =
        mom === 'surging' || mom === 'hot' ? 8 : mom === 'cold' || mom === 'fading' ? -6 : 0
      const rc = typeof my.rowConfidence === 'number' ? my.rowConfidence : 70
      const urgency = clamp(44 + momBump + rc * 0.08, 38, 72)
      push({
        id: 'power-you',
        urgency,
        confidence: clamp(Math.round(rc), 0, 100),
        title: `Power rank #${my.rank} (${my.momentumLabel})`,
        detail: my.snippet,
        source: 'power',
        linkTool: 'power',
        sourceTools: ['power'],
        biggestRisk: floorFirst
          ? 'Protect floor — standings momentum is shaky for risky lineup swings.'
          : 'Chasing upside is viable if projections support it.',
        reasoning: 'Power rankings synthesize roster strength vs league field.',
        confidenceNote: `Row confidence ${Math.round(rc)}/100 from projection coverage + engine path.`,
        _keys: ['powerteam', my.teamName ?? 'you'],
        _playerIds: [],
      })
    }
  }

  if (args.toggles.includeMatchupPrep && args.matchupPrep && args.matchupPrep.ok) {
    for (const gp of args.matchupPrep.gamePlan.slice(0, 6)) {
      const pid = `mp-${gp.id}`
      push({
        id: pid,
        urgency: gp.urgency,
        confidence: gp.confidence,
        title: gp.title,
        detail: gp.detail,
        source: 'matchup_prep',
        linkTool: 'matchupPrep',
        sourceTools: ['matchupPrep'],
        reasoning:
          args.matchupPrep.projectedEdge != null && args.matchupPrep.oppProjectedTotal != null
            ? `Matchup prep: you ${args.matchupPrep.myProjectedTotal?.toFixed(1) ?? '—'} vs opp ${args.matchupPrep.oppProjectedTotal?.toFixed(1) ?? '—'} (edge ${args.matchupPrep.projectedEdge?.toFixed(1) ?? '—'}).`
            : 'Matchup prep uses head-to-head projections where synced.',
        _keys: [normPlayerKey(gp.title)],
        _playerIds: [],
      })
    }
  }

  if (args.toggles.includeTodayActions && args.todayLineup) {
    const items = [...(args.todayLineup.actions ?? [])]
      .filter((x) => x.severity !== 'info')
      .sort((a, b) => urgencyFromLineupAction(b) - urgencyFromLineupAction(a))
      .slice(0, 8)
    for (const it of items) {
      const lt = linkToolForLineupAction(it)
      const pid = it.playerId ?? it.leagueId + (it.slotLabel ?? '')
      push({
        id: `today-${it.leagueId}-${pid}-${it.slotIndex ?? 0}-${it.reasonType}`,
        urgency: urgencyFromLineupAction(it),
        confidence: it.confidence ?? 55,
        title: it.message,
        detail: it.recommendedAction ?? it.message,
        source: 'today_actions',
        linkTool: lt,
        sourceTools: [lt === 'matchupPrep' ? 'matchupPrep' : lt],
        playerIds: it.playerId ? [it.playerId] : [],
        biggestRisk: it.lockTime ? `Lock window: ${it.lockTime}` : null,
        reasoning: 'Today Actions queue from live lineup scan + locks.',
        _keys: [
          it.playerId ? it.playerId : normPlayerKey(it.playerName ?? it.message),
          it.leagueId,
        ],
        _playerIds: it.playerId ? [it.playerId] : [],
      })
    }
  }

  /** Deduplicate overlapping player-level advice */
  const bucket = new Map<string, MutableAction[]>()
  for (const a of raw) {
    const pid = a._playerIds[0]
    const primary =
      ((pid ? canonicalPlayerKey(pid) : '') || a._keys.find((k) => k.length >= 4)) ?? a.id
    const k = primary
    const list = bucket.get(k) ?? []
    list.push(a)
    bucket.set(k, list)
  }

  const merged: MutableAction[] = []
  for (const [, group] of bucket) {
    if (group.length === 1) {
      merged.push(group[0])
      continue
    }
    group.sort((x, y) => y.urgency - x.urgency)
    const head = group[0]
    const tools = new Set<WarRoomLinkToolId>()
    for (const g of group) {
      for (const t of g.sourceTools ?? (g.linkTool ? [g.linkTool] : [])) {
        tools.add(t)
      }
    }
    head.sourceTools = Array.from(tools)
    head.title = group.length > 1 ? `${head.title} (+${group.length - 1} related signal${group.length > 2 ? 's' : ''})` : head.title
    head.detail = group.map((g) => `• ${g.detail}`).join('\n')
    head.reasoning = [
      head.reasoning,
      ...group.slice(1).map((g) => g.reasoning).filter(Boolean),
    ]
      .filter(Boolean)
      .join(' ')
    if (group.length > 1) {
      const sources = Array.from(new Set(group.map((g) => g.source)))
      head.confidenceNote = [
        head.confidenceNote,
        `Merged ${group.length} tool signals (${sources.join(', ')}); urgency uses the strongest module; confidence is capped by multi-source overlap.`,
      ]
        .filter(Boolean)
        .join(' ')
      head.confidence = Math.round(Math.min(head.confidence, ...group.map((g) => g.confidence)))
    }
    merged.push(head)
  }

  /** Conflicts */
  const conflicts: WarRoomConflict[] = []
  const nameToSources = new Map<string, Set<string>>()
  for (const a of merged) {
    const nm = a.playerIds?.[0] ?? a._keys[0]
    if (!nm) continue
    const set = nameToSources.get(nm) ?? new Set()
    set.add(a.source)
    nameToSources.set(nm, set)
  }

  const injNames = new Set(
    (args.injury ? args.injury.players : [])
      .filter((x) => x.onRoster && x.impactScore >= 65)
      .map((x) => x.name.toLowerCase()),
  )
  for (const d of args.waiver ? args.waiver.suggestedDrops : []) {
    if (injNames.has(d.name.toLowerCase())) {
      conflicts.push({
        id: `cfl-waiver-inj-${d.playerId}`,
        summary: `${d.name}: waiver suggested a drop while injury signal is elevated.`,
        primaryAction: 'Re-check designation before dropping.',
        alternateAction: 'Hold through inactives if the role is still valuable.',
        recommendedConfidence: 78,
        resolutionNote: 'Injury designation outranks generic drop suggestions until gameday clarity.',
      })
    }
  }

  const startIds = new Set(
    merged.filter((a) => a.title.startsWith('Start ') && a.playerIds?.[0]).map((a) => a.playerIds![0]),
  )
  const seenStartConflict = new Set<string>()
  for (const a of merged) {
    const pid = a.playerIds?.[0]
    if (!pid || !startIds.has(pid)) continue
    const conflictTitle =
      a.title.startsWith('Sit ') ||
      a.title.includes('Consider dropping') ||
      (a.title.includes('Trade value:') && (a.title.includes('surging') || a.title.includes('sliding')))
    if (!conflictTitle) continue
    if (seenStartConflict.has(pid)) continue
    seenStartConflict.add(pid)
    conflicts.push({
      id: `cfl-start-${pid}`,
      summary: `Conflict: Start/Sit still likes this starter while another signal suggests: ${a.title}`,
      primaryAction: 'Decide weekly lineup priority vs trade/waiver posture for this player.',
      alternateAction: 'If trading, confirm the deal timing does not cost a must-start week.',
      recommendedConfidence: 72,
      resolutionNote: 'Lineup locks are time-bound; protect active starters before selling high.',
    })
  }

  for (const p of args.waiver ? args.waiver.picks : []) {
    if (!p.shortTerm) continue
    if (!injNames.has(p.name.toLowerCase())) continue
    conflicts.push({
      id: `cfl-waiver-short-inj-${p.playerId}`,
      summary: `${p.name}: waiver add flagged short-term while injury feed shows elevated risk.`,
      primaryAction: 'Treat as injury hedge — confirm snap share.',
      alternateAction: 'Pass if you need stable floors this week.',
      recommendedConfidence: 74,
      resolutionNote: 'Short-term adds with injury noise are bench stashes unless you are desperate for games played.',
    })
  }

  // Start/Sit recommends a starter while Injury flags that same player as high-impact.
  // This is a real conflict the orchestrator previously missed.
  if (args.startSit?.recommendations && args.injury?.players) {
    const startCandidates = [
      args.startSit.recommendations.bestStart?.player.name,
      args.startSit.recommendations.safest?.player.name,
      args.startSit.recommendations.upside?.player.name,
      args.startSit.recommendations.floorOption?.player.name,
    ]
      .filter((n): n is string => Boolean(n))
      .map((n) => n.toLowerCase())
    const severeInjuredStarters = args.injury.players.filter(
      (p) =>
        p.onRoster &&
        p.impactScore >= 65 &&
        (p.severity === 'out' || p.severity === 'ir' || p.severity === 'doubtful' || p.severity === 'questionable') &&
        startCandidates.includes(p.name.toLowerCase()),
    )
    const seenInjuryStartConflict = new Set<string>()
    for (const inj of severeInjuredStarters) {
      const key = inj.name.toLowerCase()
      if (seenInjuryStartConflict.has(key)) continue
      seenInjuryStartConflict.add(key)
      conflicts.push({
        id: `cfl-startsit-injury-${inj.sourceId || key}`,
        summary: `${inj.name}: Start/Sit recommends a start role while Injury flags ${inj.severity.toUpperCase()} with impact ${Math.round(inj.impactScore)}/100.`,
        primaryAction: 'Confirm designation before lock — Start/Sit ranking assumes they play.',
        alternateAction: inj.replacementHint
          ? `Prep replacement path: ${inj.replacementHint.slice(0, 140)}`
          : 'Queue a same-slot backup from bench or waiver before inactives.',
        recommendedConfidence: 80,
        resolutionNote: 'Injury designation trumps projection-only recommendations until official status clears.',
      })
    }
  }

  if (args.matchupPrep && args.matchupPrep.ok) {
    const underdog = args.matchupPrep.gamePlan.some((g) => g.id === 'underdog')
    if (underdog && (args.strategyMode === 'conservative' || args.strategyMode === 'rebuilder')) {
      conflicts.push({
        id: 'cfl-matchup-strategy',
        summary:
          'Matchup Prep is leaning upside (underdog projection) while your strategy mode prefers floor protection.',
        primaryAction: 'Bias safer floors at WR/Flex if you cannot absorb a bust.',
        alternateAction: 'If you need ceiling to catch up, prioritize upside in one flex spot only.',
        recommendedConfidence: 68,
        resolutionNote: 'Strategy mode sets default tie-break; matchup edge still matters in must-win weeks.',
      })
    }
  }

  merged.sort((a, b) => b.urgency - a.urgency)
  merged.forEach((a, i) => {
    a.rank = i + 1
    a.urgencyTier = urgencyTierFromScore(a.urgency)
  })

  const lockHints = (args.todayLineup?.actions ?? [])
    .map((x) => x.lockTime)
    .filter((x): x is string => Boolean(x))
    .slice(0, 4)

  const wxStart =
    args.startSit?.players
      .filter((p) => p.weatherSummary)
      .slice(0, 2)
      .map((p) => `${p.name}: ${p.weatherSummary}`) ?? []
  const wxMatchup =
    args.matchupPrep?.ok && args.matchupPrep.weatherInfluence?.length
      ? args.matchupPrep.weatherInfluence.slice(0, 2).map((w) => `${w.name}: ${w.summary}`)
      : []
  const weatherMerged = [...wxStart, ...wxMatchup].filter(Boolean)
  const weatherNotes = weatherMerged.length > 0 ? weatherMerged.join(' | ') : null

  const analysisModeLabel =
    args.analysisMode === 'portfolio'
      ? 'Portfolio / global — waiver & trending run cross-league; roster locks require a league.'
      : 'League mode — Start/Sit, injury, power, matchup, trades, and lineup actions use this league.'

  const meta: WarRoomOrchestrationMeta = {
    serverTimeIso: args.serverTimeIso,
    analysisMode: args.analysisMode,
    analysisModeLabel,
    leagueScoringDigest: args.leagueScoringDigest,
    leagueScoringNote: args.leagueScoringNote,
    timeContextSummary: args.timeSummary,
    ingestionHealth: args.ingestionHealth,
    prioritizationModel:
      'Actions sort by module urgency (lineup locks > injury on your roster > waiver adds > weather > market/trend). Duplicate player rows merge by canonical id; merged rows keep the highest urgency and combine detail lines.',
    confidenceModel:
      'Confidence prefers each tool’s native score (Start/Sit confidence, waiver tier + model confidence, injury impactScore, matchup game-plan confidence). Merged rows take the minimum confidence across stacked sources to reflect disagreement cost.',
    lockWindowSummary: lockHints.length > 0 ? `Upcoming locks (ISO from providers): ${lockHints.join(' · ')}` : null,
    weatherNotes,
    strategyAlignmentNote:
      args.strategyMode === 'conservative'
        ? 'Conservative mode prioritizes floor-safe actions when conflicts arise.'
        : args.strategyMode === 'aggressive' || args.strategyMode === 'win_now'
          ? 'Aggressive / win-now mode tolerates more upside variance in ties.'
          : null,
    projectionContext: args.leagueScoringDigest ?? args.leagueScoringNote,
    aggregatedSourceFlags: args.aggregatedSourceFlags,
  }

  const finalActions: WarRoomActionItem[] = merged.slice(0, 14).map((m) => stripInternal(m))

  return { actions: finalActions, conflicts, meta }
}
