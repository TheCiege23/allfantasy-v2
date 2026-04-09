import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { importSleeperAsSurvivor, type SurvivorImportConfig } from '@/lib/survivor/importEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sleeperLeagueId = typeof body.sleeperLeagueId === 'string' ? body.sleeperLeagueId : ''
  if (!sleeperLeagueId) {
    return NextResponse.json({ error: 'sleeperLeagueId is required' }, { status: 400 })
  }

  const config: SurvivorImportConfig = {
    sleeperLeagueId,
    userId,
    tribeCount: typeof body.tribeCount === 'number' ? body.tribeCount : undefined,
    tribeFormation: body.tribeFormation === 'draft_pattern' ? 'draft_pattern' : 'random',
    tribeNaming: body.tribeNaming === 'ai' ? 'ai' : body.tribeNaming === 'custom' ? 'custom' : 'auto',
    exileEnabled: typeof body.exileEnabled === 'boolean' ? body.exileEnabled : true,
    idolsEnabled: typeof body.idolsEnabled === 'boolean' ? body.idolsEnabled : true,
    idolCount: typeof body.idolCount === 'number' ? body.idolCount : 9,
  }

  try {
    const result = await importSleeperAsSurvivor(config)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
