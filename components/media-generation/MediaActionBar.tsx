'use client'

import React from 'react'
import { RefreshCw, Download, Share2, Send } from 'lucide-react'

export interface MediaActionBarProps {
  /** Retry generation (same type). */
  onRetry?: () => void
  retryLoading?: boolean
  /** Download asset (e.g. video/audio URL or blob). */
  onDownload?: () => void
  downloadLabel?: string
  /** Share (copy link or native share). */
  onShare?: () => void
  shareLabel?: string
  /** Publish (opens or triggers publish confirmation). */
  onPublish?: () => void
  publishLabel?: string
  className?: string
}

/**
 * Mandatory UI: Retry generation, Download/share buttons.
 * Wire all handlers; no dead buttons.
 */
export default function MediaActionBar({
  onRetry,
  retryLoading = false,
  onDownload,
  downloadLabel = 'Download',
  onShare,
  shareLabel = 'Share',
  onPublish,
  publishLabel = 'Publish',
  className = '',
}: MediaActionBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retryLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${retryLoading ? 'animate-spin' : ''}`} />
          Retry
        </button>
      )}
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          <Download className="h-4 w-4" />
          {downloadLabel}
        </button>
      )}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          <Share2 className="h-4 w-4" />
          {shareLabel}
        </button>
      )}
      {onPublish && (
        <button
          type="button"
          onClick={onPublish}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20"
        >
          <Send className="h-4 w-4" />
          {publishLabel}
        </button>
      )}
    </div>
  )
}
