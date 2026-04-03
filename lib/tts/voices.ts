/** ElevenLabs voice presets for Chimmy TTS (IDs from ElevenLabs). */

export type ChimmyVoice = {
  id: string
  name: string
  description: string
  gender: 'female' | 'male' | 'neutral'
  accent: string
  preview?: string
}

export const CHIMMY_VOICES: ChimmyVoice[] = [
  {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Allison',
    description: 'Warm, clear, friendly',
    gender: 'female',
    accent: 'American',
  },
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'Calm, professional',
    gender: 'female',
    accent: 'American',
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    description: 'Deep, casual, energetic',
    gender: 'male',
    accent: 'American',
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'Smooth, well-rounded',
    gender: 'male',
    accent: 'American',
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    description: 'Authoritative, sports-ready',
    gender: 'male',
    accent: 'American',
  },
  {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    description: 'Raspy, confident',
    gender: 'male',
    accent: 'American',
  },
]

export const DEFAULT_VOICE_ID = CHIMMY_VOICES[0]!.id

export const CHIMMY_VOICE_ID_STORAGE_KEY = 'chimmy_voice_id'

export function getChimmyVoiceLabel(voiceId: string): string {
  return CHIMMY_VOICES.find((v) => v.id === voiceId)?.name ?? 'Voice'
}

/** Client-only: read persisted voice from localStorage. */
export function readStoredChimmyVoiceId(): string {
  if (typeof window === 'undefined') return DEFAULT_VOICE_ID
  try {
    const s = localStorage.getItem(CHIMMY_VOICE_ID_STORAGE_KEY)
    if (s && CHIMMY_VOICES.some((v) => v.id === s)) return s
  } catch {
    /* ignore */
  }
  return DEFAULT_VOICE_ID
}

/** IDs allowed for POST /api/tts (static list + optional env override). */
export function getAllowedElevenLabsVoiceIds(): Set<string> {
  const ids = new Set(CHIMMY_VOICES.map((v) => v.id))
  const env = typeof process !== 'undefined' && process.env.ELEVENLABS_VOICE_ID?.trim()
  if (env) ids.add(env)
  return ids
}
