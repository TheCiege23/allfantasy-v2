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

function hasSupportedPostgresScheme(value) {
  return /^(postgres|postgresql):\/\//i.test(value.trim());
}

function readCandidate(envRuntime, envFile, key) {
  const runtime = envRuntime[key] ? stripQuotes(envRuntime[key]) : null;
  const file = envFile[key] ? stripQuotes(envFile[key]) : null;
  return { runtime, file };
}

function selectDatabaseUrl(envRuntime, envFile) {
  const preferenceOrder = [
    "DIRECT_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_URL",
    "DATABASE_URL",
    "POSTGRES_PRISMA_URL",
  ];

  const invalid = [];
  let selected = null;

  for (const key of preferenceOrder) {
    const candidate = readCandidate(envRuntime, envFile, key);
    const value = candidate.runtime || candidate.file;
    if (!value) continue;
    if (!hasSupportedPostgresScheme(value)) {
      invalid.push(`${key} uses unsupported scheme`);
      continue;
    }
    selected = { key, value };
    break;
  }

  if (!selected) {
    return {
      url: null,
      reason: invalid.length > 0 ? invalid.join("; ") : "No valid Postgres database URL was found in env",
    };
  }

  const poolerCandidate =
    preferenceOrder
      .map((key) => ({ key, ...readCandidate(envRuntime, envFile, key) }))
      .flatMap((entry) => [entry.runtime, entry.file].filter(Boolean))
      .find((value) => {
        if (!value || !hasSupportedPostgresScheme(value)) return false;
        try {
          const parsed = new URL(value);
          return parsed.hostname.endsWith("pooler.supabase.com") && parsed.port === "6543";
        } catch {
          return false;
        }
      }) || null;

  return normalizeDatabaseUrl(selected.value, poolerCandidate, selected.key);
}

function normalizeDatabaseUrl(candidate, poolerUrl, sourceKey) {
  if (!candidate) {
    return { url: null, reason: "DATABASE_URL is not set" };
  }

  try {
    const parsed = new URL(candidate);
    const parsedPooler = poolerUrl ? new URL(poolerUrl) : null;

    if (
      parsed.hostname.endsWith("pooler.supabase.com") &&
      parsed.port === "6543"
    ) {
      parsed.port = "5432";
      return {
        url: parsed.toString(),
        reason: `${sourceKey}: switched Supabase pooler from :6543 to :5432`,
      };
    }

    if (
      parsedPooler &&
      parsedPooler.hostname.endsWith("pooler.supabase.com") &&
      parsedPooler.port === "6543" &&
      /^db\..+\.supabase\.co$/i.test(parsed.hostname) &&
      parsed.port === "5432"
    ) {
      parsed.hostname = parsedPooler.hostname;
      parsed.port = "5432";
      parsed.username = parsedPooler.username;
      parsed.password = parsedPooler.password;
      parsed.pathname = parsedPooler.pathname;
      if (!parsed.search && parsedPooler.search) {
        parsed.search = parsedPooler.search;
      }
      return {
        url: parsed.toString(),
        reason: `${sourceKey}: replaced direct Supabase host with reachable pooler host`,
      };
    }

    return { url: parsed.toString(), reason: `${sourceKey}: using valid Postgres URL` };
  } catch (error) {
    return {
      url: null,
      reason: `${sourceKey}: failed to parse database URL (${error instanceof Error ? error.message : String(error)})`,
    };
  }
}

const envPath = path.join(process.cwd(), ".env");
const envKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
];
const fileEnv = Object.fromEntries(
  envKeys.map((key) => [key, readEnvFileValue(envPath, key)])
);
const runtimeEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key] || null])
);

const { url: databaseUrl, reason } = selectDatabaseUrl(runtimeEnv, fileEnv);

if (!databaseUrl) {
  console.error(`db:migrate:deploy error: ${reason || "No valid database URL found."}`);
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
const recoverableFailedMigrations = new Set([
  "20260363000000_add_ai_memory_and_chat_history",
  "20260401000000_add_devy_c2c_rollout_foundation",
]);

function buildArgs(prismaArgs) {
  return hasLocalPrisma ? prismaArgs : ["prisma", ...prismaArgs];
}

function runPrisma(prismaArgs) {
  return spawnSync(command, buildArgs(prismaArgs), {
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
    shell: process.platform === "win32",
  });
}

function writeOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

let result = runPrisma(["migrate", "deploy"]);
writeOutput(result);

function outputMentionsFailedMigration(output, migrationName) {
  return (
    output.includes(`Migration name: ${migrationName}`) ||
    output.includes(`The \`${migrationName}\` migration`) ||
    output.includes(migrationName)
  );
}

function extractFailedMigrationName(output) {
  const migrationNameMatch = output.match(/Migration name:\s*([^\s]+)/);
  if (migrationNameMatch?.[1]) return migrationNameMatch[1];

  const failedMigrationMatch = output.match(/The `([^`]+)` migration/);
  if (failedMigrationMatch?.[1]) return failedMigrationMatch[1];

  for (const migrationName of recoverableFailedMigrations) {
    if (outputMentionsFailedMigration(output, migrationName)) {
      return migrationName;
    }
  }

  return null;
}

const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const failedMigrationName = extractFailedMigrationName(output);
const shouldRetryFailedMigration =
  typeof result.status === "number" &&
  result.status !== 0 &&
  (output.includes("P3018") || output.includes("P3009")) &&
  !!failedMigrationName &&
  recoverableFailedMigrations.has(failedMigrationName);

if (shouldRetryFailedMigration && failedMigrationName) {
  console.warn(
    `[db:migrate:deploy] Detected failed migration ${failedMigrationName}; marking it rolled back and retrying deploy once.`
  );

  const resolveResult = runPrisma([
    "migrate",
    "resolve",
    "--rolled-back",
    failedMigrationName,
  ]);
  writeOutput(resolveResult);

  if (resolveResult.status === 0) {
    result = runPrisma(["migrate", "deploy"]);
    writeOutput(result);
  } else {
    process.exit(typeof resolveResult.status === "number" ? resolveResult.status : 1);
  }
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error.message);
}

process.exit(1);
