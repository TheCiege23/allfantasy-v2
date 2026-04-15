import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { openaiChatText } from '@/lib/openai-client'
import { ingest, storylineGenerated } from '@/lib/notification-engine'
import { getInjuries } from '@/lib/injuries'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { leagueId, season, week, storyType = 'weekly_storyline' } = body as {
    leagueId?: string
    season?: number
    week?: number
    storyType?: string
  }

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }

  try {
    const [league, teams] = await Promise.all([
      prisma.league.findUnique({ where: { id: leagueId }, select: { name: true, sport: true, leagueSize: true } }),
      prisma.leagueTeam.findMany({ where: { leagueId }, select: { teamName: true, ownerName: true }, take: 20 }),
    ])
    const injuries = await getInjuries(String(league?.sport ?? 'NFL'), { limit: 15 })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const prompt = [
      `Write a short, entertaining weekly storyline for the fantasy league "${league.name}" (${league.sport}, ${league.leagueSize ?? '?'} teams).`,
      `Season: ${season ?? new Date().getFullYear()}, Week: ${week ?? '?'}`,
      `Teams: ${teams.map((t) => t.teamName ?? t.ownerName ?? 'Unknown').join(', ')}`,
      `Key injuries: ${injuries.slice(0, 8).map((i) => `${i.playerName}(${i.status})`).join(', ') || 'None major'}`,
      `Story type: ${storyType}`,
      `Write 2-3 paragraphs. Be dramatic and fun. Reference specific teams.`,
    ].join('\n')

    const result = await openaiChatText({
      messages: [
        { role: 'system', content: 'You are an entertaining fantasy sports commentator who writes league storylines.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 600,
    })

    if (!result.ok) {
      return NextResponse.json({ error: 'Story generation failed' }, { status: 502 })
    }

    // Save to DB
    const storyline = await prisma.leagueStoryline.create({
      data: {
        leagueId,
        season: season ?? null,
        week: week ?? null,
        storyType,
        title: `Week ${week ?? '?'} Storyline`,
        summary: result.text.slice(0, 500),
        body: result.text,
        source: 'ai',
      },
    })

    // Fire notification to league members
    void ingest(storylineGenerated({ leagueId, title: storyline.title, storyId: storyline.id }))

    return NextResponse.json({ ok: true, storyline: { id: storyline.id, title: storyline.title, body: storyline.body } })
  } catch (e) {
    console.error('[league-story]', e)
    return NextResponse.json({ error: 'Story generation failed' }, { status: 500 })
  }
}
