/**
 * League Discovery AI — scores and ranks candidate leagues by skill, sports, activity, competition balance; uses AI for match reasons.
 */

import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { openaiChatJson } from '@/lib/openai-client'
import type {
  UserDiscoveryPreferences,
  CandidateLeague,
  LeagueMatchSuggestion,
  DiscoverySuggestInput,
  DiscoverySuggestResult,
  SkillLevel,
  PreferredActivity,
  CompetitionBalance,
} from './types'

function normSport(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return ''
  return normalizeToSupportedSport(s)
}

/** Heuristic score 0–100: how well the league matches preferences. */
function scoreLeague(
  league: CandidateLeague,
  prefs: UserDiscoveryPreferences
): number {
  let score = 50
  const sport = normSport(league.sport)
  const prefsSports = (prefs.sportsPreferences || []).map((x) =>
    String(x || '').trim().toUpperCase()
  )

  // Sport match: +25 if league sport in preferences, +0 if no prefs, -15 if prefs set and no match
  if (prefsSports.length > 0) {
    const leagueSportUpper = sport.toUpperCase()
    const match = prefsSports.some(
      (p) => p === leagueSportUpper || leagueSportUpper.includes(p)
    )
    if (match) score += 25
    else if (sport) score -= 15
  } else if (sport) {
    score += 10
  }

  // Skill vs league size: beginners → smaller leagues; experts → any
  const skill = prefs.skillLevel || 'intermediate'
  const size = league.leagueSize ?? league.maxManagers ?? 12
  if (skill === 'beginner' && size <= 12) score += 10
  else if (skill === 'beginner' && size > 14) score -= 10
  else if ((skill === 'advanced' || skill === 'expert') && size >= 12) score += 5

  // Activity match
  const activity = (league.activityLevel || 'moderate').toLowerCase()
  const wantActivity = prefs.preferredActivity || 'moderate'
  if (wantActivity === 'quiet' && (activity === 'quiet' || activity === 'low')) score += 12
  else if (wantActivity === 'quiet' && activity === 'active') score -= 12
  else if (wantActivity === 'active' && (activity === 'active' || activity === 'high')) score += 12
  else if (wantActivity === 'active' && activity === 'quiet') score -= 8
  else if (wantActivity === 'moderate') score += 5

  // Competition balance match
  const balance = (league.competitionSpread || 'balanced').toLowerCase()
  const wantBalance = prefs.competitionBalance || 'balanced'
  if (wantBalance === 'casual' && (balance === 'casual' || balance === 'low')) score += 10
  else if (wantBalance === 'casual' && balance === 'competitive') score -= 10
  else if (wantBalance === 'competitive' && (balance === 'competitive' || balance === 'high')) score += 10
  else if (wantBalance === 'competitive' && balance === 'casual') score -= 8
  else if (wantBalance === 'balanced') score += 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

const DISCOVERY_SYSTEM = `You are a league discovery assistant. Given a user's preferences (skill level, sports, preferred activity, competition balance) and a list of leagues that were already scored for match quality, produce a SHORT summary (1-2 sentences) and 1-3 bullet reasons for each league explaining why it fits the user. Be specific to the league (name, sport, size) and the user's stated preferences. Return only valid JSON. No markdown.

Output shape: { "suggestions": [ { "leagueId": "<id>", "summary": "one sentence", "reasons": ["reason1", "reason2"] } ] }
Use the exact league "id" from the input so we can merge. Keep reasons to one short sentence each.`

/** Enrich top suggestions with AI-generated summary and reasons. */
async function enrichWithAI(
  suggestions: LeagueMatchSuggestion[],
  prefs: UserDiscoveryPreferences
): Promise<LeagueMatchSuggestion[]> {
  const top = suggestions.slice(0, 10)
  if (top.length === 0) return suggestions

  const prefsStr = [
    prefs.skillLevel && `Skill: ${prefs.skillLevel}`,
    prefs.sportsPreferences?.length && `Sports: ${prefs.sportsPreferences.join(', ')}`,
    prefs.preferredActivity && `Activity: ${prefs.preferredActivity}`,
    prefs.competitionBalance && `Competition: ${prefs.competitionBalance}`,
  ]
    .filter(Boolean)
    .join('; ')

  const leagueList = top
    .map(
      (s) =>
        `id=${s.league.id} name="${s.league.name}" sport=${s.league.sport || '?'} size=${s.league.leagueSize ?? s.league.maxManagers ?? '?'} activity=${s.league.activityLevel || 'moderate'} competition=${s.league.competitionSpread || 'balanced'} score=${s.matchScore}`
    )
    .join('\n')

  const result = await openaiChatJson({
    messages: [
      { role: 'system', content: DISCOVERY_SYSTEM },
      {
        role: 'user',
        content: `User preferences: ${prefsStr}\n\nScored leagues:\n${leagueList}\n\nFor each league, output "leagueId", "summary", and "reasons" (array of 1-3 strings).`,
      },
    ],
    temperature: 0.4,
    maxTokens: 800,
  })

  if (!result.ok || !result.json) return suggestions

  const raw = result.json as { suggestions?: Array<{ leagueId?: string; summary?: string; reasons?: string[] }> }
  const byId = new Map<string | undefined, { summary?: string; reasons: string[] }>()
  for (const s of raw.suggestions || []) {
    byId.set(s.leagueId, {
      summary: s.summary,
      reasons: Array.isArray(s.reasons) ? s.reasons.map(String) : [],
    })
  }

  return suggestions.map((s) => {
    const enriched = byId.get(s.league.id)
    if (!enriched) return s
    return {
      ...s,
      summary: enriched.summary || s.summary,
      reasons: enriched.reasons.length > 0 ? enriched.reasons : s.reasons,
    }
  })
}

/**
 * Score and rank candidate leagues by user preferences; optionally enrich with AI reasons.
 */
export async function suggestLeagues(
  input: DiscoverySuggestInput
): Promise<DiscoverySuggestResult> {
  const { preferences, candidates } = input
  if (!candidates.length) {
    return { suggestions: [], generatedAt: new Date().toISOString() }
  }

  const scored: LeagueMatchSuggestion[] = candidates.map((league) => ({
    league,
    matchScore: scoreLeague(league, preferences),
    reasons: [],
  }))

  scored.sort((a, b) => b.matchScore - a.matchScore)

  const withReasons = await enrichWithAI(scored, preferences)

  return {
    suggestions: withReasons,
    generatedAt: new Date().toISOString(),
  }
}
