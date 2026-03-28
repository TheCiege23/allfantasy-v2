# PROMPT 156 — End-to-End Provider Integration QA

Audit and corrective fixes for the AllFantasy provider integration layer across:

- OpenAI
- DeepSeek
- xAI
- ClearSports

Checked surfaces:

- AI provider selection
- Unified brain mode / consensus mode / specialist mode
- Chimmy
- Trade Analyzer, Waiver AI, Draft Helper
- Player Comparison, Power Rankings, Trend Detection
- AI social clips
- Automated blogs
- Provider diagnostics + provider status UI
- Fallback behavior

---

## 1) Issue list by severity

### High

| ID | Issue | Impact | Files |
|---|---|---|---|
| H1 | Back-compat ClearSports barrel (`lib/clear-sports.ts`) did not re-export newer helpers (`getClearSportsToolStates`, optional ClearSports fetch helpers, health check exports). | Routes/services importing `@/lib/clear-sports` can fail to type-check or break provider-status/ClearSports enrichment paths. | `lib/clear-sports.ts`, `app/api/ai/providers/status/route.ts`, `app/api/providers/status/route.ts`, `lib/ai-orchestration/sports-context-enricher.ts` |

### Medium

| ID | Issue | Impact | Files |
|---|---|---|---|
| M1 | Provider badge freshness relied on initial load + window focus only. | Long-lived sessions can show stale provider status badges until tab focus changes. | `hooks/useProviderStatus.ts` |
| M2 | `/api/ai/providers/health` did not include ClearSports health metadata. | Incomplete health visibility for provider QA parity across four providers. | `app/api/ai/providers/health/route.ts` |

### Low

No new low-severity defects found in this QA pass.

---

## 2) File-by-file fix plan (applied)

| File | Fix applied |
|---|---|
| `lib/clear-sports.ts` | Expanded re-exports to include ClearSports tool-state helper, optional data helpers (`rankings/projections/trends/news`), and health-check exports/types. |
| `hooks/useProviderStatus.ts` | Added online-event refetch + visible-tab interval refresh (`60s`) to prevent stale provider badges. |
| `app/api/ai/providers/health/route.ts` | Added ClearSports health payload (`configured`, `healthy`, `latencyMs`, sanitized `error`) alongside AI provider health entries. |

---

## 3) Full merged code fixes

### `lib/clear-sports.ts`

```ts
/**
 * ClearSports integration — re-export from lib/clear-sports for backward compatibility.
 * PROMPT 153: client (rate limit, retry, timeout), normalizer, types live in lib/clear-sports/.
 */

export {
  fetchClearSportsTeams,
  fetchClearSportsPlayers,
  fetchClearSportsGames,
  fetchClearSportsRankings,
  fetchClearSportsProjections,
  fetchClearSportsTrends,
  fetchClearSportsNews,
  normalizeClearSportsTeams,
  normalizeClearSportsPlayers,
  normalizeClearSportsGames,
  getClearSportsToolStates,
  runClearSportsHealthCheck,
  type ClearSportsSport,
  type ClearSportsTeam,
  type ClearSportsPlayer,
  type ClearSportsGame,
  type ClearSportsHealthCheckResult,
  type NormalizedTeam,
  type NormalizedPlayer,
  type NormalizedGame,
  type SupportedClearSportsSport,
  type ClearSportsConsumerTool,
  type ClearSportsToolState,
  type ClearSportsToolStateMap,
} from './clear-sports/index'
```

### `hooks/useProviderStatus.ts`

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'

export type ProviderStatus = {
  openai: boolean
  deepseek: boolean
  grok: boolean
  openclaw: boolean
  openclawGrowth: boolean
}

export function useProviderStatus(): {
  status: ProviderStatus | null
  loading: boolean
  error: boolean
  refetch: () => void
  availableCount: number
} {
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai/providers/status', { credentials: 'include' })
      if (!res.ok) {
        setError(true)
        setStatus(null)
        return
      }
      const data = await res.json()
      setStatus({
        openai: !!data.openai,
        deepseek: !!data.deepseek,
        grok: !!data.grok,
        openclaw: !!data.openclaw,
        openclawGrowth: !!data.openclawGrowth,
      })
    } catch {
      setError(true)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    const onFocus = () => { fetchStatus() }
    const onOnline = () => { fetchStatus() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
  }, [fetchStatus])

  useEffect(() => {
    const intervalMs = 60_000
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatus()
      }
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [fetchStatus])

  const availableCount = status
    ? [status.openai, status.deepseek, status.grok, status.openclaw, status.openclawGrowth].filter(Boolean).length
    : 0

  return { status, loading, error, refetch: fetchStatus, availableCount }
}
```

### `app/api/ai/providers/health/route.ts`

```ts
/**
 * GET /api/ai/providers/health — active provider health checks (no secrets).
 * Uses provider registry checks with timeout and returns safe status for admin diagnostics.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProviderHealth } from '@/lib/ai-orchestration'
import { getProviderStatus } from '@/lib/provider-config'
import { runClearSportsHealthCheck } from '@/lib/clear-sports/client'
import { sanitizeProviderError } from '@/lib/ai-orchestration/provider-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [providers, clearSportsHealth] = await Promise.all([
    checkProviderHealth(),
    runClearSportsHealthCheck(),
  ])
  const status = getProviderStatus()
  const clearSportsConfigured = status.clearsports || clearSportsHealth.configured
  const clearSports = {
    provider: 'clearsports',
    configured: clearSportsConfigured,
    healthy: clearSportsConfigured ? clearSportsHealth.available : false,
    checkedAt: clearSportsHealth.checkedAt,
    latencyMs: clearSportsHealth.latencyMs,
    error: clearSportsHealth.error ? sanitizeProviderError(clearSportsHealth.error) : undefined,
  }
  const anyHealthy =
    Object.values(providers).some((provider) => provider.healthy) ||
    Boolean(clearSports.healthy)
  return NextResponse.json({
    ok: anyHealthy,
    providers,
    clearSports,
    checkedAt: new Date().toISOString(),
  })
}
```

---

## 4) Final QA checklist

- [ ] Env variables load correctly for OpenAI/DeepSeek/xAI/ClearSports.
- [ ] No API response leaks raw secrets or stack traces.
- [ ] Provider status routes return safe metadata and expected availability states.
- [ ] Provider health checks include all required providers (including ClearSports).
- [ ] Individual provider calls succeed when configured.
- [ ] Fallback routing occurs without user-facing crashes.
- [ ] Malformed provider responses become safe failures (`invalid_response` / sanitized errors).
- [ ] ClearSports normalization provides stable team/player/game structures.
- [ ] Deterministic evidence and uncertainty fields update correctly in responses.
- [ ] Mobile flows (run/compare/retry/provider badges) function correctly.
- [ ] Desktop flows (run/compare/retry/provider badges) function correctly.
- [ ] No dead provider buttons in selector, compare actions, or diagnostics.
- [ ] Compare-provider actions remain functional for supported tools.
- [ ] Provider badges refresh and do not remain stale in long sessions.
- [ ] Retry flows work for provider status and AI request paths.

---

## 5) Manual testing checklist

### Provider selection + status UI
- [ ] Open Unified AI Workbench and confirm provider status row renders.
- [ ] Verify loading state appears then providers resolve.
- [ ] Simulate auth failure and confirm retry controls still work.
- [ ] Stay on page > 60s and verify status refreshes without tab switch.

### Unified brain / consensus / specialist
- [ ] Run each mode and verify response with provider metadata.
- [ ] Force one provider unavailable and confirm fallback response remains usable.
- [ ] Trigger compare action and verify multi-provider output appears.

### Chimmy
- [ ] Send message and verify response + provider indicator behavior.
- [ ] Verify retry behavior on temporary request/provider errors.

### Trade Analyzer / Waiver AI / Draft Helper / Player Comparison
- [ ] Run each with deterministic context and confirm evidence/uncertainty fields.
- [ ] Verify no broken run/compare buttons.

### Power rankings / trend detection
- [ ] Run each tool and confirm provider fallback behavior under degraded env.

### AI social clips / automated blogs
- [ ] Generate output with all providers available.
- [ ] Disable one provider and verify graceful fallback with no secret leakage.

### Provider diagnostics
- [ ] As admin, open `/admin?tab=providers` and verify refresh/expand/collapse.
- [ ] Verify fallback and failure summaries render.
- [ ] Verify non-admin receives 401 for admin diagnostics routes.

### ClearSports normalization
- [ ] Verify team/player/game data shape in routes using sports context enrichment.
- [ ] Verify missing data sets uncertainty/caveat signals rather than inventing facts.

---

## 6) Automated test recommendations

Framework signals in repo indicate **Vitest** + **Playwright** usage.

### Unit (Vitest)
- Add `lib/clear-sports.ts` barrel export contract test to assert required symbols are exported.
- Add `useProviderStatus` hook test for:
  - focus refetch
  - online refetch
  - interval refetch when document is visible
- Add `/api/ai/providers/health` route test asserting `clearSports` shape and sanitized error behavior.

### Integration/API
- `GET /api/ai/providers/status` returns expected booleans and no secrets.
- `GET /api/ai/providers/health` includes OpenAI/DeepSeek/Grok + ClearSports metadata.
- `POST /api/ai/run` and `POST /api/ai/compare`:
  - success path
  - provider unavailable path
  - malformed provider response path

### E2E (Playwright)
- Unified AI Workbench: run, compare, regenerate, retry, provider badges.
- Chimmy shell: send message, retry flow, provider indicator.
- Admin diagnostics: refresh, expand/collapse, failure/fallback summaries, 401 for non-admin.

---

## 7) Validation notes for this pass

- `ReadLints` on modified files: no new lint errors.
- Existing repository-wide type issues remain outside this scope; fixed items in this prompt are localized to provider integration and status/health surfaces.
