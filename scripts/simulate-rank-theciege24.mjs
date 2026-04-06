/**
 * Simulation: Sleeper NFL leagues 2017–2025 for TheCiege24, then same XP + level logic as calculateAndSaveRank.
 * Run: node scripts/simulate-rank-theciege24.mjs
 */
const SLEEPER_USER_ID = "591462610482806784"
const YEARS = []
for (let y = 2017; y <= 2025; y++) YEARS.push(y)

async function main() {
  const leagues = []
  for (const year of YEARS) {
    const url = `https://api.sleeper.app/v1/user/${SLEEPER_USER_ID}/leagues/nfl/${year}`
    const res = await fetch(url, { headers: { "User-Agent": "AllFantasy/1.0" } })
    const data = res.ok ? await res.json() : []
    const arr = Array.isArray(data) ? data : []
    console.log(`NFL ${year}: ${arr.length} leagues`)
    for (const row of arr) {
      leagues.push({ season: year, league_id: row?.league_id })
    }
  }

  const n = leagues.length
  console.log("\nTotal league-season rows (mock DB rows):", n)

  const careerWins = 0
  const careerChampionships = 0
  const careerPlayoffAppearances = 0
  const careerSeasonsPlayed = n
  const careerLeaguesPlayed = new Set(leagues.map((l) => l.season)).size
  const leagueSizeBonus = 0

  const xpNum =
    careerWins * 10 +
    careerPlayoffAppearances * 30 +
    careerChampionships * 200 +
    careerLeaguesPlayed * 10 +
    leagueSizeBonus

  console.log("\n--- calculateAndSaveRank-style (no W/L/chips from list API) ---")
  console.log("distinct seasons:", careerLeaguesPlayed)
  console.log("league row count:", careerSeasonsPlayed)
  console.log("xpNum (formula):", xpNum)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
