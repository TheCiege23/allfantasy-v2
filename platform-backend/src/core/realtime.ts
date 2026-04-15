import type { DomainEvent } from '../contracts/domain-events'

export interface RealtimeGateway {
  broadcast(channel: string, event: DomainEvent): Promise<void>
  channelForEvent(event: DomainEvent): string[]
}

export class LeagueRealtimeGateway implements RealtimeGateway {
  async broadcast(_channel: string, _event: DomainEvent): Promise<void> {
    return
  }

  channelForEvent(event: DomainEvent): string[] {
    const channels: string[] = []
    if (event.leagueId) {
      channels.push(`league:${event.leagueId}`)
      channels.push(`league:${event.leagueId}:${event.aggregateType}`)
    }
    if (event.actorUserId) {
      channels.push(`user:${event.actorUserId}:notifications`)
    }
    return channels
  }
}
