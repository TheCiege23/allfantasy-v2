/**
 * GET: Full draft variant settings (config + UI + session variant + orphan status for commissioner).
 * PATCH: Update draft variant settings (commissioner only). Body: config?, draftUISettings?, sessionVariant?
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { assertCommissioner, isCommissioner } from '@/lib/commissioner/permissions'
import { prisma } from '@/lib/prisma'
import { getDraftVariantSettings, updateDraftVariantSettings } from '@/lib/draft-defaults/DraftVariantSettingsHub'
import { validateLeagueSettings } from '@/lib/league-settings-validation'
import { getDraftOrderModeAndLotteryConfig, setDraftOrderModeAndLotteryConfig } from '@/lib/draft-lottery/lotteryConfigStorage'
import { getOrphanRosterIdsForLeague } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { getRecentAuditEntries } from '@/lib/orphan-ai-manager/OrphanAIManagerService'
import { getProviderStatus } from '@/lib/provider-config'
import { notifyOrphanAiManagerAssigned } from '@/lib/draft-notifications'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const [variant, commissioner, league, idpRosterSummary, orderModeAndLottery] = await Promise.all([
      getDraftVariantSettings(leagueId),
      isCommissioner(leagueId, userId),
      prisma.league.findUnique({
        where: { id: leagueId },
        select: { sport: true, leagueVariant: true },
      }),
      (async () => {
        const { isIdpLeague, getRosterDefaultsForIdpLeague, getIdpLeagueConfig } = await import('@/lib/idp')
        if (!(await isIdpLeague(leagueId))) return null
        const [def, idpConfig] = await Promise.all([
          getRosterDefaultsForIdpLeague(leagueId),
          getIdpLeagueConfig(leagueId),
        ])
        if (!def) return null
        return {
          starterSlots: def.starter_slots,
          benchSlots: def.bench_slots,
          scoringPreset: idpConfig?.scoringPreset ?? 'balanced',
          positionMode: idpConfig?.positionMode ?? 'standard',
        }
      })(),
      getDraftOrderModeAndLotteryConfig(leagueId),
    ])
    const providerStatus = getProviderStatus()

    let orphanStatus: { orphanRosterIds: string[]; recentActions: Array<{ action: string; createdAt: string; reason: string | null }> } | null = null
    if (commissioner) {
      const [orphanRosterIds, recentLogs] = await Promise.all([
        getOrphanRosterIdsForLeague(leagueId),
        getRecentAuditEntries(leagueId, { limit: 10 }),
      ])
      orphanStatus = {
        orphanRosterIds,
        recentActions: recentLogs.map((l) => ({
          rosterId: l.rosterId,
          action: l.action,
          createdAt: l.createdAt.toISOString(),
          reason: l.reason,
        })),
      }
    }

    const res = NextResponse.json({
      config: variant.config ? { ...variant.config, leagueSize: variant.leagueSize } : null,
      draftUISettings: variant.draftUISettings,
      isCommissioner: !!commissioner,
      variantSettings: variant,
      sessionVariant: variant.sessionVariant ?? null,
      sessionPreDraft: variant.sessionPreDraft ?? false,
      orphanStatus,
      orphanAiProviderAvailable: providerStatus.anyAi,
      orphanDrafterEffectiveMode:
        variant.draftUISettings.orphanDrafterMode === 'ai' && !providerStatus.anyAi
          ? 'cpu'
          : variant.draftUISettings.orphanDrafterMode,
      formatType: league?.sport === 'NFL' && (league?.leagueVariant === 'IDP' || league?.leagueVariant === 'DYNASTY_IDP' || league?.leagueVariant === 'idp') ? 'IDP' : undefined,
      idpRosterSummary: idpRosterSummary ? { starterSlots: idpRosterSummary.starterSlots, benchSlots: idpRosterSummary.benchSlots } : undefined,
      idpScoringPreset: (idpRosterSummary as { scoringPreset?: string } | null)?.scoringPreset ?? undefined,
      idpPositionMode: (idpRosterSummary as { positionMode?: string } | null)?.positionMode ?? undefined,
      draftOrderMode: orderModeAndLottery?.draftOrderMode ?? 'randomize',
      lotteryConfig: orderModeAndLottery?.lotteryConfig ?? null,
      lotteryLastSeed: orderModeAndLottery?.lotteryLastSeed ?? null,
      lotteryLastRunAt: orderModeAndLottery?.lotteryLastRunAt ?? null,
    })
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return res
  } catch (e) {
    console.error('[draft/settings GET]', e)
    return NextResponse.json({ error: 'Failed to load draft settings' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const configPatch: Record<string, unknown> = {}
  if (['snake', 'linear', 'auction'].includes(body.draft_type)) configPatch.draft_type = body.draft_type
  if (typeof body.rounds === 'number') configPatch.rounds = body.rounds
  if (body.timer_seconds !== undefined) configPatch.timer_seconds = body.timer_seconds
  if (body.slow_timer_seconds !== undefined) configPatch.slow_timer_seconds = body.slow_timer_seconds
  if (typeof body.pick_order_rules === 'string') configPatch.pick_order_rules = body.pick_order_rules
  if (typeof body.snake_or_linear === 'string') configPatch.snake_or_linear = body.snake_or_linear
  // 3RR applies only to snake; ignore or clear when draft is linear/auction
  if (typeof body.third_round_reversal === 'boolean') {
    const draftType = body.draft_type ?? configPatch.draft_type
    const snakeOrLinear = body.snake_or_linear ?? body.pick_order_rules ?? configPatch.snake_or_linear ?? configPatch.pick_order_rules
    const isSnake = draftType !== 'auction' && (snakeOrLinear === 'snake' || snakeOrLinear == null)
    configPatch.third_round_reversal = isSnake ? body.third_round_reversal : false
  }
  if (typeof body.autopick_behavior === 'string') configPatch.autopick_behavior = body.autopick_behavior
  if (body.queue_size_limit !== undefined) configPatch.queue_size_limit = body.queue_size_limit
  if (typeof body.pre_draft_ranking_source === 'string') configPatch.pre_draft_ranking_source = body.pre_draft_ranking_source
  if (typeof body.roster_fill_order === 'string') configPatch.roster_fill_order = body.roster_fill_order
  if (typeof body.position_filter_behavior === 'string') configPatch.position_filter_behavior = body.position_filter_behavior

  const uiPatch: Record<string, unknown> = {}
  if (typeof body.tradedPickColorModeEnabled === 'boolean') uiPatch.tradedPickColorModeEnabled = body.tradedPickColorModeEnabled
  if (typeof body.tradedPickOwnerNameRedEnabled === 'boolean') uiPatch.tradedPickOwnerNameRedEnabled = body.tradedPickOwnerNameRedEnabled
  if (typeof body.aiAdpEnabled === 'boolean') uiPatch.aiAdpEnabled = body.aiAdpEnabled
  if (typeof body.aiQueueReorderEnabled === 'boolean') uiPatch.aiQueueReorderEnabled = body.aiQueueReorderEnabled
  if (typeof body.orphanTeamAiManagerEnabled === 'boolean') uiPatch.orphanTeamAiManagerEnabled = body.orphanTeamAiManagerEnabled
  if (body.orphanDrafterMode === 'cpu' || body.orphanDrafterMode === 'ai') uiPatch.orphanDrafterMode = body.orphanDrafterMode
  if (typeof body.liveDraftChatSyncEnabled === 'boolean') uiPatch.liveDraftChatSyncEnabled = body.liveDraftChatSyncEnabled
  if (typeof body.draftOrderRandomizationEnabled === 'boolean') uiPatch.draftOrderRandomizationEnabled = body.draftOrderRandomizationEnabled
  if (typeof body.pickTradeEnabled === 'boolean') uiPatch.pickTradeEnabled = body.pickTradeEnabled
  if (typeof body.auctionAutoNominationEnabled === 'boolean') uiPatch.auctionAutoNominationEnabled = body.auctionAutoNominationEnabled
  if (typeof body.importEnabled === 'boolean') uiPatch.importEnabled = body.importEnabled
  if (typeof body.autoPickEnabled === 'boolean') uiPatch.autoPickEnabled = body.autoPickEnabled
  if (['per_pick', 'soft_pause', 'overnight_pause', 'none'].includes(body.timerMode)) uiPatch.timerMode = body.timerMode
  if (typeof body.commissionerForceAutoPickEnabled === 'boolean') uiPatch.commissionerForceAutoPickEnabled = body.commissionerForceAutoPickEnabled
  if (typeof body.commissionerPauseControlsEnabled === 'boolean') uiPatch.commissionerPauseControlsEnabled = body.commissionerPauseControlsEnabled
  if (body.slowDraftPauseWindow !== undefined) {
    const w = body.slowDraftPauseWindow
    if (w == null || (typeof w === 'object' && typeof w.start === 'string' && typeof w.end === 'string' && typeof w.timezone === 'string')) {
      uiPatch.slowDraftPauseWindow = w
    }
  }

  const sessionVariantPatch: Record<string, unknown> = {}
  if (body.sessionVariant && typeof body.sessionVariant === 'object') {
    const sv = body.sessionVariant
    if (sv.keeperConfig !== undefined) sessionVariantPatch.keeperConfig = sv.keeperConfig
    if (sv.devyConfig !== undefined) sessionVariantPatch.devyConfig = sv.devyConfig
    if (sv.c2cConfig !== undefined) sessionVariantPatch.c2cConfig = sv.c2cConfig
    if (sv.auctionBudgetPerTeam !== undefined) sessionVariantPatch.auctionBudgetPerTeam = sv.auctionBudgetPerTeam
  }

  let orderModePatch: { draftOrderMode?: string; lotteryConfig?: Record<string, unknown> } | null = null
  if (['randomize', 'manual', 'weighted_lottery'].includes(body.draft_order_mode)) {
    orderModePatch = { draftOrderMode: body.draft_order_mode }
  }
  if (body.lotteryConfig && typeof body.lotteryConfig === 'object') {
    orderModePatch = orderModePatch ?? {}
    orderModePatch.lotteryConfig = body.lotteryConfig as Record<string, unknown>
  }

  const hasConfig = Object.keys(configPatch).length > 0
  const hasUI = Object.keys(uiPatch).length > 0
  const hasSessionVariant = Object.keys(sessionVariantPatch).length > 0
  const hasOrderMode = orderModePatch !== null
  const orphanManagerSettingTouched =
    Object.prototype.hasOwnProperty.call(uiPatch, 'orphanTeamAiManagerEnabled') ||
    Object.prototype.hasOwnProperty.call(uiPatch, 'orphanDrafterMode')

  if (!hasConfig && !hasUI && !hasSessionVariant && !hasOrderMode) {
    const current = await getDraftVariantSettings(leagueId)
    return NextResponse.json({
      ok: true,
      config: current.config ? { ...current.config, leagueSize: current.leagueSize } : null,
      draftUISettings: current.draftUISettings,
      variantSettings: current,
    })
  }

  const current = await getDraftVariantSettings(leagueId)
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const leagueSettings = (league?.settings ?? {}) as Record<string, unknown>
  const effectiveForValidation: Record<string, unknown> = {
    league_type: leagueSettings.league_type,
    league_variant: leagueSettings.league_variant ?? null,
    roster_mode: leagueSettings.roster_mode ?? null,
    draft_type: configPatch.draft_type ?? current.config?.draft_type ?? leagueSettings.draft_type,
    auction_budget_per_team: sessionVariantPatch.auctionBudgetPerTeam ?? current.sessionVariant?.auctionBudgetPerTeam ?? leagueSettings.auction_budget_per_team,
    devyConfig: sessionVariantPatch.devyConfig ?? current.sessionVariant?.devyConfig ?? leagueSettings.devyConfig,
    c2cConfig: sessionVariantPatch.c2cConfig ?? current.sessionVariant?.c2cConfig ?? leagueSettings.c2cConfig,
    devy_slots: leagueSettings.devy_slots ?? leagueSettings.devySlots ?? null,
    c2c_college_roster_size:
      leagueSettings.c2c_college_roster_size ??
      leagueSettings.c2cCollegeRosterSize ??
      null,
  }
  const validation = validateLeagueSettings(effectiveForValidation)
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errors[0] ?? 'Invalid draft configuration', errors: validation.errors },
      { status: 400 }
    )
  }

  try {
    if (hasOrderMode && orderModePatch) {
      await setDraftOrderModeAndLotteryConfig(leagueId, {
        ...(orderModePatch.draftOrderMode && { draftOrderMode: orderModePatch.draftOrderMode as 'randomize' | 'manual' | 'weighted_lottery' }),
        ...(orderModePatch.lotteryConfig && { lotteryConfig: orderModePatch.lotteryConfig as any }),
      })
    }
    const updated = await updateDraftVariantSettings(leagueId, {
      ...(hasConfig ? { config: configPatch as any } : {}),
      ...(hasUI ? { draftUISettings: uiPatch as any } : {}),
      ...(hasSessionVariant ? { sessionVariant: sessionVariantPatch as any } : {}),
    })
    if (orphanManagerSettingTouched) {
      const orphanModeChanged = current.draftUISettings.orphanDrafterMode !== updated.draftUISettings.orphanDrafterMode
      const orphanEnabledChanged =
        current.draftUISettings.orphanTeamAiManagerEnabled !== updated.draftUISettings.orphanTeamAiManagerEnabled
      if (orphanModeChanged || orphanEnabledChanged) {
        void notifyOrphanAiManagerAssigned(leagueId).catch(() => {})
      }
    }
    const orderModeAndLottery = await getDraftOrderModeAndLotteryConfig(leagueId)
    return NextResponse.json({
      ok: true,
      config: updated.config ? { ...updated.config, leagueSize: updated.leagueSize } : null,
      draftUISettings: updated.draftUISettings,
      variantSettings: updated,
      draftOrderMode: orderModeAndLottery.draftOrderMode,
      lotteryConfig: orderModeAndLottery.lotteryConfig,
      lotteryLastSeed: orderModeAndLottery.lotteryLastSeed,
      lotteryLastRunAt: orderModeAndLottery.lotteryLastRunAt,
    })
  } catch (e) {
    console.error('[draft/settings PATCH]', e)
    return NextResponse.json({ error: (e as Error).message ?? 'Failed to update settings' }, { status: 500 })
  }
}
