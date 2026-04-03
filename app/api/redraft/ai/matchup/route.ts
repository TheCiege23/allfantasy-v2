import { NextRequest, NextResponse } from 'next/server'
import { generateMatchupInsight } from '@/lib/redraft/ai/matchupAnalyzer'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { matchupId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const matchupId = body.matchupId?.trim()
  if (!matchupId) return NextResponse.json({ error: 'matchupId required' }, { status: 400 })

  const insight = await generateMatchupInsight(matchupId)
  return NextResponse.json({ insight })
}
