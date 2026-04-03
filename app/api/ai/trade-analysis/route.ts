import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueAccess } from '@/lib/ai/league-settings-ai/access'
import { callClaudeJson } from '@/lib/ai/league-settings-ai/claude'
import { buildLeagueContext } from '@/lib/league/buildLeagueContext'

export const dynamic = 'force-dynamic'

type Side = { name?: string; playerId?: string }

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string; give?: Side[]; get?: Side[] }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const give = Array.isArray(body.give) ? body.give : []
  const get = Array.isArray(body.get) ? body.get : []
  if (give.length === 0 && get.length === 0) {
    return NextResponse.json({ error: 'give and get arrays cannot both be empty' }, { status: 400 })
  }

  let leagueBlock = ''
  let historyBlock = ''
  if (body.leagueId) {
    const league = await assertLeagueAccess(body.leagueId, userId)
    if (league) {
      leagueBlock = `League: ${league.name ?? league.id}\nSport: ${league.sport}\nPlatform: ${league.platform}\n`
      try {
        historyBlock = await buildLeagueContext(
          body.leagueId,
          give[0]?.name ?? give[0]?.playerId,
        )
      } catch {
        historyBlock = ''
      }
    }
  }

  const system = `You are Chimmy, AllFantasy's trade analyst. Evaluate the proposed trade fairly. Respond with ONLY valid JSON (no markdown):
{"verdict":"Win"|"Loss"|"Fair","shortTerm":string,"longTerm":string,"recommendation":string}
Verdict is from the trading manager's perspective (the side giving "give" and receiving "get"). Keep each text field concise.
${historyBlock ? `\n\nLEAGUE HISTORY (factor into manager leverage and fairness):\n${historyBlock}` : ''}`

  const userPayload = `${leagueBlock}You give up: ${JSON.stringify(give)}
You receive: ${JSON.stringify(get)}`

  try {
    const raw = await callClaudeJson({ system, user: userPayload })
    return NextResponse.json(raw)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Trade analysis failed'
    console.error('[api/ai/trade-analysis]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
