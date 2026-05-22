import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/provider-config', () => ({
  isOpenAIAvailable: vi.fn(),
  isXaiAvailable: vi.fn(),
  isDeepSeekAvailable: vi.fn(),
}))

import { isOpenAIAvailable, isXaiAvailable, isDeepSeekAvailable } from '@/lib/provider-config'
import { verifyProviderEnv, hasAnyProviderConfigured } from '@/lib/ai/envVerification'

const mockOpenAI = isOpenAIAvailable as ReturnType<typeof vi.fn>
const mockXai = isXaiAvailable as ReturnType<typeof vi.fn>
const mockDeepSeek = isDeepSeekAvailable as ReturnType<typeof vi.fn>

const originalEnv = process.env

beforeEach(() => {
  process.env = { ...originalEnv }
  vi.resetAllMocks()
})
afterEach(() => {
  process.env = originalEnv
})

describe('verifyProviderEnv', () => {
  it('returns openaiConfigured:true when OPENAI_API_KEY is set', () => {
    mockOpenAI.mockReturnValue(true)
    mockXai.mockReturnValue(false)
    mockDeepSeek.mockReturnValue(false)
    process.env.ANTHROPIC_API_KEY = ''

    const status = verifyProviderEnv()

    expect(status.openaiConfigured).toBe(true)
  })

  it('returns anthropicConfigured:true when ANTHROPIC_API_KEY is set', () => {
    mockOpenAI.mockReturnValue(false)
    mockXai.mockReturnValue(false)
    mockDeepSeek.mockReturnValue(false)
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'

    const status = verifyProviderEnv()

    expect(status.anthropicConfigured).toBe(true)
  })

  it('returns anthropicConfigured:false when ANTHROPIC_API_KEY is missing', () => {
    mockOpenAI.mockReturnValue(false)
    mockXai.mockReturnValue(false)
    mockDeepSeek.mockReturnValue(false)
    delete process.env.ANTHROPIC_API_KEY

    const status = verifyProviderEnv()

    expect(status.anthropicConfigured).toBe(false)
  })

  it('returns xaiConfigured:true when XAI_API_KEY is set (delegates to isXaiAvailable)', () => {
    mockOpenAI.mockReturnValue(false)
    mockXai.mockReturnValue(true)
    mockDeepSeek.mockReturnValue(false)
    process.env.ANTHROPIC_API_KEY = ''

    const status = verifyProviderEnv()

    expect(status.xaiConfigured).toBe(true)
  })

  it('returns xaiConfigured:true when only GROK_API_KEY is set', () => {
    // isXaiAvailable() handles the alias — just verify delegation is correct
    mockOpenAI.mockReturnValue(false)
    mockXai.mockReturnValue(true) // provider-config already handles GROK_API_KEY alias
    mockDeepSeek.mockReturnValue(false)
    process.env.ANTHROPIC_API_KEY = ''

    const status = verifyProviderEnv()

    expect(status.xaiConfigured).toBe(true)
    expect(mockXai).toHaveBeenCalled()
  })

  it('returns deepseekConfigured:true when DEEPSEEK_API_KEY is set', () => {
    mockOpenAI.mockReturnValue(false)
    mockXai.mockReturnValue(false)
    mockDeepSeek.mockReturnValue(true)
    process.env.ANTHROPIC_API_KEY = ''

    const status = verifyProviderEnv()

    expect(status.deepseekConfigured).toBe(true)
  })

  it('returns all false when no providers are configured', () => {
    mockOpenAI.mockReturnValue(false)
    mockXai.mockReturnValue(false)
    mockDeepSeek.mockReturnValue(false)
    delete process.env.ANTHROPIC_API_KEY

    const status = verifyProviderEnv()

    expect(status).toEqual({
      openaiConfigured: false,
      anthropicConfigured: false,
      xaiConfigured: false,
      deepseekConfigured: false,
    })
  })

  it('does not expose raw key values in the returned object', () => {
    mockOpenAI.mockReturnValue(true)
    mockXai.mockReturnValue(true)
    mockDeepSeek.mockReturnValue(true)
    process.env.ANTHROPIC_API_KEY = 'sk-ant-secret'

    const status = verifyProviderEnv()

    // Ensure no string property contains an API key pattern
    for (const val of Object.values(status)) {
      expect(typeof val).toBe('boolean')
    }
  })
})

describe('hasAnyProviderConfigured', () => {
  it('returns true when at least one provider is set', () => {
    mockOpenAI.mockReturnValue(false)
    mockXai.mockReturnValue(false)
    mockDeepSeek.mockReturnValue(false)
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'

    expect(hasAnyProviderConfigured()).toBe(true)
  })

  it('returns false when no providers are configured', () => {
    mockOpenAI.mockReturnValue(false)
    mockXai.mockReturnValue(false)
    mockDeepSeek.mockReturnValue(false)
    delete process.env.ANTHROPIC_API_KEY

    expect(hasAnyProviderConfigured()).toBe(false)
  })
})
