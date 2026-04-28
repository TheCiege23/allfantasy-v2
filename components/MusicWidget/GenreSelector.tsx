'use client';

import React from 'react';
import './MusicWidget.css';

interface GenreSelectorProps {
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
}

const MUSIC_GENRES = [
  'Pop',
  'Rock',
  'Hip Hop',
  'R&B',
  'Jazz',
  'Classical',
  'Electronic',
  'Country',
  'Latin',
  'Soul',
  'Blues',
  'Folk',
  'Metal',
  'Reggae',
  'Disco',
];

const GenreSelector: React.FC<GenreSelectorProps> = ({ selectedGenre, onGenreChange }) => {
  return (
    <div className="genre-selector">
      <label className="genre-label">Genre</label>
      <select
        value={selectedGenre}
        onChange={(e) => onGenreChange(e.target.value)}
        className="genre-select"
      >
        <option value="">All Genres</option>
        {MUSIC_GENRES.map((genre) => (
          <option key={genre} value={genre}>
            {genre}
          </option>
        ))}
      </select>
      {selectedGenre && <div className="genre-tag">{selectedGenre}</div>}
    </div>
  );
};

export default GenreSelector;
