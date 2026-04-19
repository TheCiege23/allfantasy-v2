import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runTodayActions } from '@/lib/today-actions-engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await runTodayActions(userId)
    return NextResponse.json(body)
  } catch (err) {
    console.error('[today-actions] runTodayActions failed', err)
    const detail = err instanceof Error ? err.message : 'unknown'
    // Return 503 + structured error so the client can surface "Today Actions temporarily unavailable"
    // without defaulting to a misleading "All clear" zero-state.
    return NextResponse.json(
      {
        error: 'Today Actions pipeline failed',
        detail,
        degraded: true,
      },
      { status: 503 },
    )
  }
}
