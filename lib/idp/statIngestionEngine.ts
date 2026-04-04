/**
 * IDP stat ingestion — normalize external/box-score defensive stats into canonical `idp_*` keys
 * used by `scoringEngine`. NFL only.
 *
 * When persistent weekly stat rows are added to Prisma, map rows → `IdpWeeklyStatLine` here.
 */

/** Canonical `idp_*` keys plus optional keys — values are stat counts per game/week. */
export type IdpWeeklyStatLine = Partial<Record<string, number>>

function seedFromString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

function num(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v)
  }
  return 0
}

/**
 * Map provider/box-score shaped objects (Sleeper-adjacent keys) into canonical IDP stat line.
 * Unknown keys are ignored; combined `tackles` splits into solo/assist when split fields absent.
 */
export function normalizeExternalDefenseStats(raw: Record<string, unknown>): IdpWeeklyStatLine {
  const comb = num(raw, 'tackles', 'tackle', 'def_tackles', 'combined_tackles')
  let solo = num(raw, 'idp_solo_tackle', 'solo_tackles', 'solo_tackle', 'tackles_solo', 'def_tackles_solo')
  let ast = num(raw, 'idp_assist_tackle', 'assist_tackles', 'asst_tackle', 'def_tackles_asst')
  if (comb > 0 && solo === 0 && ast === 0) {
    solo = Math.round(comb * 0.58)
    ast = Math.max(0, comb - solo)
  }

  const line: IdpWeeklyStatLine = {
    idp_solo_tackle: solo,
    idp_assist_tackle: ast,
    idp_sack: num(raw, 'idp_sack', 'sack', 'sacks', 'def_sacks'),
    idp_interception: num(raw, 'idp_interception', 'int', 'ints', 'interceptions', 'def_ints'),
    idp_forced_fumble: num(raw, 'idp_forced_fumble', 'ff', 'forced_fumbles', 'def_ff'),
    idp_fumble_recovery: num(raw, 'idp_fumble_recovery', 'fum_rec', 'fumble_recoveries', 'def_fr'),
    idp_pass_defended: num(raw, 'idp_pass_defended', 'pass_defended', 'pd', 'def_pd', 'passes_defended'),
    idp_safety: num(raw, 'idp_safety', 'safety', 'safeties'),
    idp_blocked_kick: num(raw, 'idp_blocked_kick', 'blocked_kick', 'blk_kick'),
    idp_defensive_touchdown: num(raw, 'idp_defensive_touchdown', 'def_td', 'dst_td'),
    idp_td: num(raw, 'idp_td', 'td', 'touchdowns'),
  }

  const opt: IdpWeeklyStatLine = {
    idp_tackle_for_loss: num(raw, 'idp_tackle_for_loss', 'tfl', 'tackles_for_loss'),
    idp_qb_hit: num(raw, 'idp_qb_hit', 'qb_hit', 'qb_hits', 'hits'),
    idp_return_yards: num(raw, 'idp_return_yards', 'return_yards', 'ret_yds'),
    idp_sack_yardage: num(raw, 'idp_sack_yardage', 'sack_yards'),
    idp_multi_sack_bonus: num(raw, 'idp_multi_sack_bonus'),
    idp_high_tackle_bonus: num(raw, 'idp_high_tackle_bonus'),
  }

  return { ...line, ...opt }
}

/**
 * Deterministic weekly stat line for simulations / AI when DB rows are absent.
 * Produces integer-ish counts derived from `(playerId, week)` so rankings are stable.
 */
export function generateDeterministicWeeklyStatLine(playerId: string, week: number): IdpWeeklyStatLine {
  const s = seedFromString(`${playerId}:${week}`)
  const solo = 2 + (s % 9)
  const ast = 1 + ((s >> 4) % 7)
  const sack = (s % 5) >= 3 ? 1 : 0
  const int_ = (s % 11) >= 8 ? 1 : 0
  const ff = (s % 7) >= 5 ? 1 : 0
  const fr = (s % 13) >= 10 ? 1 : 0
  const pd = (s >> 2) % 4
  const safety = (s % 47) === 0 ? 1 : 0
  const blk = (s % 61) === 0 ? 1 : 0
  const defTd = (s % 73) === 0 ? 1 : 0
  return {
    idp_solo_tackle: solo,
    idp_assist_tackle: ast,
    idp_sack: sack,
    idp_interception: int_,
    idp_forced_fumble: ff,
    idp_fumble_recovery: fr,
    idp_pass_defended: pd,
    idp_safety: safety,
    idp_blocked_kick: blk,
    idp_defensive_touchdown: defTd,
    idp_td: defTd,
    idp_tackle_for_loss: (s >> 6) % 3,
    idp_qb_hit: (s >> 8) % 4,
  }
}
