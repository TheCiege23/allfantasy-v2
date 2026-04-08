---
name: League Workflow Orchestrator
description: "Run full create-a-league workflow execution for a selected league type + draft type: triage, implementation/tests, and migration safety review in one ordered pass."
argument-hint: "Provide league type, draft type, failing step, expected behavior, and any logs/errors or target files."
agent: "League Creation Workflow Agent"
---
Run a full create-a-league workflow pass for the target league type + draft type.

Input:
$ARGUMENTS

Execution order (required):
1. Triage phase (read-only)
- Use the same output quality as League Creation Triage Agent.
- Identify likely root causes, impact, and confidence.
- List unknowns and fastest way to de-risk them.

2. Implementation phase (fix mode)
- Apply minimal safe code changes to resolve confirmed root causes.
- Ensure form-state correctness, league creation persistence, commissioner assignment, and redirect to league homepage.
- Add or update targeted tests as needed, following existing repository patterns.

3. Migration safety phase
- Review SQL/schema edits for rollback safety, data integrity, and deploy risk.
- Call out backfill requirements and sequencing.
- Provide pre-deploy and post-deploy verification checks.

Hard requirements:
- Start with the path requested by input.
- Keep changes scoped to files required by the path.
- Follow DB-first route boundaries.
- Do not leave unresolved blockers undocumented.

Output format:
1. Target path
- League type
- Draft type
- Expected behavior

2. Triage findings
- Ranked root causes
- Impacted files/functions/tables
- Confidence + unknowns

3. Fixes applied
- Files changed
- Behavior changes
- Tests added/updated

4. Migration safety
- Risk rating
- Blocking issues
- Rollback and backfill guidance

5. Verification
- Commands run
- Results
- Remaining risks

6. Next path recommendation
- Next highest-priority league type + draft type to process
