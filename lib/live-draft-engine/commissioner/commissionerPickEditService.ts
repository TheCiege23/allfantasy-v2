/**
 * Commissioner pick editor (Slice 1): paused draft only, audit log, session version bump.
 * Player presentation (playerId / playerImageUrl) uses resolveDraftPickPresentation like submitPick.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import { invalidateLeagueDraftCaches } from '@/lib/league/invalidateLeagueDraftCaches'
import { resolveDraftPickPresentation } from '@/lib/live-draft-engine/resolveDraftPickPresentation'
import { validateRosterFitForDraftPick } from '@/lib/live-draft-engine/RosterFitValidation'
import { validateSpecialtyDraftPools } from '@/lib/live-draft-engine/SpecialtyDraftPoolValidation'
import {
  validateC2CEligibilityAsync,
  validateDevyEligibilityAsync,
} from '@/lib/live-draft-engine/PickValidation'
import { getSlotInRoundForOverall } from '@/lib/live-draft-engine/DraftOrderService'
import { resolvePickOwner } from '@/lib/live-draft-engine/PickOwnershipResolver'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getManagerColorBySeed } from '@/lib/draft-room'
import type { DraftSessionSnapshot, SlotOrderEntry, TradedPickRecord } from '@/lib/live-draft-engine/types'
import { isDraftPickRowEmpty, PICK_EDITOR_EMPTY_POSITION } from '@/lib/live-draft-engine/draftPickEmpty'

export const COMMISSIONER_PICK_EDIT_ACTIONS = [
  'REMOVE_PLAYER_FROM_PICK',
  'REPLACE_PLAYER_ON_PICK',
  'ASSIGN_PLAYER_TO_PICK',
  'CHANGE_PICK_OWNER',
] as const

export type CommissionerPickEditAction = (typeof COMMISSIONER_PICK_EDIT_ACTIONS)[number]

export interface CommissionerPickEditParams {
  leagueId: string
  actorUserId: string
  action: CommissionerPickEditAction
  /** 1-based overall pick number. */
  overallPickNumber: number
  reason?: string | null
  force?: boolean
  playerName?: string | null
  position?: string | null
  team?: string | null
  byeWeek?: number | null
  playerId?: string | null
  playerImageUrl?: string | null
  /** CHANGE_PICK_OWNER (required) or ASSIGN_PLAYER_TO_PICK (optional explicit owner). */
  newRosterId?: string | null
}

export type CommissionerPickEditResult =
  | { ok: true; snapshot: DraftSessionSnapshot }
  | {
      ok: false
      status: number
      error: string
      code?: string
      warnings?: Array<{ message: string }>
    }

type PickRow = {
  id: string
  overall: number
  round: number
  slot: number
  rosterId: string
  displayName: string | null
  playerName: string
  position: string
  team: string | null
  byeWeek: number | null
  playerId: string | null
  playerImageUrl: string | null
  tradedPickMeta: Prisma.JsonValue | null
  originalRosterId: string | null
  assetType: string | null
  pickMetadata: Prisma.JsonValue | null
  source: string | null
}

function isPlayerAlreadyDrafted(
  picks: PickRow[],
  opts: { excludePickId?: string | null; playerId: string | null; playerName: string; position: string },
): boolean {
  const nameKey = opts.playerName.trim().toLowerCase()
  const isSkip = opts.position.trim().toUpperCase() === 'SKIP'
  if (isSkip) return false
  for (const p of picks) {
    if (opts.excludePickId && p.id === opts.excludePickId) continue
    if (isDraftPickRowEmpty(p)) continue
    if (opts.playerId && p.playerId && p.playerId === opts.playerId) return true
    if (p.playerName.trim().toLowerCase() === nameKey) return true
  }
  return false
}

function displayNameForRoster(slotOrder: SlotOrderEntry[], rosterId: string): string {
  const hit = slotOrder.find((e) => e.rosterId === rosterId)
  return hit?.displayName ?? rosterId
}

function buildTradedPickMetaForSnapshot(
  base: Record<string, unknown> | null,
  ui: { tradedPickOwnerNameRedEnabled: boolean; tradedPickColorModeEnabled: boolean },
  rosterId: string,
  displayName: string | null,
): Prisma.InputJsonValue | undefined {
  if (!base) return undefined
  const resolved = { ...base } as Record<string, unknown>
  if (ui.tradedPickOwnerNameRedEnabled) resolved.showNewOwnerInRed = true
  else resolved.showNewOwnerInRed = false
  if (ui.tradedPickColorModeEnabled) {
    const seed = String(resolved.newOwnerName ?? rosterId ?? displayName ?? 'manager')
    resolved.tintColor = String(resolved.tintColor ?? getManagerColorBySeed(seed).tintHex)
  } else {
    delete resolved.tintColor
  }
  return resolved as Prisma.InputJsonValue
}

async function runSpecialtyAndPoolValidation(params: {
  leagueId: string
  session: {
    draftModeLabel?: string | null
    dispersalPoolConfig?: unknown
    playerPool: string
    devyConfig?: unknown
    c2cConfig?: unknown
  }
  overall: number
  teamCount: number
  effectiveRosterId: string
  onClockRosterId: string
  playerName: string
  position: string
  playerId: string | null
  assetType: string
  pickMetadata: Record<string, unknown> | null | undefined
  /** Same minimal delegate shape as `validateDevyEligibilityAsync` / `validateC2CEligibilityAsync` in PickValidation. */
  tx: { devyPlayer: { findFirst: (args: any) => Promise<any> } }
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const roundForEligibility = Math.ceil(params.overall / params.teamCount) || 1
  const rawC2c = params.session.c2cConfig
  const c2cConfig =
    rawC2c && typeof rawC2c === 'object' && (rawC2c as { enabled?: boolean }).enabled
      ? {
          enabled: true,
          collegeRounds: Array.isArray((rawC2c as { collegeRounds?: unknown }).collegeRounds)
            ? ((rawC2c as { collegeRounds: number[] }).collegeRounds as number[])
            : [],
        }
      : null
  const rawDevy = params.session.devyConfig
  const devyConfig =
    rawDevy && typeof rawDevy === 'object' && (rawDevy as { enabled?: boolean }).enabled
      ? {
          enabled: true,
          devyRounds: Array.isArray((rawDevy as { devyRounds?: unknown }).devyRounds)
            ? ((rawDevy as { devyRounds: number[] }).devyRounds as number[])
            : [],
        }
      : null

  if (c2cConfig?.enabled) {
    const c2cValidation = await validateC2CEligibilityAsync(
      { currentRound: roundForEligibility, playerName: params.playerName, c2cConfig },
      params.tx,
    )
    if (!c2cValidation.valid) return { ok: false, error: c2cValidation.error ?? 'C2C ineligible' }
  } else if (devyConfig?.enabled) {
    const devyValidation = await validateDevyEligibilityAsync(
      {
        currentRound: roundForEligibility,
        playerName: params.playerName,
        position: params.position,
        source: 'commissioner',
        devyConfig,
      },
      params.tx,
    )
    if (!devyValidation.valid) return { ok: false, error: devyValidation.error ?? 'Devy ineligible' }
  }

  const specialtyPool = validateSpecialtyDraftPools({
    draftModeLabel: params.session.draftModeLabel,
    dispersalPoolConfig: params.session.dispersalPoolConfig,
    playerPool: params.session.playerPool ?? 'all',
    effectiveRosterId: params.effectiveRosterId,
    onClockRosterId: params.onClockRosterId,
    playerId: params.playerId,
    playerName: params.playerName,
    position: params.position,
    assetType: params.assetType as 'player' | 'rookie_pick' | 'devy_pick' | 'dispersal_asset' | 'pick_slot' | 'c2c_college',
    pickMetadata: params.pickMetadata ?? undefined,
    commissionerOverride: true,
  })
  if (!specialtyPool.valid) return { ok: false, error: specialtyPool.error ?? 'Specialty pool violation' }
  return { ok: true }
}

/**
 * Apply a commissioner pick edit while the draft is paused. Increments session version, writes audit row, invalidates draft caches.
 */
export async function commissionerPickEdit(params: CommissionerPickEditParams): Promise<CommissionerPickEditResult> {
  const { isLeagueRosterDraftReady } = await import('@/lib/league/league-roster-draft-gate')
  if (!(await isLeagueRosterDraftReady(params.leagueId))) {
    return {
      ok: false,
      status: 400,
      error: 'Roster configuration is incomplete.',
      code: 'ROSTER_CONFIGURATION_INCOMPLETE',
    }
  }

  if (!COMMISSIONER_PICK_EDIT_ACTIONS.includes(params.action as CommissionerPickEditAction)) {
    return { ok: false, status: 400, error: 'Invalid action' }
  }

  const uiSettings = await getDraftUISettingsForLeague(params.leagueId)

  const audit = await prisma.$transaction(async (tx) => {
    // NOTE: default Prisma interactive-tx timeout is 5s; this flow (session
    // load + validations + presentation resolver + pick write + audit + session
    // bump) can exceed that on cold Neon pools. Raise to 30s; real commits
    // complete in ~1–2s. Proper fix is to move read-only work (presentation
    // resolver, settings) outside the tx — tracked as a Slice 3.x follow-up.
    const session = await tx.draftSession.findUnique({
      where: { leagueId: params.leagueId },
      include: {
        picks: { orderBy: { overall: 'asc' } },
        league: { select: { id: true, sport: true } },
      },
    })

    if (!session) {
      throw Object.assign(new Error('Draft session not found'), { status: 404 })
    }
    if (session.status !== 'paused') {
      throw Object.assign(new Error('Draft must be paused to edit picks'), { status: 400 })
    }
    if (session.draftType === 'auction') {
      throw Object.assign(new Error('Commissioner pick edit is not supported for auction drafts'), { status: 400 })
    }

    const slotOrder = (session.slotOrder as unknown as SlotOrderEntry[]) ?? []
    const tradedPicks: TradedPickRecord[] = Array.isArray(session.tradedPicks)
      ? (session.tradedPicks as unknown as TradedPickRecord[])
      : []
    const teamCount = session.teamCount
    const picks = session.picks as unknown as PickRow[]
    const leagueSport = session.league?.sport ?? session.sportType ?? 'NFL'

    let tradedPicksOut: TradedPickRecord[] | null = null
    let auditRow: {
      overallPickNumber: number
      round: number
      oldRosterId: string | null
      newRosterId: string | null
      oldPlayerId: string | null
      oldPlayerName: string | null
      newPlayerId: string | null
      newPlayerName: string | null
      metadata: Prisma.InputJsonValue
    }

    const mergeMetadata = (extra: Record<string, unknown>): Prisma.InputJsonValue => {
      const o: Record<string, unknown> = { action: params.action, ...extra }
      if (params.force) o.forced = true
      for (const k of Object.keys(o)) {
        if (o[k] === undefined) delete o[k]
      }
      return o as Prisma.InputJsonValue
    }

    switch (params.action) {
      case 'REMOVE_PLAYER_FROM_PICK': {
        const pick = picks.find((p) => p.overall === params.overallPickNumber)
        if (!pick) {
          throw Object.assign(new Error('Pick not found'), { status: 404 })
        }
        if (isDraftPickRowEmpty(pick)) {
          throw Object.assign(new Error('This pick is already empty'), { status: 400 })
        }
        await tx.draftPick.update({
          where: { id: pick.id },
          data: {
            playerName: '',
            position: PICK_EDITOR_EMPTY_POSITION,
            team: null,
            byeWeek: null,
            playerId: null,
            playerImageUrl: null,
            pickMetadata: { pickEditorEmpty: true } as Prisma.InputJsonValue,
            assetType: 'pick_slot',
          },
        })
        auditRow = {
          overallPickNumber: pick.overall,
          round: pick.round,
          oldRosterId: pick.rosterId,
          newRosterId: pick.rosterId,
          oldPlayerId: pick.playerId,
          oldPlayerName: pick.playerName,
          newPlayerId: null,
          newPlayerName: null,
          metadata: mergeMetadata({ clearedInPlace: true, pickId: pick.id }),
        }
        break
      }
      case 'REPLACE_PLAYER_ON_PICK': {
        const pick = picks.find((p) => p.overall === params.overallPickNumber)
        if (!pick) {
          throw Object.assign(new Error('Pick not found'), { status: 404 })
        }
        if (isDraftPickRowEmpty(pick)) {
          throw Object.assign(
            new Error('This pick is empty — use ASSIGN_PLAYER_TO_PICK to add a player.'),
            { status: 400 },
          )
        }
        const playerName = String(params.playerName ?? '').trim()
        const position = String(params.position ?? '').trim()
        if (!playerName || !position) {
          throw Object.assign(new Error('playerName and position are required'), { status: 400 })
        }
        if (
          isPlayerAlreadyDrafted(picks, {
            excludePickId: pick.id,
            playerId: params.playerId ?? null,
            playerName,
            position,
          })
        ) {
          throw Object.assign(new Error('Player is already drafted in this session'), { status: 409 })
        }

        const others = picks
          .filter((p) => p.id !== pick.id && !isDraftPickRowEmpty(p))
          .map((p) => ({ rosterId: p.rosterId, position: p.position }))
        const rosterFit = await validateRosterFitForDraftPick({
          leagueId: params.leagueId,
          rosterId: pick.rosterId,
          existingPicks: others,
          newPickPosition: position,
        })
        if (!rosterFit.valid) {
          if (!params.force) {
            throw Object.assign(new Error(rosterFit.error ?? 'Roster eligibility failed'), {
              status: 409,
              code: 'ROSTER_ELIGIBILITY',
              warnings: [{ message: rosterFit.error ?? 'Roster eligibility failed' }],
            })
          }
        }

        const spec = await runSpecialtyAndPoolValidation({
          leagueId: params.leagueId,
          session: session as any,
          overall: pick.overall,
          teamCount,
          effectiveRosterId: pick.rosterId,
          onClockRosterId: pick.rosterId,
          playerName,
          position,
          playerId: params.playerId ?? null,
          assetType: pick.assetType ?? 'player',
          pickMetadata: pick.pickMetadata as Record<string, unknown> | null,
          tx,
        })
        if (!spec.ok) {
          throw Object.assign(new Error(spec.error), { status: 400 })
        }

        const presentation = await resolveDraftPickPresentation({
          leagueSport,
          playerName,
          position,
          team: params.team ?? pick.team,
          playerId: params.playerId ?? null,
          playerImageUrl: params.playerImageUrl ?? null,
        })

        await tx.draftPick.update({
          where: { id: pick.id },
          data: {
            playerName,
            position,
            team: params.team != null ? params.team : pick.team,
            byeWeek: params.byeWeek != null ? params.byeWeek : pick.byeWeek,
            playerId: presentation.playerId,
            playerImageUrl: presentation.playerImageUrl,
            sportType: session.sportType ?? undefined,
          },
        })

        auditRow = {
          overallPickNumber: pick.overall,
          round: pick.round,
          oldRosterId: pick.rosterId,
          newRosterId: pick.rosterId,
          oldPlayerId: pick.playerId,
          oldPlayerName: pick.playerName,
          newPlayerId: presentation.playerId,
          newPlayerName: playerName,
          metadata: mergeMetadata({
            rosterFitWarning: !rosterFit.valid ? rosterFit.error : undefined,
            eligibilityForced: params.force && !rosterFit.valid ? true : undefined,
          }),
        }
        break
      }
      case 'ASSIGN_PLAYER_TO_PICK': {
        const totalPicks = session.rounds * teamCount
        const overall = params.overallPickNumber
        if (overall < 1 || overall > totalPicks) {
          throw Object.assign(new Error('overallPickNumber is out of range for this draft'), { status: 400 })
        }
        const playerName = String(params.playerName ?? '').trim()
        const position = String(params.position ?? '').trim()
        if (!playerName || !position) {
          throw Object.assign(new Error('playerName and position are required'), { status: 400 })
        }
        if (isPlayerAlreadyDrafted(picks, { playerId: params.playerId ?? null, playerName, position })) {
          throw Object.assign(new Error('Player is already drafted in this session'), { status: 409 })
        }

        const existing = picks.find((p) => p.overall === overall)
        if (existing && !isDraftPickRowEmpty(existing)) {
          throw Object.assign(new Error('This pick already has a player — use REPLACE_PLAYER_ON_PICK'), { status: 409 })
        }

        const round = Math.ceil(overall / teamCount)
        const slot = getSlotInRoundForOverall({
          overall,
          teamCount,
          draftType: session.draftType as 'snake' | 'linear',
          thirdRoundReversal: session.thirdRoundReversal,
        })
        const resolvedOwner = resolvePickOwner(round, slot, slotOrder, tradedPicks)
        const explicitRoster = String(params.newRosterId ?? '').trim()
        if (explicitRoster) {
          const rosterOk = await tx.roster.count({ where: { leagueId: params.leagueId, id: explicitRoster } })
          if (!rosterOk) {
            throw Object.assign(new Error('newRosterId is not part of this league'), { status: 400 })
          }
        }
        const onClockRosterId =
          explicitRoster || resolvedOwner?.rosterId || slotOrder.find((s) => s.slot === slot)?.rosterId
        if (!onClockRosterId) {
          throw Object.assign(new Error('Unable to resolve pick owner'), { status: 400 })
        }
        const displayName =
          (explicitRoster
            ? displayNameForRoster(slotOrder, explicitRoster)
            : resolvedOwner?.displayName) ?? displayNameForRoster(slotOrder, onClockRosterId)
        const slotOriginalRosterId = slotOrder.find((s) => s.slot === slot)?.rosterId ?? onClockRosterId

        const others = picks.filter((p) => !isDraftPickRowEmpty(p)).map((p) => ({ rosterId: p.rosterId, position: p.position }))
        const rosterFit = await validateRosterFitForDraftPick({
          leagueId: params.leagueId,
          rosterId: onClockRosterId,
          existingPicks: others,
          newPickPosition: position,
        })
        if (!rosterFit.valid) {
          if (!params.force) {
            throw Object.assign(new Error(rosterFit.error ?? 'Roster eligibility failed'), {
              status: 409,
              code: 'ROSTER_ELIGIBILITY',
              warnings: [{ message: rosterFit.error ?? 'Roster eligibility failed' }],
            })
          }
        }

        const spec = await runSpecialtyAndPoolValidation({
          leagueId: params.leagueId,
          session: session as any,
          overall,
          teamCount,
          effectiveRosterId: onClockRosterId,
          onClockRosterId,
          playerName,
          position,
          playerId: params.playerId ?? null,
          assetType: 'player',
          pickMetadata: null,
          tx,
        })
        if (!spec.ok) {
          throw Object.assign(new Error(spec.error), { status: 400 })
        }

        const presentation = await resolveDraftPickPresentation({
          leagueSport,
          playerName,
          position,
          team: params.team ?? null,
          playerId: params.playerId ?? null,
          playerImageUrl: params.playerImageUrl ?? null,
        })

        let tradedPickMeta: Prisma.InputJsonValue | undefined
        if (resolvedOwner?.tradedPickMeta) {
          const raw = { ...resolvedOwner.tradedPickMeta } as Record<string, unknown>
          tradedPickMeta = buildTradedPickMetaForSnapshot(raw, uiSettings, onClockRosterId, displayName) as
            | Prisma.InputJsonValue
            | undefined
        }

        let savedPickId: string
        if (existing && isDraftPickRowEmpty(existing)) {
          const updated = await tx.draftPick.update({
            where: { id: existing.id },
            data: {
              rosterId: onClockRosterId,
              displayName,
              originalRosterId: slotOriginalRosterId,
              playerName,
              position,
              team: params.team ?? null,
              byeWeek: params.byeWeek ?? null,
              playerId: presentation.playerId,
              playerImageUrl: presentation.playerImageUrl,
              tradedPickMeta,
              source: 'commissioner',
              assetType: 'player',
              pickMetadata: {} as Prisma.InputJsonValue,
              ownerUserId: params.actorUserId,
              pickedAt: new Date(),
            },
          })
          savedPickId = updated.id
        } else {
          const created = await tx.draftPick.create({
            data: {
              sessionId: session.id,
              sportType: session.sportType ?? null,
              overall,
              round,
              slot,
              rosterId: onClockRosterId,
              originalRosterId: slotOriginalRosterId,
              displayName,
              playerName,
              position,
              team: params.team ?? null,
              byeWeek: params.byeWeek ?? null,
              playerId: presentation.playerId,
              playerImageUrl: presentation.playerImageUrl,
              tradedPickMeta,
              source: 'commissioner',
              assetType: 'player',
              ownerUserId: params.actorUserId,
              pickedAt: new Date(),
            },
          })
          savedPickId = created.id
        }

        auditRow = {
          overallPickNumber: overall,
          round,
          oldRosterId: existing?.rosterId ?? null,
          newRosterId: onClockRosterId,
          oldPlayerId: null,
          oldPlayerName: null,
          newPlayerId: presentation.playerId,
          newPlayerName: playerName,
          metadata: mergeMetadata({
            pickId: savedPickId,
            updatedExistingEmpty: Boolean(existing),
            rosterFitWarning: !rosterFit.valid ? rosterFit.error : undefined,
            eligibilityForced: params.force && !rosterFit.valid ? true : undefined,
          }),
        }
        break
      }
      case 'CHANGE_PICK_OWNER': {
        const pick = picks.find((p) => p.overall === params.overallPickNumber)
        if (!pick) {
          throw Object.assign(new Error('Pick not found'), { status: 404 })
        }
        const newRosterId = String(params.newRosterId ?? '').trim()
        if (!newRosterId) {
          throw Object.assign(new Error('newRosterId is required'), { status: 400 })
        }
        const rosterOk = await tx.roster.count({ where: { leagueId: params.leagueId, id: newRosterId } })
        if (!rosterOk) {
          throw Object.assign(new Error('newRosterId is not part of this league'), { status: 400 })
        }
        if (newRosterId === pick.rosterId) {
          throw Object.assign(new Error('Pick already assigned to this roster'), { status: 400 })
        }

        const slotEntry = slotOrder.find((e) => e.slot === pick.slot)
        if (!slotEntry) {
          throw Object.assign(new Error('Invalid slot order for this pick'), { status: 400 })
        }

        const previousOwnerName =
          pick.displayName ?? displayNameForRoster(slotOrder, pick.rosterId) ?? pick.rosterId
        const newOwnerName = displayNameForRoster(slotOrder, newRosterId)

        const record: TradedPickRecord = {
          round: pick.round,
          originalRosterId: slotEntry.rosterId,
          previousOwnerName: String(previousOwnerName),
          newRosterId,
          newOwnerName: String(newOwnerName),
        }
        tradedPicksOut = [...tradedPicks, record]

        const ownerResolved = resolvePickOwner(pick.round, pick.slot, slotOrder, tradedPicksOut)
        let tradedPickMeta: Prisma.InputJsonValue | undefined
        if (ownerResolved?.tradedPickMeta) {
          const raw = { ...ownerResolved.tradedPickMeta } as Record<string, unknown>
          tradedPickMeta = buildTradedPickMetaForSnapshot(raw, uiSettings, newRosterId, ownerResolved.displayName) as
            | Prisma.InputJsonValue
            | undefined
        }

        await tx.draftPick.update({
          where: { id: pick.id },
          data: {
            rosterId: newRosterId,
            displayName: ownerResolved?.displayName ?? newOwnerName,
            tradedPickMeta,
          },
        })

        auditRow = {
          overallPickNumber: pick.overall,
          round: pick.round,
          oldRosterId: pick.rosterId,
          newRosterId,
          oldPlayerId: pick.playerId,
          oldPlayerName: pick.playerName,
          newPlayerId: pick.playerId,
          newPlayerName: pick.playerName,
          metadata: mergeMetadata({
            tradedPickRecord: record,
          }),
        }
        break
      }
      default:
        throw Object.assign(new Error('Unsupported action'), { status: 400 })
    }

    await tx.draftPickAuditLog.create({
      data: {
        leagueId: params.leagueId,
        draftSessionId: session.id,
        overallPickNumber: auditRow.overallPickNumber,
        round: auditRow.round,
        action: params.action,
        actorUserId: params.actorUserId,
        oldRosterId: auditRow.oldRosterId,
        newRosterId: auditRow.newRosterId,
        oldPlayerId: auditRow.oldPlayerId,
        oldPlayerName: auditRow.oldPlayerName,
        newPlayerId: auditRow.newPlayerId,
        newPlayerName: auditRow.newPlayerName,
        reason: params.reason?.trim() ? params.reason.trim() : null,
        metadata: auditRow.metadata,
      },
    })

    await tx.draftSession.update({
      where: { id: session.id },
      data: {
        ...(tradedPicksOut
          ? { tradedPicks: tradedPicksOut as unknown as Prisma.InputJsonValue }
          : {}),
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    })

    return true
  }, { timeout: 30_000, maxWait: 10_000 }).catch((e: unknown) => e)

  if (audit !== true) {
    const err = audit as Error & { status?: number; code?: string; warnings?: Array<{ message: string }> }
    const status = typeof err.status === 'number' ? err.status : 500
    if (status === 409 && err.code === 'ROSTER_ELIGIBILITY') {
      return {
        ok: false,
        status: 409,
        error: err.message,
        code: 'ROSTER_ELIGIBILITY',
        warnings: err.warnings,
      }
    }
    if (status >= 400 && status < 500) {
      return { ok: false, status, error: err.message || 'Request failed' }
    }
    console.error('[commissionerPickEdit]', audit)
    return { ok: false, status: 500, error: 'Internal error' }
  }

  invalidateLeagueDraftCaches(params.leagueId)

  const snapshot = await buildSessionSnapshot(params.leagueId)
  if (!snapshot) {
    return { ok: false, status: 500, error: 'Failed to build session snapshot' }
  }
  return { ok: true, snapshot }
}
