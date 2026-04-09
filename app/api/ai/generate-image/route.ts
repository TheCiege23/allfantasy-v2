import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  generateTribeLogo,
  generateLeagueBanner,
  generateMergedTribeLogo,
  generateEventGraphic,
} from '@/lib/ai/imageGenerator'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = typeof body.type === 'string' ? body.type : ''
  const sport = typeof body.sport === 'string' ? body.sport : 'NFL'

  try {
    let result = null

    if (type === 'tribe_logo') {
      const name = typeof body.tribeName === 'string' ? body.tribeName : 'Tribe'
      const color = typeof body.tribeColor === 'string' ? body.tribeColor : 'blue'
      result = await generateTribeLogo(name, color, sport)
    } else if (type === 'league_banner') {
      const name = typeof body.leagueName === 'string' ? body.leagueName : 'League'
      const leagueType = typeof body.leagueType === 'string' ? body.leagueType : 'redraft'
      result = await generateLeagueBanner(name, leagueType, sport)
    } else if (type === 'merged_tribe_logo') {
      const name = typeof body.tribeName === 'string' ? body.tribeName : 'Merged Tribe'
      result = await generateMergedTribeLogo(name, sport)
    } else if (type === 'event_graphic') {
      const eventType = typeof body.eventType === 'string' ? body.eventType : 'elimination'
      result = await generateEventGraphic(eventType as any, sport)
    } else {
      return NextResponse.json({ error: 'Unknown type. Use: tribe_logo, league_banner, merged_tribe_logo, event_graphic' }, { status: 400 })
    }

    if (!result) {
      return NextResponse.json({ error: 'Image generation failed or API key not configured' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, image: result })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
