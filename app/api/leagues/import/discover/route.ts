import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedUser } from '@/lib/auth-guard'
import { resolveProvider } from '@/lib/league-import/ImportProviderResolver'
import {
  getImportProviderLabel,
  supportsImportProviderDiscovery,
} from '@/lib/league-import/provider-ui-config'
import { lookupSleeperUser } from '@/lib/sleeper/user-lookup'
import { getUserLeagues } from '@/lib/sleeper-client'

function normalizeSeason(raw: unknown): string {
  const currentSeason = String(new Date().getFullYear())
  if (typeof raw !== 'string') return currentSeason
  const trimmed = raw.trim()
  return trimmed || currentSeason
}

function normalizeSport(raw: unknown): string {
  if (typeof raw !== 'string') return 'nfl'
  const trimmed = raw.trim().toLowerCase()
  return trimmed || 'nfl'
}

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) {
    return auth.response
  }

  let body: {
    provider?: string
    accountIdentifier?: string
    season?: string
    sport?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const provider = resolveProvider(body.provider ?? '')
  const accountIdentifier =
    typeof body.accountIdentifier === 'string' ? body.accountIdentifier.trim() : ''
  const season = normalizeSeason(body.season)
  const sport = normalizeSport(body.sport)

  if (!provider) {
    return NextResponse.json({ error: 'Unsupported import provider' }, { status: 400 })
  }

  if (!supportsImportProviderDiscovery(provider)) {
    return NextResponse.json(
      {
        error: `${getImportProviderLabel(provider)} account discovery is not available yet.`,
      },
      { status: 400 },
    )
  }

  if (!accountIdentifier) {
    return NextResponse.json(
      { error: 'accountIdentifier is required' },
      { status: 400 },
    )
  }

  if (provider !== 'sleeper') {
    return NextResponse.json(
      {
        error: `${getImportProviderLabel(provider)} account discovery is not implemented yet.`,
      },
      { status: 400 },
    )
  }

  const sleeperUser = await lookupSleeperUser(accountIdentifier)
  if (sleeperUser.status === 'not_found') {
    return NextResponse.json(
      { error: 'Provider account not found.' },
      { status: 404 },
    )
  }
  if (sleeperUser.status === 'unavailable') {
    return NextResponse.json(
      { error: 'Provider lookup is temporarily unavailable. Try again shortly.' },
      { status: 503 },
    )
  }

  try {
    const leagues = await getUserLeagues(sleeperUser.user.user_id, sport, season)
    return NextResponse.json({
      provider,
      sport,
      season,
      account: {
        providerUserId: sleeperUser.user.user_id,
        accountIdentifier: sleeperUser.user.username ?? accountIdentifier,
        displayName:
          sleeperUser.user.display_name?.trim() ||
          sleeperUser.user.username ||
          accountIdentifier,
      },
      leagues: leagues.map((league) => ({
        sourceId: league.league_id,
        name: league.name,
        sport: league.sport,
        season: league.season,
        status: league.status,
        totalTeams: league.total_rosters,
        isDynasty: league.settings?.type === 2,
        avatarUrl: league.avatar
          ? `https://sleepercdn.com/avatars/thumbs/${league.avatar}`
          : null,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to discover provider leagues.',
      },
      { status: 500 },
    )
  }
}
