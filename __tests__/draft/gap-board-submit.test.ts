/**
 * Gap-board pick submission — regression tests for the three bugs fixed in
 * PickSubmissionService.ts during the debug pass.
 *
 * Bug 1 (CRITICAL): overall was computed as `picksCount + 1` instead of using
 *   the gap-aware resolver → picks landed on wrong slot when the commissioner
 *   had cleared mid-board slots.
 *
 * Bug 2 (CRITICAL): the transaction lock check threw on empty-slot rows instead
 *   of deleting them before INSERT, causing P2002 unique-constraint failures
 *   whenever a pick filled a commissioner-cleared slot.
 *
 * Bug 3 (HIGH): the completion check `overall >= totalPicks` never fired for a
 *   non-final slot that happened to be the LAST open gap, so `completeDraftSession`
 *   was skipped even when the board was actually full.
 *
 * These tests use two complementary strategies:
 *   (a) Pure unit tests over the shared helper functions (no Prisma, no IO).
 *   (b) Static-source assertions confirming the structural patterns in
 *       PickSubmissionService.ts so regressions in the service are caught
 *       without needing an actual DB.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  isDraftPickRowEmpty,
  isDraftBoardFull,
  resolveNextOpenPickOverall,
} from '@/lib/live-draft-engine/draftPickEmpty'
import { resolveCurrentOnTheClock } from '@/lib/live-draft-engine/CurrentOnTheClockResolver'

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const SERVICE_FILE = 'lib/live-draft-engine/PickSubmissionService.ts'

// ─── isDraftPickRowEmpty ─────────────────────────────────────────────────────

describe('isDraftPickRowEmpty — clearing detection', () => {
  it('position=EMPTY with blank playerName → empty', () => {
    expect(isDraftPickRowEmpty({ position: 'EMPTY', playerName: '' })).toBe(true)
  })

  it('position=EMPTY with whitespace-only playerName → empty', () => {
    expect(isDraftPickRowEmpty({ position: 'EMPTY', playerName: '   ' })).toBe(true)
  })

  it('position=EMPTY with a real playerName → NOT empty (row has data)', () => {
    expect(isDraftPickRowEmpty({ position: 'EMPTY', playerName: 'Patrick Mahomes' })).toBe(false)
  })

  it('pickEditorEmpty=true in metadata → empty regardless of position', () => {
    expect(
      isDraftPickRowEmpty({ position: 'QB', playerName: '', pickMetadata: { pickEditorEmpty: true } }),
    ).toBe(true)
  })

  it('real pick (QB with player) → NOT empty', () => {
    expect(
      isDraftPickRowEmpty({ position: 'QB', playerName: 'Patrick Mahomes', pickMetadata: null }),
    ).toBe(false)
  })
})

// ─── resolveNextOpenPickOverall ──────────────────────────────────────────────

describe('resolveNextOpenPickOverall — gap-board pointer', () => {
  it('empty board → 1', () => {
    expect(resolveNextOpenPickOverall([], 10)).toBe(1)
  })

  it('picks[1] filled, picks[2] missing → returns 2', () => {
    const picks = [{ overall: 1, playerName: 'P1', position: 'RB' }]
    expect(resolveNextOpenPickOverall(picks, 10)).toBe(2)
  })

  it('picks 1-3 filled, pick 4 cleared (EMPTY) → returns 4', () => {
    const picks = [
      { overall: 1, playerName: 'P1', position: 'RB' },
      { overall: 2, playerName: 'P2', position: 'WR' },
      { overall: 3, playerName: 'P3', position: 'QB' },
      { overall: 4, playerName: '', position: 'EMPTY' }, // cleared slot
    ]
    expect(resolveNextOpenPickOverall(picks, 10)).toBe(4)
  })

  it('picks 1-3 filled, picks 4-5 cleared, picks 6+ missing → returns 4 (first gap)', () => {
    const picks = [
      { overall: 1, playerName: 'P1', position: 'RB' },
      { overall: 2, playerName: 'P2', position: 'WR' },
      { overall: 3, playerName: 'P3', position: 'QB' },
      { overall: 4, playerName: '', position: 'EMPTY' },
      { overall: 5, playerName: '', position: 'EMPTY' },
    ]
    expect(resolveNextOpenPickOverall(picks, 10)).toBe(4)
  })

  it('all slots filled → null', () => {
    const picks = Array.from({ length: 4 }, (_, i) => ({
      overall: i + 1,
      playerName: `P${i + 1}`,
      position: 'WR',
    }))
    expect(resolveNextOpenPickOverall(picks, 4)).toBeNull()
  })

  it('totalPicks < 1 → null', () => {
    expect(resolveNextOpenPickOverall([], 0)).toBeNull()
  })
})

// ─── isDraftBoardFull ────────────────────────────────────────────────────────

describe('isDraftBoardFull — completion detection', () => {
  it('board with all real picks → full', () => {
    const picks = Array.from({ length: 4 }, (_, i) => ({
      overall: i + 1,
      playerName: `P${i + 1}`,
      position: 'WR',
    }))
    expect(isDraftBoardFull(picks, 4)).toBe(true)
  })

  it('board with one cleared gap → NOT full', () => {
    const picks = [
      { overall: 1, playerName: 'P1', position: 'RB' },
      { overall: 2, playerName: '', position: 'EMPTY' },
      { overall: 3, playerName: 'P3', position: 'WR' },
      { overall: 4, playerName: 'P4', position: 'QB' },
    ]
    expect(isDraftBoardFull(picks, 4)).toBe(false)
  })

  it('board with missing slot → NOT full', () => {
    const picks = [
      { overall: 1, playerName: 'P1', position: 'RB' },
      { overall: 3, playerName: 'P3', position: 'WR' }, // overall=2 is absent
    ]
    expect(isDraftBoardFull(picks, 4)).toBe(false)
  })

  it('empty board, totalPicks=0 → full (vacuously)', () => {
    // resolveNextOpenPickOverall([],0) returns null → board is "full"
    expect(isDraftBoardFull([], 0)).toBe(true)
  })
})

// ─── resolveCurrentOnTheClock with gap board ─────────────────────────────────

describe('resolveCurrentOnTheClock — gap-board pointer', () => {
  const slotOrder = Array.from({ length: 4 }, (_, i) => ({
    slot: i + 1,
    rosterId: `r${i + 1}`,
    displayName: `Team ${i + 1}`,
  }))

  it('picks 1-2 filled, pick 3 cleared (EMPTY) → overall=3 (the gap)', () => {
    const picks = [
      { overall: 1, playerName: 'P1', position: 'RB', pickMetadata: null },
      { overall: 2, playerName: 'P2', position: 'WR', pickMetadata: null },
      { overall: 3, playerName: '', position: 'EMPTY', pickMetadata: null }, // cleared
    ]
    const current = resolveCurrentOnTheClock({
      totalPicks: 8,
      picks,
      teamCount: 4,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    // The gap is at overall=3 — resolver must return 3, not 4 (picksCount+1)
    expect(current?.overall).toBe(3)
  })

  it('picks 1-3 filled (no gaps) → overall=4', () => {
    const picks = [
      { overall: 1, playerName: 'P1', position: 'RB', pickMetadata: null },
      { overall: 2, playerName: 'P2', position: 'WR', pickMetadata: null },
      { overall: 3, playerName: 'P3', position: 'QB', pickMetadata: null },
    ]
    const current = resolveCurrentOnTheClock({
      totalPicks: 8,
      picks,
      teamCount: 4,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(current?.overall).toBe(4)
  })

  it('all 8 picks filled → null (draft complete)', () => {
    const picks = Array.from({ length: 8 }, (_, i) => ({
      overall: i + 1,
      playerName: `P${i + 1}`,
      position: 'WR',
      pickMetadata: null,
    }))
    const current = resolveCurrentOnTheClock({
      totalPicks: 8,
      picks,
      teamCount: 4,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(current).toBeNull()
  })
})

// ─── PickSubmissionService.ts structural assertions ───────────────────────────
// These verify the fixed code shape without requiring a real Prisma connection.

describe('PickSubmissionService.ts — Bug 1: gap-aware overall resolution', () => {
  const src = read(SERVICE_FILE)

  it('uses resolveCurrentOnTheClock with picks array (not picksCount)', () => {
    // Must pass `picks: progressPicks` (the mapped array), not `picksCount`
    expect(src).toMatch(/resolveCurrentOnTheClock\(\{/)
    expect(src).toMatch(/picks: progressPicks/)
  })

  it('does NOT use the legacy picksCount+1 formula for overall', () => {
    // The old bug: `const overall = picksCount + 1`
    expect(src).not.toMatch(/overall\s*=\s*picksCount\s*\+\s*1/)
  })

  it('derives overall from current.overall (resolver output)', () => {
    expect(src).toMatch(/const overall = current\.overall/)
  })

  it('no longer declares a top-level picksCount variable', () => {
    // After the fix, picksCount was removed as it is no longer needed
    expect(src).not.toMatch(/const picksCount = session\.picks\.length/)
  })
})

describe('PickSubmissionService.ts — Bug 2: empty-slot DELETE before INSERT', () => {
  const src = read(SERVICE_FILE)

  it('looks up existingAtOverall inside the transaction', () => {
    expect(src).toMatch(/const existingAtOverall = locked\.picks\.find\(/)
    expect(src).toMatch(/p\.overall === overall/)
  })

  it('rejects concurrent non-empty pick at same overall', () => {
    expect(src).toMatch(/existingAtOverall && !isDraftPickRowEmpty\(existingAtOverall\)/)
    expect(src).toMatch(/throw new Error\('Draft state changed; please retry'\)/)
  })

  it('deletes the cleared empty-slot row before INSERT (prevents P2002)', () => {
    expect(src).toMatch(/if \(existingAtOverall\) \{/)
    expect(src).toMatch(/draftPick\.delete\(\{ where: \{ id: existingAtOverall\.id \} \}\)/)
  })

  it('does NOT use the old picks.some() lock check that blocked empty-slot picks', () => {
    // The old bug: `locked.picks.some((p: any) => p.overall === overall)`
    expect(src).not.toMatch(/locked\.picks\.some\(/)
  })
})

describe('PickSubmissionService.ts — Bug 3: gap-board completion check', () => {
  const src = read(SERVICE_FILE)

  it('has the primary contiguous-board completion check (overall >= totalPicks)', () => {
    expect(src).toMatch(/if \(overall >= totalPicks\)/)
  })

  it('has an else branch that queries all picks post-insert', () => {
    // The else-branch gap-board completion path
    expect(src).toMatch(/\} else \{/)
    expect(src).toMatch(/prisma\.draftPick\.findMany\(/)
  })

  it('calls isDraftBoardFull on the post-insert pick set', () => {
    expect(src).toMatch(/isDraftBoardFull\(/)
  })

  it('calls completeDraftSession in the else branch when board is full', () => {
    // Must appear at least twice: once in the if branch, once in the else branch
    const matches = [...src.matchAll(/completeDraftSession\(/g)]
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('imports isDraftBoardFull and isDraftPickRowEmpty from draftPickEmpty', () => {
    expect(src).toMatch(/import \{.*isDraftBoardFull.*isDraftPickRowEmpty.*\} from '\.\/draftPickEmpty'/)
  })
})

describe('PickSubmissionService.ts — no forbidden patterns', () => {
  const src = read(SERVICE_FILE)

  it('no dynasty/keeper carryover in submitPick body', () => {
    // Keeper lock is fine; dynasty carryover patterns are not
    expect(src).not.toMatch(/dynastyCarryover/)
    expect(src).not.toMatch(/carryoverContract/)
  })

  it('no direct Supabase client calls (DB-first boundary)', () => {
    const FORBIDDEN = 'supa' + 'base'
    expect(src.toLowerCase()).not.toContain(FORBIDDEN)
  })
})
