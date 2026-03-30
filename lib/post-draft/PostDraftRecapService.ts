/**
 * Post-draft recap service.
 * Deterministic recap cards + optional AI rewrite layer can consume this payload.
 */

import { buildPostDraftSummary } from './PostDraftAutomationService'
import { getDraftResults } from '@/lib/post-draft-manager-ranking'
import type { PostDraftRecapSections, TeamGradeExplanationEntry } from './types'

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const mod10 = n % 10
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}

function buildTeamGradeExplanations(leagueId: string, rankings: Awaited<ReturnType<typeof getDraftResults>>): TeamGradeExplanationEntry[] {
  if (!rankings?.managerRankings?.length) return []
  return rankings.managerRankings.map((entry) => {
    const valueDirection =
      entry.totalValueScore >= 10
        ? 'captured consistent value against ADP'
        : entry.totalValueScore <= -10
          ? 'paid above market cost in multiple spots'
          : 'landed close to expected ADP value'
    const bestPick = entry.bestPick
      ? `${entry.bestPick.playerName} at #${entry.bestPick.overall}`
      : 'no standout value spike'
    const riskNote =
      entry.worstReach && entry.worstReach.valueScore <= -8
        ? `Primary reach risk was ${entry.worstReach.playerName} (${entry.worstReach.valueScore.toFixed(1)} value score).`
        : 'No severe reach red flags showed up.'
    return {
      rank: entry.rank,
      rosterId: entry.rosterId,
      displayName: entry.displayName,
      grade: entry.grade,
      score: entry.score,
      explanation: `${entry.displayName} finished ${ordinal(entry.rank)} with grade ${entry.grade}. The roster ${valueDirection}; best value moment was ${bestPick}. ${riskNote}`,
    }
  })
}

function buildStrategyRecap(
  pickCount: number,
  teamCount: number,
  byPosition: Record<string, number>,
  devyRounds: number[],
  c2cCollegeRounds: number[],
  draftType: string,
  hasKeeperOutcome: boolean
): string {
  const sortedPositions = Object.entries(byPosition).sort((a, b) => b[1] - a[1])
  const topPositions = sortedPositions.slice(0, 3).map(([position, count]) => `${position} (${count})`).join(', ')
  const earlyWindowSize = Math.min(pickCount, teamCount * 2)
  const earlyFocusThreshold = Math.max(2, Math.ceil(teamCount * 0.6))
  const earlyFocusPositions = sortedPositions
    .filter(([, count]) => count >= earlyFocusThreshold)
    .slice(0, 2)
    .map(([position]) => position)
  const earlyFocusLine =
    earlyFocusPositions.length > 0
      ? `Early board pressure concentrated on ${earlyFocusPositions.join(' and ')}.`
      : 'Early board pressure stayed balanced across positions.'
  const variantNotes: string[] = []
  if (draftType === 'auction') variantNotes.push('Auction budgets shaped pacing and nomination pressure.')
  if (hasKeeperOutcome) variantNotes.push('Keeper carryover influenced opening round pricing and scarcity.')
  if (devyRounds.length > 0) variantNotes.push(`Devy rounds (${devyRounds.join(', ')}) shifted long-term upside decisions.`)
  if (c2cCollegeRounds.length > 0) variantNotes.push(`C2C college rounds (${c2cCollegeRounds.join(', ')}) split immediate vs developmental value.`)
  return [
    `Top drafted positions were ${topPositions || 'balanced across the board'}.`,
    `First ${earlyWindowSize} picks established the league build trend.`,
    earlyFocusLine,
    ...variantNotes,
  ].join(' ')
}

export interface DeterministicPostDraftRecapPayload {
  leagueId: string
  leagueName: string | null
  sport: string
  sections: PostDraftRecapSections
}

export async function buildDeterministicPostDraftRecap(
  leagueId: string
): Promise<DeterministicPostDraftRecapPayload | null> {
  const summary = await buildPostDraftSummary(leagueId)
  if (!summary) return null
  const draftResults = await getDraftResults(leagueId).catch(() => null)
  const gradeExplanations = buildTeamGradeExplanations(leagueId, draftResults)

  const bestPick = draftResults?.bestPickOfDraft
  const worstPick = draftResults?.worstReachOfDraft
  const bestWorstValueExplanation =
    bestPick || worstPick
      ? [
          bestPick
            ? `Best value: ${bestPick.playerName} (#${bestPick.overall}) returned ${bestPick.valueScore.toFixed(1)} value points vs ADP for ${bestPick.displayName ?? 'its manager'}.`
            : null,
          worstPick
            ? `Largest reach: ${worstPick.playerName} (#${worstPick.overall}) came in ${Math.abs(worstPick.valueScore).toFixed(1)} points above ADP cost.`
            : null,
        ]
          .filter(Boolean)
          .join(' ')
      : 'Value/reach outcomes were stable with no extreme ADP outliers.'

  const topGrade = gradeExplanations[0]
  const chimmyDraftDebrief = [
    'Chimmy debrief:',
    topGrade
      ? `${topGrade.displayName} set the pace with a ${topGrade.grade} build.`
      : 'Draft grades are still syncing, but the board is finalized.',
    'Next step: review your bench-value spots and queue waiver contingency targets before Week 1 lock.',
  ].join(' ')

  const leagueNarrativeRecap = [
    `${summary.leagueName ?? 'League'} completed a ${summary.rounds}-round ${summary.sport} draft with ${summary.pickCount} picks.`,
    `Draft format: ${summary.draftType}.`,
    `Position distribution: ${Object.entries(summary.byPosition)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([position, count]) => `${position} (${count})`)
      .join(', ')}.`,
  ].join(' ')

  const strategyRecap = buildStrategyRecap(
    summary.pickCount,
    summary.teamCount,
    summary.byPosition,
    summary.devyRounds ?? [],
    summary.c2cCollegeRounds ?? [],
    summary.draftType,
    Boolean(summary.keeperOutcome?.length)
  )

  return {
    leagueId: summary.leagueId,
    leagueName: summary.leagueName,
    sport: summary.sport,
    sections: {
      leagueNarrativeRecap,
      strategyRecap,
      bestWorstValueExplanation,
      chimmyDraftDebrief,
      teamGradeExplanations: gradeExplanations,
    },
  }
}
