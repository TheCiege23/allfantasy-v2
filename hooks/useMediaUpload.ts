"use client"

import { useCallback, useState } from "react"

export type MediaType = "gif" | "image" | "video" | "meme"

/**
 * Placeholder media upload hook. Replace with real storage (S3, etc.) and
 * /api/shared/chat/threads/[threadId]/media or similar.
 */
export function useMediaUpload(_threadId?: string) {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (type: MediaType, _file?: File | null, _url?: string): Promise<string | null> => {
      setError(null)
      setProgress(10)
      await new Promise((r) => setTimeout(r, 300))
      setProgress(50)
      await new Promise((r) => setTimeout(r, 200))
      setProgress(100)
      setProgress(0)
      // Placeholder: return a stub URL for UI demo. Real impl would upload and return CDN URL.
      return `https://placeholders.allfantasy.ai/${type}/${Date.now()}`
    },
    []
  )

  const uploadGif = useCallback(
    (url?: string) => upload("gif", null, url),
    [upload]
  )
  const uploadImage = useCallback(
    (file?: File | null) => upload("image", file),
    [upload]
  )
  const uploadVideo = useCallback(
    (file?: File | null) => upload("video", file),
    [upload]
  )
  const uploadMeme = useCallback(
    (file?: File | null) => upload("meme", file),
    [upload]
  )

  return {
    uploadGif,
    uploadImage,
    uploadVideo,
    uploadMeme,
    progress,
    error,
    setError,
  }
}
