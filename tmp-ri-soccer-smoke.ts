import * as dotenv from 'dotenv'
import { rollingInsightsProvider } from './lib/workers/providers/rolling-insights'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

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

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms)
    p.then((v) => {
      clearTimeout(id)
      resolve(v)
    }).catch((e) => {
      clearTimeout(id)
      reject(e)
    })
  })
}

async function main() {
  try {
    const res = await withTimeout(rollingInsightsProvider({ sport: 'soccer_euro', dataType: 'players' }), 30000)
    const rows = countRows(res.data)
    const status = res.error ? `ERR ${res.error}` : 'OK'
    console.log(`soccer_euro/players: ${status}${rows ? ` | rows ${rows}` : ''}`)
  } catch (e) {
    console.log(`soccer_euro/players: EXCEPTION ${e instanceof Error ? e.message : String(e)}`)
  }
}

main().catch((e) => {
  console.error('soccer smoke failed:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
