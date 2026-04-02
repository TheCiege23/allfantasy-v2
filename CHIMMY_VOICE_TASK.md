# CHIMMY_VOICE_TASK.md
# Drop into repo root. In Cursor: @CHIMMY_VOICE_TASK.md implement step by step

## What This Builds

Adds voice playback to Chimmy AI using the "Allison — Energetic, Clear and Bubbly"
voice profile. When Chimmy responds, users can hear the answer spoken aloud in
Allison's voice. This is additive — text responses are unchanged.

---

## The Voice

Name:        Allison
Personality: Energetic, Clear, Bubbly
Provider:    OpenAI TTS (model: tts-1, voice ID closest to the provided sample)
             OR ElevenLabs if ELEVENLABS_API_KEY is present in .env

The target voice characteristics from the audio sample:
- Upbeat, friendly tone — not flat or robotic
- Clear pronunciation, slightly faster pace than neutral
- Enthusiastic without being over the top
- Maps to: OpenAI voice "nova" or "shimmer" (closest to Allison's energy)

---

## Step 1 — Read these files completely before writing anything

```
app/api/chat/chimmy/route.ts          ← full Chimmy AI route
app/components/ChimmyChat.tsx         ← Chimmy chat UI
lib/ai-personality.ts                 ← AI_CORE_PERSONALITY, voice settings
lib/openai-client.ts                  ← existing OpenAI client
prisma/schema.prisma                  ← UserProfile for user voice preferences
lib/auth.ts
```

---

## Step 2 — Add voice preference to user settings

Read prisma/schema.prisma and check if UserProfile has a voiceEnabled field.
If not, we will store it in the API response and user localStorage only
(no schema change required for MVP).

---

## Step 3 — Create app/api/chimmy/voice/route.ts

New API route that converts Chimmy's text response to speech audio.

```typescript
// app/api/chimmy/voice/route.ts
// Converts Chimmy text responses to audio using OpenAI TTS
// Falls back to browser SpeechSynthesis if OpenAI TTS is unavailable

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import OpenAI                        from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Allison voice configuration
const ALLISON_VOICE_CONFIG = {
  model:  'tts-1',          // use tts-1 for speed, tts-1-hd for quality
  voice:  'nova',           // OpenAI voice closest to Allison's energy profile
  speed:  1.05,             // slight speed boost — Allison is energetic
  format: 'mp3' as const,
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let text: string
  try {
    const body = await req.json()
    text = String(body.text ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // Trim to 500 chars max for TTS — cost + latency control
  const trimmed = text.length > 500 ? text.slice(0, 497) + '...' : text

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 })
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model:  ALLISON_VOICE_CONFIG.model,
      voice:  ALLISON_VOICE_CONFIG.voice,
      input:  trimmed,
      speed:  ALLISON_VOICE_CONFIG.speed,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    return new Response(buffer, {
      headers: {
        'Content-Type':   'audio/mpeg',
        'Cache-Control':  'no-store',
        'X-Voice-Name':   'Allison',
        'X-Voice-Model':  ALLISON_VOICE_CONFIG.voice,
      },
    })
  } catch (err: unknown) {
    console.error('[chimmy/voice] TTS error:', err)
    return NextResponse.json(
      { error: 'TTS generation failed' },
      { status: 500 }
    )
  }
}
```

---

## Step 4 — Create lib/chimmy-voice.ts

Client-side voice utility used by ChimmyChat.tsx.

```typescript
// lib/chimmy-voice.ts
// Handles Allison voice playback for Chimmy responses.
// Primary: OpenAI TTS via /api/chimmy/voice
// Fallback: Browser SpeechSynthesis if API unavailable

export interface VoiceConfig {
  enabled:  boolean
  autoPlay: boolean
  volume:   number    // 0-1
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled:  true,
  autoPlay: false,    // user must click play — don't auto-blast audio
  volume:   0.85,
}

const VOICE_CONFIG_KEY = 'chimmy-voice-config'

export function getVoiceConfig(): VoiceConfig {
  if (typeof window === 'undefined') return DEFAULT_VOICE_CONFIG
  try {
    const stored = localStorage.getItem(VOICE_CONFIG_KEY)
    if (stored) return { ...DEFAULT_VOICE_CONFIG, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_VOICE_CONFIG
}

export function saveVoiceConfig(config: Partial<VoiceConfig>): void {
  if (typeof window === 'undefined') return
  try {
    const current = getVoiceConfig()
    localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify({ ...current, ...config }))
  } catch { /* ignore */ }
}

// Stores the currently playing audio so we can stop it
let currentAudio: HTMLAudioElement | null = null

export function stopCurrentVoice(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

/**
 * Play Chimmy's response using Allison's voice.
 * Returns a cleanup function that stops playback.
 */
export async function playChimmyVoice(
  text:     string,
  config:   VoiceConfig = DEFAULT_VOICE_CONFIG,
  onStart?: () => void,
  onEnd?:   () => void,
  onError?: (err: string) => void
): Promise<() => void> {
  stopCurrentVoice()

  if (!config.enabled || !text.trim()) {
    return () => {}
  }

  try {
    // Try OpenAI TTS first
    const res = await fetch('/api/chimmy/voice', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    })

    if (res.ok) {
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.volume = config.volume
      currentAudio = audio

      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        onEnd?.()
      })
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        onError?.('Audio playback failed')
        fallbackSpeech(text, config.volume, onStart, onEnd)
      })

      onStart?.()
      await audio.play()
      return () => stopCurrentVoice()
    }

    // API unavailable — use browser fallback
    return fallbackSpeech(text, config.volume, onStart, onEnd)
  } catch {
    return fallbackSpeech(text, config.volume, onStart, onEnd)
  }
}

function fallbackSpeech(
  text:     string,
  volume:   number,
  onStart?: () => void,
  onEnd?:   () => void
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {}

  window.speechSynthesis.cancel()
  const utterance  = new SpeechSynthesisUtterance(text)

  // Pick the best available voice matching Allison's profile
  const voices     = window.speechSynthesis.getVoices()
  const preferred  = voices.find(v =>
    /allison|nova|samantha|karen|victoria/i.test(v.name)
  ) ?? voices.find(v => v.lang.startsWith('en') && v.default) ?? voices[0]

  if (preferred) utterance.voice = preferred
  utterance.rate   = 1.1    // Allison is slightly fast
  utterance.pitch  = 1.1    // Allison is slightly upbeat
  utterance.volume = volume
  utterance.onstart = () => onStart?.()
  utterance.onend   = () => onEnd?.()

  window.speechSynthesis.speak(utterance)
  return () => window.speechSynthesis.cancel()
}
```

---

## Step 5 — Update app/components/ChimmyChat.tsx

Read the file completely first.
Add voice controls without changing any existing logic.

Find where Chimmy's response text is rendered.
Add these additions:

### 5a — Add voice state (near existing useState declarations):

```typescript
import { playChimmyVoice, stopCurrentVoice, getVoiceConfig, saveVoiceConfig, VoiceConfig } from '@/lib/chimmy-voice'

// Inside the component:
const [voiceConfig,    setVoiceConfig]    = useState<VoiceConfig>(getVoiceConfig)
const [voicePlaying,   setVoicePlaying]   = useState(false)
const [voiceLoading,   setVoiceLoading]   = useState(false)
const [voiceMessageId, setVoiceMessageId] = useState<string | null>(null)
```

### 5b — Add play function:

```typescript
const handlePlayVoice = useCallback(async (text: string, messageId: string) => {
  if (voicePlaying && voiceMessageId === messageId) {
    stopCurrentVoice()
    setVoicePlaying(false)
    setVoiceMessageId(null)
    return
  }
  setVoiceLoading(true)
  setVoiceMessageId(messageId)
  await playChimmyVoice(
    text,
    voiceConfig,
    () => { setVoiceLoading(false); setVoicePlaying(true)  },
    () => { setVoicePlaying(false); setVoiceMessageId(null) },
    () => { setVoiceLoading(false); setVoicePlaying(false)  }
  )
}, [voiceConfig, voicePlaying, voiceMessageId])

// Stop voice when component unmounts
useEffect(() => () => stopCurrentVoice(), [])
```

### 5c — Add voice button to each Chimmy response bubble:

Find where each assistant message is rendered and add after the text:

```typescript
// After the message text, inside the Chimmy response bubble:
{message.role === 'assistant' && (
  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/8">
    <button
      onClick={() => handlePlayVoice(message.content, message.id)}
      disabled={voiceLoading && voiceMessageId === message.id}
      className={`flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition-all ${
        voicePlaying && voiceMessageId === message.id
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          : 'bg-white/6 text-white/40 hover:text-white/70 hover:bg-white/10'
      }`}
      title={voicePlaying && voiceMessageId === message.id ? 'Stop Allison' : 'Play with Allison voice'}
    >
      {voiceLoading && voiceMessageId === message.id ? (
        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                  strokeDasharray="40" strokeDashoffset="10"/>
        </svg>
      ) : voicePlaying && voiceMessageId === message.id ? (
        // Stop icon
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1"/>
        </svg>
      ) : (
        // Play icon
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      )}
      {voicePlaying && voiceMessageId === message.id ? 'Stop' : 'Allison'}
    </button>

    {/* Voice toggle in settings area */}
    <button
      onClick={() => {
        const updated = { ...voiceConfig, enabled: !voiceConfig.enabled }
        setVoiceConfig(updated)
        saveVoiceConfig(updated)
      }}
      className="text-[10px] text-white/25 hover:text-white/50 transition-colors ml-auto"
      title={voiceConfig.enabled ? 'Disable voice' : 'Enable voice'}
    >
      {voiceConfig.enabled ? '🔊' : '🔇'}
    </button>
  </div>
)}
```

### 5d — Add auto-play on new messages (optional, disabled by default):

```typescript
// After messages are received, if autoPlay is on:
useEffect(() => {
  if (!voiceConfig.autoPlay) return
  const lastMsg = messages[messages.length - 1]
  if (lastMsg?.role === 'assistant' && lastMsg.content) {
    handlePlayVoice(lastMsg.content, lastMsg.id ?? String(messages.length))
  }
}, [messages]) // only trigger on new messages
```

---

## Step 6 — Store voice sample in public/

Place the provided audio file at:
```
public/chimmy-voice-sample.mp3
```
This lets users preview the Allison voice on the settings page.

---

## Step 7 — Add voice settings to user preferences

Find the user settings or profile page.
Add a "Chimmy Voice" section:

```typescript
// In settings page / profile page:
<div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-5">
  <h3 className="text-sm font-bold text-white mb-1">Chimmy Voice</h3>
  <p className="text-xs text-white/45 mb-4">
    Chimmy can speak responses aloud using Allison's voice — energetic, clear, and bubbly.
  </p>

  {/* Preview button */}
  <button
    onClick={() => {
      const audio = new Audio('/chimmy-voice-sample.mp3')
      audio.volume = 0.85
      audio.play()
    }}
    className="flex items-center gap-2 text-xs font-semibold rounded-xl border border-white/15 px-4 py-2 text-white/60 hover:text-white hover:border-white/30 transition-all mb-4"
  >
    ▶ Preview Allison's voice
  </button>

  {/* Voice enabled toggle */}
  <label className="flex items-center gap-3 cursor-pointer mb-3">
    <div className="relative">
      <input type="checkbox" className="sr-only"
        checked={voiceConfig.enabled}
        onChange={e => {
          const updated = { ...voiceConfig, enabled: e.target.checked }
          setVoiceConfig(updated)
          saveVoiceConfig(updated)
        }}
      />
      <div className={`w-10 h-6 rounded-full transition-colors ${voiceConfig.enabled ? 'bg-cyan-500' : 'bg-white/15'}`}/>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${voiceConfig.enabled ? 'left-5' : 'left-1'}`}/>
    </div>
    <span className="text-sm text-white/70">Enable voice responses</span>
  </label>

  {/* Auto-play toggle */}
  <label className="flex items-center gap-3 cursor-pointer mb-3">
    <div className="relative">
      <input type="checkbox" className="sr-only"
        checked={voiceConfig.autoPlay}
        onChange={e => {
          const updated = { ...voiceConfig, autoPlay: e.target.checked }
          setVoiceConfig(updated)
          saveVoiceConfig(updated)
        }}
      />
      <div className={`w-10 h-6 rounded-full transition-colors ${voiceConfig.autoPlay ? 'bg-cyan-500' : 'bg-white/15'}`}/>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${voiceConfig.autoPlay ? 'left-5' : 'left-1'}`}/>
    </div>
    <span className="text-sm text-white/70">Auto-play responses</span>
    <span className="text-[10px] text-white/25">(off by default)</span>
  </label>

  {/* Volume */}
  <div>
    <label className="text-xs text-white/40 mb-2 block">Volume: {Math.round(voiceConfig.volume * 100)}%</label>
    <input type="range" min={0} max={100} value={voiceConfig.volume * 100}
      onChange={e => {
        const updated = { ...voiceConfig, volume: Number(e.target.value) / 100 }
        setVoiceConfig(updated)
        saveVoiceConfig(updated)
      }}
      className="w-full accent-cyan-500"
    />
  </div>
</div>
```

---

## Step 8 — Add env variable

Add to .env.local (if not already present):
```
OPENAI_API_KEY=your-key-here
```
And document in .env.example:
```
# OpenAI TTS for Chimmy voice (Allison — nova voice)
OPENAI_API_KEY=
```

---

## Voice Behavior Rules

1. **Default is OFF** — voice does not play automatically until the user
   clicks the play button or enables auto-play in settings.

2. **One voice at a time** — clicking play on a new message stops any
   currently playing audio before starting the new one.

3. **Only Chimmy responses** — user messages are never spoken aloud.

4. **Text is trimmed to 500 chars** — prevents long responses from
   generating expensive/slow TTS audio.

5. **Graceful fallback** — if OpenAI TTS fails or is unconfigured,
   falls back to browser SpeechSynthesis with an Allison-approximate voice.

6. **Settings persist** — voice on/off, auto-play, and volume are saved
   to localStorage under key 'chimmy-voice-config'.

---

## Why "nova" voice for Allison

OpenAI's available voices and their personality matches:
- `alloy`   — neutral, balanced
- `echo`    — male, clear
- `fable`   — warm, British
- `onyx`    — deep, authoritative
- `nova`    — bright, energetic ← closest to Allison
- `shimmer` — warm, friendly ← second choice

"nova" matches Allison's energetic and clear characteristics best.
The `speed: 1.05` setting adds Allison's slightly faster, bubbly delivery.

If ElevenLabs is preferred in future, add ELEVENLABS_API_KEY to .env
and the voice ID from ElevenLabs that matches the uploaded sample.

---

## Final Checks

```bash
npx tsc --noEmit
```

Fix all type errors — especially:
- `playChimmyVoice` async return type
- `VoiceConfig` type imports in ChimmyChat.tsx
- `message.id` may need to be typed (check existing message interface)

Commit:
```bash
git add lib/chimmy-voice.ts
git add app/api/chimmy/voice/route.ts
git add app/components/ChimmyChat.tsx
git add public/chimmy-voice-sample.mp3
git commit -m "feat: add Allison voice to Chimmy AI with OpenAI TTS and browser speech fallback"
```

---

## Constraints

- Do NOT change app/api/chat/chimmy/route.ts — voice is client-side only
- Do NOT auto-play by default — user must opt in
- Do NOT block the chat UI while audio loads
- All fetch calls are fire-and-forget with try/catch
- No new npm dependencies — uses openai package already installed
- Works without OPENAI_API_KEY (falls back to browser SpeechSynthesis)
