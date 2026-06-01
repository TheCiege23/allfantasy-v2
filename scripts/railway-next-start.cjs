'use strict'

const { spawn } = require('node:child_process')
const path = require('node:path')

const port = process.env.PORT || '3000'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')

const child = spawn(process.execPath, [nextBin, 'start', '-p', port, '-H', hostname], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
})

function forward(signal) {
  if (!child.killed) child.kill(signal)
}

process.on('SIGTERM', () => forward('SIGTERM'))
process.on('SIGINT', () => forward('SIGINT'))

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
