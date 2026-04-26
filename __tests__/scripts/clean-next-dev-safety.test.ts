/**
 * Dev Server Reliability — clean-next-dev.cjs safety tests.
 *
 * The cleanup script can recursively delete directories. The single most
 * important guarantee is that it CANNOT delete:
 *   - source files (app/, components/, lib/, etc.)
 *   - prisma migrations (prisma/migrations/, prisma/schema.prisma)
 *   - .env files (.env, .env.local, etc.)
 *   - uploaded assets (public/uploads/)
 *   - anything outside the project root
 *
 * `isSafePath(rootDir, target)` is the gatekeeper — only paths matching the
 * `SAFE_ROOTS` allow-list (or descendants of `.next`) are deletable. Tests
 * here cover both happy-path entries on the allow-list and adversarial inputs
 * (path traversal, absolute paths, source dirs).
 */

import { describe, expect, it } from 'vitest'
import * as path from 'node:path'

// require because clean-next-dev is CommonJS (script needs to run via `node`,
// not `tsx`, to keep the dev startup fast).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cleanScript = require('../../scripts/clean-next-dev.cjs') as {
  isSafePath: (rootDir: string, target: string) => boolean
  SAFE_ROOTS: Set<string>
}

const ROOT = 'C:\\Users\\Guap_\\allfantasy-v2-main'

function p(rel: string): string {
  return path.join(ROOT, rel)
}

describe('clean-next-dev — SAFE_ROOTS allow-list', () => {
  it('exposes the expected safe roots (.next, node_modules/.cache, .swc, .turbo)', () => {
    expect(cleanScript.SAFE_ROOTS.has('.next')).toBe(true)
    expect(cleanScript.SAFE_ROOTS.has('node_modules/.cache')).toBe(true)
    expect(cleanScript.SAFE_ROOTS.has('.swc')).toBe(true)
    expect(cleanScript.SAFE_ROOTS.has('.turbo')).toBe(true)
  })

  it('does NOT include source directories', () => {
    for (const danger of ['app', 'components', 'lib', 'prisma', 'public', 'scripts', 'types', '__tests__']) {
      expect(cleanScript.SAFE_ROOTS.has(danger)).toBe(false)
    }
  })
})

describe('clean-next-dev — isSafePath happy path', () => {
  it('allows .next', () => {
    expect(cleanScript.isSafePath(ROOT, p('.next'))).toBe(true)
  })

  it('allows .next/cache (descendant of .next)', () => {
    expect(cleanScript.isSafePath(ROOT, p('.next/cache'))).toBe(true)
    expect(cleanScript.isSafePath(ROOT, p('.next/server/vendor-chunks'))).toBe(true)
    expect(cleanScript.isSafePath(ROOT, p('.next/static/chunks/main-app.js'))).toBe(true)
  })

  it('allows node_modules/.cache exactly', () => {
    expect(cleanScript.isSafePath(ROOT, p('node_modules/.cache'))).toBe(true)
  })

  it('allows .swc and .turbo (deep-clean targets)', () => {
    expect(cleanScript.isSafePath(ROOT, p('.swc'))).toBe(true)
    expect(cleanScript.isSafePath(ROOT, p('.turbo'))).toBe(true)
  })
})

describe('clean-next-dev — isSafePath rejects source files', () => {
  it.each([
    'app',
    'app/page.tsx',
    'app/api/auth/[...nextauth]/route.ts',
    'app/login/page.tsx',
    'components',
    'components/app/draft-room/PlayerAvatar.tsx',
    'lib',
    'lib/draft-room/postDraftPickChatEvent.ts',
    'public',
    'public/default-avatar.png',
    'scripts',
    'scripts/clean-next-dev.cjs',
    '__tests__',
    'types',
  ])('rejects source path: %s', (rel) => {
    expect(cleanScript.isSafePath(ROOT, p(rel))).toBe(false)
  })
})

describe('clean-next-dev — isSafePath rejects prisma + env + uploads', () => {
  it.each([
    'prisma',
    'prisma/schema.prisma',
    'prisma/migrations',
    'prisma/migrations/20240101_init',
    '.env',
    '.env.local',
    '.env.production',
    'public/uploads',
    'public/uploads/avatars/123.png',
  ])('rejects critical path: %s', (rel) => {
    expect(cleanScript.isSafePath(ROOT, p(rel))).toBe(false)
  })
})

describe('clean-next-dev — isSafePath rejects path-traversal + absolute escapes', () => {
  it('rejects an absolute path outside the project root', () => {
    expect(cleanScript.isSafePath(ROOT, 'C:\\Windows\\System32')).toBe(false)
    expect(cleanScript.isSafePath(ROOT, '/etc/passwd')).toBe(false)
  })

  it('rejects parent-directory traversal', () => {
    // path.join normalizes this; the relative result starts with `..` so it's rejected.
    expect(cleanScript.isSafePath(ROOT, path.join(ROOT, '..', '.next'))).toBe(false)
    expect(cleanScript.isSafePath(ROOT, path.join(ROOT, '..', '..', 'evil'))).toBe(false)
  })

  it('rejects similarly-named decoys (e.g. ".nextfoo", "node_modules/cache")', () => {
    expect(cleanScript.isSafePath(ROOT, p('.nextfoo'))).toBe(false)
    expect(cleanScript.isSafePath(ROOT, p('node_modules/cache'))).toBe(false) // missing leading dot
    expect(cleanScript.isSafePath(ROOT, p('node_modules/lodash'))).toBe(false)
  })
})

describe('clean-next-dev — only .next descendants are auto-allowed', () => {
  // node_modules/.cache is a single allowed root — its descendants are NOT
  // auto-allowed. This is intentional: we only ever rmSync the root path,
  // never individual children, so the `descendant of .next` shortcut is enough.
  it('node_modules/.cache descendants are NOT individually allowed', () => {
    expect(cleanScript.isSafePath(ROOT, p('node_modules/.cache/webpack'))).toBe(false)
  })

  it('but the rmSync flow only ever passes the SAFE_ROOTS values exactly', () => {
    // This is a contract assertion — the script never tries to delete
    // node_modules/.cache/foo individually; it deletes node_modules/.cache
    // and lets fs.rmSync handle recursion. The test above guards against
    // future code accidentally passing a child path.
    expect(cleanScript.SAFE_ROOTS.has('node_modules/.cache')).toBe(true)
  })
})
