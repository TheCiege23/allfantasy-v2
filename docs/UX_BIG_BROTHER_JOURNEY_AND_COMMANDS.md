# Big Brother League — User Journey Tables (Figma-Ready) & Chimmy Command Spec

**Product:** AllFantasy.AI  
**Audience:** UX (Figma frames), Engineering (parser + state machine), PM (acceptance)  
**Companion docs:** `docs/PRD_BIG_BROTHER_LEAGUE.md`, `docs/UX_FLOWS_BIG_BROTHER_LEAGUE.md`

---

## Part A — Figma-ready user journey tables

**How to use in Figma:** Each row ≈ one frame or variant. Group by **Journey ID** into sections; use **Frame name** column as the node title; link **Chimmy copy** to string library.

**Column legend**

| Column | Meaning |
|--------|---------|
| **Journey** | Epic label |
| **Step** | Order |
| **Frame name** | Suggested Figma frame |
| **Actor** | Who |
| **Entry** | From where |
| **Primary action** | Main tap/type |
| **Success** | Done when |
| **System state** | `bbPhase` or league state |
| **Error / empty** | Variant to design |
| **Timer** | Countdown visible? |
| **Chimmy** | User-facing line (optional) |
| **Mobile** | Layout / affordance note |

---

### Journey J1 — Commissioner: create & configure BB league

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Create_League_Format` | Commissioner | League creation | Select Redraft + sport | Sport locked | `league_draft` | Sport unsupported | — | — | Single column |
| 2 | `BB_Enable_Toggle` | Commissioner | League settings | Toggle “Big Brother League” | Toggle on | — | Non-redraft blocked | — | Upsell if no sub | Toggle + info sheet |
| 3 | `BB_Config_HouseSize` | Commissioner | BB wizard | Set 12–18 | Valid N | `bb_config_draft` | Inline calendar error | — | — | Stepper + “Why?” link |
| 4 | `BB_Config_HOH_POV_Jury` | Commissioner | Wizard step 2 | Confirm defaults | Saved locally | — | — | — | — | Accordion sections |
| 5 | `BB_Config_Review` | Commissioner | Wizard step 3 | Save & enable | API 200 | `bb_enabled=false→true` | Retry toast | — | “Overlay is live…” | Sticky **Save** |
| 6 | `BB_Config_Success` | Commissioner | Modal / league home | Dismiss | On league hub | `bb_season_created` | — | — | DM + league system post | Full-width confirm |

---

### Journey J2 — Manager: join & draft

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Join_Invite` | Manager | Invite link | Accept | In league | `member_pending` | Invite expired | — | — | Deep link |
| 2 | `BB_Draft_Room` | Manager | League | Pick players | Queue updated | `draft_live` | On clock timeout auto-pick | Draft clock | — | Existing draft UX |
| 3 | `BB_Draft_Complete` | Manager | League home | View roster | Roster exists | `draft_complete` | — | BB start countdown chip | “House is set…” | Chip under header |
| 4 | `BB_House_Locked` | All | League BB tab | Open BB tab | Sees phase card | `pre_bb_week1` | BB disabled (config) | Optional | — | BB tab icon badge |

---

### Journey J3 — HOH competition (week N)

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Phase_HOH_Open` | All | League chat / BB tab | Read announcement | Understood | `HOH_COMP_OPEN` | — | Lock countdown | “HOH comp live…” | Sticky countdown strip |
| 2 | `BB_Lineup_For_HOH` | Eligible manager | Lineup | Set starters | Saved | — | Empty lineup warning | Sync to lock | DM reminder | Large **Save lineup** |
| 3 | `BB_HOH_Processing` | All | BB tab | Wait | Scores final | `HOH_COMP_SCORING` | Provider delay banner | Indeterminate | “Results delayed…” | Skeleton list |
| 4 | `BB_HOH_Result` | All | League chat | Read winner | `hohUserId` set | `HOH_COMPLETE` | Tie commissioner pick | — | “HOH is @[x]” | Thread + confetti subtle |
| 5 | `BB_HOH_Status_Command` | Any | Chat composer | `@chimmy hoh status` | Reply card | — | Not eligible copy | — | Eligibility + lock | Quick action inserts text |

---

### Journey J4 — HOH nominations (@chimmy + autocomplete)

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Nom_Open_Banner` | HOH | League | See banner | — | `NOMINATIONS_OPEN` | — | Nom close countdown | “Nominate by…” | Banner tap → composer |
| 2 | `BB_Nom_Composer_Autocomplete` | HOH | League chat | Type `@chimmy nominate` | Menu open | — | — | — | — | Keyboard accessory |
| 3 | `BB_Nom_Picker_Fallback` | HOH | Modal | Search + select 2 | Insert mentions | — | <2 nominees | — | — | Full-screen picker |
| 4 | `BB_Nom_Confirm` | HOH | Chat send | Send message | 200 | `NOMINATIONS_COMPLETE` | Wrong user reply | — | Thread error | — |
| 5 | `BB_Nom_Ceremony` | All | League chat | Read | Knows block | — | — | — | “Nominees are…” | — |
| 6 | `BB_Nom_AutoFallback` | All | League chat | Read | Auto picks shown | same | HOH missed | — | “Per rules, nominees…” | — |

---

### Journey J5 — POV pool + competition

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_POV_Pick_Open` | Picker | League | `@chimmy pov pick @u` | Pool complete | `POV_PLAYER_PICK_OPEN` | Missed → random | Pick deadline | “Choose competitor” | Avatar row |
| 2 | `BB_POV_Comp_Live` | Pool | BB tab | Set lineup (if score-based) | Lock | `POV_COMP_OPEN` | Pool too small | Lock | “POV comp uses…” | Same as HOH |
| 3 | `BB_POV_Winner` | All | Chat | Read | `povHolder` set | `VETO_CEREMONY_OPEN` | Tie | — | “@[x] won POV” | — |

---

### Journey J6 — Veto use / not use

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Veto_Prompt` | POV holder | DM + league | See instructions | — | `VETO_CEREMONY_OPEN` | — | Veto deadline | DM + league | **Use / Not use** buttons |
| 2 | `BB_Veto_Command` | POV | Chat | `@chimmy veto use` | Parsed | `REPLACEMENT_OPEN` or `EVICTION_VOTE_OPEN` | Wrong user | — | Confirm | Buttons mirror command |
| 3 | `BB_Veto_Timeout` | All | League | Read | Default not_use | — | Missed | — | “Veto unused” | — |

---

### Journey J7 — Replacement nominee

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Replace_Prompt` | HOH | League | Read | — | `REPLACEMENT_OPEN` | — | Replace deadline | “Name replacement…” | — |
| 2 | `BB_Replace_Send` | HOH | Chat | `@chimmy replace @u` | Valid | `EVICTION_VOTE_OPEN` | Invalid pick | — | Error thread | Picker modal |
| 3 | `BB_Replace_Auto` | All | League | Read | Auto name | — | HOH timeout | — | “Per rules…” | — |

---

### Journey J8 — Private eviction vote (DM)

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Vote_DM_Invite` | Voter | Push / league banner | Open Chimmy DM | Thread open | `EVICTION_VOTE_OPEN` | — | Vote countdown | “Evict A or B” | **Open DM** CTA |
| 2 | `BB_Vote_Wrong_Surface` | Voter | League chat | Tries vote | Blocked | — | Redirect copy | — | “Votes are private…” | Inline chip **Vote in DM** |
| 3 | `BB_Vote_DM_Submit` | Voter | DM | `@chimmy vote evict @A` | Ballot stored | `vote_cast` | Duplicate vote | — | “Vote received” | Autocomplete nominees only |
| 4 | `BB_Vote_Fallback_Screen` | Voter | BB tab | Tap nominee card | Submit | Same as DM | Chimmy down | — | — | Radio + Submit |
| 5 | `BB_Vote_Ceremony` | All | League chat | Watch | Evicted named | `EVICTION_REVEAL` | Tie | — | “By a vote of X–Y…” | No per-voter list |

---

### Journey J9 — Eviction → waivers

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Evict_Processing` | All | League home | See spinner | Job done | `waivers_processing` | Job stuck | <60s ideal | — | Non-blocking toast |
| 2 | `BB_Evict_Waivers_Updated` | Active mgr | Waivers | Refresh list | New players | `waivers_open` | Partial fail | — | League: “Roster released…” | Waiver FAB |
| 3 | `BB_Evict_Juror_Home` | Evicted | Home | Open app | Jury card | `evicted` | — | — | DM: “You’re out…” | Simplified nav |

---

### Journey J10 — Jury & finale

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Jury_Phase_Start` | All | League | Read | — | `JURY_PHASE` | — | — | “Jury phase begun” | — |
| 2 | `BB_Finale_Jury_DM` | Juror | DM | `@chimmy jury vote @finalist` | Stored | `JURY_VOTE_CAST` | Missed vote | Jury deadline | — | Same as eviction DM |
| 3 | `BB_Finale_Winner` | All | League | Read | One winner | `SEASON_COMPLETE` | Convergence fail (comm alert only) | — | “Winner is @[x] — fantasy champion @[x]” | Celebration full screen |
| 4 | `BB_Season_Reveal_Votes` | All | BB tab / chat | Opt-in reveal | Sealed votes listed | `post_season` | Feature off | — | “Here’s how votes…” | Long scroll; collapsible weeks |

---

### Journey J11 — Commissioner override

| Step | Frame name | Actor | Entry | Primary action | Success | System state | Error / empty | Timer | Chimmy | Mobile |
|------|------------|-------|-------|----------------|---------|--------------|---------------|-------|--------|--------|
| 1 | `BB_Comm_Controls_Hub` | Commissioner | League settings | Open BB controls | Panel open | any | Non-comm 403 | — | — | Bottom sheet |
| 2 | `BB_Comm_Force_Advance` | Commissioner | Modal | Confirm + reason | Phase++ | `audit_comm_force` | Invariant fail | — | League announcement | Type league name confirm |
| 3 | `BB_Comm_Extend_Timer` | Commissioner | Sheet | +hours | New deadline | updated | Over max | Updated countdown | Chimmy posts extension | Stepper hours |
| 4 | `BB_Comm_Pause` | Commissioner | Toggle | Pause BB | Fantasy continues | `bb_paused` | — | — | “BB paused” | — |
| 5 | `BB_Comm_No_Subscription` | Commissioner | Panel | Read | Manual mode | `ai_disabled` | — | — | Banner: “You’re driving” | Warning stripe |

---

## Part B — Chimmy command spec (backend parsing)

### B.1 Conventions

- Messages are normalized: **trim**, collapse internal whitespace, case-**insensitive** for command tokens, **case-sensitive** for user `@mentions` as resolved by platform to `userId`.
- **Prefix:** `@chimmy` (or configured assistant mention token) must appear as the **first** meaningful token OR after optional leading whitespace.
- **Channel rules:**
  - **League chat:** public BB commands (nominations, ceremony-adjacent, help, status).
  - **DM (private chat with Chimmy):** **votes**, **jury vote**, sensitive confirmations.
- **Idempotency:** Successful `vote evict`, `jury vote`, `veto use|not_use` return **same ack** on duplicate within the same phase instance (`phaseInstanceId`).

### B.2 Formal grammar (informal ABNF)

```text
message     = *WSP "@chimmy" *WSP command *WSP [args] *WSP
command     = keyword *( "-" keyword )
args        = *( mention / token )

mention     = "@" ( username / display-handle )   ; resolved server-side to platformUserId
keyword     = 1*( ALPHA / "-" )                  ; lowercase compared
token       = 1*VCHAR                            ; sport-specific tokens if ever needed
```

**Mention resolution:** Fails closed → error `BB_MENTION_UNRESOLVED`.

### B.3 Command enum — `BbChimmyCommand`

| Enum value | Aliases (accept all) | Args | Allowed context | Phase gate (see B.5) |
|------------|----------------------|------|-----------------|----------------------|
| `HELP_BB` | `help bb`, `bb help` | — | League, DM | any |
| `HOH_STATUS` | `hoh status`, `status hoh` | — | League, DM | `HOH_COMP_OPEN` … `HOH_COMPLETE` |
| `NOMINATE` | `nominate`, `nom`, `nominations` | ≥1 `@user` (exactly `nomineeCount`) | League only | `NOMINATIONS_OPEN` |
| `POV_PICK` | `pov pick`, `povpick` | 1 `@user` | League only | `POV_PLAYER_PICK_OPEN` |
| `VETO_USE` | `veto use`, `veto-use` | — | League + DM | `VETO_CEREMONY_OPEN` |
| `VETO_NOT_USE` | `veto not_use`, `veto not-use`, `veto notuse` | — | League + DM | `VETO_CEREMONY_OPEN` |
| `REPLACE` | `replace`, `replacement` | 1 `@user` | League only | `REPLACEMENT_OPEN` |
| `VOTE_EVICT` | `vote evict`, `evict` | 1 `@user` (must be nominee) | **DM only** | `EVICTION_VOTE_OPEN` |
| `JURY_VOTE` | `jury vote`, `juryvote` | 1 `@user` (finalist) | **DM only** | `JURY_VOTE_OPEN` |
| `TIE_BREAK` | `vote tie`, `tiebreak` | 1 `@user` | League or DM per policy | `EVICTION_TIE_BREAK` (subphase) |

**Reserved (future):** `bb status`, `undo` (never in v1 for non-comm).

### B.4 Parser algorithm (recommended)

1. If message does not start with `@chimmy` after trim → **ignore** (not a BB command) or pass to general Chimmy router.
2. Tokenize on whitespace; strip `@chimmy`.
3. Join tokens 1..k into **keyword phrase** by longest match against alias table (e.g. `vote` + `evict` → `VOTE_EVICT`).
4. Remaining tokens must be **mentions only** for nominate/replace/pov pick/vote/jury.
5. Resolve mentions → `userId[]`.
6. Authorize: `senderId`, `leagueId`, `bbSeasonId`, `phase`, `role` (HOH, POV, voter, juror).
7. Execute mutation or return error envelope.

### B.5 Phase gate matrix

| Phase | NOMINATE | POV_PICK | VETO_* | REPLACE | VOTE_EVICT | JURY_VOTE |
|-------|----------|----------|--------|---------|------------|-----------|
| `HOH_COMP_OPEN` | — | — | — | — | — | — |
| `NOMINATIONS_OPEN` | ✓ | — | — | — | — | — |
| `POV_PLAYER_PICK_OPEN` | — | ✓ | — | — | — | — |
| `POV_COMP_OPEN` | — | — | — | — | — | — |
| `VETO_CEREMONY_OPEN` | — | — | ✓ | — | — | — |
| `REPLACEMENT_OPEN` | — | — | — | ✓ | — | — |
| `EVICTION_VOTE_OPEN` | — | — | — | — | ✓ (DM) | — |
| `JURY_VOTE_OPEN` | — | — | — | — | — | ✓ (DM) |

✓ = if role matches. All phases: `HELP_BB`, `HOH_STATUS` where applicable.

### B.6 Error codes — `BbChimmyErrorCode`

| Code | HTTP (if API) | User message (Chimmy) |
|------|----------------|------------------------|
| `BB_CMD_UNKNOWN` | 400 | "I didn’t catch that. Try @chimmy help bb" |
| `BB_WRONG_CHANNEL` | 403 | "Do that in [league chat / your DM with me]." |
| `BB_WRONG_PHASE` | 409 | "That isn’t open right now." |
| `BB_FORBIDDEN_ROLE` | 403 | "Only the Head of Household can do that right now." |
| `BB_MENTION_UNRESOLVED` | 400 | "I couldn’t find that manager in this league." |
| `BB_NOMINEE_INVALID` | 400 | "That player can’t be nominated." |
| `BB_REPLACEMENT_INVALID` | 400 | "That replacement isn’t allowed by the rules." |
| `BB_VOTE_NOT_ELIGIBLE` | 403 | "You’re not voting this week." |
| `BB_VOTE_DUPLICATE` | 200 (idempotent) | "Already counted your vote." |
| `BB_VOTE_WRONG_NOMINEE` | 400 | "Evict one of the nominees: @A or @B." |
| `BB_DEADLINE_PASSED` | 410 | "Time’s up — the game moved on." |
| `BB_AI_DISABLED` | 503 | "Chimmy automation is off for this league. Use the BB tab or ask your commissioner." |

### B.7 Example payloads (mutation response)

```json
{
  "ok": true,
  "command": "VOTE_EVICT",
  "bbSeasonId": "…",
  "phaseInstanceId": "…",
  "ballotId": "…",
  "sealed": true,
  "message": "Vote received. You can’t change it after lock."
}
```

### B.8 Autocomplete contract (FE ↔ BE)

- **GET** `/api/leagues/:leagueId/bb/chimmy-suggest?phase=…&context=league|dm&query=…`
- Returns: `{ commands: BbChimmyCommand[], users: { id, displayName, mention }[] }`
- Users list filtered: nominees only for `VOTE_EVICT` in DM; eligible nominees for `NOMINATE`; etc.

---

## Cross-reference

| Artifact | Location |
|----------|----------|
| Product rules | `docs/PRD_BIG_BROTHER_LEAGUE.md` |
| Narrative flows | `docs/UX_FLOWS_BIG_BROTHER_LEAGUE.md` |
| Figma frames + parser | This document |

---

**End of document**
