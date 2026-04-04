# Big Brother League — UX Flow Maps (Text Diagrams)

**Product:** AllFantasy.AI  
**Role:** Senior UX — flow specification for engineering & design  
**Companion docs:** `docs/PRD_BIG_BROTHER_LEAGUE.md` (v1.1), `docs/UX_BIG_BROTHER_JOURNEY_AND_COMMANDS.md` (Figma journey tables + `@chimmy` command enums for BE)  
**Interaction model:** Managers use **@chimmy** in **league chat** and **private (DM) chat** with the platform assistant. Autocomplete surfaces valid commands/mentions where applicable.

**Legend**

- `[AUTO]` — system automation (cron, scoring pipeline, state machine).
- `[USER]` — explicit user gesture.
- `[COMM]` — commissioner-only.
- `[CHIMMY]` — assistant message (copy is suggestive; tone: calm, clear, Chimmy).
- `◇` — decision / branch.
- `⚠` — error or edge path.
- **Timer** — deadline-driven behavior called out inline.

---

## 1. Commissioner creates and configures a Big Brother League

### 1.1 Happy path

```
[USER] Commissioner: Create league → pick sport (7-sport scope) → format Redraft → enable "Big Brother League" mode template.
[USER] Commissioner: BB configuration wizard (single screen or stepped):
  - Confirm house size bounds (12–18; system validates vs season weeks / finale week rule).
  - Map "BB Week" to league scoring week (sport default).
  - HOH competition default: weekly fantasy points among eligible houseguests.
  - Nominee count (default 2), strict BB eligibility toggles (read-only strict in v1 per PRD).
  - Jury: automatic start threshold + optional commissioner-adjustable week (saved + audited).
  - Vote reveal: public outcome / sealed ballots until season end (fixed product rule).
  - Chimmy: on if commissioner has AF Commissioner subscription; off messaging if not.
[CHIMMY] (league system post or DM): "Your Big Brother League is set for [Sport]. I’ll announce phase changes here and in your DMs when it’s your turn. Use @chimmy help bb anytime."
[AUTO] Persist `bbSeason` + settings; create audit record `bb_config_created`.
[USER] Commissioner: Invite managers / share join link as today’s league flow.
```

### 1.2 Errors & fallbacks

```
⚠ House size invalid for sport weeks
  → Inline error: "This season doesn’t have enough weeks for [N] players and a finale one week before the regular season ends. Lower the house size or pick another sport/template."
  → [USER] Adjust N or cancel.

⚠ BB mode toggle without redraft
  → Block with explanation; no enable.

⚠ Commissioner subscription inactive when enabling Chimmy-dependent options
  → Options for AI-run abandoned teams / Chimmy recaps show as disabled with upsell: "AF Commissioner subscription unlocks Chimmy for this league."
  → [USER] Continue without AI or subscribe (existing monetization flow).

⚠ Partial save / network fail
  → Toast + retry; draft settings retained locally until success.

⚠ Duplicate league name / slug
  → Existing platform validation.
```

### 1.3 Automation vs user

| Step | Type |
|------|------|
| Validation of 12–18 vs calendar | `[AUTO]` |
| Saving config + audit | `[AUTO]` after submit |
| Invite flow | `[USER]` |

### 1.4 Chimmy copy (key beats)

- After successful config: *"Big Brother overlay is live for this league. I’ll ping you at each phase and when you need to act."*
- If no subscription: *"This league won’t use Chimmy automation until the commissioner activates AF Commissioner. You can still play BB phases in the app."*

### 1.5 Timers

- None at creation except **preview** of "Phase 1 will start after draft locks" if scheduled.

### 1.6 Mobile UX

- Wizard **single column**, sticky primary CTA **Save & enable BB**.
- House size use **stepper** + short explanation sheet "Why 12–18?"
- Long legal/compliance line in **bottom sheet** (gambling/dues disclaimer per PRD).

---

## 2. Managers join and complete the draft

### 2.1 Happy path

```
[USER] Manager: Accept invite → join league roster as normal redraft member.
[AUTO] When house at commissioner-approved lock (or draft start): draft room behaves as standard redraft for that sport.
[USER] Managers: Make picks in draft room (existing UX).
[AUTO] On draft complete: lock BB `houseRoster` = all managers who completed draft (no mid-season adds per PRD).
[AUTO] Transition BB state to `PRE_SEASON` or `WEEK_1_HOH_PENDING` per product spec.
[CHIMMY] League chat: "Draft’s done. Big Brother Week 1 starts soon — next message will be your Head of Household competition details."
[CHIMMY] DM each manager: "You’re in the house for [League]. Stay tuned for HOH. @chimmy help bb for commands."
```

### 2.2 Errors & fallbacks

```
⚠ House > max or < min at draft lock
  → [COMM] Commissioner must resolve before BB start (remove teams / reset draft — platform rules) — block BB start banner.

⚠ Manager abandons during draft
  → Existing draft rules; if slot empty at lock: [COMM] decision or disqualify from BB house per league policy.

⚠ Draft pause
  → BB clock frozen; resume message from Chimmy when draft resumes.

⚠ Subscription lapse mid-draft (edge)
  → No AI promises; Chimmy automation flags off after lock if lapse detected.
```

### 2.3 Automation vs user

| Step | Type |
|------|------|
| Draft engine | `[AUTO]` + `[USER]` picks |
| BB house lock | `[AUTO]` at draft complete event |

### 2.4 Chimmy copy

- Draft complete: *"House is set. I’ll track Head of Household, nominations, veto, and votes — all in league chat and your DMs."*

### 2.5 Timers

- Draft clock: existing draft timer UX.
- Optional **countdown** chip in league header: "BB starts in: **—**" after draft scheduled end.

### 2.6 Mobile UX

- Draft room remains **primary**; BB is **secondary chip** on league home so fantasy isn’t buried.
- Push: "Draft complete — Big Brother Week 1 is next" (if notifications on).

---

## 3. Week 1 HOH mini game (sport-specific real data)

### 3.1 Happy path

```
[AUTO] Phase → `HOH_COMP_OPEN`; compute eligible set (strict BB: e.g. exclude prior HOH if not week 1 — product rule).
[AUTO] Post `competitionLockAt` (lineup lock aligned to league settings).
[CHIMMY] League chat: "Head of Household competition is live for Week [X]. Eligible houseguests: [names or count]. Lock hits at [time in your timezone]. Highest fantasy score this week wins HOH. @chimmy hoh status"
[USER] Managers: Set lineups as normal fantasy (same app surfaces).
[AUTO] At scoring finalization for the week (or at lock for display-only preview — tech spec): rank eligible managers by official weekly points; apply tie-breaker chain.
[AUTO] Persist `hohUserId`, emit audit `hoh_awarded`.
[CHIMMY] League chat (Julie-style): "This week’s Head of Household is @[displayName]. Congratulations."
[CHIMMY] DM to new HOH: "You’re HOH. When nominations open, you’ll nominate in league chat with @chimmy nominate … I’ll guide you."
[CHIMMY] DM to others: "@[HOH] is Head of Household. Nominations are next."
[AUTO] Phase → `NOMINATIONS_OPEN` at `nominationsOpenAt` (immediate or scheduled).
```

### 3.2 Errors & fallbacks

```
⚠ Lineup missing for eligible player
  → Score = 0; [CHIMMY] DM (optional): "You didn’t set a lineup — HOH comp counts as 0 this week."
  → [AUTO] Continue ranking.

⚠ Tie after tie-breakers
  → [AUTO] If commissioner pick window: notify [COMM]; [CHIMMY] league: "We have a tie. Commissioner will break it by [deadline]."
  → ⚠ [COMM] misses deadline → [AUTO] fallback: random among tied with audit `hoh_tie_random` (if PRD allows) OR extend once.

⚠ Stat correction after HOH announced (v1 out of scope replay)
  → [CHIMMY] league: "League scoring was updated for Week [X]. Head of Household stands as announced for Big Brother continuity." (copy legal review)
  → [AUTO] No HOH swap v1.

⚠ Scoring provider delay
  → [CHIMMY] league: "HOH results are delayed while scores finalize. I’ll post when ready."
  → Banner: **Processing scores…**

⚠ Eligible set empty (misconfig)
  → [AUTO] Block; [COMM] alert; Chimmy does not announce false winner.
```

### 3.3 Automation vs user

| Step | Type |
|------|------|
| Eligibility, lock time, ranking, phase advance | `[AUTO]` |
| Set lineup | `[USER]` |
| Tie-break commissioner pick | `[COMM]` if needed |

### 3.4 Chimmy copy (additional)

- Status command response: *"HOH comp uses this week’s real [Sport] scores. You’re [eligible / not eligible]. Lock: [time]."*
- Pre-lock reminder (optional automation): *"One hour until lineup lock for the HOH competition."*

### 3.5 Timers

- **Countdown** on League → BB tab: "Lineup lock for HOH: **mm:ss**" (synced server time).
- **HOH results** pending state with skeleton.

### 3.6 Mobile UX

- **Sticky countdown** on BB sheet; tap opens full phase explainer.
- Avoid wall of names — **"You + 11 others eligible"** with expand.
- Large tap target for **@chimmy hoh status** shortcut button in BB panel (inserts text in composer).

---

## 4. HOH nominations via @chimmy in league chat (autocomplete)

### 4.1 Happy path

```
[AUTO] Phase `NOMINATIONS_OPEN`; `nominationsCloseAt` set.
[CHIMMY] League: "@[HOH], you must nominate [N] houseguests by [time]. In this chat, type: @chimmy nominate @player1 @player2 (use @ to pick teammates)."
[USER] HOH: Opens league chat composer → types @chimmy nom…
[AUTO] Autocomplete: commands `nominate`, `nominations help`; player list = eligible nominees (not HOH, in house).
[USER] HOH: Selects two mentions from autocomplete chips.
[AUTO] Validate; persist `nomineeUserIds`; audit `nominations_submitted`.
[CHIMMY] League (Julie-style): "The nominees for eviction are @[A] and @[B]."
[CHIMMY] DM nominees: "You’ve been nominated. Veto competition is next — watch league chat."
[AUTO] Phase → `POV_PLAYER_PICK_OPEN` or `POV_COMP_OPEN` per template.
```

### 4.2 Errors & fallbacks

```
⚠ Wrong user tries @chimmy nominate
  → [CHIMMY] Reply in thread: "Only the Head of Household can nominate right now."

⚠ Too few / too many nominees
  → [CHIMMY] "Nominate exactly [N] houseguests: @chimmy nominate @user @user"

⚠ Invalid mention (not in house / self / HOH)
  → [CHIMMY] "@[name] can’t be nominated here. Pick someone else from the list."

⚠ Duplicate nominee
  → [CHIMMY] "You listed the same person twice."

⚠ HOH misses deadline
  → [AUTO] Apply commissioner default policy (e.g. auto-nominate low scorers / random) + audit.
  → [CHIMMY] League: "HOH didn’t nominate in time. Per league rules, nominees are @[X] and @[Y]."

⚠ Message edited after submit
  → [AUTO] Ignore edit; source of truth server payload only.

⚠ Autocomplete offline
  → [USER] can type full @username if resolver supports; else [CHIMMY] "Try again when online or pick from the BB Nomination screen." + **deep link** to full-screen nominee picker (fallback UI).
```

### 4.3 Automation vs user

| Step | Type |
|------|------|
| Phase open, validation, persist | `[AUTO]` |
| Type command | `[USER]` HOH |
| Fallback nomination | `[AUTO]` |

### 4.4 Chimmy copy

- Help: *"Type @chimmy nominate @manager @manager before [time]. I only accept nominations from the current HOH."*
- Success confirm (optional ephemeral): *"Got it — nominees locked in."*

### 4.5 Timers

- **Banner** on league chat: "Nominations close in **hh:mm**."
- Push + DM at **T-1h**, **T-15m** if commissioner enabled.

### 4.6 Mobile UX

- Composer **action row**: [Nominate] opens **native picker** (search + avatars) → inserts `@chimmy nominate …` — reduces typo pain.
- Autocomplete **above keyboard**; max 5 visible, scroll for more.
- HOH sees **red badge** on league tab until done.

---

## 5. Veto participant randomization and competition

### 5.1 Happy path (with random draw for extra POV slot)

```
[AUTO] Phase `POV_PLAYER_PICK_OPEN` (if template includes extra pick):
  → Random or rule-based selection of which houseguest picks additional POV player (display animation seed in audit).
[CHIMMY] League: "@[Picker], choose one player to join the Power of Veto competition. Reply: @chimmy pov pick @player by [time]."
[USER] Picker: @chimmy pov pick @player
[AUTO] Validate in house, not already in pool; POV pool = HOH + nominees + picked player(s).
[AUTO] Phase → `POV_COMP_OPEN`.
[CHIMMY] League: "POV players: [list]. Competition uses this week’s fantasy scores / configured comp. Lock [time]."
[AUTO] Same scoring engine as HOH restricted to pool P; tie-break; `povHolderUserId`.
[CHIMMY] League: "@[POV] has won the Power of Veto."
[AUTO] Phase → `VETO_CEREMONY_OPEN`.
```

### 5.2 Errors & fallbacks

```
⚠ Picker misses pick deadline
  → [AUTO] Random eligible player added to pool + audit.
  → [CHIMMY] "Time’s up — [random] joins the POV competition."

⚠ POV pool < minimum
  → [COMM] notified; [AUTO] skip POV or commissioner manual resolve per settings.
  → [CHIMMY] explains skip in league.

⚠ User not in pool tries POV comp exploit
  → Scoring ignores; no message leak of internal IDs.

⚠ Tie for POV
  → Same tie policy as HOH (commissioner / random) with announcement.
```

### 5.3 Automation vs user

| Step | Type |
|------|------|
| Randomization, pool build, scoring | `[AUTO]` |
| pov pick command | `[USER]` |

### 5.4 Chimmy copy

- *"Power of Veto lets you save a nominee. First we pick who’s in the comp."*
- Random draw flavor (neutral): *"House, the player choosing the extra competitor is @[Picker]."*

### 5.5 Timers

- Pick window countdown; POV comp lock same pattern as HOH.

### 5.6 Mobile UX

- **Full-screen POV pool card** after draw — avatars in a row, swipe for "who picked whom."
- Haptic on **your turn to pick** notification.

---

## 6. POV winner's veto decision

### 6.1 Happy path

```
[CHIMMY] League: "@[POV], you have the Power of Veto. Use @chimmy veto use or @chimmy veto not_use by [time]."
[USER] POV: @chimmy veto not_use
[AUTO] Persist; phase → `EVICTION_VOTE_OPEN` with same nominees.
[CHIMMY] League: "The veto was not used. @[A] and @[B] remain on the block."

--- OR ---

[USER] POV: @chimmy veto use
[AUTO] Phase → `REPLACEMENT_OPEN` (or combined ceremony state).
[CHIMMY] League: "The veto was used. @[saved] is off the block. Head of Household will name a replacement."
```

### 6.2 Errors & fallbacks

```
⚠ Non-POV sends veto command
  → [CHIMMY] "Only the veto holder can use this command."

⚠ Ambiguous command
  → [CHIMMY] "Say either @chimmy veto use or @chimmy veto not_use."

⚠ POV misses deadline
  → [AUTO] Default `not_use` + audit.
  → [CHIMMY] "Time expired — veto unused."

⚠ Duplicate commands
  → Idempotent ack: "Already recorded."
```

### 6.3 Automation vs user

| Step | Type |
|------|------|
| Default not_use | `[AUTO]` on timeout |
| Command | `[USER]` POV |

### 6.4 Chimmy copy

- *"Using the veto removes one nominee from the block. The HOH then names someone else."*
- DM POV: *"You’re on the clock — league is waiting."*

### 6.5 Timers

- **High-visibility countdown** on POV’s home + league BB strip.

### 6.6 Mobile UX

- **Two big buttons** in BB tab (Use / Not use) that send the @chimmy command for users who don’t type commands.

---

## 7. Replacement nominee flow

### 7.1 Happy path

```
[CHIMMY] League: "@[HOH], name a replacement nominee: @chimmy replace @player by [time]. Cannot be yourself or the veto holder (default rules)."
[USER] HOH: @chimmy replace @player
[AUTO] Validate; update `finalNomineeUserIds`; audit.
[CHIMMY] League: "The replacement nominee is @[C]. The final nominees are @[A] and @[C]."
[AUTO] Phase → `EVICTION_VOTE_OPEN`.
[CHIMMY] DM eligible voters: "Private vote: message me @chimmy vote evict @A or @chimmy vote evict @C before [time]. Your vote stays sealed until the end of the season."
```

### 7.2 Errors & fallbacks

```
⚠ Invalid replacement (HOH self, POV holder, non-house)
  → [CHIMMY] "That pick isn’t allowed. Choose an eligible houseguest."

⚠ HOH timeout
  → [AUTO] Auto replacement per policy + audit.
  → [CHIMMY] League: "HOH didn’t name a replacement in time. Per rules, @[auto] is the replacement."

⚠ Wrong phase
  → [CHIMMY] "Replacements aren’t open right now."
```

### 7.3 Automation vs user

| Step | Type |
|------|------|
| Validate, advance to vote | `[AUTO]` |
| replace command | `[USER]` HOH |
| Auto replacement | `[AUTO]` |

### 7.4 Chimmy copy

- *"Replacement can’t be you or the veto holder. Pick someone still in the game."*

### 7.5 Timers

- Same nomination-style countdown for HOH.

### 7.6 Mobile UX

- **Replacement picker** screen mirrors nomination UX; inserts command into DM or league as required by spec (league-only if public accountability desired).

---

## 8. House vote (private @chimmy voting)

### 8.1 Happy path

```
[AUTO] Phase `EVICTION_VOTE_OPEN`; compute eligible voters V (strict BB: exclude HOH + nominees by default).
[CHIMMY] DM each v ∈ V: "Eviction vote is open. Evict one nominee: @chimmy vote evict @NomineeA or @chimmy vote evict @NomineeB. Deadline [time]. This message is private."
[USER] Voter: In **private chat with Chimmy**, sends command (autocomplete shows only valid nominees).
[AUTO] Store encrypted ballot; ack without revealing tally.
[CHIMMY] DM: "Vote received. You can’t change it after lock."
[AUTO] At `voteCloseAt`, lock tally; apply tie-break (e.g. HOH breaks in DM with @chimmy vote tie @nominee — or in-app secure form).
[CHIMMY] League (ceremony): "By a vote of [X]-[Y], @[evicted] has been evicted from the Big Brother game."
  → Individual votes **not** listed (sealed until season end).
[AUTO] Trigger eviction processing (flow 9).
```

### 8.2 Errors & fallbacks

```
⚠ Voter tries in league chat
  → [CHIMMY] Thread reply: "Votes are private — open your DM with me and send your vote there."

⚠ Non-voter tries
  → [CHIMMY] "You’re not eligible to vote this week."

⚠ Wrong nominee name
  → Autocomplete + [CHIMMY] "Choose @NomineeA or @NomineeB."

⚠ Double vote
  → First ballot wins; [CHIMMY] "You already voted."

⚠ Miss deadline
  → [AUTO] Record as `abstain` or `missed_vote` per policy; audit.
  → [CHIMMY] DM: "You didn’t vote — counted as abstain." (if policy)

⚠ Tie after tally
  → [AUTO] Notify HOH tie-break channel OR revote window.
  → [CHIMMY] League: "The house is tied. Head of Household will break the tie by [time]."

⚠ Chimmy outage during vote
  → [USER] Fallback: **Vote** screen in BB tab (same backend); [CHIMMY] sync when back.
```

### 8.3 Automation vs user

| Step | Type |
|------|------|
| Open/close vote, tally, tie logic | `[AUTO]` |
| Cast ballot | `[USER]` in DM |
| HOH tie-break | `[USER]` HOH (or `[AUTO]` if revote) |

### 8.4 Chimmy copy

- *"I never post who you voted for. At the end of the season, sealed votes can be revealed per league settings."*
- Reminder T-1h: *"Eviction vote closes soon — DM me your vote."*

### 8.5 Timers

- DM + push with deadline; **immutable** lock at close (show clock in BB tab "Vote closes in …").

### 8.6 Mobile UX

- **Deep link** from league banner → opens Chimmy DM with pre-filled `@chimmy vote evict `.
- **Biometric app open** not required; ensure one-tap from notification.
- **Offline queue** optional P2 — v1 show error + retry.

---

## 9. Eviction processing and roster release to waivers

### 9.1 Happy path

```
[AUTO] On `evictedUserId` finalized:
  - BB state: mark user evicted; add to jury pool per jury rules.
  - Fantasy: remove manager from team; **drop all players to waivers**; **stop scoring** for that team.
  - Trades: **void** pending involving evicted manager (no settlement after eviction).
[CHIMMY] League: "@[evicted] has left the house. Their roster has been released to waivers and will not score for the rest of the season."
[CHIMMY] DM evicted: "You’re out of the Big Brother game. You can still [jury instructions / read-only league]."
[AUTO] Recompute waivers order / FA per league rules.
[AUTO] Phase → next `HOH_COMP_OPEN` or `JURY_PHASE` / `FINALE_PATH` per schedule.
```

### 9.2 Errors & fallbacks

```
⚠ Waiver wire job partial fail (player stuck)
  → [AUTO] Retry queue; [COMM] alert if stuck > N min.
  → [CHIMMY] League (if needed): "Waivers are updating after eviction — refresh in a minute."

⚠ Double eviction same night (schedule-math only)
  → [AUTO] Second eviction flow repeats; messaging clarifies "Second eviction of the week."

⚠ Evicted user is fantasy co-owner edge (if exists)
  → [AUTO] Platform rule: sole control transfer or block — product OQ outside this UX doc.

⚠ Provider error on waiver claim window
  → Standard league error surfaces; BB narrative paused until consistent.
```

### 9.3 Automation vs user

| Step | Type |
|------|------|
| Roster dissolution, waivers, void trades | `[AUTO]` |
| None for evicted manager (no opt-out) | — |

### 9.4 Chimmy copy

- *"Your players are on waivers for the rest of the league to claim."* (to league, not shaming)
- To evicted: *"Thanks for playing. Jury duty may start after the next milestone — I’ll DM you."*

### 9.5 Timers

- **Processing…** state ≤ 60s ideal; spinner on league home.

### 9.6 Mobile UX

- **Transactional confirmation** modal for non-evicted users: "Roster updates may affect your waiver priority."
- Evicted sees **simplified home**: Jury card + "Season recap" CTA, no lineup editor.

---

## 10. Jury formation and finale

### 10.1 Happy path

```
[AUTO] When merge/jury threshold hit (default automatic; commissioner may have adjusted week):
  - Label jurors; restrict BB actions to jury votes only.
[CHIMMY] League: "The jury phase has begun. Evicted houseguests will vote for a winner later."
... (weeks pass, final HOH / final eviction per simplified v1 spec) ...
[AUTO] Final two (or three if allowed) set; `JURY_VOTE_OPEN`.
[CHIMMY] DM each juror: "Cast your winner vote: @chimmy jury vote @FinalistA or @chimmy jury vote @FinalistB by [time]."
[USER] Jurors: DM commands.
[AUTO] Tally; determine `bbWinnerUserId`.
[AUTO] **Converge with fantasy champion** per PRD (must be same person — tech ensures no split).
[CHIMMY] League (finale night): "The winner of Big Brother [League] is @[winner] — and your fantasy champion is @[winner]. Congratulations!"
[AUTO] Optional: reveal **individual eviction ballots** from entire season (settings) or **post-season reveal** event.
[CHIMMY] "Want to see how votes went down? Here’s the sealed history: …" (only if product enables end-of-season reveal)
```

### 10.2 Errors & fallbacks

```
⚠ Juror misses vote
  → [AUTO] Abstain / revote policy; audit.

⚠ Convergence failure (BB winner ≠ fantasy champion in backend)
  → [AUTO] **Block finale announcement**; [COMM] critical alert; no user-facing split trophy.

⚠ Finale tie
  → [AUTO] Revote or commissioner rule; Chimmy explains delay.

⚠ Commissioner changed jury week to invalid
  → Validation on save; rollback message.
```

### 10.3 Automation vs user

| Step | Type |
|------|------|
| Jury phase transition, tally, convergence check | `[AUTO]` |
| Jury DM vote | `[USER]` |

### 10.4 Chimmy copy

- *"Jury, you’re voting for who played the best game — not who was nicest in chat."*
- Pre-reveal: *"Individual votes from earlier evictions stay private until the season story is complete."*

### 10.5 Timers

- Jury vote window same as eviction vote; **finale** scheduled chip in league header.

### 10.6 Mobile UX

- **Finale** = lightweight live blog style in league chat + **celebration** full-screen for winner (share card optional P2).

---

## 11. Commissioner override at any stage

### 11.1 Entry

```
[USER] [COMM]: League → Settings → Big Brother → **Commissioner controls** (shield icon).
[AUTO] Show current phase, deadline, last audit id.
```

### 11.2 Happy path (examples)

```
◇ Force advance phase
  [USER] [COMM]: Select "Force next phase" → confirm modal (type league name) → reason note.
  [AUTO] Transition; audit `comm_force_advance` + reason; notify league.
  [CHIMMY] League: "The commissioner advanced the game to [Phase]. If you had an open action, check the new instructions."

◇ Extend deadline (+X hours, max cap)
  [USER] [COMM]: Pick phase timer → extend.
  [CHIMMY] League: "Deadline extended by [X] hours for [phase]."

◇ Pause BB overlay
  [USER] [COMM]: Pause (fantasy continues).
  [CHIMMY] League: "Big Brother is paused. Fantasy keeps going. I’ll say when we resume."

◇ Fix mistaken nomination (destructive)
  [USER] [COMM]: "Undo last nomination" (only if vote not started) → confirm.
  [AUTO] Revert state; audit.

◇ Jury timing override
  [USER] [COMM]: Adjust jury start week within allowed bounds.
  [CHIMMY] Optional league notice.
```

### 11.3 Errors & fallbacks

```
⚠ Non-commissioner opens controls
  → Hidden / 403.

⚠ Force advance would violate invariants (e.g. no nominees)
  → Block with reason; suggest step-by-step fix wizard.

⚠ Subscription lapsed — AI actions disabled
  → [COMM] can still **manual** force advance / set winners? (PRD: manual run). UI shows: "Chimmy automation off — you’re driving."

⚠ Audit log write fail
  → Block destructive override; toast error.

⚠ Concurrent commissioner + auto-cron
  → Optimistic lock: "Another action is processing — retry."
```

### 11.4 Automation vs user

| Step | Type |
|------|------|
| Phase change after confirm | `[AUTO]` |
| Confirm + reason | `[COMM]` |

### 11.5 Chimmy copy

- After override: neutral, no blame: *"Rules update from the commissioner — here’s what changed."*
- Never insult evicted or nominees.

### 11.6 Timers

- Extensions show **updated** countdown everywhere within 5s (SSE/poll).

### 11.7 Mobile UX

- Commissioner tools in **bottom sheet** with **danger zone** collapsed by default.
- Haptic + **second tap** for destructive actions.

---

## Cross-cutting UX notes

| Topic | Guidance |
|-------|----------|
| **@chimmy everywhere** | Same command grammar in league vs DM; DM for **secrets** (votes). |
| **Autocomplete** | Command first, then **entity** (users, nominees). |
| **Accessibility** | Screen reader: phase state in **aria-live** region on BB home. |
| **Empty states** | "You’re not HOH this week" with **what to do instead** (set lineup, vote later). |
| **Chimmy tone** | Calm, concise, **no spoilers** of sealed votes. |

---

**End of UX flow document**
