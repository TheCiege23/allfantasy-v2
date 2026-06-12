/**
 * NFL/NCAAF league AI grounding packet.
 *
 * Follows the same pattern as worldCupChimmyContext / chimmyGroundingPacket but
 * grounded in fantasy league data: settings, managers, rosters, draft status,
 * player pool, ADP, projections, injuries, and evidence/freshness tracking.
 *
 * DESIGN:
 *   - null  = "not loaded" — AI MUST NOT speculate, must cite missingData
 *   - []    = "loaded but empty" — AI may say "no data found"
 *   - All numbers come from DB; none are invented by AI
 *   - safeAnswerRules enforced in every AI system prompt
 */
import "server-only"
import { prisma } from "@/lib/prisma"
import { loadFantasyDataEvidence } from "@/lib/fantasy-data/fantasyDataEvidence"
import { computeFantasyFreshness } from "@/lib/fantasy-data/fantasyFreshness"
import type { FantasyDataEvidenceSnapshot } from "@/lib/fantasy-data/fantasyDataEvidence"
import type { FantasyFreshnessReport } from "@/lib/fantasy-data/fantasyFreshness"

// ─── League grounding sub-types ───────────────────────────────────────────────

export type LeagueGroundingSettings = {
  sport: string
  leagueType: string
  scoringPreset: string | null
  draftType: string | null
  numTeams: number
  isSuperflex: boolean
  isPPR: boolean
  isHalfPPR: boolean
  isStandard: boolean
  isIDP: boolean
  isBestBall: boolean
  isDynasty: boolean
  isKeeper: boolean
  playoffTeams: number | null
  playoffWeekStart: number | null
  rosterSlots: number | null
  benchSlots: number | null
  irSlots: number | null
  taxiSlots: number | null
  waiverType: string | null
  faabBudget: number | null
  tradeDeadline: number | null
  season: number | null
}

export type LeagueGroundingManager = {
  userId: string
  displayName: string
  teamName: string | null
  isCommissioner: boolean
  isCoCommissioner: boolean
  rank: number | null
  pointsFor: number | null
  wins: number | null
  losses: number | null
  isOpen: boolean
}

export type LeagueGroundingRosterPlayer = {
  playerId: string
  playerName: string
  position: string
  team: string | null
  injuryStatus: string | null
  adp: number | null
  projectedPoints: number | null
  isStarter: boolean
}

export type LeagueGroundingRoster = {
  userId: string
  teamName: string | null
  starters: LeagueGroundingRosterPlayer[]
  bench: LeagueGroundingRosterPlayer[]
}

export type LeagueGroundingDraft = {
  status: "pre_draft" | "in_progress" | "completed" | "unknown"
  type: string | null
  round: number | null
  pick: number | null
  completedAt: string | null
}

export type LeagueGroundingPlayerPoolSummary = {
  totalAvailable: number
  byPosition: Record<string, number>
  topAdpPlayers: Array<{
    playerName: string
    position: string
    team: string | null
    adp: number
    injuryStatus: string | null
  }>
  missingAdpCount: number
  missingProjectionCount: number
  dataSource: string | null
}

export type LeagueGroundingPacket = {
  // ── Identity ─────────────────────────────────────────────────────────────
  sport: string
  leagueId: string
  userId: string
  season: number | null
  builtAt: string

  // ── League settings ───────────────────────────────────────────────────────
  leagueContext: {
    name: string | null
    isCommissioner: boolean
    isCoCommissioner: boolean
    openSlots: number
    totalSlots: number
    status: string | null
  }
  settings: LeagueGroundingSettings | null

  // ── Managers ──────────────────────────────────────────────────────────────
  managers: LeagueGroundingManager[] | null

  // ── Viewer's roster ────────────────────────────────────────────────────────
  rosters: LeagueGroundingRoster[] | null

  // ── Draft ─────────────────────────────────────────────────────────────────
  draft: LeagueGroundingDraft | null

  // ── Player pool ───────────────────────────────────────────────────────────
  playerPool: LeagueGroundingPlayerPoolSummary | null

  // ── Provider data ─────────────────────────────────────────────────────────
  fantasyData: {
    hasPlayerData: boolean
    hasAdpData: boolean
    hasInjuryData: boolean
    hasScheduleData: boolean
    playerCount: number
    adpCount: number
    injuryCount: number
    topInjuries: Array<{
      playerName: string
      team: string | null
      status: string
      position: string
    }>
  } | null

  // ── Evidence & freshness ──────────────────────────────────────────────────
  evidence: FantasyDataEvidenceSnapshot | null
  freshness: FantasyFreshnessReport | null

  // ── AI enforcement ────────────────────────────────────────────────────────
  unavailable: string[]
  safeAnswerRules: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentSeason(): number {
  return new Date().getFullYear()
}

function resolveSettings(league: Record<string, unknown>): LeagueGroundingSettings {
  const scoring = String(league.scoringPreset ?? league.scoring ?? "").toLowerCase()
  return {
    sport: String(league.sport ?? "NFL"),
    leagueType: String(league.leagueType ?? league.format ?? "redraft"),
    scoringPreset: String(league.scoringPreset ?? scoring ?? "") || null,
    draftType: String(league.draftType ?? "") || null,
    numTeams: Number(league.numTeams ?? league.teamCount ?? 12),
    isSuperflex: Boolean(league.isSuperflex ?? league.superflex),
    isPPR: scoring.includes("ppr") && !scoring.includes("half"),
    isHalfPPR: scoring.includes("half_ppr") || scoring.includes("half-ppr"),
    isStandard: scoring.includes("std") || scoring.includes("standard"),
    isIDP: Boolean(league.idp) || scoring.includes("idp"),
    isBestBall: String(league.leagueType ?? "").includes("best_ball"),
    isDynasty: String(league.leagueType ?? "").includes("dynasty"),
    isKeeper: String(league.leagueType ?? "").includes("keeper"),
    playoffTeams: league.playoffTeams != null ? Number(league.playoffTeams) : null,
    playoffWeekStart: league.playoffWeekStart != null ? Number(league.playoffWeekStart) : null,
    rosterSlots: league.rosterSlots != null ? Number(league.rosterSlots) : null,
    benchSlots: league.benchSlots != null ? Number(league.benchSlots) : null,
    irSlots: league.irSlots != null ? Number(league.irSlots) : null,
    taxiSlots: league.taxiSlots != null ? Number(league.taxiSlots) : null,
    waiverType: String(league.waiverType ?? "") || null,
    faabBudget: league.faabBudget != null ? Number(league.faabBudget) : null,
    tradeDeadline: league.tradeDeadline != null ? Number(league.tradeDeadline) : null,
    season: league.season != null ? Number(league.season) : currentSeason(),
  }
}

function buildSafeAnswerRules(
  sport: string,
  freshness: FantasyFreshnessReport | null,
  evidence: FantasyDataEvidenceSnapshot | null,
): string[] {
  const rules: string[] = [
    "Answer ONLY from facts in this grounding packet. Never invent player stats, ADP, projections, injuries, or headshots.",
    "For any factual claim about players, cite the data source and freshness tier from the evidence object.",
    "If evidence.dataAvailability is 'unavailable' or 'pending', do not cite any player data as current fact.",
    "Distinguish deterministic league settings (always accurate from DB) from provider-backed sports data (may be stale or missing).",
    "If asked about data quality, cite freshness.summary verbatim.",
    "Do not guess ADP values. If adp is null for a player, say ADP is not available for that player.",
    "Do not invent injury statuses. If injuryStatus is null, say injury status is unknown.",
    "For premium advice, always explain your evidence source and confidence level.",
    "If a user asks 'what data are you using?', cite the evidence object: provider, season, counts, lastFullSyncAt.",
  ]

  if (freshness) {
    rules.push(freshness.aiInstruction)
  }

  if (evidence?.dataAvailability === "unavailable") {
    rules.push(
      `No ${sport} player data is currently in the database. Do not cite player names, stats, ADP, or injuries from any external knowledge.`,
    )
  }

  if (sport === "NCAAF" || sport === "ncaaf") {
    rules.push(
      "NCAAF devy and C2C data is in beta. If player pool shows 'pending', explicitly tell the user the NCAAF data pipeline is not yet connected.",
      "Do not invent NCAAF player rankings, stats, or college production metrics.",
    )
  }

  return rules
}

function buildUnavailableList(
  evidence: FantasyDataEvidenceSnapshot | null,
  draft: LeagueGroundingDraft | null,
  managers: LeagueGroundingManager[] | null,
): string[] {
  const missing: string[] = []
  if (!evidence || evidence.dataAvailability === "unavailable") {
    missing.push("player pool data (no import has run)")
    missing.push("ADP rankings (no import has run)")
    missing.push("injury reports (no import has run)")
  } else if (evidence.dataAvailability === "pending") {
    missing.push("player data (import pending)")
  } else {
    if (evidence.players.count === 0) missing.push("player records")
    if (evidence.adp.count === 0) missing.push("ADP data")
    if (evidence.injuries.count === 0) missing.push("current injury reports")
  }
  if (!draft || draft.status === "unknown") {
    missing.push("draft status (no draft session found)")
  }
  if (!managers || managers.length === 0) {
    missing.push("league managers (no teams found)")
  }
  return missing
}

// ─── DB loaders ───────────────────────────────────────────────────────────────

async function loadLeagueRow(leagueId: string): Promise<Record<string, unknown> | null> {
  try {
    return (await (prisma as any).league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        sport: true,
        leagueType: true,
        scoringPreset: true,
        draftType: true,
        numTeams: true,
        status: true,
        season: true,
        settings: true,
        userId: true,
      },
    })) ?? null
  } catch {
    return null
  }
}

async function loadManagers(leagueId: string, viewerUserId: string): Promise<LeagueGroundingManager[]> {
  try {
    const teams = await (prisma as any).leagueTeam.findMany({
      where: { leagueId },
      select: {
        id: true,
        teamName: true,
        claimedByUserId: true,
        pointsFor: true,
        wins: true,
        losses: true,
        rank: true,
        isCommissioner: true,
      },
      take: 30,
    }).catch(() => []) as Array<Record<string, unknown>>

    const members = await (prisma as any).redraftMember.findMany({
      where: { leagueId },
      select: {
        userId: true,
        role: true,
        user: { select: { id: true, name: true, username: true } },
      },
      take: 30,
    }).catch(() => []) as Array<Record<string, unknown>>

    const memberMap = new Map<string, Record<string, unknown>>()
    for (const m of members) {
      if (m.userId) memberMap.set(String(m.userId), m)
    }

    return teams.map((t): LeagueGroundingManager => {
      const uid = String(t.claimedByUserId ?? "")
      const member = uid ? memberMap.get(uid) : undefined
      const user = member?.user as Record<string, unknown> | undefined
      const role = String(member?.role ?? "")
      return {
        userId: uid || `open:${t.id}`,
        displayName: String(user?.name ?? user?.username ?? (uid ? uid.slice(0, 8) : "Open slot")),
        teamName: t.teamName ? String(t.teamName) : null,
        isCommissioner: Boolean(t.isCommissioner) || role === "commissioner",
        isCoCommissioner: role === "co_commissioner",
        rank: t.rank != null ? Number(t.rank) : null,
        pointsFor: t.pointsFor != null ? Number(t.pointsFor) : null,
        wins: t.wins != null ? Number(t.wins) : null,
        losses: t.losses != null ? Number(t.losses) : null,
        isOpen: !uid,
      }
    })
  } catch {
    return []
  }
}

async function loadViewerRoster(
  leagueId: string,
  userId: string,
): Promise<LeagueGroundingRoster | null> {
  try {
    const roster = await (prisma as any).roster.findFirst({
      where: { leagueId, userId },
      select: {
        teamName: true,
        playerData: true,
        starters: true,
      },
    }).catch(() => null)
    if (!roster) return null

    const parsePlayer = (p: unknown): LeagueGroundingRosterPlayer | null => {
      if (!p || typeof p !== "object") return null
      const r = p as Record<string, unknown>
      return {
        playerId: String(r.playerId ?? r.id ?? ""),
        playerName: String(r.name ?? r.playerName ?? ""),
        position: String(r.position ?? ""),
        team: r.team ? String(r.team) : null,
        injuryStatus: r.injuryStatus ? String(r.injuryStatus) : null,
        adp: r.adp != null ? Number(r.adp) : null,
        projectedPoints: r.projectedPoints != null ? Number(r.projectedPoints) : null,
        isStarter: Boolean(r.isStarter),
      }
    }

    const allPlayers: LeagueGroundingRosterPlayer[] = []
    const raw = (Array.isArray(roster.playerData) ? roster.playerData : []) as unknown[]
    for (const p of raw) {
      const parsed = parsePlayer(p)
      if (parsed) allPlayers.push(parsed)
    }

    const starterIds = new Set<string>(
      Array.isArray(roster.starters) ? roster.starters.map(String) : [],
    )

    return {
      userId,
      teamName: roster.teamName ? String(roster.teamName) : null,
      starters: allPlayers.filter((p) => starterIds.has(p.playerId) || p.isStarter),
      bench: allPlayers.filter((p) => !starterIds.has(p.playerId) && !p.isStarter),
    }
  } catch {
    return null
  }
}

async function loadDraftStatus(leagueId: string): Promise<LeagueGroundingDraft | null> {
  try {
    const session = await (prisma as any).draftSession.findFirst({
      where: { leagueId },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        currentRound: true,
        currentPick: true,
        draftType: true,
        completedAt: true,
      },
    }).catch(() => null)

    if (!session) return { status: "pre_draft", type: null, round: null, pick: null, completedAt: null }

    const rawStatus = String(session.status ?? "")
    const status: LeagueGroundingDraft["status"] =
      rawStatus === "in_progress" ? "in_progress"
      : rawStatus === "completed" ? "completed"
      : rawStatus === "pre_draft" ? "pre_draft"
      : "unknown"

    return {
      status,
      type: session.draftType ? String(session.draftType) : null,
      round: session.currentRound != null ? Number(session.currentRound) : null,
      pick: session.currentPick != null ? Number(session.currentPick) : null,
      completedAt:
        session.completedAt instanceof Date
          ? session.completedAt.toISOString()
          : typeof session.completedAt === "string"
            ? session.completedAt
            : null,
    }
  } catch {
    return null
  }
}

async function loadPlayerPoolSummary(
  sport: string,
  season: number,
): Promise<LeagueGroundingPlayerPoolSummary | null> {
  try {
    const players = await (prisma as any).sportsPlayerRecord.findMany({
      where: { sport },
      select: {
        name: true,
        position: true,
        team: true,
        adp: true,
        injuryStatus: true,
        dataSource: true,
      },
      orderBy: { adp: "asc" },
      take: 500,
    }).catch(() => []) as Array<Record<string, unknown>>

    if (players.length === 0) return null

    const byPosition: Record<string, number> = {}
    let missingAdp = 0
    let missingProj = 0

    for (const p of players) {
      const pos = String(p.position ?? "FLEX")
      byPosition[pos] = (byPosition[pos] ?? 0) + 1
      if (p.adp == null) missingAdp++
      missingProj++ // projections not in SportsPlayerRecord yet
    }

    const topAdp = players
      .filter((p) => p.adp != null)
      .slice(0, 30)
      .map((p) => ({
        playerName: String(p.name ?? ""),
        position: String(p.position ?? ""),
        team: p.team ? String(p.team) : null,
        adp: Number(p.adp),
        injuryStatus: p.injuryStatus ? String(p.injuryStatus) : null,
      }))

    const dataSource = players[0]?.dataSource ? String(players[0].dataSource) : null

    return {
      totalAvailable: players.length,
      byPosition,
      topAdpPlayers: topAdp,
      missingAdpCount: missingAdp,
      missingProjectionCount: missingProj,
      dataSource,
    }
  } catch {
    return null
  }
}

async function loadFantasyData(sport: string): Promise<LeagueGroundingPacket["fantasyData"]> {
  try {
    const [playerCount, adpCount, injuryCount, topInjuries] = await Promise.all([
      (prisma as any).sportsPlayerRecord.count({ where: { sport } }).catch(() => 0) as Promise<number>,
      (prisma as any).adpDataRecord.count({ where: { sport } }).catch(() => 0) as Promise<number>,
      (prisma as any).injuryReportRecord.count({ where: { sport } }).catch(() => 0) as Promise<number>,
      (prisma as any).injuryReportRecord.findMany({
        where: { sport, status: { in: ["Out", "Doubtful", "Questionable"] } },
        select: { playerName: true, team: true, status: true, position: true },
        orderBy: { reportDate: "desc" },
        take: 20,
      }).catch(() => []) as Promise<Array<Record<string, unknown>>>,
    ])

    return {
      hasPlayerData: Number(playerCount) > 0,
      hasAdpData: Number(adpCount) > 0,
      hasInjuryData: Number(injuryCount) > 0,
      hasScheduleData: false, // loaded separately if needed
      playerCount: Number(playerCount),
      adpCount: Number(adpCount),
      injuryCount: Number(injuryCount),
      topInjuries: topInjuries.map((i) => ({
        playerName: String(i.playerName ?? ""),
        team: i.team ? String(i.team) : null,
        status: String(i.status ?? ""),
        position: String(i.position ?? ""),
      })),
    }
  } catch {
    return null
  }
}

// ─── Public builder ────────────────────────────────────────────────────────────

export async function buildLeagueSportsGroundingPacket(args: {
  leagueId: string
  userId: string
  sport?: string
  season?: number
}): Promise<LeagueGroundingPacket> {
  const { leagueId, userId } = args
  const builtAt = new Date().toISOString()

  const leagueRow = await loadLeagueRow(leagueId)
  const sport = String(args.sport ?? leagueRow?.sport ?? "NFL").toUpperCase()
  const season = args.season ?? (leagueRow?.season ? Number(leagueRow.season) : currentSeason())

  const [managers, viewerRoster, draft, playerPool, fantasyData, evidence] = await Promise.all([
    loadManagers(leagueId, userId),
    loadViewerRoster(leagueId, userId),
    loadDraftStatus(leagueId),
    loadPlayerPoolSummary(sport, season),
    loadFantasyData(sport),
    loadFantasyDataEvidence({ sport, season }),
  ])

  const freshness = evidence ? computeFantasyFreshness(evidence) : null

  const settings = leagueRow ? resolveSettings(leagueRow) : null

  const commissionerMember = managers.find((m) => m.isCommissioner)
  const isCommissioner = commissionerMember?.userId === userId
  const isCoCommissioner = managers.find((m) => m.isCoCommissioner && m.userId === userId) != null
  const openSlots = managers.filter((m) => m.isOpen).length
  const totalSlots = settings?.numTeams ?? managers.length

  const unavailable = buildUnavailableList(evidence, draft, managers)
  const safeAnswerRules = buildSafeAnswerRules(sport, freshness, evidence)

  return {
    sport,
    leagueId,
    userId,
    season,
    builtAt,
    leagueContext: {
      name: leagueRow?.name ? String(leagueRow.name) : null,
      isCommissioner,
      isCoCommissioner,
      openSlots,
      totalSlots,
      status: leagueRow?.status ? String(leagueRow.status) : null,
    },
    settings,
    managers: managers.length > 0 ? managers : null,
    rosters: viewerRoster ? [viewerRoster] : null,
    draft,
    playerPool,
    fantasyData,
    evidence,
    freshness,
    unavailable,
    safeAnswerRules,
  }
}

/**
 * Serialize the grounding packet to the compact JSON string injected into AI prompts.
 * Enforcement fields are promoted to the top so the model sees them first.
 */
export function serializeLeagueGroundingForPrompt(packet: LeagueGroundingPacket): string {
  const { safeAnswerRules, unavailable, freshness, evidence, ...rest } = packet
  return JSON.stringify({
    _notice: "LEAGUE GROUNDING PACKET — only cite facts in this object. Never invent numbers.",
    _source: freshness?.summary ?? "Data freshness unknown.",
    _missing: unavailable,
    _rules: safeAnswerRules,
    freshness,
    evidence: evidence
      ? {
          dataAvailability: evidence.dataAvailability,
          playerCount: evidence.players.count,
          adpCount: evidence.adp.count,
          injuryCount: evidence.injuries.count,
          lastFullSyncAt: evidence.lastFullSyncAt,
          missingEnv: evidence.missingEnv,
          warnings: evidence.warnings,
        }
      : null,
    ...rest,
  })
}
