import type { RequestContext } from '../contracts/permissions'
import type { RequestMetadata } from '../core/request-metadata'

export interface HttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  headers?: Record<string, string>
  params: Record<string, string>
  body?: Record<string, unknown>
  query?: Record<string, string>
  ctx: RequestContext
  meta: RequestMetadata
}

export interface HttpResponse {
  status: number
  data: Record<string, unknown>
}

export type HttpHandler = (request: HttpRequest) => Promise<HttpResponse>
