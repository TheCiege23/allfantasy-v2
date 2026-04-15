import { describe, expect, it, vi } from 'vitest'
import { isAutoSubEligibleTrigger } from '@/lib/auto-sub-lineup-engine/triggers'
import { runAutoSubLineupEngine } from '@/lib/auto-sub-lineup-engine/run-auto-sub-lineup'

describe('AutoSubLineupEngine', () => {
  it('does not trigger on Questionable or Probable', () => {
    expect(isAutoSubEligibleTrigger('Questionable')).toBe(false)
    expect(isAutoSubEligibleTrigger('Probable')).toBe(false)
  })

  it('triggers on Out and IR', () => {
    expect(isAutoSubEligibleTrigger('Out')).toBe(true)
    expect(isAutoSubEligibleTrigger('IR')).toBe(true)
    expect(isAutoSubEligibleTrigger('Ruled Out')).toBe(true)
  })

  it('executes a legal same-slot replacement and notifies', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const r = runAutoSubLineupEngine({
      sport: 'NFL',
      starters: [
        {
          slotId: 's1',
          slotCode: 'RB',
          player: {
            name: 'Injured RB',
            positions: ['RB'],
            projectedPoints: 12,
            injuryStatus: 'Out',
          },
        },
      ],
      bench: [
        {
          name: 'Bench RB',
          positions: ['RB'],
          projectedPoints: 8,
        },
      ],
    })
    expect(r.autoSubsExecuted).toHaveLength(1)
    expect(r.autoSubsExecuted[0].replacementName).toBe('Bench RB')
    expect(r.notifications.some((n) => n.includes('Auto-sub:'))).toBe(true)
    expect(r.auditLog.length).toBeGreaterThan(0)
    log.mockRestore()
  })

  it('blocks when no legal bench replacement', () => {
    const r = runAutoSubLineupEngine({
      sport: 'NFL',
      starters: [
        {
          slotId: 's1',
          slotCode: 'RB',
          player: {
            name: 'Injured RB',
            positions: ['RB'],
            projectedPoints: 12,
            injuryStatus: 'Out',
          },
        },
      ],
      bench: [
        {
          name: 'WR only',
          positions: ['WR'],
          projectedPoints: 20,
        },
      ],
    })
    expect(r.autoSubsExecuted).toHaveLength(0)
    expect(r.blockedAutoSubs[0]?.reason).toContain('No legal')
  })

  it('blocks when lineup locked', () => {
    const r = runAutoSubLineupEngine({
      lineupLocked: true,
      starters: [
        {
          slotId: 's1',
          slotCode: 'RB',
          player: {
            name: 'Injured RB',
            positions: ['RB'],
            projectedPoints: 12,
            injuryStatus: 'Out',
          },
        },
      ],
      bench: [{ name: 'Bench RB', positions: ['RB'], projectedPoints: 8 }],
    })
    expect(r.blockedAutoSubs[0]?.reason).toContain('lock')
  })
})
