import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Phase 5H — unified sports-data-plane provider boundary enforcement.
 *
 * Certifies the audited invariant: Decision OS and the certified sports-runtime integration services never call
 * a sports-data PROVIDER directly. All sports facts must flow through the canonical/gateway runtime ports. This
 * locks in the "no direct-provider bypass" boundary permanently (product runtime is provider-agnostic).
 */
const root = process.cwd()

// Legacy provider-client modules + raw provider URLs that product/Decision-OS runtime must never import/hit.
const FORBIDDEN_IMPORT = /from ['"]@\/lib\/(espn-data|fantasycalc|upstream-apis|sleeper-sync|api-football|cfb-player-data|sports-live-scores-service|thesportsdb|clearsports|unified-player-service|players\/ri-players-server|legacy-ai-context|chat-data-enrichment|sports-router)['"]/
const FORBIDDEN_URL = /(api\.sleeper\.app|site\.api\.espn\.com|sports\.core\.api\.espn|api\.fantasycalc\.com|thesportsdb\.com|api-sports\.io|api-football|collegefootballdata\.com|rollinginsights|clearsports)/i

function walk(dir: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(p)
  }
  return out
}

function scan(relDir: string): { file: string; line: string }[] {
  const violations: { file: string; line: string }[] = []
  for (const file of walk(path.join(root, relDir))) {
    const src = fs.readFileSync(file, 'utf8')
    for (const line of src.split('\n')) {
      if (line.trim().startsWith('import') && FORBIDDEN_IMPORT.test(line)) violations.push({ file: path.relative(root, file), line: line.trim() })
    }
  }
  return violations
}

describe('5H — Decision OS is provider-agnostic (no direct provider bypass)', () => {
  it('no lib/decision-os file imports a sports-data provider client', () => {
    const v = scan('lib/decision-os')
    expect(v, `Decision OS provider bypass(es): ${JSON.stringify(v, null, 2)}`).toEqual([])
  })
  it('no app/api/decision-os route imports a sports-data provider client', () => {
    const v = scan('app/api/decision-os')
    expect(v, JSON.stringify(v)).toEqual([])
  })
})

describe('5H — certified sports-runtime integration services are provider-agnostic', () => {
  it('no lib/fantasy-os/sports-runtime service imports a provider client or hits a provider URL', () => {
    const importV = scan('lib/fantasy-os/sports-runtime')
    expect(importV, JSON.stringify(importV)).toEqual([])
    for (const file of walk(path.join(root, 'lib/fantasy-os/sports-runtime'))) {
      const src = fs.readFileSync(file, 'utf8')
      expect(FORBIDDEN_URL.test(src), `${path.relative(root, file)} hits a provider URL`).toBe(false)
    }
  })
})

describe('5H-b — provider access is confined to gateway adapters (adapter purity achieved)', () => {
  // Phase 5H-b removed the last 3 gateway-runtime provider exceptions (Sleeper roster/txn/draft). Provider URLs
  // now live ONLY in lib/sports-data-gateway/providers/*. A runtime module hitting a provider URL is a bypass.
  it('NO gateway runtime module contains a provider URL — all provider access is in providers/*', () => {
    const offenders: string[] = []
    for (const file of walk(path.join(root, 'lib/sports-data-gateway/runtime'))) {
      if (FORBIDDEN_URL.test(fs.readFileSync(file, 'utf8'))) offenders.push(path.relative(root, file))
    }
    expect(offenders, `runtime modules with a provider URL: ${offenders.join(', ')}`).toEqual([])
  })
  it('the three certified provider adapters exist and hold the provider URLs', () => {
    for (const p of ['espn', 'sleeper', 'fantasycalc']) {
      const f = path.join(root, `lib/sports-data-gateway/providers/${p}.ts`)
      expect(fs.existsSync(f), `${p} adapter missing`).toBe(true)
    }
    // the Sleeper adapter now owns the roster/transaction/draft fetchers (moved out of runtime)
    const sleeper = fs.readFileSync(path.join(root, 'lib/sports-data-gateway/providers/sleeper.ts'), 'utf8')
    for (const fn of ['fetchSleeperRosters', 'fetchSleeperLeagueTransactions', 'fetchSleeperLeagueDrafts', 'fetchSleeperDraftPicks']) {
      expect(sleeper.includes(fn), `Sleeper adapter missing ${fn}`).toBe(true)
    }
  })
})

describe('5H-b2 — canonical position governance (no NEW competing broad-collapse map)', () => {
  // The governed source (canonical/canonicalPosition.ts) PRESERVES detailed positions and derives broad
  // fantasy buckets only from league rules. A broad-collapse signature — mapping a detailed IDP abbreviation
  // directly to a broad bucket string, e.g. `DE: 'DL'`, `CB: 'DB'`, `OLB: 'LB'` — is the anti-pattern the
  // service replaces. These already exist in a KNOWN, documented set of legacy files (each retained for a
  // concrete reason in SPORTS_DATA_IMAGE_AND_POSITION_POLICY.md). This test fails if a NEW file introduces the
  // signature, so competing normalization truth cannot silently spread while the governed migration proceeds.
  const COLLAPSE_SIGNATURE = /\b(DE|DT|NT):\s*'DL'|\b(CB|S|SS|FS):\s*'DB'|\b(OLB|ILB|MLB):\s*'LB'/

  // Legacy holders of the abbreviation-collapse signature (audited 5H-b2). Each is deliberately NOT migrated:
  //  - team-abbrev.ts            : de-facto shared normalizer ~40 roster-legality callers depend on (governed future migration)
  //  - idp-kicker-values.ts      : IDP VALUATION grouping → Phase 5H-c (valuation services)
  //  - idp/types.ts              : league-config IDP split↔group slot families (league-rule logic)
  //  - SportPlayerPoolResolver.ts: sport-scoped player-pool filter grouping (draft/waiver pool)
  const ALLOWLIST = new Set([
    'lib/team-abbrev.ts',
    'lib/idp-kicker-values.ts',
    'lib/idp/types.ts',
    'lib/sport-teams/SportPlayerPoolResolver.ts',
  ].map((p) => p.split('/').join(path.sep)))

  it('no NEW file outside the documented allowlist collapses detailed IDP positions to broad buckets', () => {
    // Scan source under lib/ + app/, skipping build/generated/hidden output dirs. (No git dependency, so this is
    // deterministic inside a test worker.) The governed service keeps buckets as arrays (`DL: ['DE',...]`), never
    // `DE: 'DL'`, so it is exempt by design; the allowlist holds the documented legacy collapse maps.
    const SKIP_DIR = /^(node_modules|\.next.*|\.turbo|dist|build|coverage|\.git|out|\.cache)$/
    const srcWalk = (dir: string): string[] => {
      const out: string[] = []
      if (!fs.existsSync(dir)) return out
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) { if (!SKIP_DIR.test(entry.name)) out.push(...srcWalk(path.join(dir, entry.name))) }
        else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(path.join(dir, entry.name))
      }
      return out
    }
    const offenders: string[] = []
    for (const dir of ['lib', 'app']) {
      for (const file of srcWalk(path.join(root, dir))) {
        const rel = path.relative(root, file).split(path.sep).join('/')
        if (rel.startsWith('lib/sports-data-gateway/canonical/')) continue
        if (ALLOWLIST.has(rel.split('/').join(path.sep))) continue
        if (COLLAPSE_SIGNATURE.test(fs.readFileSync(file, 'utf8'))) offenders.push(rel)
      }
    }
    expect(offenders, `NEW competing position-collapse map(s) — route through canonical/canonicalPosition.ts or add a documented allowlist reason: ${offenders.join(', ')}`).toEqual([])
  })

  it('the governed canonical position service exists and exposes the sport-isolation guard', () => {
    const src = fs.readFileSync(path.join(root, 'lib/sports-data-gateway/canonical/canonicalPosition.ts'), 'utf8')
    for (const sym of ['normalizeProviderPosition', 'deriveFantasyEligibility', 'resolveCanonicalPosition', 'isSupportedPositionSport', 'SUPPORTED_POSITION_SPORTS']) {
      expect(src.includes(`export function ${sym}`) || src.includes(`export const ${sym}`), `canonical service missing ${sym}`).toBe(true)
    }
  })
})
