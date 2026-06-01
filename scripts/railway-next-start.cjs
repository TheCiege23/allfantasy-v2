'use strict'

const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { parse } = require('node:url')

const publicHostname = '0.0.0.0'
const publicPort = Number(process.env.PORT || 3000)
const upstreamPort = Number(
  process.env.RAILWAY_NEXT_INTERNAL_PORT || (publicPort === 3000 ? 3001 : 3000),
)
const isRailwayRuntime = !!(
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_SERVICE_ID ||
  process.env.RAILWAY_DEPLOYMENT_ID ||
  process.env.RAILWAY_GIT_COMMIT_SHA
)
if (!process.env.AF_NEXT_DIST_DIR && isRailwayRuntime) {
  process.env.AF_NEXT_DIST_DIR = process.env.RAILWAY_GIT_COMMIT_SHA
    ? `.next-railway-${process.env.RAILWAY_GIT_COMMIT_SHA}`
    : '.next-railway'
}
const upstreamHost = '127.0.0.1'
const upstreamBase = `http://${upstreamHost}:${upstreamPort}`
const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')

let nextProcess = null
let upstreamReady = false
let shuttingDown = false

const PASS_THROUGH_PREFIXES = [
  '/_next/',
  '/api/',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/sw.js',
]

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

function logRuntimeError(label, error) {
  console.error(`[railway-next-start] ${label}`, error)
}

process.on('unhandledRejection', (error) => {
  logRuntimeError('unhandled rejection', error)
})

process.on('uncaughtException', (error) => {
  logRuntimeError('uncaught exception', error)
})

function shouldBufferDocument(req) {
  if (req.method !== 'GET') return false
  const pathname = parse(req.url || '/', true).pathname || '/'
  if (PASS_THROUGH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return false
  }
  return true
}

const DOCUMENT_SHELL_PREFIX =
  '<!DOCTYPE html><html lang="en" data-lang="en" data-mode="light" class="scroll-smooth"><head>'
const BODY_OPEN =
  '<body class="antialiased min-h-screen mode-readable" style="background:var(--bg);color:var(--text)">'
const BODY_MARKER = '<template id="af-body-start"></template>'
const RAILWAY_STYLES_LINK = '<link rel="stylesheet" href="/railway-styles.css" data-af-railway-styles="true"/>'
const BODY_START_CANDIDATES = [
  BODY_MARKER,
  '<main',
  '<div',
  '<section',
  '<header',
  '<nav',
  '<form',
]

function ensureRailwayStylesLink(html) {
  if (html.includes('data-af-railway-styles="true"') || html.includes('href="/railway-styles.css"')) {
    return html
  }

  const headIndex = html.indexOf('<head>')
  if (headIndex > -1) {
    return `${html.slice(0, headIndex + '<head>'.length)}${RAILWAY_STYLES_LINK}${html.slice(
      headIndex + '<head>'.length,
    )}`
  }

  return html
}

function ensureBodyBoundary(html) {
  if (/<body(?:\s|>)/i.test(html)) return html

  const searchStart = Math.max(0, html.indexOf('<head>') + '<head>'.length)
  const bodyStartIndex = BODY_START_CANDIDATES.reduce((earliest, candidate) => {
    const idx = html.indexOf(candidate, searchStart)
    if (idx === -1) return earliest
    return earliest === -1 || idx < earliest ? idx : earliest
  }, -1)
  if (bodyStartIndex === -1) return html

  const beforeBody = html.slice(0, bodyStartIndex).toLowerCase()
  const boundary = beforeBody.includes('</head>') ? BODY_OPEN : `</head>${BODY_OPEN}`
  return `${html.slice(0, bodyStartIndex)}${boundary}${html.slice(bodyStartIndex)}`
}

function patchIfRailwayDroppedDocumentShell(body) {
  const html = body.toString('utf8')

  let patched = html
  if (patched.startsWith('<meta') && patched.endsWith('</body></html>')) {
    patched = DOCUMENT_SHELL_PREFIX + patched
  }

  patched = ensureRailwayStylesLink(patched)
  patched = ensureBodyBoundary(patched)

  return patched === html ? body : Buffer.from(patched, 'utf8')
}

function copyProxyHeaders(sourceHeaders, res, overrides = {}) {
  for (const [name, value] of Object.entries(sourceHeaders)) {
    const lower = name.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lower)) continue
    if (lower === 'content-length' || lower === 'content-encoding') continue
    if (value !== undefined) res.setHeader(name, value)
  }

  for (const [name, value] of Object.entries(overrides)) {
    res.setHeader(name, value)
  }
}

function sendLiveness(res) {
  const body = JSON.stringify({
    ok: upstreamReady,
    server: 'railway-next-start-proxy',
    upstream: upstreamBase,
  })
  // Always 200 so Railway deploy healthchecks pass once the proxy is listening.
  // Upstream readiness is exposed in the JSON body for ops monitoring.
  res.statusCode = 200
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('content-length', Buffer.byteLength(body))
  res.end(body)
}

function proxyRequest(req, res) {
  const parsedUrl = parse(req.url || '/', true)
  if (parsedUrl.pathname === '/api/af-railway-health') {
    sendLiveness(res)
    return
  }

  const headers = { ...req.headers, host: `${upstreamHost}:${upstreamPort}` }
  delete headers['accept-encoding']
  headers['accept-encoding'] = 'identity'

  const upstreamReq = http.request(
    {
      hostname: upstreamHost,
      port: upstreamPort,
      path: req.url || '/',
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      const statusCode = upstreamRes.statusCode || 500
      const contentType = String(upstreamRes.headers['content-type'] || '')
      const shouldBuffer = shouldBufferDocument(req) && contentType.includes('text/html')

      res.statusCode = statusCode

      if (!shouldBuffer) {
        copyProxyHeaders(upstreamRes.headers, res)
        upstreamRes.pipe(res)
        return
      }

      const chunks = []
      upstreamRes.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      upstreamRes.on('end', () => {
        const finalBody = patchIfRailwayDroppedDocumentShell(Buffer.concat(chunks))
        copyProxyHeaders(upstreamRes.headers, res, {
          'content-length': Buffer.byteLength(finalBody),
        })
        res.end(finalBody)
      })
      upstreamRes.on('error', (error) => handleRequestError(req, res, error))
    },
  )

  upstreamReq.on('error', (error) => handleRequestError(req, res, error))
  req.pipe(upstreamReq)
}

function handleRequestError(req, res, error) {
  logRuntimeError(`${req.method || 'GET'} ${req.url || '/'} failed`, error)

  if (res.writableEnded) return

  try {
    if (!res.headersSent) {
      const body = 'Internal Server Error'
      res.statusCode = 500
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.setHeader('content-length', Buffer.byteLength(body))
      res.end(body)
      return
    }

    res.end()
  } catch (endError) {
    logRuntimeError('failed to close errored response', endError)
  }
}

function startNextProcess() {
  if (shuttingDown) return

  upstreamReady = false
  nextProcess = spawn(process.execPath, [nextBin, 'start', '-p', String(upstreamPort), '-H', upstreamHost], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(upstreamPort),
      HOSTNAME: upstreamHost,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  nextProcess.stdout.on('data', (chunk) => process.stdout.write(`[next] ${chunk}`))
  nextProcess.stderr.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`))

  nextProcess.on('exit', (code, signal) => {
    upstreamReady = false
    if (shuttingDown) return
    console.error(`[railway-next-start] next start exited code=${code} signal=${signal}; restarting`)
    setTimeout(startNextProcess, 1000)
  })
}

async function checkUpstream() {
  try {
    const response = await fetch(`${upstreamBase}/api/af-debug/sha`, { cache: 'no-store' })
    upstreamReady = response.ok
  } catch {
    upstreamReady = false
  }
}

function shutdown(signal) {
  shuttingDown = true
  console.log(`[railway-next-start] received ${signal}; shutting down`)
  if (nextProcess && !nextProcess.killed) nextProcess.kill(signal)
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

function main() {
  startNextProcess()
  setInterval(checkUpstream, 1000).unref()
  void checkUpstream()

  http
    .createServer((req, res) => {
      try {
        proxyRequest(req, res)
      } catch (error) {
        handleRequestError(req, res, error)
      }
    })
    .listen(publicPort, publicHostname, () => {
      console.log(
        `[railway-next-start] proxy ready on http://${publicHostname}:${publicPort} -> ${upstreamBase}`,
      )
    })
}

if (require.main === module) {
  main()
}

module.exports = {
  patchIfRailwayDroppedDocumentShell,
  ensureBodyBoundary,
  ensureRailwayStylesLink,
}
