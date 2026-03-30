/**
 * Unified Draft Variant Settings Hub.
 * Single source for all draft variants: live, mock, auction, slow, keeper, devy, C2C.
 * Settings enforcement is deterministic and centralized (League.settings + DraftSession when pre_draft).
 */

import { prisma } from '@/lib/prisma'
import { getDraftConfigForLeague } from './DraftRoomConfigResolver'
import type { DraftRoomConfig } from './DraftRoomConfigResolver'
import { getDraftUISettingsForLeague, updateDraftUISettings } from './DraftUISettingsResolver'
import type { DraftUISettings } from './DraftUISettingsResolver'

/** Keeper rules (from session when present). */
export interface KeeperVariantSettings {
  maxKeepers: number
  deadline?: string | null
  maxKeepersPerPosition?: Record<string, number>
}

/** Devy rules (from session when present). */
export interface DevyVariantSettings {
  enabled: boolean
  devyRounds: number[]
}

/** C2C rules (from session when present). */
export interface C2CVariantSettings {
  enabled: boolean
  collegeRounds: number[]
}

/** Auction rules (from session when present). */
export interface AuctionVariantSettings {
  budgetPerTeam: number
  minBid: number
  minBidIncrement: number
}

/** Variant-specific settings stored on DraftSession (pre_draft only). */
export interface SessionVariantSettings {
  keeperConfig?: KeeperVariantSettings | null
  devyConfig?: DevyVariantSettings | null
  c2cConfig?: C2CVariantSettings | null
  auctionBudgetPerTeam?: number | null
  auctionMinBid?: number | null
  auctionMinIncrement?: number | null
}

/** Full draft variant settings: config + UI + session variant (when session exists). */
export interface DraftVariantSettings {
  config: DraftRoomConfig | null
  draftUISettings: DraftUISettings
  leagueSize: number
  /** Present when draft session exists; variant-specific (keeper, devy, c2c, auction). */
  sessionVariant?: SessionVariantSettings | null
  /** True when session exists and status is pre_draft (variant fields editable). */
  sessionPreDraft?: boolean
}

const DEFAULT_AUCTION_BUDGET = 200
const DEFAULT_AUCTION_MIN_BID = 1
const DEFAULT_AUCTION_MIN_INCREMENT = 1

function sanitizeRoundList(input: unknown): number[] {
  if (!Array.isArray(input)) return []
  return Array.from(
    new Set(
      input
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.max(1, Math.min(50, Math.round(value))))
    )
  ).sort((a, b) => a - b)
}

function sanitizeKeeperPositionCaps(input: unknown): Record<string, number> | undefined {
  if (!input || typeof input !== 'object') return undefined
  const result: Record<string, number> = {}
  for (const [position, value] of Object.entries(input as Record<string, unknown>)) {
    const normalizedPosition = String(position || '').trim().toUpperCase()
    if (!normalizedPosition) continue
    const cap = Math.max(0, Math.min(50, Math.round(Number(value) || 0)))
    result[normalizedPosition] = cap
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Get full draft variant settings for the hub (config + UI + session variant).
 */
export async function getDraftVariantSettings(leagueId: string): Promise<DraftVariantSettings> {
  const [league, config, draftUISettings, session] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { leagueSize: true, settings: true },
    }),
    getDraftConfigForLeague(leagueId),
    getDraftUISettingsForLeague(leagueId),
    prisma.draftSession.findUnique({
      where: { leagueId },
      select: {
        status: true,
        draftType: true,
        keeperConfig: true,
        devyConfig: true,
        c2cConfig: true,
        auctionBudgetPerTeam: true,
      },
    }),
  ])

  const leagueSize = league?.leagueSize ?? 12
  let sessionVariant: SessionVariantSettings | null = null
  let sessionPreDraft = false

  if (session) {
    sessionPreDraft = session.status === 'pre_draft'
    const rawKeeper = session.keeperConfig as { maxKeepers?: number; deadline?: string | null; maxKeepersPerPosition?: Record<string, number> } | null
    const rawDevy = session.devyConfig as { enabled?: boolean; devyRounds?: number[] } | null
    const rawC2c = session.c2cConfig as { enabled?: boolean; collegeRounds?: number[] } | null
    sessionVariant = {
      keeperConfig: {
        maxKeepers: Math.max(0, Math.min(50, Math.round(Number(rawKeeper?.maxKeepers ?? 0) || 0))),
        deadline: rawKeeper?.deadline ?? null,
        maxKeepersPerPosition: sanitizeKeeperPositionCaps(rawKeeper?.maxKeepersPerPosition),
      },
      devyConfig: {
        enabled: Boolean(rawDevy?.enabled),
        devyRounds: sanitizeRoundList(rawDevy?.devyRounds),
      },
      c2cConfig: {
        enabled: Boolean(rawC2c?.enabled),
        collegeRounds: sanitizeRoundList(rawC2c?.collegeRounds),
      },
      auctionBudgetPerTeam: session.draftType === 'auction' ? (session.auctionBudgetPerTeam ?? DEFAULT_AUCTION_BUDGET) : null,
      auctionMinBid: session.draftType === 'auction' ? DEFAULT_AUCTION_MIN_BID : null,
      auctionMinIncrement: session.draftType === 'auction' ? DEFAULT_AUCTION_MIN_INCREMENT : null,
    }
  }

  return {
    config: config ?? null,
    draftUISettings,
    leagueSize,
    sessionVariant: sessionVariant ?? undefined,
    sessionPreDraft,
  }
}

/**
 * Update draft config (League.settings draft_* keys). Deterministic; commissioner-only elsewhere.
 */
export async function updateDraftConfigForLeague(
  leagueId: string,
  patch: Partial<Pick<DraftRoomConfig, 'draft_type' | 'rounds' | 'timer_seconds' | 'slow_timer_seconds' | 'pick_order_rules' | 'snake_or_linear' | 'third_round_reversal' | 'autopick_behavior' | 'queue_size_limit' | 'pre_draft_ranking_source' | 'roster_fill_order' | 'position_filter_behavior'>>
): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  if (!league) throw new Error('League not found')

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const next = { ...settings }

  if (patch.draft_type !== undefined) next.draft_type = patch.draft_type
  if (patch.rounds !== undefined) next.draft_rounds = Math.max(1, Math.min(50, Math.round(patch.rounds)))
  if (patch.timer_seconds !== undefined) next.draft_timer_seconds = patch.timer_seconds == null ? null : Math.max(0, Math.min(86400, Math.round(patch.timer_seconds)))
  if (patch.slow_timer_seconds !== undefined) next.draft_slow_timer_seconds = patch.slow_timer_seconds == null ? null : Math.max(300, Math.min(604800, Math.round(patch.slow_timer_seconds)))
  if (patch.pick_order_rules !== undefined) next.draft_pick_order_rules = patch.pick_order_rules
  if (patch.snake_or_linear !== undefined) next.draft_snake_or_linear = patch.snake_or_linear
  if (patch.third_round_reversal !== undefined) next.draft_third_round_reversal = patch.third_round_reversal
  if (patch.autopick_behavior !== undefined) next.draft_autopick_behavior = patch.autopick_behavior
  if (patch.queue_size_limit !== undefined) next.draft_queue_size_limit = patch.queue_size_limit
  if (patch.pre_draft_ranking_source !== undefined) next.draft_pre_draft_ranking_source = patch.pre_draft_ranking_source
  if (patch.roster_fill_order !== undefined) next.draft_roster_fill_order = patch.roster_fill_order
  if (patch.position_filter_behavior !== undefined) next.draft_position_filter_behavior = patch.position_filter_behavior

  await prisma.league.update({
    where: { id: leagueId },
    data: { settings: next as any, updatedAt: new Date() },
  })
}

/**
 * Update session variant (keeper, devy, c2c, auction). Only when session exists and status is pre_draft.
 */
export async function updateSessionVariant(
  leagueId: string,
  patch: Partial<SessionVariantSettings>
): Promise<void> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: { id: true, status: true, keeperConfig: true, devyConfig: true, c2cConfig: true, auctionBudgetPerTeam: true, draftType: true },
  })
  if (!session || session.status !== 'pre_draft') return

  const updatePayload: Record<string, unknown> = {
    version: { increment: 1 },
    updatedAt: new Date(),
  }

  if (patch.keeperConfig !== undefined) {
    const maxKeepers = Math.max(0, Math.min(50, Math.round(Number(patch.keeperConfig?.maxKeepers ?? 0) || 0)))
    updatePayload.keeperConfig = patch.keeperConfig && typeof patch.keeperConfig === 'object'
      ? {
          maxKeepers,
          deadline: patch.keeperConfig.deadline ?? null,
          maxKeepersPerPosition: sanitizeKeeperPositionCaps(patch.keeperConfig.maxKeepersPerPosition),
        }
      : { maxKeepers: 0 }
  }
  if (patch.devyConfig !== undefined) {
    updatePayload.devyConfig = patch.devyConfig && patch.devyConfig.enabled
      ? { enabled: true, devyRounds: sanitizeRoundList(patch.devyConfig.devyRounds) }
      : { enabled: false, devyRounds: [] }
  }
  if (patch.c2cConfig !== undefined) {
    updatePayload.c2cConfig = patch.c2cConfig && patch.c2cConfig.enabled
      ? { enabled: true, collegeRounds: sanitizeRoundList(patch.c2cConfig.collegeRounds) }
      : { enabled: false, collegeRounds: [] }
  }
  if (patch.auctionBudgetPerTeam !== undefined && session.draftType === 'auction') {
    updatePayload.auctionBudgetPerTeam = Math.max(1, Math.min(10000, Math.round(Number(patch.auctionBudgetPerTeam) || 0)))
  }

  await prisma.draftSession.update({
    where: { id: session.id },
    data: updatePayload as any,
  })
}

/**
 * Sync config (draft_type, rounds, timer, third_round_reversal) to existing pre_draft session so draft room reflects hub.
 */
async function syncConfigToSession(leagueId: string, config: Partial<DraftRoomConfig>): Promise<void> {
  const [session, uiSettings] = await Promise.all([
    prisma.draftSession.findUnique({
      where: { leagueId },
      select: { id: true, status: true },
    }),
    getDraftUISettingsForLeague(leagueId),
  ])
  if (!session || session.status !== 'pre_draft') return

  const data: Record<string, unknown> = { updatedAt: new Date() }
  if (config.draft_type !== undefined) data.draftType = config.draft_type
  if (config.rounds !== undefined) data.rounds = Math.max(1, Math.min(50, Math.round(config.rounds)))
  const prefersSlowTimer = uiSettings.timerMode === 'soft_pause' || uiSettings.timerMode === 'overnight_pause'
  if (config.timer_seconds !== undefined || config.slow_timer_seconds !== undefined) {
    const preferredTimerSeconds = prefersSlowTimer
      ? (config.slow_timer_seconds ?? config.timer_seconds)
      : config.timer_seconds
    if (preferredTimerSeconds !== undefined) {
      data.timerSeconds = preferredTimerSeconds == null ? null : Math.max(0, Math.min(86400, Math.round(preferredTimerSeconds)))
    }
  }
  if (config.third_round_reversal !== undefined) data.thirdRoundReversal = config.third_round_reversal
  if (Object.keys(data).length <= 1) return

  await prisma.draftSession.update({
    where: { id: session.id },
    data: data as any,
  })
}

/**
 * Update full draft variant settings (config + UI + session variant). Commissioner-only enforced by caller.
 */
export async function updateDraftVariantSettings(
  leagueId: string,
  patch: {
    config?: Partial<DraftRoomConfig>
    draftUISettings?: Partial<DraftUISettings>
    sessionVariant?: Partial<SessionVariantSettings>
  }
): Promise<DraftVariantSettings> {
  if (patch.config && Object.keys(patch.config).length > 0) {
    await updateDraftConfigForLeague(leagueId, patch.config)
    await syncConfigToSession(leagueId, patch.config)
  }
  if (patch.draftUISettings && Object.keys(patch.draftUISettings).length > 0) {
    await updateDraftUISettings(leagueId, patch.draftUISettings)
  }
  if (patch.sessionVariant && Object.keys(patch.sessionVariant).length > 0) {
    await updateSessionVariant(leagueId, patch.sessionVariant)
  }
  return getDraftVariantSettings(leagueId)
}
