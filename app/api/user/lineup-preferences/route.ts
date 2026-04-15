import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  LINEUP_PREFERENCE_DECAY_RULES,
  LINEUP_PREFERENCE_EXAMPLE_USE,
  LINEUP_PREFERENCE_TIEBREAKER_RULES,
  LINEUP_PREFERENCE_UPDATE_RULES,
} from '@/lib/lineup-preference-learning/rules'
import { loadUserLineupPreferenceProfile } from '@/lib/lineup-preference-learning/persistence'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as
    | { user?: { id?: string } }
    | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await loadUserLineupPreferenceProfile(session.user.id)
    return NextResponse.json({
      profile,
      updateRules: LINEUP_PREFERENCE_UPDATE_RULES,
      decayRules: LINEUP_PREFERENCE_DECAY_RULES,
      tieBreakerRules: LINEUP_PREFERENCE_TIEBREAKER_RULES,
      exampleUseInLineupDecisions: LINEUP_PREFERENCE_EXAMPLE_USE,
    })
  } catch (error) {
    console.error('[user/lineup-preferences GET]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load lineup preferences' },
      { status: 500 }
    )
  }
}
