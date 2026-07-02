#!/usr/bin/env node
const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")

const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
]

const ENV_FILES = [".env.local", ".env"]

function readEnvFile(fileName) {
  try {
    const envPath = path.resolve(process.cwd(), fileName)
    const raw = fs.readFileSync(envPath, "utf8")
    const entries = {}

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const withoutExport = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed
      const equalsIndex = withoutExport.indexOf("=")
      if (equalsIndex <= 0) continue

      const key = withoutExport.slice(0, equalsIndex).trim()
      const rawValue = withoutExport.slice(equalsIndex + 1).trim()
      const unquoted =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ? rawValue.slice(1, -1)
          : rawValue

      entries[key] = unquoted
    }

    return entries
  } catch {
    return {}
  }
}

function resolveDatabaseUrl() {
  for (const key of DATABASE_ENV_KEYS) {
    const value = process.env[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }

  for (const fileName of ENV_FILES) {
    const fileEnv = readEnvFile(fileName)
    for (const key of DATABASE_ENV_KEYS) {
      const value = fileEnv[key]
      if (typeof value === "string" && value.trim()) return value.trim()
    }
  }

  return undefined
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
const envDb = resolveDatabaseUrl()
const normalizedDb = normalizeSupabaseSessionPooler(envDb)
const distDir = process.env.AF_NEXT_DIST_DIR || process.env.PLAYWRIGHT_DIST_DIR || `.next-playwright-${port}`
const childEnv = {
  ...process.env,
  ...(normalizedDb ? { DATABASE_URL: normalizedDb } : {}),
  AF_NEXT_DIST_DIR: distDir,
  AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || "true",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || `http://127.0.0.1:${port}`,
  NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=4096",
  PORT: port,
}

/**
 * Playwright `webServer.url` (see playwright.config.ts) waits on a real
 * `/_next/static/chunks/*.js` URL — not only `/` — before tests run.
 */

const cleaner = spawn(process.execPath, ["scripts/clean-next-dev.cjs"], {
  stdio: "inherit",
  env: childEnv,
})

cleaner.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  if (code !== 0) process.exit(code == null ? 1 : code)

  const nextBin = path.resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next")
  const child = spawn(process.execPath, [nextBin, "dev", "-p", port, "--hostname", "127.0.0.1"], {
    stdio: "inherit",
    env: childEnv,
  })

  child.on("exit", (childCode, childSignal) => {
    if (childSignal) process.kill(process.pid, childSignal)
    process.exit(childCode == null ? 1 : childCode)
  })
})
