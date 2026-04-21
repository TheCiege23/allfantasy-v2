import type { LongTermCoachingAnalysis } from '@/lib/long-term-coaching/types'
import type { CoachingPlanResponse, CoachingPlanMode, CoreAssetTag, PositionOutlook } from '@/lib/ai/coaching/coachingPlanTypes'

function strategyClassToMode(sc: LongTermCoachingAnalysis['signals']['strategyClass']): CoachingPlanMode {
  switch (sc) {
    case 'elite_contender':
    case 'contender':
    case 'developmental_contender':
    case 'win_now_with_risk':
      return 'contend'
    case 'soft_rebuild':
    case 'full_rebuild':
    case 'future_core_asset_build':
      return 'rebuild'
    default:
      return 'retool'
  }
}

function outlookFromStrength(starterProjectionSum: number, maxSum: number): PositionOutlook {
  if (maxSum <= 0) return 'average'
  const r = starterProjectionSum / maxSum
  if (r >= 0.28) return 'strong'
  if (r >= 0.14) return 'average'
  return 'weak'
}

/**
 * Map LTC engine output → dashboard contract.
 */
export function mapLongTermAnalysisToCoachingPlan(
  analysis: LongTermCoachingAnalysis,
  aiNarrative: string | null,
): CoachingPlanResponse {
  const mode = strategyClassToMode(analysis.signals.strategyClass)
  const summary =
    (aiNarrative?.split('\n').map((l) => l.trim()).find(Boolean) ?? null) ||
    analysis.plan.currentWindowAssessment

  const pos = [...analysis.signals.positionalStrength]
  const maxSum = Math.max(1, ...pos.map((p) => p.starterProjectionSum))

  const positionHealth = pos.map((p) => {
    const outlook = outlookFromStrength(p.starterProjectionSum, maxSum)
    const strengthScore = Math.min(100, Math.round((p.starterProjectionSum / maxSum) * 100))
    const depthScore = Math.min(100, p.playerCount * 18)
    return {
      position: p.position,
      strengthScore,
      depthScore,
      ageScore: Math.max(0, 100 - Math.round(analysis.signals.ageCurveRisk)),
      outlook,
    }
  })

  const picksByYear: Record<string, string[]> = {}
  for (const pk of analysis.signals.pickSummaries) {
    const y = String(pk.season)
    if (!picksByYear[y]) picksByYear[y] = []
    picksByYear[y].push(`R${pk.round} (w ${pk.weightScore.toFixed(1)})`)
  }

  let capSummary = 'Future pick capital snapshot from synced roster data.'
  const pcs = analysis.signals.pickCapitalScore
  if (pcs >= 58) capSummary = 'Future capital is solid vs typical dynasty builds — you can trade from strength.'
  else if (pcs < 42) capSummary = 'Future capital is below average — preserve early picks unless you are a clear contender.'

  const coreAssets: CoachingPlanResponse['coreAssets'] = []
  const push = (
    rows: Array<{ playerId: string; name: string | null; rationale: string }>,
    tag: CoreAssetTag,
  ) => {
    for (const r of rows) {
      const sig = analysis.signals.playerSignals.find((p) => p.playerId === r.playerId)
      coreAssets!.push({
        playerId: r.playerId,
        name: r.name ?? r.playerId,
        position: sig?.position ?? '—',
        team: null,
        imageUrl: null,
        tag,
        note: r.rationale,
      })
    }
  }
  push(analysis.plan.playersToBuildAround, 'core')
  push(analysis.plan.playersToHold, 'hold')
  analysis.plan.playersToSell.forEach((p, i) => {
    const sig = analysis.signals.playerSignals.find((ps) => ps.playerId === p.playerId)
    coreAssets!.push({
      playerId: p.playerId,
      name: p.name ?? p.playerId,
      position: sig?.position ?? '—',
      team: null,
      imageUrl: null,
      tag: i % 2 === 0 ? 'sell_high' : 'trade_block',
      note: p.rationale,
    })
  })

  const timelinePlan = analysis.yearOutlooks.map((yo) => {
    const focus = analysis.plan.yearByYearFocus.find((f) => f.year === yo.labelYear)
    return {
      year: yo.labelYear,
      title: `${yo.contentionBand} contention · strength ${Math.round(yo.projectedTeamStrengthIndex)}`,
      actions: [
        ...(focus ? [focus.focus] : []),
        ...yo.notes.slice(0, 4),
      ],
    }
  })

  const tw = analysis.signals.titleWindowYears
  const windowToWin = {
    label:
      tw != null && tw <= 1
        ? 'Compete now: tight window'
        : tw != null && tw <= 2
          ? 'Near-term title push viable'
          : 'Build toward a multi-year peak',
    risk: analysis.signals.declineRisk,
    explanation: `Peak season estimate ${analysis.signals.peakYear ?? '—'} · short-term strength ${Math.round(analysis.signals.shortTermStrengthIndex)}/100 · long-term assets ${Math.round(analysis.signals.longTermAssetIndex)}/100.`,
  }

  const waiverStrategy = [
    'Use FAAB on injury replacements that preserve your window — avoid duplicate profiles.',
    'Stash one upside bench piece if pick capital is thin.',
  ]

  const f = analysis.leagueContext.flags
  const formatBadges: string[] = [
    f.isDynasty ? 'Dynasty' : null,
    f.isDevy ? 'Devy' : null,
    f.isC2C ? 'C2C' : null,
    f.isKeeper ? 'Keeper' : null,
  ].filter((x): x is string => Boolean(x))
  if (formatBadges.length === 0) formatBadges.push('Redraft')

  return {
    mode,
    timelineYears: analysis.horizonYears,
    confidence: Math.round(analysis.plan.confidence * 100),
    summary,
    priorityActions: analysis.plan.topPriorities.slice(0, 7),
    rosterWeaknesses: analysis.plan.rosterNeedsByPosition
      .filter((n) => n.need !== 'low')
      .map((n) => `${n.position}: ${n.note}`),
    marketStrategy: [
      ...analysis.methodologyNotes.slice(0, 1),
      `Dynasty value coverage ${(analysis.signals.dynastyValueCoverageRatio * 100).toFixed(0)}% of ideal.`,
    ],
    draftStrategy: analysis.plan.pickStrategy,
    tradeStrategy: [
      `Direction: ${analysis.plan.recommendedDirection.replace(/_/g, ' ')}`,
      ...analysis.plan.topPriorities.slice(0, 2),
    ],
    waiverStrategy,
    devyStrategy: analysis.plan.rookieDevyStrategy,
    windowToWin,
    positionHealth,
    futureCapital: {
      summary: capSummary,
      picksByYear,
    },
    coreAssets,
    timelinePlan,
    rosterStrengths: analysis.signals.positionalStrength
      .slice()
      .sort((a, b) => b.starterProjectionSum - a.starterProjectionSum)
      .slice(0, 3)
      .map(
        (p) =>
          `${p.position} group projects ${p.starterProjectionSum.toFixed(1)} combined starter points.`,
      ),
    dataSparse: Boolean(analysis.formatWarning),
    formatBadges,
  }
}
