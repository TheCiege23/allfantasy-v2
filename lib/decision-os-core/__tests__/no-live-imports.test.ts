/**
 * Enforces the Phase 1 invariant from docs/DECISION_OS_CORE_UNIFICATION_PLAN.md §18
 * step 1: `lib/decision-os-core/` must be additive and currently unimported by any
 * live route or existing engine. This scans the two surfaces that matter — `app/`
 * (routes) and `lib/decision-os/` (the frozen, shadow-live core it sits beside) —
 * for any reference to the new module, and fails if one is found.
 *
 * This test intentionally does NOT scan `lib/decision-os-core/` itself (internal
 * cross-references between its own files, e.g. `../primitives/types`, are expected
 * and fine).
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'

const REPO_ROOT = process.cwd()
const REFERENCE_PATTERN = /decision-os-core/

function walk(dir: string, matches: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.next')) continue
    const full = path.join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full, matches)
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      const content = readFileSync(full, 'utf8')
      if (REFERENCE_PATTERN.test(content)) matches.push(full)
    }
  }
}

describe('lib/decision-os-core Phase 1 isolation', () => {
  it(
    'is not imported anywhere under app/',
    () => {
      const matches: string[] = []
      walk(path.join(REPO_ROOT, 'app'), matches)
      expect(matches).toEqual([])
    },
    90000,
  )

  it('is not imported anywhere under lib/decision-os/ (the existing frozen core)', () => {
    const matches: string[] = []
    walk(path.join(REPO_ROOT, 'lib', 'decision-os'), matches)
    expect(matches).toEqual([])
  })
})
