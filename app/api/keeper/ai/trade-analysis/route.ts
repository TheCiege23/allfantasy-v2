import { NextRequest, NextResponse } from 'next/server'
import { analyzeKeeperTrade } from '@/lib/keeper/ai/keeperTradeAnalyzer'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { recordTradeSurfaceShadow } from '@/lib/decision-os/trade/surfaceShadow'

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

  // AF_TRADE_UNIFICATION_BRIEF Phase 2 shadow instrumentation (flag-gated,
  // never affects the response). NOTE: analyzeKeeperTrade is currently a
  // hardcoded placeholder (see keeperTradeAnalyzer.ts) — surfaceAnalysisMode
  // 'placeholder_stub' makes that visible in parity telemetry until the
  // keeper surface consumes the canonical trade decision.
  recordTradeSurfaceShadow({
    surface: 'keeper',
    userId: typeof gate === 'string' ? gate : null,
    leagueId: body.leagueId,
    surfaceVerdict: out.recommendation,
    surfaceAnalysisMode: 'placeholder_stub',
  })

  return NextResponse.json(out)
}
