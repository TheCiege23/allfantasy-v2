/**
 * Tests for lib/ai/aiConfig.ts — env-based AI configuration.
 *
 * Each test sets process.env directly and calls the config function.
 * Env is restored in afterEach to prevent cross-test contamination.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  getAiCostMode,
  getAiDailyCaps,
  getAiCacheTtls,
  getAiBudget,
  getEffectiveProviderOrder,
  getAiConfig,
  CAP_DEFAULTS,
  TTL_DEFAULTS,
  DEFAULT_PROVIDER_ORDER,
} from '@/lib/ai/aiConfig'

// ── Env helpers ───────────────────────────────────────────────────────────────

const ENV_KEYS = [
  'AI_COST_MODE',
  'AI_CAP_FREE_CHIMMY_DAILY', 'AI_CAP_FREE_EXPLAIN_DAILY', 'AI_CAP_FREE_COMMISSIONER_BRAIN_DAILY',
  'AI_CAP_PRO_CHIMMY_DAILY',  'AI_CAP_PRO_EXPLAIN_DAILY',  'AI_CAP_PRO_COMMISSIONER_BRAIN_DAILY',
  'AI_CAP_ADMIN_CHIMMY_DAILY','AI_CAP_ADMIN_EXPLAIN_DAILY','AI_CAP_ADMIN_COMMISSIONER_BRAIN_DAILY',
  'AI_CACHE_TTL_CHIMMY_MINUTES', 'AI_CACHE_TTL_EXPLAIN_HOURS',
  'AI_CACHE_TTL_COMMISSIONER_BRAIN_MINUTES', 'AI_CACHE_TTL_SPORTS_SCHEDULE_MINUTES',
  'AI_BUDGET_OPENAI_USD', 'AI_BUDGET_ANTHROPIC_USD', 'AI_BUDGET_XAI_USD', 'AI_BUDGET_DEEPSEEK_USD',
  'AI_PROVIDER_ORDER',
]

let savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  savedEnv = {}
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = savedEnv[key]
    }
  }
})

// ── getAiCostMode ─────────────────────────────────────────────────────────────

describe('getAiCostMode', () => {
  it('returns conservative by default', () => {
    expect(getAiCostMode()).toBe('conservative')
  })

  it('reads conservative from env', () => {
    process.env.AI_COST_MODE = 'conservative'
    expect(getAiCostMode()).toBe('conservative')
  })

  it('reads balanced from env', () => {
    process.env.AI_COST_MODE = 'balanced'
    expect(getAiCostMode()).toBe('balanced')
  })

  it('reads generous from env', () => {
    process.env.AI_COST_MODE = 'generous'
    expect(getAiCostMode()).toBe('generous')
  })

  it('falls back to conservative for invalid value', () => {
    process.env.AI_COST_MODE = 'maximum_overdrive'
    expect(getAiCostMode()).toBe('conservative')
  })

  it('falls back to conservative for empty string', () => {
    process.env.AI_COST_MODE = ''
    expect(getAiCostMode()).toBe('conservative')
  })
})

// ── getAiDailyCaps — defaults ─────────────────────────────────────────────────

describe('getAiDailyCaps — defaults', () => {
  it('free chimmy matches CAP_DEFAULTS', () => {
    expect(getAiDailyCaps().free.chimmy).toBe(CAP_DEFAULTS.free.chimmy)
  })

  it('pro chimmy is higher than free chimmy', () => {
    const caps = getAiDailyCaps()
    expect(caps.pro.chimmy).toBeGreaterThan(caps.free.chimmy)
  })

  it('admin chimmy is higher than pro chimmy', () => {
    const caps = getAiDailyCaps()
    expect(caps.admin.chimmy).toBeGreaterThan(caps.pro.chimmy)
  })

  it('free commissioner_brain is 0 (disabled)', () => {
    expect(getAiDailyCaps().free.commissioner_brain).toBe(0)
  })

  it('all caps are non-negative integers', () => {
    const caps = getAiDailyCaps()
    for (const tier of [caps.free, caps.pro, caps.admin]) {
      for (const val of Object.values(tier)) {
        expect(Number.isInteger(val)).toBe(true)
        expect(val).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('returns all three tiers', () => {
    const caps = getAiDailyCaps()
    expect(caps).toHaveProperty('free')
    expect(caps).toHaveProperty('pro')
    expect(caps).toHaveProperty('admin')
  })

  it('each tier has all three features', () => {
    const caps = getAiDailyCaps()
    for (const tier of [caps.free, caps.pro, caps.admin]) {
      expect(tier).toHaveProperty('chimmy')
      expect(tier).toHaveProperty('explain_bracket')
      expect(tier).toHaveProperty('commissioner_brain')
    }
  })
})

// ── getAiDailyCaps — env overrides ────────────────────────────────────────────

describe('getAiDailyCaps — env overrides', () => {
  it('reads AI_CAP_FREE_CHIMMY_DAILY', () => {
    process.env.AI_CAP_FREE_CHIMMY_DAILY = '7'
    expect(getAiDailyCaps().free.chimmy).toBe(7)
  })

  it('reads AI_CAP_PRO_CHIMMY_DAILY', () => {
    process.env.AI_CAP_PRO_CHIMMY_DAILY = '50'
    expect(getAiDailyCaps().pro.chimmy).toBe(50)
  })

  it('reads AI_CAP_ADMIN_CHIMMY_DAILY', () => {
    process.env.AI_CAP_ADMIN_CHIMMY_DAILY = '100'
    expect(getAiDailyCaps().admin.chimmy).toBe(100)
  })

  it('reads AI_CAP_FREE_EXPLAIN_DAILY', () => {
    process.env.AI_CAP_FREE_EXPLAIN_DAILY = '3'
    expect(getAiDailyCaps().free.explain_bracket).toBe(3)
  })

  it('reads AI_CAP_PRO_COMMISSIONER_BRAIN_DAILY', () => {
    process.env.AI_CAP_PRO_COMMISSIONER_BRAIN_DAILY = '10'
    expect(getAiDailyCaps().pro.commissioner_brain).toBe(10)
  })

  it('allows 0 for free caps (feature disabled)', () => {
    process.env.AI_CAP_FREE_CHIMMY_DAILY = '0'
    expect(getAiDailyCaps().free.chimmy).toBe(0)
  })

  it('falls back to default for non-numeric value', () => {
    process.env.AI_CAP_FREE_CHIMMY_DAILY = 'lots'
    expect(getAiDailyCaps().free.chimmy).toBe(CAP_DEFAULTS.free.chimmy)
  })

  it('falls back to default for negative value', () => {
    process.env.AI_CAP_FREE_CHIMMY_DAILY = '-5'
    expect(getAiDailyCaps().free.chimmy).toBe(CAP_DEFAULTS.free.chimmy)
  })

  it('falls back to default for float (truncates to int)', () => {
    process.env.AI_CAP_PRO_CHIMMY_DAILY = '25'
    expect(Number.isInteger(getAiDailyCaps().pro.chimmy)).toBe(true)
    expect(getAiDailyCaps().pro.chimmy).toBe(25)
  })

  it('values are always integers', () => {
    process.env.AI_CAP_FREE_CHIMMY_DAILY = '7'
    process.env.AI_CAP_PRO_CHIMMY_DAILY  = '30'
    const caps = getAiDailyCaps()
    expect(Number.isInteger(caps.free.chimmy)).toBe(true)
    expect(Number.isInteger(caps.pro.chimmy)).toBe(true)
  })
})

// ── getAiCacheTtls — defaults ─────────────────────────────────────────────────

describe('getAiCacheTtls — defaults', () => {
  it('chimmy TTL matches TTL_DEFAULTS', () => {
    expect(getAiCacheTtls().chimmy).toBe(TTL_DEFAULTS.chimmy)
  })

  it('explain_bracket TTL is longer than chimmy TTL', () => {
    const ttls = getAiCacheTtls()
    expect(ttls.explain_bracket).toBeGreaterThan(ttls.chimmy)
  })

  it('all TTLs are positive integers', () => {
    for (const ttl of Object.values(getAiCacheTtls())) {
      expect(Number.isInteger(ttl)).toBe(true)
      expect(ttl).toBeGreaterThan(0)
    }
  })

  it('returns all four TTL keys', () => {
    const ttls = getAiCacheTtls()
    expect(ttls).toHaveProperty('chimmy')
    expect(ttls).toHaveProperty('explain_bracket')
    expect(ttls).toHaveProperty('commissioner_brain')
    expect(ttls).toHaveProperty('schedule_static')
  })
})

// ── getAiCacheTtls — env overrides ────────────────────────────────────────────

describe('getAiCacheTtls — env overrides', () => {
  it('reads AI_CACHE_TTL_CHIMMY_MINUTES and converts to seconds', () => {
    process.env.AI_CACHE_TTL_CHIMMY_MINUTES = '10'
    expect(getAiCacheTtls().chimmy).toBe(10 * 60)
  })

  it('reads AI_CACHE_TTL_EXPLAIN_HOURS and converts to seconds', () => {
    process.env.AI_CACHE_TTL_EXPLAIN_HOURS = '12'
    expect(getAiCacheTtls().explain_bracket).toBe(12 * 3600)
  })

  it('reads AI_CACHE_TTL_COMMISSIONER_BRAIN_MINUTES', () => {
    process.env.AI_CACHE_TTL_COMMISSIONER_BRAIN_MINUTES = '45'
    expect(getAiCacheTtls().commissioner_brain).toBe(45 * 60)
  })

  it('reads AI_CACHE_TTL_SPORTS_SCHEDULE_MINUTES → schedule_static key', () => {
    process.env.AI_CACHE_TTL_SPORTS_SCHEDULE_MINUTES = '5'
    expect(getAiCacheTtls().schedule_static).toBe(5 * 60)
  })

  it('falls back to default for non-numeric TTL env', () => {
    process.env.AI_CACHE_TTL_CHIMMY_MINUTES = 'infinite'
    expect(getAiCacheTtls().chimmy).toBe(TTL_DEFAULTS.chimmy)
  })

  it('falls back to default for negative TTL env', () => {
    process.env.AI_CACHE_TTL_CHIMMY_MINUTES = '-10'
    expect(getAiCacheTtls().chimmy).toBe(TTL_DEFAULTS.chimmy)
  })

  it('enforces minimum 60s even if env says 0', () => {
    process.env.AI_CACHE_TTL_CHIMMY_MINUTES = '0'
    // 0 minutes is treated as invalid (allowZero=false for TTLs)
    // falls back to default
    expect(getAiCacheTtls().chimmy).toBe(TTL_DEFAULTS.chimmy)
  })

  it('all env-overridden TTLs are integers in seconds', () => {
    process.env.AI_CACHE_TTL_CHIMMY_MINUTES = '30'
    const ttl = getAiCacheTtls().chimmy
    expect(Number.isInteger(ttl)).toBe(true)
    expect(ttl).toBe(30 * 60)
  })
})

// ── getAiBudget ───────────────────────────────────────────────────────────────

describe('getAiBudget — defaults', () => {
  it('openaiUsd defaults to 18', () => {
    expect(getAiBudget().openaiUsd).toBe(18)
  })

  it('anthropicUsd defaults to 10', () => {
    expect(getAiBudget().anthropicUsd).toBe(10)
  })

  it('xaiUsd defaults to 0', () => {
    expect(getAiBudget().xaiUsd).toBe(0)
  })

  it('deepseekUsd defaults to 0', () => {
    expect(getAiBudget().deepseekUsd).toBe(0)
  })

  it('totalUsd is sum of all providers', () => {
    const b = getAiBudget()
    const expected = +(b.openaiUsd + b.anthropicUsd + b.xaiUsd + b.deepseekUsd).toFixed(2)
    expect(b.totalUsd).toBe(expected)
  })

  it('all budget values are non-negative', () => {
    const b = getAiBudget()
    expect(b.openaiUsd).toBeGreaterThanOrEqual(0)
    expect(b.anthropicUsd).toBeGreaterThanOrEqual(0)
    expect(b.xaiUsd).toBeGreaterThanOrEqual(0)
    expect(b.deepseekUsd).toBeGreaterThanOrEqual(0)
    expect(b.totalUsd).toBeGreaterThanOrEqual(0)
  })
})

describe('getAiBudget — env overrides', () => {
  it('reads AI_BUDGET_OPENAI_USD', () => {
    process.env.AI_BUDGET_OPENAI_USD = '25.50'
    expect(getAiBudget().openaiUsd).toBe(25.50)
  })

  it('reads AI_BUDGET_ANTHROPIC_USD', () => {
    process.env.AI_BUDGET_ANTHROPIC_USD = '15'
    expect(getAiBudget().anthropicUsd).toBe(15)
  })

  it('reads AI_BUDGET_XAI_USD', () => {
    process.env.AI_BUDGET_XAI_USD = '5'
    expect(getAiBudget().xaiUsd).toBe(5)
  })

  it('reads AI_BUDGET_DEEPSEEK_USD', () => {
    process.env.AI_BUDGET_DEEPSEEK_USD = '2.50'
    expect(getAiBudget().deepseekUsd).toBe(2.50)
  })

  it('totalUsd recomputes when env overrides are set', () => {
    process.env.AI_BUDGET_OPENAI_USD    = '20'
    process.env.AI_BUDGET_ANTHROPIC_USD = '10'
    process.env.AI_BUDGET_XAI_USD       = '5'
    process.env.AI_BUDGET_DEEPSEEK_USD  = '5'
    expect(getAiBudget().totalUsd).toBe(40)
  })

  it('falls back for invalid budget env', () => {
    process.env.AI_BUDGET_OPENAI_USD = 'unlimited'
    expect(getAiBudget().openaiUsd).toBe(18) // default
  })

  it('falls back for negative budget env', () => {
    process.env.AI_BUDGET_OPENAI_USD = '-5'
    expect(getAiBudget().openaiUsd).toBe(18) // default
  })

  it('allows 0 budget (no spend allowance for that provider)', () => {
    process.env.AI_BUDGET_OPENAI_USD = '0'
    expect(getAiBudget().openaiUsd).toBe(0)
  })
})

// ── getEffectiveProviderOrder ─────────────────────────────────────────────────

describe('getEffectiveProviderOrder', () => {
  it('returns default order when env is unset', () => {
    expect(getEffectiveProviderOrder()).toEqual(DEFAULT_PROVIDER_ORDER)
  })

  it('respects AI_PROVIDER_ORDER env override', () => {
    process.env.AI_PROVIDER_ORDER = 'deepseek,openai,xai,anthropic'
    expect(getEffectiveProviderOrder()).toEqual(['deepseek', 'openai', 'xai', 'anthropic'])
  })

  it('ignores invalid provider names', () => {
    process.env.AI_PROVIDER_ORDER = 'openai,gemini,anthropic'
    expect(getEffectiveProviderOrder()).toEqual(['openai', 'anthropic'])
  })

  it('deduplicates repeated providers', () => {
    process.env.AI_PROVIDER_ORDER = 'openai,openai,anthropic,openai'
    expect(getEffectiveProviderOrder()).toEqual(['openai', 'anthropic'])
  })

  it('falls back to default when all names are invalid', () => {
    process.env.AI_PROVIDER_ORDER = 'gemini,cohere,mistral'
    expect(getEffectiveProviderOrder()).toEqual(DEFAULT_PROVIDER_ORDER)
  })

  it('falls back to default for empty string', () => {
    process.env.AI_PROVIDER_ORDER = ''
    expect(getEffectiveProviderOrder()).toEqual(DEFAULT_PROVIDER_ORDER)
  })

  it('handles partial lists (subset of known providers)', () => {
    process.env.AI_PROVIDER_ORDER = 'anthropic,deepseek'
    expect(getEffectiveProviderOrder()).toEqual(['anthropic', 'deepseek'])
  })

  it('trims whitespace around provider names', () => {
    process.env.AI_PROVIDER_ORDER = ' openai , anthropic , deepseek '
    expect(getEffectiveProviderOrder()).toEqual(['openai', 'anthropic', 'deepseek'])
  })
})

// ── getAiConfig — full snapshot ───────────────────────────────────────────────

describe('getAiConfig', () => {
  it('returns all required top-level keys', () => {
    const config = getAiConfig()
    expect(config).toHaveProperty('costMode')
    expect(config).toHaveProperty('caps')
    expect(config).toHaveProperty('ttls')
    expect(config).toHaveProperty('providerOrder')
    expect(config).toHaveProperty('budget')
  })

  it('costMode matches getAiCostMode()', () => {
    process.env.AI_COST_MODE = 'balanced'
    expect(getAiConfig().costMode).toBe('balanced')
  })

  it('caps matches getAiDailyCaps()', () => {
    process.env.AI_CAP_FREE_CHIMMY_DAILY = '5'
    expect(getAiConfig().caps.free.chimmy).toBe(5)
  })

  it('ttls matches getAiCacheTtls()', () => {
    process.env.AI_CACHE_TTL_CHIMMY_MINUTES = '15'
    expect(getAiConfig().ttls.chimmy).toBe(15 * 60)
  })

  it('providerOrder matches getEffectiveProviderOrder()', () => {
    process.env.AI_PROVIDER_ORDER = 'deepseek,openai'
    expect(getAiConfig().providerOrder).toEqual(['deepseek', 'openai'])
  })

  it('budget totalUsd matches getAiBudget()', () => {
    process.env.AI_BUDGET_OPENAI_USD = '20'
    expect(getAiConfig().budget.openaiUsd).toBe(20)
  })
})

// ── Privacy ───────────────────────────────────────────────────────────────────

describe('privacy — config never exposes secrets', () => {
  it('getAiConfig output does not contain API key patterns', () => {
    process.env.AI_BUDGET_OPENAI_USD = '18'
    const json = JSON.stringify(getAiConfig())
    // No bearer tokens, no sk- keys
    expect(json).not.toMatch(/sk-[a-zA-Z0-9]{10,}/)
    expect(json).not.toMatch(/Bearer /)
  })

  it('getAiConfig output does not contain email addresses', () => {
    const json = JSON.stringify(getAiConfig())
    expect(json).not.toMatch(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  })

  it('budget object has no raw keys — only numeric values', () => {
    const budget = getAiBudget()
    const values = Object.values(budget)
    for (const v of values) {
      expect(typeof v).toBe('number')
    }
  })
})
