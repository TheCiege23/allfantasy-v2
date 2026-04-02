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

export const CHIMMY_VOICE_CONFIG_KEY = 'chimmy-voice-config'

let activeAudio: HTMLAudioElement | null = null
let activeObjectUrl: string | null = null
let activeRequestController: AbortController | null = null
let activeUtterance: SpeechSynthesisUtterance | null = null
let activeSessionId = 0

function clampVolume(volume: unknown): number {
  if (typeof volume !== 'number' || Number.isNaN(volume)) {
    return DEFAULT_VOICE_CONFIG.volume
  }
  return Math.min(1, Math.max(0, volume))
}

function sanitizeVoiceConfig(input: Partial<VoiceConfig> | null | undefined): VoiceConfig {
  return {
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : DEFAULT_VOICE_CONFIG.enabled,
    autoPlay: typeof input?.autoPlay === 'boolean' ? input.autoPlay : DEFAULT_VOICE_CONFIG.autoPlay,
    volume: clampVolume(input?.volume),
  }
}

function canUseAudioPlayback() {
  return (
    typeof window !== 'undefined' &&
    typeof Audio !== 'undefined' &&
    typeof window.URL?.createObjectURL === 'function'
  )
}

function canUseSpeechFallback() {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  )
}

function cleanupAudioResources() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.src = ''
    activeAudio = null
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }
  if (activeRequestController) {
    activeRequestController.abort()
    activeRequestController = null
  }
}

function cleanupSpeechResources() {
  if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') return
  window.speechSynthesis.cancel()
  activeUtterance = null
}

function normalizeSpeechText(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[_*`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function trimSpeechText(raw: string): string {
  const normalized = normalizeSpeechText(raw)
  if (normalized.length <= 500) return normalized
  return `${normalized.slice(0, 497)}...`
}

export function canPlayChimmyVoice(): boolean {
  return canUseAudioPlayback() || canUseSpeechFallback()
}

export function getVoiceConfig(): VoiceConfig {
  if (typeof window === 'undefined') return DEFAULT_VOICE_CONFIG
  try {
    const stored = window.localStorage.getItem(CHIMMY_VOICE_CONFIG_KEY)
    if (!stored) return DEFAULT_VOICE_CONFIG
    return sanitizeVoiceConfig(JSON.parse(stored) as Partial<VoiceConfig>)
  } catch {
    return DEFAULT_VOICE_CONFIG
  }
}

export function saveVoiceConfig(config: Partial<VoiceConfig>): VoiceConfig {
  if (typeof window === 'undefined') {
    return sanitizeVoiceConfig(config)
  }

  const next = sanitizeVoiceConfig({ ...getVoiceConfig(), ...config })
  try {
    window.localStorage.setItem(CHIMMY_VOICE_CONFIG_KEY, JSON.stringify(next))
  } catch {}
  return next
}

export function stopCurrentVoice(): void {
  activeSessionId += 1
  if (typeof window === 'undefined') return
  cleanupAudioResources()
  cleanupSpeechResources()
}

function speakWithBrowserFallback(args: {
  text: string
  volume: number
  sessionId: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (message: string) => void
}): boolean {
  if (!canUseSpeechFallback()) return false

  const synth = window.speechSynthesis
  const speechText = trimSpeechText(args.text)
  if (!speechText) {
    args.onEnd?.()
    return true
  }

  cleanupSpeechResources()

  const utterance = new window.SpeechSynthesisUtterance(speechText)
  const voices = synth.getVoices()
  const preferredVoice =
    voices.find((voice) => /allison|samantha|karen|victoria|zira/i.test(voice.name)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en-us') && voice.default) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
    voices[0]

  if (preferredVoice) {
    utterance.voice = preferredVoice
  }

  utterance.rate = 1.08
  utterance.pitch = 1.08
  utterance.volume = clampVolume(args.volume)
  utterance.onstart = () => {
    if (activeSessionId !== args.sessionId) return
    args.onStart?.()
  }
  utterance.onend = () => {
    if (activeSessionId !== args.sessionId) return
    activeUtterance = null
    args.onEnd?.()
  }
  utterance.onerror = () => {
    if (activeSessionId !== args.sessionId) return
    activeUtterance = null
    args.onError?.('Voice playback failed.')
  }

  activeUtterance = utterance
  synth.speak(utterance)
  return true
}

export async function playChimmyVoice(
  text: string,
  config: VoiceConfig = DEFAULT_VOICE_CONFIG,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (message: string) => void
): Promise<() => void> {
  const speechText = trimSpeechText(text)
  if (!speechText || !config.enabled) {
    return () => {}
  }

  stopCurrentVoice()
  const sessionId = activeSessionId
  const fallbackToBrowserSpeech = () =>
    speakWithBrowserFallback({
      text: speechText,
      volume: config.volume,
      sessionId,
      onStart,
      onEnd,
      onError,
    })

  if (!canUseAudioPlayback()) {
    if (!fallbackToBrowserSpeech()) {
      onError?.('Voice playback is unavailable on this browser.')
    }
    return stopCurrentVoice
  }

  const controller = new AbortController()
  activeRequestController = controller

  try {
    const response = await fetch('/api/chimmy/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: speechText }),
      signal: controller.signal,
    })

    if (sessionId !== activeSessionId) {
      return stopCurrentVoice
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const message =
        typeof payload?.error === 'string' ? payload.error : 'Voice playback is unavailable right now.'
      const shouldFallback =
        response.status >= 500 ||
        response.status === 503 ||
        response.headers.get('X-Chimmy-Voice-Fallback') === 'browser'

      if (shouldFallback && fallbackToBrowserSpeech()) {
        return stopCurrentVoice
      }

      cleanupAudioResources()
      onError?.(message)
      return stopCurrentVoice
    }

    const blob = await response.blob()
    if (sessionId !== activeSessionId) {
      return stopCurrentVoice
    }

    activeRequestController = null
    const objectUrl = URL.createObjectURL(blob)
    const audio = new Audio(objectUrl)

    activeObjectUrl = objectUrl
    activeAudio = audio
    audio.volume = clampVolume(config.volume)

    audio.onended = () => {
      if (sessionId !== activeSessionId) return
      cleanupAudioResources()
      onEnd?.()
    }

    audio.onerror = () => {
      if (sessionId !== activeSessionId) return
      cleanupAudioResources()
      if (!fallbackToBrowserSpeech()) {
        onError?.('Audio playback failed.')
      }
    }

    onStart?.()
    await audio.play()
    return stopCurrentVoice
  } catch (error) {
    if (sessionId !== activeSessionId) {
      return stopCurrentVoice
    }

    const aborted = error instanceof DOMException && error.name === 'AbortError'
    cleanupAudioResources()

    if (!aborted && !fallbackToBrowserSpeech()) {
      onError?.('Voice playback failed.')
    }

    return stopCurrentVoice
  }
}
