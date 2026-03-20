# Prompt 13: Default Scoring Templates for Soccer + NFL IDP

**Status:** ✅ COMPLETE  
**Test Coverage:** 48/48 tests passing  
**Integration Level:** Full (DB seeding → template resolver → fantasy calculator)  
**Backward Compatibility:** ✅ Existing scoring templates preserved

---

## Executive Summary

Prompt 13 implements comprehensive default scoring templates for **Soccer** and **NFL IDP** (Individual Defensive Players), enabling leagues of both sports to initialize with pre-configured scoring rules. The implementation discovered and verified existing infrastructure that was already in place, confirming:

- **Soccer scoring** with 14 canonical stat keys (goal, assist, clean sheet, saves, etc.)
- **NFL IDP scoring** with 3 preset variants (balanced, tackle-heavy, big-play-heavy) supporting both offensive and defensive player scoring
- **Template resolution** that correctly handles league variants and preset selection
- **Fantasy point calculation** engine that applies rules to player statistics

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      League Creation                            │
│                                                                   │
│  leagueSettings { leagueVariant: 'SOCCER' | 'IDP' | ... }      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Scoring Template Resolution                         │
│                                                                   │
│  resolveDefaultScoringTemplate(sport, options)                  │
│  - Consults league settings & variants                          │
│  - Resolves IDP preset (balanced/tackle_heavy/big_play_heavy)  │
│  - Applies formatType normalization (IDP → IDP-balanced)       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Scoring Defaults Registry (In-Memory + DB)             │
│                                                                   │
│  ScoringDefaultsRegistry.ts                                     │
│  - SOCCER_STANDARD: 14 stat keys                               │
│  - NFL_IDP_RULES: Balanced, Tackle-Heavy, Big-Play-Heavy      │
│  - REGISTRY: Indexed lookup by sport/format                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         League Scoring Configuration Bootstrap                 │
│                                                                   │
│  - Create ScoringTemplate record in DB                          │
│  - Create ScoringRule records (one per stat)                   │
│  - Enable LeagueScoringOverride for customization             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Fantasy Point Calculation                          │
│                                                                   │
│  computeFantasyPoints(playerStats, scoringTemplate)            │
│  - Applies rules to match statistics                           │
│  - Returns total points + optional breakdown                   │
│  - Used by: live scoring, projections, matchup engine          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Soccer Scoring Template

### Official Soccer Rules (SOCCER-standard)

**Stat Keys:** 14 canonical metrics

| Stat Key | Points | Position Impact | Description |
|---|---|---|---|
| `goal` | +6 | Forwards, Midfielders | Goal scored |
| `assist` | +3 | All field players | Pass leading to goal |
| `shot_on_target` | +0.5 | Forwards, Midfielders | Accurate shot on goal |
| `shot` | +0.2 | All players | Any shot attempt |
| `key_pass` | +0.5 | All field players | Pass creating goal opportunity |
| `clean_sheet` | +4 | Defenders, Goalkeepers | Team allows 0 goals |
| `goal_allowed` | -1 | All players | Team concedes goal |
| `save` | +0.5 | Goalkeepers | Shot blocked/saved |
| `penalty_save` | +5 | Goalkeepers | Saved penalty kick |
| `penalty_miss` | -2 | All players | Failed penalty attempt |
| `yellow_card` | -1 | All players | Caution/warning |
| `red_card` | -3 | All players | Ejection from match |
| `own_goal` | -2 | All players | Scored against own team |
| `minutes_played` | +0.02 | All players | Per-minute participation value |

### Position Eligibility

```typescript
// GK → Goalkeeper position
- Primary scorers: Saves, saves, clean sheet, goal_allowed
- Secondary: Minutes played, yellow/red cards

// Defenders (CB, LB, RB)
- Primary: Clean sheet, goal_allowed, shots, key passes
- Secondary: Minutes played, cards, tackles (not in template)

// Midfielders (CM, CDM, CAM, LM, RM)
- Primary: Goals, assists, shots, key passes
- Secondary: Clean sheet (defensive MF), minutes, cards

// Forwards (ST, CF, LW, RW)
- Primary: Goals, assists, shots, shots on target
- Secondary: Key passes, minutes, cards
```

### Example Scoring Scenarios

**Scenario 1: Striker with 2 goals, 1 assist, 2 shots on target, 90 minutes**
```
Points = (2 × 6) + (1 × 3) + (2 × 0.5) + (90 × 0.02)
       = 12 + 3 + 1 + 1.8
       = 17.8 points
```

**Scenario 2: Clean sheet defender with yellow card, 90 minutes**
```
Points = 1 × 4 + 1 × (-1) + (90 × 0.02)
       = 4 - 1 + 1.8
       = 4.8 points
```

**Scenario 3: Goalkeeper with 4 saves, clean sheet, 90 minutes**
```
Points = (4 × 0.5) + (1 × 4) + (90 × 0.02)
       = 2 + 4 + 1.8
       = 7.8 points
```

---

## NFL IDP Scoring Templates

### Overview

IDP templates support **both offensive and defensive player scoring**, enabling single league to manage all player types without DST. Three presets available for different league preferences.

### Offensive Stats (All IDP Variants)

| Stat Key | PPR | half-PPR | Standard | IDP |
|---|---|---|---|---|
| `passing_yards` | — | — | — | +0.04 |
| `passing_td` | — | — | — | +4 |
| `passing_2pt` | — | — | — | +2 |
| `interception` | — | — | — | -2 |
| `rushing_yards` | — | — | — | +0.1 |
| `rushing_td` | — | — | — | +6 |
| `rushing_2pt` | — | — | — | +2 |
| `receptions` | — | — | — | +1 |
| `receiving_yards` | — | — | — | +0.1 |
| `receiving_td` | — | — | — | +6 |
| `receiving_2pt` | — | — | — | +2 |
| `fumble_lost` | — | — | — | -2 |

### Defensive Stats — IDP-Balanced Preset (DEFAULT)

| Stat Key | Points | Typical Players | Description |
|---|---|---|---|
| `idp_solo_tackle` | +1 | All defenders | Solo tackle participation |
| `idp_assist_tackle` | +0.5 | LB, S | Assisted tackle |
| `idp_tackle_for_loss` | +2 | DE, DT, LB | Tackle behind line of scrimmage |
| `idp_qb_hit` | +1 | DE, DT | Tackle of QB |
| `idp_sack` | +4 | DE, DT, LB, Edge | Sack of QB (2+ yard loss) |
| `idp_interception` | +3 | CB, S | Pass interception |
| `idp_pass_defended` | +1 | CB, S | Pass breakup/defended |
| `idp_forced_fumble` | +3 | DE, DT, LB, CB | Caused fumble |
| `idp_fumble_recovery` | +2 | All defenders | Recovered fumble |
| `idp_defensive_touchdown` | +6 | All defenders | Defensive/return TD |
| `idp_safety` | +2 | All defenders | Safety scored |

### Defensive Stats — IDP-Tackle-Heavy Preset

Emphasizes tackle volume for IDP-loving leagues:

| Stat Key | Balanced | Tackle-Heavy | Delta |
|---|---|---|---|
| `idp_solo_tackle` | +1.0 | +1.5 | +50% |
| `idp_assist_tackle` | +0.5 | +0.75 | +50% |
| `idp_sack` | +4.0 | +3.0 | -25% |
| `idp_interception` | +3.0 | +2.0 | -33% |
| `idp_forced_fumble` | +3.0 | +2.0 | -33% |
| `idp_defensive_touchdown` | +6.0 | +4.0 | -33% |

**Ideal For:** Leagues wanting high-volume defensive scoring (ILB, MLB, Safety-heavy rotations)

### Defensive Stats — IDP-Big-Play-Heavy Preset

Emphasizes sacks, INTs, and defensive TDs:

| Stat Key | Balanced | Big-Play-Heavy | Delta |
|---|---|---|---|
| `idp_solo_tackle` | +1.0 | +0.5 | -50% |
| `idp_assist_tackle` | +0.5 | +0.25 | -50% |
| `idp_sack` | +4.0 | +5.0 | +25% |
| `idp_interception` | +3.0 | +5.0 | +67% |
| `idp_pass_defended` | +1.0 | +1.5 | +50% |
| `idp_forced_fumble` | +3.0 | +4.0 | +33% |
| `idp_defensive_touchdown` | +6.0 | +8.0 | +33% |

**Ideal For:** Leagues wanting explosive defensive scoring (DE, CB, S-heavy rotations)

### Example IDP Scoring Scenarios

**Scenario 1: Linebacker, Balanced Preset, 8 solo, 4 assist, 2 sacks, 1 INT**
```
Points = (8 × 1.0) + (4 × 0.5) + (2 × 4.0) + (1 × 3.0)
       = 8 + 2 + 8 + 3
       = 21 points
```

**Scenario 2: Cornerback, Big-Play-Heavy, 5 solo, 2 PD, 1 INT**
```
Points = (5 × 0.5) + (2 × 1.5) + (1 × 5.0)
       = 2.5 + 3 + 5
       = 10.5 points
```

**Scenario 3: Edge Rusher, Tackle-Heavy, 6 solo, 2 TFL, 1.5 sacks**
```
Points = (6 × 1.5) + (2 × 2.0) + (1.5 × 3.0)
       = 9 + 4 + 4.5
       = 17.5 points
```

---

## Template Resolution Logic

### Soccer Resolution

```typescript
// Soccer always uses 'standard' format
const template = resolveDefaultScoringTemplate('SOCCER', {
  leagueSettings: { leagueVariant: 'SOCCER' },
  formatType: 'standard'  // Optional, overrides default
})

// Result: SOCCER_STANDARD template (14 rules)
```

### IDP Variant Resolution

```typescript
// Case 1: IDP variant without preset (defaults to balanced)
const template1 = resolveDefaultScoringTemplate('NFL', {
  leagueSettings: { leagueVariant: 'IDP' }
})
// Result: NFL_IDP_RULES (balanced variant)

// Case 2: IDP variant with explicit preset
const template2 = resolveDefaultScoringTemplate('NFL', {
  leagueSettings: {
    leagueVariant: 'IDP',
    idpScoringPreset: 'big_play_heavy'
  }
})
// Result: NFL_IDP_BIG_PLAY_HEAVY template

// Case 3: Direct format specification
const template3 = resolveDefaultScoringTemplate('NFL', {
  formatType: 'IDP-tackle_heavy'
})
// Result: NFL_IDP_TACKLE_HEAVY template

// Case 4: DYNASTY_IDP variant (also supported)
const template4 = resolveDefaultScoringTemplate('NFL', {
  leagueSettings: {
    leagueVariant: 'DYNASTY_IDP',
    idpScoringPreset: 'tackle_heavy'
  }
})
// Result: NFL_IDP_TACKLE_HEAVY template
```

---

## Database Schema Integration

### ScoringTemplate Table
```typescript
{
  id: string                    // Template ID
  sportType: 'SOCCER' | 'NFL'   // Sport
  formatType: string            // Format name (standard, IDP, IDP-balanced, etc.)
  templateId: string            // Composite key: default-{SPORT}-{format}
  name: string                  // Human-readable name
  description: string           // Description for UI/admin
  createdAt: Date
  updatedAt: Date
}
```

### ScoringRule Table (Many per template)
```typescript
{
  id: string                    // Rule ID
  scoringTemplateId: string     // FK to ScoringTemplate
  statKey: string               // Canonical stat key (goal, idp_sack, etc.)
  pointsValue: number           // Points awarded/deducted
  multiplier: number            // Multiplier (usually 1.0)
  enabled: boolean              // Can be disabled per-template
  description: string           // For UI display
}
```

### LeagueScoringOverride Table (Per-league customization)
```typescript
{
  id: string                    // Override ID
  leagueId: string              // FK to League
  statKey: string               // Stat key being overridden
  pointsValue: number           // New point value
  enabled: boolean              // Enable/disable this stat
  createdAt: Date
  updatedAt: Date
}
```

---

## Integration Points

### 1. League Creation Bootstrap

When a league is created with Soccer or IDP variant:

```typescript
// During league creation
if (leagueSettings.leagueVariant === 'SOCCER') {
  const template = resolveDefaultScoringTemplate('SOCCER', leagueSettings)
  await createLeagueScoringTemplate(leagueId, template)
} else if (leagueSettings.leagueVariant === 'IDP') {
  const preset = leagueSettings.idpScoringPreset || 'balanced'
  const template = resolveDefaultScoringTemplate('NFL', {
    leagueSettings: { leagueVariant: 'IDP', idpScoringPreset: preset }
  })
  await createLeagueScoringTemplate(leagueId, template)
}
```

### 2. Live Scoring Pipeline

When match statistics arrive:

```typescript
// Resolve scoring rules for league
const rules = await getLeagueScoringRules(leagueId, sport, formatType)

// Calculate fantasy points
const playerPoints = computeFantasyPoints(playerStats, rules)

// Record in matchup
await recordPlayerScore(matchupId, playerId, playerPoints)
```

### 3. AI Context Building

When preparing context for AI systems:

```typescript
// Get scoring summary for AI model
const scoringContext = getScoringContextForAI(sport, formatType)

// Include in prompt
const aiPrompt = `
League Information:
${scoringContext}
...
`
```

### 4. League Settings UI

When displaying league settings to user:

```typescript
// Get supported formats
const formats = getSupportedScoringFormats(sport)

// Display options in UI
// Soccer: ['standard']
// NFL: ['PPR', 'half_ppr', 'standard', 'IDP', 'IDP-balanced', ...]
```

---

## API Reference

### ScoringDefaultsRegistry

```typescript
// Get template definition
getDefaultScoringTemplate(
  sport: string,
  formatType?: string
): ScoringTemplateDefinition

// Resolve template with league logic
resolveDefaultScoringTemplate(
  sport: string,
  options: {
    leagueSettings?: LeagueSettings
    formatType?: string
  }
): ScoringTemplateDefinition

// Get array of rules
getDefaultScoringRules(
  sport: string,
  formatType?: string
): ScoringRuleDefinition[]

// Get supported formats for sport
getSupportedScoringFormats(
  sport: string
): string[]

// Get AI context string
getScoringContextForAI(
  sport: string,
  formatType: string
): string
```

### FantasyPointCalculator

```typescript
// Calculate total points
computeFantasyPoints(
  playerStats: Record<string, number>,
  rules: ScoringRuleDefinition[]
): number

// Calculate with per-stat breakdown
computeFantasyPointsWithBreakdown(
  playerStats: Record<string, number>,
  rules: ScoringRuleDefinition[]
): { total: number; breakdown: Record<string, number> }
```

### ScoringTemplateResolver (Multi-sport)

```typescript
// Get template from DB or registry
getScoringTemplate(
  sport: string,
  formatType: string
): Promise<ScoringTemplate>

// Get effective rules with overrides
getLeagueScoringRules(
  leagueId: string,
  sport: string,
  formatType: string
): Promise<ScoringRuleDefinition[]>
```

---

## Test Coverage

### Test File: `__tests__/prompt13-scoring-templates-soccer-idp.test.ts`

**Total Tests:** 48/48 passing ✅

#### Coverage Breakdown

1. **Soccer Scoring Template Definitions (6 tests)**
   - ✅ Provides Soccer standard template with expected stat keys
   - ✅ Defines stat point values (positive for good plays)
   - ✅ Defensive penalties with negative points
   - ✅ Minutes played included for per-match value
   - ✅ All 14 stat keys present
   - ✅ Only format is standard

2. **Soccer Scoring Calculation (5 tests)**
   - ✅ Striker scenario (goals + assists + shots)
   - ✅ Defender scenario (clean sheet + passing)
   - ✅ Goalkeeper scenario (saves + clean sheet)
   - ✅ Penalty application (red card + own goal)
   - ✅ Per-stat breakdown accuracy

3. **NFL IDP Template Definitions (8 tests)**
   - ✅ Balanced preset with offensive + defensive rules
   - ✅ Offensive stats included
   - ✅ All defensive stat keys present
   - ✅ Tackle scoring lower than big plays
   - ✅ Tackle-heavy preset support
   - ✅ Big-play-heavy preset support
   - ✅ Multiple format options
   - ✅ Offensive and defensive rules combined

4. **NFL IDP Calculation (5 tests)**
   - ✅ Offensive + defensive points combined
   - ✅ Defender points (balanced preset)
   - ✅ Defender points (tackle-heavy preset)
   - ✅ Defender points (big-play-heavy preset)
   - ✅ Per-stat breakdown

5. **Variant Resolution (7 tests)**
   - ✅ IDP variant → IDP-balanced
   - ✅ DYNASTY_IDP → IDP-balanced
   - ✅ IDP with tackle_heavy preset
   - ✅ IDP with big_play_heavy preset
   - ✅ Explicit formatType resolution
   - ✅ Soccer standard (no variant)
   - ✅ Soccer ignores IDP variant

6. **AI Context Strings (3 tests)**
   - ✅ Soccer context generation
   - ✅ IDP context generation
   - ✅ Point values in context

7. **Scoring Rules Access (3 tests)**
   - ✅ Default Soccer rules retrieval
   - ✅ Default IDP rules retrieval
   - ✅ Consistent structure across sports

8. **Integration (3 tests)**
   - ✅ Soccer live scoring scenario
   - ✅ IDP defender scenario
   - ✅ Both offensive and defensive players

9. **Compliance (4 tests)**
   - ✅ Canonical stat key format
   - ✅ Valid point values
   - ✅ Enabled flag on all rules
   - ✅ Registry version defined

10. **Edge Cases (4 tests)**
    - ✅ Unknown format handling
    - ✅ Zero stats = zero points
    - ✅ Disabled rules excluded
    - ✅ Unknown stats ignored

---

## Verification Checklist

- ✅ Soccer scoring template with 14 stat keys defined
- ✅ IDP balanced preset implemented with offensive + defensive stats
- ✅ IDP tackle-heavy preset for tackle emphasis
- ✅ IDP big-play-heavy preset for explosive plays
- ✅ Template resolution correctly handles league settings
- ✅ Format normalization working for IDP variants
- ✅ Fantasy point calculation engine functional
- ✅ Per-stat breakdown capability working
- ✅ AI context generation functional
- ✅ 48/48 tests passing with full coverage
- ✅ Backward compatibility with existing scoring templates
- ✅ Database schema ready for ScoringTemplate, ScoringRule storage
- ✅ LeagueScoringOverride mechanism enables per-league customization
- ✅ All 7 sports supported (Prompts 5-13 collectively)

---

## Known Limitations & Future Work

### Current Scope
- Scoring templates are in-memory defaults with DB fallback
- No UI for custom scoring rule creation (uses overrides)
- AI context limited to summary format (not sentence-based)

### Future Enhancements
- Custom scoring rule builder UI for league admins
- Live scoring stat ingestion pipeline (requires data feed integration)
- Scoring preset clone/modify functionality
- Multi-league scoring template sharing
- Historical scoring calculation (stat correction handling)

---

## Related Documentation

- **Prompt 5 (Sport Defaults):** Core league and roster defaults
- **Prompt 7 (Roster Templates):** Default roster slot configurations
- **Prompt 12 (Roster Templates Soccer+IDP):** Roster template architecture for both sports
- **League Creation Flow:** Uses scoring templates from Prompt 13 during bootstrap

---

## Summary

**Prompt 13** successfully implements **default scoring templates for Soccer and NFL IDP**, providing:

✅ **14 Soccer stat keys** with balanced positive/negative values  
✅ **3 IDP presets** (balanced, tackle-heavy, big-play-heavy) with 11 defensive + 12 offensive stats  
✅ **Intelligent template resolution** using league variants and presets  
✅ **Fantasy point calculator** with per-stat breakdown  
✅ **Full test coverage** with 48/48 tests passing  
✅ **Database integration** ready for LeagueScoringOverride customization  
✅ **AI context generation** for scoring information in prompts  

The system enables multi-sport fantasy football leagues to initialize with appropriate scoring rules, calculate live player points, and allow leagues to customize rules as needed. All implementation discoveries verified that existing codebase infrastructure fully supports these requirements.

**Test Status:** ✅ ALL TESTS PASSING (48/48)
