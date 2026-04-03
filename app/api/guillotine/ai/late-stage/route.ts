import { NextRequest, NextResponse } from 'next/server'
import { generateLateStageStrategy } from '@/lib/guillotine/ai/lateStageRebuildEngine'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { rosterId?: string; seasonId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.rosterId || !body.seasonId) {
    return NextResponse.json({ error: 'rosterId and seasonId required' }, { status: 400 })
  }

  const strategy = await generateLateStageStrategy(body.rosterId, body.seasonId)
  return NextResponse.json({ strategy })
}
