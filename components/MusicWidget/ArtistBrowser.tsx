'use client';

import React, { useState } from 'react';
import { Search, Play, Heart } from 'lucide-react';
import './MusicWidget.css';

interface Artist {
  id: string;
  name: string;
  image?: string;
  genre?: string;
}

interface ArtistBrowserProps {
  artists: Artist[];
  onPlayTrack: (artist: Artist, track?: any) => void;
  onToggleFavorite: (track: any) => void;
  isFavorited: (trackId: string) => boolean;
  onSearchArtists?: (query: string) => void;
}

const ArtistBrowser: React.FC<ArtistBrowserProps> = ({
  artists,
  onPlayTrack,
  onToggleFavorite,
  isFavorited,
  onSearchArtists,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (!onSearchArtists) return;

    const timer = window.setTimeout(() => {
      onSearchArtists(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery, onSearchArtists]);

  const filteredArtists = artists.filter((artist) =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="artist-browser">
      <div className="search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search artists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredArtists.length > 0 ? (
        <div className="artists-list">
          {filteredArtists.map((artist) => (
            <div key={artist.id} className="artist-card">
              {artist.image && <img src={artist.image} alt={artist.name} className="artist-image" />}
              <div className="artist-info">
                <div className="artist-name">{artist.name}</div>
                {artist.genre && <div className="artist-genre">{artist.genre}</div>}
              </div>
              <button
                onClick={() => onPlayTrack(artist)}
                className="play-button"
                title="Play"
              >
                <Play size={14} fill="currentColor" />
              </button>
              <button
                onClick={() => onToggleFavorite(artist)}
                className={`favorite-button ${isFavorited(artist.id) ? 'active' : ''}`}
                title="Add to favorites"
              >
                <Heart size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No artists found</p>
          <small>Search for an artist or select a genre</small>
        </div>
      )}
    </div>
  );
};

export default ArtistBrowser;
