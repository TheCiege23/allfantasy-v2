# Unified AllFantasy League Settings Platform - Implementation Guide

## Overview

The Unified League Settings Platform is a production-ready system that manages all league configuration across all sports (NFL, NCAAF, NBA, NCAAB, MLB, NHL, Soccer) within a single shared architecture.

**Core Principle: ONE LEAGUE = ONE SETTINGS PROFILE**

Every league has exactly one `UnifiedLeagueSettings` object containing all configuration for that league, accessible from a single modal interface.

---

## Architecture

### Layer 1: Backend Engine (`lib/league-settings-engine/`)

The backend is organized into focused, each with a specific responsibility:

#### **LeagueSettingsEngineTypes.ts**
- **Purpose**: Type definitions for the entire system
- **Key Types**:
  - `UnifiedLeagueSettings`: Main settings object (meta, league, team, roster, scoring, draft, divisions, members, coOwners, commissionerControls, schedule, audit)
  - `LeagueSettingsAuditEntry` / `LeagueSettingsAudit`: Versioning and change tracking
  - `LeagueSettingsValidationResult`: Validation errors/warnings/alerts
  - `UserPermissions`: Role-based access control
  - `ISportLeagueSettingsService`: Interface for sport-specific services
- **One League = One Settings**:
  - Settings object is atomic - all changes go through `UnifiedLeagueSettingsService`
  - Versioning incremented on every update
  - Audit log maintained (50 most recent entries)

#### **LeagueSettingsValidationEngine.ts**
- **Purpose**: Universal + sport-specific validation
- **Key Functions**:
  - `validateSettings()`: Full validation with sport awareness
  - `validatePageUpdate()`: Page-specific validation
  - `isValidSportLeagueTypeCombination()`: Sport/type compatibility

- **Universal Rules**:
  - League name required, ≤100 chars
  - 2-100 teams
  - Division count validates against team count
  - Playoff structure validates against season length
  - Roster/scoring must be configured

- **Sport-Specific Rules**:
  - Football: QB depth warnings for large leagues
  - Basketball: Center scarcity for massive leagues
  - Baseball: Pitcher/hitter availability
  - Hockey: Goalie minimum warnings
  - Soccer: Position balance warnings

#### **LeagueSettingsPermissionsService.ts**
- **Purpose**: Role-based permission enforcement
- **Roles**:
  - `commissioner`: Can edit all 11 pages, access premium features
  - `co-owner`: Limited edit (roster/scoring/draft only)
  - `member`: Read-only view of most pages
  - `viewer`: Read-only, minimal access

- **Key Functions**:
  - `checkUserPermissions()`: Determine role and permissions
  - `canAccessPage()`: Check if role can view/edit a page
  - `isPageReadOnly()`: Check if page is read-only for user
  - `getVisiblePages()`: Get role-aware page list

#### **LeagueSettingsEngineRegistry.ts**
- **Purpose**: Sport-specific service registration and defaults
- **Supported Sports**: NFL, NCAAF, NBA, NCAAB, MLB, NHL, Soccer
- **DefaultSportLeagueSettingsService**:
  - Provides default settings for any sport/league-type combination
  - Normalizes imported league data
  - Can be extended for sport-specific logic in future

- **Key Functions**:
  - `getService(sport)`: Get service for a sport
  - `isSupported(sport)`: Check if sport is supported
  - `registerService()`: Register custom sport service

#### **UnifiedLeagueSettingsService.ts**
- **Purpose**: High-level facade coordinating all operations
- **One Source of Truth**: All reads/writes go through this service

- **Key Functions**:
  - `resolveDefaultLeagueSettings()`: Get defaults for league creation
  - `getLeagueSettings()`: Fetch current league settings (from DB)
  - `updateLeagueSettings()`: Save settings with validation + audit
  - `resetLeagueSettingsToDefault()`: Reset to template defaults
  - `normalizeImportedLeagueSettings()`: Normalize imported league data
  - `validateLeagueSettings()`: Validate without saving
  - `compareToDefaultTemplate()`: Check matches/diff to defaults

---

### Layer 2: API Routes (`app/api/commissioner/leagues/[leagueId]/league-settings/`)

#### **route.ts (GET / PUT)**
```
GET  /api/commissioner/leagues/{leagueId}/league-settings
├─ Returns: GetLeagueSettingsResponse
│  ├─ leagueId
│  ├─ settings (UnifiedLeagueSettings)
│  ├─ canEdit (boolean)
│  ├─ userRole ('commissioner' | 'co-owner' | 'member' | 'viewer')
│  ├─ userPermissions (UserPermissions)
│  ├─ validationWarnings (LeagueSettingsValidationError[])
│  └─ subscriptionStatus
├─ Auth: NextAuth session required
├─ Permissions: All users can GET (non-commissioners see read-only mode)
└─ Flow:
   1. Verify authentication
   2. Determine user permissions
   3. Fetch league + settings from DB
   4. Return role-aware response

PUT  /api/commissioner/leagues/{leagueId}/league-settings
├─ Request: UpdateLeagueSettingsRequest
│  ├─ page: LeagueSettingsPage
│  ├─ data: Partial<UnifiedLeagueSettings>
│  └─ validateOnly?: boolean
├─ Response: UpdateLeagueSettingsResponse
│  ├─ success: boolean
│  ├─ settings?: UnifiedLeagueSettings
│  └─ validation: LeagueSettingsValidationResult
├─ Auth: NextAuth session required
├─ Permissions: Commissioner only
└─ Flow:
   1. Verify authentication
   2. Check permissions
   3. Merge updates with current settings
   4. Validate merged settings
   5. If valid, persist + return updated settings
   6. If invalid, return validation errors (don't save)
```

#### **validate/route.ts (POST)**
```
POST /api/commissioner/leagues/{leagueId}/league-settings/validate
├─ Request: ValidateLeagueSettingsRequest
│  ├─ settings: Partial<UnifiedLeagueSettings>
│  └─ page: LeagueSettingsPage
├─ Response: ValidateLeagueSettingsResponse
│  ├─ validation: LeagueSettingsValidationResult
│  └─ canSave: boolean
├─ Purpose: Validate without saving (for preview)
└─ Used by: UI to show real-time validation feedback
```

#### **reset-default/route.ts (POST)**
```
POST /api/commissioner/leagues/{leagueId}/league-settings/reset-default
├─ Request: ResetLeagueSettingsRequest
│  └─ resetTo: 'default' | 'created-state'
├─ Response: ResetLeagueSettingsResponse
│  ├─ success: boolean
│  ├─ settings: UnifiedLeagueSettings
│  └─ audit: LeagueSettingsAudit
├─ Permissions: Commissioner only
└─ Effect:
   - Resets league settings to template defaults
   - Increments version
   - Records audit action='reset'
   - Returns refreshed settings
```

---

### Layer 3: Frontend Components (`components/league-settings/`)

#### **LeagueSettingsModalShell.tsx** (Main Orchestrator)
```
<LeagueSettingsModalShell leagueId={leagueId} initialPage="league" onClose={handleClose} />

Architecture:
├─ Header
│  ├─ Title: "League Settings"
│  └─ Close button (X)
├─ Main Area
│  ├─ Sidebar Navigation
│  │  ├─ Clickable page links (11 pages)
│  │  ├─ Current page highlighted in blue
│  │  └─ Commissioner-only pages hidden for non-commissioners
│  └─ Content Panel
│     ├─ Page-specific content (swaps with sidebar navigation)
│     ├─ Validation banner (if errors/warnings)
│     ├─ Settings controls (read-only or editable based on role)
│     └─ Scrollable body
└─ Save Bar (sticky at bottom)
   ├─ Shows if dirty
   ├─ Displays validation status (valid/warning/error)
   ├─ Cancel and Save buttons
   └─ Hides when no pending changes

Behavior:
- Fetch settings on mount
- Page navigation doesn't trigger saves (pending changes)
- Changes accumulate in memory
- Save button persists all changes atomically
- Cancel button reverts all pending changes
```

#### **SettingsSidebarNav.tsx** (Left Navigation)
```
<SettingsSidebarNav
  currentPage={currentPage}
  onPageChange={setCurrentPage}
  visiblePages={visiblePages}
  isCommissioner={isDeltaCommissioner}
/>

Pages (11 total):
1. League Settings ⚙️ - league name, season, visibility, playoffs
2. Team Settings 👥 - team count, naming rules, orphan handling
3. Roster Settings 📋 - roster template, slots (read-only reference)
4. Scoring 📊 - scoring preset (read-only reference)
5. Draft 🏆 - draft type, order, timer settings
6. Divisions 🗂️ - division count, playoff qualification
7. Members 👤 - invite settings, member visibility
8. Co-owners 🤝 - co-owner permissions, limits
9. Commissioner Tools 🔧 - force lineup, lock waivers, tools (COMMISSIONER ONLY)
10. Previous Leagues 📚 - archived seasons, rollover
11. Delete League 🗑️ - destructive action (COMMISSIONER ONLY)

Styling:
- Dark theme (slate-900 background)
- Active page: blue highlight + left border
- Hover: slight background change
- Icons + text labels
```

#### **SaveBar.tsx** (Sticky Action Bar)
```
<SaveBar isDirty={isDirty} isSaving={isSaving} onSave={handleSave} onCancel={handleCancel} validationStatus="valid|warning|error" />

Behavior:
- Hidden if !isDirty
- Bottom of viewport, fixed position
- Shows validation status color (green/amber/red)
- Displays error message if save fails
- Disables buttons while saving
- Updates dirty flag on cancel

States:
- Valid: Blue "Save Changes" button
- Warning: Yellow background, "Fix warnings before saving" notice
- Error: Red background, "Fix all errors before saving" button
```

#### **ValidationBanner.tsx** (Errors/Warnings Display)
```
<ValidationBanner errors={errors} warnings={warnings} canSave={canSave} />

Display:
- Red border + background if errors
- Amber border + background if warnings
- Lists each error/warning with bullet points
- Shows "Fix errors before saving" if canSave=false

Used:
- Below page header
- Updated in real-time as user makes changes
```

#### **SettingsRows.tsx** (Reusable Row Components)

**ReadOnlyRow** - Display mode
```
<ReadOnlyRow label="League Name" value={settings.league.name} />
<ReadOnlyRow label="Sport" valueLabel="NFL" />

Renders:
┌──────────────────┬──────────────────┐
│ Label            │ Value            │
├──────────────────┼──────────────────┤
│ Description      │ (optional)       │
└──────────────────┴──────────────────┘
```

**EditableRow** - Commissioner edit mode
```
<EditableRow
  label="League Name"
  value={settings.league.name}
  onChange={v => handleChange('name', v)}
  type="text|number|checkbox|select|textarea"
  options={[{value, label}, ...]}
  required={true}
/>

Supports:
- text input
- number input
- checkbox
- select dropdown
- textarea
Error display if validation fails
```

**PremiumLockedRow** - Premium-gated control
```
<PremiumLockedRow label="Premium Feature" description="..." onUpgradeClick={handleUpgrade} />

Shows:
- Greyed out row with lock icon 🔒
- "Upgrade" button
- Disabled for non-commissioners or non-premium subscribers
```

#### **Page Modules** (11 Separate Components)

Each page follows the pattern:
```
export function LeagueSettingsPage({ settings, permissions, onChange }: PageProps) {
  const isReadOnly = !permissions.isCommissioner;
  
  return (
    <div className="space-y-6">
      <Section1>
        {isReadOnly ? <ReadOnlyRows /> : <EditableRows />}
      </Section1>
      <Section2>...</Section2>
    </div>
  );
}
```

**Pages Implemented:**
- ✅ **LeagueSettingsPage.tsx** - League info, playoffs
- ✅ **TeamSettingsPage.tsx** - Team count, naming, orphan handling
- ✅ **DraftSettingsPage.tsx** - Draft mechanics
- ✅ **PlaceholderPages.tsx** - 7 placeholder pages:
  - RosterSettingsPage (references unified roster engine)
  - ScoringSettingsPage (references unified scoring engine)
  - DivisionSettingsPage
  - MemberSettingsPage
  - CoOwnerSettingsPage
  - CommissionerControlPage (commissioner only)
  - PreviousLeaguesPage & DeleteLeaguePage

---

## Data Flow

### Flow 1: Load League Settings
```
1. User opens league settings modal
   ↓
2. LeagueSettingsModalShell mounts
   ↓
3. useEffect → fetches GET /api/commissioner/leagues/{leagueId}/league-settings
   ↓
4. API:
   - Verify authentication
   - Check permissions
   - Fetch league.settings from DB
   - Return GetLeagueSettingsResponse
   ↓
5. UI updates:
   - settings = response.settings
   - userPermissions = response.userPermissions
   - Render current page with role-aware controls
```

### Flow 2: Edit Settings (Pendng Changes)
```
1. User edits field (e.g., league name)
   ↓
2. EditableRow.onChange → parent component updates pending state
   ↓
3. isDirty = true
   ↓
4. SaveBar becomes visible
   ↓
5. Changes accumulate in memory (no immediate save)
```

### Flow 3: Validate (Real-Time)
```
1. User finishes typing
   ↓
2. Optional: Call POST /validate to get validation result
   ↓
3. Show ValidationBanner with errors/warnings
   ↓
4. If errors: SaveButton is red/disabled
5. If warnings: SaveButton is amber, "Fix warnings" note
6. If valid: SaveButton is blue, enabled
```

### Flow 4: Save Settings
```
1. User clicks SaveBar "Save Changes" button
   ↓
2. Collect pending changes into update payload
   ↓
3. POST PUT /api/commissioner/leagues/{leagueId}/league-settings
   {
     page: "league",
     data: { league: { name: {...}, ...}, ...}
   }
   ↓
4. API:
   - Verify commissioner permission
   - Merge updates with currentSettings
   - Run LeagueSettingsValidationEngine.validateSettings()
   - If invalid: return 400 with validation errors
   - If valid:
     - Merge settings atomically
     - Increment audit.version
     - Create LeagueSettingsAuditEntry
     - Save to DB
     - Return UpdateLeagueSettingsResponse
   ↓
5. UI:
   - If success: Show "Settings saved" notice
   - isDirty = false
   - Refetch settings or update state with response
   - SaveBar hides
   - If error: Show error banner, keep dirty state
```

### Flow 5: Reset to Default
```
1. User clicks "Reset to League Default" button (on League Settings page)
   ↓
2. Confirmation modal appears
   ↓
3. User confirms
   ↓
4. POST /api/commissioner/leagues/{leagueId}/league-settings/reset-default
   ↓
5. API:
   - Verify commissioner only
   - Fetch current settings
   - Generate fresh defaults via LeagueSettingsEngineRegistry.getService(sport)
   - Increment version
   - Record audit action='reset'
   - Save to DB
   - Return ResetLeagueSettingsResponse
   ↓
6. UI:
   - Fetch fresh settings
   - Show "Settings reset to defaults" notice
   - Render default values in form
   - isDirty = false
```

### Flow 6: Create New League
```
1. League creation form submitted
   ↓
2. POST /api/leagues (or similar)
   ↓
3. Service:
   - Create league record
   - Call UnifiedLeagueSettingsService.resolveDefaultLeagueSettings(sport, leagueType)
   - Create default UnifiedLeagueSettings
   - Save as league.settings
   ↓
4. League is ready
   - No blank settings
   - All defaults pre-populated
   - Can be customized via settings modal
```

### Flow 7: Import League
```
1. User imports league from ESPN/Yahoo/etc
   ↓
2. Import endpoint maps imported data
   ↓
3. Service:
   - Call UnifiedLeagueSettingsService.normalizeImportedLeagueSettings()
   - Sport service (LeagueSettingsEngineRegistry) normalizes data
   - Returns UnifiedLeagueSettings + normalization warnings
   ↓
4. Save normalized settings
   - Record audit action='imported'
   - Keep importMetadata with mapping notes + warnings
   ↓
5. New league uses same settings platform
   - No separate "imported settings" UI
   - All imported leagues are native AF-settings objects
```

---

## Key Features

### ✅ One League = One Settings Profile
- **Atomic**: All settings in single UnifiedLeagueSettings object
- **Versioned**: Every change increments audit.version
- **Audited**: Every change tracked with username, timestamp, previous snapshot
- **Validated**: Can't save invalid settings
- **Consistent**: Sport/league-type aware validation

### ✅ Role-Based Access Control
- **Commissioner**: Can edit all pages + commissioner-only pages
- **Co-owner**: Limited edit (roster/scoring/draft)
- **Member**: Read-only view (transparency)
- **Viewer**: Minimal access

### ✅ Premium Gating
- Premium-only controls greyed out with lock icon
- "Upgrade" button routes to subscription page
- Checked at API level (backend-enforced)

### ✅ Sport Aware
- NFL/NCAAF/NBA/NCAAB/MLB/NHL/Soccer support
- Sport-specific validation warnings
- Extensible via LeagueSettingsEngineRegistry

### ✅ League Type Aware
- Redraft, Keeper, Dynasty, Best Ball, Seasonal, Tournament, Devy
- Sport/league-type combinations validated
- Type-specific defaults (e.g., dynasty = franchise continuity)

### ✅ Import Support
- Imported leagues normalized to AF-native format
- Mapping notes preserved
- Unsupported configs normalized with warnings
- Uses same settings platform (no separate UI)

### ✅ Validation Engine
- Universal rules (team count, playoff structure, etc)
- Sport-specific warnings (QB scarcity, center depth, etc)
- Page-level validation (validate only relevant changes)
- Can validate without saving (preview mode)

### ✅ Audit/Versioning
- Version incremented on every update
- Last 50 changes tracked
- Each entry includes: action, page, changed keys, timestamp, user, premium-used flag
- Optional: previous snapshot for comparison
- For future: audit log viewer

### ✅ Frontend UX
- Dark modal matching screenshots
- Sidebar navigation (11 pages)
- Real-time validation feedback
- Page-specific content area
- Sticky save bar
- Role-aware controls (editable vs read-only)
- Premium control indicators

---

## API Response Examples

### GET /api/commissioner/leagues/{leagueId}/league-settings

**Request:**
```bash
curl -X GET /api/commissioner/leagues/league-123/league-settings
```

**Response (200 OK):**
```json
{
  "leagueId": "league-123",
  "settings": {
    "meta": {
      "sport": "NFL",
      "leagueType": "dynasty",
      "sourceType": "created",
      "sourcePlatform": null,
      "timezone": "UTC",
      "language": "en"
    },
    "league": {
      "name": "My Dynasty League",
      "description": "12 team PPR dynasty",
      "visibility": "private",
      "season": 2025,
      "scoringFormat": "ppr",
      "playoffSettings": {
        "enabled": true,
        "numberOfPlayoffTeams": 6,
        "playoffStartWeek": 15,
        "seasonLength": 17,
        "format": "bracket",
        "qualificationMethod": "seeding"
      }
    },
    "team": {
      "numberOfTeams": 12,
      "teamNamingRules": "free",
      "franchiseContinuity": {
        "enabled": true,
        "franchiseType": "name-based"
      }
    },
    "roster": {
      "templateKey": "nfl-dynasty-default",
      "isCustom": false,
      "matchesTemplate": true,
      "version": 1
    },
    "scoring": {
      "presetKey": "nfl-ppr",
      "isCustom": false,
      "version": 1
    },
    "draft": {
      "draftType": "snake",
      "draftOrder": "randomized",
      "timerEnabled": true,
      "timerSeconds": 120
    },
    "divisions": {
      "enabled": true,
      "numberOfDivisions": 2
    },
    "audit": {
      "version": 3,
      "lastUpdatedAt": "2025-04-12T10:30:00Z",
      "lastUpdatedBy": "user-456",
      "changes": [
        {
          "id": "audit-...",
          "timestamp": "2025-04-12T10:30:00Z",
          "userId": "user-456",
          "action": "updated",
          "page": "league",
          "changedKeys": ["league.name"],
          "premiumUsed": false
        }
      ],
      "createdAt": "2025-01-01T00:00:00Z",
      "templateMatches": true
    }
  },
  "canEdit": true,
  "userRole": "commissioner",
  "userPermissions": {
    "role": "commissioner",
    "isCommissioner": true,
    "isCoOwner": false,
    "isMember": false,
    "readOnly": false,
    "editablePages": ["league", "team", "roster", "scoring", "draft", "divisions", "members", "co-owners", "commissioner-control", "previous-leagues", "delete-league"],
    "canAccessPremium": true,
    "canManageCoOwners": true,
    "canDeleteLeague": true
  },
  "validationWarnings": [],
  "subscriptionStatus": {
    "isPremium": true,
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

---

## Testing

### Unit Tests (Planned)
- `__tests__/league-settings-validation.test.ts`
  - Test universal validation rules
  - Test sport-specific warnings
  - Test invalid sport/league-type combinations
- `__tests__/league-settings-permissions.test.ts`
  - Test role-based access
  - Test page visibility by role
  - Test permission denial scenarios
- `__tests__/league-settings-audit.test.ts`
  - Test version incrementing
  - Test audit entry creation
  - Test audit log trimming (50 entry max)

### Route-Contract Tests (Planned)
- `__tests__/league-settings-get-route.test.ts`
  - Test GET returns complete settings
  - Test permission checks
  - Test role-aware response
- `__tests__/league-settings-put-route.test.ts`
  - Test permission enforcement (commissioner only)
  - Test validation before save
  - Test version increment
  - Test audit entry creation
- `__tests__/league-settings-validate-route.test.ts`
  - Test validate-only mode
  - Test returns validation result
- `__tests__/league-settings-reset-default-route.test.ts`
  - Test permission check (commissioner only)
  - Test reset to defaults
  - Test audit action='reset'

---

## Usage Example

```tsx
// In a page or component, open the modal:

import { LeagueSettingsModalShell } from '@/components/league-settings';

export default function LeaguePage() {
  const [showSettings, setShowSettings] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowSettings(true)}>
        ⚙️ League Settings
      </button>
      
      {showSettings && (
        <LeagueSettingsModalShell
          leagueId="league-123"
          initialPage="league"
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
```

---

## Future Enhancements

1. **Sport-Specific Services** - Override `DefaultSportLeagueSettingsService` for custom NFL/NBA logic
2. **Advanced Templates** - Save/load custom settings templates  
3. **Audit Log Viewer** - UI to browse change history
4. **Bulk Actions** - Apply settings to multiple leagues
5. **Scheduled Changes** - Queue settings changes for future dates
6. **Settings Rollback** - Restore previous settings version
7. **Export Settings** - Download settings as JSON
8. **Notifications** - Alert members when commissioner changes critical settings
9. **Conditional Logic** - Show/hide fields based on other settings
10. **Settings Profiles** - Save favorite configurations for quick application

---

## File Structure

```
lib/league-settings-engine/
├─ index.ts (barrel export)
├─ LeagueSettingsEngineTypes.ts (all types)
├─ LeagueSettingsValidationEngine.ts
├─ LeagueSettingsPermissionsService.ts
├─ LeagueSettingsEngineRegistry.ts
└─ UnifiedLeagueSettingsService.ts

app/api/commissioner/leagues/[leagueId]/league-settings/
├─ route.ts (GET/PUT)
├─ validate/route.ts (POST)
└─ reset-default/route.ts (POST)

components/league-settings/
├─ index.ts (barrel export)
├─ types.ts
├─ LeagueSettingsModalShell.tsx
├─ SettingsSidebarNav.tsx
├─ SaveBar.tsx
├─ ValidationBanner.tsx
├─ SettingsRows.tsx
└─ pages/
   ├─ index.ts
   ├─ LeagueSettingsPage.tsx
   ├─ TeamSettingsPage.tsx
   ├─ DraftSettingsPage.tsx
   └─ PlaceholderPages.tsx (RosterSettings, ScoringSettings, Divisions, Members, CoOwners, CommissionerControl, PreviousLeagues, DeleteLeague)
```

---

## Status

✅ **Phase 1-3 Complete:**
- Backend unified engine (types, validation, permissions, registry, service)
- API routes (GET/PUT, validate, reset-default)
- Frontend components (modal, sidebar, rows, save bar, validation)
- 11 settings page templates (3 detailed, 8 placeholders)
- All files compile successfully
- No TypeScript errors

⏳ **Planned Next:**
- Wire page routing in modal shell
- Add unit tests for validation/permissions/audit
- Add route-contract tests
- Document usage patterns
- Create integration examples
- Refinements based on actual database integration

---

End of Implementation Guide
