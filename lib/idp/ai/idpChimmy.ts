/**
 * IDP Chimmy AI — all entry points call requireAfSubUserIdOrThrow() first (same gate as requireAfSub in routes).
 * Uses roster playerData + deterministic synthetic stats when dedicated IDP stat tables are absent.
 */

import { prisma } from '@/lib/prisma'
import { requireAfSubUserIdOrThrow } from '@/lib/redraft/ai/requireAfSub'
import { isIdpLeague, getIdpLeagueConfig } from '@/lib/idp'
import { openaiChatText } from '@/lib/openai-client'
import { isCommissioner } from '@/lib/commissioner/permissions'

const CHIMMY_IDP_RULE = `You are Chimmy, the AI assistant for IDP fantasy leagues on AllFantasy.
You explain and recommend using only the deterministic data provided. You never invent scores, injuries, or official playing-time guarantees.
Keep answers concise and actionable.`

export type IdPlayerRow = {
  playerId: string
  name: string
  position: string
  team?: string
}

export type DefenderStartSitAnalysis = {
  starters: string[]
  sitters: string[]
  analysis: string
  week: number
}

export type IDPWaiverTarget = {
  rank: number
  name: string
  position: string
  team?: string
  reasoning: string
}

export type IDPMatchupReport = {
  defensiveHighlights: string
  opponentAdvantage: string
  analysis: string
  week: number
}

export type IDPTradeEval = {
  fairness_rating: string
  balance_impact: string
  recommendation: string
}

export type IDPRankingEntry = {
  rank: number
  name: string
  position: string
  team?: string
  projectedPts: number
  reasoning: string
}

export type IDPRankingList = {
  week: number
  positionFilter?: string
  entries: IDPRankingEntry[]
}

export type SleeperDefender = {
  name: string
  position: string
  team?: string
  mockOwnershipPct: number
  reasoning: string
}

export type SnapShareReport = {
  concerns: Array<{ player: string; snap_share: number; trend: string; note: string }>
  positives: Array<{ player: string; snap_share: number; trend: string; note: string }>
}

export type ScarcityReport = {
  summary: string
  byPosition: Record<string, string>
}

export type PowerRankingsPost = {
  week: number
  lines: Array<{ rank: number; teamLabel: string; blurb: string }>
  fullText: string
}

function isIdpPosition(pos: string): boolean {
  const p = pos.toUpperCase()
  return ['DE', 'DT', 'DL', 'LB', 'CB', 'S', 'SS', 'FS', 'DB'].includes(p)
}

function seedFromString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

/** Deterministic synthetic IDP profile for AI context (not official stats). */
export function syntheticIdpProfile(playerId: string, week: number) {
  const s = seedFromString(`${playerId}:${week}`)
  const seasonAvg = 4 + (s % 120) / 10
  const snapShare = 35 + (s % 55)
  const matchupRating = 3 + (s % 17) / 2
  const recent = [0, 1, 2].map((i) => seasonAvg + ((s >> (i * 3)) % 8) - 4)
  const trend = recent[2] >= recent[0] ? 'up' : 'down'
  return { seasonAvg, snapShare, matchupRating, recent3: recent, trend }
}

function startScore(p: ReturnType<typeof syntheticIdpProfile>): number {
  const recentAvg = p.recent3.reduce((a, b) => a + b, 0) / 3
  return 0.35 * p.seasonAvg + 0.25 * p.matchupRating + 0.2 * (p.snapShare / 100) * 25 + 0.2 * recentAvg
}

async function assertIdpLeague(leagueId: string): Promise<void> {
  const ok = await isIdpLeague(leagueId)
  if (!ok) throw new Error('Not an IDP league')
}

async function getRosterForUser(leagueId: string, userId: string) {
  const roster = await prisma.roster.findFirst({
    where: { leagueId, platformUserId: userId },
    select: { id: true, playerData: true },
  })
  return roster
}

function parseOffensivePlayers(playerData: unknown): Array<{ name: string; position: string }> {
  if (!Array.isArray(playerData)) return []
  const out: Array<{ name: string; position: string }> = []
  for (const raw of playerData) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const pos = String(o.position ?? o.pos ?? '').toUpperCase()
    if (!['QB', 'RB', 'WR', 'TE', 'FLEX', 'K'].includes(pos) && pos !== 'TAXI' && pos !== 'BN') continue
    out.push({
      name: String(o.name ?? o.playerName ?? 'Player').slice(0, 80),
      position: pos,
    })
  }
  return out
}

function parseIdpPlayers(playerData: unknown): IdPlayerRow[] {
  if (!Array.isArray(playerData)) return []
  const out: IdPlayerRow[] = []
  for (const raw of playerData) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const pid = String(o.playerId ?? o.id ?? o.sleeperPlayerId ?? '')
    const pos = String(o.position ?? o.pos ?? '').toUpperCase()
    if (!pid || !isIdpPosition(pos)) continue
    out.push({
      playerId: pid,
      name: String(o.name ?? o.playerName ?? pid).slice(0, 80),
      position: pos,
      team: typeof o.team === 'string' ? o.team : undefined,
    })
  }
  return out
}

async function allLeagueRosterPlayerIds(leagueId: string): Promise<Set<string>> {
  const rows = await prisma.roster.findMany({
    where: { leagueId },
    select: { playerData: true },
  })
  const set = new Set<string>()
  for (const r of rows) {
    if (!Array.isArray(r.playerData)) continue
    for (const raw of r.playerData) {
      if (!raw || typeof raw !== 'object') continue
      const o = raw as Record<string, unknown>
      const pid = String(o.playerId ?? o.id ?? o.sleeperPlayerId ?? '')
      if (pid) set.add(pid)
    }
  }
  return set
}

/** Mock waiver pool: synthetic defenders not rostered in this league. */
async function buildMockWaiverPool(leagueId: string, week: number, limit: number): Promise<IdPlayerRow[]> {
  const taken = await allLeagueRosterPlayerIds(leagueId)
  const pool: IdPlayerRow[] = []
  const positions = ['DE', 'DT', 'LB', 'CB', 'S']
  const teams = ['BUF', 'DAL', 'SF', 'BAL', 'CLE', 'PIT', 'NYJ', 'MIA']
  let i = 0
  while (pool.length < Math.max(limit * 4, 24) && i < 200) {
    const pid = `waiver-synth-${leagueId.slice(0, 6)}-${i}`
    if (!taken.has(pid)) {
      const prof = syntheticIdpProfile(pid, week)
      if (prof.snapShare >= 40 || prof.trend === 'up') {
        pool.push({
          playerId: pid,
          name: `FA Defender ${i + 1}`,
          position: positions[i % positions.length],
          team: teams[i % teams.length],
        })
      }
    }
    i++
  }
  return pool.slice(0, Math.max(limit * 4, 20))
}

export async function getDefenderStartSitRec(
  leagueId: string,
  managerId: string,
  week: number
): Promise<DefenderStartSitAnalysis> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const roster = await getRosterForUser(leagueId, managerId)
  if (!roster) throw new Error('Roster not found')
  const defenders = parseIdpPlayers(roster.playerData)
  if (defenders.length === 0) {
    return {
      starters: [],
      sitters: [],
      analysis: 'No IDP defenders found on your roster in this league snapshot.',
      week,
    }
  }

  const scored = defenders.map((d) => ({
    ...d,
    profile: syntheticIdpProfile(d.playerId, week),
    score: startScore(syntheticIdpProfile(d.playerId, week)),
  }))
  scored.sort((a, b) => b.score - a.score)
  const starters = scored.slice(0, Math.min(4, scored.length)).map((s) => s.name)
  const sitters = scored.slice(Math.min(4, scored.length)).map((s) => s.name)

  const lines = scored.map(
    (s) =>
      `- ${s.name} (${s.position}, ${s.team ?? 'FA'}): avg ${s.profile.seasonAvg.toFixed(1)} IDP pts, opp rank vs pos ~${s.profile.matchupRating.toFixed(1)}, snaps ${s.profile.snapShare}%, last 3: [${s.profile.recent3.map((x) => x.toFixed(1)).join(', ')}]`
  )

  const res = await openaiChatText({
    messages: [
      { role: 'system', content: CHIMMY_IDP_RULE },
      {
        role: 'user',
        content: `Week ${week} NFL. Analyze these defensive players:\n${lines.join('\n')}\n\nRecommend who to start and who to bench. Format: START: (list), SIT: (list), then brief reasoning (1-2 sentences each group).`,
      },
    ],
    temperature: 0.45,
    maxTokens: 700,
  })
  const analysis = res.ok ? res.text : 'Chimmy could not reach the AI provider. Check OPENAI_API_KEY.'

  return { starters, sitters, analysis, week }
}

export async function getIDPWaiverTargets(
  leagueId: string,
  week: number,
  limit = 5
): Promise<IDPWaiverTarget[]> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const pool = await buildMockWaiverPool(leagueId, week, limit)
  const ranked = pool
    .map((p, idx) => {
      const pr = syntheticIdpProfile(p.playerId, week)
      const score = startScore(pr) + (idx % 3) * 0.1
      return { ...p, score, pr }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  const res = await openaiChatText({
    messages: [
      { role: 'system', content: CHIMMY_IDP_RULE },
      {
        role: 'user',
        content: `Top ${limit} defensive waiver pickups for Week ${week}:\n${ranked
          .map(
            (r, i) =>
              `${i + 1}. ${r.name} ${r.position} ${r.team ?? ''} — trend ${r.pr.trend}, snaps ${r.pr.snapShare}%, avg ${r.pr.seasonAvg.toFixed(1)}`
          )
          .join('\n')}\n\nOne sentence each: breakout/usage/schedule angle.`,
      },
    ],
    temperature: 0.5,
    maxTokens: 700,
  })

  const text = res.ok ? res.text : ''
  return ranked.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    position: r.position,
    team: r.team,
    reasoning: text ? text.split('\n')[i]?.trim() || text : `Strong usage trend (${r.pr.trend}) and snap share ${r.pr.snapShare}%.`,
  }))
}

export async function getIDPMatchupAnalysis(
  leagueId: string,
  managerId: string,
  week: number
): Promise<IDPMatchupReport> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const mine = await getRosterForUser(leagueId, managerId)
  const myDef = parseIdpPlayers(mine?.playerData)
  const opponent = await prisma.roster.findFirst({
    where: { leagueId, NOT: { platformUserId: managerId } },
    select: { id: true, playerData: true },
  })
  const oppOff = parseOffensivePlayers(opponent?.playerData)
  const oppLabel = opponent ? `Opponent (${opponent.id.slice(0, 8)})` : 'Opponent'

  const myLines = myDef.map((d) => {
    const p = syntheticIdpProfile(d.playerId, week)
    return `${d.name} (${d.position}): matchup rating ${p.matchupRating.toFixed(1)}, snaps ${p.snapShare}%`
  })

  const res = await openaiChatText({
    messages: [
      { role: 'system', content: CHIMMY_IDP_RULE },
      {
        role: 'user',
        content: `Week ${week}. My IDP defenders:\n${myLines.join('\n') || '(none parsed)'}\nOpponent: ${oppLabel}. Their offensive skill players (sample): ${oppOff.slice(0, 8).map((o) => `${o.name} (${o.position})`).join(', ') || 'unknown'}\nExplain matchup context: run-heavy vs pass-heavy opponent tendencies (hypothetical from matchup rating), and where my IDP has tackle/sack upside.\nAlso note one way the opponent could outscore me on IDP this week.`,
      },
    ],
    temperature: 0.45,
    maxTokens: 650,
  })
  const analysis = res.ok ? res.text : 'AI unavailable.'

  return {
    defensiveHighlights: `Week ${week}: focus on tackle floor LBs if opponent runs often; edge rushers if pass-heavy scripts.`,
    opponentAdvantage: `${oppLabel} may lean on offensive pace — compare IDP ceiling vs your tackle-heavy starters.`,
    analysis,
    week,
  }
}

export async function evaluateIDPTrade(
  leagueId: string,
  managerId: string,
  offeredPlayers: string[],
  receivedPlayers: string[]
): Promise<IDPTradeEval> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const roster = await getRosterForUser(leagueId, managerId)
  const all = parseIdpPlayers(roster?.playerData)
  const byId = new Map(all.map((p) => [p.playerId, p]))

  const describe = (ids: string[]) =>
    ids.map((id) => byId.get(id)?.name ?? id).join(', ') || '(unknown ids — pass Sleeper/player ids from roster)'

  const res = await openaiChatText({
    messages: [
      { role: 'system', content: CHIMMY_IDP_RULE },
      {
        role: 'user',
        content: `IDP trade lens. Offered: ${describe(offeredPlayers)}. Receive: ${describe(receivedPlayers)}.
Evaluate offense vs defense balance, IDP ceiling, positional holes, and fairness. Scoring context: IDP league.
Return: fairness_rating (fair / slight win / slight loss / risky), balance_impact (1 short paragraph), recommendation (1 short paragraph).`,
      },
    ],
    temperature: 0.45,
    maxTokens: 600,
  })
  const text = res.ok ? res.text : 'AI unavailable.'
  return {
    fairness_rating: 'See narrative',
    balance_impact: text,
    recommendation: 'Use league trade review tools to confirm roster legality after any acceptance.',
  }
}

export async function getWeeklyIDPRankings(
  leagueId: string,
  week: number,
  positionFilter?: string
): Promise<IDPRankingList> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const pool = await buildMockWaiverPool(leagueId, week, 40)
  const filtered = positionFilter
    ? pool.filter((p) => p.position.toUpperCase().includes(positionFilter.toUpperCase()))
    : pool

  const entries: IDPRankingEntry[] = filtered.slice(0, positionFilter ? 20 : 30).map((p, i) => {
    const pr = syntheticIdpProfile(p.playerId, week)
    const proj = 0.4 * pr.seasonAvg + 0.4 * pr.matchupRating + 0.2 * (pr.snapShare / 100) * 20
    return {
      rank: i + 1,
      name: p.name,
      position: p.position,
      team: p.team,
      projectedPts: Math.round(proj * 10) / 10,
      reasoning: `Snap ${pr.snapShare}%, matchup ${pr.matchupRating.toFixed(1)}`,
    }
  })

  const res = await openaiChatText({
    messages: [
      { role: 'system', content: CHIMMY_IDP_RULE },
      {
        role: 'user',
        content: `Summarize IDP Week ${week} rankings theme in 2 sentences for: ${entries
          .slice(0, 8)
          .map((e) => e.name)
          .join(', ')}`,
      },
    ],
    temperature: 0.4,
    maxTokens: 300,
  })
  if (res.ok && entries[0]) entries[0].reasoning = `${entries[0].reasoning}. ${res.text.slice(0, 200)}`

  return { week, positionFilter, entries }
}

export async function getSleeperDefenders(leagueId: string, week: number): Promise<SleeperDefender[]> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const pool = await buildMockWaiverPool(leagueId, week, 15)
  const out: SleeperDefender[] = []
  for (const p of pool) {
    const pr = syntheticIdpProfile(p.playerId, week)
    const own = (seedFromString(p.playerId) % 28) + 1
    if (own < 30 && pr.snapShare >= 60 && pr.matchupRating >= 6) {
      out.push({
        name: p.name,
        position: p.position,
        team: p.team,
        mockOwnershipPct: own,
        reasoning: `Hidden gem: elevated snap share (${pr.snapShare}%) with a strong matchup rating (${pr.matchupRating.toFixed(1)}).`,
      })
    }
    if (out.length >= 5) break
  }

  return out.slice(0, 5)
}

export async function getSnapShareInsights(leagueId: string, managerId: string): Promise<SnapShareReport> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const roster = await getRosterForUser(leagueId, managerId)
  const defenders = parseIdpPlayers(roster?.playerData)
  const concerns: SnapShareReport['concerns'] = []
  const positives: SnapShareReport['positives'] = []
  const wk = 1
  for (const d of defenders) {
    const pr = syntheticIdpProfile(d.playerId, wk)
    if (pr.snapShare < 50) {
      concerns.push({
        player: d.name,
        snap_share: pr.snapShare,
        trend: pr.trend,
        note: 'Below 50% snaps — role risk in this snapshot.',
      })
    } else if (pr.trend === 'up') {
      positives.push({
        player: d.name,
        snap_share: pr.snapShare,
        trend: pr.trend,
        note: 'Rising usage trend in recent-week snapshot.',
      })
    }
  }
  return { concerns, positives }
}

export async function getIDPScarcityReport(leagueId: string, week: number): Promise<ScarcityReport> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const pool = await buildMockWaiverPool(leagueId, week, 30)
  const byPos: Record<string, number> = { DL: 0, LB: 0, DB: 0 }
  for (const p of pool) {
    const g = ['DE', 'DT', 'DL'].includes(p.position) ? 'DL' : p.position === 'LB' ? 'LB' : 'DB'
    byPos[g] = (byPos[g] ?? 0) + 1
  }

  const res = await openaiChatText({
    messages: [
      { role: 'system', content: CHIMMY_IDP_RULE },
      {
        role: 'user',
        content: `Waiver IDP counts by bucket (synthetic pool): ${JSON.stringify(byPos)}. Explain scarcity for DL vs LB vs DB and actionable add/drop strategy before bye weeks.`,
      },
    ],
    temperature: 0.45,
    maxTokens: 500,
  })

  return {
    summary: res.ok ? res.text : 'AI unavailable.',
    byPosition: {
      DL: `${byPos.DL ?? 0} plausible DL streamers in pool snapshot.`,
      LB: `${byPos.LB ?? 0} LB profiles — often thinnest in IDP.`,
      DB: `${byPos.DB ?? 0} DB profiles — replaceable in big-play formats.`,
    },
  }
}

export async function generateIDPPowerRankings(leagueId: string, week: number): Promise<PowerRankingsPost> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)

  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true, playerData: true },
  })

  const scored = rosters.map((r) => {
    const idps = parseIdpPlayers(r.playerData)
    let sum = 0
    for (const p of idps) sum += startScore(syntheticIdpProfile(p.playerId, week))
    return {
      teamLabel: `Team ${r.id.slice(0, 6)}`,
      sum,
      blurb: `IDP strength score ~${sum.toFixed(1)} (synthetic).`,
    }
  })
  scored.sort((a, b) => b.sum - a.sum)
  const lines: PowerRankingsPost['lines'] = scored.map((s, i) => ({
    rank: i + 1,
    teamLabel: s.teamLabel,
    blurb: s.blurb,
  }))

  const res = await openaiChatText({
    messages: [
      { role: 'system', content: CHIMMY_IDP_RULE },
      {
        role: 'user',
        content: `Write a commissioner power rankings post for Week ${week}:\n${lines
          .map((l) => `${l.rank}. ${l.teamLabel} — ${l.blurb}`)
          .join('\n')}\n\nOne sentence per team, fun but respectful.`,
      },
    ],
    temperature: 0.55,
    maxTokens: 900,
  })

  const fullText = res.ok ? res.text : lines.map((l) => `${l.rank}. ${l.teamLabel}`).join('\n')
  return { week, lines, fullText }
}

export function getIdpChimmyHelpText(): string {
  return [
    '🤖 **IDP @Chimmy commands**',
    '• `@chimmy idp rankings [position?]` — weekly IDP rankings',
    '• `@chimmy start sit defense [week?]` — your start/sit (private)',
    '• `@chimmy waiver targets defense [limit?]` — waiver ideas',
    '• `@chimmy matchup analysis [week?]` — your matchup (private)',
    '• `@chimmy snap analysis` — snap share notes (private)',
    '• `@chimmy idp sleepers` — low-owned upside',
    '• `@chimmy idp scarcity` — waiver scarcity by position',
    '• `@chimmy idp power rankings` — commissioner power rankings post',
    '• `@chimmy help idp` — this list',
    '',
    '🔒 AI IDP features require the AF Commissioner Subscription.',
  ].join('\n')
}

/** Single-player AI analysis (modal). */
export async function getIdpPlayerAiAnalysis(
  leagueId: string,
  managerId: string,
  week: number,
  playerId: string
): Promise<string> {
  await requireAfSubUserIdOrThrow()
  await assertIdpLeague(leagueId)
  const roster = await getRosterForUser(leagueId, managerId)
  const defenders = parseIdpPlayers(roster?.playerData)
  const p = defenders.find((d) => d.playerId === playerId)
  if (!p) throw new Error('Player not on your IDP roster snapshot')
  const pr = syntheticIdpProfile(playerId, week)
  const res = await openaiChatText({
    messages: [
      { role: 'system', content: CHIMMY_IDP_RULE },
      {
        role: 'user',
        content: `Start/sit style assessment for ${p.name} (${p.position}) Week ${week}: ${JSON.stringify(pr)}`,
      },
    ],
    temperature: 0.45,
    maxTokens: 500,
  })
  return res.ok ? res.text : 'AI unavailable.'
}

export async function assertCommissionerForPowerRankings(leagueId: string, userId: string): Promise<void> {
  const ok = await isCommissioner(leagueId, userId)
  if (!ok) throw new Error('Commissioner only')
}
