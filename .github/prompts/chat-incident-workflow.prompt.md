---
name: Chat Incident Workflow
description: "Triage and fix DMs, AF Huddle, or League chat incidents using a two-stage workflow: diagnosis first, implementation second."
argument-hint: "Describe the bug/feature, expected behavior, impact, and affected surface (DMs, AF Huddle, League chat)."
agent: "agent"
---
Run this workflow for the input below.

Input:
$ARGUMENTS

Workflow:
1. Invoke Chat Triage Agent first.
2. Produce a concise triage report with: reproduction checklist, ranked root-cause hypotheses, impact scope, and minimal fix plan.
3. If triage confidence is low, ask for only the missing evidence needed to continue.
4. Invoke Chat Systems Implementation Agent to execute the fix plan.
5. Require validation before completion:
   - Run targeted tests plus lint/typecheck.
   - Escalate to full-suite tests when risk is high or changes are broadly coupled.
6. Return a final incident summary with:
   - Root cause
   - Files changed
   - Validation results
   - Residual risks and follow-ups

Constraints:
- Prioritize minimal, safe diffs.
- Keep scope focused on chat and direct dependencies.
- Prefer Supabase realtime-first patterns for messaging delivery and presence behavior.
