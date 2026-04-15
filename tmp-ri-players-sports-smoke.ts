import * as dotenv from 'dotenv'
import { rollingInsightsProvider } from './lib/workers/providers/rolling-insights'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab', 'soccer_euro'] as const

function countRows(data: unknown): number {
  if (Array.isArray(data)) return data.length
  if (!data || typeof data !== 'object') return 0
  const o = data as Record<string, unknown>
  if (Array.isArray(o.data)) return o.data.length
  if (o.data && typeof o.data === 'object') {
    const vals = Object.values(o.data as Record<string, unknown>)
    const arr = vals.find((v) => Array.isArray(v))
    if (Array.isArray(arr)) return arr.length
  }
  if (Array.isArray(o.results)) return o.results.length
  if (Array.isArray(o.items)) return o.items.length
  return 0
}

async function main() {
  for (const sport of SPORTS) {
    const res = await rollingInsightsProvider({ sport, dataType: 'players' })
    const rows = countRows(res.data)
    const status = res.error ? `ERR ${res.error}` : 'OK'
    console.log(`${sport}/players: ${status}${rows ? ` | rows ${rows}` : ''}`)
  }
}

main().catch((e) => {
  console.error('players smoke failed:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
