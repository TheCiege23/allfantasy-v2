/**
 * AllFantasy Social Share Engine — types (PROMPT 145).
 * Shareable kinds, destinations, and safe public payloads (no sensitive league data).
 */

import type { LeagueSport } from "@prisma/client";

/** Supported shareable object types. */
export const SHAREABLE_KINDS = [
  "league_invite",
  "bracket_invite",
  "ai_result_card",
  "matchup_result",
  "power_rankings",
  "story_recap",
  "creator_league_promo",
  "player_comparison",
] as const;

export type ShareableKind = (typeof SHAREABLE_KINDS)[number];

/** Share destinations. */
export const SHARE_DESTINATIONS = [
  "copy_link",
  "x",
  "discord",
  "reddit",
  "email",
  "sms",
] as const;

export type ShareDestination = (typeof SHARE_DESTINATIONS)[number];

/**
 * Safe public payload for sharing. Only fields that are safe to expose in URLs and OG.
 * No member lists, emails, or private league details.
 */
export interface SharePayload {
  /** Shareable kind. */
  kind: ShareableKind;
  /** Public share URL (invite link, /share/[id], or public discovery URL). */
  url: string;
  /** Title for preview and copy (e.g. "Join my league", "Week 7 matchup result"). */
  title: string;
  /** Short description for preview and social text. */
  description?: string;
  /** Optional image URL for OG / cards (public only). */
  imageUrl?: string;
  /** Sport for theming; aligns with LeagueSport. */
  sport?: LeagueSport | string;
  /** Optional shareId when content is stored (e.g. ShareableMoment.id). */
  shareId?: string;
  /** Optional public league name (only if league is discoverable/public). */
  leagueName?: string;
  /** Optional public bracket/tournament name. */
  bracketName?: string;
  /** Optional week/round label (e.g. "Week 7", "Round 2"). */
  weekOrRound?: string;
  /** Optional hashtags for X/social. */
  hashtags?: string[];
  /** Extra safe key-value for platform-specific copy (e.g. CTA). */
  cta?: string;
}

/** Options when opening share modal (e.g. from league vs from bracket). */
export interface ShareModalOptions {
  payload: SharePayload;
  /** Callback when share completes (e.g. track success). */
  onShareComplete?: (destination: ShareDestination) => void;
  /** Prefer native share on mobile when available. */
  preferNativeOnMobile?: boolean;
}

/** Event meta for share analytics (safe fields only). */
export interface ShareTrackMeta {
  shareType: ShareableKind;
  destination: ShareDestination;
  shareId?: string;
  /** Only include if league is public / share context allows. */
  leagueId?: string;
  sport?: string;
  path?: string;
}
