# AllFantasy Backend Architecture (Production Foundation)

## 1. System Topology
- API Layer: TypeScript Node service exposing REST endpoints by domain.
- Service Layer: domain services own all business rules.
- Data Layer: Postgres with typed ORM (Prisma in this repo, Drizzle-compatible patterns).
- Event Layer: transactional domain event outbox (`af_domain_events`) + async consumers.
- Realtime Layer: WebSocket or Supabase Realtime fanout from domain events.
- Worker Layer: queue-based workers for recalculation, notifications, AI, imports, and webhooks.
- Analytics Layer: append-only analytics events + ETL-ready tables.

## 2. Domain Modules
- identity: users, profiles, auth, subscriptions, notification prefs, wallets.
- league: league core, lifecycle state, visibility, import metadata.
- membership: league membership, invites, role scopes.
- settings: normalized settings domains + version snapshots + audits.
- team: franchises, team members, team finance/history.
- roster: templates, roster configs, roster entries, lineup locking.
- asset: players, picks, rights, external IDs, eligibility/status.
- draft: draft session, order, picks, timer, auction bids, reset logs.
- transaction: generic transaction pipeline + items + status history.
- waiver: claims, FAAB, waiver runs, priority history.
- trade: proposals, counters, votes, review windows, processing.
- scoring: scoring versions, scoring events, team/player scores, standings snapshots.
- schedule: fantasy weeks, generated matchups, playoff bracket state.
- payment: ledger, payouts, provider webhook reconciliation.
- chat: rooms, membership, messages, reactions, AI chat threads.
- notification: in-app + delivery channels + alert state.
- ai: tasks, recommendations, memory, provider logs, context snapshots.
- commissioner: commissioner actions, integrity flags, automation runs.
- import: provider imports, mappings, normalization job state.
- analytics: domain events, job runs, analytics events.

## 3. API Route Surface
- `/api/users`
- `/api/profile`
- `/api/leagues`
- `/api/leagues/:id/settings`
- `/api/leagues/:id/roster`
- `/api/leagues/:id/scoring`
- `/api/leagues/:id/draft`
- `/api/leagues/:id/schedule`
- `/api/leagues/:id/playoffs`
- `/api/leagues/:id/members`
- `/api/leagues/:id/commissioner`
- `/api/teams`
- `/api/rosters`
- `/api/lineups`
- `/api/players`
- `/api/draft`
- `/api/waivers`
- `/api/trades`
- `/api/matchups`
- `/api/standings`
- `/api/chat`
- `/api/notifications`
- `/api/ai`
- `/api/imports`
- `/api/payments`
- `/api/admin`

Controller rules:
- thin handlers only (parse input, call service, map output).
- no cross-domain direct DB writes in controllers.
- all write operations enforce membership + role + scope guard.
- mutations emit domain events and audit entries.

## 4. Service Layer Contracts
Core services:
- `leagueService`
- `settingsService`
- `rosterService`
- `scoringService`
- `draftService`
- `waiverService`
- `tradeService`
- `matchupService`
- `scheduleService`
- `playoffService`
- `paymentService`
- `notificationService`
- `aiService`
- `commissionerService`
- `importService`
- `analyticsService`

Cross-cutting utilities:
- `permissionGuard`
- `membershipResolver`
- `auditLogger`
- `eventPublisher`
- `idempotencyService`
- `transactionCoordinator`
- `entitlementService`

## 5. Event-Driven Backbone
Canonical events:
- `LeagueCreated`
- `SettingsUpdated`
- `RosterUpdated`
- `ScoringUpdated`
- `DraftStarted`
- `PickMade`
- `WaiverProcessed`
- `TradeAccepted`
- `MatchupFinalized`
- `PaymentCompleted`
- `NotificationCreated`
- `AIRecommendationSaved`
- `CommissionerActionTaken`

Outbox flow:
1. service writes domain state + outbox rows in one DB transaction.
2. publisher worker pulls unpublished outbox rows.
3. publisher forwards to queue/realtime and marks `published_at`.
4. consumers process with idempotency keys and dead-letter policy.

## 6. Realtime Strategy
Channel naming:
- `league:{leagueId}:draft`
- `league:{leagueId}:score`
- `league:{leagueId}:chat`
- `league:{leagueId}:trade`
- `league:{leagueId}:waiver`
- `user:{userId}:notifications`
- `league:{leagueId}:commissioner`

Realtime payload contract:
- `eventType`
- `aggregateType`
- `aggregateId`
- `leagueId`
- `version`
- `timestamp`
- `payload`

## 7. Permissions and Security
Guards must enforce:
- authentication required for non-public reads.
- membership required for league-private resources.
- commissioner-only for settings reset, scoring changes, draft reset, payout actions.
- trade privacy (only participants + commissioner can view private trade AI review).
- admin-only for global moderation/system routes.
- premium entitlement for subscription-gated AI automation.

Safety controls:
- row-level tenant filtering by `league_id` and membership.
- idempotency keys on payment/import/webhook/AI mutation routes.
- immutable audit for critical mutations.
- rate limits for chat, AI, and invite endpoints.
- webhook signature verification.

## 8. Versioning + Audit
Store before/after snapshots in:
- `af_settings_versions`
- `af_settings_audit_log`
- `af_commissioner_actions`

Required metadata:
- actor
- timestamp
- reason
- source endpoint
- correlation ID

## 9. Worker and Job Queues
Queue families:
- `events` (outbox publish/fanout)
- `scoring` (score ingest + recalculation + standings)
- `schedule` (matchup generation and playoff progression)
- `draft` (timers, auto-pick, auction clock)
- `waiver` (claim runs, FAAB application)
- `trade` (review windows, auto-process)
- `notifications` (email/push/sms fanout)
- `ai` (Chimmy tasks, insights, recaps)
- `imports` (provider sync)
- `payments` (ledger reconciliation + payout settlement)

Job policy:
- retries with exponential backoff.
- dead-letter queue for manual replay.
- deterministic idempotency per aggregate/job key.

## 10. AI/Chimmy Context Architecture
AI context bundle should always include:
- normalized league settings snapshot.
- roster and lineup state.
- matchup and scoring context.
- transaction and waiver/trade context.
- commissioner flags and integrity alerts.
- memory scope entries (`session`, `user`, `league`, `team`).

Store all AI actions in:
- `af_ai_tasks`
- `af_ai_recommendations`
- `af_ai_provider_logs`
- `af_ai_memory_entries`

## 11. Scalability Patterns
- Partition heavy append-only tables by month if needed (`af_domain_events`, `af_messages`, `af_player_fantasy_scores`).
- Cache read-heavy endpoints (standings, player search, league home) with short TTL + event invalidation.
- Keep services stateless; horizontal scale API/workers independently.
- Use read replicas for analytics/reporting endpoints.

## 12. Deployment Plan
Phase 1:
- apply base schema.
- stand up API + guard framework + outbox publisher.
- implement users/leagues/membership/settings baseline.

Phase 2:
- roster/draft/trade/waiver/scoring/schedule services.
- realtime fanout.
- commissioner and audit workflows.

Phase 3:
- payments + imports + AI orchestration.
- analytics pipelines and integrity automation.

Phase 4:
- load testing, failover drills, observability hardening, SLOs.
