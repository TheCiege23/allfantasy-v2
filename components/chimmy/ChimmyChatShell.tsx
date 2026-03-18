'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Image as ImageIcon, Loader2, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { speakChimmy, stopChimmyVoice, isChimmyVoicePlaying, getDefaultChimmyChips } from '@/lib/chimmy-interface'
import ChimmyMessageBubble, { type ChimmyMessageMeta } from './ChimmyMessageBubble'
import ChimmyConversationThread from './ChimmyConversationThread'
import ChimmyQuickPrompts from './ChimmyQuickPrompts'
import ChimmyToolContext from './ChimmyToolContext'
import ChimmyProviderIndicator from './ChimmyProviderIndicator'
import ChimmyVoiceReadyControls from './ChimmyVoiceReadyControls'

export type ChimmyChatMessage = {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string | null
  meta?: ChimmyMessageMeta | null
}

const CHIMMY_GREETING =
  "I'm Chimmy — your calm, evidence-based fantasy assistant. Ask about trades, waivers, drafts, or your league. I'll keep it clear and data-backed."

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
  onSaveConversation,
  compact = false,
  onClose,
  toolContext,
  onOpenCompare,
  className = '',
}: ChimmyChatShellProps) {
  const [messages, setMessages] = useState<ChimmyChatMessage[]>([
    { role: 'assistant', content: CHIMMY_GREETING },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [lastMeta, setLastMeta] = useState<Record<string, string> | null>(null)
  const [ttsUnavailable, setTtsUnavailable] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)

  const transcriptRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const initialPromptApplied = useRef(false)
  const sendingRef = useRef(false)

  const suggestedChips = useMemo(
    () => getDefaultChimmyChips({ leagueName: leagueName ?? undefined, hasLeagues: !!leagueName }),
    [leagueName]
  )

  const canCompare = lastMeta && Object.keys(lastMeta).length > 1

  useEffect(() => {
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setTtsUnavailable(true)
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
    const t = setInterval(() => {
      if (!isChimmyVoicePlaying() && isVoicePlaying) setIsVoicePlaying(false)
    }, 500)
    return () => clearInterval(t)
  }, [isVoicePlaying])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onstart = () => {}
    recognition.onend = () => {}
    recognition.onerror = () => toast.error('Voice input failed. Try again.')
    recognition.onresult = (e: any) => {
      const t = e?.results?.[0]?.[0]?.transcript?.trim() || ''
      if (t) setInput(t)
    }
    recognitionRef.current = recognition
    return () => {
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || ttsUnavailable || !text?.trim()) return
      setIsVoicePlaying(true)
      speakChimmy(text, 'calm', { onEnd: () => setIsVoicePlaying(false) })
    },
    [voiceEnabled, ttsUnavailable]
  )

  const handleStopVoice = useCallback(() => {
    stopChimmyVoice()
    setIsVoicePlaying(false)
  }, [])

  const handleFollowUp = useCallback((prompt: string) => {
    setInput(prompt)
  }, [])

  const handleListenToLast = useCallback(() => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant')
    if (last?.content) speak(last.content)
  }, [messages, speak])

  const runSend = useCallback(
    async (
      outgoingText: string,
      image: File | null,
      conversationBeforeUser: ChimmyChatMessage[],
      options?: { replaceLastAssistant?: boolean }
    ) => {
      const userMsg: ChimmyChatMessage = {
        role: 'user',
        content: outgoingText.trim() || 'Analyze this screenshot.',
        imageUrl: image ? null : undefined,
      }
      const formData = new FormData()
      formData.append('message', outgoingText)
      if (image) formData.append('image', image)
      formData.append(
        'messages',
        JSON.stringify(
          [...conversationBeforeUser, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }))
        )
      )

      const res = await fetch('/api/chat/chimmy', { method: 'POST', body: formData })
      const data = await res.json()

      const reply = data.response ?? "I couldn't complete that. Please try again or rephrase."
      const meta = data.meta
      const providerStatus: ChimmyMessageMeta['providerStatus'] =
        meta?.providerStatus && typeof meta.providerStatus === 'object' ? meta.providerStatus : undefined

      const assistantMsg: ChimmyChatMessage = {
        role: 'assistant',
        content: reply,
        meta: {
          confidencePct: meta?.confidencePct,
          providerStatus,
          recommendedTool: meta?.recommendedTool,
          dataSources: meta?.dataSources,
          quantData: meta?.quantData,
          trendData: meta?.trendData,
        },
      }

      setLastMeta(providerStatus ?? null)
      if (options?.replaceLastAssistant) {
        setMessages((prev) => [...prev.slice(0, -1), assistantMsg])
      } else {
        setMessages((prev) => [...prev, assistantMsg])
      }
      speak(reply)
    },
    [speak]
  )

  const sendMessage = useCallback(async () => {
    if (!input.trim() && !imageFile) return
    if (sendingRef.current) return
    sendingRef.current = true

    const userMsg: ChimmyChatMessage = {
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

    try {
      await runSend(outgoingText, outImage, messages)
    } catch {
      toast.error('Failed to send. Please try again.')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Something went wrong. Please try again.", meta: null },
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

    setRetryLoading(true)
    setIsTyping(true)
    setLastMeta(null)

    try {
      await runSend(lastUserMsg.content, null, messages.slice(0, lastUserIdx), {
        replaceLastAssistant: true,
      })
    } catch {
      toast.error('Retry failed. Please try again.')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Something went wrong. Please try again.", meta: null },
      ])
    } finally {
      setIsTyping(false)
      setRetryLoading(false)
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
    if (last?.content && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(last.content)
      toast.success('Copied to clipboard.')
    }
  }, [messages])

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'
  const showRetry = lastIsAssistant && messages.length >= 2 && !isTyping

  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/10 bg-black/30 overflow-hidden touch-scroll ${compact ? 'min-h-[400px]' : 'h-fill-dynamic min-h-[420px]'} ${className}`}
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
            voiceEnabled={voiceEnabled}
            onVoiceToggle={() => setVoiceEnabled((v) => !v)}
            isPlaying={isVoicePlaying}
            onStop={handleStopVoice}
            ttsUnavailable={ttsUnavailable}
            transcriptRef={transcriptRef}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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
          onListenToLast={handleListenToLast}
          isVoicePlaying={isVoicePlaying}
        />
      </div>

      <div className="p-3 sm:p-4 border-t border-white/10 bg-white/[0.03] space-y-2">
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
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={isTyping || (!input.trim() && !imageFile)}
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
                className="inline-flex items-center gap-1 hover:text-white/60 disabled:opacity-50"
                aria-label="Retry"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${retryLoading ? 'animate-spin' : ''}`} />
                Retry
              </button>
            )}
          </div>
          {onSaveConversation && (
            <button type="button" onClick={onSaveConversation} className="hover:text-white/60">
              Save conversation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
