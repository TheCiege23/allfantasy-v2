import type { PlayoffChallengeConfig } from "./types"

export function isAfCommissionerSubscriber(_user?: { id?: string | null } | null): boolean {
  return false
}

export function defaultPlayoffChallengeConfig(input: {
  visibility?: "private" | "public"
  maxParticipants?: number
  maxEntriesPerParticipant?: number
  scoringStyle?: string
  lockRule?: string
} = {}): PlayoffChallengeConfig {
  return {
    visibility: input.visibility ?? "private",
    maxParticipants: input.maxParticipants ?? 50,
    maxEntriesPerParticipant: input.maxEntriesPerParticipant ?? 1,
    scoringStyle: input.scoringStyle ?? "standard",
    lockRule: input.lockRule ?? "series_start",
    inviteBehavior: "invite_code",
    includePlayIn: false,
    pickSeriesScore: false,
    pickSeriesLength: false,
    pickSpread: false,
    pickOverUnder: false,
    scoring: {
      seriesWinnerPoints: 5,
      exactSeriesScoreBonus: 5,
      seriesLengthBonus: 2,
      upsetBonusPoints: 2,
      spreadPickPoints: 2,
      overUnderPickPoints: 2,
    },
    afCommissioner: {
      advancedScoring: {
        exactSeriesScore: false,
        seriesLengthBonus: false,
        upsetBonus: false,
        spreadPrediction: false,
        overUnderPrediction: false,
        customPointValues: false,
      },
      aiTools: {
        antiCollusion: false,
        duplicateEntryDetection: false,
        scoringExplainers: false,
        poolHealthReport: false,
        disputeAssistant: false,
        bracketIntegrityCheck: false,
      },
      automation: {
        incompleteBracketReminders: false,
        autoLockAtDeadline: true,
        autoRecalculateAfterSync: true,
        autoPostScoringUpdates: false,
        autoPostSeriesRecaps: false,
      },
      privacy: {
        hidePicksUntilLock: false,
        approvalRequired: false,
        passwordProtected: false,
        coCommissioners: false,
      },
      branding: {
        customLogo: false,
        customBanner: false,
        customWelcomeMessage: false,
        customRulesPage: false,
      },
      exports: {
        leaderboardCsv: false,
        picksCsv: false,
        printableBracket: false,
        auditLog: false,
      },
    },
  }
}

export function sanitizePlayoffChallengeConfig(
  raw: Partial<PlayoffChallengeConfig> | null | undefined,
  options: { afCommissionerEnabled?: boolean } = {},
): PlayoffChallengeConfig {
  const base = defaultPlayoffChallengeConfig({
    visibility: raw?.visibility,
    maxParticipants: raw?.maxParticipants,
    maxEntriesPerParticipant: raw?.maxEntriesPerParticipant,
    scoringStyle: raw?.scoringStyle,
    lockRule: raw?.lockRule,
  })

  const scoring = raw?.scoring ?? {}
  base.scoring = {
    seriesWinnerPoints: Number.isFinite(scoring.seriesWinnerPoints) ? Number(scoring.seriesWinnerPoints) : base.scoring.seriesWinnerPoints,
    exactSeriesScoreBonus: Number.isFinite(scoring.exactSeriesScoreBonus) ? Number(scoring.exactSeriesScoreBonus) : base.scoring.exactSeriesScoreBonus,
    seriesLengthBonus: Number.isFinite(scoring.seriesLengthBonus) ? Number(scoring.seriesLengthBonus) : base.scoring.seriesLengthBonus,
    upsetBonusPoints: Number.isFinite(scoring.upsetBonusPoints) ? Number(scoring.upsetBonusPoints) : base.scoring.upsetBonusPoints,
    spreadPickPoints: Number.isFinite(scoring.spreadPickPoints) ? Number(scoring.spreadPickPoints) : base.scoring.spreadPickPoints,
    overUnderPickPoints: Number.isFinite(scoring.overUnderPickPoints) ? Number(scoring.overUnderPickPoints) : base.scoring.overUnderPickPoints,
  }

  if (options.afCommissionerEnabled) {
    base.includePlayIn = raw?.includePlayIn === true
    base.pickSeriesScore = raw?.pickSeriesScore === true
    base.pickSeriesLength = raw?.pickSeriesLength === true
    base.pickSpread = raw?.pickSpread === true
    base.pickOverUnder = raw?.pickOverUnder === true
    base.afCommissioner = {
      ...base.afCommissioner,
      ...raw?.afCommissioner,
    }
  }

  return base
}
