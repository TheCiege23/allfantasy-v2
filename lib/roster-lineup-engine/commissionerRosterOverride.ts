import { logAction } from '@/server/services/auditService'
import { persistRosterLineupWithEngine } from './lineupService'

/**
 * Commissioner-only forced lineup update with audit trail (`audit_logs` + roster move history).
 */
export async function commissionerForceRosterLineup(input: {
  leagueId: string
  rosterId: string
  commissionerUserId: string
  nextPlayerData: Record<string, unknown>
  season: number
  week: number
  reason?: string
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const result = await persistRosterLineupWithEngine({
    leagueId: input.leagueId,
    rosterId: input.rosterId,
    actorUserId: input.commissionerUserId,
    nextPlayerData: input.nextPlayerData,
    season: input.season,
    week: input.week,
    source: 'commissioner_override',
    skipLockCheck: true,
  })

  if (!result.ok) return result

  await logAction({
    leagueId: input.leagueId,
    userId: input.commissionerUserId,
    actionType: 'commissioner_roster_override',
    entityType: 'roster',
    entityId: input.rosterId,
    metadata: {
      season: input.season,
      week: input.week,
      reason: input.reason ?? null,
      source: 'roster_lineup_engine',
    },
  })

  void import('@/lib/league-events/publisher').then(({ publishLeagueFanoutEvent }) =>
    publishLeagueFanoutEvent({
      leagueId: input.leagueId,
      eventType: 'commissioner_override',
      title: 'Commissioner roster update',
      message: 'The commissioner applied a roster or lineup correction.',
      category: 'league_announcements',
      visibility: 'all_members',
      actorUserId: input.commissionerUserId,
      meta: { rosterId: input.rosterId, week: input.week },
      dedupeKey: `comm_roster:${input.rosterId}:${input.season}-w${input.week}`,
    }).catch(() => {}),
  )

  return { ok: true }
}
