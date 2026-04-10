'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { toast } from 'sonner'

const MAX_DURATION_MS = 2 * 60 * 1000 // 2 minutes
const WARN_MS = 1 * 60 * 1000 + 45 * 1000 // warn at 1:45
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

type VideoRecorderProps = {
  leagueId: string
  onComplete: (payload: { url: string; duration: number; mimeType: string; name: string; thumbnailUrl?: string }) => void
  onCancel: () => void
}

/**
 * In-browser video recorder for chat.
 * Records up to 2 minutes of video from the user's camera.
 * Uploads to Vercel Blob via /api/chat/upload.
 */
export function VideoRecorder({ leagueId, onComplete, onCancel }: VideoRecorderProps) {
  const [state, setState] = useState<'requesting' | 'ready' | 'recording' | 'uploading' | 'error'>('requesting')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const cancelledRef = useRef(false)
  const warnedRef = useRef(false)

  const stopStreams = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Request camera access on mount
  useEffect(() => {
    cancelledRef.current = false
    let cancelled = false

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        })
        if (cancelled || cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.muted = true
          void videoRef.current.play()
        }
        setState('ready')
      } catch (e) {
        if (!cancelled) {
          setError('Camera access denied. Please allow camera and microphone access.')
          setState('error')
        }
      }
    }

    void initCamera()

    return () => {
      cancelled = true
      cancelledRef.current = true
      stopStreams()
    }
  }, [stopStreams])

  function startRecording() {
    if (!streamRef.current) return

    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4'

    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    mediaRecorderRef.current = recorder
    warnedRef.current = false

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      if (cancelledRef.current) return
      void handleUpload()
    }

    recorder.start(1000) // collect data every second
    startRef.current = Date.now()
    setState('recording')

    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startRef.current
      setSeconds(Math.floor(elapsed / 1000))

      if (!warnedRef.current && elapsed >= WARN_MS) {
        warnedRef.current = true
        toast.info('15 seconds remaining')
      }

      if (elapsed >= MAX_DURATION_MS) {
        stopRecording()
      }
    }, 500)
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    stopStreams()
  }

  function handleCancel() {
    cancelledRef.current = true
    stopRecording()
    stopStreams()
    onCancel()
  }

  async function handleUpload() {
    if (chunksRef.current.length === 0) {
      setError('No video data recorded')
      setState('error')
      return
    }

    setState('uploading')
    const mimeType = mediaRecorderRef.current?.mimeType ?? 'video/webm'
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
    const blob = new Blob(chunksRef.current, { type: mimeType })
    const duration = Math.floor((Date.now() - startRef.current) / 1000)

    if (blob.size > MAX_FILE_SIZE) {
      setError('Video too large (max 100MB). Try a shorter recording.')
      setState('error')
      return
    }

    const formData = new FormData()
    formData.append('file', blob, `video-${Date.now()}.${ext}`)
    formData.append('type', 'video')
    formData.append('leagueId', leagueId)

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        setError((err as { error?: string }).error ?? 'Upload failed')
        setState('error')
        return
      }

      const data = (await res.json()) as { url: string }
      onComplete({
        url: data.url,
        duration,
        mimeType,
        name: `video-${Date.now()}.${ext}`,
      })
    } catch {
      setError('Upload failed. Please try again.')
      setState('error')
    }
  }

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`
  const remaining = Math.max(0, 120 - seconds)
  const isNearLimit = remaining <= 15

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      {/* Video preview */}
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="h-48 w-full object-cover"
          playsInline
          muted
        />

        {/* Recording indicator */}
        {state === 'recording' && (
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className={clsx(
              'rounded bg-black/60 px-2 py-0.5 text-[12px] font-mono font-bold',
              isNearLimit ? 'text-red-300' : 'text-white',
            )}>
              {timeStr} / 2:00
            </span>
          </div>
        )}

        {/* Status overlays */}
        {state === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-[13px] text-white/60">Requesting camera access...</p>
          </div>
        )}
        {state === 'uploading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="mt-2 text-[13px] text-white/60">Uploading video...</p>
          </div>
        )}
        {state === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/50 transition hover:bg-white/[0.04]"
        >
          Cancel
        </button>

        <div className="flex gap-2">
          {state === 'ready' && (
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-4 py-1.5 text-[12px] font-semibold text-red-200 transition hover:bg-red-500/30"
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Record
            </button>
          )}
          {state === 'recording' && (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/20"
            >
              ⏹ Stop & Send
            </button>
          )}
        </div>
      </div>

      <p className="mt-1 text-center text-[10px] text-white/30">
        Max 2 minutes · {state === 'recording' ? `${remaining}s remaining` : 'Video + audio'}
      </p>
    </div>
  )
}

/**
 * Video upload button — opens file picker for pre-recorded videos.
 * Enforces 2-minute / 100MB limit.
 */
export function VideoUploadButton({
  leagueId,
  onComplete,
}: {
  leagueId: string
  onComplete: (payload: { url: string; duration: number; mimeType: string; name: string }) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    if (!validTypes.includes(file.type)) {
      toast.error('Please select an MP4, WebM, or MOV video')
      return
    }

    // Validate size (100MB)
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Video too large (max 100MB)')
      return
    }

    // Validate duration (2 minutes)
    const duration = await getVideoDuration(file)
    if (duration > 120) {
      toast.error('Video must be 2 minutes or less')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'video')
    formData.append('leagueId', leagueId)

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        toast.error((err as { error?: string }).error ?? 'Upload failed')
        return
      }

      const data = (await res.json()) as { url: string }
      onComplete({
        url: data.url,
        duration: Math.round(duration),
        mimeType: file.type,
        name: file.name,
      })
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/50 transition hover:bg-white/[0.06] disabled:opacity-40"
        title="Upload video (max 2 min)"
      >
        {uploading ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
        ) : (
          '🎬'
        )}
      </button>
    </>
  )
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => resolve(0)
    video.src = URL.createObjectURL(file)
  })
}
