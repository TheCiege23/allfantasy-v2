/**
 * lib/soccer-scoring/SoccerScoringCategories.ts
 * Complete Soccer scoring category definitions for the commissioner settings panel.
 *
 * Organised into 6 tabs:
 *   OUTFIELD:    Attacking + Defending (outfield players)
 *   GOALKEEPING: GK-specific stats
 *   DISCIPLINE:  Cards, fouls, offside
 *   BONUSES:     Hat tricks, MOTM, rating bonuses
 *   MISC:        Minutes, appearances, substitutions
 *   ADVANCED:    xG / xA / progressive analytics (premium-gated)
 */

export interface SoccerScoringRow {
  key: string
  label: string
  helper?: string
  premium?: boolean
  defaultValue: number
}

export interface SoccerScoringCategory {
  id: string
  label: string
  /** 'outfield' | 'goalkeeping' | 'discipline' | 'bonuses' | 'misc' | 'advanced' */
  group: string
  rows: SoccerScoringRow[]
}

// =============================================================================
// OUTFIELD — Attacking
// =============================================================================

const OUTFIELD_ATTACKING: SoccerScoringCategory = {
  id: 'outfield',
  label: 'Outfield',
  group: 'outfield',
  rows: [
    // ── Attacking ──────────────────────────────────────────────────────────
    { key: 'goal',            label: 'Goal',                  defaultValue: 6 },
    { key: 'assist',          label: 'Assist',                defaultValue: 3 },
    { key: 'shot_on_target',  label: 'Shot on Target',        helper: 'Excludes goals', defaultValue: 0.5 },
    { key: 'shot',            label: 'Shot (any)',            helper: 'All shots taken', defaultValue: 0.2 },
    { key: 'key_pass',        label: 'Key Pass',              helper: 'Pass leading to a shot', defaultValue: 0.5 },
    { key: 'big_chance_created', label: 'Big Chance Created', helper: 'Clear goal-scoring opportunity created', defaultValue: 0 },
    { key: 'through_ball',    label: 'Through Ball',          defaultValue: 0 },
    { key: 'dribble_success', label: 'Successful Dribble',    helper: 'Completed take-on', defaultValue: 0 },
    { key: 'cross_accurate',  label: 'Accurate Cross',        defaultValue: 0 },
    { key: 'penalty_scored',  label: 'Penalty Scored',        helper: 'On top of goal value', defaultValue: 6 },
    { key: 'penalty_missed',  label: 'Penalty Missed',        defaultValue: -2 },
    // ── Defending ──────────────────────────────────────────────────────────
    { key: 'clean_sheet',     label: 'Clean Sheet (DEF/MID)', helper: 'Outfield player 0 GA at 60+ min', defaultValue: 4 },
    { key: 'goal_conceded',   label: 'Goal Conceded',         helper: 'Per goal while outfield player is on pitch', defaultValue: -1 },
    { key: 'tackle_won',      label: 'Tackle Won',            defaultValue: 0.3 },
    { key: 'interception',    label: 'Interception',          defaultValue: 0.3 },
    { key: 'clearance',       label: 'Clearance',             defaultValue: 0 },
    { key: 'blocked_shot',    label: 'Blocked Shot',          defaultValue: 0 },
    { key: 'aerial_won',      label: 'Aerial Duel Won',       defaultValue: 0 },
    { key: 'own_goal',        label: 'Own Goal',              defaultValue: -2 },
  ],
}

// =============================================================================
// GOALKEEPING
// =============================================================================

const GOALKEEPING: SoccerScoringCategory = {
  id: 'goalkeeping',
  label: 'Goalkeeping',
  group: 'goalkeeping',
  rows: [
    { key: 'gk_save',          label: 'Save',                   defaultValue: 0.5 },
    { key: 'gk_penalty_save',  label: 'Penalty Save',           defaultValue: 5 },
    { key: 'gk_goals_against', label: 'Goal Conceded (GK)',     helper: 'Per goal let in', defaultValue: -1 },
    { key: 'gk_clean_sheet',   label: 'Clean Sheet (GK)',       defaultValue: 4 },
    { key: 'gk_high_claim',    label: 'High Claim',             helper: 'Claiming a high ball', defaultValue: 0 },
    { key: 'gk_punch',         label: 'Punch / Claim',          helper: 'Successfully punching a cross', defaultValue: 0 },
    { key: 'gk_save_inside_box', label: 'Save Inside the Box',  helper: 'Difficult close-range save', defaultValue: 0 },
  ],
}

// =============================================================================
// DISCIPLINE
// =============================================================================

const DISCIPLINE: SoccerScoringCategory = {
  id: 'discipline',
  label: 'Discipline',
  group: 'discipline',
  rows: [
    { key: 'yellow_card',    label: 'Yellow Card',    defaultValue: -1 },
    { key: 'red_card',       label: 'Red Card',       helper: 'Automatic suspension', defaultValue: -3 },
    { key: 'foul_committed', label: 'Foul Committed', defaultValue: 0 },
    { key: 'foul_drawn',     label: 'Foul Drawn',     defaultValue: 0 },
    { key: 'offside',        label: 'Offside',        defaultValue: 0 },
  ],
}

// =============================================================================
// BONUSES
// =============================================================================

const BONUSES: SoccerScoringCategory = {
  id: 'bonuses',
  label: 'Bonuses',
  group: 'bonuses',
  rows: [
    { key: 'hat_trick_bonus',    label: 'Hat Trick Bonus',     helper: 'Extra points for 3+ goals in a match', defaultValue: 3 },
    { key: 'man_of_match',       label: 'Man of the Match',    helper: 'AFC MOTM award', defaultValue: 0 },
    { key: 'rating_bonus_7plus', label: 'Rating 7.0+ Bonus',   helper: 'Whoscored / Sofascore match rating ≥7.0', defaultValue: 0 },
    { key: 'rating_bonus_8plus', label: 'Rating 8.0+ Bonus',   helper: 'Whoscored / Sofascore match rating ≥8.0', defaultValue: 0 },
  ],
}

// =============================================================================
// MISC — Playing time & appearances
// =============================================================================

const MISC: SoccerScoringCategory = {
  id: 'misc',
  label: 'Misc',
  group: 'misc',
  rows: [
    { key: 'minutes_played', label: 'Minutes Played',      helper: 'Per minute on pitch', defaultValue: 0.02 },
    { key: 'appearance',     label: 'Appearance Bonus',    helper: 'Flat points for any appearance', defaultValue: 0 },
    { key: 'sub_on',         label: 'Substitute On',       helper: 'Flat bonus for coming on as sub', defaultValue: 0 },
    { key: 'sub_off',        label: 'Substitute Off',      helper: 'Flat modifier for being substituted off', defaultValue: 0 },
  ],
}

// =============================================================================
// ADVANCED — Premium analytics (AF Commissioner Subscription required)
// =============================================================================

const ADVANCED: SoccerScoringCategory = {
  id: 'advanced',
  label: 'Advanced',
  group: 'advanced',
  rows: [
    { key: 'xg_bonus',              label: 'xG Bonus',                   helper: 'Points per expected goal (xG) produced', premium: true, defaultValue: 0 },
    { key: 'xa_bonus',              label: 'xA Bonus',                   helper: 'Points per expected assist (xA)', premium: true, defaultValue: 0 },
    { key: 'xgi_bonus',             label: 'xGI Bonus',                  helper: 'Points per xG + xA (goal involvement)', premium: true, defaultValue: 0 },
    { key: 'post_shot_xg',          label: 'Post-Shot xG',               helper: 'Shot quality metric — actual shot xG', premium: true, defaultValue: 0 },
    { key: 'progressive_passes',    label: 'Progressive Pass',           helper: 'Pass that moves the ball significantly toward goal', premium: true, defaultValue: 0 },
    { key: 'progressive_carries',   label: 'Progressive Carry',          helper: 'Ball carry significantly toward opponent goal', premium: true, defaultValue: 0 },
    { key: 'shot_creating_actions', label: 'Shot-Creating Action (SCA)',  helper: 'Any action leading directly to a shot', premium: true, defaultValue: 0 },
    { key: 'gk_psxg',              label: 'GK Post-Shot xG Saved (PSxG)', helper: 'GK performance vs. quality of shots faced', premium: true, defaultValue: 0 },
  ],
}

// =============================================================================
// Exports
// =============================================================================

export const SOCCER_SCORING_CATEGORIES: SoccerScoringCategory[] = [
  OUTFIELD_ATTACKING,
  GOALKEEPING,
  DISCIPLINE,
  BONUSES,
  MISC,
  ADVANCED,
]

export const SOCCER_SCORING_CATEGORY_IDS = SOCCER_SCORING_CATEGORIES.map((c) => c.id)

/** All stat keys used in the commissioner settings panel (including premium). */
export const ALL_SOCCER_SCORING_KEYS = SOCCER_SCORING_CATEGORIES.flatMap((c) =>
  c.rows.map((r) => r.key),
)

/** Default scoring rules derived from category definitions (AF default values). */
export function buildSoccerDefaultRulesFromCategories(): Record<string, number> {
  return Object.fromEntries(
    SOCCER_SCORING_CATEGORIES.flatMap((c) =>
      c.rows.map((r) => [r.key, r.defaultValue]),
    ),
  )
}
