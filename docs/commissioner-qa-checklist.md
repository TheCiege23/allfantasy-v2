# Commissioner Control Center – QA Checklist

Use this to verify commissioner-only behavior and security.

---

## 1. Access & visibility

- [ ] **Commissioner tab** – Visible only when the current user is the league owner (`League.userId === session.user.id`). Not visible to other league members.
- [ ] **Check API** – `GET /api/commissioner/leagues/[leagueId]/check` returns `{ isCommissioner: true }` for owner and `false` for others.
- [ ] **Non-commissioner** – All `GET/POST/PATCH/DELETE` under `/api/commissioner/leagues/[leagueId]/*` return 403 for non-owner.

---

## 2. League management

- [ ] **PATCH league** – Commissioner can update `name`, `scoring`, `status`, `avatarUrl`, `rosterSize`, `leagueSize`, `starters` and settings keys: `description`, `lineupLockRule`, `publicDashboard`, `rankedVisibility`, `orphanSeeking`, `orphanDifficulty`.
- [ ] **No bypass** – Request body cannot update `userId`, `id`, or other protected fields (enforced by allowed-keys list).

---

## 3. Draft controls

- [ ] **POST draft** – Commissioner can POST `{ action: "pause" | "resume" | "reset_timer" | "undo_pick" | "assign_pick" | "reorder" }`. Returns acknowledged; platform wiring is stub.
- [ ] **Invalid action** – Returns 400 for unknown action.

---

## 4. Waiver controls

- [ ] **GET waivers** – `?type=pending` returns pending claims; `?type=history` returns processed claims/transactions; `?type=settings` returns waiver settings.
- [ ] **PUT waivers** – Commissioner can update waiver settings (waiverType, processingDayOfWeek, etc.).
- [ ] **POST waivers** – Commissioner can trigger manual waiver run; response includes processed count.
- [ ] **Existing behavior** – Existing `/api/waiver-wire/leagues/[leagueId]/claims` and `process` and `settings` still work; commissioner routes are an alternative with explicit commissioner check.

---

## 5. Lineup / roster

- [ ] **GET lineup** – Returns lineupLockRule and invalidRosters (stub empty).
- [ ] **POST lineup** – Commissioner can set `lineupLockRule`. `forceCorrectRosterId` returns 501 not supported.

---

## 6. Chat / broadcast

- [ ] **POST chat** – Action `broadcast` (with message), `pin` (with messageId), `remove_message`; broadcast/pin acknowledged; remove returns 501.
- [ ] **No cross-league** – LeagueId from route; commissioner check ensures scope.

---

## 7. League operations

- [ ] **post_to_dashboard** – Sets `settings.publicDashboard` to true/false.
- [ ] **set_orphan_seeking** – Sets `settings.orphanSeeking`.
- [ ] **set_ranked_visibility** – Sets `settings.rankedVisibility`.
- [ ] **update_orphan_difficulty** – Sets `settings.orphanDifficulty` (description string).

---

## 8. Managers

- [ ] **GET managers** – Returns teams and rosters for the league.
- [ ] **DELETE managers** – With rosterId returns 501 (not supported).

---

## 9. Invite

- [ ] **GET invite** – Returns inviteCode, inviteLink, joinUrl from league settings.
- [ ] **POST invite** – Regenerates invite code, stores in settings, returns new joinUrl.

---

## 10. Security

- [ ] **No admin escalation** – Commissioner routes never grant admin; only `League.userId` check.
- [ ] **Historical results** – No commissioner endpoint deletes or rewrites past waiver transactions, draft results, or locked scores.
- [ ] **Scope** – All mutations are scoped to `params.leagueId` and gated by `assertCommissioner`.

---

## 11. UI

- [ ] **Commissioner tab** – Loads pending claims, settings, invite, managers, lineup; shows Run waiver processing; Regenerate invite; League operations buttons.
- [ ] **Toasts** – Success/error toasts on waiver run, invite regenerate, operations.
- [ ] **No Commissioner tab** – When user is not commissioner, tab list does not include Commissioner.

---

## Sign-off

- [ ] All critical paths above passed.
- [ ] Notes: _______________________________________________
