import { newId } from './id'

export interface RequestMetadata {
  correlationId: string
  idempotencyKey?: string
}

export class MemoryIdempotencyStore {
  private readonly data = new Map<string, Record<string, unknown>>()

  get(key: string): Record<string, unknown> | null {
    return this.data.get(key) ?? null
  }

  set(key: string, value: Record<string, unknown>): void {
    this.data.set(key, value)
  }
}

export function resolveRequestMetadata(input: {
  headers?: Record<string, string>
  fallbackCorrelationId?: string
}): RequestMetadata {
  const correlationId =
    input.headers?.['x-correlation-id'] ??
    input.headers?.['x-request-id'] ??
    input.fallbackCorrelationId ??
    newId('corr')

  const idempotencyKey = input.headers?.['idempotency-key']

  return {
    correlationId,
    idempotencyKey: idempotencyKey && idempotencyKey.trim() ? idempotencyKey.trim() : undefined,
  }
}
