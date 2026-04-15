declare namespace Spotify {
  interface Player {
    connect(): Promise<boolean>
    disconnect(): void
    togglePlay(): Promise<void>
    previousTrack(): Promise<void>
    nextTrack(): Promise<void>
    setVolume(volume: number): Promise<void>
    addListener(event: string, callback: (state: any) => void): void
    removeListener(event: string): void
  }

  interface PlaybackState {
    paused: boolean
    duration: number
    position: number
    track_window: {
      current_track: {
        name: string
        artists: Array<{ name: string }>
        album: { images: Array<{ url: string }> }
      }
    }
  }

  interface PlayerInit {
    name: string
    getOAuthToken: (cb: (token: string) => void) => void
    volume?: number
  }
}

interface Window {
  Spotify: {
    Player: new (options: Spotify.PlayerInit) => Spotify.Player
  }
  onSpotifyWebPlaybackSDKReady: () => void
}
