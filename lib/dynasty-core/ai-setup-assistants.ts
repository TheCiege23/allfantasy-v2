/**
 * PROMPT 3/5: AI setup assistants — explanatory copy only. AI never enforces rules.
 * Use for: Dynasty Setup Assistant, Taxi Advisor, Devy Setup Assistant, C2C Setup Assistant.
 */

export const DYNASTY_SETUP_ASSISTANT = {
  title: 'Dynasty Setup Assistant',
  intro: 'Explains roster, scoring, and playoff presets and suggests best default setup for your league size.',
  topics: [
    '1QB vs Superflex vs 2QB: Superflex (QB optional in one flex) is the most popular competitive default; 1QB is simpler; 2QB increases QB scarcity.',
    'TEP (TE Premium): Adds extra points for TE receptions (e.g. +0.5) to boost TE value; recommended for competitive balance.',
    'Roster size: 12-team dynasty typically uses 14–16 bench spots, 3–4 IR, 4 taxi. Scale bench down for smaller leagues, up for 14+ teams.',
    'Playoff format: 4–6 team playoffs are common; avoid Week 18 title games in NFL. 13–14 week regular season is standard.',
  ],
}

export const TAXI_ADVISOR = {
  title: 'Taxi Advisor',
  intro: 'Suggests best taxi stashes and explains promotion risk and timing. Warns about taxi clogging.',
  topics: [
    'Taxi is for stashing eligible young/pro prospects (rookies, or rookies + 2nd/3rd year by league rules). It is not the same as Devy (college rights).',
    'Once promoted from taxi, many leagues do not allow moving the player back; check your league’s taxi lock behavior.',
    'Promotion deadline: some leagues require promotion decisions before the rookie draft; plan for roster space.',
    'Taxi clogging: if you hold too many long-shot stashes, you may miss waiver adds; balance upside with flexibility.',
  ],
}

export const DEVY_SETUP_ASSISTANT = {
  title: 'Devy Setup Assistant',
  intro: 'Explains devy slot counts, rookie vs devy draft structure, promotion strategy, and timeline-to-impact.',
  topics: [
    'Devy slots: typically 4–8 per roster; NFL devy eligible positions are QB, RB, WR, TE (no K/DST in pool by default).',
    'Rookie vs devy drafts: annual rookie draft for incoming pros; devy draft for college prospects. Promotion converts devy rights to pro roster when player declares.',
    'Promotion timing: common options are immediate after pro draft, at rollover, or manager choice before rookie draft.',
    'Return to school: if a player returns to school, league settings may restore rights to the devy pool or hold with the manager.',
  ],
}

export const C2C_SETUP_ASSISTANT = {
  title: 'C2C / Merged Devy Setup Assistant',
  intro: 'Explains college roster size and scoring choices, unified vs hybrid setup, and pipeline balance.',
  topics: [
    'College roster size: NFL C2C often uses 20 college slots; NBA C2C often uses 15. Active scoring slots (e.g. 1 QB, 2 RB, 3 WR, 1 TE, 2 FLEX) set who scores each week.',
    'Merged vs separate startup: merged draft mixes pro and college in one draft; separate runs pro draft then college draft.',
    'Unified vs hybrid standings: unified combines pro and college; hybrid weights pro and college (e.g. 60% pro, 40% college) for playoff qualification.',
    'Pipeline balance: balance college picks and promotion timing so you have a steady flow of talent to pro roster.',
  ],
}

/**
 * Get assistant copy by key (for UI or Chimmy).
 */
export function getDynastyAssistantCopy(
  key: 'dynasty' | 'taxi' | 'devy' | 'c2c'
): { title: string; intro: string; topics: string[] } {
  switch (key) {
    case 'dynasty':
      return DYNASTY_SETUP_ASSISTANT
    case 'taxi':
      return TAXI_ADVISOR
    case 'devy':
      return DEVY_SETUP_ASSISTANT
    case 'c2c':
      return C2C_SETUP_ASSISTANT
    default:
      return DYNASTY_SETUP_ASSISTANT
  }
}
