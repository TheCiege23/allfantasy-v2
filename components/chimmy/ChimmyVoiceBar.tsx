'use client'

import React from 'react'
import { Volume2, VolumeX, Square, Loader2 } from 'lucide-react'

export interface ChimmyVoiceBarProps {
  /** Voice replies enabled (toggle in shell) */
  voiceEnabled: boolean
  onVoiceToggle: () => void
  /** TTS is currently playing */
  isPlaying: boolean
  onStop?: () => void
  /** Future: TTS request in flight */
  ttsLoading?: boolean
  /** When true, disable listen (e.g. no speechSynthesis) */
  ttsUnavailable?: boolean
  /** Container for transcript sync / highlight (future) */
  transcriptRef?: React.RefObject<HTMLDivElement>
  className?: string
}

/**
 * Voice-ready UI: listen toggle, play/pause (stop), loading, disabled when TTS unavailable.
 * transcriptRef: attach to the message container for future word-level sync.
 */
export default function ChimmyVoiceBar({
  voiceEnabled,
  onVoiceToggle,
  isPlaying,
  onStop,
  ttsLoading = false,
  ttsUnavailable = false,
  transcriptRef,
  className = '',
}: ChimmyVoiceBarProps) {
  const canListen = typeof window !== 'undefined' && 'speechSynthesis' in window && !ttsUnavailable

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onVoiceToggle}
        disabled={ttsUnavailable}
        className="rounded-lg border border-white/20 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
        title={ttsUnavailable ? 'Voice unavailable' : voiceEnabled ? 'Voice on' : 'Voice off'}
        aria-label={ttsUnavailable ? 'Voice unavailable' : voiceEnabled ? 'Turn voice off' : 'Turn voice on'}
      >
        {voiceEnabled ? (
          <Volume2 className="h-5 w-5 text-cyan-400/90" />
        ) : (
          <VolumeX className="h-5 w-5 text-white/40" />
        )}
      </button>

      {isPlaying && onStop && (
        <button
          type="button"
          onClick={onStop}
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 flex items-center gap-1.5 min-h-[44px]"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      )}

      {ttsLoading && (
        <span className="flex items-center gap-1.5 text-xs text-white/50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparing audio…
        </span>
      )}

      {ttsUnavailable && (
        <span className="text-[10px] text-white/40">Voice unavailable</span>
      )}

      {transcriptRef && <div ref={transcriptRef} className="sr-only" aria-hidden />}
    </div>
  )
}
