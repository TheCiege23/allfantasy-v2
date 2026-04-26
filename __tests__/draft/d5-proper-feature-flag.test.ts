import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  ALLFANTASY_ADP_DRAFT_MODE_ENV,
  ALLFANTASY_ADP_FLAG_ENV,
  ALLFANTASY_ADP_URL_PARAM,
  buildAllFantasyAdpUrl,
  isAllFantasyAdpEnabled,
  resolveAllFantasyAdpDraftMode,
} from '@/lib/adp/allFantasyAdpFlag'

/**
 * D.5-proper — feature flag wiring. The flag module is pure and accepts injected
 * env / URLSearchParams so unit tests don't have to mutate `process.env`.
 *
 * Static-source assertions cover the DraftRoomPageClient changes (the legacy
 * `lookupAiAdpMatch` is gated behind the flag, the fetch URL switches to the
 * AllFantasy source path).
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('D.5-proper — isAllFantasyAdpEnabled', () => {
  it('defaults OFF when env is missing', () => {
    expect(isAllFantasyAdpEnabled({})).toBe(false)
  })

  it('treats "true" / "1" / "yes" as enabled (case-insensitive)', () => {
    expect(isAllFantasyAdpEnabled({ [ALLFANTASY_ADP_FLAG_ENV]: 'true' })).toBe(true)
    expect(isAllFantasyAdpEnabled({ [ALLFANTASY_ADP_FLAG_ENV]: 'TRUE' })).toBe(true)
    expect(isAllFantasyAdpEnabled({ [ALLFANTASY_ADP_FLAG_ENV]: '1' })).toBe(true)
    expect(isAllFantasyAdpEnabled({ [ALLFANTASY_ADP_FLAG_ENV]: 'yes' })).toBe(true)
  })

  it('treats "false" / unset / nonsense as disabled', () => {
    expect(isAllFantasyAdpEnabled({ [ALLFANTASY_ADP_FLAG_ENV]: 'false' })).toBe(false)
    expect(isAllFantasyAdpEnabled({ [ALLFANTASY_ADP_FLAG_ENV]: '' })).toBe(false)
    expect(isAllFantasyAdpEnabled({ [ALLFANTASY_ADP_FLAG_ENV]: 'banana' })).toBe(false)
  })
})

describe('D.5-proper — resolveAllFantasyAdpDraftMode precedence', () => {
  it('default is "real" when nothing is set', () => {
    expect(resolveAllFantasyAdpDraftMode({ env: {} })).toBe('real')
  })

  it('URL ?adpMode=test wins over everything else', () => {
    const sp = new URLSearchParams({ [ALLFANTASY_ADP_URL_PARAM]: 'test' })
    expect(
      resolveAllFantasyAdpDraftMode({ searchParams: sp, env: { [ALLFANTASY_ADP_DRAFT_MODE_ENV]: 'real' } }),
    ).toBe('test')
  })

  it('URL ?adpMode=mock wins over env', () => {
    const sp = new URLSearchParams({ [ALLFANTASY_ADP_URL_PARAM]: 'mock' })
    expect(
      resolveAllFantasyAdpDraftMode({ searchParams: sp, env: { [ALLFANTASY_ADP_DRAFT_MODE_ENV]: 'test' } }),
    ).toBe('mock')
  })

  it('env NEXT_PUBLIC_ALLFANTASY_ADP_DRAFT_MODE=test wins when no URL param', () => {
    expect(
      resolveAllFantasyAdpDraftMode({ env: { [ALLFANTASY_ADP_DRAFT_MODE_ENV]: 'test' } }),
    ).toBe('test')
  })

  it('unknown URL value falls through to env / default', () => {
    const sp = new URLSearchParams({ [ALLFANTASY_ADP_URL_PARAM]: 'banana' })
    expect(
      resolveAllFantasyAdpDraftMode({ searchParams: sp, env: { [ALLFANTASY_ADP_DRAFT_MODE_ENV]: 'mock' } }),
    ).toBe('mock')
  })

  it('unknown env value falls through to default', () => {
    expect(
      resolveAllFantasyAdpDraftMode({ env: { [ALLFANTASY_ADP_DRAFT_MODE_ENV]: 'banana' } }),
    ).toBe('real')
  })
})

describe('D.5-proper — buildAllFantasyAdpUrl', () => {
  it('hits the canonical AllFantasy snapshot path with draftMode=real by default', () => {
    expect(buildAllFantasyAdpUrl('lg-1', { env: {} })).toBe(
      '/api/leagues/lg-1/ai-adp?source=allfantasy&draftMode=real',
    )
  })

  it('honors an explicit draftMode override', () => {
    expect(buildAllFantasyAdpUrl('lg-1', { draftMode: 'test', env: {} })).toBe(
      '/api/leagues/lg-1/ai-adp?source=allfantasy&draftMode=test',
    )
  })

  it('URL-encodes the leagueId', () => {
    expect(buildAllFantasyAdpUrl('a/b c', { env: {} })).toMatch(/\/api\/leagues\/a%2Fb%20c\/ai-adp/)
  })

  it('reads ?adpMode=test from the URL when no explicit draftMode is passed', () => {
    const sp = new URLSearchParams({ [ALLFANTASY_ADP_URL_PARAM]: 'test' })
    expect(buildAllFantasyAdpUrl('lg-1', { searchParams: sp, env: {} })).toBe(
      '/api/leagues/lg-1/ai-adp?source=allfantasy&draftMode=test',
    )
  })
})

describe('D.5-proper — DraftRoomPageClient gates legacy lookup behind the flag', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('imports the flag helpers from lib/adp/allFantasyAdpFlag', () => {
    expect(src).toMatch(/from '@\/lib\/adp\/allFantasyAdpFlag'/)
    expect(src).toMatch(/isAllFantasyAdpEnabled/)
    expect(src).toMatch(/resolveAllFantasyAdpDraftMode/)
    expect(src).toMatch(/buildAllFantasyAdpUrl/)
  })

  it('exposes a memoized `useAllFantasyAdp` flag derived from the env helper', () => {
    expect(src).toMatch(/const useAllFantasyAdp = useMemo\(\(\) => isAllFantasyAdpEnabled\(\)/)
  })

  it('reads ?adpMode= from window.location.search to override draft mode in dev', () => {
    expect(src).toMatch(/new URLSearchParams\(window\.location\.search\)/)
    expect(src).toMatch(/resolveAllFantasyAdpDraftMode\(\{ searchParams: sp \}\)/)
  })

  it('switches the fetch URL to buildAllFantasyAdpUrl when the flag is on', () => {
    expect(src).toMatch(/useAllFantasyAdp[\s\S]*?buildAllFantasyAdpUrl\(leagueId/)
  })

  it('legacy `lookupAiAdpMatch` is bypassed when the flag is on', () => {
    // Both override sites must require `!useAllFantasyAdp` before consulting legacy.
    const matches = src.match(/draftUISettings\?\.aiAdpEnabled && !useAllFantasyAdp/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('row-mapping uses resolver-provided `e.aiAdp` when flag is on', () => {
    expect(src).toMatch(/useAllFantasyAdp\s*\?\s*\(e\.aiAdp \?\? null\)/)
  })

  it('row-mapping passes resolver-provided sample size + low-sample flag through to the table', () => {
    expect(src).toMatch(/aiAdpSampleSize: useAllFantasyAdp \? e\.aiAdpSampleSize/)
    expect(src).toMatch(/aiAdpLowSample: useAllFantasyAdp \? e\.aiAdpLowSample/)
  })

  it('useMemo deps include `useAllFantasyAdp` so the row mapping re-runs when toggled', () => {
    expect(src).toMatch(/aiAdpLookupMaps, draftUISettings\?\.aiAdpEnabled, useAllFantasyAdp/)
  })

  it('fetch deps include flag + draftMode so a URL change re-fetches', () => {
    expect(src).toMatch(/leagueId, draftUISettings\?\.aiAdpEnabled, useAllFantasyAdp, allFantasyAdpDraftMode/)
  })
})

describe('D.5-proper — production isolation guarantees still hold', () => {
  it('flag default is OFF, so existing production users see no change', () => {
    expect(isAllFantasyAdpEnabled({})).toBe(false)
  })

  it('flag-OFF path still hits the legacy `/api/leagues/:id/ai-adp` URL', () => {
    const src = read('components/app/draft-room/DraftRoomPageClient.tsx')
    expect(src).toMatch(/`\/api\/leagues\/\$\{encodeURIComponent\(leagueId\)\}\/ai-adp`/)
  })

  it('the AI ADP API route still serves legacy `getAiAdpForLeague` when no source param', () => {
    const route = read('app/api/leagues/[leagueId]/ai-adp/route.ts')
    expect(route).toMatch(/getAiAdpForLeague\(sport, isDynasty, formatKey\)/)
  })

  it('the route opt-in branch (?source=allfantasy) reads via readAllFantasyAdpForLeague', () => {
    const route = read('app/api/leagues/[leagueId]/ai-adp/route.ts')
    expect(route).toMatch(/sourceParam === 'allfantasy'/)
    expect(route).toMatch(/readAllFantasyAdpForLeague/)
  })

  it('default draftMode for production traffic with the flag on is "real"', () => {
    expect(resolveAllFantasyAdpDraftMode({ env: {} })).toBe('real')
  })
})
