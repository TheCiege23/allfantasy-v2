import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/tts contract', () => {
  const originalElevenLabsKey = process.env.ELEVENLABS_API_KEY
  const originalOpenAiKey = process.env.OPENAI_API_KEY
  const originalOpenAiBaseUrl = process.env.OPENAI_BASE_URL

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_BASE_URL
  })

  afterEach(() => {
    if (originalElevenLabsKey == null) {
      delete process.env.ELEVENLABS_API_KEY
    } else {
      process.env.ELEVENLABS_API_KEY = originalElevenLabsKey
    }

    if (originalOpenAiKey == null) {
      delete process.env.OPENAI_API_KEY
    } else {
      process.env.OPENAI_API_KEY = originalOpenAiKey
    }

    if (originalOpenAiBaseUrl == null) {
      delete process.env.OPENAI_BASE_URL
    } else {
      process.env.OPENAI_BASE_URL = originalOpenAiBaseUrl
    }
  })

  it('returns 400 for invalid payloads', async () => {
    const { POST } = await import('@/app/api/tts/route')
    const res = await POST(buildRequest({ text: '' }) as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: 'Invalid TTS request.',
    })
  })

  it('uses ElevenLabs first and applies pronunciation replacements', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key'
    fetchMock.mockResolvedValueOnce(
      new Response('ELEVEN_AUDIO', {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      })
    )

    const { POST } = await import('@/app/api/tts/route')
    const res = await POST(
      buildRequest({
        text: "CeeDee Lamb and Stefon Diggs with Mahomes",
        preset: 'calm',
        voice: 'adam',
      }) as any
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/v1/text-to-speech/pNInz6obpgDQGcFmaJgB')
    expect(init?.headers).toMatchObject({
      'xi-api-key': 'test-elevenlabs-key',
    })
    expect(String(init?.body)).toContain('"model_id":"eleven_turbo_v2"')
    expect(String(init?.body)).toContain('See Dee Lamb and Stef on Diggs with Ma-homes')
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Chimmy-TTS-Provider')).toBe('elevenlabs')
    expect(res.headers.get('X-Chimmy-TTS-Cache')).toBe('MISS')
  })

  it('falls back to OpenAI TTS when ElevenLabs is unavailable', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key'
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1'

    fetchMock
      .mockResolvedValueOnce(
        new Response('bad upstream', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        })
      )
      .mockResolvedValueOnce(
        new Response('OPENAI_AUDIO', {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        })
      )

    const { POST } = await import('@/app/api/tts/route')
    const res = await POST(
      buildRequest({
        text: "Tyreek Hill and Ja'Marr Chase",
        preset: 'analyst',
        voice: 'rachel',
      }) as any
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1]?.[0] ?? '')).toContain('/audio/speech')
    expect(String(fetchMock.mock.calls[1]?.[1]?.body ?? '')).toContain('Tie-reek Hill and Ja Mar Chase')
    expect(String(fetchMock.mock.calls[1]?.[1]?.body ?? '')).toContain('"voice":"nova"')
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Chimmy-TTS-Provider')).toBe('openai')
  })

  it('caches repeated audio requests for 60 seconds', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key'
    fetchMock.mockResolvedValue(
      new Response('ELEVEN_AUDIO', {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      })
    )

    const { POST } = await import('@/app/api/tts/route')
    const request = buildRequest({
      text: 'Deebo and Kadarius are both available on waivers.',
      preset: 'calm',
      voice: 'rachel',
    })

    const first = await POST(request as any)
    const second = await POST(buildRequest({
      text: 'Deebo and Kadarius are both available on waivers.',
      preset: 'calm',
      voice: 'rachel',
    }) as any)

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second.headers.get('X-Chimmy-TTS-Cache')).toBe('HIT')
  })
})
