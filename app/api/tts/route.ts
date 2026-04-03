import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/** Max chars per ElevenLabs / product contract (latency + cost). */
const MAX_TTS_CHARS = 500
const AUDIO_CACHE_TTL_MS = 60_000
const ELEVENLABS_USAGE_LOG_TTL_MS = 10 * 60_000
const ELEVENLABS_RACHEL_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
const ELEVENLABS_ADAM_VOICE_ID = "pNInz6obpgDQGcFmaJgB"

type TtsProvider = "elevenlabs"

type CachedAudioEntry = {
  provider: TtsProvider
  contentType: string
  bytes: Uint8Array
  expiresAt: number
}

type SynthesizedAudioResponse = {
  provider: TtsProvider
  response: Response
}

const audioCache = new Map<string, CachedAudioEntry>()
let lastElevenLabsUsageLogAt = 0

const TtsRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TTS_CHARS),
  preset: z.enum(["calm", "analyst", "warm"]).optional(),
  voice: z.enum(["rachel", "adam"]).optional(),
  /** Optional override; must look like an ElevenLabs voice id */
  voiceId: z.string().trim().min(10).max(64).optional(),
})

const PRONUNCIATION_DICTIONARY: Array<[RegExp, string]> = [
  [/\bCeeDee\b/gi, "See Dee"],
  [/\bMahomes\b/gi, "Ma-homes"],
  [/\bTyreek\b/gi, "Tie-reek"],
  [/\bJa['’]?Marr\b/gi, "Ja Mar"],
  [/\bDeVonta\b/gi, "De Von tah"],
  [/\bAmon-Ra\b/gi, "Ah mon Ray"],
  [/\bStefon\b/gi, "Stef on"],
  [/\bDiontae\b/gi, "Dee on tay"],
  [/\bDeebo\b/gi, "Dee bo"],
  [/\bKadarius\b/gi, "Kuh dair ee us"],
]

function normalizeTtsText(raw: string): string {
  let normalized = raw
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[_*`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  for (const [pattern, replacement] of PRONUNCIATION_DICTIONARY) {
    normalized = normalized.replace(pattern, replacement)
  }

  return normalized
}

/**
 * Rachel slot: ELEVENLABS_VOICE_ID (e.g. Allison) → optional legacy RACHEL env → Rachel premade.
 * Adam: ELEVENLABS_ADAM_VOICE_ID → Adam premade.
 */
function resolveElevenLabsVoiceId(input: {
  voice?: "rachel" | "adam"
  preset: "calm" | "analyst" | "warm"
  overrideVoiceId?: string
}): string {
  const o = input.overrideVoiceId?.trim()
  if (o && /^[a-zA-Z0-9]{10,64}$/.test(o)) {
    return o
  }
  const explicitVoice = input.voice ?? "rachel"
  if (explicitVoice === "adam") {
    return process.env.ELEVENLABS_ADAM_VOICE_ID?.trim() || ELEVENLABS_ADAM_VOICE_ID
  }
  return (
    process.env.ELEVENLABS_VOICE_ID?.trim() ||
    process.env.ELEVENLABS_RACHEL_VOICE_ID?.trim() ||
    ELEVENLABS_RACHEL_VOICE_ID
  )
}

function buildCacheKey(input: {
  text: string
  preset: "calm" | "analyst" | "warm"
  voice?: "rachel" | "adam"
  voiceId?: string
}) {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
}

function purgeExpiredAudioCache(now = Date.now()) {
  for (const [key, entry] of audioCache.entries()) {
    if (entry.expiresAt <= now) {
      audioCache.delete(key)
    }
  }
}

function getCachedAudio(cacheKey: string): CachedAudioEntry | null {
  purgeExpiredAudioCache()
  const cached = audioCache.get(cacheKey)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    audioCache.delete(cacheKey)
    return null
  }
  return cached
}

function buildAudioHeaders(input: {
  provider: TtsProvider
  contentType: string
  cacheStatus: "HIT" | "MISS"
}) {
  return {
    "Content-Type": input.contentType,
    "Cache-Control": "no-store",
    "X-Chimmy-TTS-Provider": input.provider,
    "X-Chimmy-TTS-Cache": input.cacheStatus,
  }
}

async function storeAudioInCache(
  cacheKey: string,
  responseStream: ReadableStream<Uint8Array>,
  meta: {
    provider: TtsProvider
    contentType: string
  }
) {
  try {
    const bytes = new Uint8Array(await new Response(responseStream).arrayBuffer())
    audioCache.set(cacheKey, {
      provider: meta.provider,
      contentType: meta.contentType,
      bytes,
      expiresAt: Date.now() + AUDIO_CACHE_TTL_MS,
    })
    purgeExpiredAudioCache()
  } catch (error) {
    console.warn("[api/tts] failed to populate audio cache", error)
  }
}

function buildCachedAudioResponse(cached: CachedAudioEntry) {
  return new NextResponse(cached.bytes.slice(), {
    status: 200,
    headers: buildAudioHeaders({
      provider: cached.provider,
      contentType: cached.contentType,
      cacheStatus: "HIT",
    }),
  })
}

async function maybeLogElevenLabsUsage(apiKey: string) {
  if (process.env.NODE_ENV === "test") return
  const now = Date.now()
  if (now - lastElevenLabsUsageLogAt < ELEVENLABS_USAGE_LOG_TTL_MS) return
  lastElevenLabsUsageLogAt = now

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: {
        Accept: "application/json",
        "xi-api-key": apiKey,
      },
    })

    if (!response.ok) {
      const details = await response.text().catch(() => "")
      if (response.status === 401 && details.includes("missing_permissions")) {
        console.info(
          "[api/tts] ElevenLabs subscription usage lookup skipped because the API key lacks user_read permission."
        )
        return
      }
      console.warn("[api/tts] unable to fetch ElevenLabs subscription usage", {
        status: response.status,
        details,
      })
      return
    }

    const data = (await response.json()) as {
      tier?: string
      character_count?: number
      character_limit?: number
      next_character_count_reset_unix?: number
    }
    const characterCount = data.character_count ?? 0
    const characterLimit = data.character_limit ?? 0
    const remainingCharacters = Math.max(characterLimit - characterCount, 0)

    console.info("[api/tts] ElevenLabs subscription usage", {
      tier: data.tier ?? "unknown",
      characterCount,
      characterLimit,
      remainingCharacters,
      nextResetUnix: data.next_character_count_reset_unix ?? null,
    })
  } catch (error) {
    console.warn("[api/tts] unable to log ElevenLabs usage", error)
  }
}

function getElevenLabsUsageApiKey() {
  return process.env.ELEVENLABS_USAGE_API_KEY?.trim() || process.env.ELEVENLABS_API_KEY?.trim() || ""
}

async function synthesizeWithElevenLabs(input: {
  text: string
  preset: "calm" | "analyst" | "warm"
  voice?: "rachel" | "adam"
  voiceId?: string
}): Promise<SynthesizedAudioResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY missing")
  }

  const voiceIdResolved = resolveElevenLabsVoiceId({
    voice: input.voice,
    preset: input.preset,
    overrideVoiceId: input.voiceId,
  })

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceIdResolved}`, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: input.text,
      model_id: process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_turbo_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(details || `ElevenLabs HTTP ${response.status}`)
  }

  const usageApiKey = getElevenLabsUsageApiKey()
  if (usageApiKey) {
    void maybeLogElevenLabsUsage(usageApiKey)
  }

  return {
    provider: "elevenlabs",
    response,
  }
}

function buildStreamingAudioResponse(input: {
  cacheKey: string
  provider: TtsProvider
  response: Response
}) {
  const contentType = input.response.headers.get("content-type") || "audio/mpeg"
  const body = input.response.body

  if (!body) {
    return input.response.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer)
      audioCache.set(input.cacheKey, {
        provider: input.provider,
        contentType,
        bytes,
        expiresAt: Date.now() + AUDIO_CACHE_TTL_MS,
      })
      return new NextResponse(bytes, {
        status: 200,
        headers: buildAudioHeaders({
          provider: input.provider,
          contentType,
          cacheStatus: "MISS",
        }),
      })
    })
  }

  const [clientStream, cacheStream] = body.tee()
  void storeAudioInCache(input.cacheKey, cacheStream, {
    provider: input.provider,
    contentType,
  })

  return Promise.resolve(
    new NextResponse(clientStream, {
      status: 200,
      headers: buildAudioHeaders({
        provider: input.provider,
        contentType,
        cacheStatus: "MISS",
      }),
    })
  )
}

export async function POST(req: NextRequest) {
  let body: unknown = null

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid TTS request." }, { status: 400 })
  }

  const parsed = TtsRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid TTS request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  if (!process.env.ELEVENLABS_API_KEY?.trim()) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 })
  }

  const preset = parsed.data.preset ?? "calm"
  const voice = parsed.data.voice
  const voiceId = parsed.data.voiceId
  const normalizedText = normalizeTtsText(parsed.data.text)
  const cacheKey = buildCacheKey({
    text: normalizedText,
    preset,
    voice,
    voiceId,
  })
  const cached = getCachedAudio(cacheKey)
  if (cached) {
    return buildCachedAudioResponse(cached)
  }

  try {
    const audio = await synthesizeWithElevenLabs({
      text: normalizedText,
      preset,
      voice,
      voiceId,
    })

    return buildStreamingAudioResponse({
      cacheKey,
      provider: audio.provider,
      response: audio.response,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error("[api/tts] ElevenLabs synthesis failed:", error)
    return NextResponse.json(
      { error: "TTS service error", detail: detail.slice(0, 2000) },
      { status: 502 }
    )
  }
}

export const dynamic = "force-dynamic"
