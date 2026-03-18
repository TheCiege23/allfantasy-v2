/**
 * GET /api/leaderboards?board=draft_grades|championships|win_pct|active&limit=
 * Returns one of four platform leaderboards.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getBestDraftGradesLeaderboard,
  getMostChampionshipsLeaderboard,
  getHighestWinPctLeaderboard,
  getMostActiveLeaderboard,
  getTopUsersLeaderboard,
} from '@/lib/platform-leaderboards'

export const dynamic = 'force-dynamic'

const BOARDS = ['top', 'draft_grades', 'championships', 'win_pct', 'active'] as const

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const board = url.searchParams.get('board') ?? 'top'
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 25, 100) : 25

    if (!BOARDS.includes(board as (typeof BOARDS)[number])) {
      return NextResponse.json(
        { error: `Invalid board. Use one of: ${BOARDS.join(', ')}` },
        { status: 400 }
      )
    }

    let result
    switch (board) {
      case 'top':
        result = await getTopUsersLeaderboard({ limit })
        break
      case 'draft_grades':
        result = await getBestDraftGradesLeaderboard({ limit })
        break
      case 'championships':
        result = await getMostChampionshipsLeaderboard({ limit })
        break
      case 'win_pct':
        result = await getHighestWinPctLeaderboard({ limit })
        break
      case 'active':
        result = await getMostActiveLeaderboard({ limit })
        break
      default:
        result = await getTopUsersLeaderboard({ limit })
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('[leaderboards GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load leaderboard' },
      { status: 500 }
    )
  }
}
