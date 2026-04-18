import { NextResponse } from 'next/server'
import { getInjuryReport } from '@/lib/data/players'
import { createDemoInjuries, uiKeyToDataSport } from '@/lib/startSit/shared'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sport = new URL(req.url).searchParams.get('sport') || 'nfl'
  const dataSport = uiKeyToDataSport(sport)

  try {
    const rows = await getInjuryReport(dataSport)
    const injuries = rows.slice(0, 14).map((r) => ({
      player: r.playerName,
      source: 'Injury report DB',
      time: new Date(r.reportDate).toLocaleDateString(),
      severity: (/out|ir|doubtful/i.test(r.status || '') ? 'high' : 'medium') as 'high' | 'medium' | 'low',
      text: [r.status, r.notes].filter(Boolean).join(' — ').slice(0, 220),
    }))
    if (injuries.length === 0) {
      return NextResponse.json({ injuries: createDemoInjuries(sport) })
    }
    return NextResponse.json({ injuries })
  } catch (e) {
    console.warn('[start-sit/injuries]', e)
    return NextResponse.json({ injuries: createDemoInjuries(sport) })
  }
}
