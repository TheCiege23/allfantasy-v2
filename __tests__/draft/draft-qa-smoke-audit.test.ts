/**
 * Draft QA Slice — full-draft completion smoke audit (pure logic).
 *
 * Verifies the diagnostics that scripts/smoke-full-draft.ts emits. The audit
 * function is pure (snapshot in → report out), so these tests cover every
 * branch without Prisma in the loop.
 */

import { describe, expect, it } from 'vitest'
import {
  auditFullDraft,
  type FullDraftSmokeInput,
  type SmokeDraftSession,
  type SmokePick,
  type SmokeRoster,
} from '@/lib/draft-room/fullDraftSmokeAudit'

const STARTED = new Date('2026-04-25T22:00:00.000Z')
const COMPLETED = new Date('2026-04-25T23:30:00.000Z')

function makeSession(over: Partial<SmokeDraftSession> = {}): SmokeDraftSession {
  return {
    id: 'sess-1',
    leagueId: 'lg-1',
    status: 'completed',
    sessionKind: 'live',
    teamCount: 12,
    draftType: 'snake',
    slotOrder: Array.from({ length: 12 }, (_, i) => ({
      slot: i + 1,
      rosterId: `r-${i + 1}`,
      displayName: `Team ${i + 1}`,
    })),
    startedAt: STARTED,
    completedAt: COMPLETED,
    expectedTotalPicks: 12 * 16, // 16-round snake
    ...over,
  }
}

function makeRosters(n: number): SmokeRoster[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r-${i + 1}`,
    leagueId: 'lg-1',
    displayName: `Team ${i + 1}`,
    platformUserId: `u-${i + 1}`,
  }))
}

function makePicks(count: number): SmokePick[] {
  // Round-robin distribute picks across 12 teams. Generate distinct names
  // ("Player N") so the default scenario has zero duplicates.
  const out: SmokePick[] = []
  for (let i = 0; i < count; i++) {
    const overall = i + 1
    const round = Math.ceil(overall / 12)
    const slot = round % 2 === 1 ? ((overall - 1) % 12) + 1 : 12 - ((overall - 1) % 12)
    out.push({
      id: `pick-${overall}`,
      overall,
      round,
      roundPick: slot,
      rosterId: `r-${slot}`,
      playerName: `Player ${overall}`,
      position: 'RB',
      source: 'user',
      pickedAt: new Date(STARTED.getTime() + i * 30_000),
    })
  }
  return out
}

function makeChatEvents(picks: SmokePick[], opts: { withHeadshot?: number; aiCount?: number } = {}) {
  const withHeadshot = opts.withHeadshot ?? picks.length
  const aiCount = opts.aiCount ?? 0
  return picks.map((p, idx) => ({
    id: `chat-${p.overall}`,
    metadata: {
      headshotUrl:
        idx < withHeadshot ? `https://example.com/headshots/${p.overall}.png` : null,
      aiManager: idx < aiCount,
    },
  }))
}

function makeInput(over: Partial<FullDraftSmokeInput> = {}): FullDraftSmokeInput {
  const session = over.session ?? makeSession()
  const rosters = over.rosters ?? makeRosters(12)
  const picks = over.picks ?? makePicks(192)
  const chatPickEvents = over.chatPickEvents ?? makeChatEvents(picks)
  const auditLog = over.auditLog ?? []
  return { session, rosters, picks, auditLog, chatPickEvents }
}

describe('Draft QA — happy path', () => {
  it('clean completed draft → diagnosis OK', () => {
    const r = auditFullDraft(makeInput())
    expect(r.diagnosis).toBe('OK')
    expect(r.picksMade).toBe(192)
    expect(r.expectedTotalPicks).toBe(192)
    expect(r.isFullyDrafted).toBe(true)
    expect(r.duplicates.duplicatePlayerNames).toEqual([])
    expect(r.duplicates.duplicateOverallNumbers).toEqual([])
    expect(r.orphanedRosterAssignments).toEqual([])
    expect(r.notes).toEqual(['no anomalies — draft state is consistent'])
  })

  it('reports duration when both startedAt and completedAt are set', () => {
    const r = auditFullDraft(makeInput())
    expect(r.durationMs).toBe(COMPLETED.getTime() - STARTED.getTime())
    expect(r.startedAt).toBe(STARTED.toISOString())
    expect(r.completedAt).toBe(COMPLETED.toISOString())
  })

  it('audit log breakdown by action', () => {
    const r = auditFullDraft(
      makeInput({
        auditLog: [
          { id: 'a1', action: 'REPLACE_PLAYER_ON_PICK' },
          { id: 'a2', action: 'REPLACE_PLAYER_ON_PICK' },
          { id: 'a3', action: 'CHANGE_PICK_OWNER' },
        ],
      }),
    )
    expect(r.auditLog.totalEntries).toBe(3)
    expect(r.auditLog.byAction).toEqual({
      REPLACE_PLAYER_ON_PICK: 2,
      CHANGE_PICK_OWNER: 1,
    })
  })

  it('chat summary counts AI-badge events and headshot coverage', () => {
    const picks = makePicks(12)
    const r = auditFullDraft(
      makeInput({
        picks,
        chatPickEvents: makeChatEvents(picks, { withHeadshot: 9, aiCount: 3 }),
        session: makeSession({ expectedTotalPicks: 12 }),
      }),
    )
    expect(r.chat.pickEventCount).toBe(12)
    expect(r.chat.headshotPresentCount).toBe(9)
    expect(r.chat.autopickEventCount).toBe(3)
  })
})

describe('Draft QA — duplicate-pick detection (BLOCKING)', () => {
  it('two picks with the same player name flag BLOCKING + identify pick numbers', () => {
    const picks = makePicks(12)
    picks[5].playerName = picks[2].playerName // overall 6 collides with overall 3
    const r = auditFullDraft(makeInput({ picks, session: makeSession({ expectedTotalPicks: 12 }) }))
    expect(r.diagnosis).toBe('BLOCKING')
    expect(r.duplicates.duplicatePlayerNames).toHaveLength(1)
    expect(r.duplicates.duplicatePlayerNames[0].count).toBe(2)
    expect(r.duplicates.duplicatePlayerNames[0].overalls).toEqual([3, 6])
  })

  it('case- and whitespace-insensitive duplicate matching', () => {
    const picks = makePicks(12)
    picks[0].playerName = "  Ja'Marr Chase"
    picks[1].playerName = "ja'marr chase  "
    const r = auditFullDraft(makeInput({ picks, session: makeSession({ expectedTotalPicks: 12 }) }))
    expect(r.duplicates.duplicatePlayerNames).toHaveLength(1)
  })

  it('two picks with the same overall number flag BLOCKING (data integrity guard)', () => {
    const picks = makePicks(12)
    picks[5].overall = 3 // distinct id, same overall — should never happen but we guard anyway
    const r = auditFullDraft(makeInput({ picks, session: makeSession({ expectedTotalPicks: 12 }) }))
    expect(r.diagnosis).toBe('BLOCKING')
    expect(r.duplicates.duplicateOverallNumbers).toHaveLength(1)
    expect(r.duplicates.duplicateOverallNumbers[0].overall).toBe(3)
  })
})

describe('Draft QA — orphaned roster assignments (BLOCKING)', () => {
  it('flags picks whose rosterId matches no Roster row and no slot entry', () => {
    const picks = makePicks(12)
    picks[4].rosterId = 'ghost-roster'
    const r = auditFullDraft(
      makeInput({
        picks,
        session: makeSession({ expectedTotalPicks: 12 }),
      }),
    )
    expect(r.diagnosis).toBe('BLOCKING')
    expect(r.orphanedRosterAssignments).toHaveLength(1)
    expect(r.orphanedRosterAssignments[0]).toMatchObject({
      overall: 5,
      rosterId: 'ghost-roster',
    })
  })

  it('does NOT flag picks whose rosterId resolves via slotOrder placeholder', () => {
    // Some leagues run a draft against placeholder rosters before real
    // accounts join. As long as the rosterId exists in slotOrder, the audit
    // should not call it "orphaned".
    const picks = makePicks(12)
    picks[0].rosterId = 'placeholder-1'
    const session = makeSession({
      status: 'in_progress', // not completed yet — placeholders allowed
      completedAt: null,
      expectedTotalPicks: 12,
      slotOrder: [
        { slot: 1, rosterId: 'placeholder-1', displayName: 'Slot 1' },
        ...makeSession().slotOrder.slice(1),
      ],
    })
    const r = auditFullDraft(
      makeInput({ picks, session, rosters: makeRosters(12).slice(1) }),
    )
    expect(r.orphanedRosterAssignments).toEqual([])
  })
})

describe('Draft QA — placeholder slots', () => {
  it('placeholder slot in a COMPLETED session → BLOCKING', () => {
    const session = makeSession({
      slotOrder: [
        { slot: 1, rosterId: 'placeholder-1', displayName: 'Slot 1' },
        ...makeSession().slotOrder.slice(1),
      ],
    })
    const r = auditFullDraft(makeInput({ session }))
    expect(r.diagnosis).toBe('BLOCKING')
    expect(r.rosterCounts.placeholderSlots).toEqual([
      { slot: 1, rosterId: 'placeholder-1' },
    ])
    expect(r.notes.some((n) => n.includes('placeholder slot(s) still present'))).toBe(true)
  })

  it('placeholder slot in PRE_DRAFT/IN_PROGRESS → WARNINGS, not BLOCKING', () => {
    const session = makeSession({
      status: 'pre_draft',
      completedAt: null,
      slotOrder: [
        { slot: 1, rosterId: 'placeholder-1', displayName: 'Slot 1' },
        ...makeSession().slotOrder.slice(1),
      ],
    })
    const r = auditFullDraft(
      makeInput({
        session,
        picks: [],
        chatPickEvents: [],
      }),
    )
    expect(r.diagnosis).toBe('WARNINGS')
    expect(r.rosterCounts.placeholderSlots).toHaveLength(1)
  })
})

describe('Draft QA — completion-state guards', () => {
  it('completed session with fewer picks than expected → BLOCKING', () => {
    const r = auditFullDraft(
      makeInput({
        picks: makePicks(180), // 12 short of 192
        chatPickEvents: makeChatEvents(makePicks(180)),
      }),
    )
    expect(r.diagnosis).toBe('BLOCKING')
    expect(r.isFullyDrafted).toBe(false)
    expect(r.notes.some((n) => n.includes('only 180/192 picks recorded'))).toBe(true)
  })

  it('in-progress session with fewer picks than expected is OK (still drafting)', () => {
    const session = makeSession({ status: 'in_progress', completedAt: null })
    const r = auditFullDraft(
      makeInput({
        session,
        picks: makePicks(50),
        chatPickEvents: makeChatEvents(makePicks(50)),
      }),
    )
    expect(r.diagnosis).toBe('OK')
    expect(r.isFullyDrafted).toBe(false)
  })

  it('null expectedTotalPicks does not trip the completion guard', () => {
    const session = makeSession({ expectedTotalPicks: null })
    const r = auditFullDraft(makeInput({ session, picks: makePicks(50), chatPickEvents: makeChatEvents(makePicks(50)) }))
    expect(r.isFullyDrafted).toBeNull()
    // No "only X/Y" complaint when expectedTotalPicks is unknown.
    expect(r.notes.every((n) => !n.includes('picks recorded'))).toBe(true)
  })
})

describe('Draft QA — chat coverage (WARNINGS)', () => {
  it('fewer chat events than picks → WARNINGS (delivery dropped)', () => {
    const picks = makePicks(12)
    const r = auditFullDraft(
      makeInput({
        picks,
        chatPickEvents: makeChatEvents(picks).slice(0, 10),
        session: makeSession({ expectedTotalPicks: 12 }),
      }),
    )
    expect(r.diagnosis).toBe('WARNINGS')
    expect(r.notes.some((n) => n.includes('chat pick events (10) lag actual picks (12)'))).toBe(true)
  })

  it('chat events present but zero have headshots → WARNINGS', () => {
    const picks = makePicks(12)
    const r = auditFullDraft(
      makeInput({
        picks,
        chatPickEvents: makeChatEvents(picks, { withHeadshot: 0 }),
        session: makeSession({ expectedTotalPicks: 12 }),
      }),
    )
    expect(r.diagnosis).toBe('WARNINGS')
    expect(r.notes.some((n) => n.includes('no chat pick events have a headshot URL'))).toBe(true)
  })

  it('a BLOCKING duplicate is NOT downgraded to WARNINGS by chat coverage', () => {
    const picks = makePicks(12)
    picks[5].playerName = picks[2].playerName // duplicate
    const r = auditFullDraft(
      makeInput({
        picks,
        chatPickEvents: makeChatEvents(picks).slice(0, 10), // would be WARNINGS alone
        session: makeSession({ expectedTotalPicks: 12 }),
      }),
    )
    expect(r.diagnosis).toBe('BLOCKING')
  })
})

describe('Draft QA — no forbidden BaaS references', () => {
  it('audit module + script use Neon + Prisma only', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const root = resolve(__dirname, '..', '..')
    const FORBIDDEN = 'supa' + 'base'
    for (const rel of ['lib/draft-room/fullDraftSmokeAudit.ts', 'scripts/smoke-full-draft.ts']) {
      const src = readFileSync(resolve(root, rel), 'utf8')
      expect(src.toLowerCase()).not.toContain(FORBIDDEN)
    }
  })
})
