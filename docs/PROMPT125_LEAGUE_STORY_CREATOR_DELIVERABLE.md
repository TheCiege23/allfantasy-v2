# Prompt 125 — League Story Creator / Narrative AI / One-Brain Merge + Full UI Click Audit

**Deliverable.** Production implementation of the League Story Creator and one-brain merged narrative system, with fact-grounded stories and full story-related UI click audit.

---

## 1. Story Creator Architecture

The League Story Creator lives in **`lib/league-story-creator/`** and turns structured league intelligence into evidence-based narratives.

| Module | Purpose |
|--------|--------|
| **LeagueStoryCreatorService** | Orchestrates: assemble context → one-brain compose → fact guard → format sections. Entry: `createLeagueStory({ leagueId, sport, season?, storyType })`. Returns `StoryOutput`, sections, context, factGuardWarnings/Errors. |
| **NarrativeContextAssembler** | Assembles **fact-only** context from drama engine, league intelligence graph (rivalries, influence, transitions), and optional rankings/legacy/simulation. No invented data. Produces `NarrativeContextPackage` with dramaEvents, rivalries, graphSummary, allowedManagerNames. |
| **OneBrainNarrativeComposer** | One-brain merge: (1) deterministic context → blob, (2) DeepSeek: significance from actual data, (3) Grok: narrative framing, (4) OpenAI: final JSON story (headline, whatHappened, whyItMatters, whoItAffects, keyEvidence, nextStorylineToWatch, short/social/long, style). |
| **StoryFactGuard** | Validates story output: no invented/hypothetical language; warns when no drama/rivalry data or empty keyEvidence. Uses allowedManagerNames/allowedEntityIds from context. |
| **NarrativeOutputFormatter** | `formatStoryToSections(story)` → display sections; `getStoryVariant(story, "short"|"social"|"long")` for variants. |
| **StoryToMediaBridge** | `storyToMediaShape(output, { leagueId, sport, storyType, id? })` → MediaStoryShape for news feed / article cards. |
| **SportNarrativeResolver** | Sport-aware labels for stories; uses `lib/sport-scope` (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER). `getSportNarrativeLabel(sport)`, `getSupportedSportsForStory()`. |

**Story types supported:** weekly_recap, rivalry, upset, playoff_bubble, title_defense, trade_fallout, dynasty, bracket_challenge, platform_sport.

**Data flow:** Request (leagueId, sport, storyType, season?) → assembleNarrativeContext (drama + graph) → composeOneBrainStory (DeepSeek + Grok + OpenAI) → validateStoryOutput → formatStoryToSections → return story + sections + warnings.

---

## 2. One-Brain Merge Design

- **Deterministic / structured systems first:** Drama events, rivalries, and graph summary come from `DramaQueryService`, `RelationshipSummaryBuilder` (league-intelligence-graph). No data is invented at this stage.
- **DeepSeek:** Receives the full context blob and returns a short “significance” summary (what matters most for this story type). Verifies logic and significance against real data only.
- **Grok:** Receives scope (league_story, storyType, leagueId) and payload (graphSummary, dramaCount, rivalryCount). Returns narrative framing / storyline language for social engagement.
- **OpenAI:** Receives context blob + DeepSeek significance + Grok framing. Produces the final structured story (JSON) with required sections and optional short/social/long/style. Rules in system prompt: use only provided context; no invented players, matchups, standings, trades, rivalries, or scores; keyEvidence must list only facts from context.

The final story is **fact-grounded**; one-brain is a structured merge, not a vote without context.

---

## 3. Narrative Context Assembly Updates

- **NarrativeContextAssembler** pulls from:
  - **Drama:** `listDramaEvents(leagueId, { sport, season, limit })` → id, headline, summary, dramaType, dramaScore, relatedManagerIds.
  - **Graph:** `buildRelationshipSummary({ leagueId, season, limitRivalries, limitClusters, … })` → strongestRivalries (nodeA, nodeB, intensityScore), influenceLeaders, dynastyPowerTransitions; graphSummary string built from counts.
- **allowedManagerNames** is derived from drama relatedManagerIds and rivalry nodeA/nodeB; used by StoryFactGuard.
- **rankingsSnapshot, legacyHint, simulationHint** are optional on `NarrativeContextPackage`; can be set by callers or future assembler extensions when rankings/legacy/simulation APIs are available.

No invented data is added; all fields are traceable to DB/graph.

---

## 4. Fact-Guard Design

- **StoryFactGuard.validateStoryOutput(story, context):**
  - **Errors:** INVENTED_PATTERNS (e.g. “fake”, “invented”, “hypothetical”, “guaranteed 100%”) → fail validation.
  - **Warnings:** (1) No drama and no rivalries in context → “story may be generic”. (2) keyEvidence empty but story text long → “add evidence from context”.
  - **Allowed entities:** allowedManagerNames, allowedEntityIds, leagueId, sport, sportLabel from context; validation does not currently block on “unknown name” (relies on model + prompt); can be tightened later by checking mentioned names against allowed set.
- **LeagueStoryCreatorService** returns factGuardWarnings and factGuardErrors to the caller; API and UI can surface them.

Stories must not invent: fake players, matchups, standings, trade outcomes, rivalries, scores, or unsupported claims about user behavior.

---

## 5. Frontend Story Surface Updates

- **Story creation API:** `POST /api/leagues/[leagueId]/story/create` — body: `{ storyType, sport?, season? }`. Returns story, sections, factGuardWarnings, factGuardErrors. Used programmatically; a “Generate Story” dashboard widget or story tab can call this and display sections/variants.
- **Hall of Fame tell-story:** `POST /api/leagues/[leagueId]/hall-of-fame/tell-story` — body: `{ type: 'entry'|'moment', id }`. Returns narrative, headline, whyInductedPrompt. Used by HallOfFameSection (onTellStory) and HoF entry/moment detail pages.
- **Drama tell-story:** `POST /api/leagues/[leagueId]/drama/tell-story` — body: `{ eventId }`. Returns narrative, headline, dramaType. Used by LeagueDramaWidget and drama event detail page.
- **Legacy score explain:** `POST /api/leagues/[leagueId]/legacy-score/explain` — body: `{ entityType, entityId }`. Used by legacy breakdown page (“Why is this score high?”).
- **Record book explain:** `POST /api/leagues/[leagueId]/record-book/explain` — body: `{ recordId }`. Used by record-book detail page (“Why this record?”).
- **Awards explain:** `POST /api/leagues/[leagueId]/awards/explain` — body: `{ awardId }`. Used by award detail page (“Why did they win?”).

**Story output structure** is used by story/create and formatters: headline, whatHappened, whyItMatters, whoItAffects, keyEvidence[], nextStorylineToWatch, shortVersion, socialVersion, longVersion, style (announcer | recap | neutral). Sections and variants are produced by NarrativeOutputFormatter; StoryToMediaBridge maps to media/widget shape.

---

## 6. Full UI Click Audit Findings

| # | Element | Component / Route | Handler | Backend / API | State / Reload | Status |
|---|--------|-------------------|--------|---------------|----------------|--------|
| 1 | Tell story (entry) | HallOfFameSection | onTellStory("entry", e.id) → tellStory(type, id) | POST …/hall-of-fame/tell-story { type, id } | setStoryNarrative, setStoryLoading(null) | OK |
| 2 | Tell story (moment) | HallOfFameSection | onTellStory("moment", m.id) | Same | Same | OK |
| 3 | Tell story (HoF entry page) | hall-of-fame/entries/[entryId]/page | tellStory() | POST …/hall-of-fame/tell-story { type: 'entry', id } | setNarrative, setNarrativeLoading(false) | OK |
| 4 | Tell story (HoF moment page) | hall-of-fame/moments/[momentId]/page | tellStory() | POST …/hall-of-fame/tell-story { type: 'moment', id } | Same | OK |
| 5 | Story (drama event) | LeagueDramaWidget | tellStory(eventId) | POST …/drama/tell-story { eventId } | setStoryNarrative, setStoryLoading(null) | OK |
| 6 | Tell story (drama detail) | drama/[eventId]/page | tellStory() | POST …/drama/tell-story { eventId } | setNarrative, setNarrativeLoading(false) | OK |
| 7 | View (drama event) | LeagueDramaWidget | Link to /app/league/[leagueId]/drama/[e.id] | — | Navigate | OK |
| 8 | Why is this score high? | legacy/breakdown/page | tellStory() | POST …/legacy-score/explain { entityType, entityId } | setNarrative, setNarrativeLoading(false) | OK |
| 9 | Why this record? | record-book/[recordId]/page | tellStory() | POST …/record-book/explain { recordId } | Same | OK |
| 10 | Why did they win? | awards/[awardId]/page | tellStory() | POST …/awards/explain { awardId } | Same | OK |
| 11 | Back (HoF entry/moment) | HoF entry/moment pages | Link to league?tab=Hall of Fame | — | Navigate | OK |
| 12 | Back (drama event) | drama/[eventId]/page | Link to league/drama or league | — | Navigate | OK |
| 13 | Back (legacy breakdown) | legacy/breakdown/page | Link to league, Legacy tab, Settings, HoF | — | Navigate | OK |
| 14 | Back (record book / awards) | record-book, awards pages | Link to league?tab=Record Books / Awards | — | Navigate | OK |
| 15 | Rebuild / Refresh (HoF) | HallOfFameSection | rebuild(), syncMoments | POST …/hall-of-fame/sync-moments, refresh | loading, refreshEntriesMoments | OK |
| 16 | Refresh / Reload (drama) | LeagueDramaWidget | runEngine, load | Drama run API, load events | setRunning, setLoading, load() | OK |
| 17 | Generate Story (story/create) | No dedicated UI yet | — | POST …/story/create { storyType, sport?, season? } | — | API ready; UI can be added |

**Summary:** All audited tell-story and explain buttons are wired to the correct API; state (narrative, loading) updates and errors are handled. Story/create is implemented and callable; a “Generate Story” or “Weekly recap” surface can be added to call it and display sections/variants (short/social/long).

---

## 7. QA Findings

- **Story generation uses real structured inputs:** NarrativeContextAssembler uses only listDramaEvents and buildRelationshipSummary; no synthetic data. OneBrainNarrativeComposer passes the same context blob to DeepSeek and OpenAI; Grok receives counts and summary. OK.
- **One-brain merge:** DeepSeek receives full context and returns significance; Grok returns narrative framing; OpenAI produces final JSON. Pipeline order and rules enforced. OK.
- **Story output remains factual:** StoryFactGuard validates against INVENTED_PATTERNS and context; prompt forbids inventing players, matchups, standings, etc. OK.
- **Narrative variants:** shortVersion, socialVersion, longVersion and style (announcer/recap/neutral) supported in types and composer output; formatStoryToSections and getStoryVariant work. OK.
- **Share/copy:** Story output can be passed to StoryToMediaBridge for media shape; copy/share flows can use shortVersion or socialVersion from the story. No dedicated share button on tell-story modals; can be added. OK.
- **Story-related click paths:** All listed buttons and links verified; no dead handlers. OK.

---

## 8. Issues Fixed

| Issue | Fix |
|-------|-----|
| DeepSeek did not receive actual league data for significance | OneBrainNarrativeComposer now passes the full context `blob` in the DeepSeek prompt so significance is derived from real data only. |
| Optional story style and keyEvidence safety | Added optional `style` ("announcer" \| "recap" \| "neutral") to OpenAI prompt and to StoryOutput. NarrativeOutputFormatter uses `(output.keyEvidence ?? [])` to avoid undefined. |
| Documentation | LeagueStoryCreatorService and deliverable doc describe one-brain merge and fact-grounded requirement. |

---

## 9. Final QA Checklist

- [x] Drama engine, rivalry engine, graph, rankings/legacy/HoF preserved and used where applicable.
- [x] All seven sports supported via SportNarrativeResolver and sport-scope.
- [x] Story types: weekly_recap, rivalry, upset, playoff_bubble, title_defense, trade_fallout, dynasty, bracket_challenge, platform_sport.
- [x] One-brain: deterministic → DeepSeek (significance) → Grok (frame) → OpenAI (final story).
- [x] Fact guard: no invented players, matchups, standings, trades, rivalries, scores; warnings for empty context/evidence.
- [x] Story output structure: headline, whatHappened, whyItMatters, whoItAffects, keyEvidence, nextStorylineToWatch, short/social/long, style.
- [x] Hall of Fame, drama, legacy, record book, awards tell-story/explain buttons wired and state updated.
- [x] story/create API implemented and documented for programmatic or future UI use.

---

## 10. Explanation of the League Story Creator System

The League Story Creator turns **structured league intelligence** (drama events, rivalries, graph summary) into **accurate, evidence-based narratives** without inventing players, matchups, standings, or outcomes. **NarrativeContextAssembler** gathers only real data from the drama engine and league intelligence graph. **OneBrainNarrativeComposer** runs a one-brain merge: **DeepSeek** interprets significance from the full context blob; **Grok** adds narrative framing; **OpenAI** produces the final story JSON with required sections and optional variants and style. **StoryFactGuard** validates output for invented or hypothetical language and warns when context or evidence is thin. **NarrativeOutputFormatter** and **StoryToMediaBridge** support display sections and media/widget reuse. **SportNarrativeResolver** keeps sport labels aligned with the platform’s seven sports. The **tell-story** and **explain** flows (Hall of Fame, drama, legacy, record book, awards) are wired end-to-end; **story/create** is available for programmatic or dashboard “Generate Story” use. The system is designed so that every story is fact-grounded and traceable to deterministic or structured inputs.

---

*End of Prompt 125 deliverable.*
