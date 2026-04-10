---
name: League Migration Safety Review
description: "Review league-creation SQL and schema changes for rollback safety, backfill risk, data integrity, and deploy safety before merge."
argument-hint: "Provide the SQL migration file(s), affected tables, and expected data model change."
agent: "agent"
tools: [read, search]
---
Perform a migration safety review for league-creation related SQL/schema changes.

Input:
$ARGUMENTS

Requirements:
- Focus on rollback safety, data integrity, backward compatibility, and deploy sequencing.
- Check for lock risk, long-running operations, default/backfill behavior, and nullability transitions.
- Verify foreign keys, indexes, constraints, and commissioner/league ownership relationships.
- Identify whether a backfill is required and whether it should be phased.
- Flag destructive operations and provide safer alternatives.
- Include verification queries to run before and after deploy.

Output:
- Risk summary (low/medium/high)
- Blocking issues
- Non-blocking concerns
- Rollback plan recommendation
- Backfill strategy recommendation
- Pre-deploy and post-deploy verification checklist
