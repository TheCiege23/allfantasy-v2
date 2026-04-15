import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { isCreateLeagueV2EnabledForRequest } from '@/lib/feature-flags/createLeagueV2'

import { CreateLeagueV2Client } from './CreateLeagueV2Client'

export const dynamic = 'force-dynamic'

function firstStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined
  return typeof value === 'string' ? value : value[0]
}

/**
 * Premium Create League v2 — gated behind the `create_league_v2` feature
 * flag (env var or `?v2=1`). When disabled it 404s so prod traffic keeps
 * hitting the legacy wizard at `/create-league`.
 */
export default async function CreateLeagueV2Page({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>
}) {
  const sp =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {}

  if (!isCreateLeagueV2EnabledForRequest(sp)) {
    notFound()
  }

  const e2eAuth = firstStringParam(sp.e2eAuth)
  const allowE2EBypass = process.env.NODE_ENV !== 'production' && e2eAuth === '1'

  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  const userId = session?.user?.id ?? (allowE2EBypass ? 'e2e-user' : undefined)

  if (!userId) {
    redirect('/login?callbackUrl=/create-league/v2')
  }

  return <CreateLeagueV2Client userId={userId} />
}
