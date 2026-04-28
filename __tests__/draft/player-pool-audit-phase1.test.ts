import { describe, expect, it } from 'vitest'
import {
  buildPlayerPoolAudit,
  normalizeAuditPlayerName,
} from '@/lib/draft-room/player-pool-audit'

describe('Player Pool Audit Phase 1', () => {
  it('normalizes names consistently for duplicate checks', () => {
    expect(normalizeAuditPlayerName("  A.J.  Brown ")).toBe('aj brown')
    expect(normalizeAuditPlayerName("A J Brown")).toBe('aj brown')
    expect(normalizeAuditPlayerName("Ja'Marr Chase")).toBe('jamarr chase')
    expect(normalizeAuditPlayerName('Marvin Harrison Jr.')).toBe('marvin harrison jr')
  })

  it('detects duplicate groups and image problems', () => {
    const report = buildPlayerPoolAudit([
      {
        id: '1',
        canonicalPlayerId: 'canon-1',
        providerPlayerId: 'provider-1',
        name: "Russell Wilson",
        position: 'QB',
        team: 'PIT',
        imageUrl: 'https://cdn.example.com/russ-1.png',
        status: 'active',
      },
      {
        id: '2',
        canonicalPlayerId: 'canon-1',
        providerPlayerId: 'provider-1',
        name: 'Russell Wilson',
        position: 'QB',
        team: 'PIT',
        imageUrl: 'https://cdn.example.com/russ-1.png',
        status: 'active',
      },
      {
        id: '3',
        providerPlayerId: 'provider-2',
        name: "De'Von Achane",
        position: 'RB',
        team: 'MIA',
        imageUrl: '',
        status: 'active',
      },
      {
        id: '4',
        providerPlayerId: 'provider-3',
        name: 'Marvin Harrison Jr.',
        position: 'WR',
        team: 'ARI',
        imageUrl: 'https://cdn.example.com/shared.png',
        status: 'active',
      },
      {
        id: '5',
        providerPlayerId: 'provider-4',
        name: 'Different Player',
        position: 'WR',
        team: 'ARI',
        imageUrl: 'https://cdn.example.com/shared.png',
        status: 'active',
      },
    ])

    expect(report.totalPlayers).toBe(5)
    expect(report.duplicateCanonicalGroups.length).toBeGreaterThan(0)
    expect(report.duplicateProviderGroups.length).toBeGreaterThan(0)
    expect(report.duplicateNameTeamPositionGroups.length).toBeGreaterThan(0)
    expect(report.missingImageCount).toBeGreaterThan(0)
    expect(report.suspiciousImageCount).toBeGreaterThan(0)
    expect(report.topProblemPlayers.length).toBeGreaterThan(0)
  })

  it('returns stable response shape for endpoint payload expectations', () => {
    const report = buildPlayerPoolAudit([
      {
        id: '10',
        name: 'Sample Player',
        position: 'WR',
        team: 'BUF',
        imageUrl: 'https://cdn.example.com/a.png',
        status: 'active',
        source: 'sleeper',
      },
    ])

    expect(report).toHaveProperty('totalPlayers')
    expect(report).toHaveProperty('duplicateCanonicalGroups')
    expect(report).toHaveProperty('duplicateNameTeamPositionGroups')
    expect(report).toHaveProperty('missingImageCount')
    expect(report).toHaveProperty('missingNameCount')
    expect(report).toHaveProperty('missingTeamCount')
    expect(report).toHaveProperty('missingPositionCount')
    expect(report).toHaveProperty('missingStatusCount')
    expect(report).toHaveProperty('missingStatsCount')
    expect(report).toHaveProperty('rookieFlagMissingCount')
    expect(report).toHaveProperty('sourceBreakdown')
    expect(report).toHaveProperty('topProblemPlayers')
    expect(report).toHaveProperty('recommendedFixes')
  })
})
