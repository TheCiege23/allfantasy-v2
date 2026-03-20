#!/usr/bin/env node
const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")

function readEnvVarFromDotEnv(key) {
  try {
    const envPath = path.resolve(process.cwd(), ".env")
    const raw = fs.readFileSync(envPath, "utf8")
    const line = raw
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${key}=`))
    if (!line) return undefined
    return line.slice(key.length + 1).trim()
  } catch {
    return undefined
  }
}

function normalizeSupabaseSessionPooler(url) {
  if (!url) return url
  return url.replace(":6543", ":5432")
}

function resolvePort() {
  const idx = process.argv.findIndex((arg) => arg === "--port")
  if (idx >= 0 && process.argv[idx + 1]) {
    return String(process.argv[idx + 1])
  }
  if (process.env.PLAYWRIGHT_PORT) return String(process.env.PLAYWRIGHT_PORT)
  return "3000"
}

const port = resolvePort()
const envDb = process.env.DATABASE_URL || readEnvVarFromDotEnv("DATABASE_URL")
const normalizedDb = normalizeSupabaseSessionPooler(envDb)
const childEnv = {
  ...process.env,
  ...(normalizedDb ? { DATABASE_URL: normalizedDb } : {}),
}

const child = spawn("npm", ["run", "dev", "--", "-p", port], {
  stdio: "inherit",
  env: childEnv,
  shell: true,
})

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code == null ? 1 : code)
})
