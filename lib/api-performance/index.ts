/**
 * API performance: caching, pagination, request deduplication, response helpers.
 */

export {
  buildApiCacheKey,
  getApiCached,
  setApiCached,
  API_CACHE_TTL,
  type ApiCacheEntry,
} from './cache'

export {
  parseCursorPageParams,
  parseOffsetPageParams,
  encodeCursor,
  decodeCursor,
  buildPageResponse,
  type CursorPageParams,
  type OffsetPageParams,
  type PageMeta,
} from './pagination'

export { dedupeInFlight, clearDedupeKey } from './dedupe'

export {
  cacheControlHeaders,
  leanObject,
  pickFields,
  type CacheControlPreset,
} from './response'
