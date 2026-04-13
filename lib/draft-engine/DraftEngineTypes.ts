/**
 * DraftEngineTypes.ts
 * Canonical types for unified draft system across all sports and league types
 */

import { SupportedLeagueSport, LeagueType } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';

// ============================================================
// DRAFT TYPES & MODES
// ============================================================

export type DraftType =
  | 'snake'
  | 'linear'
  | 'auction'
  | 'salary-cap'
  | 'third-round-reversal'
  | 'keeper'
  | 'dynasty-startup'
  | 'dynasty-rookie'
  | 'guillotine'
  | 'survivor'
  | 'zombie'
  | 'tournament'
  | 'big-brother';

export type OrderType = 'randomized' | 'manual' | 'weighted-lottery' | 'previous-season' | 'trade-deadline' | 'ai-generated';

export type DraftMode = 'live' | 'slow' | 'email' | 'offline';

export type AIStrategy = 'balanced' | 'value' | 'upside' | 'positional-need' | 'stack' | 'league-winning';

export type AIPersonality = 'conservative' | 'moderate' | 'aggressive' | 'elite';

export type DraftStatus = 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';

// ============================================================
// DRAFT CONFIGURATION
// ============================================================

export interface DraftPoolSettings {
  includeRookies: boolean;
  includeDevy: boolean;
  includeFreeAgents: boolean;
  customPoolIds?: string[];
  excludedPlayerIds?: string[];
  positionalFlexibility?: Record<string, string[]>; // position -> eligible slots
}

export interface DraftTimerConfig {
  enabled: boolean;
  secondsPerPick: number;
  autoBumpSeconds?: number; // additional time before auto-pick
  autoBumpCount?: number; // number of times auto-bump available
}

export interface AIAssistantConfig {
  enabled: boolean;
  autoPickOnTimeExpired: boolean;
  strategy: AIStrategy;
  personality: AIPersonality;
  recommendationMode: 'top5' | 'top10' | 'contextual';
  considerTeamNeeds: boolean;
  considerLeagueContext: boolean;
  draftWithHistory: boolean; // consider past ADPs
}

export interface DraftOrderEntry {
  position: number; // 1-12 or 1-N
  teamId: string;
  originalSeed?: number;
  weight?: number; // for weighted lottery
}

export interface DraftRound {
  roundNumber: number;
  totalPicks: number;
  startPosition: number;
  roundType: 'standard' | 'devy' | 'taxi' | 'rights';
  lockTime?: Date; // optional lock for keeper draft
}

export interface UnifiedDraftConfig {
  // Immutable metadata
  leagueId: string;
  sport: SupportedLeagueSport;
  leagueType: LeagueType;
  createdAt: Date;

  // Draft mechanics
  type: DraftType;
  orderType: OrderType;
  order: DraftOrderEntry[];
  rounds: DraftRound[];
  totalPicks: number;
  totalTeams: number;

  // Timing
  timer: DraftTimerConfig;
  draftStartTime?: Date;
  draftEndTime?: Date;
  scheduledStartTime?: Date;

  // Features
  dualTrack: boolean; // C2C leagues
  dualTrackConfig?: {
    sport1: SupportedLeagueSport;
    sport1Draft?: UnifiedDraftConfig;
    sport2: SupportedLeagueSport;
    sport2Draft?: UnifiedDraftConfig;
  };

  // AI
  aiAssistant: AIAssistantConfig;
  aiDraftActive?: boolean;

  // Mode
  mode: DraftMode;
  offlinePicksFile?: string;

  // Pool settings
  poolSettings: DraftPoolSettings;

  // Commissioner controls
  allowPickUndos: boolean;
  allowSkipTeam: boolean;
  allowForcePick: boolean;
  allowRestart: boolean;

  // Premium flags
  premiumAIEnabled?: boolean;
  premiumAnalyticsEnabled?: boolean;

  // Current state
  status: DraftStatus;
  state: DraftExecutionState;

  // Audit
  audit: DraftAudit;
}

// ============================================================
// DRAFT EXECUTION STATE
// ============================================================

export interface DraftPick {
  pickNumber: number;
  round: number;
  position: number; // within round
  teamId: string;
  playerId: string;
  playerName: string;
  playerPosition: string;
  slot: string; // roster slot assigned
  timestamp: Date;
  durationSeconds: number; // how long team took
  aiAssisted: boolean;
  completedBy: 'human' | 'ai' | 'auto';
}

export interface DraftExecutionState {
  currentPick: number; // 1-indexed
  currentRound: number;
  currentPosition: number; // position within round
  currentTeamId: string;
  picks: DraftPick[];
  completed: boolean;
  completedPickCount: number;
  startedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  predictedEndTime?: Date;
}

export interface DraftTimerState {
  isRunning: boolean;
  secondsRemaining: number;
  secondsElapsed: number;
  bumpCount: number;
}

// ============================================================
// DRAFT AUDIT
// ============================================================

export interface DraftAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: 'created' | 'started' | 'paused' | 'resumed' | 'pick' | 'undo' | 'reset' | 'override';
  pickNumber?: number;
  details?: Record<string, any>;
}

export interface DraftAudit {
  version: number;
  createdAt: Date;
  lastModifiedAt: Date;
  entries: DraftAuditEntry[];
}

// ============================================================
// VALIDATION & RECOMMENDATIONS
// ============================================================

export interface DraftValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canStart: boolean;
}

export interface AIRecommendation {
  playerId: string;
  playerName: string;
  playerPosition: string;
  rank: number;
  score: number; // 0-100
  rationale: string;
  considerationFactors: {
    positionNeeds: string[];
    valueEstimate: string;
    upsideRating: string;
    tieredRanking: string;
  };
}

export interface DraftBoardSnapshot {
  roundNumber: number;
  picksInRound: number;
  playersLeft: number;
  topRecommendations: AIRecommendation[];
  teamRosters: Record<string, { slotsFilled: Record<string, number>; slotsNeeded: Record<string, number> }>;
}

// ============================================================
// PERMISSIONS
// ============================================================

export interface DraftPermissions {
  canViewDraft: boolean;
  canMakePicks: boolean;
  canEditSettings: boolean; // commissioner only
  canStartDraft: boolean; // commissioner only
  canPauseDraft: boolean; // commissioner only
  canResetDraft: boolean; // commissioner only
  canUndoPick: boolean; // commissioner only
  canAccessAI: boolean; // depends on premium
}

// ============================================================
// SERVICE INTERFACES
// ============================================================

export interface ISportDraftService {
  getDefaultDraftConfig(leagueType: LeagueType): UnifiedDraftConfig;
  validateDraftConfig(config: UnifiedDraftConfig): DraftValidationResult;
  getRoundsForLeagueType(rosterSlots: number): DraftRound[];
  getNormalizedOrder(teams: number, orderType: OrderType): DraftOrderEntry[];
  recommendNextPick(
    state: DraftExecutionState,
    config: UnifiedDraftConfig,
    strategy: AIStrategy,
  ): AIRecommendation;
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface GetDraftConfigResponse {
  leagueId: string;
  config: UnifiedDraftConfig;
  canEdit: boolean;
  canStart: boolean;
  userRole: string;
  validationStatus: DraftValidationResult;
  subscriptionStatus: {
    isPremium: boolean;
    expiresAt?: Date;
  };
}

export interface UpdateDraftConfigRequest {
  config: Partial<UnifiedDraftConfig>;
  validateOnly?: boolean;
}

export interface UpdateDraftConfigResponse {
  success: boolean;
  config?: UnifiedDraftConfig;
  validation?: DraftValidationResult;
  message?: string;
}

export interface ExecutePickRequest {
  teamId: string;
  playerId: string;
  slot?: string; // optional, system can assign
  userId: string;
}

export interface ExecutePickResponse {
  success: boolean;
  pick?: DraftPick;
  updatedState?: DraftExecutionState;
  nextTeamId?: string;
  error?: string;
}

export interface GetAIRecommendationRequest {
  strategy?: AIStrategy;
  considerContext?: boolean;
}

export interface GetAIRecommendationResponse {
  recommendations: AIRecommendation[];
  boardSnapshot: DraftBoardSnapshot;
}

export interface ResetDraftRequest {
  confirmationToken?: string;
  resetType: 'full' | 'current-round' | 'skip-pick';
  skipToPickNumber?: number;
}

export interface ResetDraftResponse {
  success: boolean;
  state?: DraftExecutionState;
  message?: string;
}
