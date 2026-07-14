/**
 * Wraps interactive `prisma` CLI subcommands (migrate dev, migrate reset, db push, db
 * seed) with a production-host refusal check, mirroring scripts/backfill-franchise-seasons.ts's
 * PROD_HOST_MARKER guard.
 *
 * Root cause this defuses: the Prisma CLI reads `.env` directly (not `.env.local`) and
 * ignores shell-exported DATABASE_URL overrides on this Windows/Git-Bash setup — confirmed
 * 2026-07-14 when an inline `DATABASE_URL=<dev> npx prisma migrate deploy` still connected to
 * prod. `.env` now points at the safe dev branch by default (see .env's own comment), so this
 * guard is defense-in-depth for whenever `.env` gets pointed at prod again, intentionally or not.
 *
 * Usage: node scripts/prisma-cli-guard.cjs <prisma subcommand and args...>
 *   e.g. node scripts/prisma-cli-guard.cjs migrate dev
 *
 * To intentionally target prod with an interactive command (rare — prefer
 * `npm run db:migrate:deploy:prod`), set ALLOW_PROD_MIGRATION=1.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const PROD_HOST_MARKER = "ep-spring-tooth";

function stripQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readEnvFileValue(filePath, key) {
  if (!fs.existsSync(filePath)) return null;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    if (!line.startsWith(`${key}=`)) continue;
    return stripQuotes(line.slice(key.length + 1));
  }
  return null;
}

function hostOf(url) {
  if (!url) return "?";
  try {
    return new URL(url.replace(/^postgres(ql)?:\/\//, "http://")).host;
  } catch {
    return "?";
  }
}

// Same resolution the real Prisma CLI uses: process.env first, else `.env` (never `.env.local`
// — that's the whole gotcha this guard exists to catch).
const envPath = path.join(process.cwd(), ".env");
function resolve(key) {
  return process.env[key] || readEnvFileValue(envPath, key) || null;
}

const directUrl = resolve("DIRECT_URL");
const databaseUrl = resolve("DATABASE_URL");
const host = hostOf(directUrl || databaseUrl);

if (host.includes(PROD_HOST_MARKER) && process.env.ALLOW_PROD_MIGRATION !== "1") {
  console.error(
    `\n[prisma-cli-guard] REFUSING — resolved DB host is production (${host}).\n` +
      `If you really mean to run an interactive Prisma command against production, set\n` +
      `ALLOW_PROD_MIGRATION=1 explicitly. For a real production migration deploy, prefer\n` +
      `\`npm run db:migrate:deploy:prod\` instead of this interactive path.\n`
  );
  process.exit(1);
}

console.log(`[prisma-cli-guard] Target host: ${host}${host.includes(PROD_HOST_MARKER) ? " (PRODUCTION — explicitly allowed)" : ""}`);

const prismaArgs = process.argv.slice(2);
const prismaBin = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
const hasLocalPrisma = fs.existsSync(prismaBin);
const command = hasLocalPrisma ? prismaBin : "npx";
const args = hasLocalPrisma ? prismaArgs : ["prisma", ...prismaArgs];

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(typeof result.status === "number" ? result.status : 1);
