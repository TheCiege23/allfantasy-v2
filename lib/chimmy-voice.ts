import { speakChimmy, stopChimmyVoice } from "@/lib/chimmy-interface/VoicePlaybackController"

export interface VoiceConfig {
  enabled: boolean
  autoPlay: boolean
  volume: number
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  autoPlay: false,
  volume: 0.85,
}

export const CHIMMY_VOICE_CONFIG_KEY = "chimmy-voice-config"

function clampVolume(volume: unknown): number {
  if (typeof volume !== "number" || Number.isNaN(volume)) {
    return DEFAULT_VOICE_CONFIG.volume
  }
  return Math.min(1, Math.max(0, volume))
}

function sanitizeVoiceConfig(input: Partial<VoiceConfig> | null | undefined): VoiceConfig {
  return {
    enabled: typeof input?.enabled === "boolean" ? input.enabled : DEFAULT_VOICE_CONFIG.enabled,
    autoPlay: typeof input?.autoPlay === "boolean" ? input.autoPlay : DEFAULT_VOICE_CONFIG.autoPlay,
    volume: clampVolume(input?.volume),
  }
}

function normalizeSpeechText(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[_*`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function trimSpeechText(raw: string): string {
  const normalized = normalizeSpeechText(raw)
  if (normalized.length <= 500) return normalized
  return `${normalized.slice(0, 497)}...`
}

export function canPlayChimmyVoice(): boolean {
  if (typeof window === "undefined") return false
  const hasAudio =
    typeof Audio !== "undefined" && typeof window.URL?.createObjectURL === "function"
  const hasSpeech =
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  return hasAudio || hasSpeech
}

export function getVoiceConfig(): VoiceConfig {
  if (typeof window === "undefined") return DEFAULT_VOICE_CONFIG
  try {
    const stored = window.localStorage.getItem(CHIMMY_VOICE_CONFIG_KEY)
    if (!stored) return DEFAULT_VOICE_CONFIG
    return sanitizeVoiceConfig(JSON.parse(stored) as Partial<VoiceConfig>)
  } catch {
    return DEFAULT_VOICE_CONFIG
  }
}

export function saveVoiceConfig(config: Partial<VoiceConfig>): VoiceConfig {
  if (typeof window === "undefined") {
    return sanitizeVoiceConfig(config)
  }

  const next = sanitizeVoiceConfig({ ...getVoiceConfig(), ...config })
  try {
    window.localStorage.setItem(CHIMMY_VOICE_CONFIG_KEY, JSON.stringify(next))
  } catch {}
  return next
}

/** Stops server audio + browser speech (shared with Chimmy interface voice controller). */
export function stopCurrentVoice(): void {
  stopChimmyVoice()
}

/**
 * Speak Chimmy text via `POST /api/tts` (ElevenLabs), with browser speech fallback.
 * Returns the stop function immediately (playback continues asynchronously).
 */
export function playChimmyVoice(
  text: string,
  config: VoiceConfig = DEFAULT_VOICE_CONFIG,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (message: string) => void
): Promise<() => void> {
  const speechText = trimSpeechText(text)
  if (!speechText || !config.enabled) {
    return Promise.resolve(() => {})
  }

  const stop = speakChimmy(speechText, "calm", {
    voice: "rachel",
    volume: config.volume,
    onStart,
    onEnd,
    onError: () => onError?.("Voice playback failed."),
    onUnavailable: (msg) => onError?.(msg),
  })

  return Promise.resolve(stop)
}
