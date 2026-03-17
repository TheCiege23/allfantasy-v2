/**
 * PROMPT 128 — AI Media Generation System. Unified response shape for /api/media/*.
 * Providers: HeyGen (video/podcast), Grok (social), OpenAI (blog).
 */

export type MediaType = 'podcast' | 'video' | 'blog' | 'social'

export interface MediaGenerateResponse {
  id: string
  type: MediaType
  status: 'generating' | 'completed' | 'failed' | 'draft'
  title?: string
  /** Preview or playback URL (video/audio). */
  previewUrl?: string | null
  /** Same as previewUrl for video/audio. */
  playbackUrl?: string | null
  /** For blog: article slug or URL path. */
  articleSlug?: string | null
  /** Provider job id (e.g. HeyGen video_id). */
  providerJobId?: string | null
  createdAt?: string
  error?: string | null
}
