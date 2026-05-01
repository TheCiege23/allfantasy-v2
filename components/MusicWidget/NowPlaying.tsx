'use client';

import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import './MusicWidget.css';

interface Track {
  id: string;
  name: string;
  artist: string;
  image?: string;
  duration?: number;
  spotifyUrl?: string;
  previewUrl?: string;
}

interface NowPlayingProps {
  currentTrack: Track | null;
  availableTracks: Track[];
  onSelectTrack: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  isFavorited: (trackId: string) => boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  autoPlayQueue: boolean;
  onToggleAutoPlayQueue: () => void;
}

const NowPlaying: React.FC<NowPlayingProps> = ({
  currentTrack,
  availableTracks,
  onSelectTrack,
  onToggleFavorite,
  isFavorited,
  volume,
  onVolumeChange,
  autoPlayQueue,
  onToggleAutoPlayQueue,
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const availableTracksRef = React.useRef(availableTracks);
  const currentTrackRef = React.useRef(currentTrack);
  const onSelectTrackRef = React.useRef(onSelectTrack);
  const autoPlayQueueRef = React.useRef(autoPlayQueue);

  React.useEffect(() => {
    availableTracksRef.current = availableTracks;
  }, [availableTracks]);

  React.useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  React.useEffect(() => {
    onSelectTrackRef.current = onSelectTrack;
  }, [onSelectTrack]);

  React.useEffect(() => {
    autoPlayQueueRef.current = autoPlayQueue;
  }, [autoPlayQueue]);

  React.useEffect(() => {
    if (!currentTrack?.previewUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setDuration(currentTrack?.duration || 0);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(currentTrack.previewUrl);
    audio.volume = volume / 100;
    audioRef.current = audio;

    const handleLoaded = () => {
      setDuration((audio.duration || 0) * 1000);
    };

    const handleTimeUpdate = () => {
      const nextDuration = (audio.duration || 0) * 1000;
      const nextCurrent = audio.currentTime * 1000;
      setCurrentTime(nextCurrent);
      if (nextDuration > 0) {
        setProgress((nextCurrent / nextDuration) * 100);
      }
    };

    const handleEnded = () => {
      const current = currentTrackRef.current;
      const tracks = availableTracksRef.current;
      if (autoPlayQueueRef.current && current) {
        const currentIndex = tracks.findIndex((track) => track.id === current.id);
        const nextTrack = currentIndex >= 0 ? tracks[currentIndex + 1] : undefined;
        if (nextTrack) {
          onSelectTrackRef.current(nextTrack);
          return;
        }
      }

      setIsPlaying(false);
      setProgress(100);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack?.id, currentTrack?.previewUrl]);

  React.useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
  }, [volume]);

  const togglePlayPause = React.useCallback(() => {
    if (!audioRef.current) {
      setIsPlaying(false);
      return;
    }

    if (audioRef.current.paused) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
      return;
    }

    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const onProgressChange = React.useCallback((value: number) => {
    setProgress(value);

    if (!audioRef.current || !duration) return;

    const seekMs = (value / 100) * duration;
    audioRef.current.currentTime = seekMs / 1000;
    setCurrentTime(seekMs);
  }, [duration]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor((milliseconds || 0) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <div className="now-playing">
        <div className="empty-state">
          <p>No track playing</p>
          <small>Select an artist or track to begin</small>
        </div>
      </div>
    );
  }

  const displayDuration = duration || currentTrack.duration || 0;

  return (
    <div className="now-playing">
      {currentTrack.image && (
        <img src={currentTrack.image} alt={currentTrack.name} className="track-image" />
      )}

      <div className="track-info">
        <h4 className="track-name">{currentTrack.name}</h4>
        <p className="track-artist">{currentTrack.artist}</p>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => onProgressChange(Number(e.target.value))}
          className="progress-slider"
        />
        <div className="progress-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="playback-controls">
        <button
          onClick={togglePlayPause}
          className="control-button play-pause"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>

        {currentTrack.spotifyUrl && (
          <a
            href={currentTrack.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="control-button spotify-link"
            title="Open in Spotify"
          >
            Open in Spotify
          </a>
        )}

        <button
          onClick={() => onToggleFavorite(currentTrack)}
          className={`control-button favorite ${isFavorited(currentTrack.id) ? 'active' : ''}`}
          title="Add to favorites"
        >
          <Heart size={20} />
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleAutoPlayQueue}
        className={`queue-toggle ${autoPlayQueue ? 'active' : ''}`}
      >
        Queue Autoplay: {autoPlayQueue ? 'On' : 'Off'}
      </button>

      {!currentTrack.previewUrl && (
        <div className="empty-state" style={{ padding: '10px 0 0' }}>
          <small>No preview stream available for this track yet</small>
        </div>
      )}

      {availableTracks.length > 0 && (
        <div className="available-tracks">
          <div className="available-tracks-title">Available by {currentTrack.artist}</div>
          <div className="available-tracks-list">
            {availableTracks.map((track) => (
              <button
                key={track.id}
                type="button"
                className={`available-track-item ${track.id === currentTrack.id ? 'active' : ''}`}
                onClick={() => onSelectTrack(track)}
              >
                <span>{track.name}</span>
                <small>{track.previewUrl ? 'preview' : 'metadata only'}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NowPlaying;
