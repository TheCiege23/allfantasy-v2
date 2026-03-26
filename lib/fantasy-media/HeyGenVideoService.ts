/**
 * HeyGen video generation — server-side only (Prompt 115).
 * Uses HEYGEN_API_KEY from env; never exposed to frontend.
 */

import { buildHeyGenPayload } from './HeyGenPayloadBuilder';
import { buildHeyGenPayloadMetadata } from './HeyGenPayloadBuilder';
import type { HeyGenPayloadInput } from './types';
import type { HeyGenPayloadMetadata } from './types';

const HEYGEN_BASE = 'https://api.heygen.com';
const STATUS_POLL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120;

export interface HeyGenCreateResult {
  videoId: string;
  status: string;
  payloadMetadata: HeyGenPayloadMetadata;
}

export interface HeyGenStatusResult {
  videoId: string;
  status: 'waiting' | 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl: string | null;
  thumbnailUrl: string | null;
  error: { code?: number; message?: string; detail?: string } | null;
  duration?: number;
}

function getApiKey(): string | null {
  const key = process.env.HEYGEN_API_KEY ?? process.env.HEYGEN_API_KEY_SECRET;
  return key?.trim() || null;
}

export async function createHeyGenVideo(input: HeyGenPayloadInput): Promise<HeyGenCreateResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[HeyGen] No HEYGEN_API_KEY configured');
    return null;
  }
  if (!input.script || !input.script.trim()) {
    console.error('[HeyGen] Missing script content');
    return null;
  }
  if (!input.title || !input.title.trim()) {
    console.error('[HeyGen] Missing video title');
    return null;
  }

  const payload = buildHeyGenPayload(input);
  const payloadMetadata = buildHeyGenPayloadMetadata(input);

  const res = await fetch(`${HEYGEN_BASE}/v2/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[HeyGen] create failed', {
      status: res.status,
      details: text?.slice(0, 300),
    });
    return null;
  }

  const data = (await res.json()) as { video_id?: string; status?: string };
  const videoId = data.video_id;
  const status = data.status ?? 'waiting';
  if (!videoId) {
    console.error('[HeyGen] No video_id in response');
    return null;
  }
  return { videoId, status, payloadMetadata };
}

export async function getHeyGenVideoStatus(videoId: string): Promise<HeyGenStatusResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const res = await fetch(
    `${HEYGEN_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
    {
      headers: { 'x-api-key': apiKey },
    }
  );

  if (!res.ok) return null;

  const json = (await res.json()) as {
    code?: number;
    data?: {
      id?: string;
      status?: string;
      video_url?: string | null;
      thumbnail_url?: string | null;
      error?: { code?: number; message?: string; detail?: string };
      duration?: number;
    };
  };

  const d = json?.data;
  if (!d) return null;

  return {
    videoId: d.id ?? videoId,
    status: (d.status as HeyGenStatusResult['status']) ?? 'pending',
    videoUrl: d.video_url ?? null,
    thumbnailUrl: d.thumbnail_url ?? null,
    error: d.error ?? null,
    duration: d.duration,
  };
}

export async function pollHeyGenUntilComplete(
  videoId: string,
  onProgress?: (status: HeyGenStatusResult) => void
): Promise<HeyGenStatusResult> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const result = await getHeyGenVideoStatus(videoId);
    if (!result) {
      await sleep(STATUS_POLL_MS);
      continue;
    }
    onProgress?.(result);
    if (result.status === 'completed' || result.status === 'failed') return result;
    await sleep(STATUS_POLL_MS);
  }
  const last = await getHeyGenVideoStatus(videoId);
  return last ?? { videoId, status: 'failed', videoUrl: null, thumbnailUrl: null, error: { message: 'Timeout' } };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
