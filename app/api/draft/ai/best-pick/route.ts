import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { draftAiText } from '@/lib/draft/ai-claude'

export const dynamic = 'force-dynamic'

const SYS = `You are Chimmy, AllFantasy's AI draft assistant. Reply with JSON only: {"recommendations":[{"player":"","reason":""}],"summary":""} with top 3 picks.`

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const ctx = JSON.stringify(body ?? {})
  try {
    const text = await draftAiText(SYS, `Draft context:\n${ctx}`)
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned) as unknown
    return NextResponse.json({ result: parsed })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
