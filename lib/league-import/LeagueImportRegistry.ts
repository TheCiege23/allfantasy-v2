import type { ImportProvider } from './types'
import type { ILeagueImportAdapter } from './adapters/ILeagueImportAdapter'
import { SleeperAdapter } from './adapters/sleeper/SleeperAdapter'
import { YahooAdapter } from './adapters/yahoo/YahooAdapter'
import { EspnStubAdapter, FantraxStubAdapter, MflStubAdapter } from './adapters/stubAdapter'
import { IMPORT_PROVIDERS } from './types'

const registry: Record<ImportProvider, ILeagueImportAdapter<unknown>> = {
  sleeper: SleeperAdapter as ILeagueImportAdapter<unknown>,
  espn: EspnStubAdapter,
  yahoo: YahooAdapter as ILeagueImportAdapter<unknown>,
  fantrax: FantraxStubAdapter,
  mfl: MflStubAdapter,
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
  return provider === 'sleeper' || provider === 'yahoo'
}
