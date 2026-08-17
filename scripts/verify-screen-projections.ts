/**
 * Proves the My Team and Player Finder projection wiring against REAL rows.
 *
 * ⚠ A TYPECHECK CANNOT CATCH THE FAILURE MODE THIS GUARDS. Both screens compiled
 * perfectly while claiming "no weekly projection feed ingested" over a table
 * holding 994 rows — the types were right and the sentence was false. And the
 * Player Finder tile compiled while rendering nothing at all, because it took its
 * availability from one prop and its text from another. Only reading actual output
 * shows either.
 */
import { getMyTeamData } from '../lib/core-app/myTeam'
import { getPlayerDetail, searchPlayers, playerRef } from '../lib/core-app/playerFinder'
import { prisma } from '../lib/prisma'

async function main() {
  // Roster.platformUserId is non-nullable — no filter needed, and asking for
  // `not: null` is a runtime error rather than a no-op.
  /*
   * ⚠ SAMPLED FROM CLAIMED TEAMS, NOT FROM ROSTERS. My Team keys off
   * LeagueTeam.claimedByUserId, and most rosters belong to teams nobody has
   * claimed — sampling rosters blind hits those first and reports "unavailable"
   * for a screen that would never have been rendered in the first place.
   */
  const claimed = await prisma.leagueTeam.findMany({
    where: { claimedByUserId: { not: null } },
    select: { leagueId: true, platformUserId: true, externalId: true, claimedByUserId: true },
    take: 400,
  })
  const rosters = claimed.map((t) => ({ leagueId: t.leagueId, platformUserId: t.platformUserId }))

  let priced = 0
  let partial = 0
  let none = 0

  for (const r of rosters) {
    const team = claimed.find(
      (t) => t.leagueId === r.leagueId && t.platformUserId === r.platformUserId
    )
    if (!team?.claimedByUserId) continue

    const data = await getMyTeamData(r.leagueId, team.claimedByUserId)
    if (!data) continue

    if (!data.projections.available) {
      none++
      continue
    }
    const p = data.projections.data
    if (p.unprojected === 0) priced++
    else partial++
    if (p.unprojected > 0 || priced + partial <= 4) {
      console.log(
        `  my-team: ${p.total.toFixed(1)} pts · ${p.projected}/${p.projected + p.unprojected} starters · ${p.season} wk${p.week}`
      )
    }
  }

  console.log(`\nfully priced: ${priced} | partial: ${partial} | unavailable: ${none}`)

  console.log('\nplayer finder:')
  for (const name of ['Josh Allen', 'Bijan Robinson', 'Puka Nacua', 'Brock Bowers']) {
    const matches = await searchPlayers(name)
    const first = matches[0]
    if (!first) {
      console.log(`  ${name}: no match`)
      continue
    }
    const d = await getPlayerDetail(playerRef(first.sport, first.externalId), [])
    if (!d) {
      console.log(`  ${name}: no detail`)
      continue
    }
    // ⚠ THE IDENTITY ASSERTION IS THE POINT OF THIS LOOP, NOT THE NUMBERS. The
    // detail page used to return a different athlete than the one clicked.
    if (d.player.name !== first.name || d.player.sport !== first.sport) {
      console.log(`  ✗ ${name}: clicked ${first.name}(${first.sport}) but opened ${d.player.name}(${d.player.sport})`)
      continue
    }
    const proj = d.projection.available
      ? `${d.projection.data.points.toFixed(1)} pts (${d.projection.data.season} wk${d.projection.data.week})`
      : `— (${d.projection.reason})`
    const rank = d.positionRank.available
      ? `${d.positionRank.data.position}${d.positionRank.data.rank} of ${d.positionRank.data.outOf}`
      : `— (${d.positionRank.reason})`
    console.log(`  ${d.player.name}: proj ${proj} · rank ${rank}`)
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
