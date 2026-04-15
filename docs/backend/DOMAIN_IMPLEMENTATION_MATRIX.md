# AllFantasy Backend Domain Implementation Matrix

## Coverage Matrix

| Domain | Primary Tables | API Group | Service | Core Events | Worker Queues | Realtime Channels |
|---|---|---|---|---|---|---|
| Users/Auth/Profile | `af_users`, `af_user_profiles`, `af_user_preferences`, `af_user_subscriptions`, `af_user_wallets` | `/api/users`, `/api/profile` | `identityService` | `UserCreated`, `UserProfileUpdated`, `SubscriptionUpdated` | `notifications`, `payments` | `user:{userId}:notifications` |
| Leagues | `af_leagues`, `af_league_meta` | `/api/leagues` | `leagueService` | `LeagueCreated`, `LeagueStateChanged` | `events` | `league:{leagueId}` |
| Teams/Franchises | `af_teams`, `af_team_members` | `/api/teams` | `teamService` | `TeamCreated`, `TeamOwnershipChanged` | `events` | `league:{leagueId}` |
| Membership | `af_league_members`, `af_membership_invites` | `/api/leagues/:id/members` | `membershipService` | `MemberInvited`, `MemberRoleChanged` | `notifications` | `league:{leagueId}` |
| Settings | `af_league_settings_*`, `af_settings_versions`, `af_settings_audit_log` | `/api/leagues/:id/settings` | `settingsService` | `SettingsUpdated` | `events`, `schedule`, `scoring` | `league:{leagueId}:settings` |
| Rosters/Lineups | `af_league_roster_configs`, `af_team_rosters`, `af_roster_entries`, `af_lineup_entries` | `/api/rosters`, `/api/lineups` | `rosterService` | `RosterUpdated`, `LineupSubmitted` | `scoring`, `notifications` | `league:{leagueId}:roster` |
| Players/Assets | `af_players`, `af_player_external_ids`, `af_assets` | `/api/players` | `assetService` | `PlayerUpdated`, `AssetCreated` | `imports` | `league:{leagueId}` |
| Draft | `af_drafts`, `af_draft_orders`, `af_draft_picks`, `af_auction_bids` | `/api/leagues/:id/draft`, `/api/draft` | `draftService` | `DraftStarted`, `PickMade`, `DraftPaused`, `DraftCompleted` | `draft`, `notifications`, `events` | `league:{leagueId}:draft` |
| Transactions | `af_transactions`, `af_transaction_items` | `/api/transactions` | `transactionService` | `TransactionCreated`, `TransactionProcessed` | `events` | `league:{leagueId}` |
| Waivers/FAAB | `af_waiver_settings`, `af_waiver_claims`, `af_faab_ledger` | `/api/waivers` | `waiverService` | `WaiverClaimSubmitted`, `WaiverProcessed`, `FaabAdjusted` | `waiver`, `notifications` | `league:{leagueId}:waiver` |
| Trades | `af_trades`, `af_trade_items`, `af_trade_votes` | `/api/trades` | `tradeService` | `TradeProposed`, `TradeCountered`, `TradeAccepted`, `TradeVetoed` | `trade`, `notifications`, `events` | `league:{leagueId}:trade` |
| Scoring/Matchups/Standings | `af_matchups`, `af_player_fantasy_scores`, `af_standings_snapshots` | `/api/matchups`, `/api/standings`, `/api/leagues/:id/scoring` | `scoringService`, `matchupService` | `ScoringUpdated`, `MatchupFinalized`, `StandingsUpdated` | `scoring`, `events` | `league:{leagueId}:score` |
| Schedule/Playoffs | `af_schedule_templates`, `af_playoff_configs`, `af_playoff_brackets` | `/api/leagues/:id/schedule`, `/api/leagues/:id/playoffs` | `scheduleService`, `playoffService` | `ScheduleGenerated`, `PlayoffBracketUpdated` | `schedule`, `events` | `league:{leagueId}:schedule` |
| Payments/Payouts | `af_ledger_entries`, `af_payout_requests` | `/api/payments` | `paymentService` | `PaymentCompleted`, `PayoutRequested`, `PayoutSettled` | `payments`, `notifications` | `user:{userId}:notifications` |
| Chat/Messaging | `af_chat_rooms`, `af_chat_room_members`, `af_messages` | `/api/chat` | `chatService` | `MessageCreated`, `MessageEdited`, `RoomMembershipChanged` | `notifications`, `events` | `league:{leagueId}:chat` |
| Notifications/Alerts | `af_notifications`, `af_notification_deliveries` | `/api/notifications` | `notificationService` | `NotificationCreated`, `NotificationDelivered` | `notifications` | `user:{userId}:notifications` |
| AI/Chimmy | `af_ai_tasks`, `af_ai_recommendations`, `af_ai_memory_entries`, `af_ai_provider_logs` | `/api/ai` | `aiService` | `AITaskQueued`, `AIRecommendationSaved` | `ai`, `notifications`, `events` | `league:{leagueId}:ai`, `user:{userId}:notifications` |
| Commissioner/Integrity | `af_commissioner_actions`, `af_integrity_flags` | `/api/leagues/:id/commissioner` | `commissionerService` | `CommissionerActionTaken`, `IntegrityFlagRaised` | `events`, `notifications`, `ai` | `league:{leagueId}:commissioner` |
| Imports/External Sync | `af_import_jobs`, `af_external_sync_logs` | `/api/imports` | `importService` | `ImportQueued`, `ImportCompleted` | `imports`, `events` | `user:{userId}:notifications` |
| Analytics/Events/Jobs | `af_domain_events`, `af_job_runs`, `af_webhook_events` | `/api/admin`, `/api/analytics` | `analyticsService` | all domain events | all queues | N/A |

## Permission Rules Snapshot
- Admin: global moderation, platform settings, system backfills.
- Commissioner: league settings/scoring/schedule/playoffs/draft resets/commissioner actions.
- Co-owner: delegated team management.
- Member: lineup, waiver, trade, chat, league-private reads.
- Viewer: read-only league resources where allowed.

## Non-Negotiable Write Path Rules
- Every mutation route executes guard checks first.
- Every critical mutation writes audit record and emits domain event.
- Every event fanout is idempotent and correlation-ID tagged.
- Every async processor writes `af_job_runs` records.

## Suggested Next Execution Order
1. Implement `identity`, `league`, `membership`, `settings` services and endpoints.
2. Add outbox publisher using `af_domain_events` and queue workers.
3. Implement `roster`, `draft`, `waiver`, `trade`, `scoring`, `schedule` domains.
4. Add chat/realtime, then AI orchestration and commissioner automation.
5. Integrate payments and imports with webhook reconciliation.
