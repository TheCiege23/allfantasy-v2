import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()

vi.stubGlobal("fetch", fetchMock)

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/tts contract", () => {
  const originalElevenLabsKey = process.env.ELEVENLABS_API_KEY

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    delete process.env.ELEVENLABS_API_KEY
  })

  afterEach(() => {
    if (originalElevenLabsKey == null) {
      delete process.env.ELEVENLABS_API_KEY
    } else {
      process.env.ELEVENLABS_API_KEY = originalElevenLabsKey
    }
  })

  it("returns 400 for invalid payloads", async () => {
    const { POST } = await import("@/app/api/tts/route")
    const res = await POST(buildRequest({ text: "" }) as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid TTS request.",
    })
  })

  it("returns 503 when ElevenLabs is not configured", async () => {
    const { POST } = await import("@/app/api/tts/route")
    const res = await POST(buildRequest({ text: "Hello" }) as any)

    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({
      error: "TTS not configured",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("uses ElevenLabs with pronunciation replacements and voice settings", async () => {
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key"
    fetchMock.mockResolvedValueOnce(
      new Response("ELEVEN_AUDIO", {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      })
    )

    const { POST } = await import("@/app/api/tts/route")
    const res = await POST(
      buildRequest({
        text: "CeeDee Lamb and Stefon Diggs with Mahomes",
        preset: "calm",
        voice: "adam",
      }) as any
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain("/v1/text-to-speech/pNInz6obpgDQGcFmaJgB")
    expect(init?.headers).toMatchObject({
      "xi-api-key": "test-elevenlabs-key",
    })
    const bodyStr = String(init?.body ?? "")
    expect(bodyStr).toContain('"model_id":"eleven_turbo_v2"')
    expect(bodyStr).toContain('"stability":0.5')
    expect(bodyStr).toContain('"similarity_boost":0.75')
    expect(bodyStr).toContain("See Dee Lamb and Stef on Diggs with Ma-homes")
    expect(res.status).toBe(200)
    expect(res.headers.get("X-Chimmy-TTS-Provider")).toBe("elevenlabs")
    expect(res.headers.get("X-Chimmy-TTS-Cache")).toBe("MISS")
  })

  it("returns 502 when ElevenLabs returns an error", async () => {
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key"
    fetchMock.mockResolvedValueOnce(
      new Response("upstream error body", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    )

    const { POST } = await import("@/app/api/tts/route")
    const res = await POST(
      buildRequest({
        text: "Tyreek Hill",
        preset: "analyst",
        voice: "rachel",
      }) as any
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toMatchObject({
      error: "TTS service error",
    })
  })

  it("caches repeated audio requests for 60 seconds", async () => {
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key"
    fetchMock.mockResolvedValue(
      new Response("ELEVEN_AUDIO", {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      })
    )

    const { POST } = await import("@/app/api/tts/route")
    const request = buildRequest({
      text: "Deebo and Kadarius are both available on waivers.",
      preset: "calm",
      voice: "rachel",
    })

    const first = await POST(request as any)
    const second = await POST(
      buildRequest({
        text: "Deebo and Kadarius are both available on waivers.",
        preset: "calm",
        voice: "rachel",
      }) as any
    )

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second.headers.get("X-Chimmy-TTS-Cache")).toBe("HIT")
  })
})
