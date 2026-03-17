/**
 * Fantasy media (video/podcast) — types for HeyGen and episodes (Prompt 115).
 */

import type { SupportedSport } from '@/lib/sport-scope';

export const MEDIA_TYPES = [
  'weekly_recap',
  'waiver_targets',
  'league_recap',
  'player_spotlight',
  'matchup_preview',
  'playoff_preview',
  'playoff_recap',
  'championship_recap',
  'trade_reaction',
] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

export type Sport = SupportedSport;

export interface VideoScriptSection {
  heading: string;
  body: string;
}

export interface GeneratedVideoScript {
  title: string;
  script: string;
  sections: VideoScriptSection[];
  contentType: MediaType;
  sport: string;
}

export interface HeyGenPayloadInput {
  title: string;
  sport: string;
  contentType: MediaType;
  script: string;
  language?: string;
  durationTargetSeconds?: number;
  avatarId?: string;
  voiceId?: string;
}

export interface HeyGenCreatePayload {
  script: string;
  voice_id: string;
  title?: string;
  avatar_id?: string;
  resolution?: '1080p' | '720p';
  aspect_ratio?: '16:9' | '9:16';
}

export const EPISODE_STATUS = [
  'draft',
  'script_ready',
  'generating',
  'completed',
  'failed',
] as const;

export type EpisodeStatus = (typeof EPISODE_STATUS)[number];
