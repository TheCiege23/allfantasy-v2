/**
 * Optional future extension hooks for IDP. Do NOT fully build unless needed.
 * PROMPT 5/6.
 */

// --- True position / EDGE support ---
// When data source distinguishes EDGE cleanly (e.g. Sleeper adds EDGE position):
// - Add 'EDGE' to IDP_SPLIT_POSITIONS in types.ts and IDP_GROUP_TO_SPLIT if grouped (e.g. DL family).
// - Extend IdpPlayerEligibility positionTags to include EDGE; resolveEligibility and isEligibleForSlot already work off tags.
// export const IDP_EDGE_POSITION = 'EDGE'

// --- Team-defense + IDP hybrid ---
// Leagues that start both DST and IDP slots:
// - Add DST to starter_slots in roster defaults; keep IDP slots. Scoring: use existing DST + IDP stat keys.
// - Lineup validation: allow DST in DST slot only; IDP slots unchanged.
// - No schema change required if DST is already in sport defaults; league config can add both.

// --- Defensive captain multipliers ---
// One IDP slot designated "captain" with 1.5x or 2x points:
// - IdpLeagueConfig: captainSlotName?: string, captainMultiplier?: number.
// - At score time: if starter matches captain slot, multiply IDP points by captainMultiplier.
// - Best-ball: optimizer assigns highest-IDP scorer to captain slot when applicable.

// --- Custom tackle bonus ladders ---
// e.g. 0-4 tackles = 0 bonus, 5-9 = 2 pts, 10+ = 5 pts:
// - IdpLeagueConfig or scoringOverrides: idp_tackle_bonus_ladder?: { threshold: number; bonus: number }[].
// - FantasyPointCalculator or IDP-specific scorer: after base tackle points, apply ladder from highest threshold.
// - Optional stat key idp_high_tackle_bonus already in IDP_OPTIONAL_STAT_KEYS; can wire to ladder result.

export const IDP_FUTURE_HOOKS_PLACEHOLDER = true
