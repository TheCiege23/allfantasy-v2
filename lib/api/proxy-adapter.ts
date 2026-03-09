import { NextRequest, NextResponse } from 'next/server'

type ProxyOptions = {
  targetPath: string
  query?: Record<string, string | number | boolean | undefined>
  method?: string
  body?: unknown
}

function copyHeaders(req: NextRequest): Headers {
  const headers = new Headers()
  const cookie = req.headers.get('cookie')
  const authorization = req.headers.get('authorization')
  const contentType = req.headers.get('content-type')

  if (cookie) headers.set('cookie', cookie)
  if (authorization) headers.set('authorization', authorization)
  if (contentType) headers.set('content-type', contentType)

  return headers
}

export async function proxyToExisting(req: NextRequest, options: ProxyOptions): Promise<NextResponse> {
  const method = options.method || req.method
  const target = new URL(options.targetPath, req.nextUrl.origin)

  const currentQuery = req.nextUrl.searchParams
  for (const [k, v] of currentQuery.entries()) {
    if (!target.searchParams.has(k)) target.searchParams.set(k, v)
  }

  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined || v === null) continue
      target.searchParams.set(k, String(v))
    }
  }

  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    if (options.body !== undefined) {
      body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    } else {
      const raw = await req.text()
      body = raw.length ? raw : undefined
    }
  }

  const upstream = await fetch(target.toString(), {
    method,
    headers: copyHeaders(req),
    body,
    cache: 'no-store',
  })

  const text = await upstream.text()
  const response = new NextResponse(text, { status: upstream.status })
  const ct = upstream.headers.get('content-type')
  if (ct) response.headers.set('content-type', ct)
  return response
}
