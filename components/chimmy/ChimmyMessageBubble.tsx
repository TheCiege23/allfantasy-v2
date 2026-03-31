'use client'

import React from 'react'
import { SuggestedActionRenderer } from '@/lib/chimmy-chat/SuggestedActionRenderer'
import {
  buildChimmyCollapsedSummary,
  isLongChimmyResponse,
} from '@/lib/chimmy-chat/presentation'
import {
  getConfidenceDisplayText,
  getConfidenceFromApiResponse,
  shouldShowConfidence,
} from '@/lib/chimmy-interface'
import ChimmyResponseStructure from './ChimmyResponseStructure'

interface ChimmyResponseStructureMeta {
  shortAnswer: string
  whatDataSays?: string
  whatItMeans?: string
  recommendedAction?: string
  caveats?: string[]
}

export interface ChimmyMessageMeta {
  confidencePct?: number
  providerStatus?: Record<string, string>
  recommendedTool?: string
  dataSources?: string[]
  quantData?: Record<string, unknown>
  trendData?: Record<string, unknown>
  responseStructure?: ChimmyResponseStructureMeta
  variant?: 'premium_gate' | 'error'
  ctaLabel?: string
  ctaHref?: string
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
  showListenFull?: boolean
  onListenFull?: () => void
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
    const href = match[2]
    const isInternal = href.startsWith("/") && !href.startsWith("//")
    nodes.push(
      <a
        key={`l-${match.index}`}
        href={href}
        className="underline text-cyan-300 hover:text-cyan-200"
        target={isInternal ? undefined : "_blank"}
        rel={isInternal ? undefined : "noopener noreferrer"}
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
  showListenFull,
  onListenFull,
  isListening,
}: ChimmyMessageBubbleProps) {
  const isUser = role === 'user'
  const responseStructure = !isUser ? meta?.responseStructure : undefined
  const hasResponseStructure = Boolean(responseStructure?.shortAnswer?.trim())
  const isLongResponse = !isUser && isLongChimmyResponse(content)
  const collapsedSummary = !isUser
    ? buildChimmyCollapsedSummary({
        content,
        responseStructure,
      })
    : ''
  const [showFullAnalysis, setShowFullAnalysis] = React.useState(false)
  const hasInlineLinks = /\[[^\]]+\]\(([^)]+)\)/.test(content)
  const shouldRenderRawContent =
    isLongResponse
      ? showFullAnalysis
      : !hasResponseStructure ||
        hasInlineLinks ||
        (content.trim().length > (responseStructure?.shortAnswer?.trim().length ?? 0) + 90)
  const confidenceDisplay = !isUser
    ? getConfidenceFromApiResponse({
        confidencePct: meta?.confidencePct,
        quantData: meta?.quantData as { confidencePct?: number } | undefined,
      })
    : null

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
        {hasResponseStructure && responseStructure && (
          <ChimmyResponseStructure
            quickAnswer={responseStructure.shortAnswer}
            whatDataSays={responseStructure.whatDataSays}
            whatItMeans={responseStructure.whatItMeans}
            actionPlan={responseStructure.recommendedAction}
            caveats={responseStructure.caveats}
            collapsible
            className="mb-2"
          />
        )}
        {!isUser && isLongResponse && !hasResponseStructure && collapsedSummary && !showFullAnalysis && (
          <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-relaxed text-white/90">
            {renderContentWithLinks(collapsedSummary)}
          </div>
        )}
        {shouldRenderRawContent && (
          <div className="text-sm leading-relaxed">{renderContentWithLinks(content)}</div>
        )}
        {!isUser && isLongResponse && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowFullAnalysis((current) => !current)}
              data-testid="chimmy-toggle-full-analysis-button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              {showFullAnalysis ? 'Hide full analysis' : 'Show full analysis'}
            </button>
          </div>
        )}
        {!isUser && meta?.ctaHref && meta?.ctaLabel && (
          <div className="mt-3">
            <a
              href={meta.ctaHref}
              data-testid="chimmy-upgrade-cta"
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/25"
            >
              {meta.ctaLabel}
            </a>
          </div>
        )}

        {!isUser && meta && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            {confidenceDisplay && shouldShowConfidence(confidenceDisplay) && (
              <span className="text-[10px] uppercase tracking-wider text-white/50">
                {getConfidenceDisplayText(confidenceDisplay)}
              </span>
            )}
            {meta.dataSources && meta.dataSources.length > 0 && (
              <span className="text-[10px] text-white/50">
                Sources: {meta.dataSources.slice(0, 2).join(', ')}
              </span>
            )}
          </div>
        )}
        {!isUser && <SuggestedActionRenderer content={content} />}

        {!isUser && showListen && onListen && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onListen}
              disabled={isListening}
              data-testid="chimmy-listen-response-button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50 min-h-[36px]"
              aria-label="Hear verdict summary"
            >
              {isListening ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Playing…
                </>
              ) : (
                <>Hear summary</>
              )}
            </button>
            {showListenFull && onListenFull && (
              <button
                type="button"
                onClick={onListenFull}
                disabled={isListening}
                data-testid="chimmy-listen-full-response-button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50 min-h-[36px]"
                aria-label="Hear full response"
              >
                Hear full response
              </button>
            )}
          </div>
        )}

        {!isUser && followUpChips && followUpChips.length > 0 && onFollowUpClick && (
          <div className="mt-3 flex flex-wrap gap-2">
            {followUpChips.slice(0, 3).map((chip) => (
              <button
                key={chip.prompt}
                type="button"
                onClick={() => onFollowUpClick(chip.prompt)}
                data-testid={`chimmy-follow-up-chip-${chip.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
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
