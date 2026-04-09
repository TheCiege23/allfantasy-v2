import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FETCH_TIMEOUT_MS = 10_000

type TokenQueryKey = 'RSC_token' | 'rsc_token'

interface ProbeRow {
  baseUrl: string
  path: string
  queryTokenKey: TokenQueryKey
  status: number
  ok: boolean
  count: number
}

function trimUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function splitList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => trimUrl(v))
    .filter(Boolean)
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function buildRestPaths(sport: string, dataType: string): string[] {
  if (sport === 'NFL') {
    const year = String(new Date().getUTCFullYear())
    const today = new Date().toISOString().slice(0, 10)
    const documented: Record<string, string[]> = {
      players: ['player-info/NFL'],
      injuries: ['injuries/NFL'],
      teams: ['team-info/NFL'],
      projections: [`player-stats/${year}/NFL`, 'player-stats/NFL'],
      schedule: [`schedule-season/${year}/NFL`, `schedule-week/${today}/NFL`, `schedule/${today}/NFL`],
      scores: [`live/${today}/NFL`],
      rosters: ['depth-charts/NFL'],
    }

    return unique([
      ...(documented[dataType] ?? []),
      `${dataType}/${sport}`,
      `${sport}/${dataType}`,
    ])
  }

  return unique([`${dataType}/${sport}`, `${sport}/${dataType}`])
}

function extractCount(data: unknown): number {
  if (Array.isArray(data)) return data.length
  if (!data || typeof data !== 'object') return 0

  const o = data as Record<string, unknown>
  const candidates = [o.players, o.data, o.results, o.items]
  for (const c of candidates) {
    if (Array.isArray(c)) return c.length
  }

  return 0
}

async function probeRest(params: {
  token: string
  bases: string[]
  paths: string[]
}): Promise<ProbeRow[]> {
  const rows: ProbeRow[] = []

  for (const base of params.bases) {
    for (const path of params.paths) {
      for (const queryTokenKey of ['RSC_token', 'rsc_token'] as const) {
        try {
          const url = new URL(`${base}/${path}`)
          url.searchParams.set(queryTokenKey, params.token)

          const res = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${params.token}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          })

          let count = 0
          if (res.ok) {
            try {
              const json = (await res.json()) as unknown
              count = extractCount(json)
            } catch {
              // non-JSON response body
            }
          }

          rows.push({
            baseUrl: base,
            path,
            queryTokenKey,
            status: res.status,
            ok: res.ok,
            count,
          })
        } catch {
          rows.push({
            baseUrl: base,
            path,
            queryTokenKey,
            status: 0,
            ok: false,
            count: 0,
          })
        }
      }
    }
  }

  return rows
}

async function probeGraphql(token: string, urls: string[]): Promise<{
  ok: boolean
  status: number
  count: number
  endpoint: string | null
}> {
  const query = '{ nflRoster { id player } }'

  for (const endpoint of urls) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query }),
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })

      if (!res.ok) continue
      const json = (await res.json()) as { data?: { nflRoster?: unknown[] } }
      const count = Array.isArray(json.data?.nflRoster) ? json.data!.nflRoster!.length : 0
      return { ok: true, status: res.status, count, endpoint }
    } catch {
      // try next endpoint
    }
  }

  return { ok: false, status: 0, count: 0, endpoint: null }
}

export async function GET(req: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const url = new URL(req.url)
  const sport = (url.searchParams?.get('sport') || 'NFL').toUpperCase()
  const dataType = (url.searchParams?.get('dataType') || 'players').toLowerCase()
  const token = process.env.ROLLING_INSIGHTS_RSC_TOKEN?.trim() || ''

  const restBases = unique([
    ...splitList(url.searchParams?.get('bases')),
    ...splitList(process.env.ROLLING_INSIGHTS_REST_BASE_URL || null),
    'https://rest.datafeeds.rolling-insights.com/api/v1',
    'http://rest.datafeeds.rolling-insights.com/api/v1',
  ])

  const restPaths = buildRestPaths(sport, dataType)

  const graphqlEndpoints = unique([
    ...(splitList(url.searchParams?.get('graphql')) || []),
    ...(process.env.ROLLING_INSIGHTS_GRAPHQL_URL ? [trimUrl(process.env.ROLLING_INSIGHTS_GRAPHQL_URL)] : []),
    'https://datafeeds.rolling-insights.com/graphql',
    'https://rest.datafeeds.rolling-insights.com/graphql',
  ])

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: 'ROLLING_INSIGHTS_RSC_TOKEN is not configured',
      },
      { status: 400 }
    )
  }

  try {
    const rest = await probeRest({ token, bases: restBases, paths: restPaths })
    const graphql = await probeGraphql(token, graphqlEndpoints)
    const anyRestSuccess = rest.some((r) => r.ok)

    return NextResponse.json({
      ok: anyRestSuccess || graphql.ok,
      sport,
      dataType,
      rest: {
        candidatesTested: rest.length,
        successes: rest.filter((r) => r.ok).length,
        rows: rest,
      },
      graphql,
      hints: {
        tokenConfigured: true,
        note: 'Read-only diagnostics; no DB writes and no secret values returned.',
      },
      generatedAt: Date.now(),
    })
  } catch (error) {
    console.warn('[admin/ri-probe] failed', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to run RI probe' }, { status: 500 })
  }
}

