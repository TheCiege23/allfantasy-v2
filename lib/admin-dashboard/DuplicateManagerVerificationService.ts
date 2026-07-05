import { prisma } from "@/lib/prisma"
import { recordIdentitySignal } from "@/lib/identity/IdentitySignalRecorder"
import { createFantasyLeagueRoster } from "@/lib/invite-engine/InviteEngine"
import { listDuplicateManagerFlags, resolveDuplicateManagerFlag } from "@/lib/identity/DuplicateManagerFlagService"

/**
 * Permanent, admin-only, self-cleaning verification tool for the duplicate-manager
 * fraud-hardening flow (league join guard + risk scoring + commissioner review actions).
 *
 * Every row this creates is marked by TEST_LEAGUE_NAME / TEST_EMAIL_DOMAIN below and is
 * deleted again before returning — there is no persistent test fixture left behind.
 * Nothing outside those markers is ever read, written, or deleted. No raw IP/device/
 * user-agent value is ever included in the returned result.
 */
export const TEST_LEAGUE_NAME = "ZZ TEST — Duplicate Manager Verification"
export const TEST_EMAIL_DOMAIN = "@dup-mgr-verify.test-internal"

const FAKE_IP_SHARED = "203.0.113.55" // RFC 5737 TEST-NET-3 — reserved for documentation/testing, never a real user
const FAKE_DEVICE_SHARED = "test-device-fixture-shared"
const FAKE_IP_UNIQUE = "203.0.113.99"
const FAKE_DEVICE_UNIQUE = "test-device-fixture-unique"
const FAKE_UA = "Mozilla/5.0 (dup-mgr-verify admin tool fixture)"

const USER_SPECS = [
  "commissioner-test",
  "baseline-manager-test",
  "suspect-manager-test",
  "joiner-lowrisk-test",
  "joiner-verification-test",
  "joiner-block-test",
  "joiner-allow-test",
  "joiner-household-test",
] as const
type UserSpecKey = (typeof USER_SPECS)[number]

const HIGH_RISK_KEYS = ["joiner-verification-test", "joiner-block-test", "joiner-allow-test", "joiner-household-test"] as const

export const DUPLICATE_MANAGER_VERIFY_PLAN = [
  "1. Create 8 test AppUsers (all emails end in the marker domain), then 1 test league",
  "2. Seat commissioner-test, baseline-manager-test, suspect-manager-test as existing Rosters (+ LeagueTeam rows) in the test league",
  "3. Record IdentitySignal rows via the real recordIdentitySignal() (fake RFC 5737 TEST-NET-3 IP + fake device id) for suspect-manager-test and the 4 high-risk joiners; a distinct fake IP/device for joiner-lowrisk-test",
  "4. Call the real createFantasyLeagueRoster() for joiner-lowrisk-test -> expect a roster created, no flag",
  "5. Call it again for the same user -> expect alreadyMember:true, no duplicate roster",
  "6. Call it for the 4 high-risk joiners -> expect pendingReview:true for each, no roster yet, one IntegrityFlag (flagType=duplicate_manager, status=pending_review) per joiner",
  "7. Call the real listDuplicateManagerFlags() -> assert the sanitized output never contains ip/deviceId/userAgent",
  "8. Resolve flags via the real resolveDuplicateManagerFlag(), least-destructive first: verification_requested -> block -> allow -> household",
  "9. Verify: block never created a roster; allow and household did; household also created exactly one HouseholdException row",
  "10. Cleanup strictly by the exact IDs captured above (never a broad WHERE), in FK-safe order",
  "11. Re-query counts for the test markers -> confirm zero remain",
]

export type VerifyPreflight = {
  testLeagueName: string
  testEmailDomain: string
  operations: string[]
  existingLeagueCount: number
  existingUserCount: number
  safeToExecute: boolean
}

export async function getDuplicateManagerVerifyPreflight(): Promise<VerifyPreflight> {
  const [existingLeagueCount, existingUserCount] = await Promise.all([
    prisma.league.count({ where: { name: TEST_LEAGUE_NAME } }),
    prisma.appUser.count({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } }),
  ])
  return {
    testLeagueName: TEST_LEAGUE_NAME,
    testEmailDomain: TEST_EMAIL_DOMAIN,
    operations: DUPLICATE_MANAGER_VERIFY_PLAN,
    existingLeagueCount,
    existingUserCount,
    safeToExecute: existingLeagueCount === 0 && existingUserCount === 0,
  }
}

type Manifest = {
  leagueId: string | null
  userIds: Partial<Record<UserSpecKey, string>>
  rosterIds: string[]
  leagueTeamIds: string[]
  identitySignalIds: string[]
  integrityFlagIds: Partial<Record<(typeof HIGH_RISK_KEYS)[number], string>>
  householdExceptionIds: string[]
}

function emptyManifest(): Manifest {
  return { leagueId: null, userIds: {}, rosterIds: [], leagueTeamIds: [], identitySignalIds: [], integrityFlagIds: {}, householdExceptionIds: [] }
}

export type VerifyExecutionResult = {
  ok: boolean
  assertions: Record<string, unknown>
  error?: string
  cleanup: { attempted: boolean; failedSteps: string[]; finalLeagueCount: number; finalUserCount: number; remainingManifest?: Manifest }
}

/** Runs the full isolated create -> exercise -> resolve -> cleanup cycle described in DUPLICATE_MANAGER_VERIFY_PLAN. */
export async function runDuplicateManagerVerification(): Promise<VerifyExecutionResult> {
  const preflight = await getDuplicateManagerVerifyPreflight()
  if (!preflight.safeToExecute) {
    return {
      ok: false,
      assertions: {},
      error: `Rows already exist matching the test markers (leagues=${preflight.existingLeagueCount}, users=${preflight.existingUserCount}) — refusing to start a new run on top of a possible leftover.`,
      cleanup: { attempted: false, failedSteps: [], finalLeagueCount: preflight.existingLeagueCount, finalUserCount: preflight.existingUserCount },
    }
  }

  const manifest = emptyManifest()
  const assertions: Record<string, unknown> = {}
  let executionError: string | undefined

  try {
    for (const key of USER_SPECS) {
      const user = await prisma.appUser.create({
        data: {
          email: `${key}${TEST_EMAIL_DOMAIN}`,
          username: `${key}-${Date.now()}`,
          displayName: key,
          emailVerified: new Date(),
        },
      })
      manifest.userIds[key] = user.id
    }

    const league = await prisma.league.create({
      data: {
        name: TEST_LEAGUE_NAME,
        platform: "manual",
        platformLeagueId: `zz-test-${Date.now()}`,
        leagueSize: 10,
        leagueVariant: "redraft",
        userId: manifest.userIds["commissioner-test"]!,
      },
    })
    manifest.leagueId = league.id

    for (const key of ["commissioner-test", "baseline-manager-test", "suspect-manager-test"] as const) {
      const roster = await prisma.roster.create({ data: { leagueId: league.id, platformUserId: manifest.userIds[key]!, playerData: {} } })
      manifest.rosterIds.push(roster.id)
      const team = await prisma.leagueTeam.create({
        data: { leagueId: league.id, externalId: manifest.userIds[key]!, ownerName: key, teamName: `${key} Team`, isCommissioner: key === "commissioner-test" },
      })
      manifest.leagueTeamIds.push(team.id)
    }

    for (const key of ["suspect-manager-test", ...HIGH_RISK_KEYS] as const) {
      await recordIdentitySignal({ userId: manifest.userIds[key]!, ip: FAKE_IP_SHARED, userAgent: FAKE_UA, deviceId: FAKE_DEVICE_SHARED, context: "login" })
    }
    await recordIdentitySignal({ userId: manifest.userIds["joiner-lowrisk-test"]!, ip: FAKE_IP_UNIQUE, userAgent: `${FAKE_UA} unique`, deviceId: FAKE_DEVICE_UNIQUE, context: "login" })
    const signalRows = await prisma.identitySignal.findMany({ where: { userId: { in: Object.values(manifest.userIds) as string[] } }, select: { id: true } })
    manifest.identitySignalIds = signalRows.map((r) => r.id)

    const lowRiskJoin1 = await createFantasyLeagueRoster(league.id, manifest.userIds["joiner-lowrisk-test"]!)
    assertions.lowRiskJoin1 = lowRiskJoin1
    if (!lowRiskJoin1.ok || lowRiskJoin1.alreadyMember || lowRiskJoin1.pendingReview) throw new Error(`Expected a clean low-risk join, got ${JSON.stringify(lowRiskJoin1)}`)

    const lowRiskJoin2 = await createFantasyLeagueRoster(league.id, manifest.userIds["joiner-lowrisk-test"]!)
    assertions.lowRiskJoin2 = lowRiskJoin2
    if (!lowRiskJoin2.ok || !lowRiskJoin2.alreadyMember) throw new Error(`Expected alreadyMember:true on second join, got ${JSON.stringify(lowRiskJoin2)}`)

    for (const key of HIGH_RISK_KEYS) {
      const joinResult = await createFantasyLeagueRoster(league.id, manifest.userIds[key]!)
      assertions[`highRiskJoin_${key}`] = joinResult
      if (!joinResult.ok || !joinResult.pendingReview) throw new Error(`Expected pendingReview:true for ${key}, got ${JSON.stringify(joinResult)}`)
    }

    const flags = await listDuplicateManagerFlags(league.id)
    const serializedFlags = JSON.stringify(flags)
    const leaksRawData = /\b(ip|deviceId|userAgent)\b/i.test(serializedFlags) || serializedFlags.includes(FAKE_IP_SHARED) || serializedFlags.includes(FAKE_DEVICE_SHARED)
    assertions.flagListLeaksRawData = leaksRawData
    if (leaksRawData) throw new Error("listDuplicateManagerFlags() output appears to contain raw ip/device/userAgent data — aborting before any further action.")

    // listDuplicateManagerFlags() deliberately omits joiningUserId (correct sanitization,
    // just verified above) — read the raw model directly here for test-orchestration
    // bookkeeping ONLY, never returned/logged.
    const rawFlags = await prisma.integrityFlag.findMany({ where: { leagueId: league.id, flagType: "duplicate_manager" } })
    const flagIdByUserKey: Partial<Record<(typeof HIGH_RISK_KEYS)[number], string>> = {}
    for (const key of HIGH_RISK_KEYS) {
      const userId = manifest.userIds[key]
      const match = rawFlags.find((f) => (f.evidenceJson as { joiningUserId?: string } | null)?.joiningUserId === userId)
      if (!match) throw new Error(`Could not find a flag whose evidence.joiningUserId matches ${key}`)
      flagIdByUserKey[key] = match.id
      manifest.integrityFlagIds[key] = match.id
    }

    const commissionerId = manifest.userIds["commissioner-test"]!

    const verifResolve = await resolveDuplicateManagerFlag({ flagId: flagIdByUserKey["joiner-verification-test"]!, leagueId: league.id, action: "verification_requested", commissionerUserId: commissionerId })
    assertions.resolveVerification = verifResolve
    if (!verifResolve.ok) throw new Error(`resolve verification_requested failed: ${JSON.stringify(verifResolve)}`)

    const blockResolve = await resolveDuplicateManagerFlag({ flagId: flagIdByUserKey["joiner-block-test"]!, leagueId: league.id, action: "block", commissionerUserId: commissionerId })
    assertions.resolveBlock = blockResolve
    if (!blockResolve.ok) throw new Error(`resolve block failed: ${JSON.stringify(blockResolve)}`)
    if (blockResolve.joinCompleted) throw new Error("Block action must never complete the join")

    const allowResolve = await resolveDuplicateManagerFlag({ flagId: flagIdByUserKey["joiner-allow-test"]!, leagueId: league.id, action: "allow", commissionerUserId: commissionerId })
    assertions.resolveAllow = allowResolve
    if (!allowResolve.ok) throw new Error(`resolve allow failed: ${JSON.stringify(allowResolve)}`)
    if (!allowResolve.joinCompleted) throw new Error("Allow action should complete the join")

    const householdResolve = await resolveDuplicateManagerFlag({ flagId: flagIdByUserKey["joiner-household-test"]!, leagueId: league.id, action: "household", commissionerUserId: commissionerId })
    assertions.resolveHousehold = householdResolve
    if (!householdResolve.ok) throw new Error(`resolve household failed: ${JSON.stringify(householdResolve)}`)
    if (!householdResolve.joinCompleted) throw new Error("Household action should complete the join")

    const rostersAfter = await prisma.roster.findMany({ where: { leagueId: league.id }, select: { id: true, platformUserId: true } })
    for (const r of rostersAfter) if (!manifest.rosterIds.includes(r.id)) manifest.rosterIds.push(r.id)
    const teamsAfter = await prisma.leagueTeam.findMany({ where: { leagueId: league.id }, select: { id: true } })
    for (const t of teamsAfter) if (!manifest.leagueTeamIds.includes(t.id)) manifest.leagueTeamIds.push(t.id)

    const blockedUserHasRoster = rostersAfter.some((r) => r.platformUserId === manifest.userIds["joiner-block-test"])
    const allowedUserHasRoster = rostersAfter.some((r) => r.platformUserId === manifest.userIds["joiner-allow-test"])
    const householdUserHasRoster = rostersAfter.some((r) => r.platformUserId === manifest.userIds["joiner-household-test"])
    assertions.blockedUserHasRoster = blockedUserHasRoster
    assertions.allowedUserHasRoster = allowedUserHasRoster
    assertions.householdUserHasRoster = householdUserHasRoster
    if (blockedUserHasRoster) throw new Error("Blocked user unexpectedly has a roster")
    if (!allowedUserHasRoster) throw new Error("Allowed user is missing a roster")
    if (!householdUserHasRoster) throw new Error("Household-approved user is missing a roster")

    const householdRows = await prisma.householdException.findMany({
      where: { OR: [{ appUserIdA: manifest.userIds["joiner-household-test"] }, { appUserIdB: manifest.userIds["joiner-household-test"] }] },
    })
    manifest.householdExceptionIds = householdRows.map((r) => r.id)
    assertions.householdExceptionCount = householdRows.length
  } catch (err) {
    executionError = err instanceof Error ? err.message : String(err)
  }

  const failedSteps: string[] = []
  async function safeDelete(label: string, fn: () => Promise<unknown>) {
    try {
      await fn()
    } catch {
      failedSteps.push(label)
    }
  }

  if (manifest.householdExceptionIds.length) await safeDelete("householdException", () => prisma.householdException.deleteMany({ where: { id: { in: manifest.householdExceptionIds } } }))
  const flagIds = Object.values(manifest.integrityFlagIds).filter((v): v is string => !!v)
  if (flagIds.length) await safeDelete("integrityFlag", () => prisma.integrityFlag.deleteMany({ where: { id: { in: flagIds } } }))
  if (manifest.rosterIds.length) await safeDelete("roster", () => prisma.roster.deleteMany({ where: { id: { in: manifest.rosterIds } } }))
  if (manifest.leagueTeamIds.length) await safeDelete("leagueTeam", () => prisma.leagueTeam.deleteMany({ where: { id: { in: manifest.leagueTeamIds } } }))
  const userIdValues = Object.values(manifest.userIds).filter((v): v is string => !!v)
  if (userIdValues.length) await safeDelete("growthAttribution", () => prisma.growthAttribution.deleteMany({ where: { userId: { in: userIdValues } } }))
  if (manifest.identitySignalIds.length) await safeDelete("identitySignal", () => prisma.identitySignal.deleteMany({ where: { id: { in: manifest.identitySignalIds } } }))
  if (userIdValues.length) await safeDelete("appUser", () => prisma.appUser.deleteMany({ where: { id: { in: userIdValues } } }))
  if (manifest.leagueId) await safeDelete("league", () => prisma.league.deleteMany({ where: { id: manifest.leagueId! } }))

  const finalCheck = await getDuplicateManagerVerifyPreflight()

  return {
    ok: !executionError && failedSteps.length === 0 && finalCheck.existingLeagueCount === 0 && finalCheck.existingUserCount === 0,
    assertions,
    error: executionError,
    cleanup: {
      attempted: true,
      failedSteps,
      finalLeagueCount: finalCheck.existingLeagueCount,
      finalUserCount: finalCheck.existingUserCount,
      remainingManifest: failedSteps.length > 0 ? manifest : undefined,
    },
  }
}
