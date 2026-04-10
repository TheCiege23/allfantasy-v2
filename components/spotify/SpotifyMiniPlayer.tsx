'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

/**
 * Spotify Mini Player Widget
 *
 * Embeddable music player powered by Spotify Web Playback SDK.
 * Can be placed in: draft room sidebar, league chat, main dashboard.
 *
 * Requirements:
 * - User must connect Spotify via OAuth (/api/auth/spotify)
 * - Spotify Premium required for playback
 * - Token auto-refreshes via /api/spotify/token
 */

type Track = {
  name: string
  artist: string
  albumArt: string | null
  durationMs: number
  positionMs: number
  uri: string
}

type PlayerState = 'disconnected' | 'connecting' | 'ready' | 'playing' | 'paused' | 'error'

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume: number
      }) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

type SpotifyPlayer = {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, cb: (data: unknown) => void) => void
  removeListener: (event: string) => void
  getCurrentState: () => Promise<SpotifyPlaybackState | null>
  togglePlay: () => Promise<void>
  previousTrack: () => Promise<void>
  nextTrack: () => Promise<void>
  setVolume: (vol: number) => Promise<void>
}

type SpotifyPlaybackState = {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: {
      name: string
      artists: Array<{ name: string }>
      album: { images: Array<{ url: string }> }
      uri: string
    }
  }
}

export function SpotifyMiniPlayer({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const [state, setState] = useState<PlayerState>('disconnected')
  const [track, setTrack] = useState<Track | null>(null)
  const [volume, setVolume] = useState(0.5)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [isPremium, setIsPremium] = useState(true)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const playerRef = useRef<SpotifyPlayer | null>(null)
  const tokenRef = useRef<string | null>(null)

  // Check Spotify connection status
  useEffect(() => {
    fetch('/api/spotify/token', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { connected?: boolean; isPremium?: boolean; displayName?: string; token?: string; error?: string }) => {
        setConnected(d.connected ?? false)
        setIsPremium(d.isPremium ?? false)
        setDisplayName(d.displayName ?? null)
        if (d.token) tokenRef.current = d.token
      })
      .catch(() => setConnected(false))
  }, [])

  // Load Spotify SDK
  const initPlayer = useCallback(() => {
    if (!tokenRef.current || playerRef.current) return

    setState('connecting')

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true

    window.onSpotifyWebPlaybackSDKReady = () => {
      if (!window.Spotify) return

      const player = new window.Spotify.Player({
        name: 'AllFantasy.AI',
        getOAuthToken: (cb) => {
          // Refresh token if needed
          fetch('/api/spotify/token', { credentials: 'include' })
            .then((r) => r.json())
            .then((d: { token?: string }) => {
              if (d.token) {
                tokenRef.current = d.token
                cb(d.token)
              }
            })
            .catch(() => {
              if (tokenRef.current) cb(tokenRef.current)
            })
        },
        volume: volume,
      })

      player.addListener('ready', (data: unknown) => {
        const d = data as { device_id: string }
        console.log('[spotify] Player ready, device:', d.device_id)
        setState('ready')
      })

      player.addListener('not_ready', () => {
        setState('disconnected')
      })

      player.addListener('player_state_changed', (data: unknown) => {
        if (!data) return
        const s = data as SpotifyPlaybackState
        const t = s.track_window.current_track
        setTrack({
          name: t.name,
          artist: t.artists.map((a) => a.name).join(', '),
          albumArt: t.album.images[0]?.url ?? null,
          durationMs: s.duration,
          positionMs: s.position,
          uri: t.uri,
        })
        setState(s.paused ? 'paused' : 'playing')
      })

      player.addListener('initialization_error', (data: unknown) => {
        const d = data as { message: string }
        setError(d.message)
        setState('error')
      })

      player.addListener('authentication_error', () => {
        setError('Spotify authentication failed. Try reconnecting.')
        setState('error')
      })

      player.addListener('account_error', () => {
        setError('Spotify Premium is required for playback.')
        setIsPremium(false)
        setState('error')
      })

      player.connect()
      playerRef.current = player
    }

    document.body.appendChild(script)

    return () => {
      playerRef.current?.disconnect()
      playerRef.current = null
    }
  }, [volume])

  // Not connected — show connect button
  if (connected === false) {
    return (
      <div className={clsx('rounded-xl border border-white/10 bg-white/[0.02] p-3', className)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🎵</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white/70">Spotify</p>
            <p className="text-[10px] text-white/40">Listen to music while you play</p>
          </div>
          <a
            href="/api/auth/spotify"
            className="shrink-0 rounded-lg bg-[#1DB954]/20 px-3 py-1.5 text-[11px] font-semibold text-[#1DB954] transition hover:bg-[#1DB954]/30"
          >
            Connect
          </a>
        </div>
      </div>
    )
  }

  // Loading
  if (connected === null) return null

  // Not premium
  if (!isPremium) {
    return (
      <div className={clsx('rounded-xl border border-white/10 bg-white/[0.02] p-3', className)}>
        <p className="text-[11px] text-amber-300">Spotify Premium required for playback.</p>
        <p className="text-[10px] text-white/40">Connected as {displayName}</p>
      </div>
    )
  }

  // Connected but player not initialized
  if (state === 'disconnected' && connected) {
    return (
      <div className={clsx('rounded-xl border border-white/10 bg-white/[0.02] p-3', className)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🎵</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white/70">{displayName ?? 'Spotify'}</p>
            <p className="text-[10px] text-white/40">Ready to play</p>
          </div>
          <button
            type="button"
            onClick={initPlayer}
            className="shrink-0 rounded-lg bg-[#1DB954]/20 px-3 py-1.5 text-[11px] font-semibold text-[#1DB954] transition hover:bg-[#1DB954]/30"
          >
            Start Player
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className={clsx('rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3', className)}>
        <p className="text-[11px] text-red-400">{error ?? 'Spotify error'}</p>
      </div>
    )
  }

  // Connecting
  if (state === 'connecting') {
    return (
      <div className={clsx('rounded-xl border border-white/10 bg-white/[0.02] p-3', className)}>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#1DB954] border-t-transparent" />
          <p className="text-[11px] text-white/50">Connecting to Spotify...</p>
        </div>
      </div>
    )
  }

  // Active player
  return (
    <div className={clsx('rounded-xl border border-white/10 bg-white/[0.02]', compact ? 'p-2' : 'p-3', className)}>
      <div className="flex items-center gap-3">
        {/* Album art */}
        {track?.albumArt && !compact && (
          <img
            src={track.albumArt}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg"
          />
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-[12px] font-semibold text-white">
            {track?.name ?? 'No track playing'}
          </p>
          <p className="truncate text-[10px] text-white/40">
            {track?.artist ?? 'Open Spotify and play something'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => playerRef.current?.previousTrack()}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white/80"
            aria-label="Previous"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => playerRef.current?.togglePlay()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30"
            aria-label={state === 'playing' ? 'Pause' : 'Play'}
          >
            {state === 'playing' ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => playerRef.current?.nextTrack()}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white/80"
            aria-label="Next"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* Volume (non-compact only) */}
      {!compact && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-white/30">🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              setVolume(v)
              playerRef.current?.setVolume(v)
            }}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#1DB954]"
          />
        </div>
      )}
    </div>
  )
}
