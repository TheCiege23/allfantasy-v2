/**
 * Deterministic local-dev fixture: gives the Local Dev User BOTH dashboard contexts to observe.
 *
 *   League A — "Dev Commissioner League"  : Local Dev User OWNS it  -> Commissioner Focus
 *   League B — "Dev Managed League"       : Local Dev User is MEMBER -> Team Focus
 *
 * Composed from the patterns already proven by scripts/seed-managed-only-dev-league.ts and
 * scripts/seed-redraft-war-room-runtime.ts rather than inventing a parallel fixture shape.
 *
 * PROPERTIES (all required by the verification-first brief):
 *  - SAFE      : refuses to run against the production host (see PROD_HOST_MARKERS). Fails closed —
 *                an unparseable/absent DATABASE_URL aborts rather than guessing.
 *  - IDEMPOTENT: deterministic ids + upserts; re-running converges to the same state. Rosters/members
 *                for the two fixture leagues are replaced wholesale (scoped strictly to these two
 *                league ids — never a global delete).
 *  - CANONICAL : writes real `League` / `Roster` / `RedraftLeagueMember` rows via Prisma Client, not
 *                mocked UI-only objects.
 *
 * RUN:
 *   node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/seed-dev-fixture.ts
 * or:
 *   npm run seed:dev
 *
 * RESET (removes ONLY this fixture's two leagues and their children):
 *   npm run seed:dev -- --reset
 */

// Production endpoint markers. `ep-spring-tooth` is the known production Neon host; the generic
// markers catch a prod URL that is renamed or moved to another provider.
const PROD_HOST_MARKERS = ['ep-spring-tooth', 'prod', 'production']
const DEV_HOST_ALLOWLIST = ['ep-curly-block', 'localhost', '127.0.0.1']

const LOCAL_DEV_USER = {
  id: 'local-dev-user',
  email: 'local-dev@allfantasy.local',
  username: 'local_dev_user',
  displayName: 'Local Dev User',
}

// Deterministic — re-running the seed converges instead of duplicating.
const FIXTURE = {
  commissionerLeagueId: 'dev-fixture-commissioner-league',
  managedLeagueId: 'dev-fixture-managed-league',
  syntheticCommissionerId: 'dev-fixture-synthetic-commissioner',
  season: 2026,
} as const

const MANAGER_NAMES = [
  'Gridiron Gang',
  'Dynasty Dragons',
  'Sunday Scaries',
  'Waiver Wire Wolves',
  'Play Action Panthers',
  'Red Zone Raiders',
  'Hail Mary Hawks',
  'Blitz Brigade',
  'Pylon Pirates',
]

function assertNonProductionDatabase(): { host: string; database: string } {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('SEED ABORTED: DATABASE_URL is not set. Refusing to run against an unknown database.')
  }

  let host: string
  try {
    host = new URL(url.replace(/^postgres(ql)?:\/\//, 'http://')).host
  } catch {
    throw new Error('SEED ABORTED: DATABASE_URL could not be parsed. Refusing to guess the target database.')
  }

  const database = url.split('/').pop()?.split('?')[0] ?? '?'
  const haystack = `${host}/${database}`.toLowerCase()

  const hitProdMarker = PROD_HOST_MARKERS.find((m) => haystack.includes(m))
  if (hitProdMarker) {
    throw new Error(
      `SEED ABORTED: target "${haystack}" matches production marker "${hitProdMarker}". ` +
        'This seed writes data and must never touch production.',
    )
  }

  // Fail CLOSED: an unrecognized host is refused rather than assumed safe. If you are legitimately on a
  // new dev branch, add its host to DEV_HOST_ALLOWLIST deliberately.
  const onAllowlist = DEV_HOST_ALLOWLIST.some((m) => haystack.includes(m))
  if (!onAllowlist) {
    throw new Error(
      `SEED ABORTED: target "${haystack}" is not on the dev allowlist [${DEV_HOST_ALLOWLIST.join(', ')}]. ` +
        'Add it explicitly if this really is a safe non-production database.',
    )
  }

  return { host, database }
}

async function main() {
  const reset = process.argv.includes('--reset')
  const { host, database } = assertNonProductionDatabase()
  console.log(`[seed:dev] target OK (non-production): ${host}/${database}`)

  const { prisma } = await import('../lib/prisma')
  const db = prisma as any

  const fixtureLeagueIds = [FIXTURE.commissionerLeagueId, FIXTURE.managedLeagueId]

  // Scoped teardown — ONLY this fixture's two leagues. Never a global delete.
  const clearFixtureChildren = async () => {
    await db.redraftLeagueMember.deleteMany({ where: { leagueId: { in: fixtureLeagueIds } } }).catch(() => {})
    await db.roster.deleteMany({ where: { leagueId: { in: fixtureLeagueIds } } }).catch(() => {})
  }

  if (reset) {
    await clearFixtureChildren()
    await db.league.deleteMany({ where: { id: { in: fixtureLeagueIds } } }).catch(() => {})
    console.log('[seed:dev] reset complete — fixture leagues removed. Nothing else was touched.')
    await prisma.$disconnect()
    return
  }

  // 1. Local Dev User — find-or-create so the seed works before the first bypass login.
  let devUser = await prisma.appUser.findFirst({
    where: {
      OR: [
        { id: LOCAL_DEV_USER.id },
        { email: { equals: LOCAL_DEV_USER.email, mode: 'insensitive' } },
        { username: LOCAL_DEV_USER.username },
      ],
    },
  })
  if (!devUser) {
    devUser = await prisma.appUser.create({
      data: { ...LOCAL_DEV_USER, emailVerified: new Date() },
    })
    console.log('[seed:dev] created Local Dev User')
  }

  // 2. Synthetic commissioner — owns League B so the dev user is a member there, not an owner.
  const syntheticCommissioner = await prisma.appUser.upsert({
    where: { id: FIXTURE.syntheticCommissionerId },
    update: {},
    create: {
      id: FIXTURE.syntheticCommissionerId,
      email: 'dev-fixture-commissioner@allfantasy.local',
      username: 'dev_fixture_commish',
      displayName: 'Fixture Commissioner',
      emailVerified: new Date(),
    },
  })

  await clearFixtureChildren()

  // 3. League A — Commissioner Focus.
  //    resolveIsCommissioner() (lib/dashboard/get-dashboard-league-list.ts) returns true when the
  //    viewer owns the row AND (isCommissioner flag OR platform is allfantasy/manual/af/native).
  const commissionerLeague = await db.league.upsert({
    where: { id: FIXTURE.commissionerLeagueId },
    update: { name: 'Dev Commissioner League' },
    create: {
      id: FIXTURE.commissionerLeagueId,
      userId: devUser.id,
      platform: 'allfantasy',
      platformLeagueId: 'dev-fixture-commissioner',
      name: 'Dev Commissioner League',
      sport: 'NFL',
      season: FIXTURE.season,
      leagueSize: MANAGER_NAMES.length + 1,
      isDynasty: false,
      leagueType: 'redraft',
      status: 'in_season',
      lifecycleState: 'in_season',
      isCommissioner: true,
    },
  })

  // 4. League B — Team Focus (dev user is a MEMBER; a different user owns it).
  const managedLeague = await db.league.upsert({
    where: { id: FIXTURE.managedLeagueId },
    update: { name: 'Dev Managed League' },
    create: {
      id: FIXTURE.managedLeagueId,
      userId: syntheticCommissioner.id,
      platform: 'allfantasy',
      platformLeagueId: 'dev-fixture-managed',
      name: 'Dev Managed League',
      sport: 'NFL',
      season: FIXTURE.season,
      leagueSize: 10,
      isDynasty: false,
      leagueType: 'redraft',
      status: 'in_season',
      lifecycleState: 'in_season',
      isCommissioner: false,
    },
  })

  // 5. Managers — the dev user plus synthetic opponents, so league size is realistic rather than 1.
  const managerUsers: { id: string; name: string }[] = []
  for (let i = 0; i < MANAGER_NAMES.length; i++) {
    const id = `dev-fixture-manager-${i + 1}`
    await prisma.appUser.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email: `dev-fixture-manager-${i + 1}@allfantasy.local`,
        username: `dev_fixture_mgr_${i + 1}`,
        displayName: MANAGER_NAMES[i],
        emailVerified: new Date(),
      },
    })
    managerUsers.push({ id, name: MANAGER_NAMES[i] })
  }

  // 6. Rosters. The dev user gets one in BOTH leagues (a roster is what makes a league "yours").
  await db.roster.create({
    data: { leagueId: commissionerLeague.id, platformUserId: devUser.id, playerData: {} },
  })
  for (const m of managerUsers) {
    await db.roster.create({
      data: { leagueId: commissionerLeague.id, platformUserId: m.id, playerData: {} },
    })
  }

  await db.roster.create({
    data: { leagueId: managedLeague.id, platformUserId: syntheticCommissioner.id, playerData: {} },
  })
  await db.roster.create({
    data: { leagueId: managedLeague.id, platformUserId: devUser.id, playerData: {} },
  })

  // 7. Membership roles — MEMBER in League B is what keeps it out of Commissioner Focus.
  await db.redraftLeagueMember
    .create({ data: { leagueId: managedLeague.id, userId: devUser.id, role: 'MEMBER' } })
    .catch(() => {})

  const rosterCount = await db.roster.count({ where: { leagueId: { in: fixtureLeagueIds } } })

  console.log('[seed:dev] done.')
  console.log(`  Commissioner Focus -> "${commissionerLeague.name}" (${commissionerLeague.id}) owner=${devUser.id}`)
  console.log(`  Team Focus         -> "${managedLeague.name}" (${managedLeague.id}) owner=${syntheticCommissioner.id}, dev user = MEMBER`)
  console.log(`  managers seeded: ${managerUsers.length + 1} across 2 leagues, rosters: ${rosterCount}`)
  console.log('  Log in at /login -> "Continue as Local Dev User"')

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
  try {
    const { prisma } = await import('../lib/prisma')
    await prisma.$disconnect()
  } catch {}
})
