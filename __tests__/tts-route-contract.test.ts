import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

function buildRequest(body: Record<string, unknown>) {
  return createMockNextRequest("http://localhost/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tts contract", () => {
  const originalElevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const originalVoiceId = process.env.ELEVENLABS_VOICE_ID;

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
  });

  afterEach(() => {
    if (originalElevenLabsKey == null) {
      delete process.env.ELEVENLABS_API_KEY;
    } else {
      process.env.ELEVENLABS_API_KEY = originalElevenLabsKey;
    }
    if (originalVoiceId == null) {
      delete process.env.ELEVENLABS_VOICE_ID;
    } else {
      process.env.ELEVENLABS_VOICE_ID = originalVoiceId;
    }
  });

  it("returns 400 when text is empty", async () => {
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key";
    const { POST } = await import("@/app/api/tts/route");
    const res = await POST(buildRequest({ text: "" }) as any);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Text is required",
    });
  });

  it("returns 503 when ElevenLabs is not configured", async () => {
    const { POST } = await import("@/app/api/tts/route");
    const res = await POST(buildRequest({ text: "Hello" }) as any);

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: "TTS not configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls ElevenLabs stream endpoint with turbo model and returns audio", async () => {
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key";
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([0xff, 0xf3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      })
    );

    const { POST } = await import("@/app/api/tts/route");
    const res = await POST(buildRequest({ text: "Hello Chimmy" }) as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/v1/text-to-speech/XrExE9yKIg1WjnnlVkGX/stream");
    expect(init?.headers).toMatchObject({
      "xi-api-key": "test-elevenlabs-key",
    });
    const bodyStr = String(init?.body ?? "");
    expect(bodyStr).toContain('"model_id":"eleven_turbo_v2_5"');
    expect(bodyStr).toContain('"optimize_streaming_latency":3');
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
  });

  it("returns 502 when ElevenLabs returns an error", async () => {
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key";
    fetchMock.mockResolvedValueOnce(
      new Response("upstream error body", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    );

    const { POST } = await import("@/app/api/tts/route");
    const res = await POST(buildRequest({ text: "Hello" }) as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("TTS service error"),
    });
  });
});
