import { NextRequest, NextResponse } from 'next/server'
import {
  detectInactiveManagers,
  generateRuleRecommendations,
  moderateLeagueChat,
} from '@/lib/redraft/ai/commissionerAssistant'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { leagueId?: string; seasonId?: string; action?: string; message?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action
  if (action === 'inactive' && body.seasonId) {
    const alerts = await detectInactiveManagers(body.seasonId)
    return NextResponse.json({ alerts })
  }
  if (action === 'rules' && body.leagueId && body.seasonId) {
    const rules = await generateRuleRecommendations(body.leagueId, body.seasonId)
    return NextResponse.json({ rules })
  }
  if (action === 'moderation' && body.message && body.leagueId) {
    const mod = await moderateLeagueChat(body.message, body.leagueId)
    return NextResponse.json({ moderation: mod })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
