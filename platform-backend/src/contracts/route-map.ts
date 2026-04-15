export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  service: string
  permission: string
}

export const routeMap: RouteDefinition[] = [
  { method: 'GET', path: '/api/leagues/:id', service: 'leagueService', permission: 'league_member' },
  { method: 'PATCH', path: '/api/leagues/:id/settings/:domain', service: 'settingsService', permission: 'commissioner' },
  { method: 'GET', path: '/api/leagues/:id/teams/:teamId/roster', service: 'rosterService', permission: 'member' },
  { method: 'POST', path: '/api/leagues/:id/teams/:teamId/lineups/:weekOrPeriod', service: 'rosterService', permission: 'member' },
  { method: 'POST', path: '/api/leagues/:id/draft/start', service: 'draftService', permission: 'commissioner' },
  { method: 'POST', path: '/api/draft/:id/picks', service: 'draftService', permission: 'league_member' },
  { method: 'POST', path: '/api/leagues/:id/trades', service: 'tradeService', permission: 'member' },
  { method: 'POST', path: '/api/trades/:id/resolve', service: 'tradeService', permission: 'trade_participant_or_commissioner' },
  { method: 'POST', path: '/api/leagues/:id/waivers/claims', service: 'waiverService', permission: 'member' },
  { method: 'POST', path: '/api/ai/tasks', service: 'aiService', permission: 'authenticated' },
  { method: 'POST', path: '/api/payments/webhooks/:provider', service: 'paymentService', permission: 'webhook_signature_verified' }
]
