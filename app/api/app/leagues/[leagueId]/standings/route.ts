import { NextRequest } from 'next/server'
import { proxyToExisting } from '@/lib/api/proxy-adapter'

export async function GET(req: NextRequest, { params }: { params: { leagueId: string } }) {
  return proxyToExisting(req, {
    targetPath: `/api/bracket/leagues/${params.leagueId}/standings`,
  })
}
