import { runPlatformCoreBackfill } from '../lib/platform/backfill-core'

async function main() {
  const limit = Number(process.argv[2] || '5000')
  const result = await runPlatformCoreBackfill(limit)
  console.log(JSON.stringify({ status: 'ok', result }, null, 2))
}

main().catch((error) => {
  console.error('[backfill-platform-core] failed', error)
  process.exit(1)
})
