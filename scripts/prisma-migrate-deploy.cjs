const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readEnvFileValue(filePath, key) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    if (!line.startsWith(`${key}=`)) continue;
    return stripQuotes(line.slice(key.length + 1));
  }
  return null;
}

function normalizeDatabaseUrl(runtimeUrl, fileUrl) {
  const baseUrl = runtimeUrl || fileUrl;
  if (!baseUrl) {
    return { url: null, reason: "DATABASE_URL is not set" };
  }

  const cleanRuntime = runtimeUrl ? stripQuotes(runtimeUrl) : null;
  const cleanFile = fileUrl ? stripQuotes(fileUrl) : null;
  const candidate = cleanRuntime || cleanFile;

  try {
    const parsed = new URL(candidate);
    const parsedFile = cleanFile ? new URL(cleanFile) : null;

    if (
      parsed.hostname.endsWith("pooler.supabase.com") &&
      parsed.port === "6543"
    ) {
      parsed.port = "5432";
      return {
        url: parsed.toString(),
        reason: "switched Supabase pooler from :6543 to :5432",
      };
    }

    if (
      parsedFile &&
      parsedFile.hostname.endsWith("pooler.supabase.com") &&
      parsedFile.port === "6543" &&
      /^db\..+\.supabase\.co$/i.test(parsed.hostname) &&
      parsed.port === "5432"
    ) {
      parsed.hostname = parsedFile.hostname;
      parsed.port = "5432";
      parsed.username = parsedFile.username;
      parsed.password = parsedFile.password;
      parsed.pathname = parsedFile.pathname;
      if (!parsed.search && parsedFile.search) {
        parsed.search = parsedFile.search;
      }
      return {
        url: parsed.toString(),
        reason: "replaced direct Supabase host with reachable pooler host",
      };
    }

    return { url: parsed.toString(), reason: null };
  } catch {
    return { url: candidate, reason: null };
  }
}

const envPath = path.join(process.cwd(), ".env");
const fileDatabaseUrl = readEnvFileValue(envPath, "DATABASE_URL");
const runtimeDatabaseUrl = process.env.DATABASE_URL || null;

const { url: databaseUrl, reason } = normalizeDatabaseUrl(
  runtimeDatabaseUrl,
  fileDatabaseUrl
);

if (!databaseUrl) {
  console.error("db:migrate:deploy error: DATABASE_URL is missing.");
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = databaseUrl;
process.env.POSTGRES_PRISMA_URL = databaseUrl;

if (
  databaseUrl.includes("pooler.supabase.com:5432") &&
  !process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK
) {
  process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1";
}

try {
  const host = new URL(databaseUrl).host;
  if (reason) {
    console.log(`[db:migrate:deploy] Using ${host} (${reason}).`);
  } else {
    console.log(`[db:migrate:deploy] Using ${host}.`);
  }
} catch {
  if (reason) {
    console.log(`[db:migrate:deploy] ${reason}.`);
  }
}

const prismaBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma"
);

const hasLocalPrisma = fs.existsSync(prismaBin);
const command = hasLocalPrisma ? prismaBin : "npx";
const args = hasLocalPrisma
  ? ["migrate", "deploy"]
  : ["prisma", "migrate", "deploy"];

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error.message);
}

process.exit(1);
