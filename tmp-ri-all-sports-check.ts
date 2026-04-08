import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { rollingInsightsProvider } from './lib/workers/providers/rolling-insights'

function loadDotenv(fileName: string): void {
  const filePath = resolve(process.cwd(), fileName)
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex <= 0) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotenv('.env.local')
loadDotenv('.env')

process.env.ROLLING_INSIGHTS_CLIENT_ID = ''
process.env.ROLLING_INSIGHTS_CLIENT_SECRET = ''
process.env.ROLLING_INSIGHTS_CLIENT_ID2 = '5afa2eeb-0b0b-4009-8987-cc0b02c2ee66'
process.env.ROLLING_INSIGHTS_CLIENT_SECRET2 = 'acf68955424cf894bed75a8cd352f11c573402b4deb46fcc69cd2147642e2299'
process.env.ROLLING_INSIGHTS_RSC_TOKEN = ''
process.env.ROLLING_INSIGHTS_RSC_TOKEN2 = ''

const sports = ['nba', 'mlb', 'nhl', 'ncaab', 'ncaaf', 'soccer_euro'] as const

;(async () => {
  for (const sport of sports) {
    const players = await rollingInsightsProvider({ sport, dataType: 'players' as any })
    const rows = Array.isArray(players.data) ? players.data.length : 0
    console.log(`PLAYERS ${sport} rows=${rows} err=${players.error ?? 'null'}`)
  }

  for (const sport of sports) {
    const scores = await rollingInsightsProvider({ sport, dataType: 'scores' as any })
    const rows = Array.isArray(scores.data) ? scores.data.length : (scores.data ? 1 : 0)
    console.log(`SCORES ${sport} rows=${rows} err=${scores.error ?? 'null'}`)
  }
})().catch((err) => {
  console.error('SCRIPT_ERROR', err)
  process.exit(1)
})
