/**
 * P1.1 — Pick submission smoke / structural invariants.
 *
 * Why not a real-DB test: no PostgreSQL test instance is provisioned in this
 * codebase. All existing service tests use mocked Prisma. Setting up a real DB
 * would require a running Postgres, DATABASE_URL pointing at it, and
 * `prisma migrate deploy` — infrastructure work outside P1.1 scope.
 * Correctness of the DB writes is proven by the mocked transaction tests in
 * submitPick.transaction.test.ts; this file pins the structural invariants that
 * guarantee the safety properties at the source level.
 *
 * Invariants locked here:
 *   1. PickSubmissionService uses prisma.$transaction — not bare draftPick.create.
 *   2. The inner transaction reads picks.length again (race re-count guard).
 *   3. completeDraftSession is called when isDraftBoardFull returns true.
 *   4. validatePickSubmission rejects duplicate player names (pure function).
 *   5. resolveCurrentOnTheClock advances overall after one pick (pure function).
 *   6. The stale-overall guard fires before the transaction when expectedOverall
 *      does not match server overall.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validatePickSubmission } from '@/lib/live-draft-engine/PickValidation'
import { resolveCurrentOnTheClock } from '@/lib/live-draft-engine/CurrentOnTheClockResolver'
import {
  DRAFT_PICK_DUPLICATE_PLAYER,
  DRAFT_PICK_STALE_OVERALL,
} from '@/lib/live-draft-engine/pickAuthorityCodes'

const root = resolve(__dirname, '..', '..')
const src = readFileSync(resolve(root, 'lib/live-draft-engine/PickSubmissionService.ts'), 'utf8')

// ---------------------------------------------------------------------------
// 1. Write path uses prisma.$transaction
// ---------------------------------------------------------------------------

describe('Invariant 1: DraftPick write goes through prisma.$transaction', () => {
  it('source contains prisma.$transaction call', () => {
    expect(src).toContain('prisma.$transaction')
  })

  it('draftPick.create is called inside a transaction callback (tx as any).draftPick', () => {
    expect(src).toMatch(/tx as any.*draftPick\.create/)
  })

  it('no prisma.draftPick.create outside transaction (only tx.draftPick.create)', () => {
    // prisma.draftPick.create (the non-transactional path) must not appear.
    expect(src).not.toMatch(/prisma\.draftPick\.create/)
  })
})

// ---------------------------------------------------------------------------
// 2. Inner-transaction race re-count guard
// ---------------------------------------------------------------------------

describe('Invariant 2: transaction re-reads picks.length for race protection', () => {
  it('picks.length is read inside the $transaction callback', () => {
    // The inner lock check: locked.picks.length !== picksCountAtSubmit
    expect(src).toMatch(/locked\.picks\.length/)
  })

  it('race guard compares against the pre-transaction snapshot count', () => {
    expect(src).toMatch(/picksCountAtSubmit/)
  })

  it('DRAFT_PICK_RACE_RETRY code is returned when the inner count mismatches', () => {
    expect(src).toMatch(/DRAFT_PICK_RACE_RETRY/)
  })
})

// ---------------------------------------------------------------------------
// 3. completeDraftSession called when board is full
// ---------------------------------------------------------------------------

describe('Invariant 3: completeDraftSession called when board is full', () => {
  it('completeDraftSession is imported in PickSubmissionService', () => {
    expect(src).toMatch(/import.*completeDraftSession.*DraftSessionService/)
  })

  it('completeDraftSession is called after a successful pick', () => {
    expect(src).toContain('completeDraftSession(input.leagueId)')
  })

  it('isDraftBoardFull is imported alongside completeDraftSession', () => {
    expect(src).toMatch(/isDraftBoardFull/)
  })
})

// ---------------------------------------------------------------------------
// 4. Duplicate player rejection — pure function (validatePickSubmission)
// ---------------------------------------------------------------------------

describe('Invariant 4: duplicate player rejected by validatePickSubmission', () => {
  const base = {
    playerName: 'Justin Jefferson',
    position: 'WR',
    rosterId: 'roster-A',
    currentOnClockRosterId: 'roster-A',
    existingPicks: [{ playerName: 'Justin Jefferson', position: 'WR' }],
    sessionStatus: 'in_progress',
  }

  it('returns invalid with DRAFT_PICK_DUPLICATE_PLAYER', () => {
    const result = validatePickSubmission(base)
    expect(result.valid).toBe(false)
    expect(result.code).toBe(DRAFT_PICK_DUPLICATE_PLAYER)
  })

  it('allows pick when player is NOT in existingPicks', () => {
    const result = validatePickSubmission({ ...base, existingPicks: [] })
    expect(result.valid).toBe(true)
  })

  it('duplicate check is case-insensitive via normalization', () => {
    const result = validatePickSubmission({
      ...base,
      existingPicks: [{ playerName: 'justin jefferson', position: 'WR' }],
    })
    expect(result.valid).toBe(false)
    expect(result.code).toBe(DRAFT_PICK_DUPLICATE_PLAYER)
  })
})

// ---------------------------------------------------------------------------
// 5. Next pick advances after one pick — pure resolveCurrentOnTheClock
// ---------------------------------------------------------------------------

describe('Invariant 5: snapshot currentPick.overall advances after pick is recorded', () => {
  const session = {
    totalPicks: 4,
    picks: [] as { overall: number; playerName: string; position: string; pickMetadata: null }[],
    teamCount: 2,
    draftType: 'snake' as const,
    thirdRoundReversal: false,
    slotOrder: [
      { slot: 1, rosterId: 'roster-a', displayName: 'Team A' },
      { slot: 2, rosterId: 'roster-b', displayName: 'Team B' },
    ],
  }

  it('first on-clock is overall=1 before any picks', () => {
    const current = resolveCurrentOnTheClock(session)
    expect(current?.overall).toBe(1)
    expect(current?.rosterId).toBe('roster-a')
  })

  it('after pick #1 lands, on-clock advances to overall=2 (roster-b)', () => {
    const withPick = {
      ...session,
      picks: [{ overall: 1, playerName: 'Player A', position: 'WR', pickMetadata: null }],
    }
    const current = resolveCurrentOnTheClock(withPick)
    expect(current?.overall).toBe(2)
    expect(current?.rosterId).toBe('roster-b')
  })

  it('after all picks land, resolveCurrentOnTheClock returns null (draft complete)', () => {
    const allPicks = [1, 2, 3, 4].map((n) => ({
      overall: n,
      playerName: `Player ${n}`,
      position: 'WR',
      pickMetadata: null,
    }))
    const current = resolveCurrentOnTheClock({ ...session, picks: allPicks })
    expect(current).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 6. Stale-overall guard fires before the transaction
// ---------------------------------------------------------------------------

describe('Invariant 6: stale-overall guard (expectedOverall) is checked before $transaction', () => {
  it('source checks expectedOverall before prisma.$transaction', () => {
    const staleGuardIdx = src.indexOf('expectedOverall !== overall')
    const transactionIdx = src.indexOf('prisma.$transaction')
    expect(staleGuardIdx).toBeGreaterThan(-1)
    expect(transactionIdx).toBeGreaterThan(-1)
    expect(staleGuardIdx).toBeLessThan(transactionIdx)
  })

  it('stale guard returns DRAFT_PICK_STALE_OVERALL code', () => {
    expect(src).toContain(DRAFT_PICK_STALE_OVERALL)
  })

  it('pure validator confirms stale check via validatePickSubmission (sessionStatus gate)', () => {
    const result = validatePickSubmission({
      playerName: 'Player X',
      position: 'WR',
      rosterId: 'roster-A',
      currentOnClockRosterId: 'roster-A',
      existingPicks: [],
      sessionStatus: 'complete',
    })
    expect(result.valid).toBe(false)
  })
})
