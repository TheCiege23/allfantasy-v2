import type { Prisma, PrismaClient } from '@prisma/client'

type PowerRow = Prisma.SurvivorPowerTemplateCreateInput

const A = (s: string) => s.trim()

const DEF: Partial<PowerRow> = {
  phaseValidity: 'both',
  useWindow: 'anytime',
  expirationRule: 'at_use',
  targetType: 'self',
  isSecret: true,
  isTradable: false,
  riskLevel: 'medium',
  recommendedFreq: 'optional',
  maxPerSeason: 1,
  maxPerPlayer: 1,
  maxConcurrentLeague: 3,
  abusePreventionRules: A('Follow commissioner settings and SurvivorAuditEntry logging.'),
  revealBehavior: 'private_only',
  aiValidationRequired: A('Validate league phase, holder eligibility, and timing window.'),
  auditRequirements: A('Write SurvivorAuditEntry with full payload; never leak secrets publicly.'),
  isDraftDefault: false,
  isAdvanced: false,
  isDisadvantage: false,
}

export const SURVIVOR_POWER_TEMPLATE_ROWS: PowerRow[] = [
  {
    ...DEF,
    powerType: 'hidden_immunity_idol',
    powerLabel: 'Hidden Immunity Idol',
    powerCategory: 'immunity',
    description: A('Play before votes are read. All votes against you are cancelled.'),
    exactBehavior: A(`
      Holder must declare play to @Chimmy before voting deadline closes.
      AI validates: not already used, holder is currently eligible, timing window respected.
      Effect: All SurvivorVote where targetUserId = holder are set doesNotCount = true.
      Timing: after_votes_cast_before_reveal (commissioner-configurable to before_votes_finalized).
      Expiration: at_merge (unless commissioner sets survivorIdolsExpireAtMerge = false).
      On expiration: convert per survivorIdolConvertRule.`),
    useWindow: 'after_votes_cast_before_reveal',
    phaseValidity: 'both',
    targetType: 'self',
    expirationRule: 'at_merge',
    riskLevel: 'high',
    recommendedFreq: 'every_season',
    maxPerSeason: 3,
    maxConcurrentLeague: 3,
    abusePreventionRules: A(
      'Cannot be played after scroll reveal begins. Once per holder. Cannot be transferred post-merge.',
    ),
    revealBehavior: 'public_on_play',
    aiValidationRequired: A(
      'Check: isUsed=false, isExpired=false, council voting phase correct, holder is vote target',
    ),
    auditRequirements: A('Log: idol_played, protected_player, council_id, timestamp, all voided votes'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'super_immunity',
    powerLabel: 'Super Immunity Idol',
    powerCategory: 'immunity',
    description: A('Protects yourself AND one ally. Both are safe at Tribal.'),
    exactBehavior: A(`
      Holder plays to @Chimmy, declaring themselves AND one tribe member.
      Both players have all their votes cancelled.
      Ally must be on the same tribe (pre-merge) or in the game (post-merge).
      Ally does NOT know they are protected until reveal.
      Commissioner can restrict to pre-merge only.`),
    useWindow: 'after_votes_cast_before_reveal',
    phaseValidity: 'pre_merge',
    targetType: 'self',
    expirationRule: 'at_merge',
    riskLevel: 'legendary',
    recommendedFreq: 'most_seasons',
    maxPerSeason: 1,
    maxConcurrentLeague: 1,
    abusePreventionRules: A(
      'One per season max. Ally must be named before reveal. Cannot target already-immune player.',
    ),
    revealBehavior: 'public_on_play',
    auditRequirements: A('Log: both protected players, council_id, timestamp'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'double_vote',
    powerLabel: 'Double Vote',
    powerCategory: 'vote_control',
    description: A('Cast two valid votes at one Tribal Council.'),
    exactBehavior: A(`
      Holder submits two separate votes to @Chimmy. Both are recorded.
      Both votes count in the tally.
      Both appear in the scroll reveal (labeled from same voter).
      Can target same player twice (counts as 2 votes against that player).
      Can target different players.
      Cannot be played without attending Tribal.`),
    useWindow: 'before_votes_finalized',
    targetType: 'opponent',
    expirationRule: 'at_use',
    isTradable: true,
    riskLevel: 'high',
    recommendedFreq: 'every_season',
    maxPerSeason: 2,
    maxConcurrentLeague: 2,
    abusePreventionRules: A(
      'Only at a Tribal Council the holder attends. Cannot vote for immune players. Third vote attempt rejected.',
    ),
    revealBehavior: 'public_on_play',
    auditRequirements: A('Log: both votes, timestamps, targets, isDoubleVote=true on both records'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'vote_nullifier',
    powerLabel: 'Vote Nullifier',
    powerCategory: 'vote_control',
    description: A('Cancel one specific vote at Tribal Council before it counts.'),
    exactBehavior: A(`
      Holder tells @Chimmy: "I nullify the vote cast by [voterName]."
      Must name the voter, not the target.
      That voter's vote is set doesNotCount = true and nullifiedBy = holder.
      Reveal shows: "[voter]'s vote... does not count."
      Holder does not need to know what vote was cast — only nullifies by voter identity.
      Cannot nullify a double-vote twice (only cancels one of the two votes).`),
    useWindow: 'after_votes_cast_before_reveal',
    targetType: 'opponent',
    expirationRule: 'at_use',
    isTradable: true,
    riskLevel: 'high',
    recommendedFreq: 'most_seasons',
    maxPerSeason: 2,
    maxConcurrentLeague: 2,
    abusePreventionRules: A(
      'Must name a real voter. Cannot nullify own vote. Cannot nullify a vote that was already nullified.',
    ),
    revealBehavior: 'public_on_play',
    auditRequirements: A('Log: nullified vote id, voter, holder, timestamp'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'tribe_choice',
    powerLabel: 'Tribe Choice',
    powerCategory: 'tribe_control',
    description: A('Secretly decide which tribe attends Tribal Council instead of the losing tribe.'),
    exactBehavior: A(`
      Holder submits secret tribal target to @Chimmy before scoring week closes.
      After scores finalize, system checks if holder invoked this power.
      If invoked: override survivorPhase tribal target to holder's chosen tribe.
      That tribe attends Tribal instead of the losing tribe.
      The losing tribe does NOT know they were saved.
      The targeted tribe learns after the week ends (when tribal is announced).
      Power must be used before scoring locks — cannot be played retroactively.
      Commissioner can configure: holder's tribe cannot be protected this way.`),
    useWindow: 'before_kickoff',
    phaseValidity: 'pre_merge',
    targetType: 'tribe',
    expirationRule: 'at_use',
    riskLevel: 'legendary',
    recommendedFreq: 'most_seasons',
    maxPerSeason: 1,
    maxConcurrentLeague: 1,
    abusePreventionRules: A(
      'Can only target tribes with 3+ eligible players. Cannot target merged tribe. Must be pre-merge. Expires at merge.',
    ),
    revealBehavior: 'public_post_reveal',
    auditRequirements: A('Log: holder, target_tribe, week, timestamp, original losing tribe'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'point_boost_20',
    powerLabel: '+20 Points Boost',
    powerCategory: 'score_performance',
    description: A('Add 20 fantasy points to your weekly score.'),
    exactBehavior: A(`
      Must declare use to @Chimmy before the week's scoring LOCKS (before kickoff).
      System adds 20 to holder's PlayerWeeklyScore after official stats.
      Cannot be declared after games start.
      Appears in audit as score modifier.
      +20 counts toward tribe total in pre-merge. Counts as individual score in post-merge.`),
    useWindow: 'before_kickoff',
    targetType: 'self',
    isSecret: false,
    expirationRule: 'at_merge',
    isTradable: true,
    riskLevel: 'medium',
    recommendedFreq: 'every_season',
    maxPerSeason: 2,
    maxConcurrentLeague: 3,
    abusePreventionRules: A(
      'Must be declared before any games in the scoring week start. Cannot be applied retroactively.',
    ),
    revealBehavior: 'public_on_play',
    auditRequirements: A('Log: applied amount, week, original score, adjusted score'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'point_boost_10',
    powerLabel: '+10 Clutch Bonus',
    powerCategory: 'score_performance',
    description: A('Add 10 fantasy points to your score. Can be declared up until official weekly close.'),
    exactBehavior: A(`
      More flexible timing than +20 boost — can be declared any time
      before the official scoring week CLOSES (after all games finish, before finalization).
      System adds 10 points before isFinalized is set.
      Useful as a last-minute insurance against a bad week.`),
    useWindow: 'before_kickoff',
    targetType: 'self',
    expirationRule: 'at_use',
    isTradable: true,
    riskLevel: 'low',
    recommendedFreq: 'every_season',
    maxPerSeason: 3,
    maxConcurrentLeague: 4,
    abusePreventionRules: A('Window closes when isFinalized is set on PlayerWeeklyScore. Cannot be retroactively applied.'),
    revealBehavior: 'private_only',
    aiValidationRequired: A('Official scoring not yet finalized for the week'),
    auditRequirements: A('Log: applied amount, week, score before/after, timestamp'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'rival_penalty_10',
    powerLabel: '-10 Score Shield',
    powerCategory: 'score_performance',
    description: A('Apply a -10 point penalty to a rival player\'s weekly score.'),
    exactBehavior: A(`
      Holder declares target to @Chimmy before kickoff.
      System applies -10 to target's PlayerWeeklyScore.
      Target is NOT told who applied the penalty, only that a penalty was applied.
      Does not reduce below 0 (minimum score is 0 points).
      Affects tribe total in pre-merge.
      Counts in individual standings post-merge.`),
    useWindow: 'before_kickoff',
    targetType: 'opponent',
    expirationRule: 'at_use',
    riskLevel: 'medium',
    recommendedFreq: 'most_seasons',
    maxPerSeason: 2,
    maxConcurrentLeague: 2,
    abusePreventionRules: A(
      'Cannot target same player two weeks in a row. Cannot target immune player. Pre-kickoff only.',
    ),
    revealBehavior: 'public_post_reveal',
    auditRequirements: A('Log: holder, target, week, score before/after, timestamp'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'waiver_priority_override',
    powerLabel: 'Waiver Priority Override',
    powerCategory: 'roster_movement',
    description: A('Jump to #1 waiver priority this week regardless of standing.'),
    exactBehavior: A(`
      Holder declares use before waiver window opens.
      System sets holder's waiverPriority = 0 (highest) for that waiver run.
      After waiver runs: priority resets to normal standing order.
      Does not grant additional FAAB — only priority position in rolling/reverse waivers.
      In FAAB leagues: highest bidder still wins; this has no effect.
      Commissioner can restrict to rolling-waiver leagues only.`),
    useWindow: 'anytime',
    targetType: 'self',
    expirationRule: 'at_use',
    isTradable: true,
    riskLevel: 'low',
    recommendedFreq: 'every_season',
    maxPerSeason: 2,
    maxConcurrentLeague: 4,
    abusePreventionRules: A('One use per waiver cycle. Not stackable with another waiver override in same week.'),
    revealBehavior: 'private_only',
    aiValidationRequired: A('Waiver window not yet processed, rolling waivers enabled'),
    auditRequirements: A('Log: original priority, overridden priority, week, waiver run timestamp'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'faab_bounty',
    powerLabel: 'FAAB Bounty',
    powerCategory: 'roster_movement',
    description: A('Receive a +$25 FAAB bonus added to your budget.'),
    exactBehavior: A(`
      Applied immediately when holder claims power.
      Adds $25 to holder's RedraftRoster.faabBalance.
      If not a FAAB league: converts to +5 fantasy points instead (commissioner-configurable).
      Non-tradable: FAAB value is league-specific.`),
    useWindow: 'anytime',
    targetType: 'self',
    isSecret: false,
    expirationRule: 'never',
    riskLevel: 'low',
    recommendedFreq: 'every_season',
    maxPerSeason: 3,
    maxConcurrentLeague: 6,
    abusePreventionRules: A('Amount capped at $25 per instance. Cannot stack multiple bounties in same waiver run.'),
    revealBehavior: 'private_only',
    aiValidationRequired: A('FAAB is enabled in league, or commissioner has configured points conversion'),
    auditRequirements: A('Log: faab amount added, holder, timestamp, pre/post balance'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'idol_sniffer',
    powerLabel: 'Idol Sniffer',
    powerCategory: 'information',
    description: A('Learn whether one specific player is currently holding any active power.'),
    exactBehavior: A(`
      Holder names one player to @Chimmy privately.
      Chimmy responds: "Yes, [player] holds at least one active power." OR "No, [player] holds no active powers."
      Does NOT reveal what the power is.
      Does NOT reveal number of powers.
      Cannot be used on self.
      Information stays secret — only holder knows the result.`),
    useWindow: 'anytime',
    targetType: 'any',
    expirationRule: 'at_use',
    isTradable: true,
    riskLevel: 'medium',
    recommendedFreq: 'most_seasons',
    maxPerSeason: 2,
    maxConcurrentLeague: 3,
    abusePreventionRules: A('Cannot target self. Result is binary only. One use. AI must not reveal power type.'),
    revealBehavior: 'private_only',
    auditRequirements: A('Log: holder, target, result, timestamp — NEVER log result publicly'),
    isDraftDefault: true,
  },
  {
    ...DEF,
    powerType: 'safety_without_power',
    powerLabel: 'Safety Without Power',
    powerCategory: 'immunity',
    description: A('Grants one-week immunity but you give up the right to play any other power this week.'),
    exactBehavior: A(`
      Holder declares to @Chimmy before tribal council opens.
      Holder is immune this week.
      However: holder cannot play any other idol, advantage, or power this tribal.
      Any other powers held are temporarily locked for this tribal.
      Standard immunity behaviors apply (cannot be voted out, votes against them are invalid).
      Power is consumed on use.`),
    useWindow: 'before_votes_finalized',
    targetType: 'self',
    expirationRule: 'at_use',
    riskLevel: 'medium',
    recommendedFreq: 'most_seasons',
    maxPerSeason: 2,
    maxConcurrentLeague: 2,
    abusePreventionRules: A(
      'All other powers are locked for this tribal when activated. Cannot be combined with hidden_immunity_idol.',
    ),
    revealBehavior: 'public_on_play',
    auditRequirements: A('Log: holder, tribal, immunity granted, other powers locked'),
    isDraftDefault: true,
  },
  // --- Advanced (13–20) ---
  {
    ...DEF,
    powerType: 'vote_steal',
    powerLabel: 'Vote Steal',
    powerCategory: 'vote_control',
    description: A('Take one player\'s vote from them and cast it yourself.'),
    exactBehavior: A(
      'Holder names target and cast direction to @Chimmy. Target cannot vote. Holder casts their stolen vote.',
    ),
    useWindow: 'before_votes_finalized',
    targetType: 'opponent',
    riskLevel: 'legendary',
    maxPerSeason: 1,
    abusePreventionRules: A('Cannot steal vote of immune player. Holder still casts their own vote separately.'),
    isAdvanced: true,
  },
  {
    ...DEF,
    powerType: 'force_revote',
    powerLabel: 'Force Revote',
    powerCategory: 'vote_control',
    description: A('After a vote result is announced (before elimination), force a full revote.'),
    exactBehavior: A(
      'Holder plays within 5 minutes of final tally. Scroll reveal pauses. Full revote opens for 30 minutes.',
    ),
    riskLevel: 'legendary',
    maxPerSeason: 1,
    abusePreventionRules: A('Cannot be used if rocks already drawn. Cannot reverse a rock elimination.'),
    isAdvanced: true,
  },
  {
    ...DEF,
    powerType: 'player_steal_3',
    powerLabel: 'Triple Player Steal',
    powerCategory: 'roster_movement',
    description: A('Steal three same-position fantasy players from a rival\'s roster.'),
    exactBehavior: A(
      'Holder names rival + three same-position players pre-kickoff. Players move to holder\'s roster until end of week, then return.',
    ),
    phaseValidity: 'pre_merge',
    targetType: 'opponent',
    riskLevel: 'legendary',
    maxPerSeason: 1,
    abusePreventionRules: A(
      'Stolen players cannot be dropped or traded during steal. Rival is notified immediately.',
    ),
    isAdvanced: true,
  },
  {
    ...DEF,
    powerType: 'swap_bench_starter',
    powerLabel: 'Bench Sabotage',
    powerCategory: 'roster_movement',
    description: A('Force a rival to bench their highest-projected starter and replace with their lowest bench player.'),
    exactBehavior: A(
      'Pre-kickoff only. AI identifies rival\'s projected top starter and lowest bench player. Forces swap for that week only.',
    ),
    useWindow: 'before_kickoff',
    targetType: 'opponent',
    riskLevel: 'high',
    maxPerSeason: 2,
    abusePreventionRules: A('Cannot be stacked in same week by multiple holders against same target.'),
    isAdvanced: true,
  },
  {
    ...DEF,
    powerType: 'reveal_tribe_powers',
    powerLabel: 'Tribe Power Reveal',
    powerCategory: 'information',
    description: A('Force public reveal of how many active powers exist in one tribe (not who holds them).'),
    exactBehavior: A(
      'Holder names a tribe. AI posts: \'This tribe holds N active powers.\' No names revealed.',
    ),
    phaseValidity: 'pre_merge',
    targetType: 'tribe',
    maxPerSeason: 2,
    abusePreventionRules: A('Cannot be used on own tribe for self-advertising. Number only — never names.'),
    isAdvanced: true,
  },
  {
    ...DEF,
    powerType: 'idol_to_faab',
    powerLabel: 'Idol-to-FAAB Converter',
    powerCategory: 'roster_movement',
    description: A('Convert one unused idol to $40 FAAB at the merge.'),
    exactBehavior: A(
      'Triggered automatically at merge for any holder of this power who has another unused idol. Converts that idol\'s value to $40 FAAB.',
    ),
    useWindow: 'at_merge',
    phaseValidity: 'pre_merge',
    targetType: 'self',
    riskLevel: 'low',
    maxPerSeason: 2,
    abusePreventionRules: A('Requires holding a second unused idol at merge. Cannot convert active powers already played.'),
    isAdvanced: true,
  },
  {
    ...DEF,
    powerType: 'jury_speech_bonus',
    powerLabel: 'Jury Speech Advantage',
    powerCategory: 'merge_endgame',
    description: A('Get a second opening statement to the jury during the finale.'),
    exactBehavior: A(
      'Finalist uses at finale opening. Gets one extra speech prompt before jury questions begin.',
    ),
    useWindow: 'at_merge',
    phaseValidity: 'post_merge',
    targetType: 'self',
    riskLevel: 'low',
    maxPerSeason: 1,
    abusePreventionRules: A('Only usable by a finalist. AI validates player is in Final 3.'),
    isAdvanced: true,
  },
  {
    ...DEF,
    powerType: 'dual_immunity',
    powerLabel: 'Dual Immunity',
    powerCategory: 'immunity',
    description: A('In post-merge, two players receive immunity in the same week.'),
    exactBehavior: A(
      'Commissioner activates this as a special week twist. Two players win immunity — AI defines who (challenge + score combo). Both are safe.',
    ),
    useWindow: 'anytime',
    phaseValidity: 'post_merge',
    targetType: 'self',
    riskLevel: 'high',
    maxPerSeason: 1,
    abusePreventionRules: A(
      'Commissioner-only activation. Cannot be used in a week with 4 or fewer players remaining.',
    ),
    isAdvanced: true,
  },
  // --- Disadvantages (21–26) ---
  {
    ...DEF,
    powerType: 'lose_vote',
    powerLabel: 'Lost Vote',
    powerCategory: 'disadvantage',
    description: A('You cannot vote at the next Tribal Council your tribe attends.'),
    exactBehavior: A(
      'Player is blocked from submitting a vote. @Chimmy tells them privately they cannot vote. Their name appears in voting list as \'DID NOT VOTE\'.',
    ),
    targetType: 'self',
    riskLevel: 'high',
    abusePreventionRules: A('Must be applied before that tribal opens. Cannot be applied retroactively.'),
    isDisadvantage: true,
    expirationRule: 'at_use',
  },
  {
    ...DEF,
    powerType: 'challenge_sit_out',
    powerLabel: 'Forced Sit-Out',
    powerCategory: 'disadvantage',
    description: A('You cannot participate in the next tribe challenge.'),
    exactBehavior: A(
      'Player\'s submission for that week\'s challenge is rejected. Tribe loses their score contribution. AI notifies player privately.',
    ),
    targetType: 'self',
    riskLevel: 'medium',
    isDisadvantage: true,
    expirationRule: 'at_use',
  },
  {
    ...DEF,
    powerType: 'point_penalty_week',
    powerLabel: '-15 Point Penalty',
    powerCategory: 'disadvantage',
    description: A('Your fantasy score this week is reduced by 15 points.'),
    exactBehavior: A(
      'Applied before scoring is finalized. Score cannot go below 0. Player notified privately.',
    ),
    targetType: 'self',
    riskLevel: 'medium',
    isDisadvantage: true,
    expirationRule: 'at_use',
  },
  {
    ...DEF,
    powerType: 'trade_block',
    powerLabel: 'Trade Block',
    powerCategory: 'disadvantage',
    description: A('You cannot participate in any trades this week.'),
    exactBehavior: A(
      'All incoming and outgoing trade proposals for holder are automatically rejected this week. Player notified.',
    ),
    targetType: 'self',
    riskLevel: 'low',
    isDisadvantage: true,
    expirationRule: 'at_use',
  },
  {
    ...DEF,
    powerType: 'public_reveal_forced',
    powerLabel: 'Forced Public Reveal',
    powerCategory: 'disadvantage',
    description: A('One of your active powers is publicly revealed to the entire league.'),
    exactBehavior: A(
      'AI randomly selects one of holder\'s active idols and announces it publicly. Holder is identified as the holder. Idol is no longer secret.',
    ),
    targetType: 'self',
    riskLevel: 'high',
    abusePreventionRules: A('If holder has no active powers, disadvantage is wasted (no effect).'),
    isDisadvantage: true,
    expirationRule: 'at_use',
  },
  {
    ...DEF,
    powerType: 'auto_tribal_vulnerability',
    powerLabel: 'Automatic Tribal Vulnerability',
    powerCategory: 'disadvantage',
    description: A('You are automatically considered eligible for voting even if your tribe wins immunity.'),
    exactBehavior: A(
      'If your tribe wins and does NOT go to tribal: disadvantage is wasted. If your tribe goes to tribal: you are added to eligible voter list even if otherwise not eligible.',
    ),
    targetType: 'self',
    riskLevel: 'legendary',
    abusePreventionRules: A(
      'Does not override idol immunity. Does not force a tribal that wasn\'t happening.',
    ),
    isDisadvantage: true,
    expirationRule: 'at_use',
  },
  // --- Exile (27–30) ---
  {
    ...DEF,
    powerType: 'token_shield',
    powerLabel: 'Token Shield',
    powerCategory: 'exile_token',
    description: A('Protect your entire token balance from the next Boss reset.'),
    exactBehavior: A(
      'If Boss wins this week and tokens would reset: holder\'s tokens are NOT reset. All other exile players\' tokens reset as normal.',
    ),
    targetType: 'self',
    riskLevel: 'medium',
    expirationRule: 'at_use',
    maxConcurrentLeague: 4,
  },
  {
    ...DEF,
    powerType: 'exile_immunity',
    powerLabel: 'Exile Immunity',
    powerCategory: 'exile_token',
    description: A('You cannot lose tokens for one week even if you score last on Exile Island.'),
    exactBehavior: A('Token earning still possible. No token loss. Boss reset still applies to others.'),
    targetType: 'self',
    riskLevel: 'low',
    expirationRule: 'at_use',
  },
  {
    ...DEF,
    powerType: 'auto_qualify_return',
    powerLabel: 'Return Challenge Auto-Qualifier',
    powerCategory: 'exile_token',
    description: A('Automatically qualify for the exile return challenge regardless of token standings.'),
    exactBehavior: A(
      'Even if not top token holder, holder participates in the return opportunity when it opens. Does not guarantee return — still must win or score highest.',
    ),
    targetType: 'self',
    riskLevel: 'high',
    expirationRule: 'at_use',
  },
  {
    ...DEF,
    powerType: 'token_steal_exile',
    powerLabel: 'Token Steal',
    powerCategory: 'exile_token',
    description: A('Steal 2 tokens from one other exile player.'),
    exactBehavior: A(
      'Holder names target to @Chimmy. 2 tokens transferred immediately. Target notified they lost 2 tokens (not who stole them). Thief identity stays secret.',
    ),
    targetType: 'opponent',
    riskLevel: 'medium',
    maxPerSeason: 1,
    abusePreventionRules: A('Cannot target player with 0 tokens. Cannot steal from another player twice in a row.'),
    expirationRule: 'at_use',
  },
  // --- Merge / endgame (31–34) ---
  {
    ...DEF,
    powerType: 'merge_hidden_immunity',
    powerLabel: 'Merge Immunity Idol',
    powerCategory: 'immunity',
    description: A('A hidden immunity idol that is valid only post-merge.'),
    exactBehavior: A(
      'Same behavior as hidden_immunity_idol but seeded at merge or found via challenge. Pre-merge players cannot use this.',
    ),
    phaseValidity: 'post_merge',
    expirationRule: 'never',
    riskLevel: 'high',
    maxPerSeason: 2,
    maxConcurrentLeague: 2,
  },
  {
    ...DEF,
    powerType: 'final_4_idol',
    powerLabel: 'Final Immunity Nullifier',
    powerCategory: 'vote_control',
    description: A('Cancel the Final 4 individual immunity idol if played at the right moment.'),
    exactBehavior: A(
      'Must be played at the Final 4 tribal. Cancels one immunity win. That player becomes eligible. Extremely rare. Commissioner must explicitly enable.',
    ),
    phaseValidity: 'post_merge',
    riskLevel: 'legendary',
    maxPerSeason: 1,
    maxConcurrentLeague: 1,
  },
  {
    ...DEF,
    powerType: 'idol_to_points_merge',
    powerLabel: 'Idol-to-Points (Merge Bonus)',
    powerCategory: 'score_performance',
    description: A('Convert one held idol to +30 fantasy points at the merge.'),
    exactBehavior: A(
      'Activated at merge automatically. Converts one other held idol into +30 applied to that week\'s score.',
    ),
    useWindow: 'at_merge',
    phaseValidity: 'pre_merge',
    targetType: 'self',
    riskLevel: 'low',
    maxPerSeason: 2,
  },
  {
    ...DEF,
    powerType: 'finalist_response_advantage',
    powerLabel: 'Finalist Response Advantage',
    powerCategory: 'merge_endgame',
    description: A('During jury questioning, get one additional response opportunity before the jury casts votes.'),
    exactBehavior: A(
      'After all jury questions are asked, holder may submit one final statement. AI posts it to finale chat. Jury sees it before voting.',
    ),
    useWindow: 'at_merge',
    phaseValidity: 'post_merge',
    targetType: 'self',
    riskLevel: 'medium',
    maxPerSeason: 1,
  },
]

export async function seedSurvivorPowerTemplates(prisma: PrismaClient): Promise<void> {
  for (const row of SURVIVOR_POWER_TEMPLATE_ROWS) {
    await prisma.survivorPowerTemplate.upsert({
      where: { powerType: row.powerType },
      create: row,
      update: row,
    })
  }
}
