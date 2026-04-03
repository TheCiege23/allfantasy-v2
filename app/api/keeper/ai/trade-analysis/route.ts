import { NextRequest, NextResponse } from 'next/server'
import { analyzeKeeperTrade } from '@/lib/keeper/ai/keeperTradeAnalyzer'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { tradeId?: string; leagueId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.tradeId || !body.leagueId) {
    return NextResponse.json({ error: 'tradeId and leagueId required' }, { status: 400 })
  }

  const out = await analyzeKeeperTrade(body.tradeId, body.leagueId)
  return NextResponse.json(out)
}
