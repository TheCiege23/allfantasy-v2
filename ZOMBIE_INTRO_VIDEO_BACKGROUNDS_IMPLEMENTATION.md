# Zombie League Intro Video & Background Theme Implementation

## Summary
Added zombie-themed intro videos and randomly-selected apocalyptic backgrounds to the Zombie League system. Commissioners and players now see a themed intro video on first entry, and the league UI displays dynamic gradient backgrounds.

## Features Implemented

### 1. **10 Zombie-Themed Backgrounds**
Created comprehensive background theme configuration in `lib/zombie/zombieBackgroundThemes.ts`:

**Themes:**
- 🪦 **Graveyard Dawn** - Misty graveyard with tombstones under breaking dawn (Purple/Red)
- 🏥 **Abandoned Hospital** - Decay and rot in a forsaken medical facility (Green/Gray)
- 🏚️ **Infested City** - Urban sprawl consumed by the undead horde (Orange/Red)
- 🌲 **Dark Forest** - Ancient woods shrouded in shadow and decay (Emerald/Black)
- 🛡️ **Underground Bunker** - Last stronghold deep beneath the surface (Gray/Cyan)
- 🏰 **Decrepit Mansion** - Grand halls overtaken by rot and despair (Violet/Red)
- 🏜️ **Wasteland Arena** - Post-apocalyptic battle grounds under dead sky (Yellow/Orange)
- 🧪 **Plague Laboratory** - Scientific facility where it all began (Lime/Red)
- 🏛️ **Tomb Chamber** - Ancient burial site awakening the dead (Amber/Black)
- ⛔ **Quarantine Zone** - Sealed off and left to fate (Red/Pink)

### 2. **Intro Video Modal**
Created `components/zombie/ZombieIntroModal.tsx`:
- Full-screen modal that plays on first league entry
- Shows video with league name and tagline overlays
- Plays intro video from `/league-type-zombie-intro.mp4`
- Graceful fallback if video unavailable
- Uses localStorage to track if user has seen intro (skippable)
- Themed to match background theme colors
- Supports mobile interactions

### 3. **Database Integration**
- Uses existing `themeLabel` field on `ZombieLeague` model
- Stores randomly-assigned background theme ID on league creation
- Persists across sessions

### 4. **Commissioner Dashboard**
- Background theme display on commissioner settings modal
- "Replay Intro" button to show intro video again
- Styled with dynamic background overlay
- Button shows intro video when clicked with `forceReplay` flag

### 5. **League Home Page**
- Background gradient applied to entire league home page
- Dynamic theme matching the league's assigned background
- Intro modal shows on first entry when user visits
- Smooth transitions when switching between leagues

### 6. **League Creation Flow**
Updated `/app/api/zombie/league/route.ts`:
- Randomly assigns a background theme on league creation
- Returns `backgroundTheme` in the API response
- Uses `getRandomZombieTheme()` to pick from 10 options

## Files Modified

### New Files
- `lib/zombie/zombieBackgroundThemes.ts` - Background theme configuration
- `components/zombie/ZombieIntroModal.tsx` - Intro video modal component

### Updated Files
- `app/api/zombie/league/route.ts` - Add background theme to league creation
- `lib/zombie/setupEngine.ts` - Store background theme on ZombieLeague model
- `app/zombie/[leagueId]/ZombieLeagueHomeClient.tsx` - Display background + intro modal
- `app/zombie/components/ZombieCommissionerModal.tsx` - Add replay button + background styling

## How It Works

### On League Creation
1. User creates a zombie league via `/api/zombie/league`
2. `createZombieLeague()` randomly selects a background theme
3. Theme ID stored in `ZombieLeague.themeLabel` field
4. API returns the selected background theme

### On First League Entry (Player)
1. User navigates to `/zombie/{leagueId}`
2. `ZombieLeagueHomeClient` fetches league data including `backgroundTheme`
3. `ZombieIntroModal` displays with the theme's color scheme
4. Video plays automatically
5. localStorage tracks that user has seen intro
6. League home page shows theme gradient background

### Commissioner Dashboard
1. Commissioner clicks settings icon
2. `ZombieCommissionerModal` fetches background theme
3. Modal displays with themed background overlay
4. "Replay Intro" button visible in header
5. Clicking button shows intro modal with `forceReplay` flag

## Styling & Colors

Each theme includes:
- **Gradient Class**: Tailwind gradient (e.g., `from-slate-900 via-purple-900 to-red-950`)
- **Accent Color**: Hex color for UI highlights
- **Text Variant**: Light or dark text (all light for zombie theme)

Example usage:
```typescript
const theme = getZombieTheme('graveyard-dawn')
// Returns: { id, name, description, gradientClass, accentColor, textVariant }
```

## User Experience

### Visual Flow
1. **Create League** → Random background assigned → Confirmation
2. **Enter League** → Intro video plays once → Background theme displayed
3. **Settings** → Background shown, replay button available

### Mobile Optimized
- Responsive intro modal
- Touch-friendly "Skip Intro" button
- Mobile tap-to-dismiss hint

## Technical Details

### State Management
- `showIntroVideo` state in `ZombieLeagueHomeClient`
- `showIntroReplay` state in `ZombieCommissionerModal`
- localStorage for tracking viewed intros per league

### Performance
- Lazy background loading (only applied when data fetched)
- CSS transitions for smooth theme changes
- No performance impact on league operations

### Accessibility
- Intro modal has proper ARIA labels
- Skip button always available
- Graceful degradation if video unavailable
- Keyboard navigable

## Next Steps (Optional Enhancements)

1. **Commissioner Theme Customization**
   - Allow commissioners to change league theme
   - Add theme preview selector in settings

2. **Per-User Preferences**
   - Store which intros each user has seen
   - Option to disable intro permanently

3. **Seasonal Themes**
   - Rotate backgrounds seasonally
   - Special event-based themes

4. **Video Customization**
   - Commission league-specific intro videos
   - Upload custom intro via commissioner panel

## Testing Checklist

- [ ] Create zombie league → Random background assigned
- [ ] Enter league → Intro video plays once, then background visible
- [ ] Skip intro → Modal closes, user sees home page
- [ ] Mobile → Responsive, touchable controls work
- [ ] Commissioner dashboard → Can replay intro
- [ ] Reload page → Background persists, intro doesn't replay
- [ ] Multi-league → Different backgrounds for different leagues
- [ ] Video error → Fallback UI displays gracefully

## Deployment Notes

1. Video file must exist: `/public/league-type-zombie-intro.mp4`
2. No database migrations required (uses existing `themeLabel` field)
3. All changes are backward compatible
4. CSS/Tailwind classes used only (no new external dependencies)
