# PROMPT 293 — Shareable AI Insight Cards

## Objective

Turn AI outputs into social content: trade grades, matchup predictions, draft grades, and power rankings as clean image cards with AllFantasy branding, shareable to X, Instagram, Discord, and Reddit.

## Card Types

| Type                 | Payload fields                                      | Output |
|----------------------|------------------------------------------------------|--------|
| **Trade grade**      | `title`, `insight`, `sideA`, `sideB`, `grade`, `verdict` | Names + grade + AI insight |
| **Matchup prediction** | `title`, `insight`, `team1`, `team2`, `prediction`, `weekOrRound` | Teams + prediction + insight |
| **Draft grade**      | `title`, `insight`, `teamName`, `grade`, `highlights`, `roundOrPick` | Team + grade + insight |
| **Power rankings**   | `title`, `insight`, `rank`, `teamName`, `change`, `blurb` | Rank + team + insight |

## Output Format

- **Clean image card**: fixed size (600×400px), dark background, type-specific accent bar.
- **Content**: player/team names, AI insight text, optional grade/verdict/prediction.
- **Branding**: “allfantasy.ai” in footer.
- **Export**: PNG via html2canvas (client-side capture).

## Generator Flow

1. **Data**: Build an `AICardPayload` (see `lib/ai-insight-cards/types.ts`) for one of the four variants.
2. **Render**: Use `<AICardRenderer payload={payload} />` (id `ai-insight-card-capture` for capture).
3. **Capture**: Use `useAICardCapture()` — `captureToDataUrl()`, `captureAndDownload()`, or `captureToBlob()`.
4. **Share**: Use `<AICardShareBar payload={payload} shareUrl={optionalUrl} />` for download + share actions.

## Share Destinations

| Platform   | Behavior |
|-----------|----------|
| **X (Twitter)** | Open tweet intent with pre-filled text (title + insight + hashtags + URL). User can attach the downloaded card image manually. |
| **Reddit**      | Open submit intent with URL and title. User attaches downloaded image in the post. |
| **Instagram**   | No intent URL; “Copy for Instagram” copies caption (title + insight + hashtags). User downloads image then uploads to Instagram and pastes caption. |
| **Discord**     | “Copy for Discord” copies short caption. User downloads image and pastes into channel or uploads with caption. |

All flows assume the user **downloads the card image** first (via “Download image”), then uses the appropriate share or copy action.

## Files

- **Types**: `lib/ai-insight-cards/types.ts`, `lib/ai-insight-cards/shareUrls.ts`
- **Components**: `components/ai-insight-cards/AICardRenderer.tsx`, `components/ai-insight-cards/AICardShareBar.tsx`
- **Hook**: `hooks/useAICardCapture.ts`
- **Exports**: `lib/ai-insight-cards/index.ts`, `components/ai-insight-cards/index.ts`

## Usage Example

```tsx
import { AICardRenderer, AICardShareBar } from '@/components/ai-insight-cards'
import type { TradeGradePayload } from '@/lib/ai-insight-cards/types'

const payload: TradeGradePayload = {
  variant: 'trade_grade',
  title: 'Trade Grade',
  sideA: ['Patrick Mahomes'],
  sideB: ['Josh Allen', '2026 1st'],
  grade: 'B+',
  insight: 'Fair value. Mahomes side gets the best player; other side gets depth and future capital.',
}

<AICardRenderer payload={payload} />
<AICardShareBar payload={payload} shareUrl="https://allfantasy.ai/share/123" />
```

## Deliverable Summary

- **Card generator**: Four payload types + single `AICardRenderer` with variant-specific layout.
- **Image generation**: Client-side PNG via `useAICardCapture` (html2canvas).
- **Share**: Download image + X/Reddit intent URLs + Instagram/Discord copyable captions.
