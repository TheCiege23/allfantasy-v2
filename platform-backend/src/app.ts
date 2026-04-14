import { InMemoryEventBus } from './core/event-bus'
import { ContractPermissionGuard } from './core/permission-guard'
import { MemoryIdempotencyStore } from './core/request-metadata'
import { createHandlers } from './http/handlers'
import { IdentityService } from './modules/identity/service'
import { LeagueServiceImpl } from './modules/league/service'
import { MembershipService } from './modules/membership/service'
import { SettingsServiceImpl } from './modules/settings/service'
import { MemoryStore } from './repositories/memory-store'
import { RosterServiceImpl } from './modules/roster/service'
import { createMemoryRepositories } from './repositories/memory-adapters'

export function createBackendApp() {
  const store = new MemoryStore()
  const repositories = createMemoryRepositories(store)
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
    store,
    repositories,
    guard,
    eventBus,
    identityService,
    membershipService,
    leagueService,
    rosterService,
    settingsService,
    handlers,
    idempotencyStore,
  }
}
