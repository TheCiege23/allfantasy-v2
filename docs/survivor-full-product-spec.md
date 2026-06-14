# Survivor Full Product Spec

Updated: 2026-06-14

## Product Goal

Build a complete Survivor fantasy league format with tribes, challenges, private
strategy, Tribal Council, hidden idols and powers, Exile Island, jury, finalist
speeches, final jury vote, and TV-style reveals. The format must feel social and
dramatic while remaining deterministic, private where required, and auditable.

The product promise is:

- Outwit: private strategy, alliances, deception inside conduct rules.
- Outplay: weekly fantasy and prediction challenges.
- Outlast: eliminations, Exile return paths, jury management, and final vote.

## Non-Negotiable Guardrails

- Do not fake gameplay state.
- Do not expose private votes, idols, private DMs, or AI-only game secrets.
- Participating commissioners and co-commissioners are players and must be blind to
  hidden mechanics.
- Non-participating commissioners can manage operations but still cannot read private
  user-to-user DMs unless they are a member of that DM.
- AI can assist, narrate, parse, and host, but deterministic engines decide official
  outcomes.
- Sports prediction challenges are in-game fantasy challenges only, never real-money
  gambling or wagering.
- All sensitive state changes require audit logs.
- New APIs must stay inside consolidated Survivor route dispatchers.

## Supported Setup

Initial sports:

- NFL
- NCAAF

Default league setup:

| Setting | Default | Allowed / notes |
| --- | --- | --- |
| Team count | 20 | Range 16-20 unless an existing canonical rule explicitly allows more. |
| Tribe count | 4 | Default 4 tribes of 5 at 20 players. |
| Draft timing | Before tribe assignment | Manual pre-draft tribes allowed only when selected. |
| Draft types | snake, auction, linear, real-time, by-team | Include any existing canonical IDs the app already supports. |
| Tribe assignment | random | Also commissioner manual and draft-pattern based. |
| Tribe names | AI-generated unique names | Commissioner editable; preserve old names/logos on reshuffle if configured. |
| Tribe logos | Generated image where available | Generated badge/icon fallback. |
| Merge trigger | active-player count or week | Default from settings. |
| Jury threshold | 60 percent original active players remaining | Users eliminated after threshold become jurors; earlier eliminated users do not. |
| Idol expiry | valid until 5 players left | Invalid at 4 players unless idol type overrides. |
| Tribal cadence | weekly | Configurable vote open/close/reveal windows. |
| Late votes | disabled by default | If accepted late by setting, reveal label is "Does Not Count" when invalid. |
| Elimination outcome | configurable | Remove from league and waivers, or send to Exile Island. |
| Sit-outs | enabled for uneven tribes | No user can sit two consecutive weeks. |
| Commissioner participation | non-participating by default | Participating mode enforces blind host mechanics. |
| Co-commissioners | disabled by default | If enabled, same privacy restrictions as commissioner. |

## Core Data Domains

| Domain | Canonical responsibility |
| --- | --- |
| League config | Stores all settings, defaults, feature flags, schedule rules, and privacy mode. |
| Players/cast | Tracks active, eliminated, exiled, returned, finalist, and winner states. |
| Tribes | Tracks tribe identity, logos, membership, swaps, sit-outs, merge, and archives. |
| Challenges | Stores challenge definition, submissions, lock state, results, rewards, penalties. |
| Tribal council | Stores vote window, eligible voters/targets, ballots, late/invalid vote labels, reveal payload, elimination. |
| Idols/powers | Stores hidden and public advantage inventory, ownership, expiry, transfer, play, resolution, and ledger. |
| Chats | Stores main, tribe, alliance, private host/AI, exile, jury, finale, and archived channels. |
| Mentions/commands | Stores parsed official commands, pending confirmations, executed actions, and audit metadata. |
| Notifications | Stores in-app events and bridge metadata for push/email where supported. |
| Exile | Stores exile league state, weekly waiver claims, lineups, tokens, boss reset, and return criteria. |
| Jury/finale | Stores jury membership, finalist speeches, Q&A, final ballots, reveal, and Sole Survivor. |
| AI host | Stores safe host messages, prompts/outputs where policy allows, and never leaks secrets. |

## Role and Privacy Matrix

| State | Active player | Eliminated pre-jury | Exile player | Jury member | Finalist | Participating commissioner | Non-participating commissioner | AI/host engine |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Own roster/idols | yes | own historical only | exile state | jury state | yes | own only | operational if allowed | minimum needed |
| Other hidden idols | no | no | no | no | no | no | yes if not playing and setting allows | yes, redacted in output |
| Private votes before reveal | own only | no | no | no | own only if eligible | own only | operational if not playing and setting allows | yes, redacted in output |
| Tribe chat | current tribe | no | no | no | if active | current tribe only | no unless member/host view | membership-gated |
| Alliance/side chats | member only | removed if eliminated unless allowed | no active-player DMs | no active-player DMs unless finale allows | member only | member only | no unless recipient | redacted by channel |
| Exile chat | no | if assigned | yes | no unless configured | no | if exiled only | operational if not private | exile-scoped |
| Jury chat | no | no | no | yes | no until Q&A rules allow | if juror only | operational if configured | jury-scoped |
| Commissioner dashboard | no | no | no | no | no | blind/redacted | full operations, no private DMs | n/a |

## Lifecycle

### 1. League Creation

The league create flow must persist all Survivor settings, initialize a Survivor config,
and clearly label any feature that is disabled or provider-limited. Settings are editable
before lock/start. Dangerous edits after start require explicit confirmation and an audit
entry.

Creation must not start hidden mechanics until the league is locked and draft state is
valid.

### 2. Draft Completion and Tribe Formation

When a real draft completes:

- Create or update `SurvivorPlayer` rows for every team.
- Assign tribes according to selected mode.
- Create main league chat.
- Create tribe chats with exact active members.
- Create private Chimmy/commissioner DM channels per user.
- Post official AI intro/rules if enabled.
- Lazy-load intro/draft videos with image fallback.
- Seed hidden idols/powers.
- Write audit logs for every automatic setup action.

Mock drafts must never trigger tribes, idols, challenges, votes, exile, tokens, or jury.

### 3. Idol and Power Inventory

Requested initial idol seeding:

- Vote Shield Idol count = total drafted roster spots across Survivor rosters.
- Additional hidden idol count = tribe count.
- Multiple idols per user are allowed after random assignment, trades, or rewards.

If "roster spot" is later clarified to mean manager/team slot rather than drafted-player
slot, change the seed formula before migration; until then, the literal requested rule is
the product target.

Power types required for first shippable build:

- Vote Shield Idol: votes against holder do not count for that Tribal.
- Extra Vote: holder casts one additional valid ballot.
- Skip Tribal: holder is safe; vote loss is configurable.
- Auto Waiver Pickup: holder gets an eligible player immediately after validation.
- Triple Steal: holder steals one eligible player from each of three separate teams.

Power types required in the full catalog:

- Single Steal
- FAAB Boost
- Score Boost
- Score Shield / negative rival points if enabled
- Tribe Advantage
- Individual Advantage
- Challenge Tiebreaker Edge
- Idol Nullifier / Idol Blocker
- Reveal Idol Holder if enabled
- Tribe Swap / player swap
- Convert unused idol to FAAB/points if enabled

Every power has owner, source, expiry, visibility, target rules, timing window, one-time
use state, audit rows, and notifications.

### 4. Weekly Challenges

Challenge types:

- Pick winner
- Over/under
- Combined total score
- Point spread / against the spread
- Anytime TD
- First TD
- More/Less player props
- Highest scoring QB/RB/WR/TE/K
- FanDuel-style captain lineup
- Puzzle/video clue challenge
- Survivor pool pick'em
- Token pool pick'em
- Auction/bidding for advantages
- Tribe total scoring
- Individual total scoring
- Weekly over/under and against-spread challenge
- Pick winner plus combined points plus point spread

Challenge flow:

1. Commissioner or AI creates challenge.
2. System validates sport, week, eligible players/teams, lock time, reward, penalty.
3. Users submit through UI, tribe chat, or private DM depending settings.
4. First submission locks when configured; no edits after lock.
5. Provider results are used when available.
6. Commissioner confirmation is required when provider data is unavailable or ambiguous.
7. Rewards and penalties apply through engines, never manual UI-only state.
8. Results post to correct chats and notifications.

### 5. Tribal Council

Pre-merge, the losing tribe goes to Tribal. Post-merge, all remaining players vote unless
immune, protected, exiled, or otherwise ineligible.

Vote rules:

- Votes are private and submitted only in private Chimmy/commissioner DM or vote UI.
- Votes in public league or tribe chat are rejected.
- Self-votes are disallowed by default.
- Default first valid vote locks unless vote changes are enabled.
- Extra Vote creates an additional ballot.
- Vote Shield disqualifies votes against holder.
- Skip Tribal and immunity protect holder from valid votes.
- Late invalid votes reveal as "Does Not Count".
- Ties follow configured revote/rocks/fire-making/score/manual path.

Reveal rules:

- AI posts Survivor-style reveal at scheduled reveal time.
- Scroll/parchment UI reveals votes one by one from a real reveal payload.
- Invalid votes show "Does Not Count" or configured idol-blocked label.
- Final tally is shown only after reveal sequence completes.
- Eliminated player state, roster movement, chat membership, Exile/Jury routing, audit
  logs, and notifications update in one transaction or compensating action sequence.

### 6. Sit-Outs and Merge

If tribes are uneven and sit-outs are enabled:

- Larger tribes must sit enough users to equalize scoring.
- Tribe vote, commissioner, or AI assignment depends on settings.
- No user can sit out two consecutive weeks.
- Sit-out users do not score for the tribe that week.
- Sit-outs are durable and auditable.

Merge:

- Trigger by configured week or active-player count.
- Archive/lock tribe chats.
- Create merge tribe/channel if configured.
- Switch challenges and votes to individual mode.
- Apply merge-era idol expiry.
- Post public merge announcement.

### 7. Exile Island

Exile is a separate subgame for voted-out users when configured.

Rules:

- Starting Week 2, new voted-out users can join Exile.
- Exile users compete weekly against other Exile users.
- Weekly Exile roster starts empty.
- Users make waiver claims.
- Default lineup is QB, RB, WR, TE.
- No defense and no flex/superflex by default.
- If QB/team stack is enabled, the user who claims a QB receives that QB's team stack.
- Highest-scoring claimed lineup earns token/win.
- AI or commissioner may set a Boss lineup.
- If Boss wins, every Exile user's tokens reset to 0.
- Random weekly challenges can award extra tokens.
- When main island reaches 3 users, Exile token leader returns.
- If everyone has 0 tokens, most weekly wins returns.

Privacy:

- Exile users cannot see main-island strategy.
- Main island cannot see Exile strategy.
- Exile chat includes only exiled users, AI/host, and configured spectators.

### 8. Jury and Finale

Jury begins when the active game reaches the configured threshold, default 60 percent of
original active users remaining. Only users eliminated after that point become jurors.

Finale flow:

1. Finalists are locked.
2. Finalist speech window opens.
3. Jury Q&A/comments window opens.
4. Final jury vote opens.
5. Jurors vote privately for a finalist.
6. AI records final votes through deterministic command/action engine.
7. TV-style reveal posts to league/finale chat.
8. Sole Survivor is declared.
9. Reunion chat opens if enabled.

Winner is decided by jury vote, not final fantasy score.

## Communications Spec

Required channels:

- Main league chat
- Tribe chats pre-merge
- Archived tribe chats at merge
- Side/alliance/private chats when enabled
- Private Chimmy/commissioner DM per user
- Exile Island chat
- Jury chat
- Finalist/jury Q&A or finale channel

Mention routing:

- `@chimmy` routes to AI.
- `@Commissioner_username` routes to commissioner.
- `@chimmy` plus `@Commissioner_username` in private context creates or routes to a
  combined private DM with user, commissioner/host, and AI.
- Vote and power commands require private channel or dedicated UI.
- Natural-language commands are allowed, but destructive actions require confirmation.

Examples:

- `@chimmy I vote out Mike`
- `@Commissioner I vote Mike`
- `@chimmy play my idol tonight`
- `@chimmy use triple steal`
- `@chimmy submit our tribe pick: Over 45.5, Lions, Amon-Ra anytime TD`

## Notifications Spec

Notify at minimum:

- user on vote received
- user on idol/power played or resolved
- league when public idol/power resolves
- affected teams when players are stolen or moved
- commissioner/AI on official actions
- tribe chat on challenge deadlines/results
- league chat on Tribal reveal
- users removed from chats after elimination
- jury when finals begin
- mention recipients for `@user`, `@chimmy`, commissioner

Delivery starts with in-app Survivor notifications and should bridge to shared push/email
preferences where existing infrastructure supports it.

## AI / Chimmy Spec

AI voice:

- Survivor TV-style, dramatic but clear.
- Can say "Outwit. Outplay. Outlast."
- Can encourage bluffing and social strategy inside rules.
- Must never encourage harassment, hate, explicit abuse, cheating, hacking, or platform
  abuse.

AI may handle:

- rules questions
- challenge submissions
- vote submissions
- idol/power use
- deadline reminders
- private strategy questions
- commissioner operations
- official announcements
- exile/jury/finale flows

AI must not leak:

- private votes
- hidden idols
- private DMs
- hidden challenge picks before reveal
- participating commissioner secrets
- Exile/main-island information across privacy boundaries

`buildSurvivorContextForChimmy` must be role-aware, league-scoped, and redacted before
anything reaches the model.

## Frontend Spec

Required screens:

- Survivor league home
- Survivor dashboard
- commissioner dashboard
- tribe view
- tribe chat
- main island chat
- private Chimmy/commissioner DM
- idol/power inventory
- play idol/power flow
- challenge center
- challenge submission UI
- vote center
- Tribal Council reveal UI with scroll animation
- Exile Island view
- jury view
- finale view
- settings screen
- mobile layout

No dead buttons are allowed. Every button must call a real route, be hidden, or be
disabled with truthful state.

## API Shape

Keep routes consolidated:

- `GET /api/leagues/[leagueId]/survivor`
- `POST /api/leagues/[leagueId]/survivor/[action]`
- `GET /api/leagues/[leagueId]/survivor/chats`
- `POST /api/leagues/[leagueId]/survivor/chats/[action]`
- `GET /api/leagues/[leagueId]/survivor/admin`
- `POST /api/leagues/[leagueId]/survivor/admin/[action]`

Actions dispatch internally and must not become separate top-level route files.

## Definition of Fully Set Up

Survivor is fully set up only when:

- League creation persists canonical settings.
- Draft completion creates real tribes, chats, private DMs, and hidden inventory.
- Idols/powers work with privacy, audit, notifications, and UI.
- Challenges can be created, submitted, locked, resolved, and rewarded.
- Private voting, idol resolution, reveal, elimination, waiver/exile routing, and chat
  membership updates work.
- Sit-outs, merge, Exile, jury, finale, and videos are wired.
- Participating commissioner blind mode is proven by tests.
- DB-backed Playwright runtime passes.
- Route budget remains green.
- No fake gameplay state remains.
