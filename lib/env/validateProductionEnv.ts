/**
 * Unified production environment validator.
 *
 * Call at startup (instrumentation.ts) to surface missing required vars
 * before the first request is served.  Safe to call in any runtime —
 * throws only in production when required vars are absent (and never
 * during the Next.js build phase).
 *
 * Pass an explicit `env` object in tests so no global state is mutated.
 * Never logs or returns secret values — only presence/absence indicators.
 */

import { hasDatabaseUrl } from './database-url'

// ── Required var specs ────────────────────────────────────────────────────────

interface RequiredVarSpec {
  /** Env keys tried in order; first non-empty value wins. */
  keys: readonly string[]
  /** Human-readable label used in error messages. */
  label: string
  /** Extra validation run after presence check. */
  validate?: (value: string) => boolean
  /** Message shown when `validate` returns false. */
  validationMessage?: string
}

const REQUIRED_SPECS: RequiredVarSpec[] = [
  // Database URL is handled separately via hasDatabaseUrl (multi-key + scheme check).
  {
    keys: ['NEXTAUTH_SECRET'],
    label: 'NextAuth session secret (NEXTAUTH_SECRET)',
    validate: (v) => v.length >= 16 && v !== 'replace-with-secure-random',
    validationMessage:
      'NEXTAUTH_SECRET must be ≥16 characters and must not be the placeholder value. ' +
      'Generate one with: openssl rand -base64 32',
  },
  {
    keys: ['NEXTAUTH_URL'],
    label: 'NextAuth canonical URL (NEXTAUTH_URL)',
    validate: (v) => /^https?:\/\//i.test(v.trim()),
    validationMessage: 'NEXTAUTH_URL must be a valid http(s):// URL (e.g. https://www.allfantasy.ai).',
  },
]

// ── Optional var specs ────────────────────────────────────────────────────────

interface OptionalVarSpec {
  keys: readonly string[]
  label: string
  /** Emit a warning when absent and NODE_ENV=production. */
  warnInProduction: boolean
}

const OPTIONAL_SPECS: OptionalVarSpec[] = [
  {
    keys: ['UPSTASH_REDIS_REST_URL', 'REDIS_URL'],
    label: 'Redis (distributed draft locks + BullMQ queues) — set UPSTASH_REDIS_REST_URL or REDIS_URL',
    warnInProduction: true,
  },
  {
    keys: ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN'],
    label: 'Sentry error tracking — set SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN',
    warnInProduction: false, // intentionally optional
  },
  {
    keys: [
      'OPENAI_API_KEY',
      'AI_INTEGRATIONS_OPENAI_API_KEY',
      'DEEPSEEK_API_KEY',
      'XAI_API_KEY',
      'GROK_API_KEY',
    ],
    label: 'AI provider key — set OPENAI_API_KEY, DEEPSEEK_API_KEY, or XAI_API_KEY',
    warnInProduction: true,
  },
  {
    keys: ['RESEND_API_KEY'],
    label: 'Email delivery (RESEND_API_KEY) — required for password-reset emails',
    warnInProduction: true,
  },
  {
    keys: ['STRIPE_SECRET_KEY'],
    label: 'Stripe billing (STRIPE_SECRET_KEY)',
    warnInProduction: false,
  },
]

// ── Output types ──────────────────────────────────────────────────────────────

export interface EnvFeatureStatus {
  /** UPSTASH_REDIS_REST_URL or REDIS_URL is present. */
  redis: boolean
  /** Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are present (Upstash REST needs both). */
  redisFull: boolean
  sentry: boolean
  aiProviders: boolean
  email: boolean
  stripe: boolean
}

export interface EnvValidationResult {
  /** True when all required vars are present and pass validation. */
  valid: boolean
  /** Blocking issues — must be resolved before serving production traffic. */
  errors: string[]
  /** Non-blocking advisories — degrade features but do not break core flows. */
  warnings: string[]
  /** Feature availability snapshot (no secret values). */
  features: EnvFeatureStatus
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveFirst(keys: readonly string[], env: Record<string, string | undefined>): string {
  for (const key of keys) {
    const val = (env[key] ?? '').trim()
    if (val) return val
  }
  return ''
}

function anyPresent(keys: readonly string[], env: Record<string, string | undefined>): boolean {
  return keys.some((k) => !!(env[k] ?? '').trim())
}

// ── Core validator ────────────────────────────────────────────────────────────

/**
 * Validate the given env map (defaults to `process.env`).
 *
 * Accepts an explicit env argument so tests can validate arbitrary configs
 * without mutating global state.
 */
export function validateProductionEnv(
  env: Record<string, string | undefined> = process.env
): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const isProduction = (env.NODE_ENV ?? '').toLowerCase() === 'production'

  // ── Required: database (multi-key + scheme check via hasDatabaseUrl) ───────
  if (!hasDatabaseUrl(env)) {
    errors.push(
      'Database URL is missing or has an invalid scheme. ' +
        'Set DATABASE_URL (or a provider alias: POSTGRES_PRISMA_URL, POSTGRES_URL, ' +
        'NEON_DATABASE_URL) to a postgres:// or postgresql:// connection string.'
    )
  }

  // ── Required: other specs ─────────────────────────────────────────────────
  for (const spec of REQUIRED_SPECS) {
    const value = resolveFirst(spec.keys, env)

    if (!value) {
      errors.push(`${spec.label} is missing. Set ${spec.keys[0]}.`)
      continue
    }

    if (spec.validate && !spec.validate(value)) {
      errors.push(spec.validationMessage ?? `${spec.label} has an invalid value.`)
    }
  }

  // ── Optional: production warnings ─────────────────────────────────────────
  if (isProduction) {
    for (const spec of OPTIONAL_SPECS) {
      if (spec.warnInProduction && !anyPresent(spec.keys, env)) {
        warnings.push(`[optional] ${spec.label}`)
      }
    }

    // Conditional: Upstash token required alongside URL for REST client
    const hasUpstashUrl = !!(env.UPSTASH_REDIS_REST_URL ?? '').trim()
    const hasUpstashToken = !!(env.UPSTASH_REDIS_REST_TOKEN ?? '').trim()
    if (hasUpstashUrl && !hasUpstashToken) {
      warnings.push(
        'UPSTASH_REDIS_REST_URL is set but UPSTASH_REDIS_REST_TOKEN is missing. ' +
          'Distributed lock acquisition will fail — draft pick races fall back to ' +
          'optimistic DB locking only.'
      )
    }
  }

  // ── Feature snapshot (presence only) ──────────────────────────────────────
  const hasUpstashUrl = !!(env.UPSTASH_REDIS_REST_URL ?? '').trim()
  const hasUpstashToken = !!(env.UPSTASH_REDIS_REST_TOKEN ?? '').trim()

  const features: EnvFeatureStatus = {
    redis: anyPresent(['UPSTASH_REDIS_REST_URL', 'REDIS_URL'], env),
    redisFull: hasUpstashUrl && hasUpstashToken,
    sentry: anyPresent(['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN'], env),
    aiProviders: anyPresent(
      ['OPENAI_API_KEY', 'AI_INTEGRATIONS_OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'XAI_API_KEY', 'GROK_API_KEY'],
      env
    ),
    email: !!(env.RESEND_API_KEY ?? '').trim(),
    stripe: !!(env.STRIPE_SECRET_KEY ?? '').trim(),
  }

  return { valid: errors.length === 0, errors, warnings, features }
}

// ── Startup asserter ──────────────────────────────────────────────────────────

const BUILD_PHASE_NOOP: EnvValidationResult = {
  valid: true,
  errors: [],
  warnings: [],
  features: {
    redis: false,
    redisFull: false,
    sentry: false,
    aiProviders: false,
    email: false,
    stripe: false,
  },
}

/**
 * Run validation and emit structured output.  Throws in production when
 * required vars are absent so the deployment fails fast and clearly.
 *
 * In development/test, only logs — never throws — so `npm run dev` works
 * without a full production env configured.
 *
 * Accepts an optional `env` for deterministic unit testing without
 * mutating `process.env`.
 */
export function assertProductionEnv(options?: {
  /** Override throw-on-error behaviour. Defaults to `NODE_ENV === 'production'`. */
  throwOnError?: boolean
  logger?: Pick<Console, 'warn' | 'error'>
  /** Env map to validate (defaults to `process.env`). Useful in tests. */
  env?: Record<string, string | undefined>
}): EnvValidationResult {
  // Skip entirely during Next.js build phase — vars are only injected at runtime.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return BUILD_PHASE_NOOP
  }

  const logger = options?.logger ?? console
  const env = options?.env ?? process.env
  const throwOnError = options?.throwOnError ?? process.env.NODE_ENV === 'production'

  const result = validateProductionEnv(env)

  for (const w of result.warnings) {
    logger.warn(`[EnvValidation][warn] ${w}`)
  }

  if (!result.valid) {
    const lines = result.errors.map((e) => `  • ${e}`).join('\n')
    const message =
      `[EnvValidation] Required environment variables are missing or invalid:\n${lines}\n` +
      `Fix these before deploying to production. ` +
      `See docs/deployment.md for the full env var reference.`

    if (throwOnError) throw new Error(message)
    logger.error(message)
  }

  return result
}
