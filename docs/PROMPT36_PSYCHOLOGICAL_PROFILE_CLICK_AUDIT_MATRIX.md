# Prompt 36 — Psychological Profiles Click Audit Matrix

| ID | Surface | Clickable Element | Component / Route | Handler | State Update | API Wiring | Cache/Reload | Status |
|---|---|---|---|---|---|---|---|---|
| P01 | Dashboard entry | Open profile dashboard | `app/app/league/[leagueId]/psychological-profiles/page.tsx` | route nav | page state init | profile list GET | no-store fetch | PASS |
| P02 | Settings panel | Build behavior profiles | `components/app/settings/BehaviorProfilesPanel.tsx` | `buildAll()` | `running/result/error` | POST `/psychological-profiles/run-all` | refresh + reload list | PASS |
| P03 | Settings panel | Refresh profiles | `BehaviorProfilesPanel` | `loadProfiles()` | `loading/profiles/error` | GET `/psychological-profiles` | no-store | PASS |
| P04 | Filters | Sport filter | `BehaviorProfilesPanel` | `setSportFilter` | triggers reload | `sport` query | no-store | PASS |
| P05 | Filters | Season filter | `BehaviorProfilesPanel` | `setSeasonFilter` | triggers reload | `season` query + run body | no-store | PASS |
| P06 | Profile card | Profile details link | `BehaviorProfilesPanel` | `Link` nav | route change | GET `[profileId]?includeEvidence=1` | refresh button available | PASS |
| P07 | Profile card | Why this profile? link | `BehaviorProfilesPanel` | `Link` nav | route change | GET `[profileId]/evidence` | season filter + refresh | PASS |
| P08 | Profile card | Explain this manager style | `BehaviorProfilesPanel` | `explain(profileId)` | `explainByProfile` | POST `/psychological-profiles/explain` | toggle hide/show | PASS |
| P09 | Comparison | Manager selector A | `BehaviorProfilesPanel` | `setCompareAId` | compare link state | compare query on route open | n/a | PASS |
| P10 | Comparison | Manager selector B | `BehaviorProfilesPanel` | `setCompareBId` | compare link state | compare query on route open | n/a | PASS |
| P11 | Comparison | Compare selected managers | `BehaviorProfilesPanel` | compare `Link` | route change | GET `/psychological-profiles?managerAId&managerBId` | no-store | PASS |
| P12 | Compare page | Sport filter | `app/app/league/[leagueId]/psychological-profiles/compare/page.tsx` | `setSportFilter` | reload list + comparison | GET list + compare | no-store | PASS |
| P13 | Compare page | Manager A selector | compare page | `setManagerAId` | reload comparison | GET compare query | no-store | PASS |
| P14 | Compare page | Manager B selector | compare page | `setManagerBId` | reload comparison | GET compare query | no-store | PASS |
| P15 | Compare page | Back link | compare page | `Link` nav | route change | none | n/a | PASS |
| P16 | Detail page | Refresh | `app/app/league/[leagueId]/psychological-profiles/[profileId]/page.tsx` | `loadProfile()+loadEvidence()` | reload profile/evidence | GET detail + evidence | no-store | PASS |
| P17 | Detail page | Explain this manager style | detail page | `explain()` | `narrative` | POST explain | real-time response | PASS |
| P18 | Detail page | Season filter | detail page | `setSeasonFilter` | reload evidence | GET evidence with season | no-store | PASS |
| P19 | Detail page | Refresh evidence | detail page | `loadEvidence()` | `evidenceLoading/evidence` | GET `[profileId]/evidence` | no-store | PASS |
| P20 | Detail page | Back link | detail page | `Link` nav | route change | none | n/a | PASS |
| P21 | Manager card | Why this profile? | `components/ManagerPsychology.tsx` | fetch explain toggle | `explainNarrative` | POST explain | toggles inline | PASS |
| P22 | Manager card | Refresh profile | `ManagerPsychology` | `loadEngineProfile()` | `engineLoading/engineError` | GET `?managerId=...` | no-store | PASS |
| P23 | Manager card | Profile details link | `ManagerPsychology` | `Link` nav | route change | detail route API calls | refresh available | PASS |
| P24 | Badge/widget | Manager style badge click | `components/ManagerStyleBadge.tsx` | `Link` nav | route change | detail route API calls | no-store | PASS |
| P25 | Trade analyzer | Style context link | `components/PartnerMatchView.tsx` | `Link` nav | route change | compare route APIs | no-store | PASS |
| P26 | Draft tab | Tendencies widget refresh | `components/app/tabs/DraftTab.tsx` | `loadDraftBehavior()` | widget loading/error rows | GET profiles list | no-store | PASS |
| P27 | Draft tab | Open manager style comparison | `DraftTab` | `Link` nav | route change | compare route APIs | no-store | PASS |
| P28 | Loading/error states | Panel/detail/compare/widget | multiple | explicit state branches | loading + error render | all relevant APIs | retry paths present | PASS |

## Notes

- Season filtering is implemented for profile run inputs and evidence reads; profile list season filter relies on season-stamped evidence presence.
- AI explanations are model-backed with deterministic fallback messaging.
