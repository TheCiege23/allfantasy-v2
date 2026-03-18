# PROMPT 340 — Salary Cap League Frontend Deliverable

## File summary

| Label    | Relative path |
|----------|----------------|
| [NEW]    | `app/api/leagues/[leagueId]/salary-cap/summary/route.ts` |
| [NEW]    | `components/salary-cap/types.ts` |
| [NEW]    | `components/salary-cap/SalaryCapHome.tsx` |
| [NEW]    | `components/salary-cap/CapDashboard.tsx` |
| [NEW]    | `components/salary-cap/ContractsPage.tsx` |
| [NEW]    | `components/salary-cap/TeamBuilderView.tsx` |
| [NEW]    | `components/salary-cap/StartupAuctionView.tsx` |
| [NEW]    | `components/salary-cap/SalaryCapAIPanel.tsx` |
| [NEW]    | `components/salary-cap/SalaryCapRulesView.tsx` |
| [NEW]    | `components/salary-cap/index.ts` |
| [UPDATED]| `app/app/league/[leagueId]/page.tsx` |
| [UPDATED]| `components/app/tabs/OverviewTab.tsx` |

---

## Route updates

- **New API**: `GET /api/leagues/[leagueId]/salary-cap/summary` — returns config, myRosterId, ledger, futureProjection, contracts, expiringCount, extensionCandidatesCount, tagCandidatesCount, deadMoneyTotal, rookieContractCount, events, lottery. Requires auth; 404 if not a salary cap league.
- **App route unchanged**: League page remains `/app/league/[leagueId]` with `?tab=Overview`. When `leagueVariant === 'salary_cap'`, Overview tab renders `SalaryCapHome` instead of the default overview. No new app routes; all salary-cap views are internal panels within Overview.

---

## Component tree summary

```
app/app/league/[leagueId]/page.tsx
  └─ OverviewTab (leagueId, isGuillotine, isSalaryCap)
       └─ when isSalaryCap: SalaryCapHome (leagueId)

SalaryCapHome
  ├─ Header (branding: Salary Cap League, mode)
  ├─ Quick links (Chat, Waivers, Trades, Settings)
  ├─ View switcher (dropdown on mobile, tabs on desktop)
  │    Views: home | cap-dashboard | contracts | team-builder | draft | ai | rules
  ├─ [view=home] Summary cards (cap space, committed, dead money, contracts count)
  │    + Future cap projection list
  │    + Summaries (expiring, extension/tag candidates, rookie count)
  │    + Recent cap events
  │    + AI tools entry
  ├─ [view=cap-dashboard] CapDashboard
  │    └─ Current cap, committed, dead money, effective cap, rollover, warnings, future years
  ├─ [view=contracts] ContractsPage
  │    └─ Table: player, position, salary, years left, source, status
  ├─ [view=team-builder] TeamBuilderView
  │    └─ Best ball note, roster size, cap space, position balance
  ├─ [view=draft] StartupAuctionView
  │    └─ Startup/future draft type, holdback, lottery status
  ├─ [view=ai] SalaryCapAIPanel
  │    └─ AI tools list + link to Intelligence tab
  └─ [view=rules] SalaryCapRulesView
       └─ Cap, contract, draft settings + link to Settings tab
```

---

## QA checklist (mandatory click audit)

- [ ] **Cap dashboard opens** — From Salary Cap Overview home, switch view to "Cap Dashboard"; current cap, committed, dead money, effective cap, and future years display. Back returns to home.
- [ ] **Contract details open** — Switch to "Contracts"; table shows player, salary, years remaining, source, status. No dead buttons.
- [ ] **Extension / franchise tag previews** — Home view shows "Extension candidates" and "Franchise tag candidates" counts; Rules view shows Extensions / Franchise tag On/Off. (Full eligibility per contract can be added later via API.)
- [ ] **Future cap projections update** — After loading summary, "Future cap projection" and Cap Dashboard "Committed cap by future year" show correct data from API.
- [ ] **Startup auction recap** — Draft view shows startup draft type, future draft type, holdback; "Startup auction recap" copy points to Contracts.
- [ ] **Lottery screen** — When weighted lottery is enabled, Draft view shows lottery section and result summary if present.
- [ ] **Best ball mode UI** — When config.mode === 'bestball', Team Builder shows "Best Ball" and lineup-optimization note.
- [ ] **AI tools open** — AI view lists tools and "Open Intelligence tab" link works.
- [ ] **Mobile layout** — View switcher is a dropdown; sections stack; tables scroll horizontally on small screens.
- [ ] **Desktop layout** — View switcher is horizontal tabs; grid layouts (2–4 columns) for cards.
- [ ] **No dead cap-management buttons** — Every button (Back, Open Cap Dashboard, View all contracts, Open AI Tools, League Settings, etc.) navigates or switches view.

---

## Theme alignment

- Uses existing patterns: `rounded-2xl border border-white/10 bg-white/[0.03]`, `text-white/60`, `text-cyan-400`, `border-cyan-500/30 bg-cyan-950/30`, `border-amber-500/30 bg-amber-950/30`, `border-emerald-500/30` for salary-cap accent. Matches Guillotine home structure (header, quick links, sections, AI panel entry).

---

## Optional next steps

- Add `/public/salary-cap/salary-cap.png` and use in header if branding asset is ready.
- Add extension/franchise tag eligibility per contract (API + ContractsPage row actions).
- Wire AI panel to `POST /api/leagues/[leagueId]/salary-cap/ai` when that route exists (PROMPT 337/339).
- Add commissioner-only actions (run expiration, rollover, lottery) from Settings or a dedicated Commissioner tab.
