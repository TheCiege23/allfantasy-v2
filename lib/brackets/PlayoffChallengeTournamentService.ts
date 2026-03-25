import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import { resolveDefaultPlayoffConfig } from '@/lib/sport-defaults/DefaultPlayoffConfigResolver'

type ChallengeBracketType = 'mens_ncaa' | 'playoff_challenge'

type BracketNodeSeedSpec = {
  slot: string
  round: number
  region: string | null
  seedHome: number | null
  seedAway: number | null
  homeTeamName: string | null
  awayTeamName: string | null
  nextSlot: string | null
  nextSide: 'HOME' | 'AWAY' | null
}

const SPORT_LABELS: Record<SupportedSport, string> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAB: 'NCAA Basketball',
  NCAAF: 'NCAA Football',
  SOCCER: 'Soccer',
}

function nextPowerOfTwo(value: number): number {
  let out = 1
  while (out < value) out *= 2
  return out
}

function buildSeedOrder(size: number): number[] {
  if (size === 2) return [1, 2]
  const prev = buildSeedOrder(size / 2)
  const out: number[] = []
  for (const seed of prev) {
    out.push(seed, size + 1 - seed)
  }
  return out
}

function buildPlayoffNodes(sport: SupportedSport, requestedTeamCount: number): BracketNodeSeedSpec[] {
  const teamCount = Math.min(16, Math.max(4, requestedTeamCount))
  const bracketSize = Math.min(16, nextPowerOfTwo(teamCount))
  const seedOrder = buildSeedOrder(bracketSize)
  const roundCount = Math.log2(bracketSize)
  const teamLabel = SPORT_LABELS[sport]

  const rounds: BracketNodeSeedSpec[][] = []

  for (let round = 1; round <= roundCount; round += 1) {
    const gamesInRound = bracketSize / (2 ** round)
    const nodes: BracketNodeSeedSpec[] = []
    for (let game = 1; game <= gamesInRound; game += 1) {
      let seedHome: number | null = null
      let seedAway: number | null = null
      let homeTeamName: string | null = null
      let awayTeamName: string | null = null

      if (round === 1) {
        seedHome = seedOrder[(game - 1) * 2] ?? null
        seedAway = seedOrder[(game - 1) * 2 + 1] ?? null
        homeTeamName = seedHome && seedHome <= teamCount ? `${teamLabel} Seed ${seedHome}` : null
        awayTeamName = seedAway && seedAway <= teamCount ? `${teamLabel} Seed ${seedAway}` : null
      }

      const slot = `R${round}-G${game}`
      const nextSlot = round < roundCount ? `R${round + 1}-G${Math.ceil(game / 2)}` : null
      const nextSide = round < roundCount ? (game % 2 === 1 ? 'HOME' : 'AWAY') : null

      nodes.push({
        slot,
        round,
        region: null,
        seedHome,
        seedAway,
        homeTeamName,
        awayTeamName,
        nextSlot,
        nextSide,
      })
    }
    rounds.push(nodes)
  }

  return rounds.flat()
}

async function createTournamentWithNodes(params: {
  sport: SupportedSport
  season: number
  challengeType: ChallengeBracketType
}) {
  const { sport, season, challengeType } = params
  const playoffDefaults = resolveDefaultPlayoffConfig(sport)
  const playoffTeamCount = Number(playoffDefaults.playoff_team_count || 6)
  const nodes =
    challengeType === 'mens_ncaa' && sport === 'NCAAB'
      ? buildPlayoffNodes(sport, 16)
      : buildPlayoffNodes(sport, playoffTeamCount)

  const tournamentName =
    challengeType === 'mens_ncaa' && sport === 'NCAAB'
      ? `NCAA Basketball Bracket Challenge ${season}`
      : `${SPORT_LABELS[sport]} Playoff Challenge ${season}`

  const tournament = await prisma.bracketTournament.create({
    data: {
      name: tournamentName,
      season,
      sport,
    },
    select: { id: true, sport: true, season: true, name: true },
  })

  await prisma.$transaction(
    nodes.map((n) =>
      prisma.bracketNode.create({
        data: {
          tournamentId: tournament.id,
          round: n.round,
          region: n.region,
          slot: n.slot,
          seedHome: n.seedHome,
          seedAway: n.seedAway,
          homeTeamName: n.homeTeamName,
          awayTeamName: n.awayTeamName,
          nextNodeSide: n.nextSide ? n.nextSide.toLowerCase() : null,
        },
      }),
    ),
  )

  const createdNodes = await prisma.bracketNode.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true, slot: true },
  })
  const slotToId = new Map(createdNodes.map((n) => [n.slot, n.id]))

  const updates = nodes
    .filter((n) => n.nextSlot)
    .map((n) => {
      const id = slotToId.get(n.slot)
      const nextId = n.nextSlot ? slotToId.get(n.nextSlot) : null
      if (!id || !nextId) return null
      return prisma.bracketNode.update({
        where: { id },
        data: { nextNodeId: nextId },
      })
    })
    .filter(Boolean) as Array<ReturnType<typeof prisma.bracketNode.update>>

  if (updates.length > 0) {
    await prisma.$transaction(updates)
  }

  return tournament
}

export async function ensureChallengeTournament(params: {
  sport: string | null | undefined
  season: number
  challengeType: ChallengeBracketType
}) {
  const normalizedSport = normalizeToSupportedSport(params.sport)
  const legacyAliasSports =
    normalizedSport === 'NCAAB' ? [normalizedSport, 'ncaam'] : [normalizedSport]

  const existing = await prisma.bracketTournament.findFirst({
    where: {
      season: params.season,
      sport: { in: legacyAliasSports },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, sport: true, season: true, name: true },
  })

  if (existing) return existing

  return createTournamentWithNodes({
    sport: normalizedSport,
    season: params.season,
    challengeType: params.challengeType,
  })
}
