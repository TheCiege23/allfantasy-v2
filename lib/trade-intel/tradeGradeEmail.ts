import type {
  GradeLetter,
  GradedTrade,
  TradeAsset,
  TradePickAsset,
  TradeSideGrade,
} from '@/lib/trade-intel/sleeperTradeGradeService'
import type {
  AssetExpectation,
  SideExpectation,
  TradeExpectation,
} from '@/lib/trade-intel/tradeExpectation'

/**
 * tradeGradeEmail — the "your league just traded" email, as a real visual.
 *
 * Two jobs beyond looking better than a paragraph:
 *
 * 1. SHOW THE TRADE. Each side is a card: what he got, what he gave, and the
 *    points actually credited to each asset. A trade is a swap, so it should
 *    read as one.
 *
 * 2. DON'T LAUNDER "NO DATA" INTO A VERDICT. initialGrade is letterFor(net of
 *    the trade season), and the C band is just -40 < net < 40. Before any game
 *    is played every net is 0, so every side grades C — a placeholder that
 *    reads to a manager as "average trade". When nothing has accrued we say so
 *    outright and label the letter provisional, in the subject line too.
 *
 * Email HTML rules followed here: tables not flex, inline styles only, solid
 * hex (Outlook's Word engine drops rgba), 640px max, no external assets.
 */

// Nocturne dark, matching the early-access template but with solid hexes.
const BG = '#0b0b0f'
const CARD = '#15151c'
const BORDER = '#262631'
const TEXT = '#ffffff'
const MUTED = '#a1a1aa'
const FAINT = '#71717a'
const GOT_ACCENT = '#4ade80'
const FONT = "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"

const GRADE_COLORS: Record<GradeLetter, { bg: string; fg: string }> = {
  A: { bg: '#123524', fg: '#4ade80' },
  B: { bg: '#0f2f3d', fg: '#38bdf8' },
  C: { bg: '#2a2416', fg: '#fbbf24' },
  D: { bg: '#33200f', fg: '#fb923c' },
  F: { bg: '#331417', fg: '#f87171' },
}
const PROVISIONAL_COLORS = { bg: '#1f1f27', fg: '#a1a1aa' }

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmt(points: number): string {
  return (Math.round(points * 10) / 10).toFixed(1)
}

function signed(points: number): string {
  const rounded = Math.round(points * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`
}

/** The season initialGrade was computed from — seasonNets[0] in the engine. */
function gradedSeason(side: TradeSideGrade): string | null {
  return side.seasonNets[0]?.season ?? null
}

function playerPoints(assets: TradeAsset[], season: string | null): number {
  if (!season) return 0
  return assets.reduce((acc, a) => acc + (a.creditedBySeason[season] ?? 0), 0)
}

function pickPoints(picks: TradePickAsset[], season: string | null): number {
  if (!season) return 0
  return picks.reduce((acc, p) => acc + (p.resolved?.creditedBySeason[season] ?? 0), 0)
}

export type SideMath = {
  season: string | null
  got: number
  gave: number
  /** got - gave; this is exactly what letterFor() was handed. */
  net: number
  partial: boolean
}

export function sideMath(side: TradeSideGrade): SideMath {
  const season = gradedSeason(side)
  const got = playerPoints(side.playersIn, season) + pickPoints(side.picksIn, season)
  const gave = playerPoints(side.playersOut, season) + pickPoints(side.picksOut, season)
  return {
    season,
    got: Math.round(got * 10) / 10,
    gave: Math.round(gave * 10) / 10,
    net: Math.round((got - gave) * 10) / 10,
    partial: side.seasonNets[0]?.partial ?? false,
  }
}

/**
 * True when not a single point has been credited to anybody in the trade.
 *
 * This is the case the old email hid: every net is 0, so every side lands in the
 * C band, and the engine reports a tie. It knows nothing yet, and saying "C"
 * without saying that is the dishonest part.
 */
export function hasNoSignal(trade: GradedTrade): boolean {
  return trade.sides.every((side) => {
    const m = sideMath(side)
    return m.got === 0 && m.gave === 0
  })
}

/** Picks that cannot contribute yet because the draft has not resolved them. */
function unresolvedPickLabels(trade: GradedTrade): string[] {
  const labels = new Set<string>()
  for (const side of trade.sides) {
    for (const pick of [...side.picksIn, ...side.picksOut]) {
      if (pick.pending) labels.add(pick.label)
    }
  }
  return [...labels]
}

function assetRow(label: string, detail: string | null, points: number | null, accent: boolean): string {
  const pts =
    points == null
      ? ''
      : `<span style="color:${accent ? GOT_ACCENT : MUTED};font-weight:600;white-space:nowrap">${escapeHtml(fmt(points))}</span>`
  const sub = detail
    ? `<div style="color:${FAINT};font-size:11px;line-height:1.4;margin-top:1px">${escapeHtml(detail)}</div>`
    : ''
  return (
    `<tr><td style="padding:3px 0;font-size:13px;line-height:1.4;color:${TEXT}">` +
    `${escapeHtml(label)}${sub}</td>` +
    `<td align="right" style="padding:3px 0;font-size:13px;vertical-align:top">${pts}</td></tr>`
  )
}

/**
 * Sub-line for an asset before any points exist.
 *
 * Shows last season under THIS league's scoring, with games played attached so a
 * 12-game season is never read as a full one, and the market price for a pick
 * that has not been drafted. Position alone when we measured nothing.
 */
function priorDetail(asset: AssetExpectation | undefined, fallback: string | null): string | null {
  if (!asset) return fallback
  const bits: string[] = []
  if (asset.priorPoints != null) {
    const perGame =
      asset.priorPerGame != null && asset.priorGames != null
        ? ` (${asset.priorPerGame}/gm over ${asset.priorGames})`
        : ''
    bits.push(`${asset.priorPoints} last season${perGame}`)
  }
  if (asset.isPick && asset.marketValue != null) bits.push(`market ${Math.round(asset.marketValue)}`)
  if (bits.length === 0) return fallback
  return fallback ? `${fallback} · ${bits.join(' · ')}` : bits.join(' · ')
}

function assetList(
  players: TradeAsset[],
  picks: TradePickAsset[],
  season: string | null,
  accent: boolean,
  expected?: Map<string, AssetExpectation>,
): string {
  const rows: string[] = []
  for (const p of players) {
    const exp = expected?.get(p.playerId)
    // Before kickoff the credited number is 0.0 for everyone, which tells the
    // manager nothing; last season's real points tell him something.
    const points = expected ? (exp?.priorPoints ?? null) : season ? (p.creditedBySeason[season] ?? 0) : null
    rows.push(assetRow(p.name, priorDetail(exp, p.position), points, accent))
  }
  for (const pick of picks) {
    const base = pick.rerouted
      ? 'traded again before the draft'
      : pick.pending
        ? 'not drafted yet'
        : (pick.resolved?.name ?? null)
    const exp = expected?.get(pick.label)
    const points = expected
      ? null
      : pick.resolved
        ? season
          ? (pick.resolved.creditedBySeason[season] ?? 0)
          : null
        : null
    rows.push(assetRow(pick.label, priorDetail(exp, base), points, accent))
  }
  if (rows.length === 0) rows.push(assetRow('nothing', null, null, accent))
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.join('')}</table>`
}

function columnHeading(text: string, color: string): string {
  return (
    `<div style="font-size:10px;letter-spacing:0.09em;text-transform:uppercase;` +
    `color:${color};font-weight:700;margin-bottom:6px">${escapeHtml(text)}</div>`
  )
}

function expectationMap(sideExp: SideExpectation | undefined): Map<string, AssetExpectation> | undefined {
  if (!sideExp) return undefined
  const map = new Map<string, AssetExpectation>()
  for (const a of [...sideExp.assetsIn, ...sideExp.assetsOut]) map.set(a.key, a)
  return map
}

/** Positional swing from this trade alone, e.g. "+1 TE · −1 WR · −1 RB". */
function positionDeltaLine(delta: Record<string, number>): string | null {
  const parts = Object.entries(delta)
    .sort((a, b) => b[1] - a[1])
    .map(([pos, n]) => `${n > 0 ? '+' : '−'}${Math.abs(n)} ${pos}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function sideCard(side: TradeSideGrade, provisional: boolean, sideExp?: SideExpectation): string {
  const m = sideMath(side)
  const colors = provisional ? PROVISIONAL_COLORS : GRADE_COLORS[side.initialGrade]
  const chipLabel = provisional ? '–' : side.initialGrade
  const who = side.teamName ? `${side.managerName} · ${side.teamName}` : side.managerName
  const expected = expectationMap(sideExp)

  let netLine: string
  if (!provisional) {
    netLine =
      `Got <span style="color:${TEXT};font-weight:600">${escapeHtml(fmt(m.got))}</span> · ` +
      `Gave <span style="color:${TEXT};font-weight:600">${escapeHtml(fmt(m.gave))}</span> · ` +
      `Net <span style="color:${TEXT};font-weight:700">${escapeHtml(signed(m.net))}</span>`
  } else if (sideExp && (sideExp.marketNet != null || sideExp.priorNet != null)) {
    const bits: string[] = []
    if (sideExp.marketNet != null) {
      bits.push(
        `Market <span style="color:${TEXT};font-weight:700">${escapeHtml(signed(sideExp.marketNet))}</span>`,
      )
    }
    if (sideExp.priorNet != null) {
      bits.push(
        `Last season <span style="color:${TEXT};font-weight:700">${escapeHtml(signed(sideExp.priorNet))}</span>`,
      )
    }
    const posLine = positionDeltaLine(sideExp.positionDelta)
    if (posLine) bits.push(`<span style="color:${FAINT}">${escapeHtml(posLine)}</span>`)
    netLine = bits.join(' · ')
  } else {
    netLine = `<span style="color:${FAINT}">no points credited yet</span>`
  }

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;margin-bottom:12px">
  <tr>
    <td style="padding:14px 16px 10px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size:15px;font-weight:700;color:${TEXT};line-height:1.3">${escapeHtml(who)}</td>
          <td align="right" style="width:44px">
            <div style="display:inline-block;min-width:26px;padding:4px 9px;background:${colors.bg};color:${colors.fg};border-radius:8px;font-size:15px;font-weight:800;text-align:center">${escapeHtml(chipLabel)}</div>
          </td>
        </tr>
      </table>
      <div style="font-size:11px;color:${MUTED};margin-top:5px">${netLine}</div>
    </td>
  </tr>
  <tr>
    <td style="padding:0 16px 14px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="50%" valign="top" style="padding-right:8px">
            ${columnHeading('Got', GOT_ACCENT)}
            ${assetList(side.playersIn, side.picksIn, m.season, true, expected)}
          </td>
          <td width="50%" valign="top" style="padding-left:8px;border-left:1px solid ${BORDER}">
            ${columnHeading('Gave', MUTED)}
            ${assetList(side.playersOut, side.picksOut, m.season, false, expected)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

/**
 * The "why" strip. Every sentence is derived from the payload, never asserted.
 */
export function explainGrade(
  trade: GradedTrade,
  provisional: boolean,
  expectation?: TradeExpectation | null,
): string {
  if (provisional && expectation?.available) {
    const pending = unresolvedPickLabels(trade)
    const scoringNote =
      expectation.scoringMode === 'format-approx'
        ? ' scored with a format approximation rather than the league weights'
        : " scored with this league's own settings"

    const perSide = expectation.sides
      .map((s) => {
        const bits: string[] = []
        if (s.priorIn != null && s.priorOut != null) {
          bits.push(`took ${fmt(s.priorIn)} against ${fmt(s.priorOut)} given up`)
        }
        if (s.marketNet != null) bits.push(`market value ${signed(s.marketNet)}`)
        return bits.length > 0 ? `${s.managerName} ${bits.join(', ')}` : null
      })
      .filter((v): v is string => v != null)

    const gapNote = expectation.sides
      .filter((s) => s.starterGaps && s.starterGaps.length > 0)
      .map(
        (s) =>
          `${s.managerName} cannot fill ${s.starterGaps!
            .map((g) => `${g.position} (${g.rostered} of ${g.required})`)
            .join(' and ')}`,
      )
      .join('; ')

    return (
      `No games have been played yet, so the letter stays open — but the trade is not unknowable. ` +
      `This is a ${expectation.leagueNote} league. ` +
      (expectation.priorSeason
        ? `Using ${expectation.priorSeason} production${scoringNote}: ${perSide.join('; ')}. `
        : `${perSide.join('; ')}. `) +
      (gapNote ? `Roster needs: ${gapNote}. ` : '') +
      (pending.length > 0
        ? `${pending.join(' and ')} ${pending.length > 1 ? 'are' : 'is'} priced at market because ${pending.length > 1 ? 'they have' : 'it has'} not been drafted. `
        : '') +
      `The letter grade fills in from real points as the season runs.`
    )
  }

  if (provisional) {
    const pending = unresolvedPickLabels(trade)
    const pickNote =
      pending.length > 0
        ? ` ${pending.join(' and ')} ${pending.length > 1 ? 'have' : 'has'} not been drafted yet, so ${pending.length > 1 ? 'they' : 'it'} cannot count toward anything until the draft resolves.`
        : ''
    return (
      'No games have been played since this trade, so every asset is credited 0.0 points and both nets are exactly zero. ' +
      'The engine grades on points actually scored while you hold an asset — with nothing scored, it has no opinion yet.' +
      pickNote +
      ' It re-grades on its own as real points come in.'
    )
  }

  const parts = trade.sides.map((side) => {
    const m = sideMath(side)
    return `${side.managerName} netted ${signed(m.net)} (got ${fmt(m.got)}, gave ${fmt(m.gave)}) → ${side.initialGrade}`
  })
  return (
    `${parts.join('. ')}. ` +
    'Grades count only the points an asset scored while actually on the roster, and re-grade every season.'
  )
}

function gradeBands(provisional: boolean): string {
  if (!provisional) return ''
  return (
    `<div style="font-size:11px;color:${FAINT};line-height:1.6;margin-top:8px">` +
    `The scale, for reference: <b style="color:${MUTED}">A</b> net ≥ 100 · ` +
    `<b style="color:${MUTED}">B</b> ≥ 40 · <b style="color:${MUTED}">C</b> −40 to 40 · ` +
    `<b style="color:${MUTED}">D</b> −100 to −40 · <b style="color:${MUTED}">F</b> below −100. ` +
    `A zero-point trade sits in the middle of C, which is why an ungraded trade would otherwise look average.` +
    `</div>`
  )
}

export type TradeGradeEmail = { subject: string; html: string }

export function buildTradeGradeEmail(params: {
  leagueName: string
  trade: GradedTrade
  ledgerUrl: string
  /** League/scoring/prior-season/roster context. Omit and the email says only what points prove. */
  expectation?: TradeExpectation | null
}): TradeGradeEmail {
  const { leagueName, trade, ledgerUrl } = params
  const provisional = hasNoSignal(trade)
  const expectation = params.expectation?.available ? params.expectation : null

  // Never assert a letter in the subject when the engine has no data behind it.
  const subject = provisional
    ? `Trade completed in ${leagueName} — too early to grade (no games played yet)`
    : `Trade completed in ${leagueName} — initial grades: ${trade.sides
        .map((s) => `${s.managerName} ${s.initialGrade}`)
        .join(', ')}`

  const bySideId = new Map((expectation?.sides ?? []).map((s) => [s.rosterId, s]))
  const cards = trade.sides
    .map((s) => sideCard(s, provisional, provisional ? bySideId.get(s.rosterId) : undefined))
    .join('')
  const statusLine = provisional
    ? 'Too early to grade'
    : trade.tie
      ? 'Dead even so far'
      : 'Initial grades'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG}">
<div style="background:${BG};padding:24px 12px;font-family:${FONT};color:${TEXT}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto">
    <tr>
      <td style="padding-bottom:14px">
        <div style="font-size:11px;letter-spacing:0.10em;text-transform:uppercase;color:${FAINT};font-weight:700">
          Trade completed · ${escapeHtml(trade.season)} week ${escapeHtml(String(trade.week))}
        </div>
        <div style="font-size:21px;font-weight:800;color:${TEXT};margin-top:5px;line-height:1.25">
          ${escapeHtml(leagueName)}
        </div>
        <div style="font-size:13px;color:${MUTED};margin-top:3px">${escapeHtml(statusLine)}</div>
        ${
          expectation
            ? `<div style="font-size:11px;color:${FAINT};margin-top:6px">${escapeHtml(expectation.leagueNote)}</div>`
            : ''
        }
      </td>
    </tr>
    <tr><td>${cards}</td></tr>
    <tr>
      <td style="padding:14px 16px;background:${CARD};border:1px solid ${BORDER};border-radius:14px">
        <div style="font-size:10px;letter-spacing:0.09em;text-transform:uppercase;color:${FAINT};font-weight:700;margin-bottom:6px">
          ${provisional && expectation ? 'What we can tell before kickoff' : 'Why this grade'}
        </div>
        <div style="font-size:13px;line-height:1.6;color:${MUTED}">
          ${escapeHtml(explainGrade(trade, provisional, expectation))}
        </div>
        ${gradeBands(provisional)}
        ${
          expectation && expectation.missing.length > 0
            ? `<div style="font-size:11px;color:${FAINT};line-height:1.5;margin-top:8px">Not factored in: ${escapeHtml(expectation.missing.join('; '))}.</div>`
            : ''
        }
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:20px 0 6px 0">
        <a href="${escapeHtml(ledgerUrl)}" style="display:inline-block;background:#ffffff;color:#0b0b0f;text-decoration:none;font-weight:800;font-size:14px;padding:12px 20px;border-radius:12px">
          See the full breakdown
        </a>
        <div style="font-size:11px;color:${FAINT};margin-top:9px">
          Every season, every asset, and the points behind each letter.
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding-top:16px;border-top:1px solid ${BORDER};color:${FAINT};font-size:11px">
        AllFantasy.ai
      </td>
    </tr>
  </table>
</div>
</body>
</html>`

  return { subject, html }
}
