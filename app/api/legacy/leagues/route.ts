import { NextRequest } from 'next/server'
import { proxyToExisting } from '@/lib/api/proxy-adapter'
import { resolveLegacyUserKeyForCurrentSession } from '@/lib/auth/legacy-user-key'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || (await resolveLegacyUserKeyForCurrentSession())
  return proxyToExisting(req, {
    targetPath: '/api/league/list',
    query: {
      mode: 'legacy',
      userId: userId || undefined,
    },
  })
}
