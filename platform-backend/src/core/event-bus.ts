import type { DomainEvent } from '../contracts/domain-events'

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>
  publishMany(events: DomainEvent[]): Promise<void>
}

export interface EventSubscriber {
  subscribe(eventType: DomainEvent['eventType'], handler: (event: DomainEvent) => Promise<void>): void
}

export class InMemoryEventBus implements EventPublisher, EventSubscriber {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>()

  subscribe(eventType: DomainEvent['eventType'], handler: (event: DomainEvent) => Promise<void>): void {
    const current = this.handlers.get(eventType) ?? []
    current.push(handler)
    this.handlers.set(eventType, current)
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? []
    for (const handler of handlers) {
      await handler(event)
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }
}
