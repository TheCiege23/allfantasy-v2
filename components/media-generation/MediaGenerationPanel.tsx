'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import type { MediaType } from '@/lib/media-generation/types'
import type { MediaGenerateResponse } from '@/lib/media-generation/types'
import MediaPreviewPlayer from './MediaPreviewPlayer'
import MediaActionBar from './MediaActionBar'
import PublishConfirmationModal from './PublishConfirmationModal'
import { toast } from 'sonner'

const MEDIA_ENDPOINTS: Record<MediaType, string> = {
  podcast: '/api/media/podcast',
  video: '/api/media/video',
  blog: '/api/media/blog',
  social: '/api/media/social',
}

export interface MediaGenerationPanelProps {
  type: MediaType
  /** Optional initial payload (sport, leagueName, etc.). */
  initialPayload?: Record<string, unknown>
  /** After publish (e.g. navigate). */
  onPublished?: () => void
  className?: string
}

/**
 * Full workflow: Generate → Preview → Approve → Publish.
 * Uses MediaPreviewPlayer, MediaActionBar, PublishConfirmationModal.
 */
export default function MediaGenerationPanel({
  type,
  initialPayload = {},
  onPublished,
  className = '',
}: MediaGenerationPanelProps) {
  const [result, setResult] = useState<MediaGenerateResponse | null>(null)
  const [generating, setGenerating] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)

  const generate = useCallback(
    async (isRetry = false) => {
      const setLoad = isRetry ? setRetryLoading : setGenerating
      setLoad(true)
      setResult(null)
      try {
        const res = await fetch(MEDIA_ENDPOINTS[type], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialPayload),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? 'Generation failed')
          setLoad(false)
          return
        }
        setResult(data)
        if (data.status === 'completed' || data.status === 'draft') {
          toast.success('Generated.')
        }
      } catch {
        toast.error('Request failed')
      } finally {
        setLoad(false)
      }
    },
    [type, initialPayload]
  )

  const handleRetry = useCallback(() => {
    generate(true)
  }, [generate])

  const handleDownload = useCallback(() => {
    const url = result?.playbackUrl ?? result?.previewUrl
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = result?.title ?? 'media'
      a.target = '_blank'
      a.rel = 'noopener'
      a.click()
    } else {
      toast.info('Download when playback is ready.')
    }
  }, [result])

  const handleShare = useCallback(() => {
    const shareUrl =
      type === 'video'
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/fantasy-media/${result?.id}`
        : type === 'podcast'
          ? `${typeof window !== 'undefined' ? window.location.origin : ''}/podcast/${result?.id}`
          : type === 'social'
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/social-clips/${result?.id}`
            : result?.articleSlug
              ? `${typeof window !== 'undefined' ? window.location.origin : ''}/blog/${result.articleSlug}`
              : ''
    if (shareUrl && typeof navigator !== 'undefined') {
      if (navigator.share) {
        navigator.share({ title: result?.title ?? 'Content', url: shareUrl }).catch(() => {
          navigator.clipboard?.writeText(shareUrl).then(() => toast.success('Link copied.'))
        })
      } else {
        navigator.clipboard?.writeText(shareUrl).then(() => toast.success('Link copied.'))
      }
    } else {
      toast.info('Share when content is ready.')
    }
  }, [type, result])

  const handlePublishClick = useCallback(() => {
    setPublishOpen(true)
  }, [])

  const handlePublishConfirm = useCallback(async () => {
    setPublishLoading(true)
    try {
      if (type === 'social' && result?.id) {
        const res = await fetch(`/api/social-clips/${result.id}/publish`, { method: 'POST' })
        if (res.ok) {
          toast.success('Published.')
          setPublishOpen(false)
          onPublished?.()
        } else {
          toast.error('Publish failed')
        }
      } else if (type === 'blog' && result?.id) {
        const res = await fetch(`/api/blog/${result.id}/publish`, { method: 'POST' })
        if (res.ok) {
          toast.success('Published.')
          setPublishOpen(false)
          onPublished?.()
        } else {
          toast.error('Publish failed')
        }
      } else {
        toast.info('Publish from the content page.')
        setPublishOpen(false)
      }
    } catch {
      toast.error('Publish failed')
    } finally {
      setPublishLoading(false)
    }
  }, [type, result?.id, onPublished])

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(result?.playbackUrl ?? result?.previewUrl ?? null)
  const [status, setStatus] = useState(result?.status ?? null)

  useEffect(() => {
    setPlaybackUrl(result?.playbackUrl ?? result?.previewUrl ?? null)
    setStatus(result?.status ?? null)
  }, [result])

  // Poll for video when status is generating (HeyGen)
  useEffect(() => {
    if (type !== 'video' || !result?.id || result.status !== 'generating') return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/fantasy-media/episodes/${result.id}/status`)
        const data = await res.json()
        if (data.status) setStatus(data.status)
        if (data.playbackUrl) setPlaybackUrl(data.playbackUrl)
      } catch {
        // ignore
      }
    }, 5000)
    return () => clearInterval(t)
  }, [type, result?.id, result?.status])

  const displayPlaybackUrl = playbackUrl ?? result?.playbackUrl ?? result?.previewUrl ?? null
  const displayStatus = status ?? result?.status ?? null

  return (
    <div className={`space-y-4 ${className}`}>
      {!result && !generating && (
        <button
          type="button"
          onClick={() => generate(false)}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
        >
          Generate {type}
        </button>
      )}

      {generating && (
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating…
        </div>
      )}

      {result && (
        <>
          <MediaPreviewPlayer
            type={type}
            playbackUrl={displayPlaybackUrl}
            title={result.title}
            copy={type === 'social' ? undefined : result.title}
            status={displayStatus ?? undefined}
          />
          <MediaActionBar
            onRetry={handleRetry}
            retryLoading={retryLoading}
            onDownload={type === 'video' || type === 'podcast' ? handleDownload : undefined}
            onShare={handleShare}
            onPublish={handlePublishClick}
          />
        </>
      )}

      <PublishConfirmationModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onConfirm={handlePublishConfirm}
        loading={publishLoading}
      />
    </div>
  )
}
