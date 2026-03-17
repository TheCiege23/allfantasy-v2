'use client'

import React from 'react'

export interface ChimmyMessageMeta {
  confidencePct?: number
  providerStatus?: Record<string, string>
  recommendedTool?: string
  dataSources?: string[]
  quantData?: Record<string, unknown>
  trendData?: Record<string, unknown>
}

export interface ChimmyMessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string | null
  meta?: ChimmyMessageMeta | null
  onFollowUpClick?: (prompt: string) => void
  followUpChips?: { label: string; prompt: string }[]
  /** When true, show listen button for TTS */
  showListen?: boolean
  onListen?: () => void
  isListening?: boolean
}

function renderContentWithLinks(text: string) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    nodes.push(
      <a
        key={`l-${match.index}`}
        href={match[2]}
        className="underline text-cyan-300 hover:text-cyan-200"
        target="_blank"
        rel="noopener noreferrer"
      >
        {match[1]}
      </a>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) nodes.push(<span key="t-end">{text.slice(lastIndex)}</span>)
  return <div className="whitespace-pre-wrap break-words">{nodes.length ? nodes : text}</div>
}

export default function ChimmyMessageBubble({
  role,
  content,
  imageUrl,
  meta,
  onFollowUpClick,
  followUpChips,
  showListen,
  onListen,
  isListening,
}: ChimmyMessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-cyan-500/15 border border-cyan-400/25 text-white'
            : 'bg-white/[0.04] border border-white/10 text-white/90'
        }`}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Uploaded"
            className="max-w-full max-h-48 rounded-lg mb-2 object-cover"
          />
        )}
        <div className="text-sm leading-relaxed">{renderContentWithLinks(content)}</div>

        {!isUser && meta && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            {meta.confidencePct != null && (
              <span className="text-[10px] uppercase tracking-wider text-white/50">
                Confidence {meta.confidencePct}%
              </span>
            )}
            {meta.dataSources && meta.dataSources.length > 0 && (
              <span className="text-[10px] text-white/50">
                Sources: {meta.dataSources.slice(0, 2).join(', ')}
              </span>
            )}
          </div>
        )}

        {!isUser && showListen && onListen && (
          <div className="mt-2">
            <button
              type="button"
              onClick={onListen}
              disabled={isListening}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50 min-h-[36px]"
              aria-label="Listen to response"
            >
              {isListening ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Playing…
                </>
              ) : (
                <>Listen</>
              )}
            </button>
          </div>
        )}

        {!isUser && followUpChips && followUpChips.length > 0 && onFollowUpClick && (
          <div className="mt-3 flex flex-wrap gap-2">
            {followUpChips.slice(0, 3).map((chip) => (
              <button
                key={chip.prompt}
                type="button"
                onClick={() => onFollowUpClick(chip.prompt)}
                className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 transition min-h-[36px]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
