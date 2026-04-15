import type { OpenPlayerComparisonPayload } from './types'
import type { PlayerComparisonPremiumSnapshot } from './types'
import type { StartVsApiResponse } from '@/lib/player-comparison-lab'

/**
 * Load comparison for premium UI: public GET + optional league POST for coach_lens.
 */
export async function fetchPlayerComparisonSnapshot(
  payload: OpenPlayerComparisonPayload
): Promise<PlayerComparisonPremiumSnapshot> {
  const { playerA, playerB, sport, leagueId, teamId, weekOrPeriod } = payload
  const sportNorm = sport.trim() || 'NFL'

  const qs = new URLSearchParams({
    playerA: playerA.trim(),
    playerB: playerB.trim(),
    sport: sportNorm,
    includeAIExplanation: 'true',
  })

  const baseRes = await fetch(`/api/player-comparison?${qs.toString()}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const baseJson = (await baseRes.json().catch(() => ({}))) as Record<string, unknown>

  if (!baseRes.ok) {
    throw new Error(typeof baseJson.error === 'string' ? baseJson.error : 'Comparison failed')
  }

  const base = baseJson as unknown as PlayerComparisonPremiumSnapshot

  let coach_lens: StartVsApiResponse['coach_lens'] | null = null
  let start_vs_extras: PlayerComparisonPremiumSnapshot['start_vs_extras'] = null

  if (leagueId && playerA.trim() && playerB.trim()) {
    const sr = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/player-comparison/start-vs`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerA: playerA.trim(),
        playerB: playerB.trim(),
        sport: sportNorm,
        teamId: teamId ?? null,
        weekOrPeriod: weekOrPeriod ?? null,
        strategyMode: 'balanced',
        includeAIExplanation: false,
      }),
    })
    if (sr.ok) {
      const sv = (await sr.json()) as StartVsApiResponse & { leagueId?: string }
      coach_lens = sv.coach_lens ?? null
      start_vs_extras = {
        risk_flags: sv.risk_flags ?? [],
        news_flags: sv.news_flags ?? [],
        missing_data: sv.missing_data ?? [],
        actions: sv.actions,
      }
    }
  }

  return {
    ...base,
    coach_lens,
    start_vs_extras,
  }
}
