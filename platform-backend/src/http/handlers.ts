import type { HttpHandler, HttpResponse } from './types'
import type { LeagueServiceImpl } from '../modules/league/service'
import type { MembershipService } from '../modules/membership/service'
import type { RosterServiceImpl } from '../modules/roster/service'
import type { SettingsServiceImpl } from '../modules/settings/service'
import type { MemoryIdempotencyStore } from '../core/request-metadata'
import { withIdempotency, withRequestMetadata } from './middleware'

interface HandlerDeps {
  leagueService: LeagueServiceImpl
  membershipService: MembershipService
  rosterService: RosterServiceImpl
  settingsService: SettingsServiceImpl
  idempotencyStore: MemoryIdempotencyStore
}

function ok(data: Record<string, unknown>, status = 200): HttpResponse {
  return { status, data }
}

function toError(error: unknown): HttpResponse {
  const message = error instanceof Error ? error.message : 'internal_error'
  if (message === 'unauthenticated') return { status: 401, data: { error: message } }
  if (message.includes('role_required') || message === 'membership_required') {
    return { status: 403, data: { error: message } }
  }
  if (message.includes('not_found')) return { status: 404, data: { error: message } }
  if (message.startsWith('invalid_')) return { status: 400, data: { error: message } }
  return { status: 500, data: { error: message } }
}

export function createHandlers(deps: HandlerDeps): {
  postLeagues: HttpHandler
  getLeagueById: HttpHandler
  getLeagueMembers: HttpHandler
  getTeamRoster: HttpHandler
  postTeamLineup: HttpHandler
  getLeagueSettingsByDomain: HttpHandler
  patchLeagueSettingsByDomain: HttpHandler
} {
  const postLeaguesBase: HttpHandler = async (request) => {
    try {
      const league = await deps.leagueService.createLeague(request.ctx, request.body ?? {})
      return ok({ league }, 201)
    } catch (error) {
      return toError(error)
    }
  }

  const postTeamLineupBase: HttpHandler = async (request) => {
    try {
      const leagueId = request.params.id
      const teamId = request.params.teamId
      const weekRaw = request.params.weekOrPeriod ?? request.query?.weekOrPeriod
      const weekOrPeriod = Number(weekRaw)
      if (!Number.isFinite(weekOrPeriod)) {
        return toError(new Error('invalid_week_or_period'))
      }

      const payload = {
        ...(request.body ?? {}),
        idempotencyKey: request.meta.idempotencyKey,
        correlationId: request.meta.correlationId,
      }

      const receipt = await deps.rosterService.submitLineupWithReceipt(
        request.ctx,
        leagueId,
        teamId,
        Math.trunc(weekOrPeriod),
        payload,
      )
      return ok({ receipt }, 202)
    } catch (error) {
      return toError(error)
    }
  }

  const patchLeagueSettingsBase: HttpHandler = async (request) => {
    try {
      const leagueId = request.params.id
      const domain = request.params.domain
      const payload = (request.body?.payload as Record<string, unknown>) ?? {}
      const reason =
        typeof request.body?.reason === 'string' ? request.body.reason : undefined
      await deps.settingsService.updateSettings(request.ctx, leagueId, domain, payload, reason)
      return ok({ ok: true })
    } catch (error) {
      return toError(error)
    }
  }

  const postLeagues = withRequestMetadata(withIdempotency(postLeaguesBase, deps.idempotencyStore))
  const postTeamLineup = withRequestMetadata(withIdempotency(postTeamLineupBase, deps.idempotencyStore))
  const patchLeagueSettingsByDomain = withRequestMetadata(
    withIdempotency(patchLeagueSettingsBase, deps.idempotencyStore),
  )

  return {
    postLeagues,

    getLeagueById: withRequestMetadata(async (request) => {
      try {
        const leagueId = request.params.id
        const league = await deps.leagueService.getLeague(request.ctx, leagueId)
        return ok({ league })
      } catch (error) {
        return toError(error)
      }
    }),

    getLeagueMembers: withRequestMetadata(async (request) => {
      try {
        const leagueId = request.params.id
        const members = await deps.membershipService.listMemberships(request.ctx, leagueId)
        return ok({ members })
      } catch (error) {
        return toError(error)
      }
    }),

    getTeamRoster: withRequestMetadata(async (request) => {
      try {
        const leagueId = request.params.id
        const teamId = request.params.teamId
        const roster = await deps.rosterService.getRoster(request.ctx, leagueId, teamId)
        return ok({ roster })
      } catch (error) {
        return toError(error)
      }
    }),

    postTeamLineup,

    getLeagueSettingsByDomain: withRequestMetadata(async (request) => {
      try {
        const leagueId = request.params.id
        const domain = request.params.domain.toLowerCase()
        const settings = await deps.settingsService.getSettings(request.ctx, leagueId)
        const domains = (settings.domains as Record<string, Record<string, unknown>>) ?? {}
        const versions = (settings.versions as Record<string, number>) ?? {}
        return ok({
          leagueId,
          domain,
          payload: domains[domain] ?? {},
          version: versions[domain] ?? 0,
        })
      } catch (error) {
        return toError(error)
      }
    }),

    patchLeagueSettingsByDomain,
  }
}
