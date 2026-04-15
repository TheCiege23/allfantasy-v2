import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  computeFranchiseRoadmap,
  FranchiseRoadmapInputSchema,
} from '@/lib/franchise-roadmap'

/**
 * POST /api/franchise-roadmap
 * Generates a 3-5 year franchise roadmap for Dynasty, Devy, or C2C leagues.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = FranchiseRoadmapInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const roadmap = computeFranchiseRoadmap(parsed.data)

    return NextResponse.json({
      data: roadmap,
      mode: roadmap.mode,
      phase: roadmap.currentPhase,
      confidence: roadmap.confidencePct,
    })
  } catch (err: any) {
    console.error('[franchise-roadmap] POST error:', err?.message || err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 },
    )
  }
}
