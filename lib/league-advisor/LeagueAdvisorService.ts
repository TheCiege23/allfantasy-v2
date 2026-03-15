/**
 * AI League Advisor — aggregates roster, injuries, and optional waiver/trade context; calls OpenAI for advice.
 */

import { prisma } from '@/lib/prisma'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { openaiChatJson } from '@/lib/openai-client'
import type { LeagueAdvisorAdvice, LeagueAdvisorContext } from './types'

const ADVISOR_SYSTEM = `You are a personal fantasy league advisor. Given a user's league context (roster summary, injuries, FAAB, waiver priority), produce concise, actionable advice in four categories:

1. **Lineup** — who to start/sit this week, position upgrades, bye/injury fill-ins. Prioritize clear swaps.
2. **Trade** — 1–3 targeted suggestions: buy-low, sell-high, or hold. Be specific (player names if provided).
3. **Waiver** — top waiver targets or drop candidates given roster and FAAB/priority. Mention priority if relevant.
4. **Injury** — react to listed injuries: who to bench, stash on IR, or replace.

Rules:
- Return only valid JSON. No markdown.
- Each category is an array of items. Each item has: summary (string), priority ("high"|"medium"|"low"), and category-specific fields (e.g. playerNames, addTarget, dropCandidate, playerName, status, suggestedAction, direction, targetPlayer).
- Keep each summary 1–2 sentences. Use the sport (NFL, NBA, etc.) for context.
- If you have no real advice for a category, return an empty array for it.
- generatedAt, leagueId, sport will be set by the server; your response must include exactly: lineup (array), trade (array), waiver (array), injury (array).`

export interface GetAdvisorInput {
  leagueId: string
  userId: string
}

async function getLeagueAndRoster(leagueId: string, userId: string) {
  const league = await (prisma as any).league.findFirst({
    where: { id: leagueId, userId },
    select: { id: true, name: true, sport: true },
  })
  if (!league) return null

  const roster = await (prisma as any).roster.findFirst({
    where: { leagueId, platformUserId: userId },
    select: { playerData: true, faabRemaining: true, waiverPriority: true },
  })
  if (!roster) return null

  return { league, roster }
}

/** Resolve roster player IDs to names for NFL (Sleeper). Other sports may get IDs only. */
async function resolveRosterPlayerNames(
  playerIds: string[],
  sport: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (playerIds.length === 0) return map

  const upper = sport?.toUpperCase() ?? 'NFL'
  if (upper === 'NFL') {
    try {
      const { getAllPlayers } = await import('@/lib/sleeper-client')
      const all = await getAllPlayers()
      for (const id of playerIds) {
        const p = all[id]
        const name = p?.full_name || (p ? `${(p as any).first_name ?? ''} ${(p as any).last_name ?? ''}`.trim() : null)
        if (name) map.set(id, name)
        else map.set(id, `Player ${id.slice(0, 8)}`)
      }
    } catch {
      playerIds.forEach((id) => map.set(id, `Player ${id.slice(0, 8)}`))
    }
    return map
  }

  // Optional: PlayerIdentityMap by sleeperId for other sports
  try {
    const rows = await prisma.playerIdentityMap.findMany({
      where: { sleeperId: { in: playerIds }, sport: upper },
      select: { sleeperId: true, canonicalName: true },
    })
    for (const r of rows) {
      if (r.sleeperId) map.set(r.sleeperId, r.canonicalName)
    }
  } catch {
    // ignore
  }
  playerIds.forEach((id) => {
    if (!map.has(id)) map.set(id, `Player ${id.slice(0, 8)}`)
  })
  return map
}

/** Build roster summary string (starters vs bench if we have structure; else flat list). */
function buildRosterSummary(
  playerIds: string[],
  nameMap: Map<string, string>,
  playerDataRaw: unknown
): string {
  const names = playerIds.map((id) => nameMap.get(id) || id).filter(Boolean)
  const raw = playerDataRaw as { starters?: string[]; players?: string[] } | null
  if (raw?.starters && Array.isArray(raw.starters)) {
    const starters = raw.starters.map((id) => nameMap.get(id) || id)
    const bench = (raw.players || []).filter((id) => !raw.starters!.includes(id)).map((id) => nameMap.get(id) || id)
    return `Starters: ${starters.join(', ')}. Bench: ${bench.join(', ')}.`
  }
  return `Roster: ${names.join(', ')}.`
}

/** Fetch injuries for league sport; filter by roster player names if we have them. */
async function getInjurySummary(sport: string, rosterPlayerNames: string[]): Promise<string> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const normSport = normalizeToSupportedSport(sport)
  try {
    const injuries = await prisma.sportsInjury.findMany({
      where: {
        sport: normSport,
        updatedAt: { gte: since },
        ...(rosterPlayerNames.length > 0
          ? {
              OR: rosterPlayerNames.map((name) => ({
                playerName: { contains: name, mode: 'insensitive' as const },
              })),
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { playerName: true, team: true, status: true, type: true },
    })
    if (injuries.length === 0) return 'No recent injuries for your roster.'
    return injuries
      .map((i) => `${i.playerName} (${i.team ?? '?'}): ${i.status}${i.type ? ` — ${i.type}` : ''}`)
      .join('. ')
  } catch {
    return 'Injury data unavailable.'
  }
}

/** Build advisor context and call AI; return structured advice. */
export async function getLeagueAdvisorAdvice(input: GetAdvisorInput): Promise<LeagueAdvisorAdvice | null> {
  const { leagueId, userId } = input
  const data = await getLeagueAndRoster(leagueId, userId)
  if (!data) return null

  const { league, roster } = data
  const sport = normalizeToSupportedSport(league.sport)
  const playerIds = getRosterPlayerIds(roster.playerData)
  const nameMap = await resolveRosterPlayerNames(playerIds, sport)
  const rosterNames = [...nameMap.values()]
  const rosterSummary = buildRosterSummary(playerIds, nameMap, roster.playerData)
  const injurySummary = await getInjurySummary(sport, rosterNames)

  const waiverHint =
    roster.waiverPriority != null
      ? `Waiver priority: ${roster.waiverPriority} (lower = earlier).`
      : undefined
  const faabHint =
    roster.faabRemaining != null ? `FAAB remaining: $${roster.faabRemaining}.` : undefined
  const tradeHint = 'Consider buy-low or sell-high based on roster and injuries.'

  const context: LeagueAdvisorContext = {
    leagueId,
    leagueName: league.name ?? 'My League',
    sport,
    rosterSummary,
    faabRemaining: roster.faabRemaining,
    waiverPriority: roster.waiverPriority,
    injurySummary,
    waiverHint: [waiverHint, faabHint].filter(Boolean).join(' ') || undefined,
    tradeHint,
  }

  const userContent = `
League: ${context.leagueName} (${context.sport})
${context.rosterSummary}
${context.injurySummary}
${context.waiverHint ?? ''}
${context.tradeHint ?? ''}
`.trim()

  const result = await openaiChatJson({
    messages: [
      { role: 'system', content: ADVISOR_SYSTEM },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
    maxTokens: 1200,
  })

  if (!result.ok || !result.json) {
    return null
  }

  const raw = result.json as Record<string, unknown>
  const lineup = Array.isArray(raw.lineup) ? raw.lineup : []
  const trade = Array.isArray(raw.trade) ? raw.trade : []
  const waiver = Array.isArray(raw.waiver) ? raw.waiver : []
  const injury = Array.isArray(raw.injury) ? raw.injury : []

  return {
    lineup: lineup.map(normalizeLineupItem),
    trade: trade.map(normalizeTradeItem),
    waiver: waiver.map(normalizeWaiverItem),
    injury: injury.map(normalizeInjuryItem),
    generatedAt: new Date().toISOString(),
    leagueId,
    sport,
  }
}

function normalizeLineupItem(x: any): LeagueAdvisorAdvice['lineup'][0] {
  return {
    summary: String(x?.summary ?? ''),
    action: x?.action != null ? String(x.action) : undefined,
    priority: ['high', 'medium', 'low'].includes(x?.priority) ? x.priority : 'medium',
    playerNames: Array.isArray(x?.playerNames) ? x.playerNames.map(String) : undefined,
  }
}

function normalizeTradeItem(x: any): LeagueAdvisorAdvice['trade'][0] {
  return {
    summary: String(x?.summary ?? ''),
    direction: ['buy', 'sell', 'hold'].includes(x?.direction) ? x.direction : undefined,
    targetPlayer: x?.targetPlayer != null ? String(x.targetPlayer) : undefined,
    priority: ['high', 'medium', 'low'].includes(x?.priority) ? x.priority : 'medium',
  }
}

function normalizeWaiverItem(x: any): LeagueAdvisorAdvice['waiver'][0] {
  return {
    summary: String(x?.summary ?? ''),
    addTarget: x?.addTarget != null ? String(x.addTarget) : undefined,
    dropCandidate: x?.dropCandidate != null ? String(x.dropCandidate) : undefined,
    priority: ['high', 'medium', 'low'].includes(x?.priority) ? x.priority : 'medium',
  }
}

function normalizeInjuryItem(x: any): LeagueAdvisorAdvice['injury'][0] {
  return {
    summary: String(x?.summary ?? ''),
    playerName: String(x?.playerName ?? ''),
    status: x?.status != null ? String(x.status) : undefined,
    suggestedAction: x?.suggestedAction != null ? String(x.suggestedAction) : undefined,
    priority: ['high', 'medium', 'low'].includes(x?.priority) ? x.priority : 'medium',
  }
}
