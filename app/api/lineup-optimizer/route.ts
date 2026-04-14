import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { optimizeLineup, LineupOptimizerInputSchema } from '@/lib/lineup-optimizer/lineup-optimizer-engine'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const body = await request.json()
    const parsed = LineupOptimizerInputSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
    const result = optimizeLineup(parsed.data)
    return NextResponse.json({ data: result })
  } catch (err: any) {
    console.error('[lineup-optimizer] POST error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
