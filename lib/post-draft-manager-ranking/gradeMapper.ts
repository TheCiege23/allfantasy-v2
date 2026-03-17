/**
 * Map deterministic score to letter grade (A+ to D). No AI.
 */

import type { LetterGrade } from './types'
import { LETTER_GRADES } from './types'

/** Score is totalValueScore + positionalScore + benchScore + balanceScore (normalized). Expect roughly -100 to +150 range. */
export function scoreToLetterGrade(score: number): LetterGrade {
  if (score >= 95) return 'A+'
  if (score >= 88) return 'A'
  if (score >= 82) return 'A-'
  if (score >= 75) return 'B+'
  if (score >= 68) return 'B'
  if (score >= 60) return 'B-'
  if (score >= 52) return 'C+'
  if (score >= 44) return 'C'
  if (score >= 36) return 'C-'
  if (score >= 28) return 'D+'
  return 'D'
}

export { LETTER_GRADES }
