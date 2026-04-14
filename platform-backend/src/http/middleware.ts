import type { MemoryIdempotencyStore } from '../core/request-metadata'
import type { HttpHandler, HttpRequest, HttpResponse } from './types'

function withCorrelation(response: HttpResponse, correlationId: string): HttpResponse {
  return {
    ...response,
    data: {
      ...response.data,
      meta: {
        ...(response.data.meta as Record<string, unknown> | undefined),
        correlationId,
      },
    },
  }
}

function idempotencyFingerprint(request: HttpRequest): string {
  return [
    request.ctx.userId,
    request.method,
    request.path,
    JSON.stringify(request.params ?? {}),
  ].join('::')
}

export function withRequestMetadata(handler: HttpHandler): HttpHandler {
  return async (request) => {
    const response = await handler(request)
    return withCorrelation(response, request.meta.correlationId)
  }
}

export function withIdempotency(handler: HttpHandler, store: MemoryIdempotencyStore): HttpHandler {
  return async (request) => {
    const key = request.meta.idempotencyKey
    if (!key) {
      return handler(request)
    }

    const storageKey = `${idempotencyFingerprint(request)}::${key}`
    const existing = store.get(storageKey)
    if (existing) {
      return {
        status: Number(existing.status ?? 200),
        data: {
          ...(existing.data as Record<string, unknown>),
          meta: {
            ...((existing.data as Record<string, unknown>).meta as Record<string, unknown> | undefined),
            idempotentReplay: true,
            correlationId: request.meta.correlationId,
          },
        },
      }
    }

    const response = await handler(request)
    store.set(storageKey, {
      status: response.status,
      data: response.data,
    })
    return response
  }
}

export function compose(handler: HttpHandler, ...wrappers: Array<(next: HttpHandler) => HttpHandler>): HttpHandler {
  return wrappers.reduceRight((next, wrap) => wrap(next), handler)
}
