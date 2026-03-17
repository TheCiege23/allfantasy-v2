'use client'

import React, { useEffect, useRef } from 'react'
import ChimmyMessageBubble, { type ChimmyMessageMeta } from './ChimmyMessageBubble'

export type ChimmyConversationMessage = {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string | null
  meta?: ChimmyMessageMeta | null
}

const FOLLOW_UP_CHIPS = [
  { label: 'Explain that in more detail', prompt: 'Can you explain that in more detail?' },
  { label: 'What should I do next?', prompt: 'What should I do next?' },
  { label: 'What are the risks?', prompt: 'What are the risks or caveats?' },
]

export interface ChimmyConversationThreadProps {
  messages: ChimmyConversationMessage[]
  isTyping?: boolean
  onFollowUpClick?: (prompt: string) => void
  onListenToLast?: () => void
  isVoicePlaying?: boolean
  className?: string
}

/**
 * Renders the conversation: message bubbles, follow-ups on last assistant message, typing indicator.
 * Calm, clear presentation — no hype.
 */
export default function ChimmyConversationThread({
  messages,
  isTyping = false,
  onFollowUpClick,
  onListenToLast,
  isVoicePlaying = false,
  className = '',
}: ChimmyConversationThreadProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className={`space-y-4 ${className}`}>
      {messages.map((msg, i) => (
        <ChimmyMessageBubble
          key={i}
          role={msg.role}
          content={msg.content}
          imageUrl={msg.imageUrl}
          meta={msg.meta}
          followUpChips={
            msg.role === 'assistant' && i === messages.length - 1 && !isTyping
              ? FOLLOW_UP_CHIPS
              : undefined
          }
          onFollowUpClick={onFollowUpClick}
          showListen={msg.role === 'assistant' && i === messages.length - 1 && !isTyping}
          onListen={onListenToLast}
          isListening={isVoicePlaying}
        />
      ))}

      {isTyping && (
        <div className="flex justify-start">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
              <span
                className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: '0.3s' }}
              />
              <span className="ml-1">Thinking…</span>
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} aria-hidden />
    </div>
  )
}
