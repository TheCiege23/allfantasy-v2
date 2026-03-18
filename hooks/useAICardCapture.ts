'use client'

import { useCallback, useRef } from 'react'
import html2canvas from 'html2canvas'
import { AI_INSIGHT_CARD_ID } from '@/components/ai-insight-cards/AICardRenderer'

export interface UseAICardCaptureOptions {
  /** Element id to capture (default: AI_INSIGHT_CARD_ID) */
  captureId?: string
  /** Scale for higher-res image (default: 2) */
  scale?: number
}

export interface UseAICardCaptureReturn {
  /** Ref to attach to a wrapper that contains the card (optional; or use captureId) */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Capture the card to PNG data URL */
  captureToDataUrl: () => Promise<string | null>
  /** Capture and trigger browser download */
  captureAndDownload: (filename?: string) => Promise<void>
  /** Capture and return blob for upload */
  captureToBlob: () => Promise<Blob | null>
}

export function useAICardCapture(
  options: UseAICardCaptureOptions = {}
): UseAICardCaptureReturn {
  const { captureId = AI_INSIGHT_CARD_ID, scale = 2 } = options
  const containerRef = useRef<HTMLDivElement | null>(null)

  const captureToDataUrl = useCallback(async (): Promise<string | null> => {
    const el = captureId ? document.getElementById(captureId) : containerRef.current
    if (!el) return null
    try {
      const canvas = await html2canvas(el, {
        scale,
        backgroundColor: '#0f172a',
        useCORS: true,
        logging: false,
      })
      return canvas.toDataURL('image/png')
    } catch {
      return null
    }
  }, [captureId, scale])

  const captureAndDownload = useCallback(
    async (filename = 'allfantasy-ai-card.png') => {
      const dataUrl = await captureToDataUrl()
      if (!dataUrl) return
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = filename
      a.click()
    },
    [captureToDataUrl]
  )

  const captureToBlob = useCallback(async (): Promise<Blob | null> => {
    const dataUrl = await captureToDataUrl()
    if (!dataUrl) return null
    const res = await fetch(dataUrl)
    return res.blob()
  }, [captureToDataUrl])

  return {
    containerRef,
    captureToDataUrl,
    captureAndDownload,
    captureToBlob,
  }
}
