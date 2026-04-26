/**
 * Production cleanup / deploy gate — non-mutating assertions for draft room launch.
 * Complements: d5-scheduler-cron-route, d5-proper-feature-flag, d6-1-right-dock-tabs.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/cron/recompute-allfantasy-adp/route'
import { isD6PreviewRouteEnabled } from '@/lib/dev/d6PreviewRoute'
import { resolveAllFantasyAdpDraftMode } from '@/lib/adp/allFantasyAdpFlag'

const root = resolve(__dirname, '..', '..')

function makeReq(url: string, init?: RequestInit) {
  return new Request(url, init) as unknown as Parameters<typeof GET>[0]
}

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('draft launch gate — d6 dev preview', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('isD6PreviewRouteEnabled is false in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    // Re-import would cache module; the function reads process.env at call time
    expect(isD6PreviewRouteEnabled()).toBe(false)
  })

  it('isD6PreviewRouteEnabled is true in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(isD6PreviewRouteEnabled()).toBe(true)
  })

  it('d6 preview page uses shared guard and notFound', () => {
    const page = read('app/dev/d6-preview/page.tsx')
    expect(page).toMatch(/isD6PreviewRouteEnabled/)
    expect(page).toMatch(/notFound\(\)/)
  })
})

describe('draft launch gate — AllFantasy ADP default', () => {
  it('resolveAllFantasyAdpDraftMode defaults to real', () => {
    expect(resolveAllFantasyAdpDraftMode({ env: {} })).toBe('real')
  })
})

describe('draft launch gate — recompute ADP cron rejects unauthenticated calls', () => {
  it('returns 401 when no secret is provided', async () => {
    const res = await GET(makeReq('http://localhost/api/cron/recompute-allfantasy-adp'))
    expect(res.status).toBe(401)
  })
})

describe('draft launch gate — draft-room client has no hardcoded http(s) URLs', () => {
  const rel = 'components/app/draft-room/DraftRoomPageClient.tsx'
  it('DraftRoomPageClient does not embed provider base URLs (use /api routes)', () => {
    const src = read(rel)
    expect(src).not.toMatch(/https?:\/\//)
  })
})

describe('draft launch gate — new dock tabs stay Supabase-free (d6-1 contract)', () => {
  it('matches d6-1: DraftRightDockTabs + PlayerPanel have no Supabase imports', () => {
    const dock = read('components/app/draft-room/DraftRightDockTabs.tsx')
    const panel = read('components/app/draft-room/PlayerPanel.tsx')
    expect(dock).not.toMatch(/supabase|@supabase/)
    expect(panel).not.toMatch(/from\s*['"](?:@|\.).*supabase/i)
  })
})
