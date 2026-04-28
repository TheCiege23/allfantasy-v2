import { getTheAudioDbApiKeyOrFallback } from '@/lib/env/sports-media-keys';
import type { NextRequest } from 'next/server';

type AudioDbTrack = {
  idTrack?: string;
  strTrack?: string;
  strArtist?: string;
  strTrackThumb?: string;
  intDuration?: number;
};

type MappedTrack = {
  id: string;
  name: string;
  artist: string;
  image?: string;
  duration?: number;
  previewUrl?: string;
};

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 5000): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchPreviewUrl(artist: string, track: string): Promise<string | undefined> {
  // Prefer MP3 previews first (better codec support in Chromium-based runtimes).
  try {
    const deezerQueries = [
      `${artist} ${track}`,
      `artist:\"${artist}\" track:\"${track}\"`,
      artist,
    ];

    for (const q of deezerQueries) {
      const data = await fetchJsonWithTimeout<any>(
        `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1&output=json`,
        4000
      );
      if (!data) continue;
      const preview = data?.data?.[0]?.preview;
      if (typeof preview === 'string' && preview.length > 0) {
        return preview;
      }
    }
  } catch {
    // Fall back to iTunes lookup below.
  }

  try {
    const term = encodeURIComponent(`${artist} ${track}`);
    const data = await fetchJsonWithTimeout<any>(
      `https://itunes.apple.com/search?term=${term}&entity=song&limit=1`,
      4000
    );
    if (!data) return undefined;
    return data?.results?.[0]?.previewUrl;
  } catch {
    return undefined;
  }
}

async function mapTrackWithPreview(rawTrack: AudioDbTrack, fallbackArtist: string): Promise<MappedTrack> {
  const artist = rawTrack.strArtist || fallbackArtist || 'Unknown Artist';
  const name = rawTrack.strTrack || artist;

  return {
    id: rawTrack.idTrack || `${artist}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    artist,
    image: rawTrack.strTrackThumb || undefined,
    duration: rawTrack.intDuration || 180000,
    previewUrl: undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return new Response(JSON.stringify({ error: 'Request body is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let body: { artistId?: string; artistName?: string; trackName?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { artistId, artistName, trackName } = body;

    if (!artistId && !artistName) {
      return new Response(JSON.stringify({ error: 'Artist identifier is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = getTheAudioDbApiKeyOrFallback('2');
    const baseUrl = `https://www.theaudiodb.com/api/v1/json/${apiKey}`;

    const lookup = (artistName || artistId || '').toString().trim();
    let topTracksData: any = null;

    try {
      topTracksData = await fetchJsonWithTimeout<any>(
        `${baseUrl}/track-top10.php?s=${encodeURIComponent(lookup)}`,
        5000
      );
    } catch {
      // fall through to synthetic track below
    }

    const rawTracks: AudioDbTrack[] = Array.isArray(topTracksData?.track)
      ? topTracksData.track
      : [];

    const limitedTracks = rawTracks.slice(0, 20);

    const mappedTracks = await Promise.all(
      limitedTracks.map((rawTrack) => mapTrackWithPreview(rawTrack, lookup || 'Unknown Artist'))
    );

    const matchedTrack = trackName
      ? mappedTracks.find((track) => track.name.toLowerCase() === String(trackName).toLowerCase())
      : undefined;

    const fallbackTrack: MappedTrack = {
      id: Math.random().toString(),
      name: trackName || artistName || 'Unknown Track',
      artist: artistName || 'Unknown Artist',
      image: undefined,
      duration: 180000,
      previewUrl: artistName ? await fetchPreviewUrl(artistName, trackName || artistName) : undefined,
    };

    const primaryTrackBase = matchedTrack || mappedTracks[0] || fallbackTrack;
    const primaryPreviewUrl = await fetchPreviewUrl(
      primaryTrackBase.artist,
      primaryTrackBase.name
    );
    const primaryTrack: MappedTrack = {
      ...primaryTrackBase,
      previewUrl: primaryPreviewUrl || primaryTrackBase.previewUrl,
    };

    const tracksWithPlayableFirst =
      mappedTracks.length > 0
        ? mappedTracks.map((track) =>
            track.id === primaryTrack.id
              ? { ...track, previewUrl: primaryTrack.previewUrl }
              : track
          )
        : [{ ...fallbackTrack, previewUrl: primaryTrack.previewUrl || fallbackTrack.previewUrl }];

    return new Response(
      JSON.stringify({
        track: primaryTrack,
        tracks: tracksWithPlayableFirst,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching track info:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch track info',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
