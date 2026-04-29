'use client'

import { Shield } from 'lucide-react'
import { PlayerImage } from '@/app/components/PlayerImage'

/**
 * Shared player-headshot component for the NFL redraft league dashboard
 * (Roster + Players/Waivers) and any other surface that wants the canonical
 * fallback chain.
 *
 * Two modes:
 *
 *  - "Rich" mode — pass `playerId` (or `sleeperId`) and (optionally) `playerName`,
 *    `headshotUrl`, `position`, `team`, `espnId`, `sport`. The component delegates
 *    to `<PlayerImage>` from `app/components/PlayerImage.tsx` which walks the
 *    sport-specific provider chain and falls back to an initials placeholder
 *    when every provider 404s. Source priority for NFL today (in
 *    `lib/players/buildPlayerMap.ts:nflChain`):
 *      1. `headshotUrl` (caller-supplied; e.g. pre-resolved via
 *         `/api/player/resolve-headshot` which wraps TheSportsDB →
 *         Clearsports → API-Sports → SportsPlayer cache)
 *      2. Sleeper CDN thumb
 *      3. ESPN headshot
 *      4. Initials placeholder (final, never errors)
 *    `<PlayerImage>` uses an `onError` step-through with a hard cap (the chain
 *    is bounded and de-duped) so there is no infinite-error-loop risk.
 *
 *  - "Legacy" mode — pass `src` only. Renders a plain `<img>` with a shield
 *    silhouette when `src` is null. Preserves the original 33-line component's
 *    contract for the 10+ existing callers (ActivityFeed, PlayerRow, TradeCard,
 *    StandingsRow, PlayoffBracket, CollegePlayerRow, StartVsComparisonCard,
 *    PlayerComparisonPremiumView, components/league/tabs/{TeamTab,PlayersTab}).
 *    No fallback chain — by design — because legacy callers already pass a
 *    pre-resolved URL.
 *
 * `team` is accepted today for accessibility / future routing but is not yet
 * forwarded to the chain (NFL chain doesn't take a team code).
 */
export type PlayerHeadshotProps = {
  /** Rich mode — Sleeper player id (or any AllFantasy id usable as a Sleeper-key fallback). */
  playerId?: string
  /** Rich mode — explicit Sleeper id alias; takes precedence over `playerId`. */
  sleeperId?: string
  /** Rich mode — player display name. Drives initials placeholder + alt text. */
  playerName?: string
  /** Rich mode — pre-resolved headshot URL, tried first in the fallback chain. */
  headshotUrl?: string | null
  /** Rich mode — NFL team abbreviation (currently informational only). */
  team?: string | null
  /** Rich mode — player position; drives initials placeholder color. */
  position?: string | null
  /** Rich mode — ESPN player id; appended to the chain. */
  espnId?: string
  /** Rich mode — sport key (default NFL). */
  sport?: string
  /** Rich mode — circular vs rounded card. */
  variant?: 'round' | 'card'

  /** Legacy mode — pre-resolved src. Ignored when `playerId`/`sleeperId` is set. */
  src?: string | null

  /** Accessibility text. Required for legacy mode; in rich mode falls back to playerName. */
  alt?: string
  /** Pixel size for the rendered image / placeholder. */
  size?: number
  /** Additional className. */
  className?: string
}

function isRichMode(props: PlayerHeadshotProps): boolean {
  return Boolean(props.playerId || props.sleeperId)
}

export function PlayerHeadshot(props: PlayerHeadshotProps) {
  if (isRichMode(props)) {
    const id = props.sleeperId ?? props.playerId ?? ''
    return (
      <PlayerImage
        sleeperId={id}
        sport={props.sport ?? 'NFL'}
        name={props.playerName ?? props.alt ?? ''}
        position={props.position ?? undefined}
        headshotUrl={props.headshotUrl ?? undefined}
        espnId={props.espnId}
        size={props.size ?? 32}
        variant={props.variant ?? 'round'}
        className={props.className ?? ''}
      />
    )
  }

  const size = props.size ?? 40
  const alt = props.alt ?? ''
  const className = props.className ?? ''

  if (props.src) {
    return (
      <img
        src={props.src}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-full border border-white/10 object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-white/10 bg-[#1C2539] text-[#8B9DB8] ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={alt || 'Player'}
    >
      <Shield size={Math.max(16, Math.floor(size / 2))} />
    </div>
  )
}

export default PlayerHeadshot
