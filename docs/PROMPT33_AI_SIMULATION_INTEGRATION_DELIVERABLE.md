# Prompt 33 - Simulation + AI Integration Layer + Full UI Click Audit

## 1) AI Simulation Integration Architecture

The integration now runs a two-layer context pipeline before AI responses:

- **Global context**: user leagues, simulation snapshots, warehouse summaries, dynasty projections.
- **Targeted context**: route-specific insight context (`matchup`, `playoff`, `dynasty`, `trade`, `waiver`, `draft`) resolved from `leagueId` + optional `teamId/sport/season/week`.

Request flow for chat-based AI actions:

1. UI click builds chat URL with context query params (`leagueId`, `insightType`, etc.).
2. `af-legacy` chat tab passes these into `ChimmyChatShell`.
3. `ChimmyChatShell` sends the context fields to `POST /api/chat/chimmy`.
4. `getInsightBundle()` and simulation/warehouse services build a sport-aware context block.
5. Provider stack executes with explicit role separation:
   - DeepSeek -> quantitative modeling
   - Grok -> trend/meta narrative
   - OpenAI -> final user-facing strategy explanation

## 2) Backend Services for AI Queries

`lib/ai-simulation-integration` was upgraded and normalized to sport-scope:

- `SportAIContextResolver` now uses `lib/sport-scope` (`SUPPORTED_SPORTS`, `DEFAULT_SPORT`, normalization).
- `AISimulationQueryService` now enriches league context with:
  - simulation summaries
  - warehouse summaries
  - dynasty projection summaries
  - league intelligence graph summary
  - global meta summary
  - league settings/scoring/format summary
- `AIInsightRouter` now returns an `AIInsightBundle` (context text + source list + provider responsibilities).

Routes integrated with insight bundles:

- `app/api/chat/chimmy/route.ts`
- `app/api/leagues/[leagueId]/forecast-summary/route.ts`
- `app/api/ai/trade-eval/route.ts`
- `app/api/ai/waiver/route.ts`
- `app/api/mock-draft/ai-pick/route.ts`

## 3) UI Integration Points

Context-aware AI handoff was added across simulation and workflow surfaces:

- `MatchupSimulationCard` -> Explain matchup link now includes `insightType=matchup` and league context.
- `MatchupSimulationPage` -> Ask Chimmy link now includes matchup context fields.
- `LeagueForecastDashboard` -> Ask Chimmy playoff link now includes `leagueId`, `insightType=playoff`, `season`, `week`.
- `TeamForecastCard` -> new **Explain playoff odds** link per card with team-scoped context.
- `WaiverWirePage` -> Get AI waiver help now carries `leagueId` + `insightType=waiver`.
- `DraftHelperPanel` -> Ask Chimmy about this pick now carries `leagueId` + `insightType=draft`.
- Trade chat links now pass `insightType=trade` (and league id when available).
- `af-legacy` chat deep-link handling now hydrates `chatLeagueId` from URL and passes full context into `ChimmyChatTab`/`ChimmyChatShell`.

## 4) Full UI Click Audit Findings

Detailed matrix is in:

- `docs/PROMPT33_CLICK_AUDIT_MATRIX.md`

Coverage includes:

- AI launch buttons
- Explain matchup actions
- playoff odds cards and per-team explain links
- dynasty/future-outlook AI paths
- trade/waiver/draft AI handoffs
- modal open/close and regenerate actions
- sport selectors, refresh, back navigation
- loading/error/retry states

Audit result:

- No dead AI/simulation click paths found in audited scope.
- Key stale-context issue fixed by passing explicit context fields into chat requests.

## 5) QA Findings

- AI now receives richer, league-scoped simulation/warehouse context for targeted clicks.
- Playoff and matchup AI links now resolve to insight-aware chat context (not prompt-only).
- Forecast summary route now receives simulation/warehouse context via insight bundle.
- Trade and waiver AI routes now inject simulation/warehouse context when league id is available.
- Draft AI recommendation route now includes draft insight context when league id is supplied.
- Supported sports remain: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.

## 6) Issues Fixed

1. **Prompt-only AI launches without league scoping**
   - Fixed by adding context query params and shell-to-route form data wiring.

2. **Playoff odds cards lacked direct AI drill-down**
   - Fixed by adding `Explain playoff odds` on each `TeamForecastCard`.

3. **Chimmy route lacked targeted insight routing**
   - Fixed by integrating `getInsightBundle()` into `/api/chat/chimmy`.

4. **Some AI routes did not consume simulation/warehouse insight context**
   - Fixed in trade-eval, waiver, forecast-summary, and draft ai-pick routes.

## 7) Final QA Checklist

- [ ] Matchup: run simulation, click explain, verify chat URL contains `insightType=matchup`.
- [ ] Forecast: run simulation, click playoff AI link, verify `leagueId/insightType=playoff`.
- [ ] Forecast cards: click per-team explain link, verify `teamId` included.
- [ ] Waiver: click Get AI waiver help, verify `leagueId/insightType=waiver`.
- [ ] Draft helper: click Ask Chimmy about this pick, verify `leagueId/insightType=draft`.
- [ ] Trade analyzer: click Discuss in AI Chat, verify `insightType=trade`.
- [ ] Chimmy chat request payload includes context fields and route returns insight-aware metadata.
- [ ] Regression: existing simulation and dynasty click-audit specs continue passing.

## 8) Explanation of the AI Simulation Integration

This implementation turns AI recommendations into a context-routed workflow instead of a generic prompt workflow.

- Buttons now carry structured context.
- Backend resolves sport-aware simulation + warehouse + graph + meta signals.
- Provider responsibilities are explicit and preserved:
  - DeepSeek for quant outputs,
  - Grok for trend framing,
  - OpenAI for final recommendations and next actions.

Result: matchup predictions, playoff odds, dynasty outlook, trade/waiver/draft guidance, and related AI actions are now aligned to the correct league context end-to-end.
