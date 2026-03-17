/**
 * Builds HeyGen API payload from fantasy script and options (Prompt 115).
 * Server-side only; no secrets in payload beyond what HeyGen expects.
 */

import type { HeyGenPayloadInput, HeyGenCreatePayload } from './types';

const DEFAULT_VOICE_ID = '1bd001e7e9f34d2e8c526aeb26c8ea61';
const DEFAULT_AVATAR_ID = 'josh_lite2_20220814';

export function buildHeyGenPayload(input: HeyGenPayloadInput): HeyGenCreatePayload {
  const script = truncateScript(input.script, 12000);
  const payload: HeyGenCreatePayload = {
    script,
    voice_id: input.voiceId ?? DEFAULT_VOICE_ID,
    avatar_id: input.avatarId ?? DEFAULT_AVATAR_ID,
    title: input.title?.slice(0, 200) ?? 'Fantasy recap',
    resolution: '1080p',
    aspect_ratio: '16:9',
  };
  return payload;
}

function truncateScript(script: string, maxChars: number): string {
  if (script.length <= maxChars) return script;
  const trimmed = script.slice(0, maxChars - 50);
  const lastSentence = trimmed.lastIndexOf('.');
  return lastSentence > 0 ? trimmed.slice(0, lastSentence + 1) : trimmed + '...';
}

export function buildHeyGenTitle(input: { title: string; sport: string; contentType: string }): string {
  return `[${input.sport}] ${input.title}`.slice(0, 200);
}
