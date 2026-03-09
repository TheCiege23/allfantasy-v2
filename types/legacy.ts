export type LegacyApiStatus = 'ok' | 'insufficient_data' | 'error'

export interface LegacyApiMeta {
  confidence: number
  usedLiveNewsOverlay: boolean
  usedSimulation: boolean
  needsRefreshAfter?: string
  generatedAt: string
  requestId: string
  aiStack: {
    orchestrator: 'openai'
    structuredEvaluator: 'deepseek'
    liveNewsOverlay: 'grok'
  }
  missingFields?: string[]
}

export interface LegacyApiError {
  code: string
  message: string
  field?: string
}

export interface LegacyApiResponse<T, TScreen extends LegacyScreen = LegacyScreen> {
  status: LegacyApiStatus
  screen: TScreen
  data: T | null
  meta: LegacyApiMeta
  errors: LegacyApiError[]
}

export type LegacyScreen =
  | 'offseason_dashboard'
  | 'draft_war_room'
  | 'trade_command_center'
  | 'trade_review'
  | 'draft_recommendation_refresh'
  | 'team_direction_refresh'
  | 'market_refresh'

export interface LeagueContext {
  leagueId: string
  sport: 'NFL'
  format: 'redraft' | 'dynasty' | 'keeper' | 'bestball' | 'devy' | 'superflex_dynasty' | 'superflex_redraft'
  scoringType: 'standard' | 'half_ppr' | 'ppr' | 'tep'
  superflex: boolean
  tePremium: boolean
  teams: number
  rosterSize: number
  benchSize: number
  taxiSlots?: number
  devySlots?: number
  playoffWeeks?: number[]
}

export type AssetType = 'player' | 'pick'

export interface TradeAsset {
  assetType: AssetType
  assetId: string
  name: string
  position?: string
  team?: string
  season?: number
  round?: number
  originalOwnerTeamId?: string
}

export interface LegacyPlayerRef {
  playerId: string
  name: string
  position: string
  nflTeam: string | null
}

export interface PlayerScoreCard extends LegacyPlayerRef {
  fitScore?: number
  valueScore?: number
  breakoutScore?: number
  declineScore?: number
  stashScore?: number
  draftPickScore?: number
  reason: string
}

export type TeamDirectionLabel =
  | 'all_in_contender'
  | 'contender'
  | 'retool'
  | 'soft_rebuild'
  | 'full_rebuild'

export interface TeamDirection {
  label: TeamDirectionLabel
  score: number
  confidence: number
  explanation: string
}

export interface CompetitiveWindow {
  label: 'win_now' | '1_to_2_year_window' | '2_to_3_year_window' | 'long_rebuild'
  score: number
}

export interface TeamSnapshot {
  overallGrade: number
  contenderScore: number
  rebuildScore: number
  ageCurveScore: number
  starterStrengthScore: number
  benchDepthScore: number
  futureAssetScore: number
  tradeFlexibilityScore: number
  injuryFragilityScore: number
  leagueMarketAdvantageScore: number
}

export interface StrengthOrWeaknessItem {
  area: string
  score: number
  reason: string
}

export interface NeedPriorityItem {
  priority: number
  need: string
  impactScore: number
}

export interface WatchlistBucket<T = PlayerScoreCard> {
  items: T[]
}

export interface OffseasonWatchlists {
  breakoutCandidates: WatchlistBucket<PlayerScoreCard>
  declineCandidates: WatchlistBucket<PlayerScoreCard>
  holdCandidates: WatchlistBucket<PlayerScoreCard>
  cutCandidates: WatchlistBucket<PlayerScoreCard>
}

export interface MarketTarget extends PlayerScoreCard {
  targetTeamId?: string
  estimatedCostTier?: string
  estimatedReturnTier?: string
}

export interface MarketOpportunities {
  buyLowTargets: MarketTarget[]
  sellHighTargets: MarketTarget[]
  waiverStashes: MarketTarget[]
}

export interface ActionPlanItem {
  order: number
  actionType: 'trade_target' | 'bench_cleanup' | 'draft_strategy' | 'sell_window' | 'waiver_add' | 'hold'
  title: string
  details: string
}

export interface DashboardAlert {
  severity: 'low' | 'medium' | 'high'
  type: 'market_shift' | 'injury_risk' | 'depth_chart_change' | 'team_direction_warning' | 'league_trend'
  title: string
  body: string
}

export interface CoachingSummary {
  headline: string
  summary: string
}

export interface OffseasonDashboardData {
  leagueContext: LeagueContext
  teamContext: {
    userId: string
    teamId: string
    teamName: string
    teamDirection: TeamDirection
    competitiveWindow: CompetitiveWindow
  }
  teamSnapshot: TeamSnapshot
  rosterStrengths: StrengthOrWeaknessItem[]
  rosterWeaknesses: StrengthOrWeaknessItem[]
  needsByPriority: NeedPriorityItem[]
  playerWatchlists: OffseasonWatchlists
  marketOpportunities: MarketOpportunities
  actionPlan: ActionPlanItem[]
  alerts: DashboardAlert[]
  coachingSummary: CoachingSummary
}

export interface DraftContext {
  leagueId: string
  draftId: string
  round: number
  pickNumber: number
  overallPick: number
  userTeamId: string
  draftType: 'snake' | 'linear' | 'auction'
  playerPool: 'rookie' | 'vet' | 'combined'
  clockStatus: 'on_the_clock' | 'upcoming' | 'completed' | 'unknown'
}

export interface TeamStrategyContext {
  teamDirection: TeamDirectionLabel
  primaryNeed: string
  secondaryNeed?: string
  rosterBuild: string
  riskProfile: 'safe' | 'balanced' | 'aggressive'
}

export interface DraftRecommendation extends LegacyPlayerRef {
  draftPickScore: number
  fitScore: number
  valueScore: number
  tier: number
  recommendation: 'draft_now' | 'pivot' | 'trade_back_target'
  reason: string
}

export interface DraftRecommendationGroup {
  bestFit: { playerId: string; name: string; score: number }
  bestValue: { playerId: string; name: string; score: number }
  highestUpside: { playerId: string; name: string; score: number }
  safestPick: { playerId: string; name: string; score: number }
}

export interface PredictedPickAhead {
  pickBeforeYou: number
  teamId: string
  teamNeed: string
  predictedPick: { playerId: string; name: string; position: string }
  probability: number
  reason: string
}

export interface AvailabilityMatrixItem {
  playerId: string
  name: string
  probabilityAvailableAtPick: number
}

export interface PivotPlan {
  ifTopTargetGone: Array<{ priority: number; playerId: string; name: string; reason: string }>
  ifTierBreakHappens: {
    recommendedAction: 'trade_back' | 'hold' | 'take_best_value'
    targetRange?: string
    reason: string
  }
}

export interface TradePickGuidance {
  shouldTradeUp: boolean
  shouldTradeBack: boolean
  shouldHold: boolean
  preferredAction: 'trade_up' | 'trade_back' | 'hold' | 'hold_unless_tier_break'
  tradeUpThreshold?: { maxFutureCost: string; condition: string }
  tradeBackTargets: Array<{ targetPickRange: string; minimumReturn: string; reason: string }>
}

export interface ScarcitySignals {
  positionRuns: Array<{ position: string; runRisk: number; reason: string }>
  tierPressure: Array<{ position: string; currentTierDropRisk: number }>
}

export interface SeasonOutlookIfPickMade {
  withBestPickNow: {
    projectedTeamGradeAfterPick: number
    playoffOddsChange: number
    futureValueChange: number
  }
}

export interface DraftWarRoomData {
  draftContext: DraftContext
  teamStrategyContext: TeamStrategyContext
  bestPickNow: DraftRecommendation
  alternateRecommendations: DraftRecommendationGroup
  playersLikelyTakenBeforeYou: PredictedPickAhead[]
  availabilityMatrix: AvailabilityMatrixItem[]
  pivotPlan: PivotPlan
  tradePickGuidance: TradePickGuidance
  scarcitySignals: ScarcitySignals
  seasonOutlookIfPickMade?: SeasonOutlookIfPickMade
  coachingSummary: CoachingSummary
}

export interface AssetMapBucket {
  assetType: AssetType
  assetId: string
  name: string
  reason: string
}

export interface AssetMap {
  untouchables: AssetMapBucket[]
  preferredTradeChips: AssetMapBucket[]
  holdUntilValueRecovers: AssetMapBucket[]
}

export interface RecommendedTradeTarget extends MarketTarget {
  estimatedPriceTier: string
}

export interface RecommendedTargets {
  winNowTargets: RecommendedTradeTarget[]
  retoolTargets: RecommendedTradeTarget[]
  buyLowTargets: RecommendedTradeTarget[]
}

export interface OfferTemplateSide {
  send: TradeAsset[]
  receive: TradeAsset[]
  fairnessScore: number
}

export interface OfferTemplateBlock {
  targetPlayerId: string
  targetName: string
  offerTemplates: {
    fairOffer: OfferTemplateSide
    aggressiveOpener: OfferTemplateSide
    fallbackCounter: OfferTemplateSide
    doNotExceed: { maxOfferRule: string }
  }
  whyOtherManagerMightAccept: string[]
}

export interface TradeOfferReview {
  tradeId: string
  status: 'pending' | 'sent_pending' | 'accepted' | 'rejected' | 'expired' | 'countered'
  fromTeamId?: string
  toTeamId?: string
  receivedAt?: string
  sentAt?: string
  lastUpdatedAt?: string
  send: TradeAsset[]
  receive: TradeAsset[]
  fairnessScore: number
  teamFitScore: number
  recommendation: 'accept' | 'reject' | 'counter' | 'leave_open' | 'decline'
  reason: string
}

export interface RejectedOrExpiredTradeReview {
  tradeId: string
  status: 'rejected' | 'expired'
  lastUpdatedAt: string
  reopenRecommendation: 'revisit_with_counter' | 'let_die' | 'send_new_offer'
  reason: string
  newCounterSuggestion?: { send: TradeAsset[]; receive: TradeAsset[] }
}

export interface RenegotiationItem {
  tradeId: string
  action: 'reopen' | 'decline' | 'counter' | 'hold'
  priority: number
  reason: string
}

export interface MarketSignals {
  playersToMoveNow: Array<{ playerId: string; name: string; reason: string }>
  playersToTargetNow: Array<{ playerId: string; name: string; reason: string }>
}

export interface TradeCommandCenterData {
  teamContext: {
    leagueId: string
    userTeamId: string
    teamDirection: TeamDirectionLabel
    riskProfile: 'safe' | 'balanced' | 'aggressive'
    tradeAggressiveness: 'low' | 'moderate' | 'high'
  }
  assetMap: AssetMap
  recommendedTargets: RecommendedTargets
  offerBuilder: OfferTemplateBlock[]
  incomingOffers: TradeOfferReview[]
  sentOffers: TradeOfferReview[]
  expiredOrRejectedOffers: RejectedOrExpiredTradeReview[]
  renegotiationBoard: RenegotiationItem[]
  marketSignals: MarketSignals
  coachingSummary: CoachingSummary
}

export interface TradeReviewScoreBreakdown {
  rawValueScore: number
  teamFitScore: number
  shortTermScore: number
  longTermScore: number
  riskAdjustedScore: number
  playoffImpactScore?: number
  packagePremiumAdjustment: number
}

export interface TradeReviewDecision {
  recommendation: 'accept' | 'reject' | 'counter' | 'reopen' | 'hold'
  fairnessScore: number
  confidence: number
  scoreBreakdown: TradeReviewScoreBreakdown
  reasonSummary: string[]
  counterSuggestions?: OfferTemplateSide[]
  renegotiationAdvice?: {
    shouldReopen: boolean
    whyNow: string
    preferredAdjustments: string[]
  }
  commissionerAlert?: {
    required: boolean
    severity: 'low' | 'medium' | 'high'
    reasonCodes: string[]
  }
}

export interface TradeReviewData {
  tradeId?: string
  review: TradeReviewDecision
}

export interface TeamDirectionRefreshData {
  teamDirection: TeamDirection
  teamSnapshot: TeamSnapshot
  needsByPriority: NeedPriorityItem[]
  actionPlan?: ActionPlanItem[]
  coachingSummary: CoachingSummary
}

export interface MarketRefreshData {
  playerWatchlists?: OffseasonWatchlists
  marketOpportunities?: MarketOpportunities
  marketSignals?: MarketSignals
  alerts?: DashboardAlert[]
  coachingSummary: CoachingSummary
}

export interface GetOffseasonDashboardQuery {
  leagueId: string
  userId: string
  includeLiveNews?: boolean
  includeMarketBoard?: boolean
  includeWatchlists?: boolean
}

export interface GetDraftWarRoomQuery {
  leagueId: string
  userId: string
  draftId: string
  overallPick: number
  round: number
  includeSimulation?: boolean
  includePredictedPicksAhead?: boolean
}

export interface GetTradeCommandCenterQuery {
  leagueId: string
  userId: string
  includeIncomingOffers?: boolean
  includeSentOffers?: boolean
  includeExpiredOffers?: boolean
  includeOfferBuilder?: boolean
}

export interface PostTradeReviewBody {
  leagueId: string
  userId: string
  tradeId?: string
  mode: 'incoming' | 'sent' | 'manual'
  currentTeamDirection?: TeamDirectionLabel
  includeCounterSuggestions?: boolean
  includeRenegotiationAdvice?: boolean
  trade?: {
    fromTeamId: string
    toTeamId: string
    send: TradeAsset[]
    receive: TradeAsset[]
  }
}

export interface PostDraftRecommendationRefreshBody {
  leagueId: string
  userId: string
  draftId: string
  overallPick: number
  round: number
  recentSelections: Array<{ teamId: string; playerId: string; overallPick: number }>
  includeSimulation?: boolean
  forceLiveNewsRefresh?: boolean
}

export interface PostTeamDirectionRefreshBody {
  leagueId: string
  userId: string
  trigger: 'manual' | 'trade_completed' | 'draft_pick_made' | 'injury_update' | 'market_shift' | 'roster_change'
  includeActionPlan?: boolean
  includeMarketTargets?: boolean
}

export interface PostMarketRefreshBody {
  leagueId: string
  userId: string
  scope: 'full' | 'watchlists' | 'trade_targets' | 'waivers'
  forceLiveNewsRefresh?: boolean
}
