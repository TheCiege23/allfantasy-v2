# PROMPT 351 — AllFantasy Big Brother Specialty League

You are implementing the **Big Brother** specialty league for AllFantasy.

Use the **AllFantasy Master Project Context** as binding system context.

Use the **Specialty League Factory** (`lib/specialty-league`): reusable contracts for tribe/group orchestration, hidden power systems, private voting, elimination pipeline, sidecar league, tokenized return, mini-game registry, merge/jury-style phases, @Chimmy command parsing, and AI host hooks. **Survivor** is the reference implementation; Big Brother reuses the same patterns with house-specific flavor.

---

## REFERENCE PRIORITY

- **Strongest references for this build:** Survivor implementation (backend `lib/survivor`, frontend `components/survivor`, API routes under `/api/leagues/[leagueId]/survivor/*`). Reuse and adapt: house = tribe, eviction = elimination, jury = jury, HOH = immunity-like, POV = power/advantage.
- **Flavor/tone:** Big Brother show tone (houseguests, eviction, HOH, POV, diary room, jury). Preserve social/private chat and AI-host workflow patterns from Survivor docs.

---

## IMPLEMENTATION NOTES (from product)

1. **Power/advantage system:** Build as **player-bound metadata** where applicable (e.g. a “power” or “advantage” tied to a player can transfer on trade/waiver/steal to the new manager). User-bound powers are also allowed for non-transferable advantages. Match Survivor idol pattern: assign after draft with transfer logging and chain-of-custody.
2. **Official actions:** All game-state changes (eviction vote, use power, submit competition result, nominate, etc.) go through a **command parser layer**. Normal house/tribe chat remains social; only explicit **@Chimmy** commands create official game-state changes. Fits private-house-chat structure and AI-host workflow.

---

## OBJECTIVE

Build the full **Big Brother** specialty league: backend engine, frontend experience, AI layer, and QA/workflow validation, reusing factory contracts and Survivor-style architecture.

---

## SUPPORTED SPORTS

- NFL  
- NBA  
- MLB  
- NHL  
- NCAA Basketball  
- NCAA Football  
- Soccer  

---

## LEAGUE HOME MUST INCLUDE

- Big Brother league branding/header  
- House overview (houseguests, HOH, nominees)  
- Eviction countdown and schedule  
- Current competition (HOH, POV, etc.) panel  
- Power/advantage area (private where appropriate, public where appropriate)  
- Jury summary (when in jury phase)  
- AI host panel  
- House/private chat entry points  
- Official **@Chimmy** command help  
- Eviction history  
- Competition history  

---

## REQUIRED PAGES / PANELS

1. **House Board** — Houseguests, house names/roles, HOH indicator, nominees, current competition status.  
2. **Competition Center** — Active HOH/POV (or other) competition, submission windows, locked state, result history, reward/advantage outputs.  
3. **Eviction View** — Countdown, voting instructions, official @Chimmy usage examples, eviction result recap, scroll-reveal history.  
4. **Powers / Advantages View** — Private owned powers; status: hidden, active, used, expired; player-bound where applicable; transfer history where authorized; usage eligibility.  
5. **Jury View** — Jury members, finalist path, finale timeline (mirror Survivor merge/jury).  
6. **AI Big Brother Panel** — Ask Chimmy, house strategy helper, competition coaching, eviction risk explanation, power advice, recap/storyline view.  

---

## COMMAND UX

Clear UX for official commands, e.g.:

- `@Chimmy vote [houseguest]`  
- `@Chimmy use power [power]`  
- `@Chimmy submit competition [choice]`  
- `@Chimmy nominate [houseguest]` (if applicable)  

Only these (and other explicitly defined commands) mutate game state; all via command parser and dedicated API (e.g. `/api/leagues/[leagueId]/big-brother/commands`).

---

## BACKEND (engine)

- **Config:** BigBrotherLeagueConfig (or equivalent): house size, eviction schedule, HOH/POV rules, jury size, power/advantage pool.  
- **House orchestration:** Create houses (or single house with roles); houseguest = roster; HOH, nominees, POV winner from competitions.  
- **Private voting:** Eviction vote with deadline; tally; tie-break (e.g. HOH tie-break or lowest season points).  
- **Elimination pipeline:** Close eviction → set evicted → remove from house chat → add to jury when in jury phase.  
- **Powers/advantages:** Player-bound where transfer on trade/waiver/steal is required; assign after draft; transfer logging; use/expiry.  
- **Competitions:** HOH, POV (or equivalent); create, lock, submit, resolve; rewards (safety, POV, etc.).  
- **Jury:** Enroll evicted houseguests into jury at configured point; list jury members.  
- **Audit log:** Append-only event log for evictions, power use, competition results.  
- **Command parser:** Parse @Chimmy commands (vote, use power, submit competition, nominate, etc.); validation and execution in engine, not in AI.  

---

## FRONTEND

- League home: Big Brother branding, house overview, eviction countdown, competition panel, powers area, jury summary, AI panel, chat entry points, command help, eviction and competition history.  
- View switcher (House Board, Competition Center, Eviction, Powers, Jury, AI) with mobile dropdown and desktop pills.  
- All panels read from a **summary** API (e.g. `GET /api/leagues/[leagueId]/big-brother/summary`).  
- No dead buttons; tribe/house chat and private AI chat entry points work.  

---

## AI LAYER

- **Deterministic first:** No AI for eviction result, vote count, power validity, or competition outcome.  
- **Host mode:** Intro posts, eviction narration, jury/finale moderation, Big Brother tone.  
- **Helper:** House strategy, competition coaching, eviction risk, power advice, recap.  
- **Chimmy context:** When user is in a Big Brother league, inject league context into Chimmy so answers are grounded; AI only suggests command wording, never executes.  
- **Monetization:** Respect entitlement gates (e.g. big_brother_ai or ai_chat) for premium AI features.  

---

## MANDATORY CLICK AUDIT

Verify:

- House chat and league chat open correctly.  
- Competition panel and submission status update correctly.  
- Voting help and command help render correctly.  
- Power/advantage views render correctly (private where appropriate).  
- Jury view works.  
- AI panel and Generate work (or show upgrade message when gated).  
- Mobile and desktop layouts work.  
- No dead command-help or specialty-league buttons.  

---

## DELIVERABLE FORMAT

Return full merged backend + frontend files. For every file:

- Label **[NEW]** or **[UPDATED]**  
- Full relative path  
- Complete ready-to-paste contents  

Also include:

- Route updates  
- Component tree summary  
- QA checklist  

---

## FACTORY INTEGRATION

- Register Big Brother in `lib/specialty-league/registry.ts` with detect, getConfig, upsertConfig, homeComponent, summaryRoutePath, aiRoutePath, and **capabilities** (tribeOrchestration → house, hiddenPowerSystem, privateVoting, eliminationPipeline, mergeJuryPhases, officialCommandParsing, aiHostHooks; sidecarLeague/tokenizedReturn only if Exile-style twist is used).  
- League create: when variant/type is `big_brother`, set `leagueVariant` and upsert Big Brother config.  
- Overview tab: when `isBigBrother`, render `BigBrotherHome`.  
- Add `BIG_BROTHER_DETERMINISTIC_FEATURES` and `BIG_BROTHER_AI_OPTIONAL_FEATURES` in `lib/specialty-league/automation-ai-policy.ts`.  

---

## RECOMMENDED SEQUENCE (same as Survivor)

1. **Backend engine** — Config, house, eviction, voting, powers, competitions, jury, audit, command parser.  
2. **Frontend** — Summary API, league home, view switcher, panels (House, Competition, Eviction, Powers, Jury, AI), command help.  
3. **AI layer** — Context builder, prompts (host + helper), generate, Chimmy context injection; entitlement gate.  
4. **QA + workflow validation** — Test flows (create league, create house, run competition, eviction vote, jury), issue list, fix plan, QA checklist.  
5. **Factory update** — Ensure Big Brother is registered and any new reusable bits are reflected in the factory docs.  

Use this prompt (and the Survivor implementation) as the primary reference to build the next specialty league in the same format.
