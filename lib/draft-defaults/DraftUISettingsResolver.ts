/**
 * Draft room UI/behavior settings (commissioner-controlled).
 * Stored in League.settings under draft_* keys.
 */

import { prisma } from '@/lib/prisma'

export type TimerMode = 'per_pick' | 'soft_pause' | 'overnight_pause' | 'none'

/** Optional overnight pause window for slow drafts (e.g. no picks 10pm–8am league time). */
export interface SlowDraftPauseWindow {
  /** "22:00" = 10pm */
  start: string
  /** "08:00" = 8am (next day if overnight) */
  end: string
  /** IANA timezone, e.g. "America/New_York" */
  timezone: string
}

/** Commissioner choice for empty/orphan teams: CPU (rules-based, no API) or AI (optional API, fallback to CPU). */
export type OrphanDrafterMode = 'cpu' | 'ai'

export interface DraftUISettings {
  tradedPickColorModeEnabled: boolean
  tradedPickOwnerNameRedEnabled: boolean
  aiAdpEnabled: boolean
  aiQueueReorderEnabled: boolean
  orphanTeamAiManagerEnabled: boolean
  /** When orphan AI manager is on: 'cpu' = rules-based only; 'ai' = try AI then fallback to CPU. */
  orphanDrafterMode: OrphanDrafterMode
  liveDraftChatSyncEnabled: boolean
  autoPickEnabled: boolean
  timerMode: TimerMode
  commissionerForceAutoPickEnabled: boolean
  /** Allow commissioner pause/resume/reset timer controls in live draft room. */
  commissionerPauseControlsEnabled?: boolean
  /** Slow draft: pause window when timerMode is overnight_pause. */
  slowDraftPauseWindow?: SlowDraftPauseWindow | null
  /** Allow randomizing draft order (e.g. at start of draft). */
  draftOrderRandomizationEnabled: boolean
  /** Allow trading picks (during/after draft). */
  pickTradeEnabled: boolean
  /** Auction: when nominator doesn't act in time, system auto-nominates next player (deterministic). */
  auctionAutoNominationEnabled: boolean
  /** Draft import flow availability for commissioner tools. */
  importEnabled: boolean
}

const DRAFT_UI_DEFAULTS: DraftUISettings = {
  tradedPickColorModeEnabled: true,
  tradedPickOwnerNameRedEnabled: true,
  aiAdpEnabled: true,
  aiQueueReorderEnabled: true,
  orphanTeamAiManagerEnabled: false,
  orphanDrafterMode: 'cpu',
  liveDraftChatSyncEnabled: false,
  autoPickEnabled: false,
  timerMode: 'per_pick',
  commissionerForceAutoPickEnabled: false,
  commissionerPauseControlsEnabled: true,
  draftOrderRandomizationEnabled: false,
  pickTradeEnabled: true,
  auctionAutoNominationEnabled: false,
  importEnabled: true,
}

const SETTINGS_KEYS: Record<keyof DraftUISettings, string> = {
  tradedPickColorModeEnabled: 'draft_traded_pick_color_mode_enabled',
  tradedPickOwnerNameRedEnabled: 'draft_traded_pick_owner_name_red_enabled',
  aiAdpEnabled: 'draft_ai_adp_enabled',
  aiQueueReorderEnabled: 'draft_ai_queue_reorder_enabled',
  orphanTeamAiManagerEnabled: 'draft_orphan_team_ai_manager_enabled',
  orphanDrafterMode: 'draft_orphan_drafter_mode',
  liveDraftChatSyncEnabled: 'draft_live_chat_sync_enabled',
  autoPickEnabled: 'draft_auto_pick_enabled',
  timerMode: 'draft_timer_mode',
  commissionerForceAutoPickEnabled: 'draft_commissioner_force_autopick_enabled',
  commissionerPauseControlsEnabled: 'draft_commissioner_pause_controls_enabled',
  slowDraftPauseWindow: 'draft_slow_pause_window',
  draftOrderRandomizationEnabled: 'draft_order_randomization_enabled',
  pickTradeEnabled: 'draft_pick_trade_enabled',
  auctionAutoNominationEnabled: 'draft_auction_auto_nomination_enabled',
  importEnabled: 'draft_import_enabled',
}

function fromStorage(settings: Record<string, unknown>): DraftUISettings {
  const mode = settings[SETTINGS_KEYS.orphanDrafterMode] as OrphanDrafterMode | undefined
  return {
    tradedPickColorModeEnabled: settings[SETTINGS_KEYS.tradedPickColorModeEnabled] as boolean ?? DRAFT_UI_DEFAULTS.tradedPickColorModeEnabled,
    tradedPickOwnerNameRedEnabled: settings[SETTINGS_KEYS.tradedPickOwnerNameRedEnabled] as boolean ?? DRAFT_UI_DEFAULTS.tradedPickOwnerNameRedEnabled,
    aiAdpEnabled: settings[SETTINGS_KEYS.aiAdpEnabled] as boolean ?? DRAFT_UI_DEFAULTS.aiAdpEnabled,
    aiQueueReorderEnabled: settings[SETTINGS_KEYS.aiQueueReorderEnabled] as boolean ?? DRAFT_UI_DEFAULTS.aiQueueReorderEnabled,
    orphanTeamAiManagerEnabled: settings[SETTINGS_KEYS.orphanTeamAiManagerEnabled] as boolean ?? DRAFT_UI_DEFAULTS.orphanTeamAiManagerEnabled,
    orphanDrafterMode: (mode === 'cpu' || mode === 'ai' ? mode : DRAFT_UI_DEFAULTS.orphanDrafterMode),
    liveDraftChatSyncEnabled: settings[SETTINGS_KEYS.liveDraftChatSyncEnabled] as boolean ?? DRAFT_UI_DEFAULTS.liveDraftChatSyncEnabled,
    autoPickEnabled: settings[SETTINGS_KEYS.autoPickEnabled] as boolean ?? DRAFT_UI_DEFAULTS.autoPickEnabled,
    timerMode: (settings[SETTINGS_KEYS.timerMode] as TimerMode) ?? DRAFT_UI_DEFAULTS.timerMode,
    commissionerForceAutoPickEnabled: settings[SETTINGS_KEYS.commissionerForceAutoPickEnabled] as boolean ?? DRAFT_UI_DEFAULTS.commissionerForceAutoPickEnabled,
    commissionerPauseControlsEnabled: settings[SETTINGS_KEYS.commissionerPauseControlsEnabled] as boolean ?? DRAFT_UI_DEFAULTS.commissionerPauseControlsEnabled,
    slowDraftPauseWindow: (settings[SETTINGS_KEYS.slowDraftPauseWindow] as SlowDraftPauseWindow | null | undefined) ?? undefined,
    draftOrderRandomizationEnabled: settings[SETTINGS_KEYS.draftOrderRandomizationEnabled] as boolean ?? DRAFT_UI_DEFAULTS.draftOrderRandomizationEnabled,
    pickTradeEnabled: settings[SETTINGS_KEYS.pickTradeEnabled] as boolean ?? DRAFT_UI_DEFAULTS.pickTradeEnabled,
    auctionAutoNominationEnabled: settings[SETTINGS_KEYS.auctionAutoNominationEnabled] as boolean ?? DRAFT_UI_DEFAULTS.auctionAutoNominationEnabled,
    importEnabled: settings[SETTINGS_KEYS.importEnabled] as boolean ?? DRAFT_UI_DEFAULTS.importEnabled,
  }
}

/**
 * Get draft UI settings for a league (for draft room and settings panel).
 */
export async function getDraftUISettingsForLeague(leagueId: string): Promise<DraftUISettings> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const settings = (league?.settings as Record<string, unknown>) ?? {}
  return fromStorage(settings)
}

/**
 * Update draft UI settings (commissioner only). Merges into existing League.settings.
 */
export async function updateDraftUISettings(
  leagueId: string,
  patch: Partial<DraftUISettings>
): Promise<DraftUISettings> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  if (!league) throw new Error('League not found')

  const current = (league.settings as Record<string, unknown>) ?? {}
  const next = { ...current }

  if (patch.tradedPickColorModeEnabled !== undefined)
    next[SETTINGS_KEYS.tradedPickColorModeEnabled] = patch.tradedPickColorModeEnabled
  if (patch.tradedPickOwnerNameRedEnabled !== undefined)
    next[SETTINGS_KEYS.tradedPickOwnerNameRedEnabled] = patch.tradedPickOwnerNameRedEnabled
  if (patch.aiAdpEnabled !== undefined)
    next[SETTINGS_KEYS.aiAdpEnabled] = patch.aiAdpEnabled
  if (patch.aiQueueReorderEnabled !== undefined)
    next[SETTINGS_KEYS.aiQueueReorderEnabled] = patch.aiQueueReorderEnabled
  if (patch.orphanTeamAiManagerEnabled !== undefined)
    next[SETTINGS_KEYS.orphanTeamAiManagerEnabled] = patch.orphanTeamAiManagerEnabled
  if (patch.orphanDrafterMode !== undefined && (patch.orphanDrafterMode === 'cpu' || patch.orphanDrafterMode === 'ai'))
    next[SETTINGS_KEYS.orphanDrafterMode] = patch.orphanDrafterMode
  if (patch.liveDraftChatSyncEnabled !== undefined)
    next[SETTINGS_KEYS.liveDraftChatSyncEnabled] = patch.liveDraftChatSyncEnabled
  if (patch.autoPickEnabled !== undefined)
    next[SETTINGS_KEYS.autoPickEnabled] = patch.autoPickEnabled
  if (patch.timerMode !== undefined)
    next[SETTINGS_KEYS.timerMode] = patch.timerMode
  if (patch.commissionerForceAutoPickEnabled !== undefined)
    next[SETTINGS_KEYS.commissionerForceAutoPickEnabled] = patch.commissionerForceAutoPickEnabled
  if (patch.commissionerPauseControlsEnabled !== undefined)
    next[SETTINGS_KEYS.commissionerPauseControlsEnabled] = patch.commissionerPauseControlsEnabled
  if (patch.slowDraftPauseWindow !== undefined)
    next[SETTINGS_KEYS.slowDraftPauseWindow] = patch.slowDraftPauseWindow
  if (patch.draftOrderRandomizationEnabled !== undefined)
    next[SETTINGS_KEYS.draftOrderRandomizationEnabled] = patch.draftOrderRandomizationEnabled
  if (patch.pickTradeEnabled !== undefined)
    next[SETTINGS_KEYS.pickTradeEnabled] = patch.pickTradeEnabled
  if (patch.auctionAutoNominationEnabled !== undefined)
    next[SETTINGS_KEYS.auctionAutoNominationEnabled] = patch.auctionAutoNominationEnabled
  if (patch.importEnabled !== undefined)
    next[SETTINGS_KEYS.importEnabled] = patch.importEnabled

  await prisma.league.update({
    where: { id: leagueId },
    data: { settings: next as any, updatedAt: new Date() },
  })

  return fromStorage(next)
}
