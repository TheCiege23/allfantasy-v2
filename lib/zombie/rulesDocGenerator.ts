import type { ZombieLeague, ZombieRulesDocument, ZombieRulesTemplate } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getLeagueMode } from '@/lib/zombie/zombieLeagueMode'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function loadTemplate(sport: string): Promise<ZombieRulesTemplate | null> {
  const s = normalizeToSupportedSport(sport)
  return prisma.zombieRulesTemplate.findUnique({ where: { sport: s } })
}

function buildSections(
  z: ZombieLeague & { name: string | null },
  tpl: ZombieRulesTemplate | null,
  freeCurrency: string,
): Omit<
  ZombieRulesDocument,
  'id' | 'generatedAt' | 'lastUpdatedAt' | 'leagueId' | 'version' | 'sport' | 'isPaid'
> {
  const mode = getLeagueMode(z)
  const sport = normalizeToSupportedSport(z.sport)
  const leagueName = z.name ?? 'Zombie League'
  const year = z.season

  const pos = (tpl?.positionList?.length ? tpl.positionList : ['—']).join(' | ')
  const scoring = tpl?.scoringWindowDesc ?? 'See commissioner settings and platform scoring week.'
  const lock = tpl?.lineupLockDesc ?? 'Per platform lock rules.'
  const edge = tpl?.edgeCaseNotes ?? ''

  const sectionOverview = [
    `AllFantasy Zombie League — ${leagueName}`,
    `Sport: ${sport} | Season: ${year} | Mode: ${mode === 'paid' ? 'PAID' : 'FREE'}`,
    `${leagueName} is an asymmetrical fantasy league where one team begins as the Whisperer and everyone else begins as a Survivor.`,
    'As the season progresses, infection spreads, the Horde grows, and Survivors fight to stay alive.',
  ].join('\n')

  const sectionInfection = [
    'INFECTION RULES',
    '- A Survivor who loses their weekly matchup to the Whisperer becomes a Zombie.',
    '- A Survivor who loses their weekly matchup to any Zombie becomes a Zombie.',
    '- Infection is permanent unless a Serum Antidote is used.',
    '- Status changes take effect after official scores finalize.',
    mode === 'paid'
      ? 'PAID: Infection transfers weekly winnings from victim to infector where configured.'
      : `FREE: Infection transfers ${freeCurrency} from victim to infector (symbolic).`,
  ].join('\n')

  const sectionScoring = [
    `SCORING — ${sport}`,
    `Scoring window: ${scoring}`,
    tpl
      ? `Roster size: ${tpl.rosterSize} players (${tpl.starterCount} starters, ${tpl.benchCount} bench).`
      : 'Roster size: see league platform.',
    `Lineup lock: ${lock}`,
    `Positions: ${pos}`,
    `Sport notes: ${edge}`,
  ].join('\n')

  const sectionBashing = [
    'BASHINGS',
    tpl
      ? `A Bashing occurs when the winning team wins by ${tpl.bashingThreshold}+ points.`
      : 'A Bashing occurs when the winning margin meets the league bashing threshold.',
    'Bashing result: The loser receives a public “Bashed” marker for the week.',
    mode === 'paid'
      ? 'PAID: The loser may forfeit an additional slice of their weekly pot (commissioner settings).'
      : `FREE: The loser may lose additional ${freeCurrency} (symbolic).`,
  ].join('\n')

  const sectionMauling = [
    'MAULINGS',
    tpl
      ? `A Mauling occurs when the winning team wins by ${tpl.maulingThreshold}+ points.`
      : 'A Mauling occurs when the winning margin meets the league mauling threshold.',
    'Mauling result: Double loot transfer where enabled; mauling animation may trigger.',
    mode === 'paid'
      ? 'PAID: Double winnings transferred when the pot engine applies it.'
      : `FREE: Double ${freeCurrency} transferred (symbolic); badges may be awarded.`,
  ].join('\n')

  let sectionWinnings = ''
  if (mode === 'paid') {
    sectionWinnings = [
      'WINNINGS',
      z.buyInAmount != null ? `Buy-In: $${z.buyInAmount} per team (if configured).` : 'Buy-In: commissioner-configured.',
      `Tracked pot on league: $${z.potTotal.toFixed(2)} (display; actual pot may be in paid config).`,
      'Weekly and season payout rates are commissioner-configured in Zombie paid settings.',
      z.ultimateSurvivorPot ? 'Ultimate Survivor Bonus: enabled.' : 'Ultimate Survivor Bonus: optional.',
    ].join('\n')
  } else {
    sectionWinnings = [
      'REWARDS',
      `Currency: ${freeCurrency}`,
      'Weekly Win: symbolic weekly leader recognition.',
      'Season Award: symbolic season recognition.',
      'Ultimate Bonus: optional symbolic bonus.',
      'All rewards are symbolic — no real money is involved.',
    ].join('\n')
  }

  const sectionPaidVsFree =
    mode === 'paid'
      ? [
          'This is a PAID league. Real buy-ins may apply.',
          'Please ensure all participants have paid before the season begins.',
          'Winnings are distributed by the commissioner after verification.',
        ].join('\n')
      : [
          'This is a FREE league. No real money is involved.',
          `All winnings are tracked as ${freeCurrency} — symbolic rewards only.`,
          'Gameplay mirrors paid mode for infections, items, and drama.',
        ].join('\n')

  const sectionChimmy = [
    '@CHIMMY ACTIONS',
    'You can interact with @Chimmy for timed actions, status checks, inventory, and rules questions.',
    '@Chimmy will not reveal another player\'s private information.',
  ].join('\n')

  const sectionWeeklyTiming = [
    `WEEKLY SCHEDULE — ${sport}`,
    scoring,
    `Whisperer ambushes must respect lock rules: ${lock}`,
    'Status changes finalize after scores are official; stat corrections may re-open a window.',
  ].join('\n')

  const sectionRoster = tpl
    ? [
        'ROSTER',
        `Starters: ${tpl.starterCount}, Bench: ${tpl.benchCount}, IR slots (default): ${tpl.irSlotsDefault}`,
        `Lineup frequency: ${tpl.lineupFrequency}`,
      ].join('\n')
    : 'ROSTER\nSee platform roster settings.'

  const filler = 'See commissioner tools and league chat for live settings.'

  return {
    sectionOverview,
    sectionInfection,
    sectionWhisperer: filler,
    sectionSurvivor: filler,
    sectionZombie: filler,
    sectionScoring,
    sectionRoster,
    sectionAmbush: filler,
    sectionBashing,
    sectionMauling,
    sectionSerums: tpl?.serumAwardDesc ?? 'Serum awards follow league template and commissioner settings.',
    sectionWeapons: 'Weapons follow score thresholds and commissioner toggles.',
    sectionWinnings,
    sectionUniverseMovement: 'Universe promotion/relegation follows universe commissioner settings when enabled.',
    sectionWeeklyTiming,
    sectionChimmy,
    sectionPaidVsFree,
  }
}

/**
 * Build and persist the full rules document for a zombie league (uses DB template when present).
 */
export async function generateRulesDocument(zombieLeagueId: string): Promise<ZombieRulesDocument> {
  const z = await prisma.zombieLeague.findUnique({
    where: { id: zombieLeagueId },
  })
  if (!z) throw new Error('Zombie league not found')

  const tpl = await loadTemplate(z.sport)
  const free = await prisma.zombieFreeRewardConfig.findUnique({ where: { zombieLeagueId: z.id } })
  const freeCurrency = free?.currencyLabel ?? 'Outbreak Points'

  const sections = buildSections(z, tpl, freeCurrency)
  const prev = await prisma.zombieRulesDocument.findFirst({
    where: { leagueId: z.id },
    orderBy: { version: 'desc' },
  })
  const version = (prev?.version ?? 0) + 1

  const doc = await prisma.zombieRulesDocument.create({
    data: {
      leagueId: z.id,
      sport: normalizeToSupportedSport(z.sport),
      version,
      isPaid: z.isPaid,
      ...sections,
    },
  })

  await prisma.zombieAnnouncement.create({
    data: {
      zombieLeagueId: z.id,
      universeId: z.universeId,
      type: 'commissioner_note',
      title: 'Rules document updated',
      content: `Rules doc v${version} is available for ${z.name ?? 'this league'}.`,
      week: Math.max(1, z.currentWeek || 1),
    },
  })

  await prisma.zombieAuditEntry
    .create({
      data: {
        zombieLeagueId: z.id,
        universeId: z.universeId,
        category: 'rules_doc_generated',
        action: 'RULES_DOC_GENERATED',
        description: `Generated rules document version ${version}.`,
        isPublic: true,
      },
    })
    .catch(() => {})

  return doc
}

export function getRulesDocAsHtml(doc: ZombieRulesDocument): string {
  const sec = (title: string, body: string) =>
    `<section class="zombie-rules-section"><h2 class="zombie-rules-heading">${esc(title)}</h2><pre class="whitespace-pre-wrap text-sm opacity-90">${esc(body)}</pre></section>`

  return `<article class="zombie-rules-doc max-w-3xl">
  ${doc.isPaid ? '<p class="zombie-rules-paid-badge mb-2 text-amber-200/90">PAID LEAGUE</p>' : '<p class="zombie-rules-threshold-badge mb-2 text-sky-200/80">FREE LEAGUE</p>'}
  ${sec('Overview', doc.sectionOverview)}
  ${sec('Infection', doc.sectionInfection)}
  ${sec('Scoring', doc.sectionScoring)}
  ${sec('Roster', doc.sectionRoster)}
  ${sec('Bashing', doc.sectionBashing)}
  ${sec('Mauling', doc.sectionMauling)}
  ${sec('Serums', doc.sectionSerums)}
  ${sec('Weapons', doc.sectionWeapons)}
  ${sec('Winnings / Rewards', doc.sectionWinnings)}
  ${sec('Universe', doc.sectionUniverseMovement)}
  ${sec('Weekly timing', doc.sectionWeeklyTiming)}
  ${sec('@Chimmy', doc.sectionChimmy)}
  ${sec('Paid vs Free', doc.sectionPaidVsFree)}
</article>`
}

export function getRulesDocAsText(doc: ZombieRulesDocument): string {
  const parts = [
    doc.sectionOverview,
    doc.sectionInfection,
    doc.sectionScoring,
    doc.sectionRoster,
    doc.sectionBashing,
    doc.sectionMauling,
    doc.sectionSerums,
    doc.sectionWeapons,
    doc.sectionWinnings,
    doc.sectionUniverseMovement,
    doc.sectionWeeklyTiming,
    doc.sectionChimmy,
    doc.sectionPaidVsFree,
  ]
  return parts.join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n')
}

/**
 * Commissioner / rules page: HTML from latest stored doc, or generate-on-the-fly from templates.
 */
export async function generateZombieRulesDocumentHtml(fantasyLeagueId: string, sport: string): Promise<string> {
  const z = await prisma.zombieLeague.findUnique({ where: { leagueId: fantasyLeagueId } })
  if (!z) return ''

  const latest = await prisma.zombieRulesDocument.findFirst({
    where: { leagueId: z.id },
    orderBy: { version: 'desc' },
  })
  if (latest) return getRulesDocAsHtml(latest)

  const doc = await generateRulesDocument(z.id)
  return getRulesDocAsHtml(doc)
}
