export type DomainEventType =
  | 'LeagueCreated'
  | 'SettingsUpdated'
  | 'RosterUpdated'
  | 'ScoringUpdated'
  | 'DraftStarted'
  | 'PickMade'
  | 'WaiverProcessed'
  | 'TradeAccepted'
  | 'MatchupFinalized'
  | 'PaymentCompleted'
  | 'NotificationCreated'
  | 'AIRecommendationSaved'
  | 'CommissionerActionTaken'

export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string
  aggregateType: string
  aggregateId: string
  leagueId?: string
  eventType: DomainEventType
  version: number
  occurredAt: string
  payload: TPayload
  correlationId?: string
  actorUserId?: string
}
