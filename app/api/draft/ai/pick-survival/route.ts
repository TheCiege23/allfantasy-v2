import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { draftAiText } from '@/lib/draft/ai-claude'
import { buildDraftAiContext, collectAiContextPlayerNames } from '@/lib/draft/ai-context'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const sport = typeof body?.sport === 'string' ? body.sport : null
  const enrichment = await buildDraftAiContext({
    sport,
    playerNames: collectAiContextPlayerNames(body),
  })

  const sys =
    'You are Chimmy. Estimate the probability the named player survives until the next pick, factoring in the supplied news + injuries (recent injury news drives their ADP down or up). JSON: {"probabilityEstimate":0.5,"reasoning":"","factors":[]}'
  try {
    const text = await draftAiText(
      sys,
      `Context:\n${JSON.stringify(body ?? {})}\n${enrichment.promptSection}`,
      { userId: session.user.id },
    )
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    return NextResponse.json({
      result: JSON.parse(cleaned),
      contextSources: { news: enrichment.news.length, injuries: enrichment.injuries.length },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
