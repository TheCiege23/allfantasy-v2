const fs = require('fs')
const path = require('path')

function load(file) {
  const p = path.resolve(process.cwd(), file)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}

load('.env.local')
load('.env')
const token = (process.env.ROLLING_INSIGHTS_RSC_TOKEN || '').trim()
if (!token) {
  console.log('NO_RSC')
  process.exit(0)
}

const urls = [
  'https://rest.datafeeds.rolling-insights.com/api/v1/players/NFL',
  'http://rest.datafeeds.rolling-insights.com/api/v1/players/NFL',
  'https://rest.datafeeds.rolling-insights.com/api/v1/NFL/players',
  'http://rest.datafeeds.rolling-insights.com/api/v1/NFL/players',
  'https://datafeeds.rolling-insights.com/nfl/players',
  'https://datafeeds.rolling-insights.com/api/v1/players/NFL',
  'https://datafeeds.rolling-insights.com/graphql',
]

;(async () => {
  for (const u of urls) {
    if (u.endsWith('/graphql')) {
      const r = await fetch(u, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query: '{ nflRoster { id player } }' }),
      })
      console.log('GQL', u, r.status)
      continue
    }

    for (const qp of ['RSC_token', 'rsc_token']) {
      const url = new URL(u)
      url.searchParams.set(qp, token)
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      console.log(qp, u, r.status)
    }
  }
})().catch((e) => {
  console.error(String(e))
  process.exit(1)
})
