/**
 * ChimmyVoiceStyleProfile — calm, natural TTS defaults for Chimmy.
 * Design: trusted analyst, not hype; clear numbers, readable pacing.
 */

import type { ChimmyVoicePreset, ChimmyVoiceStyleConfig } from './types'

const CALM_PROFILE: ChimmyVoiceStyleConfig = {
  rate: 0.98,
  pitch: 1.05,
  volume: 0.95,
  pauseAfterSentenceMs: 180,
  preferredVoiceHints: ['Samantha', 'Aria', 'Zira', 'female', 'woman', 'Google US English'],
}

const ANALYST_PROFILE: ChimmyVoiceStyleConfig = {
  rate: 0.95,
  pitch: 1.0,
  volume: 0.98,
  pauseAfterSentenceMs: 220,
  preferredVoiceHints: ['Samantha', 'Aria', 'female', 'woman'],
}

const WARM_PROFILE: ChimmyVoiceStyleConfig = {
  rate: 1.02,
  pitch: 1.08,
  volume: 0.95,
  pauseAfterSentenceMs: 150,
  preferredVoiceHints: ['Samantha', 'Zira', 'Aria', 'female', 'woman'],
}

const PROFILES: Record<ChimmyVoicePreset, ChimmyVoiceStyleConfig> = {
  calm: CALM_PROFILE,
  analyst: ANALYST_PROFILE,
  warm: WARM_PROFILE,
}

/**
 * Default voice style: calm, natural, not overexcited.
 */
export function getChimmyVoiceStyleProfile(preset: ChimmyVoicePreset = 'calm'): ChimmyVoiceStyleConfig {
  return { ...PROFILES[preset] }
}

/**
 * Select a SpeechSynthesis voice that matches preferred hints (e.g. calm female).
 */
export function selectChimmyVoice(
  voices: SpeechSynthesisVoice[],
  config: ChimmyVoiceStyleConfig = CALM_PROFILE
): SpeechSynthesisVoice | null {
  if (!voices?.length) return null
  const hints = config.preferredVoiceHints ?? CALM_PROFILE.preferredVoiceHints ?? []
  const lower = (s: string) => s.toLowerCase()
  const preferred = voices.find((v) => {
    const n = lower(`${v.name} ${v.lang}`)
    return hints.some((h) => n.includes(lower(h)))
  })
  return preferred ?? voices.find((v) => lower(v.lang).startsWith('en')) ?? voices[0] ?? null
}
