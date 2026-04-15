/**
 * buildActionContext — Bridge utility
 * Converts an AISurfaceContextValue (from AISurfaceContext) into an
 * AIActionContext (from lib/chimmy-actions) so components can use both
 * systems together seamlessly without prop drilling.
 *
 * Usage:
 *   const ctx = useAISurface()
 *   const actionContext = buildActionContext(ctx)
 */

import type { AISurfaceContextValue } from '@/components/chimmy-surfaces/AISurfaceContext'
import type { AIActionContext } from './AIActionModel'

function normalizeRole(surfaceRole: AISurfaceContextValue['role']): AIActionContext['role'] {
  if (surfaceRole === 'admin') return 'admin'
  if (surfaceRole === 'commissioner') return 'commissioner'
  if (surfaceRole === 'co-owner') return 'co-owner'
  if (surfaceRole === 'member') return 'member'
  // Viewer/guest/null collapse to member/null semantics for action permissions.
  return surfaceRole ? 'member' : null
}

export function buildActionContext(surface: AISurfaceContextValue): AIActionContext {
  const leagueState = surface.leagueState
  // Safely probe roster settings for feature slots using unknown cast
  const rosterCfg = (surface.leagueSettings as Record<string, unknown> | null)?.roster as Record<string, unknown> | undefined

  return {
    userId: surface.userId ?? 'anonymous',
    role: normalizeRole(surface.role),
    sport: surface.sport ?? 'NFL',
    leagueType: surface.leagueType ?? 'redraft',
    leagueId: leagueState?.leagueId ?? null,
    teamId: surface.teamState?.teamId ?? null,
    subscriptionState: {
      hasPremium: surface.subscriptionState.hasPremium,
      hasCommissioner: surface.subscriptionState.hasCommissioner,
      hasAdmin: surface.subscriptionState.hasAdmin,
    },
    leagueState: {
      isLocked: false,
      isWaiverOpen: true,
      isLineupLocked: false,
      isDraftActive: !(leagueState?.isDraftComplete ?? true),
      isDraftComplete: leagueState?.isDraftComplete ?? false,
      isTradeDeadlinePast: false,
      isInPlayoffs: leagueState?.isInPlayoffs ?? false,
      currentWeek: leagueState?.currentWeek,
    },
    rosterState: {
      hasIR: Number(rosterCfg?.irSlots ?? 0) > 0,
      hasIL: Number(rosterCfg?.ilSlots ?? 0) > 0,
      hasTaxi: Number(rosterCfg?.taxiSquadSlots ?? 0) > 0,
      hasDevy: Number(rosterCfg?.devySlots ?? 0) > 0,
    },
  }
}
