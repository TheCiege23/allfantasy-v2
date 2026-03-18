# PROMPT 347 — Survivor League Frontend Deliverable

## Route updates

| Route | Method | Description |
|-------|--------|-------------|
| `app/api/leagues/[leagueId]/survivor/summary` | GET | Survivor league home summary: config, tribes (with members), council, challenges, jury, exile tokens, voted-out history, merged flag, myRosterId, myIdols, rosterDisplayNames. Query: `?week=N`. Returns 404 when league is not a survivor league. |

**League page and OverviewTab**

- `app/app/league/[leagueId]/page.tsx`: Sets `isSurvivor` from `leagueVariant === 'survivor'` (same fetch as guillotine/salaryCap). Passes `isSurvivor` to `OverviewTab`.
- `components/app/tabs/OverviewTab.tsx`: Accepts `isSurvivor?: boolean`; when true, renders `<SurvivorHome leagueId={leagueId} />` inside `TabDataState`.

---

## Component tree summary

```
OverviewTab (when isSurvivor)
  └── SurvivorHome
        ├── Header (Survivor branding)
        ├── Quick links (League Chat, Tribe Chat, Settings, AI Host, Waivers)
        ├── View switcher (mobile: dropdown; desktop: pills)
        └── Active panel (by view):
              ├── tribe-board  → SurvivorTribeBoard
              ├── challenge    → SurvivorChallengeCenter
              ├── council      → SurvivorTribalCouncilView
              │                    └── SurvivorCommandHelp (inline)
              ├── idols        → SurvivorIdolsView
              ├── exile        → SurvivorExileView
              ├── merge-jury   → SurvivorMergeJuryView
              └── ai           → SurvivorAIPanel
                                  └── SurvivorCommandHelp (compact)
```

**New files**

- `components/survivor/types.ts` — SurvivorSummary, SurvivorView, config/tribe/council/challenge types.
- `components/survivor/SurvivorHome.tsx` — Container: fetch summary, view state, switcher, render panel.
- `components/survivor/SurvivorTribeBoard.tsx` — Tribe overview, members, leader, attending council, active challenge status.
- `components/survivor/SurvivorChallengeCenter.tsx` — Active challenges (open/locked), result history.
- `components/survivor/SurvivorTribalCouncilView.tsx` — Countdown, voting instructions, command help, immunity note, voted-out history.
- `components/survivor/SurvivorIdolsView.tsx` — Private idols (myIdols), status key.
- `components/survivor/SurvivorExileView.tsx` — Exile summary, token standings, Boss/commissioner link to exile league.
- `components/survivor/SurvivorMergeJuryView.tsx` — Merge status, jury list, finale timeline.
- `components/survivor/SurvivorAIPanel.tsx` — Ask Chimmy, what to ask, command help, link to Intelligence tab.
- `components/survivor/SurvivorCommandHelp.tsx` — @Chimmy vote/play idol/submit challenge/confirm tribe decision.
- `components/survivor/index.ts` — Re-exports.

**Updated files**

- `app/app/league/[leagueId]/page.tsx` — isSurvivor state, pass to OverviewTab.
- `components/app/tabs/OverviewTab.tsx` — isSurvivor prop, render SurvivorHome when true.

---

## QA checklist (click audit)

- [ ] **Tribe chat** — "Tribe Chat" link goes to `?tab=Chat` (tribe filtering can be added later).
- [ ] **League chat** — "League Chat" link goes to `?tab=Chat`.
- [ ] **Private AI chat** — "AI Host" and "Open Chat" open Chat; "Full AI Tools" goes to Intelligence tab.
- [ ] **Challenge panel** — Challenge Center view shows open/locked challenges and history; submission count displays.
- [ ] **Submission status** — Shown in Challenge Center (submission count per challenge).
- [ ] **Voting help** — Tribal Council view shows voting instructions and SurvivorCommandHelp (compact); no dead "command help" buttons.
- [ ] **Idol views** — Idols & Advantages view shows "Your idols" and status key; private (myIdols only).
- [ ] **Exile Island** — Exile view shows token count, exile roster (token standings), return progress (tokens needed), Boss warning and link to exile league when configured.
- [ ] **Merge / Jury** — Merge & Jury view shows merge status, jury list, finale timeline.
- [ ] **Bestball mode** — Config.mode is returned; UI does not hide any panel for bestball (bestball-specific UI can be added later).
- [ ] **Mobile layout** — View switcher is dropdown; panels stack; no horizontal overflow.
- [ ] **Desktop layout** — View switcher is pills; panels use full width.
- [ ] **No dead buttons** — All quick links and view pills switch view or navigate; "Retry" reloads summary.
- [ ] **Survivor only** — When league is not survivor, summary API returns 404; OverviewTab does not render SurvivorHome.

---

## Supported sports

NFL, NBA, MLB, NHL, NCAA Basketball, NCAA Football, Soccer — no sport-specific UI in this deliverable; backend and config are sport-agnostic.
