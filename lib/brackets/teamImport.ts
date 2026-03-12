import { prisma } from "@/lib/prisma"
import type { TournamentField } from "./providers/types"

type SeedResult = {
  seeded: number
  totalRound1Nodes: number
  warnings: string[]
}

/**
 * Apply a TournamentField (teams with region + seed) to an existing
 * bracket tournament by populating round‑of‑64 nodes with team names.
 *
 * This does not change structure (slots, rounds, nextNodeId/nextNodeSide);
 * it only fills `homeTeamName` and `awayTeamName` on round 1 nodes that
 * already have `seedHome` / `seedAway` set.
 */
export async function applyTournamentFieldToBracket(
  tournamentId: string,
  field: TournamentField
): Promise<SeedResult> {
  const warnings: string[] = []

  // Basic validation: ensure each (region, seed) appears at most once.
  const seenRegionSeed = new Map<string, string>()
  for (const t of field.teams) {
    const key = `${t.region}-${t.seed}`
    if (!t.teamName || !t.region || !t.seed) {
      warnings.push(`Skipping team with missing data: ${JSON.stringify(t)}`)
      continue
    }
    if (seenRegionSeed.has(key)) {
      warnings.push(
        `Duplicate team for region/seed ${key}: "${seenRegionSeed.get(
          key
        )}" and "${t.teamName}"`
      )
    } else {
      seenRegionSeed.set(key, t.teamName)
    }
  }

  const round1Nodes = await prisma.bracketNode.findMany({
    where: { tournamentId, round: 1 },
    select: {
      id: true,
      region: true,
      seedHome: true,
      seedAway: true,
    },
  })

  if (round1Nodes.length === 0) {
    warnings.push(
      `No round 1 nodes found for tournamentId=${tournamentId}. Did you run bracket init first?`
    )
    return { seeded: 0, totalRound1Nodes: 0, warnings }
  }

  const teamByRegionSeed = new Map<string, string>()
  for (const t of field.teams) {
    if (!t.region || !t.seed || !t.teamName) continue
    teamByRegionSeed.set(`${t.region}-${t.seed}`, t.teamName)
  }

  const updates: Parameters<typeof prisma.bracketNode.update>[] = []
  let seeded = 0

  for (const node of round1Nodes) {
    if (!node.region || node.seedHome == null || node.seedAway == null) {
      warnings.push(
        `Round 1 node ${node.id} missing region or seeds (region=${node.region}, seedHome=${node.seedHome}, seedAway=${node.seedAway})`
      )
      continue
    }

    const home = teamByRegionSeed.get(`${node.region}-${node.seedHome}`) || null
    const away = teamByRegionSeed.get(`${node.region}-${node.seedAway}`) || null

    if (!home && !away) {
      warnings.push(
        `No team mapping found for node ${node.id} (region=${node.region}, seeds=${node.seedHome}/${node.seedAway})`
      )
      continue
    }

    const data: { homeTeamName?: string | null; awayTeamName?: string | null } = {}
    if (home) data.homeTeamName = home
    if (away) data.awayTeamName = away

    updates.push(
      prisma.bracketNode.update({
        where: { id: node.id },
        data,
      })
    )
    seeded++
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates)
  }

  return {
    seeded,
    totalRound1Nodes: round1Nodes.length,
    warnings,
  }
}

