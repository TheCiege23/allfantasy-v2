import type { ImportProvider } from './types'
import type { ILeagueImportAdapter } from './adapters/ILeagueImportAdapter'
import { EspnAdapter } from './adapters/espn/EspnAdapter'
import { FantraxAdapter } from './adapters/fantrax/FantraxAdapter'
import { MflAdapter } from './adapters/mfl/MflAdapter'
import { SleeperLeagueImportAdapter } from './adapters/sleeper/SleeperLeagueImportAdapter'
import { YahooAdapter } from './adapters/yahoo/YahooAdapter'
import { FleaflickerAdapter } from './adapters/fleaflicker/FleaflickerAdapter'
import { IMPORT_PROVIDERS } from './types'

const registry: Record<ImportProvider, ILeagueImportAdapter<unknown>> = {
  sleeper: SleeperLeagueImportAdapter as ILeagueImportAdapter<unknown>,
  espn: EspnAdapter as ILeagueImportAdapter<unknown>,
  yahoo: YahooAdapter as ILeagueImportAdapter<unknown>,
  fantrax: FantraxAdapter as ILeagueImportAdapter<unknown>,
  mfl: MflAdapter as ILeagueImportAdapter<unknown>,
  fleaflicker: FleaflickerAdapter as ILeagueImportAdapter<unknown>,
}

export function getAdapter(provider: ImportProvider): ILeagueImportAdapter<unknown> {
  const adapter = registry[provider]
  if (!adapter) throw new Error(`No import adapter for provider: ${provider}`)
  return adapter
}

export function getSupportedProviders(): readonly ImportProvider[] {
  return IMPORT_PROVIDERS
}

export function hasFullAdapter(provider: ImportProvider): boolean {
  return provider === 'sleeper' || provider === 'yahoo' || provider === 'espn' || provider === 'mfl' || provider === 'fantrax'
}
