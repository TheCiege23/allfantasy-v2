import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateTradePackages, TradeBuilderInputSchema } from '@/lib/trade-builder'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const body = await request.json()
    const parsed = TradeBuilderInputSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
    const result = generateTradePackages(parsed.data)
    return NextResponse.json({ data: result })
  } catch (err: any) {
    console.error('[trade-builder] POST error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
