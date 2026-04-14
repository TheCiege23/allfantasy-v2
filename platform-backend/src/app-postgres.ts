import { InMemoryEventBus } from './core/event-bus'
import { ContractPermissionGuard } from './core/permission-guard'
import { MemoryIdempotencyStore } from './core/request-metadata'
import { createHandlers } from './http/handlers'
import { IdentityService } from './modules/identity/service'
import { LeagueServiceImpl } from './modules/league/service'
import { MembershipService } from './modules/membership/service'
import { RosterServiceImpl } from './modules/roster/service'
import { SettingsServiceImpl } from './modules/settings/service'
import { createPostgresRepositories } from './repositories/postgres/adapters'
import type { SqlExecutor } from './repositories/postgres/executor'

export function createPostgresBackendApp(sqlExecutor: SqlExecutor) {
  const repositories = createPostgresRepositories(sqlExecutor)
  const eventBus = new InMemoryEventBus()
  const guard = new ContractPermissionGuard()
  const idempotencyStore = new MemoryIdempotencyStore()

  const identityService = new IdentityService(repositories.identities)
  const membershipService = new MembershipService(repositories.memberships, guard)
  const leagueService = new LeagueServiceImpl(
    repositories.leagues,
    repositories.memberships,
    repositories.domainEvents,
    guard,
    eventBus,
  )
  const rosterService = new RosterServiceImpl(
    repositories.memberships,
    repositories.rosters,
    repositories.lineups,
    repositories.domainEvents,
    guard,
    eventBus,
  )
  const settingsService = new SettingsServiceImpl(
    repositories.settings,
    repositories.audits,
    repositories.domainEvents,
    guard,
    eventBus,
  )

  const handlers = createHandlers({
    leagueService,
    membershipService,
    rosterService,
    settingsService,
    idempotencyStore,
  })

  return {
    repositories,
    guard,
    eventBus,
    idempotencyStore,
    identityService,
    membershipService,
    leagueService,
    rosterService,
    settingsService,
    handlers,
  }
}
