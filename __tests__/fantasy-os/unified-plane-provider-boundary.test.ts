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

describe('5H — gateway provider access is intentional and confined to the data plane', () => {
  // Audited exceptions: 3 Sleeper ingestion runtimes fetch directly, each marked `db-first-exception`. Any
  // provider access inside a gateway runtime module MUST carry that marker (intentional) — an unmarked fetch
  // would be an accidental bypass. Product/Decision-OS runtime remains provider-agnostic (asserted above).
  it('any provider URL in a gateway runtime module is an explicit, marked db-first-exception (no accidental fetch)', () => {
    for (const file of walk(path.join(root, 'lib/sports-data-gateway/runtime'))) {
      const src = fs.readFileSync(file, 'utf8')
      if (!FORBIDDEN_URL.test(src)) continue
      expect(/db-first-exception/.test(src), `${path.relative(root, file)} hits a provider URL WITHOUT a db-first-exception marker`).toBe(true)
    }
  })
  it('the three certified provider adapters exist (ESPN, Sleeper, FantasyCalc)', () => {
    for (const p of ['espn', 'sleeper', 'fantasycalc']) {
      expect(fs.existsSync(path.join(root, `lib/sports-data-gateway/providers/${p}.ts`)), `${p} adapter missing`).toBe(true)
    }
  })
})
