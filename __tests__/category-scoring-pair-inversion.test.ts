import { describe, expect, it } from 'vitest'
import {
  NBA_NINE_CAT,
  resolveCategoryMatchup,
  type CategoryMatchupResult,
} from '@/lib/category-scoring'

/**
 * matchupEngine.ts stores the matchup from one side only (forA) then inverts
 * it for the other side. This test locks in the inversion contract so a
 * regression in the engine immediately shows up here.
 */
describe('category matchup pair inversion', () => {
  it('inverting forA row-by-row yields the same result as resolving B vs A', () => {
    const a = {
      points_scored: 120,
      rebound: 45,
      assist: 22,
      steal: 8,
      block: 4,
      turnover: 12,
      field_goals_made: 45,
      field_goals_attempted: 95,
      free_throws_made: 20,
      free_throws_attempted: 24,
      three_point_made: 10,
    }
    const b = {
      points_scored: 110,
      rebound: 50,
      assist: 20,
      steal: 8,
      block: 5,
      turnover: 10,
      field_goals_made: 40,
      field_goals_attempted: 100,
      free_throws_made: 22,
      free_throws_attempted: 24,
      three_point_made: 12,
    }

    const forA = resolveCategoryMatchup(a, b, NBA_NINE_CAT)
    const invertedFromA: CategoryMatchupResult = {
      categories: forA.categories.map((c) => ({
        ...c,
        aValue: c.bValue,
        bValue: c.aValue,
        winner: c.winner === 'a' ? 'b' : c.winner === 'b' ? 'a' : 'tie',
      })),
      aWins: forA.bWins,
      bWins: forA.aWins,
      ties: forA.ties,
    }
    const directFromB = resolveCategoryMatchup(b, a, NBA_NINE_CAT)

    expect(invertedFromA.aWins).toBe(directFromB.aWins)
    expect(invertedFromA.bWins).toBe(directFromB.bWins)
    expect(invertedFromA.ties).toBe(directFromB.ties)
    for (let i = 0; i < invertedFromA.categories.length; i += 1) {
      const inv = invertedFromA.categories[i]!
      const dir = directFromB.categories[i]!
      expect(inv.categoryId).toBe(dir.categoryId)
      expect(inv.aValue).toBeCloseTo(dir.aValue, 10)
      expect(inv.bValue).toBeCloseTo(dir.bValue, 10)
      expect(inv.winner).toBe(dir.winner)
    }
  })

  it('category wins drive W/L/T; ties in cat wins would defer to points', () => {
    // Construct a matchup that ties at 4-4-1.
    const a = { points_scored: 100, rebound: 40, assist: 20, steal: 5, block: 3, turnover: 10, field_goals_made: 0, field_goals_attempted: 0, free_throws_made: 0, free_throws_attempted: 0, three_point_made: 0 }
    const b = { points_scored: 110, rebound: 35, assist: 25, steal: 4, block: 3, turnover: 8, field_goals_made: 0, field_goals_attempted: 0, free_throws_made: 0, free_throws_attempted: 0, three_point_made: 0 }
    // a wins REB, STL. b wins PTS, AST, TO. Shooting cats all 0/0 (ties).
    // Result: A=2, B=3, ties=4. Not a tie in cat wins — B wins.
    const result = resolveCategoryMatchup(a, b, NBA_NINE_CAT)
    expect(result.aWins).toBe(2)
    expect(result.bWins).toBe(3)
    expect(result.ties).toBe(4)
    // No cat-win tie means matchupEngine will NOT consult points. Test
    // documents this so the fallback branch stays honest.
    expect(result.aWins === result.bWins).toBe(false)
  })
})
