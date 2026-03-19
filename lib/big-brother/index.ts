/**
 * [NEW] lib/big-brother/index.ts
 * Big Brother League — public API. PROMPT 2/6.
 */

export * from './types'
export * from './constants'
export { isBigBrotherLeague, getBigBrotherConfig, upsertBigBrotherConfig } from './BigBrotherLeagueConfig'
export type { BigBrotherConfigUpsertInput } from './BigBrotherLeagueConfig'
export {
  getBigBrotherSportCalendarContext,
  isSportSupportedForBigBrother,
} from './BigBrotherSportCalendar'
export type { BigBrotherSportCalendarContext } from './BigBrotherSportCalendar'
export { appendBigBrotherAudit, getBigBrotherAuditLog } from './BigBrotherAuditLog'
export type { BigBrotherAuditEventType } from './BigBrotherAuditLog'
export { isEliminated, getExcludedRosterIds } from './bigBrotherGuard'
export { getEligibleHOHRosterIds, assignHOH } from './BigBrotherHOHEngine'
export {
  setNominations,
  setReplacementNominee,
  getFinalNomineeRosterIds,
} from './BigBrotherNominationEngine'
export {
  selectVetoCompetitors,
  setVetoWinner,
  useVeto,
} from './BigBrotherVetoEngine'
export {
  getEligibleVoterRosterIds,
  submitEvictionVote,
  tallyEvictionVotes,
} from './BigBrotherVoteEngine'
export type { SeasonPointsSource } from './BigBrotherVoteEngine'
export { closeEviction } from './BigBrotherEvictionService'
export {
  shouldJoinJury,
  enrollJuryMember,
  getJuryMembers,
  submitFinaleVote,
  tallyFinaleVotes,
} from './BigBrotherJuryEngine'
export { releaseEvictedRoster, getWaiverReleaseTiming } from './BigBrotherRosterReleaseEngine'

// PROMPT 3: State machine, eligibility, challenge, announcements, automation
export {
  getCyclePhase,
  getCurrentCycleForLeague,
  transitionPhase,
  canTransition,
  isValidPhase,
  createFirstCycleIfNeeded,
} from './BigBrotherPhaseStateMachine'
export { getEligibility, canRosterCompete, isJuryRoster } from './BigBrotherEligibilityEngine'
export {
  resolveChallengeByScore,
  resolveChallengeBySeededRandom,
  resolveChallengeHybrid,
  resolveHOHWinner,
  resolveVetoWinner,
} from './BigBrotherChallengeEngine'
export type { ChallengeInput, ScoreBasedInput } from './BigBrotherChallengeEngine'
export {
  announceHOHWinner,
  announceNominationCeremony,
  announceVetoDraw,
  announceVetoResult,
  announceEviction,
  announceJuryWelcome,
  announceFinaleWinner,
} from './BigBrotherChatAnnouncements'
export { runAutoNomination, runAutoReplacementNominee } from './BigBrotherNominationEnforcement'
export { runAutomation } from './BigBrotherAutomationService'
export type { AutomationRunInput, AutomationRunResult } from './BigBrotherAutomationService'
export { isFinaleReached, runFinaleTallyAndAnnounce } from './BigBrotherFinaleService'
export { getChallengeThemeSportLabel, getHOHChallengeThemeHints, getVetoChallengeThemeHints, getBigBrotherSupportedSports } from './sport-adapter'
export { runBigBrotherAdminAction } from './BigBrotherAdminService'
export type { BigBrotherAdminAction, BigBrotherAdminInput, BigBrotherAdminResult } from './BigBrotherAdminService'
export {
  isDoubleEvictionWeek,
  isAmericasVoteActive,
  hasSecretPowers,
  isAnonymousHOH,
  isBattleBackAvailable,
  haveNotPunishmentsActive,
} from './extensibility'
