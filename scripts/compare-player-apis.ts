/**
 * scripts/compare-player-apis.ts
 *
 * Live comparison of what Sleeper, API-Sports, TheSportsDB, and ClearSports
 * return for the same NFL players (images, team, status, IDP coverage).
 *
 * Usage: npx tsx scripts/compare-player-apis.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'
import { normalizePlayerName } from '../lib/team-abbrev'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
const prisma = new PrismaClient()

// ─── Test subjects: canonical players across positions including IDP ──────────
const TEST_PLAYERS = [
  { name: 'Patrick Mahomes', team: 'KC', pos: 'QB' },
  { name: 'Justin Jefferson', team: 'MIN', pos: 'WR' },
  { name: 'Travis Kelce', team: 'KC', pos: 'TE' },
  { name: 'Saquon Barkley', team: 'PHI', pos: 'RB' },
  { name: 'Cameron Ward', team: 'MIA', pos: 'QB' },   // 2025 rookie
  { name: 'Ashton Jeanty', team: 'LV', pos: 'RB' },   // 2025 rookie
  { name: 'Micah Parsons', team: 'DAL', pos: 'LB' },  // IDP
  { name: 'Jalen Carter', team: 'PHI', pos: 'DT' },   // IDP
  { name: 'Sauce Gardner', team: 'NYJ', pos: 'CB' },  // IDP
  { name: 'Aaron Rodgers', team: 'FA', pos: 'QB' },   // Vet FA
]

type ProviderResult = {
  found: boolean
  image: string | null
  imageType: string
  team: string | null
  status: string | null
  position: string | null
  extra: string
}

// ─── Sleeper ──────────────────────────────────────────────────────────────────
async function checkSleeper(name: string): Promise<ProviderResult> {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl')
    if (!res.ok) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: `HTTP ${res.status}` }
    const all: Record<string, any> = await res.json()
    const match = Object.values(all).find((p: any) =>
      (p.full_name || `${p.first_name} ${p.last_name}`).toLowerCase().trim() === name.toLowerCase().trim()
    )
    if (!match) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: 'not found' }
    const imgUrl = `https://sleepercdn.com/content/nfl/players/thumb/${match.player_id}.jpg`
    return {
      found: true,
      image: imgUrl,
      imageType: 'sleeper_cdn_thumb',
      team: match.team || 'FA',
      status: match.injury_status || match.status || null,
      position: match.position || null,
      extra: `id=${match.player_id} active=${match.active}`,
    }
  } catch (e) {
    return { found: false, image: null, imageType: 'error', team: null, status: null, position: null, extra: String(e) }
  }
}

// ─── API-Sports ───────────────────────────────────────────────────────────────
async function checkApiSports(name: string, season = '2024'): Promise<ProviderResult> {
  const key = process.env.API_SPORTS_KEY
  if (!key) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: 'no API key' }
  try {
    const url = `https://v1.american-football.api-sports.io/players?search=${encodeURIComponent(name)}`
    const res = await fetch(url, { headers: { 'x-apisports-key': key } })
    if (!res.ok) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: `HTTP ${res.status}` }
    const data = await res.json()
    const players: any[] = data.response || []
    const match = players.find((p: any) => {
      const n = (p.name || p.player?.name || '').toLowerCase()
      return n === name.toLowerCase() || n.includes(name.split(' ')[1]?.toLowerCase() || '')
    }) || players[0]
    if (!match) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: `0/${data.results || 0} results` }

    let mappedTeam: string | null = null
    const matchId = String(match.id || match.player?.id || '')
    if (matchId) {
      const byId = await prisma.playerIdentityMap.findFirst({
        where: { sport: 'NFL', apiSportsId: matchId },
        select: { currentTeam: true },
      })
      mappedTeam = byId?.currentTeam || null
    }
    if (!mappedTeam) {
      const normalized = normalizePlayerName(String(match.name || match.player?.name || ''))
      if (normalized) {
        const byName = await prisma.playerIdentityMap.findFirst({
          where: { sport: 'NFL', normalizedName: normalized },
          select: { currentTeam: true },
        })
        mappedTeam = byName?.currentTeam || null
      }
    }

    const img = match.image || match.player?.image || null
    const imgType = img ? (img.includes('api-sports') ? 'api_sports_cdn' : img.startsWith('https://') ? 'external_https' : 'other') : 'none'
    return {
      found: true,
      image: img,
      imageType: imgType,
      team: mappedTeam || match.team?.name || match.statistics?.[0]?.team?.name || match.player?.team?.name || null,
      status: null, // API-Sports doesn't provide injury/active status in player endpoint
      position: match.position || match.group || match.player?.position || match.player?.group || null,
      extra: `id=${match.id || match.player?.id} results=${players.length}`,
    }
  } catch (e) {
    return { found: false, image: null, imageType: 'error', team: null, status: null, position: null, extra: String(e) }
  }
}

// ─── TheSportsDB ──────────────────────────────────────────────────────────────
async function checkTheSportsDB(name: string): Promise<ProviderResult> {
  const key = process.env.THESPORTSDB_API_KEY || '123'
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${key}/searchplayers.php?p=${encodeURIComponent(name)}`
    const res = await fetch(url)
    if (!res.ok) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: `HTTP ${res.status}` }
    const data = await res.json()
    const players: any[] = data.player || []
    // TheSportsDB returns players from all sports; filter to American Football
    const nflPlayers = players.filter((p: any) =>
      (p.strSport || '').toLowerCase().includes('american') ||
      (p.strLeague || '').toLowerCase().includes('nfl')
    )
    const match = nflPlayers[0] || players[0]
    if (!match) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: `0 results` }
    // Image priority: strCutout (transparent bg) > strRender > strThumb > strFanart1
    const img = match.strCutout || match.strRender || match.strThumb || match.strFanart1 || null
    const imgType = img ? (img.includes('thesportsdb') || img.includes('r2.thesportsdb') ? 'thesportsdb_cdn' : 'external') : 'none'
    return {
      found: true,
      image: img,
      imageType: imgType,
      team: match.strTeam || null,
      status: match.strStatus || null, // TheSportsDB has strStatus on some players
      position: match.strPosition || null,
      extra: `id=${match.idPlayer} sport="${match.strSport || '?'}" nationality=${match.strNationality || '?'}`,
    }
  } catch (e) {
    return { found: false, image: null, imageType: 'error', team: null, status: null, position: null, extra: String(e) }
  }
}

// ─── ClearSports ─────────────────────────────────────────────────────────────
async function checkClearSports(name: string): Promise<ProviderResult> {
  const key = process.env.CLEARSPORTS_API_KEY
  const base = process.env.CLEARSPORTS_API_BASE || process.env.CLEARSPORTS_BASE_URL || 'https://api.clearsportsapi.com/api/v1'
  if (!key) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: 'no API key' }
  try {
    const url = `${base.replace(/\/+$/, '')}/nfl/players?search=${encodeURIComponent(name)}&q=${encodeURIComponent(name)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: `HTTP ${res.status}` }
    const data = await res.json()
    const players: any[] = Array.isArray(data) ? data : data.players || data.data || []
    const match = players.find((p: any) =>
      (p.name || p.fullName || p.displayName || '').toLowerCase().trim() === name.toLowerCase().trim()
    ) || players[0]
    if (!match) return { found: false, image: null, imageType: 'none', team: null, status: null, position: null, extra: `0/${players.length} results` }
    const img = match.imageUrl || match.headshot || match.photo || null
    const imgType = img ? (img.startsWith('https://') ? 'external_https' : 'other') : 'none'
    return {
      found: true,
      image: img,
      imageType: imgType,
      team: match.teamAbbrev || match.team || null,
      status: match.status || null,
      position: match.position || match.pos || null,
      extra: `id=${match.id || match.playerId || '?'} total=${players.length}`,
    }
  } catch (e) {
    return { found: false, image: null, imageType: 'error', team: null, status: null, position: null, extra: String(e) }
  }
}

// ─── Scoring helpers ─────────────────────────────────────────────────────────
function scoreProvider(r: ProviderResult): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 0

  if (r.found) {
    score += 20
    notes.push('✓ found')
  } else {
    notes.push('✗ not found')
    return { score, notes }
  }

  if (r.image) {
    score += 30
    notes.push(`✓ image (${r.imageType})`)
  } else {
    notes.push('✗ no image')
  }

  if (r.team) {
    score += 20
    notes.push(`✓ team=${r.team}`)
  } else {
    notes.push('✗ no team')
  }

  if (r.status) {
    score += 15
    notes.push(`✓ status=${r.status}`)
  } else {
    notes.push('~ no status')
  }

  if (r.position) {
    score += 15
    notes.push(`✓ pos=${r.position}`)
  } else {
    notes.push('✗ no position')
  }

  return { score, notes }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║   NFL PLAYER API COMPARISON: Sleeper vs 3 Others         ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  console.log('Providers tested: Sleeper | API-Sports | TheSportsDB | ClearSports')
  console.log('Scoring: Found=20 | Image=30 | Team=20 | Status=15 | Position=15\n')

  const totals: Record<string, { score: number; found: number; image: number; team: number; status: number }> = {
    sleeper: { score: 0, found: 0, image: 0, team: 0, status: 0 },
    api_sports: { score: 0, found: 0, image: 0, team: 0, status: 0 },
    thesportsdb: { score: 0, found: 0, image: 0, team: 0, status: 0 },
    clearsports: { score: 0, found: 0, image: 0, team: 0, status: 0 },
  }

  for (const player of TEST_PLAYERS) {
    console.log(`\n─── ${player.name} (${player.pos} | ${player.team}) ───────────────────`)

    // Run all 4 in parallel
    const [sl, as, tsdb, cs] = await Promise.all([
      checkSleeper(player.name),
      checkApiSports(player.name),
      checkTheSportsDB(player.name),
      checkClearSports(player.name),
    ])

    const results: Record<string, ProviderResult> = {
      sleeper: sl,
      api_sports: as,
      thesportsdb: tsdb,
      clearsports: cs,
    }

    for (const [pName, r] of Object.entries(results)) {
      const { score, notes } = scoreProvider(r)
      totals[pName].score += score
      if (r.found) totals[pName].found++
      if (r.image) totals[pName].image++
      if (r.team) totals[pName].team++
      if (r.status) totals[pName].status++

      const prefix = `  [${pName.padEnd(12)}] ${score.toString().padStart(3)}/100`
      console.log(`${prefix}  ${notes.slice(0, 3).join(' | ')}`)
      if (r.found && r.image) {
        const shortImg = r.image.length > 70 ? r.image.substring(0, 67) + '...' : r.image
        console.log(`${''.padEnd(17)} img: ${shortImg}`)
      }
      if (!r.found || r.extra.includes('error')) {
        console.log(`${''.padEnd(17)} ${r.extra}`)
      }
    }
  }

  const n = TEST_PLAYERS.length

  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║   OVERALL SCORES                                          ║')
  console.log('╠══════════════════════════════════════════════════════════╣')

  const ranked = Object.entries(totals)
    .map(([name, t]) => ({ name, ...t, avg: Math.round(t.score / n) }))
    .sort((a, b) => b.avg - a.avg)

  for (const r of ranked) {
    const bar = '█'.repeat(Math.round(r.avg / 5))
    console.log(`║  ${r.name.padEnd(12)} avg=${r.avg.toString().padStart(3)}/100  ${bar.padEnd(20)} Found=${r.found}/${n} Img=${r.image}/${n} Team=${r.team}/${n} Status=${r.status}/${n}`)
  }

  console.log('╚══════════════════════════════════════════════════════════╝')

  console.log('\n═══ CAPABILITY MATRIX ════════════════════════════════════')
  console.log('\nField              | Sleeper         | API-Sports      | TheSportsDB     | ClearSports')
  console.log('-------------------|-----------------|-----------------|-----------------|----------------')

  const caps = [
    ['Bulk roster (all players)', 'YES ~12k', 'Per-team only', 'Search only', 'Search only'],
    ['Player images', 'CDN thumb URL', 'Direct img URL', 'Cutout/Render', 'Varies by key'],
    ['Injury status', 'YES (detailed)', 'Injury endpoint', 'Limited strStatus', 'Varies by key'],
    ['Current team', 'YES real-time', 'Season-based', 'May be stale', 'Varies by key'],
    ['IDP positions', 'YES all def', 'YES all def', 'YES all def', 'Varies by key'],
    ['Multi-sport', 'NFL only', 'Many sports', 'Many sports', 'Many sports'],
    ['No auth required', 'YES (free)', 'NO (key)', 'Partial (free tier)', 'NO (key)'],
    ['Rate limit', 'Liberal', '100 req/day free', 'Liberal', 'Key-dependent'],
    ['Stats/projections', 'NO', 'Limited', 'NO', 'YES'],
  ]

  for (const row of caps) {
    const [field, ...vals] = row
    console.log(`${field.padEnd(19)}| ${vals[0].padEnd(16)}| ${vals[1].padEnd(16)}| ${vals[2].padEnd(16)}| ${vals[3]}`)
  }

  console.log('\n═══ RECOMMENDATION ═══════════════════════════════════════')
  console.log('  Closest to Sleeper for images/status/team: (see scores above)')
  console.log('  TheSportsDB: best free-tier images (strCutout = transparent bg PNG)')
  console.log('  API-Sports:  best injury/status data (dedicated injuries endpoint)')
  console.log('  ClearSports: may have projections/rankings but image quality varies')
  console.log('  Sleeper:     only option for BULK roster with CDN images + status at once')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
