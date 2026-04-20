import { calculateLeagueStandings } from '@/lib/tournament/advancementEngine'
import { loadSpecialtyMetadataSnapshot } from '@/lib/specialty-automation/syncMetadata'
import { planLeagueEvent } from '@/lib/specialty-automation/actionPlans'
import { notApplicableTrigger } from '@/lib/specialty-automation/conceptHandlerUtils'
import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

const ALLOWED = new Set([
  'onManualRun',
  'onScheduledPass',
  'onWeekFinalized',
  'onPhaseTransition',
  'onDraftCompleted',
  'onStandingsUpdated',
])

/** Triggers where we sync shell standings from the underlying redraft league (safe to repeat). */
const STANDINGS_SYNC = new Set([
  'onWeekFinalized',
  'onStandingsUpdated',
  'onManualRun',
  'onScheduledPass',
])

export async function runTournamentHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return notApplicableTrigger(ctx, 'Tournament')
  }

  const meta = await loadSpecialtyMetadataSnapshot('tournament', ctx)
  const tl = meta.tournament as
    | { id: string; status?: string; roundId?: string; tournamentId?: string; leagueId?: string | null }
    | undefined

  const events = []
  const actions: HandlerResult['actions'] = []
  const warnings: string[] = []

  if (tl?.id && STANDINGS_SYNC.has(ctx.trigger)) {
    try {
      const standings = await calculateLeagueStandings(tl.id)
      actions.push({
        actionType: 'tournament_standings_sync',
        targetType: 'tournament_league',
        targetId: tl.id,
        metadata: {
          tournamentId: tl.tournamentId,
          rowCount: standings.rows.length,
          week: ctx.week,
        },
      })
      events.push(
        planLeagueEvent(
          'tournament_standings_sync',
          'Tournament standings synced',
          `Updated ${standings.rows.length} participant row(s) from league results.`,
          { tournamentLeagueId: tl.id, tournamentId: tl.tournamentId },
        ),
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      warnings.push(msg)
      actions.push({
        actionType: 'tournament_standings_sync_error',
        targetType: 'tournament_league',
        targetId: tl.id,
        metadata: { error: msg },
      })
    }
  }

  if (ctx.trigger === 'onManualRun' || ctx.trigger === 'onScheduledPass') {
    events.push(
      planLeagueEvent(
        'specialty_state_sync',
        'Tournament — state sync',
        'Bracket / stage metadata refreshed.',
        meta,
      ),
    )
  }

  const summaryParts: string[] = []
  if (tl) {
    summaryParts.push(`Tournament shell active (status ${tl.status ?? 'unknown'}).`)
    if (actions.some((a) => a.actionType === 'tournament_standings_sync')) {
      summaryParts.push('Standings synchronized with tournament shell.')
    }
  } else {
    summaryParts.push('Tournament: no tournament shell row yet — metadata only.')
  }

  return {
    summary: summaryParts.join(' '),
    actions:
      actions.length > 0
        ? actions
        : [{ actionType: 'specialty_metadata_sync', metadata: meta }],
    events,
    warnings: warnings.length ? warnings : undefined,
    phaseState: {
      currentPhase: 'tournament',
      currentStage: tl?.roundId ?? undefined,
      currentWeekContext: ctx.week ?? undefined,
      metadata: meta,
    },
  }
}
