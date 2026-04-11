import { headers } from 'next/headers'

/**
 * Server-only: load `/api/user/rank` during dashboard RSC render so the rankings card
 * and tier badge hydrate with data (same session cookies as the incoming request).
 */
export async function fetchUserRankJsonForDashboardSSR(): Promise<Record<string, unknown> | null> {
  try {
    const h = await headers()
    const cookie = h.get('cookie')
    if (!cookie) return null

    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (!host) return null

    const proto =
      h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')

    /** Same host as the incoming request — reliable for self-fetch during RSC (Vercel + local). */
    const url = `${proto}://${host}/api/user/rank`
    const res = await fetch(url, {
      headers: { cookie },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch (e) {
    console.error('[fetchUserRankJsonForDashboardSSR]', e)
    return null
  }
}
