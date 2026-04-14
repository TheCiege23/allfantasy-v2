import type { PermissionGuard, RequestContext, SystemRole } from '../contracts/permissions'

export class ContractPermissionGuard implements PermissionGuard {
  requireAuth(ctx: RequestContext): void {
    if (!ctx.userId) {
      throw new Error('unauthenticated')
    }
  }

  requireLeagueMembership(ctx: RequestContext, _leagueId: string): void {
    this.requireAuth(ctx)
    if (!ctx.leagueRoles.length) {
      throw new Error('membership_required')
    }
  }

  requireRole(ctx: RequestContext, role: SystemRole): void {
    if (!ctx.systemRoles.includes(role) && !ctx.leagueRoles.includes(role)) {
      throw new Error(`role_required:${role}`)
    }
  }

  requireAnyRole(ctx: RequestContext, roles: SystemRole[]): void {
    const hasRole = roles.some((role) => ctx.systemRoles.includes(role) || ctx.leagueRoles.includes(role))
    if (!hasRole) {
      throw new Error(`role_required_any:${roles.join(',')}`)
    }
  }

  requireEntitlement(ctx: RequestContext, entitlement: string): void {
    if (!ctx.entitlements.includes(entitlement)) {
      throw new Error(`entitlement_required:${entitlement}`)
    }
  }
}
