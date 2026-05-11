/**
 * Remove production Next output dirs before `npm run build`.
 * Safe allow-list: only `.next` and `.next-build-fix` under repo root.
 */

const fs = require('fs')
const path = require('path')

const repoRoot = process.cwd()
const DIRS = ['.next', '.next-build-fix']

function safeRm(rel) {
  const target = path.join(repoRoot, rel)
  try {
    if (!fs.existsSync(target)) {
      console.log(`[clean-next-prod-out] skip (missing): ${rel}`)
      return
    }
    fs.rmSync(target, { recursive: true, force: true })
    console.log(`[clean-next-prod-out] removed ${rel}`)
  } catch (err) {
    console.warn(`[clean-next-prod-out] could not remove ${rel}: ${err.code ?? err.message}`)
    process.exitCode = 1
  }
}

for (const d of DIRS) safeRm(d)
