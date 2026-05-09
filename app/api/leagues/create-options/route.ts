import { NextResponse } from 'next/server'
import { getLeagueCreateOptionsCatalog } from '@/lib/league-creation/options-catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const catalog = await getLeagueCreateOptionsCatalog()
  return NextResponse.json({ success: true, catalog })
}
