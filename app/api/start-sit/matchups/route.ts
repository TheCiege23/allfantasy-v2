import { NextResponse } from 'next/server'
import { createDemoMatchups } from '@/lib/startSit/shared'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sport = new URL(req.url).searchParams.get('sport') || 'nfl'
  const matchups = createDemoMatchups(sport)
  return NextResponse.json({ matchups })
}
