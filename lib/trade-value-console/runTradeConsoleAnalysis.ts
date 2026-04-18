import 'server-only'

import type { SportsPlayerRecord } from '@prisma/client'
import { openaiChatJson, parseJsonContentFromChatCompletion } from '@/lib/openai-client'
import { getPlayer, searchPlayers } from '@/lib/data/players'
import { fetchFantasyCalcValues, findPlayerByName, type FantasyCalcPlayer } from '@/lib/fantasycalc'
import {
  pricePlayer,
  pricePick,
  compositeScore,
  compositeTotal,
  type ValuationContext,
  type PricedAsset,
} from '@/lib/hybrid-valuation'
import { computeValueFairness } from '@/lib/lineup-optimizer'
import { computeTradeDrivers } from '@/lib/trade-engine/trade-engine'
import { buildInstantNegotiationToolkit, buildNegotiationToolkit } from '@/lib/trade-engine/negotiation-builder'
import {
  buildGptInputContract,
  buildGptUserPrompt,
  validateGptNarrativeOutput,
  shouldSkipGpt,
  GPT_NARRATIVE_SYSTEM_PROMPT,
} from '@/lib/trade-engine/gpt-input-contract'
import type { Asset } from '@/lib/trade-engine/types'
import { getCalibratedWeights } from '@/lib/trade-engine/accept-calibration'
import { logTradeOfferEvent } from '@/lib/trade-engine/trade-event-logger'
import { logNarrativeValidation } from '@/lib/trade-engine/narrative-validation-logger'
import { getPlayerValuesContext } from '@/lib/player-values/playerValuesLoader'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import { prisma } from '@/lib/prisma'
import { loadLeagueForTrade } from './league-loader'
import { snapshotFromLoaded } from './quick-badges'
import { pricedAssetToEngineAsset } from './priced-asset-to-asset'
import { buildTradeIntelligence } from './build-trade-intelligence'
import {
  formatStructuredContextForReasoning,
  highlightsFromStructuredNotes,
  loadLeagueStructuredContextNotes,
} from './load-league-structured-context'
import { clamp, missingPlayerPriced, sportsRecordToPricedAsset } from './sports-db-valuation'
import {
  benchAssetsNotInGive,
  inferThinPositionsFromRoster,
  loadTradeEngineRosterContext,
  type TradeEngineRosterContext,
} from './roster-context-loader'
import type {
  TradeAssetInput,
  TradeConsoleAnalyzeInput,
  TradeConsoleAnalyzeOutput,
  TradeConsoleOpponentRosterTarget,
  TradeConsolePlayerLine,
  TradeConsoleRosterSummary,
} from './types'

async function loadLeagueTradeHistoryNote(leagueId: string | null | undefined): Promise<string | null> {
  if (!leagueId) return null
  try {
    const league = await prisma.league.findFirst({
      where: { id: leagueId },
      select: { platformLeagueId: true },
    })
    if (!league?.platformLeagueId) {
      return 'Platform league id missing — import/connect this league to enable trade-archive context.'
    }
    const tradeCount = await prisma.leagueTrade.count({
      where: { history: { sleeperLeagueId: league.platformLeagueId } },
    })
    const agg = await prisma.leagueTradeHistory.aggregate({
      where: { sleeperLeagueId: league.platformLeagueId },
      _sum: { tradesLoaded: true },
    })
    if (tradeCount === 0 && (agg._sum.tradesLoaded ?? 0) === 0) {
      return 'No imported league trades on file for this platform league yet.'
    }
    return `${tradeCount} stored trades in archive; sync aggregate ${agg._sum.tradesLoaded ?? 0} rows loaded.`
  } catch {
    return null
  }
}

function priceFaabAsset(amount: number, budget: number): PricedAsset {
  const b = budget > 0 ? budget : 100
  const ratio = clamp(amount / b, 0, 1)
  const mv = Math.round(ratio * 2800)
  return {
    name: `FAAB $${amount}`,
    type: 'player',
    value: mv,
    assetValue: {
      marketValue: mv,
      impactValue: Math.round(mv * 0.55),
      vorpValue: Math.round(mv * 0.2),
      volatility: 0.12,
    },
    source: 'unknown',
    position: 'FAAB',
  }
}

function lineFromPriced(pa: PricedAsset, meta: Partial<TradeConsolePlayerLine>): TradeConsolePlayerLine {
  return {
    name: pa.name,
    playerId: meta.playerId ?? null,
    sport: meta.sport ?? 'NFL',
    position: pa.position ?? meta.position ?? '—',
    team: meta.team ?? '—',
    headshotUrl: meta.headshotUrl ?? null,
    logoUrl: meta.logoUrl ?? null,
    injuryStatus: meta.injuryStatus ?? null,
    dataSource: meta.dataSource ?? 'deterministic',
    composite: compositeScore(pa.assetValue),
    marketValue: pa.assetValue.marketValue,
    pricedSource: meta.pricedSource ?? 'unknown',
  }
}

async function resolveAssets(
  items: TradeAssetInput[],
  args: {
    effectiveSport: SupportedSport
    nflCtx: ValuationContext
    waiverBudget: number
    dataGaps: string[]
    fcPlayers: FantasyCalcPlayer[]
  },
): Promise<{ priced: PricedAsset[]; lines: TradeConsolePlayerLine[] }> {
  const priced: PricedAsset[] = []
  const lines: TradeConsolePlayerLine[] = []

  for (const raw of items) {
    if (raw.kind === 'pick') {
      const p = await pricePick(
        { year: raw.year, round: raw.round, tier: raw.tier ?? null },
        args.nflCtx,
      )
      priced.push(p)
      lines.push(
        lineFromPriced(p, {
          sport: args.effectiveSport,
          position: 'PICK',
          team: `${raw.year}`,
          pricedSource: 'pick',
          playerId: null,
          dataSource: 'historical_pick_curve',
        }),
      )
      continue
    }

    if (raw.kind === 'faab') {
      const p = priceFaabAsset(raw.amount, args.waiverBudget)
      priced.push(p)
      lines.push(
        lineFromPriced(p, {
          sport: args.effectiveSport,
          position: 'FAAB',
          team: '—',
          pricedSource: 'faab',
          playerId: null,
          dataSource: 'league_waiver_budget',
        }),
      )
      continue
    }

    let row: SportsPlayerRecord | null = null
    let displayName = raw.name?.trim() ?? ''

    if (raw.playerId?.trim()) {
      row = (await getPlayer(raw.playerId.trim())) as SportsPlayerRecord | null
      if (row) displayName = row.name
    }

    if (args.effectiveSport === 'NFL') {
      if (!displayName && row) displayName = row.name
      if (!displayName) {
        args.dataGaps.push('Unnamed NFL player — skipped')
        continue
      }
      const matched = findPlayerByName(args.fcPlayers, displayName)
      if (!matched && row) {
        args.dataGaps.push(`FantasyCalc match for "${displayName}" — using API sports record fallback`)
      }
      const pa = await pricePlayer(displayName, args.nflCtx)
      priced.push(pa)
      const headshot = row?.headshotUrl ?? row?.headshotUrlLg ?? row?.headshotUrlSm ?? null
      const src: TradeConsolePlayerLine['pricedSource'] =
        pa.source === 'fantasycalc' || pa.source === 'excel' ? 'fantasycalc' : 'unknown'
      lines.push(
        lineFromPriced(pa, {
          playerId: row?.id ?? raw.playerId ?? null,
          sport: 'NFL',
          team: row?.team ?? matched?.player.maybeTeam ?? '—',
          headshotUrl: headshot,
          logoUrl: row?.logoUrl ?? null,
          injuryStatus: row?.injuryStatus ?? null,
          pricedSource: src,
          dataSource: row?.dataSource ?? 'fantasycalc+rolling',
          position: pa.position ?? row?.position ?? '—',
        }),
      )
      continue
    }

    if (!row && displayName.length >= 2) {
      const found = await searchPlayers(displayName, args.effectiveSport)
      row = (found[0] ?? null) as SportsPlayerRecord | null
    }
    if (!row && raw.playerId) {
      row = (await getPlayer(raw.playerId.trim())) as SportsPlayerRecord | null
    }
    if (!row) {
      args.dataGaps.push(`No DB row for "${displayName || raw.playerId}" (${args.effectiveSport}) — using low-confidence placeholder.`)
      const stub = missingPlayerPriced(displayName || 'Unknown', args.effectiveSport)
      priced.push(stub)
      lines.push(
        lineFromPriced(stub, {
          sport: args.effectiveSport,
          pricedSource: 'unknown',
          dataSource: 'placeholder',
          playerId: null,
          position: 'UNK',
        }),
      )
      continue
    }

    const pa = sportsRecordToPricedAsset(row)
    priced.push(pa)
    lines.push(
      lineFromPriced(pa, {
        playerId: row.id,
        sport: row.sport,
        team: row.team,
        headshotUrl: row.headshotUrl ?? row.headshotUrlLg ?? row.headshotUrlSm,
        logoUrl: row.logoUrl,
        injuryStatus: row.injuryStatus,
        pricedSource: 'sports_db',
        dataSource: row.dataSource,
        position: row.position,
      }),
    )
  }

  return { priced, lines }
}

function isMultisportLeague(settings: Record<string, unknown> | null | undefined): boolean {
  if (!settings) return false
  const m = settings.multisport ?? settings.multiSport ?? settings.isMultisport
  if (m === true) return true
  const sports = settings.sports
  if (Array.isArray(sports) && sports.length > 1) return true
  return false
}

export async function runTradeConsoleAnalysis(input: TradeConsoleAnalyzeInput): Promise<TradeConsoleAnalyzeOutput> {
  const give = input.sideGive ?? []
  const get = input.sideGet ?? []
  if (give.length === 0 || get.length === 0) {
    return { ok: false, error: 'Add at least one asset on each side.', code: 'EMPTY' }
  }

  let leagueRow = null as Awaited<ReturnType<typeof loadLeagueForTrade>> | null
  if (input.leagueId && input.userId) {
    leagueRow = await loadLeagueForTrade({ leagueId: input.leagueId, userId: input.userId })
  }

  const leagueSnapshot = leagueRow ? snapshotFromLoaded(leagueRow) : null

  let effectiveSport: SupportedSport | 'MIXED' = 'NFL'
  if (input.sportFilter === 'ALL') {
    const hinted = [...give, ...get]
      .filter((x): x is Extract<TradeAssetInput, { kind: 'player' }> => x.kind === 'player')
      .map((x) => x.sportHint)
      .filter(Boolean)
    if (hinted[0]) {
      effectiveSport = normalizeToSupportedSport(hinted[0])
    } else if (leagueSnapshot) {
      effectiveSport = leagueSnapshot.sport
    } else {
      effectiveSport = 'NFL'
    }
  } else {
    effectiveSport = normalizeToSupportedSport(input.sportFilter)
  }

  const sportSet = new Set<SupportedSport>()
  const collectSports = async () => {
    for (const side of [...give, ...get]) {
      if (side.kind !== 'player') continue
      if (side.playerId) {
        const r = await getPlayer(side.playerId.trim())
        if (r?.sport) sportSet.add(normalizeToSupportedSport(r.sport))
      } else if (side.sportHint) {
        sportSet.add(normalizeToSupportedSport(side.sportHint))
      }
    }
  }
  await collectSports()

  if (sportSet.size > 1) {
    const allow =
      input.allowMultisportFairness ||
      (leagueSnapshot && isMultisportLeague(leagueSnapshot.settings))
    if (!allow) {
      return {
        ok: false,
        error:
          'These assets map to multiple sports. Pick one sport, one league, or enable a multisport league to trade across sports.',
        code: 'CROSS_SPORT',
      }
    }
    effectiveSport = 'MIXED'
  } else if (sportSet.size === 1) {
    effectiveSport = [...sportSet][0]!
  }

  if (effectiveSport === 'MIXED') {
    return {
      ok: false,
      error: 'Mixed-sport fairness is not enabled for this context.',
      code: 'CROSS_SPORT',
    }
  }

  const dataGaps: string[] = []
  const leagueSize =
    input.leagueSize ??
    leagueSnapshot?.leagueSize ??
    12
  const tePremium =
    input.tePremium ??
    leagueSnapshot?.tePremiumHint ??
    false
  const isSuperFlex =
    input.isSuperFlex ??
    leagueSnapshot?.isSuperFlexHint ??
    false
  const waiverBudget =
    input.waiverBudget ??
    leagueSnapshot?.waiverBudget ??
    100

  const asOf = new Date().toISOString().slice(0, 10)
  const fcPlayers = await fetchFantasyCalcValues({
    isDynasty: true,
    numQbs: isSuperFlex ? 2 : 1,
    numTeams: leagueSize,
    ppr: 1,
  })

  const nflCtx: ValuationContext = {
    asOfDate: asOf,
    isSuperFlex,
    fantasyCalcPlayers: fcPlayers,
    numTeams: leagueSize,
  }

  const { priced: givePriced, lines: giveLines } = await resolveAssets(give, {
    effectiveSport,
    nflCtx,
    waiverBudget,
    dataGaps,
    fcPlayers,
  })
  const { priced: getPriced, lines: getLines } = await resolveAssets(get, {
    effectiveSport,
    nflCtx,
    waiverBudget,
    dataGaps,
    fcPlayers,
  })

  if (givePriced.length === 0 || getPriced.length === 0) {
    return { ok: false, error: 'Could not price assets on both sides.', code: 'VALIDATION' }
  }

  const applyTep = (assets: PricedAsset[]) => {
    if (!tePremium) return assets
    const mult = 1.15
    return assets.map((a) => {
      if (a.position?.toUpperCase() === 'TE') {
        const boosted = Math.round(a.value * mult)
        return {
          ...a,
          value: boosted,
          assetValue: {
            ...a.assetValue,
            marketValue: Math.round(a.assetValue.marketValue * mult),
            impactValue: Math.round(a.assetValue.impactValue * mult),
            vorpValue: Math.round(a.assetValue.vorpValue * mult),
            volatility: a.assetValue.volatility,
          },
        }
      }
      return a
    })
  }

  const gP = applyTep(givePriced)
  const tP = applyTep(getPriced)

  const giveTotal = compositeTotal(gP)
  const getTotal = compositeTotal(tP)
  const giveMarket = gP.reduce((s, a) => s + a.assetValue.marketValue, 0)
  const getMarket = tP.reduce((s, a) => s + a.assetValue.marketValue, 0)

  const fairnessScore = computeValueFairness(getTotal, giveTotal)
  const percentDiff =
    giveTotal > 0 ? Math.round(((getTotal - giveTotal) / Math.max(giveTotal, getTotal, 1)) * 100) : 0

  const giveAssets: Asset[] = gP.map((pa) => pricedAssetToEngineAsset(pa))
  const receiveAssets: Asset[] = tP.map((pa) => pricedAssetToEngineAsset(pa))

  let rosterCtxForDrivers: TradeEngineRosterContext | undefined
  let userFaabRemaining: number | null = null
  let availablePicksNegotiation: Array<{
    id: string
    displayName?: string
    round?: number
    season?: number
    value?: number
  }> = []

  const rosterSummary: TradeConsoleRosterSummary = {
    lineupSimulation: false,
    yourRosterPlayers: 0,
    theirRosterPlayers: 0,
    opponentTeams: [],
  }

  if (input.leagueId && input.userId) {
    const rc = await loadTradeEngineRosterContext({
      leagueId: input.leagueId,
      userId: input.userId,
      opponentTeamExternalId: input.opponentTeamExternalId ?? null,
      effectiveSport,
      nflCtx,
      dataGaps,
    })
    rosterCtxForDrivers = rc.rosterCtx ?? undefined
    userFaabRemaining = rc.userFaabRemaining
    availablePicksNegotiation = rc.availablePicks
    rosterSummary.lineupSimulation = !!rc.rosterCtx
    rosterSummary.yourRosterPlayers = rc.yourAssetCount
    rosterSummary.theirRosterPlayers = rc.theirAssetCount
    rosterSummary.opponentTeams = rc.opponentTeams
  }

  const calWeights = await getCalibratedWeights()
  let drivers
  try {
    drivers = computeTradeDrivers(
      giveAssets,
      receiveAssets,
      null,
      null,
      isSuperFlex,
      tePremium,
      rosterCtxForDrivers,
      undefined,
      undefined,
      undefined,
      undefined,
      calWeights,
    )
  } catch (e) {
    console.warn('[trade-value-console] computeTradeDrivers failed', e)
    return { ok: false, error: 'Unable to evaluate trade drivers.', code: 'VALIDATION' }
  }

  const rawConfidence = drivers.confidenceRating as 'HIGH' | 'MEDIUM' | 'LOW' | 'LEARNING'
  const confidence: 'MEDIUM' | 'LOW' =
    rawConfidence === 'HIGH' ? 'MEDIUM' : rawConfidence === 'LOW' ? 'LOW' : 'MEDIUM'
  const confidenceScore = Math.min(drivers.confidenceScore ?? 50, 85)

  const delta = getTotal - giveTotal
  let fairnessLabel = 'Even trade'
  let sideAdvantage: 'even' | 'you' | 'opponent' | 'mixed' = 'even'
  if (Math.abs(delta) < Math.max(50, (giveTotal + getTotal) * 0.04)) {
    fairnessLabel = 'Even'
    sideAdvantage = 'even'
  } else if (delta > 0) {
    fairnessLabel = delta > (giveTotal + getTotal) * 0.12 ? 'Major win (you)' : 'Slightly favors you'
    sideAdvantage = 'you'
  } else {
    fairnessLabel = -delta > (giveTotal + getTotal) * 0.12 ? 'Major overpay' : 'Slightly favors opponent'
    sideAdvantage = 'opponent'
  }

  const degraded =
    dataGaps.length > 0 ||
    [...giveLines, ...getLines].some((l) => l.dataSource === 'placeholder')

  const secondary = {
    rawValue: {
      give: Math.round(giveTotal),
      get: Math.round(getTotal),
      deltaPct: percentDiff,
    },
    teamFit: {
      grade: drivers.labels[0] ?? 'Fit',
      note:
        rosterSummary.lineupSimulation && drivers.lineupDelta?.hasLineupData
          ? `Lineup PPG: you ${drivers.lineupDelta.deltaYou >= 0 ? '+' : ''}${drivers.lineupDelta.deltaYou}, them ${drivers.lineupDelta.deltaThem >= 0 ? '+' : ''}${drivers.lineupDelta.deltaThem}. ${drivers.driverNarrative || ''}`.trim()
          : drivers.driverNarrative || 'Fit driven by market and VORP deltas.',
    },
    risk: {
      grade: drivers.labels[1] ?? 'Risk',
      note: drivers.riskFlags[0] ?? 'Volatility differs by asset; see player injury states.',
    },
    scheduleImpact: {
      note: 'Schedule strength is blended from available data feeds (see sport data freshness).',
    },
    injuryImpact: {
      note: giveLines
        .concat(getLines)
        .filter((l) => l.injuryStatus)
        .map((l) => `${l.name}: ${l.injuryStatus}`)
        .slice(0, 4)
        .join(' · ') || 'No structured injury flags on these assets.',
    },
    shortTermOutlook: {
      note: `Market delta ~${percentDiff}%. Lean: ${drivers.lean}.`,
    },
    longTermOutlook: {
      note: leagueSnapshot?.isDynasty
        ? 'Dynasty context — long-term weight uses dynasty/API values where available.'
        : 'Redraft-weighted outlook from rest-of-season signals.',
    },
    positionalScarcity: {
      note: Object.keys(drivers.positionScarcity || {}).length
        ? JSON.stringify(drivers.positionScarcity)
        : 'Positional scarcity blended into trade drivers.',
    },
    leagueImpact: {
      note: leagueSnapshot
        ? `League: ${leagueSnapshot.name} (${leagueSnapshot.sport})${
            rosterSummary.lineupSimulation
              ? ` · Lineup context: ${rosterSummary.yourRosterPlayers} roster players priced for you, ${rosterSummary.theirRosterPlayers} for selected opponent`
              : ''
          }`
        : 'General analysis — not tied to a specific league roster.',
    },
    contenderScore: clamp(55 + (drivers.marketScore ?? 0) * 20 - (degraded ? 10 : 0), 0, 100),
    rebuilderScore: clamp(50 + (drivers.vorpScore ?? 0) * 18 - (degraded ? 8 : 0), 0, 100),
  }

  const driverPayload = {
    scoringMode: drivers.scoringMode,
    dominantDriver: drivers.dominantDriver,
    scores: {
      lineupImpact: Math.round(drivers.lineupImpactScore * 100) / 100,
      vorp: Math.round(drivers.vorpScore * 100) / 100,
      market: Math.round(drivers.marketScore * 100) / 100,
      behavior: Math.round(drivers.behaviorScore * 100) / 100,
    },
    derived: {
      totalScore: drivers.totalScore,
      fairnessDelta: drivers.fairnessDelta,
      acceptProbability: drivers.acceptProbability,
      confidenceScore,
      confidenceRating: confidence,
    },
    verdict: drivers.verdict,
    lean: drivers.lean,
    labels: drivers.labels,
    riskFlags: drivers.riskFlags,
    driverNarrative: drivers.driverNarrative,
    confidenceDrivers: drivers.confidenceDrivers,
  }

  const gptContract = buildGptInputContract('INSTANT', drivers)
  const sfContext = isSuperFlex
    ? `\n\nLeague Format: Superflex — QBs carry extra trade weight.`
    : ''
  const tepContext = tePremium ? `\n\nLeague Format: Tight End Premium (~15% TE boost).` : ''

  let aiNarrative: { bullets: Array<{ text: string; driverId: string }>; sensitivity: { text: string; driverId: string } } | null =
    null

  if (!input.skipAi) {
    const skipCheck = shouldSkipGpt(gptContract)
    const playerValuesCtx = getPlayerValuesContext({ sport: effectiveSport })
    if (skipCheck === 'ok') {
      try {
        const aiResult = await openaiChatJson({
          messages: [
            {
              role: 'system',
              content:
                GPT_NARRATIVE_SYSTEM_PROMPT +
                (playerValuesCtx ? `\n\n${playerValuesCtx}` : '') +
                `\n\nDo not invent injuries or news. Only explain using the structured driver data and named assets.`,
            },
            { role: 'user', content: buildGptUserPrompt(gptContract) + sfContext + tepContext },
          ],
          temperature: 0.2,
          maxTokens: 450,
        })
        if (aiResult.ok) {
          const parsed = parseJsonContentFromChatCompletion(aiResult.json)
          if (parsed) {
            const validation = validateGptNarrativeOutput(parsed, gptContract)
            logNarrativeValidation({
              mode: 'TRADE_CONSOLE',
              contractType: 'narrative',
              valid: validation.valid,
              violations: validation.violations,
            }).catch(() => {})
            if (validation.valid && validation.cleaned) {
              aiNarrative = validation.cleaned
            }
          }
        }
      } catch {
        /* deterministic fallback */
      }
    }
  }

  const evaluation = aiNarrative
    ? { bullets: aiNarrative.bullets.map((b) => b.text), sensitivity: aiNarrative.sensitivity.text }
    : { bullets: drivers.acceptBullets, sensitivity: drivers.sensitivitySentence }

  let opponentRosterTargets: TradeConsoleOpponentRosterTarget[] | undefined
  if (rosterCtxForDrivers?.theirRoster?.length) {
    const receiveIds = new Set(receiveAssets.map((a) => a.id))
    opponentRosterTargets = rosterCtxForDrivers.theirRoster
      .filter((a) => a.type === 'PLAYER' && !receiveIds.has(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name ?? a.id,
        position: a.pos ?? null,
        marketValue: Math.round(a.marketValue ?? a.value ?? 0),
      }))
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 12)
  }

  let negotiationToolkit: Record<string, unknown> | null = null
  try {
    const hasLeagueNegotiation = !!(input.leagueId && input.userId)
    if (hasLeagueNegotiation) {
      const availableBenchAssets = rosterCtxForDrivers?.yourRoster?.length
        ? benchAssetsNotInGive(rosterCtxForDrivers.yourRoster, giveAssets)
        : []
      const partnerNeeds = rosterCtxForDrivers?.theirRoster?.length
        ? inferThinPositionsFromRoster(rosterCtxForDrivers.theirRoster, effectiveSport)
        : []
      const userNeeds = rosterCtxForDrivers?.yourRoster?.length
        ? inferThinPositionsFromRoster(rosterCtxForDrivers.yourRoster, effectiveSport)
        : []

      negotiationToolkit = buildNegotiationToolkit({
        drivers,
        give: giveAssets,
        receive: receiveAssets,
        availableBenchAssets: availableBenchAssets.length ? availableBenchAssets : undefined,
        availablePicks: availablePicksNegotiation.length ? availablePicksNegotiation : undefined,
        userFaabRemaining: userFaabRemaining ?? undefined,
        partnerNeeds: partnerNeeds.length ? partnerNeeds : undefined,
        userNeeds: userNeeds.length ? userNeeds : undefined,
      }) as unknown as Record<string, unknown>
    } else {
      negotiationToolkit = buildInstantNegotiationToolkit(drivers, giveAssets, receiveAssets) as unknown as Record<
        string,
        unknown
      >
    }
  } catch {
    try {
      negotiationToolkit = buildInstantNegotiationToolkit(drivers, giveAssets, receiveAssets) as unknown as Record<
        string,
        unknown
      >
    } catch {
      negotiationToolkit = null
    }
  }

  logTradeOfferEvent({
    assetsGiven: gP.map((a) => ({ name: a.name, value: compositeScore(a.assetValue), type: a.source })),
    assetsReceived: tP.map((a) => ({ name: a.name, value: compositeScore(a.assetValue), type: a.source })),
    features: {
      lineupImpact: drivers.lineupImpactScore,
      vorp: drivers.vorpScore,
      market: drivers.marketScore,
      behavior: drivers.behaviorScore,
      weights: [0.4, 0.25, 0.2, 0.15],
    },
    acceptProb: drivers.acceptProbability,
    verdict: drivers.verdict,
    confidenceScore: drivers.confidenceScore,
    driverSet: drivers.acceptDrivers.map((d) => ({
      id: d.id,
      evidence: typeof d.evidence === 'string' ? d.evidence : JSON.stringify(d.evidence),
    })),
    mode: 'TRADE_CONSOLE',
  }).catch(() => {})

  const rosterSummaryOut: TradeConsoleRosterSummary = {
    lineupSimulation: rosterSummary.lineupSimulation,
    yourRosterPlayers: rosterSummary.yourRosterPlayers,
    theirRosterPlayers: rosterSummary.theirRosterPlayers,
    opponentTeams: rosterSummary.opponentTeams,
  }

  const [leagueHistoryNote, structuredNotes] = await Promise.all([
    loadLeagueTradeHistoryNote(input.leagueId),
    input.leagueId ? loadLeagueStructuredContextNotes(input.leagueId) : Promise.resolve(null),
  ])
  const structuredExtra = formatStructuredContextForReasoning(structuredNotes)
  const syncedHighlights = highlightsFromStructuredNotes(structuredNotes)

  const injuryNotes = [...giveLines, ...getLines]
    .filter((l) => l.injuryStatus)
    .map((l) => `${l.name}: ${l.injuryStatus}`)

  const tradeIntelligence = buildTradeIntelligence({
    league: leagueSnapshot,
    strategy: input.strategy,
    teamContext: input.teamContext,
    fairnessLabel,
    sideAdvantage,
    percentDiff,
    giveTotal,
    getTotal,
    confidenceScore,
    degraded,
    dataGaps,
    injuryNotes,
    drivers: driverPayload,
    negotiationToolkit,
    opponentRosterTargets: opponentRosterTargets?.map((t) => ({ name: t.name, marketValue: t.marketValue })),
    rosterSummary: {
      lineupSimulation: rosterSummaryOut.lineupSimulation,
      yourRosterPlayers: rosterSummaryOut.yourRosterPlayers,
      theirRosterPlayers: rosterSummaryOut.theirRosterPlayers,
    },
    leagueHistoryNote,
    structuredContextExtra: structuredExtra || null,
    syncedDataHighlights: syncedHighlights,
  })

  const chimmyPayload = {
    tool: 'trade_value_console',
    sport: effectiveSport,
    league: leagueSnapshot,
    strategy: input.strategy,
    teamContext: input.teamContext,
    analysisTab: input.analysisTab,
    fairnessScore,
    confidenceScore,
    percentDiff,
    totals: { give: giveTotal, get: getTotal, giveMarket, getMarket },
    assets: { give: giveLines, get: getLines },
    drivers: driverPayload,
    dataGaps,
    degraded,
    rosterSummary: rosterSummaryOut,
    opponentRosterTargets: opponentRosterTargets ?? [],
    tradeIntelligence,
    structuredLeagueContext: structuredNotes,
  }

  return {
    ok: true,
    effectiveSport,
    analysisScope: leagueSnapshot ? 'league' : 'general',
    league: leagueSnapshot,
    labels: {
      fairnessLabel,
      sideAdvantage,
      confidenceLabel: confidence,
    },
    fairnessScore,
    confidenceScore,
    percentDiff,
    giveTotal,
    getTotal,
    giveMarket,
    getMarket,
    degraded,
    dataGaps,
    dataSources: [effectiveSport === 'NFL' ? 'FantasyCalc' : 'sports_players', 'hybrid-valuation', 'trade-engine'],
    lastUpdated: new Date().toISOString(),
    players: { give: giveLines, get: getLines },
    rosterSummary: rosterSummaryOut,
    secondary,
    drivers: driverPayload,
    evaluation,
    negotiationToolkit,
    opponentRosterTargets,
    tradeIntelligence,
    chimmyPayload,
  }
}
