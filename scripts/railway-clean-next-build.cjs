'use strict'

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = process.cwd()
const nextDir = path.join(repoRoot, '.next')

function removePath(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true })
    console.log(`[railway-clean] removed ${path.relative(repoRoot, targetPath)}`)
  } catch (err) {
    console.warn(
      `[railway-clean] could not remove ${path.relative(repoRoot, targetPath)}: ${err.code ?? err.message}`,
    )
    process.exitCode = 1
  }
}

if (!fs.existsSync(nextDir)) {
  console.log('[railway-clean] skip: .next is missing')
  process.exit(0)
}

for (const entry of fs.readdirSync(nextDir, { withFileTypes: true })) {
  const targetPath = path.join(nextDir, entry.name)
  if (entry.name === 'cache') {
    removePath(path.join(targetPath, 'webpack'))
    continue
  }
  removePath(targetPath)
}
