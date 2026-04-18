import { NextResponse } from 'next/server'
import { createDemoWeather } from '@/lib/startSit/shared'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sport = new URL(req.url).searchParams.get('sport') || 'nfl'
  const weather = createDemoWeather(sport)
  return NextResponse.json({ weather })
}
