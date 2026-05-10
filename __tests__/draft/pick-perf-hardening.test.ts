/**
 * Draft room performance hardening — structural and source-level invariants.
 *
 * Why source-level: DraftRoomPageClient is a 5 000-line component; mounting it
 * requires a full Next.js environment with auth, session, and pool mocks.
 * Source-level assertions have zero runtime cost and lock the same guarantees.
 *
 * Invariants locked here:
 *   1. handleMakePick does NOT await fetchDraftPool before unlocking the UI
 *      (setPickSubmitting via finally) — pool refresh is fire-and-forget.
 *   2. handleMakePick does NOT await fetchQueue before unlocking the UI on the
 *      success path — queue refresh is fire-and-forget.
 *   3. Pick inflight guard (pickInflightRef) is set BEFORE the network POST.
 *   4. setPickSubmitting(true) is called BEFORE the fetch, not after.
 *   5. draftedNames derives ONLY from session.picks — no pool fetch needed
 *      to mark a player as drafted locally.
 *   6. mergeDraftSessionSnapshot is called BEFORE any background refreshes —
 *      the board advances immediately when the server responds.
 *   7. [draft-perf] round-trip timing log is emitted after snapshot merge
 *      (proves instrumentation is on critical path, not after pool refresh).
 *   8. Pool route: stripPoolEntryFallbacks removes headshotFallbackUrl and
 *      teamLogoFallbackUrl from every entry (saves ~190 KB per response).
 *   9. Pool route: stripping is applied in DB-cache, memory-cache, AND rebuild
 *      paths — no path returns the redundant fallback strings.
 *  10. Pool route: headshotUrl itself is NOT stripped — only the redundant
 *      dedicated fallback fields are removed.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..')
const clientSrc = readFileSync(
  resolve(root, 'components/app/draft-room/DraftRoomPageClient.tsx'),
  'utf8',
)
const poolRouteSrc = readFileSync(
  resolve(root, 'app/api/leagues/[leagueId]/draft/pool/route.ts'),
  'utf8',
)

// ---------------------------------------------------------------------------
// Helpers — locate a token relative to another token
// ---------------------------------------------------------------------------

function idxOf(src: string, token: string): number {
  return src.indexOf(token)
}

// ---------------------------------------------------------------------------
// 1. fetchDraftPool is NOT awaited on the pick success critical path
// ---------------------------------------------------------------------------

describe('Invariant 1: fetchDraftPool is fire-and-forget after pick success', () => {
  it('void fetchDraftPool() appears after setPickSuccessFlash', () => {
    const flashIdx = idxOf(clientSrc, 'setPickSuccessFlash(player.name)')
    const voidPoolIdx = clientSrc.indexOf('void fetchDraftPool()', flashIdx)
    expect(flashIdx).toBeGreaterThan(-1)
    expect(voidPoolIdx).toBeGreaterThan(flashIdx)
  })

  it('await fetchDraftPool() does NOT appear in the pick success block (between flash and finally)', () => {
    // The pick success block starts at setPickSuccessFlash and ends at the
    // "fetchDraftAssistantContext" call. We scan that slice only.
    const flashIdx = idxOf(clientSrc, 'setPickSuccessFlash(player.name)')
    const assistantIdx = clientSrc.indexOf('void fetchDraftAssistantContext()', flashIdx)
    const slice = clientSrc.slice(flashIdx, assistantIdx + 50)
    expect(slice).not.toMatch(/await fetchDraftPool\(\)/)
  })
})

// ---------------------------------------------------------------------------
// 2. fetchQueue is fire-and-forget after pick success
// ---------------------------------------------------------------------------

describe('Invariant 2: fetchQueue is fire-and-forget after pick success', () => {
  it('void fetchQueue() appears after setPickSuccessFlash', () => {
    const flashIdx = idxOf(clientSrc, 'setPickSuccessFlash(player.name)')
    const voidQueueIdx = clientSrc.indexOf('void fetchQueue()', flashIdx)
    expect(flashIdx).toBeGreaterThan(-1)
    expect(voidQueueIdx).toBeGreaterThan(flashIdx)
  })

  it('await fetchQueue() does NOT appear in the pick success block', () => {
    const flashIdx = idxOf(clientSrc, 'setPickSuccessFlash(player.name)')
    const assistantIdx = clientSrc.indexOf('void fetchDraftAssistantContext()', flashIdx)
    const slice = clientSrc.slice(flashIdx, assistantIdx + 50)
    expect(slice).not.toMatch(/await fetchQueue\(\)/)
  })
})

// ---------------------------------------------------------------------------
// 3. pickInflightRef guard is set BEFORE the POST fetch
// ---------------------------------------------------------------------------

describe('Invariant 3: pickInflightRef.current = true set before fetch', () => {
  it('pickInflightRef.current = true appears before fetch(…/draft/pick)', () => {
    const guardIdx = idxOf(clientSrc, 'pickInflightRef.current = true')
    const fetchIdx = clientSrc.indexOf("fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/pick`", guardIdx - 300)
    // guardIdx must be < fetchIdx (guard fires before fetch)
    expect(guardIdx).toBeGreaterThan(-1)
    expect(fetchIdx).toBeGreaterThan(guardIdx)
  })
})

// ---------------------------------------------------------------------------
// 4. setPickSubmitting(true) is called BEFORE the POST
// ---------------------------------------------------------------------------

describe('Invariant 4: pick button disables immediately on click', () => {
  it('setPickSubmitting(true) appears before the pick POST fetch', () => {
    const submittingIdx = idxOf(clientSrc, 'setPickSubmitting(true)')
    const fetchIdx = clientSrc.indexOf("fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/pick`", submittingIdx - 200)
    expect(submittingIdx).toBeGreaterThan(-1)
    expect(fetchIdx).toBeGreaterThan(submittingIdx)
  })
})

// ---------------------------------------------------------------------------
// 5. draftedNames derives from session.picks — no pool refetch needed
// ---------------------------------------------------------------------------

describe('Invariant 5: drafted player state derives from session.picks, not pool', () => {
  it('draftedNames useMemo reads session?.picks', () => {
    expect(clientSrc).toMatch(/draftedNames\s*=\s*useMemo/)
    expect(clientSrc).toMatch(/session\?\.picks/)
  })

  it('draftedPlayerIds useMemo reads session?.picks', () => {
    expect(clientSrc).toMatch(/draftedPlayerIds\s*=\s*useMemo[\s\S]{0,200}session\?\.picks/)
  })

  it('draftedNames is NOT populated from draftPool state', () => {
    // Confirm there is no assignment to draftedNames that reads from draftPool
    expect(clientSrc).not.toMatch(/draftedNames.*draftPool/)
  })
})

// ---------------------------------------------------------------------------
// 6. mergeDraftSessionSnapshot fires BEFORE any background refreshes
// ---------------------------------------------------------------------------

describe('Invariant 6: session snapshot merged before background refreshes', () => {
  it('mergeDraftSessionSnapshot call appears before void fetchQueue/Pool in success block', () => {
    const mergeIdx = clientSrc.indexOf('mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot)')
    // The first occurrence of mergeDraftSessionSnapshot inside handleMakePick
    // is on the success path. The void fetchQueue follows it.
    const voidQueueIdx = clientSrc.indexOf('void fetchQueue()', mergeIdx)
    expect(mergeIdx).toBeGreaterThan(-1)
    expect(voidQueueIdx).toBeGreaterThan(mergeIdx)
  })
})

// ---------------------------------------------------------------------------
// 7. [draft-perf] timing is on the critical path (before background refreshes)
// ---------------------------------------------------------------------------

describe('Invariant 7: [draft-perf] instrumentation is before background refreshes', () => {
  it('[draft-perf] pick round-trip log exists in handleMakePick', () => {
    expect(clientSrc).toContain("[draft-perf] pick round-trip")
  })

  it('[draft-perf] log appears after mergeDraftSessionSnapshot and before pool refresh', () => {
    const mergeIdx = clientSrc.indexOf('mergeDraftSessionSnapshot(prev, data.session as DraftSessionSnapshot)')
    const perfIdx = clientSrc.indexOf("[draft-perf] pick round-trip", mergeIdx)
    const poolIdx = clientSrc.indexOf('void fetchDraftPool()', perfIdx)
    expect(perfIdx).toBeGreaterThan(mergeIdx)
    // perf log is either before or close to the pool refresh — within the same block
    expect(poolIdx).toBeGreaterThanOrEqual(perfIdx - 200)
  })
})

// ---------------------------------------------------------------------------
// 8. Pool route: stripPoolEntryFallbacks removes headshotFallbackUrl
// ---------------------------------------------------------------------------

describe('Invariant 8: pool route strips headshotFallbackUrl from entries', () => {
  it('stripPoolEntryFallbacks function is defined in pool route', () => {
    expect(poolRouteSrc).toContain('function stripPoolEntryFallbacks(')
  })

  it('stripping removes headshotFallbackUrl from display.assets', () => {
    expect(poolRouteSrc).toContain('headshotFallbackUrl')
    // The source must destructure it away (not pass it through)
    expect(poolRouteSrc).toMatch(/headshotFallbackUrl:\s*_hf/)
  })

  it('stripping removes teamLogoFallbackUrl from display.assets', () => {
    expect(poolRouteSrc).toMatch(/teamLogoFallbackUrl:\s*_tf/)
  })

  it('stripping removes headshotFallbackUsed and teamLogoFallbackUsed', () => {
    expect(poolRouteSrc).toMatch(/headshotFallbackUsed:\s*_hu/)
    expect(poolRouteSrc).toMatch(/teamLogoFallbackUsed:\s*_tu/)
  })
})

// ---------------------------------------------------------------------------
// 9. Stripping applied in ALL three cache paths (DB, memory, rebuild)
// ---------------------------------------------------------------------------

describe('Invariant 9: stripPoolEntryFallbacks called in all response paths', () => {
  const stripCalls = [...poolRouteSrc.matchAll(/stripPoolEntryFallbacks\(/g)]

  it('stripPoolEntryFallbacks is called at least 3 times (DB-cache, memory-cache, rebuild)', () => {
    expect(stripCalls.length).toBeGreaterThanOrEqual(3)
  })

  it('strip call appears in DB-cache hit path (before setApiCached for DB path)', () => {
    // DB cache path contains draftPoolCacheModel.findFirst
    const dbCacheIdx = poolRouteSrc.indexOf('draftPoolCacheModel.findFirst')
    const firstStripAfterDb = poolRouteSrc.indexOf('stripPoolEntryFallbacks(', dbCacheIdx)
    expect(firstStripAfterDb).toBeGreaterThan(dbCacheIdx)
  })

  it('strip call appears in cold rebuild path (after getResolvedDraftPoolForLeague)', () => {
    const rebuildIdx = poolRouteSrc.indexOf('getResolvedDraftPoolForLeague(leagueId,')
    const stripAfterRebuild = poolRouteSrc.indexOf('stripPoolEntryFallbacks(', rebuildIdx)
    expect(stripAfterRebuild).toBeGreaterThan(rebuildIdx)
  })
})

// ---------------------------------------------------------------------------
// 10. headshotUrl itself is NOT stripped
// ---------------------------------------------------------------------------

describe('Invariant 10: headshotUrl is preserved in pool response', () => {
  it('stripPoolEntryFallbacks does not remove headshotUrl from assets', () => {
    // The destructure inside stripPoolEntryFallbacks must NOT name headshotUrl
    const fnStart = poolRouteSrc.indexOf('function stripPoolEntryFallbacks(')
    const fnEnd = poolRouteSrc.indexOf('\n}', fnStart)
    const fnBody = poolRouteSrc.slice(fnStart, fnEnd)
    // headshotUrl should NOT appear on the left side of a destructure in the strip fn
    expect(fnBody).not.toMatch(/headshotUrl:\s*_/)
    expect(fnBody).not.toMatch(/headshotUrl,/)
  })

  it('pool route source still references headshotUrl in asset field access', () => {
    // Confirms headshotUrl is used elsewhere — not wholesale removed
    expect(poolRouteSrc).toMatch(/headshotUrl/)
  })
})
