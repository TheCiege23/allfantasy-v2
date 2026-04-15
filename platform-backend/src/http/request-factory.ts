import { resolveRequestMetadata } from '../core/request-metadata'
import type { HttpRequest } from './types'

export function buildHttpRequest(input: Omit<HttpRequest, 'meta'>): HttpRequest {
  return {
    ...input,
    meta: resolveRequestMetadata({
      headers: input.headers,
    }),
  }
}
