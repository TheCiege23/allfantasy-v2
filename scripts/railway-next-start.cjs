'use strict'

const http = require('node:http')
const next = require('next')
const { parse } = require('node:url')

const dev = false
const hostname = '0.0.0.0'
const port = Number(process.env.PORT || 3000)
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const PASS_THROUGH_PREFIXES = [
  '/_next/',
  '/api/',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/sw.js',
]

function shouldBufferDocument(req) {
  if (req.method !== 'GET') return false
  const pathname = parse(req.url || '/', true).pathname || '/'
  if (PASS_THROUGH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return false
  }
  return true
}

function patchIfRailwayDroppedDocumentShell(body) {
  const html = body.toString('utf8')
  if (html.startsWith('<!DOCTYPE html>')) return body
  if (!html.startsWith('<meta') || !html.endsWith('</body></html>')) return body

  const shell =
    '<!DOCTYPE html><html lang="en" data-lang="en" data-mode="light" class="scroll-smooth"><head>'
  let patched = shell + html
  const bodyMarker = '<template id="af-body-start"></template>'
  const markerIndex = patched.indexOf(bodyMarker)
  if (markerIndex > -1 && patched.slice(0, markerIndex).indexOf('<body') === -1) {
    patched =
      patched.slice(0, markerIndex) +
      '</head><body class="antialiased min-h-screen mode-readable" style="background:var(--bg);color:var(--text)">' +
      patched.slice(markerIndex)
  }
  return Buffer.from(patched, 'utf8')
}

function bufferDocumentResponse(req, res, parsedUrl) {
  const originalWrite = res.write.bind(res)
  const originalEnd = res.end.bind(res)
  const originalWriteHead = res.writeHead.bind(res)
  const chunks = []

  res.writeHead = function writeHead(statusCode, statusMessage, headers) {
    res.statusCode = statusCode
    if (typeof statusMessage === 'string') {
      res.statusMessage = statusMessage
    } else if (statusMessage && typeof statusMessage === 'object') {
      headers = statusMessage
    }
    if (headers && typeof headers === 'object') {
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value)
      }
    }
    return res
  }

  res.write = function write(chunk, encoding, callback) {
    if (typeof encoding === 'function') {
      callback = encoding
      encoding = undefined
    }
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
    }
    if (typeof callback === 'function') callback()
    return true
  }

  res.end = function end(chunk, encoding, callback) {
    if (typeof encoding === 'function') {
      callback = encoding
      encoding = undefined
    }
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
    }

    const contentType = String(res.getHeader('content-type') || '')
    const body = Buffer.concat(chunks)
    const finalBody = contentType.includes('text/html')
      ? patchIfRailwayDroppedDocumentShell(body)
      : body

    res.write = originalWrite
    res.end = originalEnd
    res.writeHead = originalWriteHead
    res.removeHeader('transfer-encoding')
    res.setHeader('content-length', Buffer.byteLength(finalBody))
    return originalEnd(finalBody, encoding, callback)
  }

  return handle(req, res, parsedUrl)
}

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      const parsedUrl = parse(req.url || '/', true)
      if (parsedUrl.pathname === '/api/af-railway-health') {
        const body = JSON.stringify({ ok: true, server: 'railway-next-start' })
        res.statusCode = 200
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.setHeader('content-length', Buffer.byteLength(body))
        res.end(body)
        return
      }
      if (!shouldBufferDocument(req)) {
        return handle(req, res, parsedUrl)
      }
      return bufferDocumentResponse(req, res, parsedUrl)
    })
    .listen(port, hostname, () => {
      console.log(`[railway-next-start] ready on http://${hostname}:${port}`)
    })
})
