/**
 * Decision OS — Canonical World → `manager.lineup.set` input bridge (Slice 1, shadow-only).
 *
 * When the redraft-native loader (./loader) can't resolve usable lineup inputs — e.g. an IMPORTED
 * league that was never AF-drafted, so it has no RedraftRoster gameplay projection — this bridge falls
 * back to the origin-blind Canonical World substrate (lib/decision-os/world) and projects the viewer's
 * roster facts into the SAME RunLineupSetInput shape. READ-ONLY: the projector is pure and the resolver
 * only reads through `resolveCanonicalWorld` (port = prisma find* only). It NEVER writes, never repairs
 * ownership, and never fabricates player metadata.
 *
 * HONESTY CONTRACT: the substrate carries raw player ids + slot membership only — no name / position /
 * injury / bye / projection. Those are left blank and the input is flagged `scanIncomplete` with a null
 * projection confidence and a `player_metadata_missing` warning, so the decision degrades honestly
 * instead of inventing projections or injuries.
 *
 * ORIGIN-BLINDNESS: the returned `source` tag (redraft_native / canonical_world / canonical_world_-
 * unavailable) is PROVENANCE/DEBUG metadata only. It is recorded in telemetry but must never change a
 * decision rule — only completeness/uncertainty does.
 */
import type { CanonicalWorld } from '@/lib/decision-os/world'
import { resolveCanonicalWorld } from '@/lib/decision-os/world'
import type { RedraftLineupPlayer } from '@/lib/redraft/lineupValidation'
import type { RunLineupSetInput } from './index'

/** Where a resolved lineup input came from — PROVENANCE/DEBUG ONLY (never a decision input). */
export type LineupInputSource = 'redraft_native' | 'canonical_world' | 'canonical_world_unavailable'

export interface ResolvedLineupInputs {
  input: RunLineupSetInput | null
  source: LineupInputSource
  /** Honest degradation notes (provenance/debug only — never consumed by decision rules). */
  warnings: string[]
}

/**
 * Map a canonical roster's slot facts onto the lineup player's `slotType`. The substrate knows STARTER
 * vs BENCH vs IR(reserve) vs TAXI membership, but NOT which specific starter slot (QB/RB/FLEX/…) — so a
 * starter is honestly marked `STARTER`, never an invented position slot.
 */
function slotTypeFor(id: string, roster: CanonicalWorld['rosters'][number]): string {
  if (roster.starterIds.includes(id)) return 'STARTER'
  if (roster.reserveIds.includes(id)) return 'IR'
  if (roster.taxiIds.includes(id)) return 'TAXI'
  return 'BENCH'
}

/**
 * Pure projection: turn a Canonical World + viewer id into a RunLineupSetInput (or null + reason).
 *
 * Resolves the viewer's roster via the origin-blind join managerUserId → teamId → roster (NO write,
 * NO owner repair). Returns:
 *   - input + source 'canonical_world'              when a roster with players is found
 *   - null  + source 'canonical_world_unavailable'  when the viewer's roster can't be resolved or is empty
 *
 * Player metadata is never fabricated: name/position are blank, injury/bye null, and the input is
 * flagged `scanIncomplete` with null projection confidence + a `player_metadata_missing` warning.
 */
export function projectCanonicalLineupInput(
  world: CanonicalWorld,
  userId: string,
  leagueId: string,
): ResolvedLineupInputs {
  // World-level completeness warnings travel with the projection (current_week / faab / unmatched / …).
  const warnings = [...world.completeness.warnings]

  // Viewer → team → roster (origin-blind; managerUserId = claimedByUserId ?? platformUserId).
  const team = world.teams.find((t) => t.managerUserId != null && t.managerUserId === userId) ?? null
  const roster = team ? world.rosters.find((r) => r.teamId === team.teamId) ?? null : null
  if (!team || !roster) {
    return { input: null, source: 'canonical_world_unavailable', warnings: [...warnings, 'roster_not_resolved'] }
  }
  if (roster.playerCount === 0) {
    return {
      input: null,
      source: 'canonical_world_unavailable',
      warnings: [...warnings, 'inputs_unavailable', 'roster_empty'],
    }
  }

  // Substrate never enriches player metadata — degrade honestly (no fake position/injury/projection).
  const metadataMissing = !roster.playerMetadataEnriched
  if (metadataMissing) warnings.push('player_metadata_missing')

  const players: RedraftLineupPlayer[] = roster.playerIds.map((id) => ({
    playerId: id,
    playerName: '', // honestly blank — substrate has no player name
    position: '', // honestly blank — substrate has no position
    sport: world.league.sport,
    slotType: slotTypeFor(id, roster),
    injuryStatus: null, // never fabricated
    byeWeek: null, // never fabricated
  }))

  // Current week from canonical data when derivable, else a safe default (flagged via world warnings).
  const week = Math.max(1, Number(world.league.currentWeek ?? 1) || 1)

  const input: RunLineupSetInput = {
    sport: world.league.sport,
    leagueSettings: world.league.scoringSettings ?? null, // same raw league.settings blob the native path passes
    leagueWeek: week,
    editingWeek: week,
    userId,
    leagueId,
    rosterId: roster.rosterId,
    players,
    // Honest degradation hooks: projections/metadata unavailable in the substrate today.
    projectionConfidence: null,
    scanIncomplete: metadataMissing,
  }

  return { input, source: 'canonical_world', warnings }
}

export interface CanonicalLineupFallbackDeps {
  /** Read-only canonical world resolver (default: resolveCanonicalWorld → prisma find* only). */
  resolveWorld: (leagueId: string) => Promise<CanonicalWorld | null>
}

export const defaultCanonicalLineupFallbackDeps: CanonicalLineupFallbackDeps = {
  resolveWorld: (leagueId) => resolveCanonicalWorld(leagueId),
}

/**
 * Resolve lineup inputs from the Canonical World substrate ONLY (the native path is tried first by the
 * shadow runner). Read-only and NEVER throws — any failure degrades to `canonical_world_unavailable`.
 * Returns `null` world → `canonical_world_unavailable`; otherwise delegates to the pure projector.
 */
export async function resolveCanonicalLineupInputs(
  userId: string,
  leagueId: string,
  deps: CanonicalLineupFallbackDeps = defaultCanonicalLineupFallbackDeps,
): Promise<ResolvedLineupInputs> {
  try {
    const world = await deps.resolveWorld(leagueId)
    if (!world) {
      return { input: null, source: 'canonical_world_unavailable', warnings: ['canonical_world_unavailable'] }
    }
    return projectCanonicalLineupInput(world, userId, leagueId)
  } catch {
    return { input: null, source: 'canonical_world_unavailable', warnings: ['canonical_world_error'] }
  }
}
