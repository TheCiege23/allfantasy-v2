import { ContractPermissionGuard } from '../../core/permission-guard'
import type { RequestContext, SystemRole } from '../../contracts/permissions'
import type { MembershipRepository } from '../../contracts/repositories'
import type { MembershipRecord } from '../../repositories/memory-store'

export class MembershipService {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly guard: ContractPermissionGuard,
  ) {}

  async addMembership(ctx: RequestContext, leagueId: string, userId: string, role: SystemRole): Promise<MembershipRecord> {
    this.guard.requireAnyRole(ctx, ['admin', 'commissioner'])
    const row: MembershipRecord = {
      leagueId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    }
    await this.memberships.upsert(row)
    return row
  }

  async listMemberships(ctx: RequestContext, leagueId: string): Promise<MembershipRecord[]> {
    this.guard.requireLeagueMembership(ctx, leagueId)
    return this.memberships.listByLeague(leagueId)
  }

  async leagueRolesForUser(leagueId: string, userId: string): Promise<SystemRole[]> {
    const row = await this.memberships.getByLeagueAndUser(leagueId, userId)
    return row ? [row.role] : []
  }
}
