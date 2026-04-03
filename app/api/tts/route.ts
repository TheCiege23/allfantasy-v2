import { NextResponse } from "next/server";

import { DEFAULT_VOICE_ID, getAllowedElevenLabsVoiceIds } from "@/lib/tts/voices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Supported ElevenLabs models — turbo is lowest latency
const ELEVENLABS_MODEL = "eleven_turbo_v2_5"; // latest turbo, best quality+speed

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const allowedVoiceIds = getAllowedElevenLabsVoiceIds();
  const envVoiceId = process.env.ELEVENLABS_VOICE_ID?.trim();

  if (!apiKey) {
    console.error("[TTS] ELEVENLABS_API_KEY is not set in environment");
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  let text: string;
  let requestedVoiceId: string | undefined;
  try {
    const body = (await req.json()) as { text?: string; voiceId?: string };
    text = (body.text || "").slice(0, 1000).trim();
    if (typeof body.voiceId === "string" && body.voiceId.trim()) {
      requestedVoiceId = body.voiceId.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const voiceId =
    requestedVoiceId && allowedVoiceIds.has(requestedVoiceId)
      ? requestedVoiceId
      : envVoiceId && allowedVoiceIds.has(envVoiceId)
        ? envVoiceId
        : DEFAULT_VOICE_ID;

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.4, // slightly lower = more expressive
          similarity_boost: 0.85, // stay close to voice character
          style: 0.15, // slight style exaggeration for energy
          use_speaker_boost: true,
        },
        // Optimize for streaming/low latency
        optimize_streaming_latency: 3,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[TTS] ElevenLabs error:", response.status, errText.slice(0, 200));
      return NextResponse.json({ error: `TTS service error: ${response.status}` }, { status: 502 });
    }

    // Stream the audio back directly
    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[TTS] fetch error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
