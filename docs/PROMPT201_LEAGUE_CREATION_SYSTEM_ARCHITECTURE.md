# PROMPT 201 — AllFantasy League Creation System Architecture

## Goal

Deliver a mobile-first league creation wizard that supports:

- Sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER
- League types: Redraft, Dynasty, Keeper, Best Ball, Guillotine, Survivor, Tournament, Devy, C2C, Zombie, Salary Cap
- Draft types: Snake, Linear, Auction, Slow Draft, Mock Draft

without overwhelming users or allowing invalid sport/league/draft combinations.

---

## 10-Step Wizard Architecture

The active `LeagueCreationWizard` flow is now the required 10-step sequence:

1. Sport Selection
2. League Type
3. Draft Type
4. Team Setup
5. Scoring Rules
6. Draft Settings
7. AI Settings
8. Automation Settings
9. Privacy / Invitations
10. Review and Create

### Advanced Commissioner Defaults Without Extra Top-Level Steps

To keep UX lightweight while preserving power:

- Waiver defaults
- Playoff defaults
- Schedule defaults

are embedded under a collapsed **Advanced commissioner rules** panel inside Step 5 (Scoring Rules), instead of separate top-level steps.

---

## Deterministic Validation and Dynamic Rules

### Frontend (`LeagueCreationWizard`)

- League type options are filtered by sport (`getAllowedLeagueTypesForSport`).
- Draft type options are filtered by league type (`getAllowedDraftTypesForLeagueType`).
- Step-level validation blocks forward navigation for invalid combinations and invalid variant-specific draft settings.
- Dynamic state correction auto-falls back to valid league/draft options when sport or league type changes.

### Backend (`POST /api/league/create`)

- Accepts both snake_case and camelCase wizard keys (`league_type`/`leagueType`, `draft_type`/`draftType`).
- Normalizes and validates requested league type + draft type against canonical registries.
- Rejects invalid sport × league type and league type × draft type combinations.
- Preserves deterministic constraints for IDP, Devy, and C2C.

---

## Draft Engine Integration Notes

- `snake`, `linear`, `auction`, `slow_draft` map to live draft engine behavior.
- `mock_draft` is supported as a wizard draft type and persisted as:
  - `settings.requested_draft_type = "mock_draft"`
  - `settings.mock_draft_enabled = true`
  - `settings.mock_draft_type = "mock_draft"`
- For compatibility with live draft bootstrap defaults, persisted `settings.draft_type` uses a deterministic live fallback while preserving the original requested type.

---

## Commissioner Permissions

- League creation still requires an authenticated user.
- League owner remains the commissioner baseline.
- Commissioner-only behavior remains enforced in downstream league/draft settings APIs and draft room controls.

---

## Updated Files (Merged)

- `components/league-creation-wizard/LeagueCreationWizard.tsx`
- `lib/league-creation-wizard/types.ts`
- `lib/league-creation-wizard/league-type-registry.ts`
- `components/league-creation-wizard/DraftTypeSelector.tsx`
- `components/league-creation-wizard/LeagueTypeSelector.tsx`
- `app/api/league/create/route.ts`
- `e2e/league-creation-click-audit-unified-defaults.spec.ts`
- `e2e/league-creation-waiver-settings.spec.ts`
- `e2e/league-creation-playoff-settings.spec.ts`
- `e2e/league-creation-schedule-settings.spec.ts`

---

## QA Focus

- No dead controls in 10-step flow.
- Invalid combo prevention works in UI and API.
- Advanced commissioner defaults still persist correctly from Step 5.
- AI/automation/privacy toggles remain persisted and visible in review payload.
