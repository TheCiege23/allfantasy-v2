/**
 * Phase 2: Player Canonicalization + Image Repair Pipeline tests
 *
 * Covers:
 *   - getCanonicalPlayerKey priority chain
 *   - resolvePlayerImage fallback order
 *   - detectSharedImages detection
 *   - Teamless filter logic (pure unit test of the filter predicate)
 *   - buildPlayerPoolAudit Phase 2 fields
 */
import { describe, it, expect } from 'vitest'
import {
  getCanonicalPlayerKey,
  isProviderImage,
  isAfPlaceholderImage,
  canonicalPosition,
} from '../../lib/draft-room/player-canonical-identity'
import {
  resolvePlayerImage,
  sleeperHeadshotUrl,
  apiSportsHeadshotUrl,
  detectSharedImages,
} from '../../lib/players/player-image-pipeline'
import { buildPlayerPoolAudit, type PlayerPoolAuditRow } from '../../lib/draft-room/player-pool-audit'

// ---------------------------------------------------------------------------
// getCanonicalPlayerKey — priority chain
// ---------------------------------------------------------------------------
describe('getCanonicalPlayerKey priority chain', () => {
  it('prefers sleeperId when numeric', () => {
    const key = getCanonicalPlayerKey({
      sleeperId: '5859',
      sportsDataId: 'sd-123',
      name: 'A.J. Brown',
      position: 'WR',
      team: 'PHI',
    })
    expect(key).toBe('sleeper:5859')
  })

  it('falls through to sportsDataId when no valid sleeperId', () => {
    const key = getCanonicalPlayerKey({
      sleeperId: null,
      sportsDataId: 'sd-456',
      name: 'D.K. Metcalf',
      position: 'WR',
      team: 'SEA',
    })
    expect(key).toBe('sportsdata:sd-456')
  })

  it('uses apiSportsId if sportsDataId absent', () => {
    const key = getCanonicalPlayerKey({
      apiSportsId: 'api-789',
      name: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
    })
    expect(key).toBe('sportsdata:api-789')
  })

  it('uses thesportsdbId when no numeric or external IDs', () => {
    const key = getCanonicalPlayerKey({
      thesportsdbId: 'tsdb-999',
      name: 'CeeDee Lamb',
      position: 'WR',
      team: 'DAL',
    })
    expect(key).toBe('thesportsdb:tsdb-999')
  })

  it('falls back to name|pos|team when no external IDs', () => {
    const key = getCanonicalPlayerKey({
      name: 'Deebo Samuel Sr.',
      position: 'WR',
      team: null,
    })
    expect(key).toMatch(/^name:/)
    // suffix is preserved
    expect(key).toContain('sr')
  })

  it('keeps father-son pairs distinct via name fallback', () => {
    const sr = getCanonicalPlayerKey({ name: 'Deebo Samuel Sr.', position: 'WR', team: null })
    const base = getCanonicalPlayerKey({ name: 'Deebo Samuel', position: 'WR', team: 'SF' })
    expect(sr).not.toBe(base)
  })

  it('ignores non-numeric sleeperId', () => {
    const key = getCanonicalPlayerKey({
      sleeperId: 'abc',
      sportsDataId: 'sd-111',
      name: 'Test Player',
      position: 'QB',
      team: 'KC',
    })
    expect(key).toBe('sportsdata:sd-111')
  })

  it('ignores single-char sleeperId', () => {
    const key = getCanonicalPlayerKey({
      sleeperId: '1',
      name: 'Patrick Mahomes',
      position: 'QB',
      team: 'KC',
    })
    // sleeperId too short, falls to name-based
    expect(key).toMatch(/^name:/)
  })
})

// ---------------------------------------------------------------------------
// isProviderImage / isAfPlaceholderImage
// ---------------------------------------------------------------------------
describe('isProviderImage', () => {
  it('returns true for https URLs', () => {
    expect(isProviderImage('https://sleepercdn.com/content/nfl/players/thumb/5859.jpg')).toBe(true)
  })
  it('returns false for data: URIs', () => {
    expect(isProviderImage('data:image/svg+xml;base64,...')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isProviderImage(null)).toBe(false)
  })
  it('returns false for team logo CDN paths', () => {
    expect(isProviderImage('https://example.com/teamLogos/phi.png')).toBe(false)
  })
})

describe('isAfPlaceholderImage', () => {
  it('detects AF SVG placeholder', () => {
    expect(isAfPlaceholderImage('data:image/svg+xml;base64,AF==...')).toBe(true)
  })
  it('returns false for regular https headshot', () => {
    expect(isAfPlaceholderImage('https://sleepercdn.com/content/nfl/players/thumb/5859.jpg')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// resolvePlayerImage — fallback order
// ---------------------------------------------------------------------------
describe('resolvePlayerImage fallback order', () => {
  it('returns unchanged when player already has a valid headshot', () => {
    const result = resolvePlayerImage({
      sleeperId: '5859',
      existingImageUrl: 'https://sleepercdn.com/content/nfl/players/thumb/5859.jpg',
    })
    expect(result.unchanged).toBe(true)
    expect(result.source).toBe('none')
  })

  it('resolves via Sleeper CDN when sleeperId present', () => {
    const result = resolvePlayerImage({
      sleeperId: '5859',
      existingImageUrl: null,
      sport: 'NFL',
    })
    expect(result.url).toContain('sleepercdn.com')
    expect(result.url).toContain('5859')
    expect(result.source).toBe('sleeper')
    expect(result.unchanged).toBe(false)
  })

  it('falls back to API-Sports URL when no sleeperId', () => {
    const result = resolvePlayerImage({
      sleeperId: null,
      apiSportsId: '123',
      existingImageUrl: null,
      sport: 'NFL',
    })
    expect(result.url).toContain('api-sports.io')
    expect(result.source).toBe('api_sports')
  })

  it('returns team logo for DEF position with no IDs', () => {
    const result = resolvePlayerImage({
      sleeperId: null,
      existingImageUrl: null,
      sport: 'NFL',
      position: 'DEF',
      team: 'PHI',
    })
    expect(result.source).toBe('team_logo')
    expect(result.url).toContain('phi')
  })

  it('returns unchanged when nothing can be resolved', () => {
    const result = resolvePlayerImage({
      sleeperId: null,
      existingImageUrl: null,
      sport: 'NFL',
      position: 'WR',
      team: null,
    })
    expect(result.source).toBe('none')
    expect(result.url).toBeNull()
  })

  it('treats AF placeholder as needing replacement', () => {
    const result = resolvePlayerImage({
      sleeperId: '9999',
      existingImageUrl: 'data:image/svg+xml;base64,AFPLACEHOLDER==',
      sport: 'NFL',
    })
    // Should try to replace the placeholder
    expect(result.unchanged).toBe(false)
    expect(result.url).toContain('sleepercdn')
  })
})

// ---------------------------------------------------------------------------
// sleeperHeadshotUrl / apiSportsHeadshotUrl helpers
// ---------------------------------------------------------------------------
describe('sleeperHeadshotUrl', () => {
  it('builds correct URL', () => {
    expect(sleeperHeadshotUrl('5859', 'NFL')).toBe('https://sleepercdn.com/content/nfl/players/thumb/5859.jpg')
  })
  it('returns null for non-numeric id', () => {
    expect(sleeperHeadshotUrl('abc', 'NFL')).toBeNull()
  })
  it('returns null for null id', () => {
    expect(sleeperHeadshotUrl(null)).toBeNull()
  })
})

describe('apiSportsHeadshotUrl', () => {
  it('builds american-football URL for NFL', () => {
    const url = apiSportsHeadshotUrl('123', 'NFL')
    expect(url).toBe('https://media.api-sports.io/american-football/players/123.png')
  })
  it('returns null for empty id', () => {
    expect(apiSportsHeadshotUrl('', 'NFL')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// detectSharedImages
// ---------------------------------------------------------------------------
describe('detectSharedImages', () => {
  const sharedUrl = 'https://www.thesportsdb.com/images/media/player/cutout/sameimage.png'

  const players = [
    { id: 'p1', name: 'Deebo Samuel Sr.', position: 'WR', team: null, imageUrl: sharedUrl },
    { id: 'p2', name: 'Deebo Samuel', position: 'WR', team: 'SF', imageUrl: sharedUrl },
    { id: 'p3', name: 'Patrick Mahomes', position: 'QB', team: 'KC', imageUrl: 'https://sleepercdn.com/content/nfl/players/thumb/4046.jpg' },
  ]

  it('detects shared TheSportsDB image across two distinct players', () => {
    const conflicts = detectSharedImages(players)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].imageUrl).toBe(sharedUrl)
    expect(conflicts[0].players).toHaveLength(2)
  })

  it('does not flag Sleeper CDN URLs as conflicts', () => {
    const conflicts = detectSharedImages(players)
    const sleeperConflict = conflicts.find((c) => c.imageUrl.includes('sleepercdn'))
    expect(sleeperConflict).toBeUndefined()
  })

  it('does not flag data: URI placeholders', () => {
    const withPlaceholders = [
      { id: 'p1', name: 'Player A', imageUrl: 'data:image/svg+xml;base64,AF1==' },
      { id: 'p2', name: 'Player B', imageUrl: 'data:image/svg+xml;base64,AF1==' },
    ]
    const conflicts = detectSharedImages(withPlaceholders)
    expect(conflicts).toHaveLength(0)
  })

  it('returns empty for unique images', () => {
    const unique = [
      { id: 'p1', name: 'Player A', imageUrl: 'https://example.com/a.jpg' },
      { id: 'p2', name: 'Player B', imageUrl: 'https://example.com/b.jpg' },
    ]
    expect(detectSharedImages(unique)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Teamless filter predicate (pure logic — mirrors getResolvedDraftPoolForLeague)
// ---------------------------------------------------------------------------
describe('teamless filter predicate', () => {
  function shouldInclude(entry: { position: string; team: string | null }): boolean {
    const pos = canonicalPosition(entry.position)
    if (pos === 'DEF' || pos === 'DST') return true
    const team = entry.team
    return team !== null && String(team).trim() !== '' && String(team).trim().toUpperCase() !== 'FA'
  }

  it('keeps DEF units with null team', () => {
    expect(shouldInclude({ position: 'DEF', team: null })).toBe(true)
  })

  it('excludes WR with null team', () => {
    expect(shouldInclude({ position: 'WR', team: null })).toBe(false)
  })

  it('excludes QB with empty string team', () => {
    expect(shouldInclude({ position: 'QB', team: '' })).toBe(false)
  })

  it('excludes RB with FA team', () => {
    expect(shouldInclude({ position: 'RB', team: 'FA' })).toBe(false)
  })

  it('includes TE with real team', () => {
    expect(shouldInclude({ position: 'TE', team: 'KC' })).toBe(true)
  })

  it('includes WR with real team', () => {
    expect(shouldInclude({ position: 'WR', team: 'PHI' })).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// buildPlayerPoolAudit Phase 2 extended fields
// ---------------------------------------------------------------------------
describe('buildPlayerPoolAudit Phase 2 fields', () => {
  const sharedUrl = 'https://www.thesportsdb.com/images/media/player/cutout/sameimage.png'

  const rows: PlayerPoolAuditRow[] = [
    {
      id: 'p1',
      name: 'Justin Jefferson',
      position: 'WR',
      team: 'MIN',
      sport: 'NFL',
      imageUrl: 'https://sleepercdn.com/content/nfl/players/thumb/6794.jpg',
      sleeperId: '6794',
      source: 'sleeper',
    },
    {
      id: 'p2',
      name: 'Deebo Samuel Sr.',
      position: 'WR',
      team: null,
      sport: 'NFL',
      imageUrl: sharedUrl,
      source: 'thesportsdb',
    },
    {
      id: 'p3',
      name: 'Deebo Samuel',
      position: 'WR',
      team: 'SF',
      sport: 'NFL',
      imageUrl: sharedUrl,
      source: 'thesportsdb',
    },
    {
      id: 'p4',
      name: 'Aaron Anderson',
      position: 'WR',
      team: null,
      sport: 'NFL',
      imageUrl: null,
      source: 'unknown',
    },
  ]

  it('correctly counts real vs placeholder images', () => {
    const report = buildPlayerPoolAudit(rows)
    expect(report.realImageCount).toBeGreaterThan(0)
    expect(report.placeholderImageCount).toBeGreaterThan(0)
    expect(report.imageRealPercent).toBeGreaterThan(0)
    expect(report.imageRealPercent).toBeLessThanOrEqual(100)
  })

  it('detects image reuse conflicts', () => {
    const report = buildPlayerPoolAudit(rows)
    expect(report.imageReuseConflicts.length).toBeGreaterThan(0)
    expect(report.imageReuseConflicts[0]).toContain('Deebo Samuel')
  })

  it('exposes canonicalCollisionWarnings', () => {
    const report = buildPlayerPoolAudit(rows)
    // These are all distinct by name/id, so no collisions expected
    expect(Array.isArray(report.canonicalCollisionWarnings)).toBe(true)
  })

  it('report shape includes all Phase 2 fields', () => {
    const report = buildPlayerPoolAudit(rows)
    expect(report).toHaveProperty('realImageCount')
    expect(report).toHaveProperty('placeholderImageCount')
    expect(report).toHaveProperty('imageRealPercent')
    expect(report).toHaveProperty('canonicalCollisionWarnings')
    expect(report).toHaveProperty('imageReuseConflicts')
  })
})
