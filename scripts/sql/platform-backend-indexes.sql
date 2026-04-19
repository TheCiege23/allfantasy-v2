-- Platform-backend supplemental indexes for replay/read-path performance
-- Covers all af_domain_events and af_job_runs access patterns.
-- Safe to run repeatedly (IF NOT EXISTS). Skips when foundation tables are absent.

-- af_domain_events (optional foundation table)
DO $$
BEGIN
  IF to_regclass('public.af_domain_events') IS NOT NULL THEN
    EXECUTE $sql$
      create index if not exists idx_af_domain_events_unpublished
        on af_domain_events(published_at)
        where published_at is null
    $sql$;
    EXECUTE $sql$
      create index if not exists idx_af_domain_events_roster_latest
        on af_domain_events(aggregate_type, event_type, aggregate_id, occurred_at desc)
    $sql$;
    EXECUTE $sql$
      create index if not exists idx_af_domain_events_roster_idempotency
        on af_domain_events(aggregate_type, event_type, aggregate_id, (payload->>'idempotencyKey'), occurred_at desc)
        where aggregate_type = 'roster' and event_type = 'RosterUpdated'
    $sql$;
  END IF;
END $$;

-- af_job_runs (optional foundation table)
DO $$
BEGIN
  IF to_regclass('public.af_job_runs') IS NOT NULL THEN
    EXECUTE $sql$
      create index if not exists idx_af_job_runs_queue_status
        on af_job_runs(queue_name, status, created_at desc)
    $sql$;
  END IF;
END $$;
