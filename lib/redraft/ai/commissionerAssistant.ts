export type InactiveAlert = { rosterId: string; reason: string }
export type RuleRec = { suggestion: string }
export type ModerationResult = { allow: boolean; reason?: string; severity?: 1 | 2 | 3 }

export async function detectInactiveManagers(_seasonId: string): Promise<InactiveAlert[]> {
  return []
}

export async function generateRuleRecommendations(
  _leagueId: string,
  _seasonId: string,
): Promise<RuleRec[]> {
  return []
}

export async function moderateLeagueChat(
  _message: string,
  _leagueId: string,
): Promise<ModerationResult> {
  return { allow: true }
}
