/**
 * Decision OS — Phase 5.9 Intelligence API provider selector.
 *
 * Single testable function that reads DECISION_OS_INTELLIGENCE_API_PROVIDER at call time
 * and returns the appropriate IntelligenceDataProvider singleton.
 *
 * 'real'  → realDataProvider  (Phase 5.8 behavioral pipeline)
 * (else)  → stubDataProvider  (returns null → 503 INTELLIGENCE_UNAVAILABLE)
 *
 * Route files are the only callers. Handler cores remain pure (no env reads).
 * ADR: ADR_F5_9_REAL_PROVIDER_OPT_IN.md
 */

import type { IntelligenceDataProvider } from './intelligence-handlers'
import { stubDataProvider }              from './intelligence-handlers'
import { realDataProvider }              from './real-data-provider'

export function resolveDataProvider(): IntelligenceDataProvider {
  return process.env.DECISION_OS_INTELLIGENCE_API_PROVIDER === 'real'
    ? realDataProvider
    : stubDataProvider
}
