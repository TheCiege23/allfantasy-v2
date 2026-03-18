/**
 * Reusable specialty-league module contracts (PROMPT 350).
 * Implementations live in league-specific engines (e.g. lib/survivor); this file defines
 * interfaces so future leagues (Big Brother, Tournament, etc.) can reuse the same patterns.
 */

import type { LeagueSport } from '@prisma/client'

// --- Tribe / group orchestration ---

export interface TribeOrchestrationContract {
  /** Create groups (e.g. tribes) with optional names and leader. */
  createGroups(args: {
    leagueId: string
    rosterIds: string[]
    formation: 'random' | 'commissioner'
    rosterToGroupIndex?: Record<string, number>
    groupNames?: string[]
    seed?: number
  }): Promise<{ ok: boolean; groups?: GroupWithMembers[]; error?: string }>
  /** List groups with members. */
  getGroupsWithMembers(leagueId: string): Promise<GroupWithMembers[]>
  /** Get group for a roster (pre-merge or equivalent). */
  getGroupForRoster(leagueId: string, rosterId: string): Promise<GroupRow | null>
  /** Set group name (commissioner). */
  setGroupName(leagueId: string, groupId: string, name: string): Promise<{ ok: boolean; error?: string }>
  /** Set group leader (commissioner). */
  setGroupLeader(leagueId: string, groupId: string, rosterId: string): Promise<{ ok: boolean; error?: string }>
}

export interface GroupRow {
  id: string
  leagueId: string
  name: string
  slotIndex: number
}

export interface GroupMemberRow {
  id: string
  groupId: string
  rosterId: string
  isLeader: boolean
}

export interface GroupWithMembers extends GroupRow {
  members: GroupMemberRow[]
}

// --- Hidden power systems (idols, advantages) ---

export interface HiddenPowerContract {
  /** Assign powers after draft; max one per roster at assignment. */
  assignAfterDraft(
    leagueId: string,
    playerRosterPairs: { playerId: string; rosterId: string }[],
    options?: { seed?: number }
  ): Promise<{ ok: boolean; assigned: number; error?: string }>
  /** Transfer ownership (trade / waiver_claim / stolen_player). */
  transfer(
    leagueId: string,
    powerId: string,
    toRosterId: string,
    reason: 'trade' | 'waiver_claim' | 'stolen_player'
  ): Promise<{ ok: boolean; error?: string }>
  /** Get power by bound player (for transfer on trade/claim). */
  getByPlayer(leagueId: string, playerId: string): Promise<{ id: string; rosterId: string } | null>
  /** Validate and apply use. */
  use(leagueId: string, powerId: string, rosterId: string, context?: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>
  /** Mark expired (e.g. post-merge). */
  expire(leagueId: string, powerId: string): Promise<{ ok: boolean; error?: string }>
  /** List active powers for a roster. */
  getActiveForRoster(leagueId: string, rosterId: string): Promise<{ id: string; playerId: string; powerType: string }[]>
}

// --- Private voting systems ---

export interface PrivateVotingContract {
  /** Submit a vote (before deadline). */
  submitVote(councilId: string, voterRosterId: string, targetRosterId: string): Promise<{ ok: boolean; error?: string }>
  /** Tally votes and resolve tie (e.g. by season points). */
  tallyVotes(
    councilId: string,
    seasonPointsSource?: SeasonPointsSource
  ): Promise<VoteTallyResult>
}

export interface SeasonPointsSource {
  getSeasonPointsForRoster(leagueId: string, rosterId: string, throughWeek: number): Promise<number>
}

export interface VoteTallyResult {
  votesByTarget: Record<string, number>
  tied: boolean
  eliminatedRosterId: string | null
  tieBreakSeasonPoints?: Record<string, number> | null
}

// --- Elimination pipeline ---

export interface EliminationPipelineContract {
  /** Create a round (e.g. tribal council). */
  createRound(args: {
    leagueId: string
    week: number
    phase: string
    attendingGroupId?: string | null
    voteDeadlineAt: Date
  }): Promise<{ ok: boolean; roundId?: string; error?: string }>
  /** Close round: tally, set eliminated, remove from group chat, enroll sidecar/jury. */
  closeRound(
    roundId: string,
    seasonPointsSource?: SeasonPointsSource
  ): Promise<{ ok: boolean; result?: EliminationResult; error?: string }>
}

export interface EliminationResult {
  roundId: string
  week: number
  phase: string
  eliminatedRosterId: string
  voteCount: Record<string, number>
  tieBreakUsed: boolean
}

// --- Exile / sidecar league systems ---

export interface SidecarLeagueContract {
  /** Get or create linked sidecar league (e.g. Exile Island). */
  getOrCreateSidecarLeague(
    mainLeagueId: string,
    options?: { sport?: string; name?: string }
  ): Promise<{ sidecarLeagueId: string; created: boolean }>
  /** Get sidecar league id for main. */
  getSidecarLeagueId(mainLeagueId: string): Promise<string | null>
  /** Enroll eliminated roster into sidecar (create roster for same user). */
  enroll(mainLeagueId: string, rosterId: string, platformUserId: string): Promise<{ ok: boolean; sidecarRosterId?: string; error?: string }>
}

// --- Tokenized return mechanics ---

export interface TokenizedReturnContract {
  /** Award token to top sidecar roster for the week. */
  awardTokenToTop(sidecarLeagueId: string, week: number, topRosterId: string): Promise<void>
  /** Reset all tokens (e.g. when commissioner/Boss wins). */
  resetAllWhenBossWins(sidecarLeagueId: string, mainLeagueId: string): Promise<void>
  /** Check if roster can return (tokens >= N and merge/phase condition). */
  canReturn(
    mainLeagueId: string,
    sidecarLeagueId: string,
    sidecarRosterId: string,
    currentWeek: number
  ): Promise<{ eligible: boolean; reason?: string }>
  /** Consume tokens and record return. */
  executeReturn(
    mainLeagueId: string,
    sidecarLeagueId: string,
    sidecarRosterId: string,
    options?: { platformUserId?: string }
  ): Promise<{ ok: boolean; error?: string }>
}

// --- Mini-game / challenge registry ---

export interface MiniGameRegistryContract {
  /** Create challenge for week. */
  createChallenge(
    leagueId: string,
    week: number,
    challengeType: string,
    configJson: Record<string, unknown>,
    lockAt?: Date
  ): Promise<{ ok: boolean; challengeId?: string; error?: string }>
  /** Submit answer (roster or group). Fails if locked. */
  submitAnswer(
    challengeId: string,
    rosterId: string | null,
    groupId: string | null,
    submission: Record<string, unknown>
  ): Promise<{ ok: boolean; error?: string }>
  /** Resolve and store result. */
  resolveChallenge(challengeId: string, resultJson: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>
  /** List challenges for week. */
  getChallengesForWeek(leagueId: string, week: number): Promise<ChallengeRow[]>
}

export interface ChallengeRow {
  id: string
  week: number
  challengeType: string
  lockAt: Date | null
  resultJson: unknown
  submissionCount: number
}

// --- Merge / jury / finale phases ---

export interface MergeJuryPhaseContract {
  /** Is merge triggered for this week? */
  isMergeTriggered(leagueId: string, currentWeek: number): Promise<boolean>
  /** Should this elimination join jury? */
  shouldJoinJury(leagueId: string, week: number): Promise<boolean>
  /** Enroll roster in jury. */
  enrollJuryMember(leagueId: string, rosterId: string, votedOutWeek: number): Promise<void>
  /** List jury members. */
  getJuryMembers(leagueId: string): Promise<{ rosterId: string; votedOutWeek: number }[]>
}

// --- @Chimmy official command parsing ---

export interface OfficialCommandParserContract {
  /** Parse raw message into intent and params. Does not resolve display names to IDs. */
  parse(raw: string): ParsedCommand
  /** Does message look like an official command? */
  looksLikeOfficialCommand(raw: string): boolean
}

export type CommandIntent =
  | 'vote'
  | 'play_idol'
  | 'play_power'
  | 'challenge_pick'
  | 'immunity_choice'
  | 'confirm_minigame'
  | 'unknown'

export interface ParsedCommand {
  intent: CommandIntent
  raw: string
  targetDisplayName?: string
  idolId?: string
  powerId?: string
  payload?: Record<string, unknown>
}

// --- AI host voice hooks ---

export interface AIHostContextContract {
  /** Build deterministic context for host/helper prompts (no outcomes). */
  buildContext(args: {
    leagueId: string
    currentWeek: number
    userId: string
  }): Promise<unknown | null>
}

export interface AIHostPromptContract {
  /** Build { system, user } for a given type (host_intro, tribe_help, etc.). */
  buildPrompt(context: unknown, type: string): { system: string; user: string }
}

export interface AIHostGenerateContract {
  /** Call LLM; return narrative only. */
  generate(context: unknown, type: string): Promise<{ narrative: string; model?: string }>
}

/** Short context string for Chimmy when user is in this league (inject into chat). */
export type ChimmyContextBuilder = (leagueId: string, userId: string) => Promise<string>

// --- Status transformation (Zombie-style: Survivor/Zombie/Whisperer, infection, revive) ---

export interface StatusTransformationContract {
  /** Get current status per roster (e.g. Survivor, Zombie, Whisperer). */
  getAllStatuses(leagueId: string): Promise<{ rosterId: string; status: string }[]>
  /** Get status for one roster. */
  getStatus(leagueId: string, rosterId: string): Promise<string>
  /** Set status (e.g. infect, revive, set special role). Deterministic only. */
  setStatus(
    leagueId: string,
    rosterId: string,
    status: string,
    options?: { week?: number; reasonRosterId?: string }
  ): Promise<{ ok: boolean; error?: string }>
  /** Get single "special role" roster if any (e.g. Whisperer). */
  getSpecialRoleRosterId?(leagueId: string): Promise<string | null>
}

// --- Resource inventory ledger (serum, weapons, ambush — balance + audit) ---

export interface ResourceInventoryLedgerContract {
  /** Get balance for a resource type (and optional key) for a roster. */
  getBalance(
    leagueId: string,
    rosterId: string,
    resourceType: string,
    resourceKey?: string
  ): Promise<number>
  /** Award resource (increment balance, append entry, audit). */
  award(
    leagueId: string,
    rosterId: string,
    resourceType: string,
    reason: string,
    options?: { week?: number; resourceKey?: string; leagueScopeId?: string }
  ): Promise<{ ok: boolean; error?: string }>
  /** Consume resource (decrement, append entry). Returns ok if had enough. */
  consume(
    leagueId: string,
    rosterId: string,
    resourceType: string,
    amount: number,
    reason: string,
    options?: { resourceKey?: string }
  ): Promise<{ ok: boolean; error?: string }>
}

// --- One-to-many universe (universe → levels → leagues) ---

export interface OneToManyUniverseContract {
  /** Create universe. */
  createUniverse(input: { name: string; sport?: string; settings?: Record<string, unknown> }): Promise<{ id: string }>
  /** Add level to universe (e.g. Gamma, Beta, Alpha). */
  addLevel(universeId: string, name: string, rankOrder: number, leagueCount?: number): Promise<{ id: string }>
  /** Attach league to universe/level (create or update link). */
  attachLeague(input: {
    universeId: string
    levelId: string
    leagueId: string
    name?: string
    orderInLevel?: number
  }): Promise<{ ok: boolean; error?: string }>
  /** List leagues in universe (with level). */
  getLeagues(universeId: string): Promise<{ leagueId: string; levelId: string; levelName: string; orderInLevel: number }[]>
}

// --- Cross-league standings aggregation ---

export interface CrossLeagueStandingsContract {
  /** Get aggregated standings across leagues in a scope (e.g. universe). */
  getStandings(
    scopeId: string,
    options?: { season?: number }
  ): Promise<CrossLeagueStandingsRow[]>
}

export interface CrossLeagueStandingsRow {
  leagueId: string
  rosterId: string
  levelId?: string
  levelName?: string
  status: string
  totalPoints: number
  winnings?: number
  weekKilled?: number | null
  [k: string]: unknown
}

// --- Promotion / relegation engine ---

export interface PromotionRelegationEngineContract {
  /** Get movement projections (who moves up/down, or watch). */
  getMovementProjections(
    scopeId: string,
    options?: { season?: number }
  ): Promise<{ rosterId: string; leagueId: string; reason: string; projectedLevelId: string | null }[]>
  /** Refresh projections from current standings (recompute and upsert). */
  refreshProjections(scopeId: string, season?: number): Promise<void>
}

// --- Weekly board generation (Chompin' Block, risk list, movement watch) ---

export interface WeeklyBoardGenerationContract {
  /** Get weekly board data for a league (and optional scope for movement). */
  getWeeklyBoard(
    leagueId: string,
    week: number,
    scopeId?: string | null
  ): Promise<{
    survivors: string[]
    zombies: string[]
    specialRoleRosterId?: string | null
    movementWatch: { rosterId: string; leagueId: string; reason: string; projectedLevelId: string | null }[]
    riskCandidates?: string[]
    [k: string]: unknown
  }>
}

// --- Anti-collusion flag registry ---

export interface AntiCollusionFlagRegistryContract {
  /** Evaluate and return deterministic flags (no AI). */
  evaluateFlags(leagueId: string): Promise<{ rosterIdA: string; rosterIdB: string; flagType: string }[]>
  /** Record flags to audit/log. */
  recordFlags(leagueId: string, flags: { rosterIdA: string; rosterIdB: string; flagType: string }[]): Promise<void>
}

// --- Anti-neglect / replacement workflows ---

export interface AntiNeglectReplacementContract {
  /** Evaluate dangerous drops (value vs threshold). Deterministic. */
  evaluateDangerousDrops(leagueId: string): Promise<{ rosterId: string; playerId: string; estimatedValue: number; threshold: number }[]>
  /** Record replacement/inactivity flags or trigger workflow. */
  recordReplacementFlags?(leagueId: string, payload: Record<string, unknown>): Promise<void>
}

// --- AI recap hooks (deterministic context → narrative only) ---

export interface AIRecapHooksContract {
  /** Build deterministic context for league-scoped recap/strategy. */
  buildLeagueContext(args: { leagueId: string; week: number; userId: string }): Promise<unknown | null>
  /** Build deterministic context for scope-scoped recap (e.g. universe). */
  buildScopeContext?(args: { scopeId: string; userId: string }): Promise<unknown | null>
  /** Prompt types for league (e.g. weekly_recap, most_at_risk, commissioner_summary). */
  leaguePromptTypes: string[]
  /** Prompt types for scope (e.g. promotion_relegation_outlook, level_storylines). */
  scopePromptTypes?: string[]
}
