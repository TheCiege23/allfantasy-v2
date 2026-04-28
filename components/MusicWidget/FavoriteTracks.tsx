'use client';

import React from 'react';
import { Play, Heart, X } from 'lucide-react';
import './MusicWidget.css';

interface Track {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  image?: string;
  addedAt?: string;
}

interface FavoriteTracksProps {
  favorites: Track[];
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
}

const FavoriteTracks: React.FC<FavoriteTracksProps> = ({
  favorites,
  onPlayTrack,
  onToggleFavorite,
}) => {
  if (favorites.length === 0) {
    return (
      <div className="favorite-tracks">
        <div className="empty-state">
          <Heart size={32} />
          <p>No favorites yet</p>
          <small>Add tracks to your favorites to see them here</small>
        </div>
      </div>
    );
  }

  return (
    <div className="favorite-tracks">
      <div className="favorites-list">
        {favorites.map((track) => (
          <div key={track.id} className="favorite-card">
            {track.image && <img src={track.image} alt={track.name} className="favorite-image" />}
            <div className="favorite-info">
              <div className="favorite-name">{track.name}</div>
              <div className="favorite-artist">{track.artist}</div>
              {track.addedAt && <div className="favorite-date">Saved {track.addedAt}</div>}
            </div>
            <button
              onClick={() => onPlayTrack(track)}
              className="play-button"
              title="Play"
            >
              <Play size={14} fill="currentColor" />
            </button>
            <button
              onClick={() => onToggleFavorite(track)}
              className="remove-button"
              title="Remove from favorites"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoriteTracks;
