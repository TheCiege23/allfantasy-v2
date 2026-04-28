import { runAdpImporter } from '@/lib/workers/adp-importer'

function parseSports(argv: string[]): string[] | undefined {
  const sportsArg = argv.find((arg) => arg.startsWith('--sports='))
  if (!sportsArg) return undefined
  const value = sportsArg.slice('--sports='.length).trim()
  if (!value) return undefined
  const sports = value
    .split(',')
    .map((sport) => sport.trim())
    .filter(Boolean)
  return sports.length > 0 ? sports : undefined
}

async function main() {
  const sports = parseSports(process.argv.slice(2))
  const result = await runAdpImporter(sports ? { sports } : undefined)

  console.log('ADP importer complete')
  console.log(`sports processed: ${result.sports.join(', ')}`)
  console.log(`season/week: ${result.season}/${result.week}`)
  console.log(`provider rows read: ${result.providerRowsRead}`)
  console.log(`provider rows written: ${result.providerRowsWritten}`)
  console.log(`consensus rows attempted: ${result.consensusRowsAttempted}`)
  console.log(`consensus rows written: ${result.consensusRowsWritten}`)
  console.log(`skipped rows: ${result.skippedRows}`)
  console.log(`total rows written: ${result.imported}`)
}

main().catch((error) => {
  console.error('[adp:import] failed', error)
  process.exit(1)
})