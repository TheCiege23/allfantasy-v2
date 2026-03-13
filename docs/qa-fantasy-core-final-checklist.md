# Final QA Checklist – Fantasy Core Systems

Use this after the QA pass to verify behavior.

---

## Waivers

- [ ] **Claim submission** – Submit claim from Waiver Wire page (add player, optional drop, FAAB if FAAB league); claim appears in Pending.
- [ ] **Claim priority ordering** – Pending list shows priorityOrder; process run respects rolling (waiverPriority), FAAB (bid desc), reverse_standings (LeagueTeam currentRank), FCFS (createdAt).
- [ ] **FAAB bid processing** – FAAB league: bid > remaining fails with “Insufficient FAAB”; successful claim decrements faabRemaining.
- [ ] **Rolling waiver** – After process, waiverPriority increments for the roster that got the player (when waiverType is rolling).
- [ ] **Reverse standings** – LeagueTeam.currentRank used when waiverType is reverse_standings; lower rank (worse team) processes first.
- [ ] **Drop-player handling** – Roster full and no drop → claim fails; drop not on roster → claim fails; valid drop → player removed and add added.
- [ ] **Cancel claim** – Pending claim can be cancelled via DELETE; list refreshes.
- [ ] **Edit claim** – PATCH claim (addPlayerId, dropPlayerId, faabBid, priorityOrder) before processing works.
- [ ] **Processed history** – History tab shows processed claims and transactions after run.
- [ ] **Member access** – User with roster (not owner) can load Waiver Wire: claims, settings, players, roster; can submit/cancel own claims.
- [ ] **Commissioner run** – Commissioner can trigger waiver run from Commissioner tab; pending count updates.

---

## Live Draft (Mock / Draft tab)

- [ ] **Draft room loads** – Mock draft simulator page loads; with setup, Start mock leads to client; without setup, league selector shows.
- [ ] **Picks progress** – Simulate produces draftResults; live playback advances completedPicks; step button advances.
- [ ] **Timer** – When live playback on, timer counts down and advances pick on expiry.
- [ ] **Queue** – Draft queue (Draft tab) and mock “Best Available” sidebar work; no duplicate pick from queue in same run.
- [ ] **Recent picks** – Board shows drafted picks; draftedSoFar drives “best available” filter.
- [ ] **Commissioner draft controls** – POST draft (pause/resume/etc.) returns acknowledged; platform wiring is future.
- [ ] **Reset** – Reset clears draft state; can start new mock.

---

## Mock Draft & AI Assistant

- [ ] **Setup** – Sport, league type, draft type, teams, scoring, timer, rounds, AI on/off, optional league; Start passes config to client.
- [ ] **AI toggle** – When aiEnabled, AI Draft Assistant panel shows in sidebar; when off, panel not shown.
- [ ] **Simulated picks** – Full draft runs; recap shows when complete (onDraftComplete).
- [ ] **Recap** – Full board, team summary, grades, your roster, AI recap placeholder; Back returns to draft view.
- [ ] **Restart** – After recap, Back to draft; Reset and Run Mock again works.
- [ ] **AI panel empty state** – When no draft or no picks yet, panel shows message instead of bad params.

---

## Commissioner Center

- [ ] **Commissioner-only** – Commissioner tab visible only when isCommissioner; other users do not see tab.
- [ ] **League settings** – PATCH league (name, description, etc.) works for commissioner.
- [ ] **Draft controls** – POST draft returns acknowledged; no platform yet.
- [ ] **Waivers** – Pending count, Run waiver processing, settings view work.
- [ ] **Invite** – Get/regenerate invite; joinUrl displayed.
- [ ] **Operations** – Post to dashboard, orphan seeking, ranked visibility buttons call API and toast.
- [ ] **403 handling** – If commissioner check fails (e.g. 403), tab shows “Commissioner access denied” error.
- [ ] **Non-commissioner** – Calls to commissioner routes return 403; no tab shown.

---

## Multi-Sport

- [ ] **Waiver process** – No NFL-only logic in process-engine or roster-utils.
- [ ] **Players list** – Uses league.sport and SportsPlayer; works for configured sports.
- [ ] **Commissioner / mock** – No sport assumption in commissioner or mock setup; sport is a config field.

---

## Sign-off

- [ ] All critical paths above exercised.
- [ ] Notes: _______________________________________________
