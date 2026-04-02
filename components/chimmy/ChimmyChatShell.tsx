'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Image as ImageIcon, Loader2, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getDefaultChimmyChips, type ChimmyVoicePreset } from '@/lib/chimmy-interface'
import {
  getAIThreadStorageKey,
  loadAIThreadMessages,
  resolveSportForAIChat,
  saveAIThreadMessages,
  sendChimmyMessage,
} from '@/lib/chimmy-chat'
import type { AIChatContext } from '@/lib/chimmy-chat'
import ChimmyMessageBubble, { type ChimmyMessageMeta } from './ChimmyMessageBubble'
import ChimmyConversationThread from './ChimmyConversationThread'
import ChimmyQuickPrompts from './ChimmyQuickPrompts'
import ChimmyToolContext from './ChimmyToolContext'
import ChimmyProviderIndicator from './ChimmyProviderIndicator'
import ChimmyVoiceReadyControls from './ChimmyVoiceReadyControls'
import { InContextMonetizationCard } from '@/components/monetization/InContextMonetizationCard'
import {
  CHIMMY_DEFAULT_UPGRADE_PATH,
  CHIMMY_GENERIC_ERROR_MESSAGE,
  CHIMMY_PREMIUM_CTA_LABEL,
} from '@/lib/chimmy-chat/response-copy'
import {
  canPlayChimmyVoice,
  getVoiceConfig,
  playChimmyVoice,
  saveVoiceConfig,
  stopCurrentVoice,
  type VoiceConfig,
} from '@/lib/chimmy-voice'

export type ChimmyChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string | null
  meta?: ChimmyMessageMeta | null
}

const CHIMMY_GREETING =
  "I'm Chimmy — your calm, evidence-based fantasy assistant. Ask about trades, waivers, drafts, or your league. I'll keep it clear and data-backed."

function createMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `chimmy-msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildGreetingMessage(): ChimmyChatMessage {
  return {
    id: 'chimmy-greeting',
    role: 'assistant',
    content: CHIMMY_GREETING,
  }
}

function ensureMessageIds(messages: ChimmyChatMessage[]): ChimmyChatMessage[] {
  return messages.map((message) => ({
    ...message,
    id: message.id || createMessageId(),
  }))
}

export interface ChimmyToolContextValue {
  toolName?: string
  summary?: string
  leagueName?: string | null
  sport?: string | null
}

export interface ChimmyChatShellProps {
  /** Prefill input from URL or tool handoff */
  initialPrompt?: string
  /** Clear URL prompt after applying (default true) */
  clearUrlPromptAfterUse?: boolean
  /** Optional league context for chips */
  leagueName?: string | null
  /** Optional league id for targeted context queries */
  leagueId?: string | null
  /** Optional sleeper username for enrichment */
  sleeperUsername?: string | null
  /** Optional insight type for targeted AI routing */
  insightType?: 'matchup' | 'playoff' | 'dynasty' | 'trade' | 'waiver' | 'draft'
  /** Optional team id for team-scoped insight routes */
  teamId?: string | null
  /** Optional sport context */
  sport?: string | null
  /** Optional season context */
  season?: number | null
  /** Optional week/period context */
  week?: number | null
  /** Optional thread/conversation context for DM-aware AI mode. */
  conversationId?: string | null
  /** Optional private mode target for DM AI chat. */
  privateMode?: boolean
  /** Optional DM username target for private AI mode. */
  targetUsername?: string | null
  /** Optional strategy mode label for AI routing hints. */
  strategyMode?: string | null
  /** Optional source tag for orchestration context/routing hints. */
  source?: AIChatContext['source']
  /** Optional: on "Save conversation" (placeholder) */
  onSaveConversation?: () => void
  /** Optional: compact mode (e.g. drawer) */
  compact?: boolean
  /** When provided, show close button and call on close (drawer/split) */
  onClose?: () => void
  /** Tool context when opened from "Open result in Chimmy" */
  toolContext?: ChimmyToolContextValue | null
  /** Optional: open provider comparison (e.g. modal or route) */
  onOpenCompare?: () => void
  /** Voice profile preset (reserved for compatibility). */
  voicePreset?: ChimmyVoicePreset
  /** Enable speech input control (default true). */
  enableSpeechInput?: boolean
  className?: string
}

declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

export default function ChimmyChatShell({
  initialPrompt = '',
  clearUrlPromptAfterUse = true,
  leagueName,
  leagueId,
  sleeperUsername,
  insightType,
  teamId,
  sport,
  season,
  week,
  conversationId,
  privateMode = false,
  targetUsername,
  strategyMode,
  source,
  onSaveConversation,
  compact = false,
  onClose,
  toolContext,
  onOpenCompare,
  voicePreset: _voicePreset = 'calm',
  enableSpeechInput = true,
  className = '',
}: ChimmyChatShellProps) {
  const [messages, setMessages] = useState<ChimmyChatMessage[]>([
    buildGreetingMessage(),
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(() => getVoiceConfig())
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [voiceMessageId, setVoiceMessageId] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [lastMeta, setLastMeta] = useState<Record<string, string> | null>(null)
  const [ttsUnavailable, setTtsUnavailable] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [speechInputUnavailable, setSpeechInputUnavailable] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [retryLoading, setRetryLoading] = useState(false)

  const transcriptRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const initialPromptApplied = useRef(false)
  const sendingRef = useRef(false)

  const suggestedChips = useMemo(
    () => getDefaultChimmyChips({ leagueName: leagueName ?? undefined, hasLeagues: !!leagueName }),
    [leagueName]
  )
  const resolvedSport = useMemo(() => resolveSportForAIChat(sport, null), [sport])
  const requestContext = useMemo(
    () => ({
      leagueId: leagueId ?? undefined,
      sleeperUsername: sleeperUsername ?? undefined,
      insightType,
      teamId: teamId ?? undefined,
      sport: resolvedSport,
      season: season ?? undefined,
      week: week ?? undefined,
      conversationId: conversationId ?? undefined,
      privateMode,
      targetUsername: targetUsername ?? undefined,
      strategyMode: strategyMode ?? undefined,
      source: source ?? (privateMode ? "messages_dm_ai" : "messages_ai"),
    }),
    [
      conversationId,
      insightType,
      leagueId,
      privateMode,
      resolvedSport,
      season,
      sleeperUsername,
      source,
      strategyMode,
      targetUsername,
      teamId,
      week,
    ]
  )
  const threadStorageKey = useMemo(
    () =>
      getAIThreadStorageKey({
        leagueId: leagueId ?? undefined,
        sport: resolvedSport,
        insightType,
        teamId: teamId ?? undefined,
        conversationId: conversationId ?? undefined,
      }),
    [conversationId, insightType, leagueId, resolvedSport, teamId]
  )

  const canCompare = lastMeta && Object.keys(lastMeta).length > 1

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!canPlayChimmyVoice()) {
      setTtsUnavailable(true)
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechInputUnavailable(true)
    }
  }, [])

  useEffect(() => {
    if (initialPrompt && !initialPromptApplied.current) {
      setInput(initialPrompt)
      initialPromptApplied.current = true
      if (clearUrlPromptAfterUse && typeof window !== 'undefined') {
        const u = new URL(window.location.href)
        if (u.searchParams.has('prompt')) {
          u.searchParams.delete('prompt')
          window.history.replaceState({}, '', u.pathname + u.search)
        }
      }
    }
  }, [initialPrompt, clearUrlPromptAfterUse])

  useEffect(() => {
    const restored = loadAIThreadMessages(threadStorageKey)
    if (restored.length > 0) {
      setMessages(ensureMessageIds(restored as ChimmyChatMessage[]))
      return
    }
    setMessages([buildGreetingMessage()])
  }, [threadStorageKey])

  useEffect(() => {
    saveAIThreadMessages(threadStorageKey, messages)
  }, [messages, threadStorageKey])

  useEffect(() => {
    return () => stopCurrentVoice()
  }, [])

  useEffect(() => {
    if (!enableSpeechInput) return
    if (typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onstart = () => {
      setIsListening(true)
      setInlineError(null)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => {
      setIsListening(false)
      toast.error('Voice input failed. Try again.')
    }
    recognition.onresult = (e: any) => {
      const t = e?.results?.[0]?.[0]?.transcript?.trim() || ''
      if (t) {
        setInput((prev) => (prev.trim().length > 0 ? `${prev.trim()} ${t}` : t))
      }
    }
    recognitionRef.current = recognition
    return () => {
      try {
        recognition.stop()
      } catch {}
      recognitionRef.current = null
    }
  }, [enableSpeechInput])

  const updateVoiceConfig = useCallback((patch: Partial<VoiceConfig>) => {
    setVoiceConfig((current) => {
      const next = saveVoiceConfig({ ...current, ...patch })
      return next
    })
  }, [])

  const handleStopVoice = useCallback(() => {
    stopCurrentVoice()
    setTtsLoading(false)
    setIsVoicePlaying(false)
    setVoiceMessageId(null)
  }, [])

  const handleVoiceToggle = useCallback(() => {
    const nextEnabled = !voiceConfig.enabled
    updateVoiceConfig({ enabled: nextEnabled })
    if (!nextEnabled) {
      handleStopVoice()
    }
  }, [handleStopVoice, updateVoiceConfig, voiceConfig.enabled])

  const handlePlayVoice = useCallback(
    async (text: string, messageId: string) => {
      if (ttsUnavailable) {
        const message = 'Voice playback is unavailable on this browser.'
        setInlineError(message)
        toast.error(message)
        return
      }

      if (isVoicePlaying && voiceMessageId === messageId) {
        handleStopVoice()
        return
      }

      setInlineError(null)
      setTtsLoading(true)
      setVoiceMessageId(messageId)

      await playChimmyVoice(
        text,
        voiceConfig,
        () => {
          setTtsLoading(false)
          setIsVoicePlaying(true)
        },
        () => {
          setTtsLoading(false)
          setIsVoicePlaying(false)
          setVoiceMessageId(null)
        },
        (message) => {
          setTtsLoading(false)
          setIsVoicePlaying(false)
          setVoiceMessageId(null)
          setInlineError(message)
          toast.error(message)
        }
      )
    },
    [handleStopVoice, isVoicePlaying, ttsUnavailable, voiceConfig, voiceMessageId]
  )

  const handleFollowUp = useCallback((prompt: string) => {
    setInput(prompt)
    setInlineError(null)
  }, [])

  const handleSpeechInputToggle = useCallback(() => {
    if (!enableSpeechInput) return
    if (speechInputUnavailable) {
      toast.error('Voice input is unavailable on this browser.')
      return
    }
    const recognition = recognitionRef.current
    if (!recognition) {
      toast.error('Voice input is unavailable on this browser.')
      return
    }
    try {
      if (isListening) {
        recognition.stop()
      } else {
        recognition.start()
      }
    } catch {
      toast.error('Could not start voice input.')
    }
  }, [enableSpeechInput, isListening, speechInputUnavailable])

  const runSend = useCallback(
    async (
      outgoingText: string,
      image: File | null,
      conversationBeforeUser: ChimmyChatMessage[],
      options?: { replaceLastAssistant?: boolean }
    ) => {
      const userMsg: ChimmyChatMessage = {
        id: createMessageId(),
        role: 'user',
        content: outgoingText.trim() || 'Analyze this screenshot.',
        imageUrl: image ? null : undefined,
      }
      const assistantMessageId = createMessageId()
      let streamedAssistantHandled = false
      const result = await sendChimmyMessage({
        message: outgoingText,
        imageFile: image,
        conversation: [...conversationBeforeUser, userMsg],
        context: requestContext,
        onChunk: (text) => {
          streamedAssistantHandled = true
          const partialAssistant: ChimmyChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: text,
            meta: null,
          }

          if (options?.replaceLastAssistant) {
            setMessages((prev) => [...prev.slice(0, -1), partialAssistant])
            return
          }

          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), partialAssistant]
            }
            return [...prev, partialAssistant]
          })
        },
      })

      if (!result.ok && result.error) {
        setInlineError(result.error)
        toast.error(result.error)
      } else if (result.upgradeRequired) {
        setInlineError(null)
      } else {
        setInlineError(null)
      }

      const reply = result.response || CHIMMY_GENERIC_ERROR_MESSAGE
      const meta = result.meta
      const providerStatus: ChimmyMessageMeta['providerStatus'] = meta?.providerStatus

      const assistantMsg: ChimmyChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: reply,
        meta: {
          confidencePct: result.meta?.confidencePct,
          providerStatus,
          recommendedTool: result.meta?.recommendedTool,
          dataSources: result.meta?.dataSources,
          quantData: result.meta?.quantData,
          trendData: result.meta?.trendData,
          responseStructure: result.meta?.responseStructure,
          variant:
            result.meta?.variant ??
            (result.upgradeRequired ? 'premium_gate' : !result.ok ? 'error' : undefined),
          ctaLabel:
            result.meta?.ctaLabel ??
            (result.upgradeRequired ? CHIMMY_PREMIUM_CTA_LABEL : undefined),
          ctaHref:
            result.meta?.ctaHref ??
            (result.upgradeRequired ? result.upgradePath ?? CHIMMY_DEFAULT_UPGRADE_PATH : undefined),
        },
      }

      setLastMeta(providerStatus ?? null)
      if (options?.replaceLastAssistant || streamedAssistantHandled) {
        setMessages((prev) => [...prev.slice(0, -1), assistantMsg])
      } else {
        setMessages((prev) => [...prev, assistantMsg])
      }
      if (
        voiceConfig.enabled &&
        voiceConfig.autoPlay &&
        assistantMsg.meta?.variant !== 'premium_gate' &&
        assistantMsg.meta?.variant !== 'error'
      ) {
        void handlePlayVoice(assistantMsg.content, assistantMsg.id)
      }
    },
    [handlePlayVoice, requestContext, voiceConfig.autoPlay, voiceConfig.enabled]
  )

  const sendMessage = useCallback(async () => {
    if (!input.trim() && !imageFile) return
    if (sendingRef.current) return
    sendingRef.current = true

    const userMsg: ChimmyChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: input.trim() || 'Analyze this screenshot.',
      imageUrl: imagePreview || null,
    }
    setMessages((prev) => [...prev, userMsg])
    const outgoingText = input
    const outImage = imageFile
    setInput('')
    setImagePreview(null)
    setImageFile(null)
    setIsTyping(true)
    setLastMeta(null)
    setInlineError(null)

    try {
      await runSend(outgoingText, outImage, messages)
    } catch {
      setInlineError(CHIMMY_GENERIC_ERROR_MESSAGE)
      toast.error(CHIMMY_GENERIC_ERROR_MESSAGE)
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: CHIMMY_GENERIC_ERROR_MESSAGE,
          meta: { variant: 'error' },
        },
      ])
    } finally {
      setIsTyping(false)
      sendingRef.current = false
    }
  }, [input, imageFile, imagePreview, messages, runSend])

  const handleRetry = useCallback(async () => {
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user')
    if (lastUserIdx === -1) return
    const lastUserMsg = messages[lastUserIdx]
    if (!lastUserMsg) return
    if (sendingRef.current || retryLoading) return

    sendingRef.current = true
    setRetryLoading(true)
    setIsTyping(true)
    setLastMeta(null)
    setInlineError(null)

    try {
      await runSend(lastUserMsg.content, null, messages.slice(0, lastUserIdx), {
        replaceLastAssistant: true,
      })
    } catch {
      setInlineError(CHIMMY_GENERIC_ERROR_MESSAGE)
      toast.error(CHIMMY_GENERIC_ERROR_MESSAGE)
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: CHIMMY_GENERIC_ERROR_MESSAGE,
          meta: { variant: 'error' },
        },
      ])
    } finally {
      setIsTyping(false)
      setRetryLoading(false)
      sendingRef.current = false
    }
  }, [messages, runSend, retryLoading])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image.')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCopyResponse = useCallback(() => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant')
    const structure = last?.meta?.responseStructure
    const structuredText = structure
      ? [
          `Short Answer: ${structure.shortAnswer}`,
          structure.whatDataSays ? `What the Data Says: ${structure.whatDataSays}` : '',
          structure.whatItMeans ? `What It Means: ${structure.whatItMeans}` : '',
          structure.recommendedAction ? `Recommended Action: ${structure.recommendedAction}` : '',
          structure.caveats && structure.caveats.length > 0 ? `Caveats: ${structure.caveats.join(' | ')}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      : ''
    const textToCopy = structuredText || last?.content

    if (textToCopy && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy)
      toast.success('Copied to clipboard.')
      setInlineError(null)
      return
    }
    setInlineError('Clipboard is unavailable in this browser.')
    toast.error('Clipboard is unavailable.')
  }, [messages])

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'
  const showRetry = lastIsAssistant && messages.length >= 2 && !isTyping

  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/10 bg-black/30 overflow-hidden touch-scroll ${compact ? 'min-h-[400px]' : 'h-fill-dynamic min-h-[420px]'} ${className}`}
      data-testid="chimmy-chat-shell"
    >
      <header className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg shrink-0">
            ✦
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-white truncate">Chimmy</h2>
            <p className="text-[10px] sm:text-xs text-white/50 truncate">
              Calm, evidence-based fantasy assistant
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              data-testid="chimmy-close-button"
              className="ml-auto shrink-0 rounded-lg border border-white/20 bg-white/5 p-2 text-white/70 hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ChimmyProviderIndicator
            lastMeta={lastMeta}
            onOpenCompare={onOpenCompare}
            canCompare={!!canCompare}
          />
          <ChimmyVoiceReadyControls
            voiceEnabled={voiceConfig.enabled}
            onVoiceToggle={handleVoiceToggle}
            isPlaying={isVoicePlaying}
            onStop={handleStopVoice}
            ttsLoading={ttsLoading}
            ttsUnavailable={ttsUnavailable}
            onSpeechInputToggle={enableSpeechInput ? handleSpeechInputToggle : undefined}
            speechInputUnavailable={speechInputUnavailable}
            isListening={isListening}
            transcriptRef={transcriptRef}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <InContextMonetizationCard
          title="Chimmy message access"
          featureId="ai_chat"
          tokenRuleCodes={['ai_chimmy_chat_message']}
          className="mb-2"
          testIdPrefix="chimmy-monetization"
        />
        {toolContext && (
          <ChimmyToolContext
            toolName={toolContext.toolName}
            summary={toolContext.summary}
            leagueName={toolContext.leagueName}
            sport={toolContext.sport}
          />
        )}

        {messages.length <= 1 && suggestedChips.length > 0 && (
          <ChimmyQuickPrompts
            chips={suggestedChips}
            onSelect={setInput}
            maxVisible={4}
          />
        )}

        <ChimmyConversationThread
          messages={messages}
          isTyping={isTyping}
          onFollowUpClick={handleFollowUp}
          onPlayVoice={handlePlayVoice}
          onVoiceEnabledToggle={handleVoiceToggle}
          voiceEnabled={voiceConfig.enabled}
          voiceLoadingId={ttsLoading ? voiceMessageId : null}
          voicePlayingId={isVoicePlaying ? voiceMessageId : null}
          className="chimmy-conversation-thread"
        />
      </div>

      <div className="p-3 sm:p-4 border-t border-white/10 bg-white/[0.03] space-y-2">
        {isTyping && (
          <p className="text-[11px] text-white/55" data-testid="chimmy-loading-state">
            Chimmy is preparing a response...
          </p>
        )}
        {inlineError && (
          <p className="text-[11px] text-amber-300" data-testid="chimmy-inline-error">
            {inlineError}
          </p>
        )}
        {imagePreview && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5">
            <img src={imagePreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => {
                setImagePreview(null)
                setImageFile(null)
              }}
              className="text-xs text-red-300 hover:text-red-200"
            >
              Remove
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <label className="flex-shrink-0 w-11 h-11 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 min-h-[44px]">
            <ImageIcon className="h-5 w-5 text-cyan-400/80" />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              data-testid="chimmy-image-upload-input"
              className="hidden"
            />
          </label>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask about trades, waivers, drafts, or your league…"
            className="flex-1 min-w-0 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-500/40 focus:outline-none disabled:opacity-50"
            disabled={isTyping}
            aria-label="Message"
            data-testid="chimmy-message-input"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={isTyping || (!input.trim() && !imageFile)}
            data-testid="chimmy-send-button"
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50 min-h-[44px]"
            aria-label="Send message"
          >
            {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-white/40 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyResponse}
              data-testid="chimmy-copy-response-button"
              className="hover:text-white/60"
              aria-label="Copy response"
            >
              Copy response
            </button>
            {showRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retryLoading}
                data-testid="chimmy-retry-button"
                className="inline-flex items-center gap-1 hover:text-white/60 disabled:opacity-50"
                aria-label="Retry"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${retryLoading ? 'animate-spin' : ''}`} />
                Retry
              </button>
            )}
          </div>
          {onSaveConversation && (
            <button
              type="button"
              onClick={onSaveConversation}
              data-testid="chimmy-save-conversation-button"
              className="hover:text-white/60"
            >
              Save conversation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
