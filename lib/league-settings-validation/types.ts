/**
 * Result of league settings validation.
 * Used to prevent invalid league configurations (e.g. auction without budgets, devy without slots).
 */

export interface LeagueSettingsValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
