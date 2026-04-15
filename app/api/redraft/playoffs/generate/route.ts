import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1
  return 2 ** Math.ceil(Math.log2(n))
}

function seededRoundOnePairs(bracketSize: number): Array<[number, number]> {
  if (bracketSize === 2) return [[1, 2]]
  const prev = seededRoundOnePairs(bracketSize / 2)
  const out: Array<[number, number]> = []
  for (const pair of prev) {
    out.push([pair[0], bracketSize + 1 - pair[0]])
    out.push([bracketSize + 1 - pair[0], pair[0]])
  }
  return out.slice(0, bracketSize / 2)
}

async function canManageLeague(leagueId: string, userId: string): Promise<boolean> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      userId: true,
      teams: {
        where: { claimedByUserId: userId },
        select: { isCommissioner: true, isCoCommissioner: true },
      },
    },
  })
  if (!league) return false
  if (league.userId === userId) return true
  return league.teams.some((t) => t.isCommissioner || t.isCoCommissioner)
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { seasonId?: string; playoffTeams?: number; regenerate?: boolean }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const seasonId = body.seasonId?.trim()
  if (!seasonId) return NextResponse.json({ error: 'seasonId required' }, { status: 400 })

  const season = await prisma.redraftSeason.findFirst({
    where: { id: seasonId },
    include: {
      rosters: {
        orderBy: [{ wins: 'desc' }, { pointsFor: 'desc' }, { pointsAgainst: 'asc' }],
      },
      playoffBracket: true,
    },
  })
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 })

  const allowed = await canManageLeague(season.leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const requestedTeams = Number(body.playoffTeams)
  const playoffTeams = Number.isFinite(requestedTeams)
    ? Math.max(2, Math.min(Math.floor(requestedTeams), season.rosters.length))
    : Math.max(2, Math.min(season.rosters.length, 6))

  const seededRosters = season.rosters.slice(0, playoffTeams)
  if (seededRosters.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 qualified rosters' }, { status: 409 })
  }

  const bracketSize = nextPowerOfTwo(seededRosters.length)
  const byes = bracketSize - seededRosters.length
  const roundCount = Math.log2(bracketSize)
  const pairs = seededRoundOnePairs(bracketSize)

  const result = await prisma.$transaction(async (tx) => {
    // Extended Prisma client narrows interactive `tx`; use base transaction client for playoff delegates.
    const db = tx as Prisma.TransactionClient
    if (body.regenerate !== false) {
      await db.redraftPlayoffMatchup.deleteMany({ where: { seasonId: season.id } })
      await db.redraftPlayoffRound.deleteMany({ where: { seasonId: season.id } })
      await db.redraftPlayoffSeed.deleteMany({ where: { seasonId: season.id } })
    }

    const bracket = await db.redraftPlayoffBracket.upsert({
      where: { seasonId: season.id },
      update: {
        status: 'pending',
        structure: {
          playoffTeams,
          bracketSize,
          byes,
          generatedAt: new Date().toISOString(),
          regenerate: body.regenerate !== false,
        },
      },
      create: {
        seasonId: season.id,
        status: 'pending',
        structure: {
          playoffTeams,
          bracketSize,
          byes,
          generatedAt: new Date().toISOString(),
          regenerate: body.regenerate !== false,
        },
      },
    })

    await db.redraftPlayoffSeed.createMany({
      data: seededRosters.map((roster, idx) => ({
        id: crypto.randomUUID(),
        seasonId: season.id,
        rosterId: roster.id,
        seed: idx + 1,
        qualifiedBy: 'standings',
        pointsFor: roster.pointsFor,
      })),
    })

    const rounds: { id: string; roundNumber: number }[] = []
    for (let i = 1; i <= roundCount; i += 1) {
      const round = await tx.redraftPlayoffRound.create({
        data: {
          id: crypto.randomUUID(),
          seasonId: season.id,
          bracketId: bracket.id,
          roundNumber: i,
          roundName: i === roundCount ? 'Championship' : i === roundCount - 1 ? 'Semifinal' : `Round ${i}`,
          status: i === 1 ? 'active' : 'pending',
        },
      })
      rounds.push({ id: round.id, roundNumber: round.roundNumber })
    }

    const seedToRoster = new Map<number, string>()
    seededRosters.forEach((r, idx) => seedToRoster.set(idx + 1, r.id))

    const roundOneIds: string[] = []
    for (let i = 0; i < pairs.length; i += 1) {
      const [homeSeed, awaySeed] = pairs[i]
      const homeRosterId = seedToRoster.get(homeSeed) ?? null
      const awayRosterId = seedToRoster.get(awaySeed) ?? null
      const isBye = Boolean(homeRosterId && !awayRosterId)
      const row = await db.redraftPlayoffMatchup.create({
        data: {
          id: crypto.randomUUID(),
          seasonId: season.id,
          roundId: rounds[0].id,
          matchupNumber: i + 1,
          homeRosterId,
          awayRosterId,
          homeSeed,
          awaySeed,
          winnerRosterId: isBye ? homeRosterId : null,
          status: isBye ? 'bye' : 'scheduled',
          metadata: isBye ? { autoAdvance: true } : {},
        },
      })
      roundOneIds.push(row.id)
    }

    let prevRoundIds = roundOneIds
    for (let roundIndex = 1; roundIndex < rounds.length; roundIndex += 1) {
      const currentRoundIds: string[] = []
      const currentMatchCount = Math.max(1, prevRoundIds.length / 2)

      for (let m = 0; m < currentMatchCount; m += 1) {
        const next = await tx.redraftPlayoffMatchup.create({
          data: {
            id: crypto.randomUUID(),
            seasonId: season.id,
            roundId: rounds[roundIndex].id,
            matchupNumber: m + 1,
            status: 'scheduled',
            metadata: {},
          },
        })
        currentRoundIds.push(next.id)
      }

      for (let p = 0; p < prevRoundIds.length; p += 1) {
        const target = currentRoundIds[Math.floor(p / 2)]
        await db.redraftPlayoffMatchup.update({
          where: { id: prevRoundIds[p] },
          data: { nextMatchupId: target },
        })
      }

      prevRoundIds = currentRoundIds
    }

    const generatedRounds = await db.redraftPlayoffRound.findMany({
      where: { seasonId: season.id },
      include: { matchups: { orderBy: { matchupNumber: 'asc' } } },
      orderBy: { roundNumber: 'asc' },
    })

    return {
      bracket,
      rounds: generatedRounds,
      summary: {
        playoffTeams,
        bracketSize,
        byes,
        rounds: roundCount,
      },
    }
  })

  return NextResponse.json(result)
}