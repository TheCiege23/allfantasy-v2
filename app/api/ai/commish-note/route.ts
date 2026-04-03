import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueAccess, requireSleeper } from '@/lib/ai/league-settings-ai/access'
import { callClaudeJson } from '@/lib/ai/league-settings-ai/claude'
import { fetchSleeperLeagueBundle, readSleeperStateWeek } from '@/lib/ai/league-settings-ai/sleeper'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string; week?: number; context?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }

  const league = await assertLeagueAccess(leagueId, userId)
  if (!league) {
    return NextResponse.json({ error: 'League not found or forbidden' }, { status: 403 })
  }

  if (league.userId !== userId) {
    return NextResponse.json({ error: 'Only the commissioner can generate a league note' }, { status: 403 })
  }

  const sleeperId = requireSleeper(league)
  let sleeperSummary = ''
  if (sleeperId) {
    try {
      const bundle = await fetchSleeperLeagueBundle(sleeperId)
      const wk =
        typeof body.week === 'number' ? body.week : readSleeperStateWeek(bundle.state)
      sleeperSummary = JSON.stringify(
        {
          name: bundle.league.name,
          sport: bundle.sport,
          season: bundle.league.season,
          week: wk,
          teams: bundle.rosters.length,
        },
        null,
        2
      )
    } catch {
      sleeperSummary = ''
    }
  }

  const settingsSnippet = JSON.stringify(league.settings ?? {}, null, 2).slice(0, 6000)

  try {
    const system = `You are Chimmy, AllFantasy's commissioner communications assistant. Draft a concise, friendly commissioner note ready to post to the league chat. Respond with ONLY valid JSON (no markdown):
{"title":string,"body":string}
Tone: clear, inclusive, no insults.`

    const userPayload = `League name: ${league.name ?? leagueId}\nSport: ${league.sport}\nOptional week focus: ${body.week ?? 'current'}\nCommissioner extra context:\n${(body.context ?? '').trim() || '(none)'}\n\nSleeper snapshot:\n${sleeperSummary || '(not available)'}\n\nSynced settings (truncated):\n${settingsSnippet}`

    const raw = await callClaudeJson({ system, user: userPayload })
    return NextResponse.json(raw)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Commissioner note failed'
    console.error('[api/ai/commish-note]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
