'use strict'

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = process.cwd()
const nextDir = path.join(repoRoot, '.next')
const maxAttempts = 4
const retryDelayMs = 1000

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function removePath(targetPath) {
  const label = path.relative(repoRoot, targetPath)

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true })
      console.log(`[railway-clean] removed ${label}`)
      return
    } catch (err) {
      const code = err?.code
      if (code !== 'EBUSY') {
        console.warn(`[railway-clean] could not remove ${label}: ${code ?? err.message}`)
        process.exitCode = 1
        return
      }

      if (attempt < maxAttempts) {
        console.warn(
          `[railway-clean] ${label} is busy (attempt ${attempt}/${maxAttempts}); retrying in ${retryDelayMs}ms`,
        )
        sleep(retryDelayMs)
        if (!fs.existsSync(targetPath)) {
          console.log(`[railway-clean] removed ${label}`)
          return
        }
        continue
      }

      console.warn(
        `[railway-clean] ${label} is still busy after ${maxAttempts} attempts; continuing build`,
      )
    }
  }
}

if (!fs.existsSync(nextDir)) {
  console.log('[railway-clean] skip: .next is missing')
  process.exit(0)
}

removePath(nextDir)
