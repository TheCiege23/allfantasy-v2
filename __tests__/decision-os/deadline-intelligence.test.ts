/**
 * Phase 3.3 — Deadline Intelligence tests.
 * lib/decision-os/behavioral/deadlines/deadlineIntelligence.ts
 */
import { describe, it, expect, vi } from 'vitest'
import { deriveLeagueDeadlineIntelligence, type LeagueDeadlineDeps, type LeagueDeadlineFields } from '../../lib/decision-os/behavioral/deadlines/deadlineIntelligence'

function deps(fields: LeagueDeadlineFields | null, week = 7, season = 2026): LeagueDeadlineDeps {
  return {
    getLeagueDeadlineFields: vi.fn().mockResolvedValue(fields),
    resolveCurrentWeek: vi.fn().mockResolvedValue({ week, season }),
  }
}

describe('deriveLeagueDeadlineIntelligence', () => {
  it('returns null when the league itself is not found — no fabricated dates for a nonexistent league', async () => {
    const result = await deriveLeagueDeadlineIntelligence('missing-league', deps(null))
    expect(result).toBeNull()
  })

  it('returns null milestones (not fabricated ones) for every field the league has not configured', async () => {
    const result = await deriveLeagueDeadlineIntelligence(
      'lg-1',
      deps({ tradeDeadlineWeek: null, playoffStartWeek: null, waiverProcessTime: null, draftDateUtc: null }),
    )
    expect(result).toEqual({
      leagueId: 'lg-1',
      season: 2026,
      currentWeek: 7,
      tradeDeadline: null,
      playoffsStart: null,
      draft: null,
      nextWaiverProcessing: null,
      nextActionableEvent: null,
      derivedAt: expect.any(String),
    })
  })

  it('computes real weeksAway and hasPassed for trade deadline and playoffs from real configured weeks', async () => {
    const now = new Date('2026-07-03T12:00:00.000Z')
    const result = await deriveLeagueDeadlineIntelligence(
      'lg-1',
      deps({ tradeDeadlineWeek: 10, playoffStartWeek: 3, waiverProcessTime: null, draftDateUtc: null }, 7),
      now,
    )
    expect(result?.tradeDeadline).toEqual({ label: 'trade_deadline', week: 10, weeksAway: 3, hasPassed: false })
    expect(result?.playoffsStart).toEqual({ label: 'playoffs_start', week: 3, weeksAway: -4, hasPassed: true })
  })

  it('uses the real stored draftDateUtc as an absolute milestone, marking it passed when in the past', async () => {
    const now = new Date('2026-07-03T12:00:00.000Z')
    const result = await deriveLeagueDeadlineIntelligence(
      'lg-1',
      deps({ tradeDeadlineWeek: null, playoffStartWeek: null, waiverProcessTime: null, draftDateUtc: '2026-06-01T00:00:00.000Z' }),
      now,
    )
    expect(result?.draft).toEqual({ label: 'draft', at: '2026-06-01T00:00:00.000Z', hasPassed: true })
  })

  it('computes the next UTC occurrence of a configured waiver-processing time, rolling to tomorrow if today\'s has passed', async () => {
    const now = new Date('2026-07-03T05:00:00.000Z')
    const result = await deriveLeagueDeadlineIntelligence(
      'lg-1',
      deps({ tradeDeadlineWeek: null, playoffStartWeek: null, waiverProcessTime: '02:00', draftDateUtc: null }),
      now,
    )
    expect(result?.nextWaiverProcessing).toEqual({ label: 'next_waiver_processing', at: '2026-07-04T02:00:00.000Z', hasPassed: false })
  })

  it('picks the nearest not-yet-passed milestone as nextActionableEvent, ignoring already-passed ones', async () => {
    const now = new Date('2026-07-03T12:00:00.000Z')
    const result = await deriveLeagueDeadlineIntelligence(
      'lg-1',
      deps({ tradeDeadlineWeek: 8, playoffStartWeek: 3, waiverProcessTime: '13:00', draftDateUtc: null }, 7),
      now,
    )
    // playoffs (week 3) already passed relative to week 7 — must not be selected.
    // trade deadline is 1 week away (~7 days); waiver processing is ~1 hour away — nearer.
    expect(result?.nextActionableEvent).toEqual({ label: 'next_waiver_processing', at: '2026-07-03T13:00:00.000Z', hasPassed: false })
  })

  it('reuses resolveCurrentWeek rather than deriving week/season itself', async () => {
    const d = deps({ tradeDeadlineWeek: null, playoffStartWeek: null, waiverProcessTime: null, draftDateUtc: null }, 9, 2027)
    await deriveLeagueDeadlineIntelligence('lg-1', d)
    expect(d.resolveCurrentWeek).toHaveBeenCalledWith('lg-1')
  })
})
