# World Cup Bracket — Production Readiness QA Checklist

Related references (older prompts still useful): [world-cup-bracket-final-qa.md](./world-cup-bracket-final-qa.md), [world-cup-bracket-launch-checklist.md](./world-cup-bracket-launch-checklist.md), [world-cup-live-score-providers.md](./world-cup-live-score-providers.md).

Manual verification before launch. Pair with:

- [world-cup-env-vars.md](./world-cup-env-vars.md) — environment configuration  
- [world-cup-launch-notes.md](./world-cup-launch-notes.md) — ops, crons, providers  

---

## Account & league creation

- [ ] **Create public bracket league** — `/brackets/world-cup/create`, visibility **public**; confirm league appears on **Discover** when filters match.
- [ ] **Create private bracket league** — visibility **private**; confirm it does **not** appear on Discover (or only via invite as designed).
- [ ] **Settings save** — Commissioner **Setup** tab: change scoring visibility, late join, join password, alerts; **Save** persists after refresh (`GET` settings matches UI).

---

## Discovery & join

- [ ] **Discovery page** — `/brackets/world-cup/discover`: search, filters, cards load; **Preview** and **Join** behave correctly.
- [ ] **Invite join** — Use invite code from commissioner; join creates participant + **Bracket 1**; redirect with `?guided=1` opens guided picker when appropriate.
- [ ] **Password join** — League with join password: preview requires password; correct password joins; wrong password rejected.
- [ ] **Blocked: full league** — At `maxParticipants`, join shows blocked state (toast/message).
- [ ] **Blocked: locked league** — Pool locked / no late join: join blocked with clear copy.

---

## Bracket entries (max 5)

- [ ] **Create Bracket 1** — Default entry exists after create/join; can open bracket shell.
- [ ] **Create up to 5 brackets** — Add entries until **5** (`maxEntriesPerParticipant` cap).
- [ ] **Block Bracket 6** — Sixth entry creation fails or is hidden with clear UX.

---

## Guided picker & picks

- [ ] **Guided picker opens** — From CTA, URL `guided=1`, or matchup card; modal fills viewport on mobile; **Close** works.
- [ ] **Winner selection saves** — Pick applies; toast/error handled; no duplicate saves on double-tap.
- [ ] **Next matchup advances** — After save, flows to next unpicked match (or completion).
- [ ] **Picks persist after refresh** — Hard reload; picks unchanged for active entry.
- [ ] **Switch entries without leaking picks** — Entry A vs B: picks shown match selected entry only (no cross-entry bleed).

---

## Lock & scoring

- [ ] **Bracket lock disables picks** — At effective lock: guided picker / board picks disabled; messaging clear.
- [ ] **Live score sync** — Admin or cron sync: match shows live minute/score in UI (`WORLD_CUP_LIVE_PROVIDER_CHAIN` / keys configured).
- [ ] **Final match scores picks** — Completed fixture: correct/incorrect pick state and points match rules.
- [ ] **Leaderboard recalculates** — After finals / sync: **Recalculate** (commissioner) or automatic hooks; ranks and totals sensible.

---

## Events & reminders

- [ ] **Event feed** — Pool feed shows relevant posts: lock, upset, first place, perfect round (per commissioner toggles and hooks).
- [ ] **Incomplete reminder** — Commissioner **Remind incomplete** (or cron): targets users with missing picks when configured.

---

## Bracket Brain (AF Pro)

- [ ] **AF Pro Bracket Brain works** — User with `league_ai_coaching` / AF Pro: commissioner brain actions succeed when enabled (`OPENAI_API_KEY`, model env optional).
- [ ] **Non-Pro blocked** — User without entitlement sees upgrade / blocked path; no silent failure.

---

## Mobile smoke

- [ ] **Mobile discovery/join/pick** — Narrow viewport: discover cards stack; invite panel usable; guided picker **Start/Continue Picks** visible; team targets tappable.

---

## Dev-only QA helpers (local / staging)

Requires **`NODE_ENV=development`** OR **`WORLD_CUP_DEV_QA_SECRET`** + `Authorization: Bearer <secret>`.  
Always authenticate as a real user (session cookie).

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/dev/world-cup/qa-seed` | Create a QA league, enable test/simulation flags, optionally load **Round of 32 test fixtures** (`loadWorldCupTestFixtures`). **Both methods require an authenticated user** (session); GET returns usage JSON only after QA gate + login. |
| `POST /api/dev/world-cup/simulate-final` | Resolve **final** match via simulation (`confirmSimulation: true`). Fails if final teams not yet set. |

**Already in app (commissioner/admin):**

- `POST /api/brackets/world-cup/[challengeId]/admin/load-test-fixtures` — same fixture loader as QA seed (manager auth).
- `POST /api/brackets/world-cup/[challengeId]/admin/simulate-match` — arbitrary match simulation.
- `POST /api/brackets/world-cup/[challengeId]/recalculate` — leaderboard recompute.
- `POST /api/admin/world-cup/scores/sync-live` — live sync (admin).

---

## Automated verification (CI / pre-push)

See **Final verification commands** in [world-cup-launch-notes.md](./world-cup-launch-notes.md).
