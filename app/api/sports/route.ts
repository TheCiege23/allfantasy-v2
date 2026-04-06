import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { API_CHAIN_TTLS, SUPPORTED_SPORTS, toApiChainSport } from '@/lib/workers/api-config'
import type { ApiDataType } from '@/lib/workers/api-config'

export const dynamic = 'force-dynamic'

function isApiDataType(v: string): v is ApiDataType {
  return Object.prototype.hasOwnProperty.call(API_CHAIN_TTLS, v)
}

async function handleSports(req: {
  sport: string
  dataType: string
  options?: Record<string, unknown>
  forceRefresh?: boolean
}) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sport = (req.sport || 'nfl').toLowerCase()
  const chainSport = toApiChainSport(sport)
  if (!chainSport) {
    return NextResponse.json(
      { error: `Unsupported sport: ${sport}. Supported: ${SUPPORTED_SPORTS.join(', ')}` },
      { status: 400 }
    )
  }

  const rawType = (req.dataType || 'players').toLowerCase()
  if (!isApiDataType(rawType)) {
    return NextResponse.json({ error: `Unsupported data type: ${req.dataType}` }, { status: 400 })
  }
  const dataType = rawType as ApiDataType

  const result = await fetchWithChain({
    sport: chainSport,
    dataType,
    options: req.options,
    forceRefresh: req.forceRefresh,
  })

  const fetchedAt =
    result.fromCache && typeof result.cacheAge === 'number'
      ? new Date(Date.now() - result.cacheAge * 1000).toISOString()
      : new Date().toISOString()

  if (!result.data) {
    return NextResponse.json(
      {
        sport,
        dataType,
        fromCache: result.fromCache,
        cacheAge: result.cacheAge ?? null,
        source: result.source ?? null,
        cached: result.fromCache,
        fetchedAt,
        count: null,
        data: null,
        error: result.error ?? 'All providers failed',
      },
      { status: 502 }
    )
  }

  return NextResponse.json({
    sport,
    dataType,
    fromCache: result.fromCache,
    cacheAge: result.cacheAge ?? null,
    source: result.source ?? null,
    cached: result.fromCache,
    fetchedAt,
    count: Array.isArray(result.data) ? result.data.length : null,
    data: result.data,
    error: result.error ?? null,
  })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    let options: Record<string, unknown> | undefined
    const optionsRaw = searchParams.get('options')
    if (optionsRaw) {
      try {
        options = JSON.parse(optionsRaw) as Record<string, unknown>
      } catch {
        return NextResponse.json({ error: 'Invalid options JSON' }, { status: 400 })
      }
    }

    return await handleSports({
      sport: searchParams.get('sport') ?? 'nfl',
      dataType: searchParams.get('type') ?? 'players',
      options,
      forceRefresh,
    })
  } catch (err: unknown) {
    const anyErr = err as { message?: string; stack?: string }
    console.error('[api/sports] error:', anyErr?.message, anyErr?.stack)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      sport?: string
      type?: string
      dataType?: string
      options?: Record<string, unknown>
      forceRefresh?: boolean
      refresh?: boolean
    }
    return await handleSports({
      sport: body.sport ?? 'nfl',
      dataType: body.type ?? body.dataType ?? 'players',
      options: body.options,
      forceRefresh: body.forceRefresh === true || body.refresh === true,
    })
  } catch (err: unknown) {
    const anyErr = err as { message?: string; stack?: string }
    console.error('[api/sports] POST error:', anyErr?.message, anyErr?.stack)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
