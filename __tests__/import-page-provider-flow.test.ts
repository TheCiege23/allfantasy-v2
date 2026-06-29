import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'components',
    'unified-import-ui',
    'LeagueImportFlow.tsx',
  ),
  'utf8',
)

describe('import page provider flow', () => {
  it('treats import as a league-import experience instead of the old sleeper legacy flow', () => {
    expect(source).toContain('Import your league')
    expect(source).toContain('Bring your Sleeper, ESPN, Yahoo, Fantrax, or MFL league into')
    expect(source).not.toContain('useLegacySleeperImport')
    expect(source).not.toContain('Build My Legacy Profile')
  })

  it('keeps the main commissioner demo providers available as tabs', () => {
    expect(source).toContain("{ id: 'sleeper', label: 'Sleeper' }")
    expect(source).toContain("{ id: 'espn', label: 'ESPN' }")
    expect(source).toContain("{ id: 'yahoo', label: 'Yahoo' }")
    expect(source).toContain("{ id: 'fantrax', label: 'Fantrax' }")
    expect(source).toContain("{ id: 'mfl', label: 'MFL' }")
  })

  it('drives sleeper through the same preview-first provider pipeline', () => {
    expect(source).toContain('function tabToImportProvider(tab: LegacyPlatformTab): ImportProvider')
    expect(source).toContain('const panelProviders = useMemo<ImportProvider[]>')
    expect(source).toContain('onImport={runPreview}')
    expect(source).toContain('Preview league settings, rosters, draft structure, and scoring')
  })

  it('offers provider account discovery without falling back to the old legacy messaging', () => {
    expect(source).toContain('Discover leagues from account')
    expect(source).not.toContain('This page now imports Sleeper leagues by league ID.')
  })
})
