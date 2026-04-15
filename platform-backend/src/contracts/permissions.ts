export type SystemRole = 'admin' | 'commissioner' | 'co_owner' | 'member' | 'viewer'

export interface RequestContext {
  userId: string
  leagueId?: string
  teamId?: string
  systemRoles: SystemRole[]
  leagueRoles: SystemRole[]
  entitlements: string[]
}

export interface PermissionGuard {
  requireAuth(ctx: RequestContext): void
  requireLeagueMembership(ctx: RequestContext, leagueId: string): void
  requireRole(ctx: RequestContext, role: SystemRole): void
  requireAnyRole(ctx: RequestContext, roles: SystemRole[]): void
  requireEntitlement(ctx: RequestContext, entitlement: string): void
}
