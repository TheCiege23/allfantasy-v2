import { NextRequest, NextResponse } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { API_CHAIN_TTLS, SUPPORTED_SPORTS, toApiChainSport } from '@/lib/workers/api-config'
import type { ApiChainSport, ApiDataType } from '@/lib/workers/api-config'

export const dynamic = 'force-dynamic'

function isApiDataType(v: string): v is ApiDataType {
  return Object.prototype.hasOwnProperty.call(API_CHAIN_TTLS, v)
}

function isSupportedSportsDataType(v: string): boolean {
  return isApiDataType(v) || v === 'games' || v === 'stats'
}

async function handleSports(req: {
  sport: string
  dataType: string
  options?: Record<string, unknown>
  forceRefresh?: boolean
}) {
  const sportRaw = (req.sport || 'nfl').toLowerCase()
  const chainSport = toApiChainSport(sportRaw) as ApiChainSport | null
  if (!chainSport || !(SUPPORTED_SPORTS as readonly string[]).includes(chainSport)) {
    return NextResponse.json(
      { error: `Unsupported sport: ${sportRaw}. Supported: ${SUPPORTED_SPORTS.join(', ')}` },
      { status: 400 }
    )
  }

  const rawType = (req.dataType || 'players').toLowerCase()
  if (!isSupportedSportsDataType(rawType)) {
    return NextResponse.json({ error: `Unsupported data type: ${req.dataType}` }, { status: 400 })
  }
  const dataType = rawType as ApiDataType | 'games' | 'stats'

  const result = await fetchWithChain({
    sport: chainSport,
    dataType,
    options: req.options,
    forceRefresh: req.forceRefresh,
  })

  return NextResponse.json({
    sport: chainSport,
    dataType,
    fromCache: result.fromCache,
    cacheAge: result.cacheAge ?? null,
    count: Array.isArray(result.data) ? result.data.length : null,
    data: result.data,
    error: result.error ?? null,
  })
}

const getSportsHandler = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    const identifier = searchParams.get('id') || undefined
    const optionsRaw = searchParams.get('options')
    let options: Record<string, unknown> | undefined
    if (optionsRaw) {
      try {
        options = JSON.parse(optionsRaw) as Record<string, unknown>
      } catch {
        return NextResponse.json({ error: 'Invalid options JSON' }, { status: 400 })
      }
    }
    const mergedOptions: Record<string, unknown> = options ? { ...options } : {}
    if (identifier) {
      mergedOptions.id ??= identifier
      mergedOptions.identifier ??= identifier
      mergedOptions.search ??= identifier
      mergedOptions.playerName ??= identifier
    }

    return await handleSports({
      sport: searchParams.get('sport') ?? 'nfl',
      dataType: searchParams.get('type') ?? 'players',
      options: Object.keys(mergedOptions).length > 0 ? mergedOptions : undefined,
      forceRefresh,
    })
  } catch (err: unknown) {
    const anyErr = err as { message?: string; stack?: string }
    console.error('[api/sports] error:', anyErr?.message, anyErr?.stack)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const postSportsHandler = async (req: NextRequest) => {
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

export const GET = withApiUsage({ endpoint: '/api/sports', tool: 'Sports' })(getSportsHandler)
export const POST = withApiUsage({ endpoint: '/api/sports', tool: 'Sports' })(postSportsHandler)
