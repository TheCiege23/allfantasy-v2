const { prisma } = require("../lib/prisma")
;(async () => {
  const ids = ['93e9f201-987b-46d9-87ca-be6863f190d8', 'deab7298-5718-4455-8ae0-c1d8a88bc81e']
  const leagues = await prisma.league.findMany({ where: { id: { in: ids } }, select: { id: true } })
  const sleeperLeagues = await prisma.sleeperLeague.findMany({ where: { id: { in: ids } }, select: { id: true } })
  const claimedRows = await prisma.leagueTeam.findMany({ where: { claimedByUserId: 'local-dev-user', OR: [{ id: '2433d140-bf80-419b-857e-af552edc611d' }] }, select: { id: true, leagueId: true, claimedByUserId: true, platformUserId: true } })
  console.log(JSON.stringify({ leagues, sleeperLeagues, claimedRows }, null, 2))
  await prisma.$disconnect()
})().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
