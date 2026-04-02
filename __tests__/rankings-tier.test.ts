import { describe, it, expect } from 'vitest'

function canRequestJoin(userTier: number, leagueTier: number): boolean {
  return Math.abs(userTier - leagueTier) <= 1
}

describe('League tier access', () => {
  it('allows same tier', () => expect(canRequestJoin(5, 5)).toBe(true))
  it('allows 1 tier above', () => expect(canRequestJoin(5, 4)).toBe(true))
  it('allows 1 tier below', () => expect(canRequestJoin(5, 6)).toBe(true))
  it('blocks 2 tiers above', () => expect(canRequestJoin(5, 3)).toBe(false))
  it('blocks 2 tiers below', () => expect(canRequestJoin(5, 7)).toBe(false))
  it('clamps at tier 1', () => expect(canRequestJoin(1, 1)).toBe(true))
  it('clamps at tier 10', () => expect(canRequestJoin(10, 10)).toBe(true))
})
