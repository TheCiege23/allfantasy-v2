/**
 * Simulation: Sleeper NFL leagues 2017–2025 for TheCiege24, then same tier logic as calculateAndSaveRank.
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

  // Without import_wins from DB, calculateAndSaveRank uses zeros unless columns filled — mirror "rows only" tier thresholds
  const careerWins = 0
  const careerLosses = 0
  const careerChampionships = 0
  const careerPlayoffAppearances = 0
  const careerSeasonsPlayed = n
  const careerLeaguesPlayed = new Set(leagues.map((l) => l.season)).size

  const xpTotal =
    careerWins * 10 +
    careerChampionships * 100 +
    careerPlayoffAppearances * 25 +
    careerSeasonsPlayed * 5

  let rankTier = "T6"
  if (careerChampionships >= 3) rankTier = "T1"
  else if (careerChampionships >= 1) rankTier = "T2"
  else if (careerPlayoffAppearances >= 3) rankTier = "T3"
  else if (careerSeasonsPlayed >= 5) rankTier = "T4"
  else if (careerSeasonsPlayed >= 2) rankTier = "T5"

  console.log("\n--- calculateAndSaveRank-style result (W/L/chips not in Sleeper list API) ---")
  console.log("distinct seasons with at least one league:", careerLeaguesPlayed)
  console.log("xpTotal (formula):", xpTotal)
  console.log("resulting tier:", rankTier)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
