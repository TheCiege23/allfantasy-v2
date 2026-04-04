import { getZombieRulesForSport } from '@/lib/zombie/zombieRules'

/**
 * Commissioner-facing HTML rules doc (collapsible sections on `/zombie/[leagueId]/rules`).
 */
export async function generateZombieRulesDocumentHtml(leagueId: string, sport: string): Promise<string> {
  const rules = await getZombieRulesForSport(sport)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  return `<article class="zombie-rules-doc" data-league-id="${esc(leagueId)}">
  <h1>Zombie Mode — Rules</h1>
  <p class="text-sm opacity-70">League: ${esc(leagueId)} · Sport: ${esc(sport)}</p>
  <section><h2>Scoring windows</h2><p>${esc(rules.lineupLockDesc ?? 'Configure lineup lock per platform schedule.')}</p></section>
  <section><h2>Combat thresholds</h2>
    <ul>
      <li>Bashing margin: ≥ ${rules.bashingThreshold} pts</li>
      <li>Mauling margin: ≥ ${rules.maulingThreshold} pts</li>
      <li>Weapon shield (knife): ${rules.weaponShieldThreshold} pts</li>
      <li>Weapon ambush (bow): ${rules.weaponAmbushThreshold} pts</li>
    </ul>
  </section>
  <section><h2>Serums & revive</h2>
    <ul>
      <li>Revive threshold: ${rules.reviveThreshold} serums</li>
      <li>Max serums held: ${rules.serumMaxHold}</li>
    </ul>
  </section>
  <section><h2>Conduct</h2><p>Use @Chimmy in league chat for timed actions (serum, weapons, ambush). Commissioner may override via tools.</p></section>
</article>`

}
