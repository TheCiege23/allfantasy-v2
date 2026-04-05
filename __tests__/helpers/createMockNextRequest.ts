import { NextRequest } from "next/server"

export type MockNextRequestOptions = {
  method?: string
  /** Object or JSON string — serialized for POST/PUT/PATCH body */
  body?: unknown
  headers?: Record<string, string>
}

/**
 * NextRequest for route contract tests. Uses the real `NextRequest` constructor
 * so `req.nextUrl` / `req.nextUrl.searchParams` match production (plain `Request`
 * does not define `nextUrl`).
 */
export function createMockNextRequest(
  url: string = "http://localhost:3000/api/test",
  options: MockNextRequestOptions = {}
): NextRequest {
  const method = (options.method ?? "GET").toUpperCase()
  const headers = new Headers(options.headers ?? {})

  let body: BodyInit | undefined
  if (method !== "GET" && method !== "HEAD") {
    const b = options.body
    if (b === undefined || b === null) {
      body = undefined
    } else if (typeof b === "string") {
      body = b
    } else if (typeof FormData !== "undefined" && b instanceof FormData) {
      // Multipart: must not JSON.stringify (breaks req.formData() in route handlers).
      body = b
    } else if (typeof Blob !== "undefined" && b instanceof Blob) {
      body = b
    } else {
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json")
      }
      body = JSON.stringify(b)
    }
  }

  return new NextRequest(url, { method, headers, body })
}
