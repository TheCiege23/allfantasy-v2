/**
 * Map deterministic score to letter grade (A+ to D). No AI.
 */

import type { LetterGrade } from './types'
import { LETTER_GRADES } from './types'

/** Score is normalized to 0-100 from deterministic draft metrics. */
export function scoreToLetterGrade(score: number): LetterGrade {
  if (score >= 93) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 78) return 'A-'
  if (score >= 70) return 'B+'
  if (score >= 62) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

export { LETTER_GRADES }
