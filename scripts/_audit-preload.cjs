/**
 * Preloaded via `node --require` to stub out the `server-only` package, which
 * throws when imported outside a Next.js server context. Used by
 * audit-draft-player-assets.ts when run under plain Node + tsx.
 */
const Module = require('module')
const path = require('path')
const shim = path.resolve(__dirname, '_audit-server-only-shim.cjs')

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function patchedResolveFilename(request, parent, ...rest) {
  if (request === 'server-only') return shim
  return originalResolveFilename.call(this, request, parent, ...rest)
}
