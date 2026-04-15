import type { AIActionType } from '@/lib/chimmy-actions'

export type ChimmyAlertClass =
  | 'lineup'
  | 'waiver'
  | 'trade'
  | 'draft'
  | 'matchup'
  | 'team_roster'
  | 'commissioner'
  | 'story_engagement'
  | 'specialty'
  | 'admin_integrity'

export type ChimmyAlertSeverity = 'informational' | 'action_recommended' | 'urgent' | 'critical'

export type ChimmyAlertChannel =
  | 'in_app_banner'
  | 'dashboard_card'
  | 'notification_center'
  | 'floating_nudge'
  | 'critical_drawer'
  | 'page_inline'
  | 'commissioner_panel'
  | 'private_ai_chat'
  | 'league_chat_suggestion'
  | 'push_notification'
  | 'email'
  | 'sms'
  | 'mobile_push'

export type ChimmyAlertLifecycleEvent =
  | 'created'
  | 'shown'
  | 'clicked'
  | 'dismissed'
  | 'snoozed'
  | 'acted_on'
  | 'resolved'
  | 'expired'

export interface ChimmyAlertAction {
  label: string
  href?: string
  actionType?: AIActionType
  payload?: Record<string, unknown>
}

export interface ChimmyAlert {
  alertId: string
  dedupeKey: string
  class: ChimmyAlertClass
  type: string
  title: string
  message: string
  severity: ChimmyAlertSeverity
  confidenceScore: number
  urgencyScore: number
  urgencyDeadlineAt?: string | null
  channels: ChimmyAlertChannel[]
  primaryChannel: ChimmyAlertChannel
  dismissible: boolean
  snoozable: boolean
  repeatable: boolean
  repeatCooldownMinutes: number
  expiresAt?: string | null
  leagueId?: string | null
  teamId?: string | null
  sport?: string | null
  leagueType?: string | null
  roleScope: 'member' | 'commissioner' | 'admin'
  actions: ChimmyAlertAction[]
  metadata?: Record<string, unknown>
}

export interface ChimmyAlertSignalBundle {
  lineupIncomplete?: boolean
  lineupLockAt?: string | null
  highConfidenceStartSitSwing?: boolean
  highConfidenceWaiverAdd?: { playerName: string; confidence: number; faabPct?: number } | null
  tradeOfferPendingCount?: number
  tradeFairnessWarning?: boolean
  draftStartingSoon?: boolean
  onTheClock?: boolean
  queueEmpty?: boolean
  winProbabilityShiftPct?: number
  weatherRiskPlayerCount?: number
  irEligibleCount?: number
  benchRedundancyCount?: number
  goalieMinimumAtRisk?: boolean
  categoryImbalanceCritical?: boolean
  inactiveTeamCount?: number
  suspiciousTradeSignal?: boolean
  specialtyPhaseTransition?: { mode: string; phase: string; startsAt?: string | null } | null
  engagementStoryReady?: boolean
}

// ── Per-class and per-type fine controls ─────────────────────────────────────

export interface ChimmyAlertClassPref {
  muted?: boolean
  frequency?: 'normal' | 'reduced' | 'minimal'
}

export interface ChimmyAlertTypeOverride {
  muted?: boolean
  /** Multiplies the alert's repeatCooldownMinutes. 2 = half as often, 4 = quarterly. */
  cooldownMultiplier?: number
  channelOverride?: ChimmyAlertChannel[]
}

export interface ChimmyAlertLeaguePref {
  leagueId: string
  /** When true, all Chimmy alerts for this league are suppressed. */
  disabled?: boolean
  mutedClasses?: ChimmyAlertClass[]
}

export interface ChimmyAlertCommissionerPref {
  enabled: boolean
  receiveSuspiciousTradeAlerts?: boolean
  receiveOrphanTeamAlerts?: boolean
  receiveWeeklyRecapAlerts?: boolean
  receiveIntegrityAlerts?: boolean
}

export interface ChimmyAlertSnoozedEntry {
  dedupeKey: string
  /** Unix timestamp (ms) when the snooze expires. */
  snoozeUntil: number
}

// ── Main preferences bag ──────────────────────────────────────────────────────

export interface ChimmyAlertUserPreferences {
  // --- existing (keep backward compat) ---
  mutedClasses?: ChimmyAlertClass[]
  mutedTypes?: string[]
  quietHours?: { startHour: number; endHour: number; timezone?: string; allowCritical?: boolean }
  channelOverrides?: Partial<Record<ChimmyAlertSeverity, ChimmyAlertChannel[]>>
  sensitivity?: 'low' | 'normal' | 'high'

  // --- frequency & volume ---
  /** Global frequency multiplier applied to all alert cooldowns. */
  frequency?: 'normal' | 'reduced' | 'minimal'

  // --- per-class / per-type controls ---
  classPrefs?: Partial<Record<ChimmyAlertClass, ChimmyAlertClassPref>>
  typeOverrides?: Record<string, ChimmyAlertTypeOverride>

  // --- channel preferences ---
  channelPreferences?: {
    disablePush?: boolean
    disableEmail?: boolean
    disableSms?: boolean
  }

  // --- commissioner-specific ---
  commissionerPrefs?: ChimmyAlertCommissionerPref

  // --- per-league overrides ---
  leaguePrefs?: ChimmyAlertLeaguePref[]

  // --- active snoozes (keyed by dedupeKey) ---
  snoozedAlerts?: ChimmyAlertSnoozedEntry[]
}

export interface ChimmyAlertContext {
  userId: string
  role: 'member' | 'commissioner' | 'admin'
  sport: string
  leagueType: string
  leagueId?: string | null
  teamId?: string | null
  scoringConfig?: Record<string, unknown>
  rosterConfig?: Record<string, unknown>
  scheduleConfig?: Record<string, unknown>
  playoffConfig?: Record<string, unknown>
  draftConfig?: Record<string, unknown>
  teamState?: Record<string, unknown>
  leagueState?: Record<string, unknown>
  subscriptionState?: {
    hasPremium: boolean
    hasCommissioner: boolean
    hasAdmin: boolean
  }
  userPreferences?: ChimmyAlertUserPreferences
  signalBundle?: ChimmyAlertSignalBundle
  pageSurface?: string
  now?: Date
}

export interface ChimmyAlertCandidate {
  class: ChimmyAlertClass
  type: string
  title: string
  message: string
  confidenceScore: number
  urgencySignal: number
  urgencyDeadlineAt?: string | null
  dismissible?: boolean
  snoozable?: boolean
  repeatable?: boolean
  repeatCooldownMinutes?: number
  roleScope?: 'member' | 'commissioner' | 'admin'
  metadata?: Record<string, unknown>
}
