/**
 * Membership gate for external league imports. Any authenticated user who is a
 * member of the source league (or can access its data via their linked account)
 * may import it into AF.
 *
 * Per-provider strategy:
 *   - sleeper: hit /league/{id}/users and require the user is a league member.
 *   - espn / yahoo: require a linked account that can fetch the league (proves membership).
 *   - fantrax / mfl / fleaflicker: pass through — public APIs allow any user to read.
 */

import { prisma } from '@/lib/prisma'
import type { ImportProvider } from './types'
import { fetchEspnLeagueForImport } from './espn/EspnLeagueFetchService'
import { fetchYahooLeagueForImport } from './yahoo/YahooLeagueFetchService'

export interface CommissionerGateResult {
  ok: boolean
  reason?: string
  /** Source manager id belonging to the requesting user (when we can resolve it). */
  sourceManagerId?: string | null
  /** How the check passed — lets the persistence layer stamp an audit trail. */
  verification?: 'api' | 'attestation'
  /** True when the provider can't be API-verified and caller must resubmit with attestation. */
  requiresAttestation?: boolean
}

export interface AttestationInput {
  /** User explicitly confirmed they are the commissioner/co-commissioner. */
  accepted: boolean
  /** Their free-text statement, stored in the audit trail. */
  statement?: string
}

async function resolveSleeperUserId(appUserId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findFirst({
    where: { userId: appUserId },
    select: { sleeperUserId: true, sleeperUsername: true },
  })
  if (profile?.sleeperUserId) return profile.sleeperUserId
  if (!profile?.sleeperUsername) return null
  try {
    const r = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(profile.sleeperUsername)}`)
    if (!r.ok) return null
    const body = (await r.json()) as { user_id?: string }
    return body?.user_id ?? null
  } catch {
    return null
  }
}

async function checkSleeper(appUserId: string, sourceLeagueId: string): Promise<CommissionerGateResult> {
  const sleeperUserId = await resolveSleeperUserId(appUserId)
  if (!sleeperUserId) {
    return {
      ok: false,
      reason: 'Link your Sleeper account to import from Sleeper — commissioner check requires it.',
    }
  }
  try {
    const r = await fetch(
      `https://api.sleeper.app/v1/league/${encodeURIComponent(sourceLeagueId)}/users`,
    )
    if (!r.ok) {
      return { ok: false, reason: `Sleeper league ${sourceLeagueId} not reachable.` }
    }
    const users = (await r.json()) as Array<{
      user_id: string
      is_owner?: boolean
      metadata?: { is_commissioner?: string | boolean; co_owner?: string | boolean }
    }>
    const me = users.find((u) => u.user_id === sleeperUserId)
    if (!me) {
      return { ok: false, reason: 'You are not a member of that Sleeper league.' }
    }
    return { ok: true, sourceManagerId: sleeperUserId, verification: 'api' }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Sleeper commissioner check failed.',
    }
  }
}

async function checkYahoo(appUserId: string, sourceLeagueId: string): Promise<CommissionerGateResult> {
  try {
    const payload = await fetchYahooLeagueForImport(appUserId, sourceLeagueId)
    const viewerTeamKey = payload.viewerTeamKey?.trim() || null
    if (!viewerTeamKey) {
      return {
        ok: false,
        reason: 'Link the Yahoo account that manages this league before importing it.',
      }
    }
    const commissionerTeamKeys = (payload.commissionerTeamKeys ?? []).filter(Boolean)
    const viewerTeam = payload.teams.find((team) => team.teamKey === viewerTeamKey)
    // Any league member with a linked Yahoo account may import.
    return {
      ok: true,
      sourceManagerId: viewerTeam?.managerGuid ?? viewerTeam?.managerId ?? viewerTeamKey,
      verification: 'api',
    }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Yahoo commissioner check failed.',
    }
  }
}

async function checkEspn(appUserId: string, sourceLeagueId: string): Promise<CommissionerGateResult> {
  try {
    const payload = await fetchEspnLeagueForImport(appUserId, sourceLeagueId, {
      includePreviousSeasons: false,
    })
    const viewerTeamId = payload.viewerTeamId?.trim() || null
    if (!viewerTeamId) {
      return {
        ok: false,
        reason: 'Link the ESPN account that manages this league before importing it.',
      }
    }
    const commissionerTeamIds = (payload.commissionerTeamIds ?? []).filter(Boolean)
    const viewerTeam = payload.teams.find((team) => team.teamId === viewerTeamId)
    // Any league member with a linked ESPN account may import.
    return {
      ok: true,
      sourceManagerId: viewerTeam?.managerId ?? viewerTeamId,
      verification: 'api',
    }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'ESPN commissioner check failed.',
    }
  }
}

/**
 * Providers whose public APIs allow anyone to read league data, so any
 * authenticated user may import them — no membership token required.
 */
const OPEN_READ_PROVIDERS: readonly ImportProvider[] = [
  'mfl',
  'fantrax',
  'fleaflicker',
]

export async function assertImportCommissioner(args: {
  appUserId: string
  provider: ImportProvider
  sourceLeagueId: string
  /** Optional self-attestation payload. Recorded when present; not required. */
  attestation?: AttestationInput
}): Promise<CommissionerGateResult> {
  if (args.provider === 'sleeper') {
    return checkSleeper(args.appUserId, args.sourceLeagueId)
  }
  if (args.provider === 'yahoo') {
    return checkYahoo(args.appUserId, args.sourceLeagueId)
  }
  if (args.provider === 'espn') {
    return checkEspn(args.appUserId, args.sourceLeagueId)
  }
  if (OPEN_READ_PROVIDERS.includes(args.provider)) {
    // Public-read providers: any authenticated user can import.
    return { ok: true, verification: 'api' }
  }
  return {
    ok: false,
    reason: `${args.provider} imports are not yet supported.`,
  }
}

/**
 * Record a commissioner attestation on the newly-imported league so the
 * claim is auditable. Also writes to console.warn for ops visibility.
 */
export async function recordImportAttestation(args: {
  leagueId: string
  appUserId: string
  provider: ImportProvider
  sourceLeagueId: string
  attestation: AttestationInput
}): Promise<void> {
  const { leagueId, appUserId, provider, sourceLeagueId, attestation } = args
  const { prisma } = await import('@/lib/prisma')
  try {
    const current = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { settings: true },
    })
    const merged = {
      ...((current?.settings as Record<string, unknown> | null) ?? {}),
      commissionerAttestation: {
        appUserId,
        provider,
        sourceLeagueId,
        accepted: attestation.accepted,
        statement: (attestation.statement ?? '').slice(0, 500),
        recordedAt: new Date().toISOString(),
      },
    }
    await prisma.league.update({
      where: { id: leagueId },
      data: { settings: merged as never },
    })
  } catch (err) {
    console.warn('[commissionerGate] attestation audit write failed:', err)
  }
}
