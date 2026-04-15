-- Platform-backend supplemental indexes for replay/read-path performance
-- Covers all af_domain_events and af_job_runs access patterns.
-- Safe to run repeatedly (IF NOT EXISTS).

-- af_domain_events: unpublished event dispatch (job dispatcher read path)
create index if not exists idx_af_domain_events_unpublished
  on af_domain_events(published_at)
  where published_at is null;

-- af_domain_events: roster lineup replay - latest-per-team lookup
create index if not exists idx_af_domain_events_roster_latest
  on af_domain_events(aggregate_type, event_type, aggregate_id, occurred_at desc);

-- af_domain_events: roster lineup replay - idempotency dedup check
create index if not exists idx_af_domain_events_roster_idempotency
  on af_domain_events(aggregate_type, event_type, aggregate_id, (payload->>'idempotencyKey'), occurred_at desc)
  where aggregate_type = 'roster' and event_type = 'RosterUpdated';

-- af_job_runs: job queue status poll
create index if not exists idx_af_job_runs_queue_status
  on af_job_runs(queue_name, status, created_at desc);
