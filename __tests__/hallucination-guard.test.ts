import { describe, expect, it } from 'vitest'
import {
  checkChimmyHallucination,
  type ChimmyGroundingContext,
} from '@/lib/chimmy-chat/hallucination-guard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ctx(overrides: Partial<ChimmyGroundingContext> = {}): ChimmyGroundingContext {
  return {
    groundingText: 'Justin Jefferson: 14 targets, 9 receptions, 142 yards. Matchup rank: 3rd. Score: 78.',
    hasLeagueContext: true,
    userMessage: 'Should I start Justin Jefferson?',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Pass path — no issues
// ---------------------------------------------------------------------------

describe('checkChimmyHallucination — pass (safe)', () => {
  it('response with only grounded numbers → safe: true, action: pass', () => {
    const result = checkChimmyHallucination(
      'Jefferson had 14 targets and 142 receiving yards. His matchup ranks 3rd.',
      ctx(),
    )
    expect(result.safe).toBe(true)
    expect(result.action).toBe('pass')
    expect(result.issues).toHaveLength(0)
    expect(result.displayText).toBe(
      'Jefferson had 14 targets and 142 receiving yards. His matchup ranks 3rd.',
    )
  })

  it('response with only small integers (< 10) → safe: true', () => {
    const result = checkChimmyHallucination(
      'He has 3 catches and a score of 2 touchdowns.',
      ctx({ groundingText: 'Jefferson: 3 catches, 2 touchdowns.' }),
    )
    expect(result.safe).toBe(true)
  })

  it('empty grounding text + stat-heavy response → safe: true (no grounding to check against)', () => {
    const result = checkChimmyHallucination(
      'Jefferson had 157 yards and 2 touchdowns.',
      ctx({ groundingText: '' }),
    )
    expect(result.safe).toBe(true)
  })

  it('general knowledge question skips stat check', () => {
    const result = checkChimmyHallucination(
      'The 2025 NFL season began in September with 32 teams.',
      ctx({
        groundingText: 'League roster data.',
        userMessage: 'When does the NFL season begin?',
      }),
    )
    // No stat grounding check for general knowledge questions
    expect(result.action).toBe('pass')
  })

  it('response with no numbers at all → safe: true', () => {
    const result = checkChimmyHallucination(
      'Jefferson is a must-start this week given his favorable matchup.',
      ctx(),
    )
    expect(result.safe).toBe(true)
    expect(result.action).toBe('pass')
  })
})

// ---------------------------------------------------------------------------
// Annotate path — single hard issue or multiple soft issues
// ---------------------------------------------------------------------------

describe('checkChimmyHallucination — annotate (single hard or 2+ soft)', () => {
  it('single ungrounded stat → action: annotate', () => {
    // "247 yards" is not in grounding
    const result = checkChimmyHallucination(
      'Jefferson had 247 yards and 14 targets last week.',
      ctx(),
    )
    expect(result.safe).toBe(false)
    expect(result.action).toBe('annotate')
    expect(result.displayText).toMatch(/could not be fully verified/)
    expect(result.displayText).toContain('Jefferson had 247 yards')
  })

  it('two soft issues (invented records) → action: annotate', () => {
    // Two W-L records not in grounding → 2 soft issues; skipStatCheck to isolate record detection
    const result = checkChimmyHallucination(
      'Your team is 7-3 and the opponent is 5-5 this season.',
      ctx({ groundingText: 'League standings: partial data.' }),
      { skipStatCheck: true },
    )
    expect(result.safe).toBe(false)
    expect(result.action).toBe('annotate')
    expect(result.issues.filter((i) => i.kind === 'invented_record').length).toBeGreaterThanOrEqual(2)
  })

  it('annotated displayText starts with disclaimer then original text', () => {
    const response = 'Jefferson had 247 yards.'
    const result = checkChimmyHallucination(response, ctx())
    expect(result.displayText.startsWith('⚠️')).toBe(true)
    expect(result.displayText).toContain(response)
  })
})

// ---------------------------------------------------------------------------
// Replace path — 2+ hard issues
// ---------------------------------------------------------------------------

describe('checkChimmyHallucination — replace (2+ hard issues)', () => {
  it('two ungrounded stats → action: replace', () => {
    // Both "247 yards" and "32 points" are not in grounding
    const result = checkChimmyHallucination(
      'Jefferson had 247 yards. He scored 32 points for your roster.',
      ctx(),
    )
    expect(result.safe).toBe(false)
    expect(result.action).toBe('replace')
    expect(result.displayText).toMatch(/I want to make sure I give you accurate advice/)
    expect(result.displayText).not.toContain('247 yards')
  })

  it('replaced displayText does not contain original invented stats', () => {
    const result = checkChimmyHallucination(
      'Jefferson had 247 yards and scored 32 points.',
      ctx(),
    )
    expect(result.displayText).not.toContain('247')
    expect(result.displayText).not.toContain('32 points')
  })
})

// ---------------------------------------------------------------------------
// Invented records check
// ---------------------------------------------------------------------------

describe('checkChimmyHallucination — invented records', () => {
  it('W-L record not in grounding → soft issue when leagueContext available', () => {
    const result = checkChimmyHallucination(
      'Your team has a 9-2 record heading into the playoffs.',
      ctx({ groundingText: 'Standings: partial.' }),
    )
    const recordIssues = result.issues.filter((i) => i.kind === 'invented_record')
    expect(recordIssues.length).toBeGreaterThan(0)
    expect(recordIssues[0].severity).toBe('soft')
  })

  it('W-L record present in grounding → no issue', () => {
    const result = checkChimmyHallucination(
      'Your team has a 9-2 record.',
      ctx({ groundingText: 'Team record: 9-2. Next opponent: Bears.' }),
    )
    const recordIssues = result.issues.filter((i) => i.kind === 'invented_record')
    expect(recordIssues).toHaveLength(0)
  })

  it('no league context → record check skipped (returns no issues)', () => {
    const result = checkChimmyHallucination(
      'The team went 7-3 last year.',
      ctx({ hasLeagueContext: false, groundingText: 'General sports info.' }),
    )
    const recordIssues = result.issues.filter((i) => i.kind === 'invented_record')
    expect(recordIssues).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Suspicious rankings check
// ---------------------------------------------------------------------------

describe('checkChimmyHallucination — suspicious rankings', () => {
  it('ungrounded "#3 overall" ranking → suspicious_ranking soft issue', () => {
    const result = checkChimmyHallucination(
      'Jefferson is the #3 overall waiver target this week.',
      ctx({ groundingText: 'Jefferson: high target share.' }),
    )
    const rankIssues = result.issues.filter((i) => i.kind === 'suspicious_ranking')
    expect(rankIssues.length).toBeGreaterThan(0)
    expect(rankIssues[0].severity).toBe('soft')
  })

  it('grounded "#3 overall" → no issue', () => {
    const result = checkChimmyHallucination(
      'Jefferson is the #3 overall waiver target.',
      ctx({ groundingText: 'Jefferson: #3 overall waiver priority. Target share: 28%.' }),
    )
    const rankIssues = result.issues.filter((i) => i.kind === 'suspicious_ranking')
    expect(rankIssues).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// skipStatCheck option
// ---------------------------------------------------------------------------

describe('checkChimmyHallucination — skipStatCheck', () => {
  it('skipStatCheck: true skips numeric grounding even with ungrounded stats', () => {
    const result = checkChimmyHallucination(
      'Jefferson had 247 yards.',
      ctx(),
      { skipStatCheck: true },
    )
    const statIssues = result.issues.filter((i) => i.kind === 'ungrounded_stat')
    expect(statIssues).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Issue structure
// ---------------------------------------------------------------------------

describe('checkChimmyHallucination — issue structure', () => {
  it('each issue has required fields', () => {
    const result = checkChimmyHallucination(
      'Jefferson had 247 yards.',
      ctx(),
    )
    for (const issue of result.issues) {
      expect(issue.kind).toBeDefined()
      expect(issue.severity).toMatch(/^(hard|soft)$/)
      expect(issue.excerpt.length).toBeGreaterThan(0)
      expect(issue.detail.length).toBeGreaterThan(0)
    }
  })

  it('ungrounded stat issues are hard severity', () => {
    const result = checkChimmyHallucination('Jefferson had 247 yards.', ctx())
    const statIssues = result.issues.filter((i) => i.kind === 'ungrounded_stat')
    expect(statIssues.every((i) => i.severity === 'hard')).toBe(true)
  })
})
