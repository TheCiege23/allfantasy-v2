'use strict'

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = process.cwd()
const webpackCacheDir = path.join(repoRoot, '.next', 'cache', 'webpack')

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

if (!fs.existsSync(webpackCacheDir)) {
  console.log('[railway-clean] skip: .next/cache/webpack is missing')
  process.exit(0)
}

removePath(webpackCacheDir)
