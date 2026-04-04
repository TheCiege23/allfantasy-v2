import { prisma } from '@/lib/prisma'

export type EpisodeSummary = {
  week: number
  episodeTitle: string
  challengeKey?: string | null
  challengeWinner?: string | null
  tribalSummary?: string | null
  eliminatedUserId?: string | null
  idolPlayed?: boolean
}

/**
 * Builds an end-of-season snapshot row from current DB state.
 */
export async function generateSeasonSnapshot(leagueId: string): Promise<{ id: string }> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { season: true, survivorMergeWeek: true },
  })
  const players = await prisma.survivorPlayer.findMany({ where: { leagueId } })
  const councils = await prisma.survivorTribalCouncil.findMany({ where: { leagueId } })
  const idols = await prisma.survivorIdol.count({ where: { leagueId, isUsed: true } })
  const challenges = await prisma.survivorChallenge.count({ where: { leagueId } })
  const jury = await prisma.jurySession.findUnique({ where: { leagueId } })
  const gs = await prisma.survivorGameState.findUnique({ where: { leagueId } })
  const juryVoteCount = jury
    ? await prisma.juryVote.count({ where: { sessionId: jury.id } })
    : 0

  const winnerId = jury?.winnerId ?? players.find((p) => p.isFinalist && p.playerState === 'active')?.userId ?? ''
  const winner = winnerId ? players.find((p) => p.userId === winnerId) : undefined

  const sorted = [...players].sort((a, b) => {
    const ew = (x: typeof a) => x.eliminatedWeek ?? 999
    return ew(b) - ew(a)
  })
  const finalStandings = sorted.map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    displayName: p.displayName,
    eliminatedWeek: p.eliminatedWeek,
  }))

  const firstElim = councils
    .filter((c) => c.eliminatedUserId)
    .sort((a, b) => a.week - b.week)[0]
  const firstElimination = firstElim
    ? { userId: firstElim.eliminatedUserId, week: firstElim.week }
    : {}

  const episodeSummaries: EpisodeSummary[] = []
  const maxWeek = Math.max(gs?.currentWeek ?? 1, 1)
  for (let w = 1; w <= maxWeek; w++) {
    episodeSummaries.push({
      week: w,
      episodeTitle: `Week ${w}`,
    })
  }

  const snap = await prisma.survivorSeasonSnapshot.upsert({
    where: { leagueId },
    create: {
      leagueId,
      season: league?.season ?? new Date().getFullYear(),
      solesurvivor: winner
        ? { userId: winner.userId, displayName: winner.displayName, avatarUrl: winner.avatarUrl }
        : {},
      finalStandings: finalStandings as object,
      totalWeeks: maxWeek,
      totalTribes: await prisma.survivorTribe.count({ where: { leagueId } }),
      totalTribalCouncils: councils.length,
      totalIdolsPlayed: idols,
      totalTokensEarned: players.reduce((a, p) => a + (p.totalTokensEarned ?? 0), 0),
      totalChallenges: challenges,
      hadTie: councils.some((c) => c.isTie),
      hadRocks: councils.some((c) => c.rockDrawerUserId != null),
      firstElimination: firstElimination as object,
      mergeWeek: league?.survivorMergeWeek ?? 0,
      exileReturnees: [],
      juryStartWeek: 0,
      winnerVoteCount: juryVoteCount,
      winnerId: winnerId || '',
      episodeSummaries: episodeSummaries as object,
    },
    update: {
      solesurvivor: winner
        ? { userId: winner.userId, displayName: winner.displayName, avatarUrl: winner.avatarUrl }
        : {},
      finalStandings: finalStandings as object,
      totalWeeks: maxWeek,
      totalTribalCouncils: councils.length,
      totalIdolsPlayed: idols,
      totalChallenges: challenges,
      episodeSummaries: episodeSummaries as object,
      winnerId: winnerId || '',
      winnerVoteCount: juryVoteCount,
      hadTie: councils.some((c) => c.isTie),
      hadRocks: councils.some((c) => c.rockDrawerUserId != null),
      firstElimination: firstElimination as object,
    },
  })

  return { id: snap.id }
}

export async function getEpisodeSummaries(leagueId: string): Promise<EpisodeSummary[]> {
  const snap = await prisma.survivorSeasonSnapshot.findUnique({ where: { leagueId } })
  if (snap?.episodeSummaries && Array.isArray(snap.episodeSummaries)) {
    return snap.episodeSummaries as unknown as EpisodeSummary[]
  }
  const gs = await prisma.survivorGameState.findUnique({ where: { leagueId } })
  const maxWeek = gs?.currentWeek ?? 1
  const out: EpisodeSummary[] = []
  for (let w = 1; w <= maxWeek; w++) {
    out.push({ week: w, episodeTitle: `Week ${w}` })
  }
  return out
}
