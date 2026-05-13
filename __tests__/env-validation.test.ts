/**
 * Production environment validator — unit tests.
 *
 * All tests that exercise `validateProductionEnv` pass an explicit env object
 * so global process.env is never mutated.  `assertProductionEnv` tests use
 * the `env` option for the same reason.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  validateProductionEnv,
  assertProductionEnv,
} from '@/lib/env/validateProductionEnv'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal valid production env — all required vars set, no optional vars. */
function minimalProdEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pw@localhost:5432/testdb',
    NEXTAUTH_SECRET: 'supersecret-at-least-sixteen',
    NEXTAUTH_URL: 'https://www.example.com',
  }
}

/** Same as above but NODE_ENV=development. */
function minimalDevEnv(): Record<string, string | undefined> {
  return { ...minimalProdEnv(), NODE_ENV: 'development' }
}

// ── validateProductionEnv ─────────────────────────────────────────────────────

describe('validateProductionEnv', () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns valid:true when all required vars are correct', () => {
    const result = validateProductionEnv(minimalProdEnv())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns an EnvValidationResult with the expected shape', () => {
    const result = validateProductionEnv(minimalProdEnv())
    expect(result).toMatchObject({
      valid: expect.any(Boolean),
      errors: expect.any(Array),
      warnings: expect.any(Array),
      features: expect.objectContaining({
        redis: expect.any(Boolean),
        redisFull: expect.any(Boolean),
        sentry: expect.any(Boolean),
        aiProviders: expect.any(Boolean),
        email: expect.any(Boolean),
        stripe: expect.any(Boolean),
      }),
    })
  })

  // ── Database URL ───────────────────────────────────────────────────────────

  it('errors when no DATABASE_URL variant is present', () => {
    const env = minimalProdEnv()
    delete env.DATABASE_URL
    const result = validateProductionEnv(env)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('database url'))).toBe(true)
  })

  it('errors when DATABASE_URL has an invalid scheme (prisma://)', () => {
    const env = {
      ...minimalProdEnv(),
      DATABASE_URL: 'prisma://accelerate.prisma-data.net/xyz',
    }
    const result = validateProductionEnv(env)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('database url'))).toBe(true)
  })

  it('accepts POSTGRES_PRISMA_URL as a DATABASE_URL alias', () => {
    const env = minimalProdEnv()
    delete env.DATABASE_URL
    env.POSTGRES_PRISMA_URL = 'postgresql://user:pw@pooler.neon.tech/testdb'
    const result = validateProductionEnv(env)
    expect(result.errors.some((e) => e.toLowerCase().includes('database url'))).toBe(false)
  })

  it('accepts NEON_DATABASE_URL as a DATABASE_URL alias', () => {
    const env = minimalProdEnv()
    delete env.DATABASE_URL
    env.NEON_DATABASE_URL = 'postgresql://user:pw@ep-abc.us-east-1.aws.neon.tech/testdb'
    const result = validateProductionEnv(env)
    expect(result.errors.some((e) => e.toLowerCase().includes('database url'))).toBe(false)
  })

  // ── NEXTAUTH_SECRET ────────────────────────────────────────────────────────

  it('errors when NEXTAUTH_SECRET is absent', () => {
    const env = minimalProdEnv()
    delete env.NEXTAUTH_SECRET
    const result = validateProductionEnv(env)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('NEXTAUTH_SECRET'))).toBe(true)
  })

  it('errors when NEXTAUTH_SECRET is the placeholder value', () => {
    const env = { ...minimalProdEnv(), NEXTAUTH_SECRET: 'replace-with-secure-random' }
    const result = validateProductionEnv(env)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('NEXTAUTH_SECRET'))).toBe(true)
  })

  it('errors when NEXTAUTH_SECRET is shorter than 16 characters', () => {
    const env = { ...minimalProdEnv(), NEXTAUTH_SECRET: 'tooshort' }
    const result = validateProductionEnv(env)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('NEXTAUTH_SECRET'))).toBe(true)
  })

  it('accepts a 16-character NEXTAUTH_SECRET', () => {
    const env = { ...minimalProdEnv(), NEXTAUTH_SECRET: 'exactly16chars!!' }
    const result = validateProductionEnv(env)
    expect(result.errors.some((e) => e.includes('NEXTAUTH_SECRET'))).toBe(false)
  })

  // ── NEXTAUTH_URL ───────────────────────────────────────────────────────────

  it('errors when NEXTAUTH_URL is absent', () => {
    const env = minimalProdEnv()
    delete env.NEXTAUTH_URL
    const result = validateProductionEnv(env)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('NEXTAUTH_URL'))).toBe(true)
  })

  it('errors when NEXTAUTH_URL lacks an http/https scheme', () => {
    const env = { ...minimalProdEnv(), NEXTAUTH_URL: 'example.com' }
    const result = validateProductionEnv(env)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('NEXTAUTH_URL'))).toBe(true)
  })

  it('accepts https:// NEXTAUTH_URL', () => {
    const env = { ...minimalProdEnv(), NEXTAUTH_URL: 'https://www.example.com' }
    const result = validateProductionEnv(env)
    expect(result.errors.some((e) => e.includes('NEXTAUTH_URL'))).toBe(false)
  })

  it('accepts http:// NEXTAUTH_URL (valid in dev/staging)', () => {
    const env = { ...minimalProdEnv(), NEXTAUTH_URL: 'http://127.0.0.1:3000' }
    const result = validateProductionEnv(env)
    expect(result.errors.some((e) => e.includes('NEXTAUTH_URL'))).toBe(false)
  })

  // ── Optional warnings — production only ────────────────────────────────────

  it('warns about missing Redis when NODE_ENV=production', () => {
    const result = validateProductionEnv(minimalProdEnv())
    expect(result.warnings.some((w) => w.toLowerCase().includes('redis'))).toBe(true)
  })

  it('warns about missing AI provider key when NODE_ENV=production', () => {
    const result = validateProductionEnv(minimalProdEnv())
    expect(result.warnings.some((w) => w.toLowerCase().includes('ai provider'))).toBe(true)
  })

  it('warns about missing RESEND_API_KEY when NODE_ENV=production', () => {
    const result = validateProductionEnv(minimalProdEnv())
    expect(result.warnings.some((w) => w.toLowerCase().includes('resend'))).toBe(true)
  })

  it('emits NO optional warnings when NODE_ENV=development', () => {
    const result = validateProductionEnv(minimalDevEnv())
    expect(result.warnings).toHaveLength(0)
  })

  it('warns when UPSTASH_REDIS_REST_URL is set but UPSTASH_REDIS_REST_TOKEN is missing', () => {
    const env = {
      ...minimalProdEnv(),
      UPSTASH_REDIS_REST_URL: 'https://us1-xxx.upstash.io',
      // UPSTASH_REDIS_REST_TOKEN intentionally absent
    }
    const result = validateProductionEnv(env)
    expect(result.warnings.some((w) => w.includes('UPSTASH_REDIS_REST_TOKEN'))).toBe(true)
  })

  it('does NOT warn about Upstash token when UPSTASH_REDIS_REST_URL is absent', () => {
    const result = validateProductionEnv(minimalProdEnv())
    expect(result.warnings.some((w) => w.includes('UPSTASH_REDIS_REST_TOKEN'))).toBe(false)
  })

  it('does NOT warn about Upstash token when both URL and token are set', () => {
    const env = {
      ...minimalProdEnv(),
      UPSTASH_REDIS_REST_URL: 'https://us1-xxx.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'AXXXtoken',
    }
    const result = validateProductionEnv(env)
    expect(result.warnings.some((w) => w.includes('UPSTASH_REDIS_REST_TOKEN'))).toBe(false)
  })

  // ── Feature snapshot ───────────────────────────────────────────────────────

  it('features.redis is false when no Redis var is set', () => {
    const result = validateProductionEnv(minimalProdEnv())
    expect(result.features.redis).toBe(false)
  })

  it('features.redis is true when REDIS_URL is set', () => {
    const env = { ...minimalProdEnv(), REDIS_URL: 'redis://localhost:6379' }
    const result = validateProductionEnv(env)
    expect(result.features.redis).toBe(true)
  })

  it('features.redisFull is true only when both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set', () => {
    const full = {
      ...minimalProdEnv(),
      UPSTASH_REDIS_REST_URL: 'https://us1-xxx.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'AXXXtoken',
    }
    const urlOnly = { ...minimalProdEnv(), UPSTASH_REDIS_REST_URL: 'https://us1-xxx.upstash.io' }

    expect(validateProductionEnv(full).features.redisFull).toBe(true)
    expect(validateProductionEnv(urlOnly).features.redisFull).toBe(false)
    expect(validateProductionEnv(minimalProdEnv()).features.redisFull).toBe(false)
  })

  it('features.sentry is true when SENTRY_DSN is set', () => {
    const env = { ...minimalProdEnv(), SENTRY_DSN: 'https://key@o123.ingest.sentry.io/456' }
    expect(validateProductionEnv(env).features.sentry).toBe(true)
  })

  it('features.sentry is true when NEXT_PUBLIC_SENTRY_DSN is set', () => {
    const env = { ...minimalProdEnv(), NEXT_PUBLIC_SENTRY_DSN: 'https://key@o123.ingest.sentry.io/456' }
    expect(validateProductionEnv(env).features.sentry).toBe(true)
  })

  it('features.aiProviders is true when OPENAI_API_KEY is set', () => {
    const env = { ...minimalProdEnv(), OPENAI_API_KEY: 'sk-test' }
    expect(validateProductionEnv(env).features.aiProviders).toBe(true)
  })

  it('features.aiProviders is true when only XAI_API_KEY is set', () => {
    const env = { ...minimalProdEnv(), XAI_API_KEY: 'xai-test' }
    expect(validateProductionEnv(env).features.aiProviders).toBe(true)
  })

  it('features.aiProviders is false when no AI provider key is set', () => {
    expect(validateProductionEnv(minimalProdEnv()).features.aiProviders).toBe(false)
  })

  it('features.email is true when RESEND_API_KEY is set', () => {
    const env = { ...minimalProdEnv(), RESEND_API_KEY: 're_abc' }
    expect(validateProductionEnv(env).features.email).toBe(true)
  })

  it('features.stripe is true when STRIPE_SECRET_KEY is set', () => {
    const env = { ...minimalProdEnv(), STRIPE_SECRET_KEY: 'sk_test_abc' }
    expect(validateProductionEnv(env).features.stripe).toBe(true)
  })

  // ── Multiple errors ────────────────────────────────────────────────────────

  it('collects all errors in a single pass (does not short-circuit)', () => {
    const env: Record<string, string | undefined> = {
      NODE_ENV: 'production',
      // DATABASE_URL absent
      // NEXTAUTH_SECRET absent
      // NEXTAUTH_URL absent
    }
    const result = validateProductionEnv(env)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})

// ── assertProductionEnv ────────────────────────────────────────────────────────

describe('assertProductionEnv', () => {
  const silentLogger = { warn: vi.fn(), error: vi.fn() }

  it('throws when throwOnError:true and required vars are missing', () => {
    const badEnv: Record<string, string | undefined> = {
      NODE_ENV: 'production',
      // All required vars absent
    }
    expect(() =>
      assertProductionEnv({ throwOnError: true, env: badEnv, logger: silentLogger })
    ).toThrow(/Required environment variables/)
  })

  it('does NOT throw when throwOnError:false even if vars are missing', () => {
    const badEnv: Record<string, string | undefined> = { NODE_ENV: 'production' }
    expect(() =>
      assertProductionEnv({ throwOnError: false, env: badEnv, logger: silentLogger })
    ).not.toThrow()
  })

  it('logs errors via the provided logger when throwOnError is false', () => {
    const logger = { warn: vi.fn(), error: vi.fn() }
    const badEnv: Record<string, string | undefined> = { NODE_ENV: 'production' }
    assertProductionEnv({ throwOnError: false, env: badEnv, logger })
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Required environment variables')
    )
  })

  it('logs production warnings via the provided logger', () => {
    const logger = { warn: vi.fn(), error: vi.fn() }
    // env has all required vars but no optional vars → warnings in prod
    assertProductionEnv({ throwOnError: false, env: minimalProdEnv(), logger })
    expect(logger.warn).toHaveBeenCalled()
  })

  it('does NOT log warnings in dev even without optional vars', () => {
    const logger = { warn: vi.fn(), error: vi.fn() }
    assertProductionEnv({ throwOnError: false, env: minimalDevEnv(), logger })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('returns a valid result when all required vars are present', () => {
    const logger = { warn: vi.fn(), error: vi.fn() }
    const result = assertProductionEnv({
      throwOnError: false,
      env: minimalProdEnv(),
      logger,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns an EnvValidationResult with correct shape', () => {
    const logger = { warn: vi.fn(), error: vi.fn() }
    const result = assertProductionEnv({ throwOnError: false, env: {}, logger })
    expect(result).toMatchObject({
      valid: expect.any(Boolean),
      errors: expect.any(Array),
      warnings: expect.any(Array),
      features: expect.objectContaining({
        redis: expect.any(Boolean),
        redisFull: expect.any(Boolean),
        sentry: expect.any(Boolean),
      }),
    })
  })

  it('does not throw during Next.js build phase regardless of env', () => {
    const originalPhase = process.env.NEXT_PHASE
    process.env.NEXT_PHASE = 'phase-production-build'
    try {
      expect(() =>
        assertProductionEnv({ throwOnError: true })
      ).not.toThrow()
    } finally {
      if (originalPhase === undefined) {
        delete process.env.NEXT_PHASE
      } else {
        process.env.NEXT_PHASE = originalPhase
      }
    }
  })
})
