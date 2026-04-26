#!/usr/bin/env node
/**
 * Draft room launch gate — runs non-destructive checks in sequence.
 * Does NOT run database resets or migrations.
 *
 * Environment:
 *   DRAFT_SMOKE_LEAGUE — optional. When set, appends `npm run smoke:full-draft -- --league=<id>`
 *
 * Usage (from repo root):
 *   node scripts/draft-launch-gate.mjs
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log('— Prisma validate —')
run('npx', ['prisma', 'validate'])

console.log('— TypeScript —')
run('npx', ['tsc', '--noEmit'])

console.log('— Vitest __tests__/draft/ —')
run('npx', ['vitest', 'run', '__tests__/draft/'])

const league = process.env.DRAFT_SMOKE_LEAGUE?.trim()
if (league) {
  console.log(`— smoke:full-draft (league from DRAFT_SMOKE_LEAGUE) —`)
  run('npm', ['run', 'smoke:full-draft', '--', '--league', league])
} else {
  console.log('— (skip) smoke:full-draft — set DRAFT_SMOKE_LEAGUE to include —')
}

console.log('\nDraft launch gate: OK')
