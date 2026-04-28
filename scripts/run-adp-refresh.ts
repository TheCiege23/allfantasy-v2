import { runAdpRefreshService } from '@/lib/workers/adp-refresh-service'

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
  const result = await runAdpRefreshService({
    trigger: 'cli',
    sports,
  })

  console.log('ADP refresh complete')
  console.log(`run id: ${result.runId}`)
  console.log(`started at: ${result.startedAt}`)
  console.log(`finished at: ${result.finishedAt}`)
  console.log(`duration ms: ${result.durationMs}`)
  console.log(`sports processed: ${result.sportsProcessed.join(', ')}`)
  console.log(`raw provider rows read: ${result.rawProviderRowsRead}`)
  console.log(`raw provider rows inserted: ${result.rawProviderRowsInserted}`)
  console.log(`raw provider rows skipped as duplicates: ${result.rawProviderRowsSkippedAsDuplicates}`)
  console.log(`consensus rows written: ${result.consensusRowsInsertedOrUpdated}`)
  console.log(`single-source percentage: ${result.singleSourcePercentage}`)
  console.log(`duplicate groups: ${result.duplicateGroups}`)
  if (result.warnings.length > 0) {
    console.log(`warnings: ${result.warnings.join(' | ')}`)
  }
}

main().catch((error) => {
  console.error('[adp:refresh] failed', error)
  process.exit(1)
})
