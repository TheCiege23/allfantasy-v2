'use client';

import React from 'react';
import { Play, Plus, Trash2, X } from 'lucide-react';
import './MusicWidget.css';

interface Track {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  image?: string;
  duration?: number;
  previewUrl?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

interface PlaylistsPanelProps {
  playlists: Playlist[];
  currentTrack: Track | null;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, track: Track) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onPlayTrack: (track: Track) => void;
  onExportPlaylists: () => void;
  onImportPlaylists: (playlists: Playlist[]) => void;
}

const PlaylistsPanel: React.FC<PlaylistsPanelProps> = ({
  playlists,
  currentTrack,
  onCreatePlaylist,
  onDeletePlaylist,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onPlayTrack,
  onExportPlaylists,
  onImportPlaylists,
}) => {
  const [playlistName, setPlaylistName] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleCreate = () => {
    const normalized = playlistName.trim();
    if (!normalized) return;
    onCreatePlaylist(normalized);
    setPlaylistName('');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : parsed?.playlists;
      if (Array.isArray(rows)) {
        onImportPlaylists(rows as Playlist[]);
      }
    } catch {
      // ignore invalid import files
    }

    event.target.value = '';
  };

  return (
    <div className="playlists-panel">
      <div className="playlist-create-row">
        <input
          type="text"
          value={playlistName}
          onChange={(event) => setPlaylistName(event.target.value)}
          placeholder="Create playlist (e.g. Gym, Chill, Focus)"
          className="search-input"
        />
        <button type="button" className="play-button" onClick={handleCreate} title="Create playlist">
          <Plus size={14} />
        </button>
      </div>

      <div className="playlist-io-row">
        <button type="button" className="control-button" onClick={onExportPlaylists}>
          Export
        </button>
        <button
          type="button"
          className="control-button"
          onClick={() => fileInputRef.current?.click()}
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>

      {playlists.length === 0 ? (
        <div className="empty-state">
          <p>No playlists yet</p>
          <small>Create one and start building your mini Spotify</small>
        </div>
      ) : (
        <div className="favorites-list">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="playlist-card">
              <div className="playlist-header-row">
                <div className="favorite-info">
                  <div className="favorite-name">{playlist.name}</div>
                  <div className="favorite-artist">{playlist.tracks.length} track(s)</div>
                </div>

                <div className="playlist-actions">
                  {currentTrack && (
                    <button
                      type="button"
                      className="play-button"
                      title="Add current track"
                      onClick={() => onAddTrackToPlaylist(playlist.id, currentTrack)}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="remove-button"
                    title="Delete playlist"
                    onClick={() => onDeletePlaylist(playlist.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {playlist.tracks.length > 0 && (
                <div className="playlist-tracks">
                  {playlist.tracks.map((track) => (
                    <div key={`${playlist.id}-${track.id}`} className="playlist-track-item">
                      <div className="favorite-info">
                        <div className="favorite-name">{track.name}</div>
                        <div className="favorite-artist">{track.artist}</div>
                      </div>
                      <button
                        type="button"
                        className="play-button"
                        title="Play track"
                        onClick={() => onPlayTrack(track)}
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <button
                        type="button"
                        className="remove-button"
                        title="Remove track"
                        onClick={() => onRemoveTrackFromPlaylist(playlist.id, track.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistsPanel;
