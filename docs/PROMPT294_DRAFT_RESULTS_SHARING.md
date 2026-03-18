# PROMPT 294 — Draft Results Sharing

## Objective

Make drafts shareable: generate draft grades, team rankings, and “winner of draft” as an **image + link back to app**.

## Generated content

| Type | Description |
|------|-------------|
| **Draft grades** | Single team’s grade card (grade, score, rank, insight). |
| **Team rankings** | Full list of teams with grades (top 10). |
| **Winner of draft** | Top team + grade + short insight and optional runner-up blurb. |

## Format

- **Image**: Fixed-size card (600×400) with league name, season, content, and AllFantasy branding. Suitable for capture via html2canvas.
- **Link**: Share URL points to `/share/{id}` (link back to app). The share page renders the same card and a “Try AllFantasy” CTA.

## System overview

1. **Create share**  
   User clicks “Share” in the draft grades section → chooses “Share team rankings”, “Share winner of draft”, or “Share this grade” (with roster picker).  
   Client calls `POST /api/share/draft` with `{ leagueId, season, variant, rosterId? }`.

2. **API**  
   - Loads draft grades for the league/season.  
   - Builds payload for the chosen variant (rankings, winner, or single grade).  
   - Creates a `ShareableMoment` with `shareType` in `draft_grade` | `draft_rankings` | `draft_winner` and `metadata.payload` for the card.  
   - Returns `{ shareId, shareUrl, payload }`.

3. **Client**  
   Renders `DraftShareCard` with returned payload and `DraftShareBar`:  
   - **Download image** (capture card to PNG).  
   - **Copy link** (shareUrl).  
   - **Share to X / Reddit** (intent URLs with title + shareUrl).  
   - **Copy for Instagram / Discord** (caption + shareUrl).

4. **Share page**  
   For `shareType` in `draft_grade` | `draft_rankings` | `draft_winner`, the share page reads `metadata.payload` and renders `DraftSharePageContent` (same card + “Try AllFantasy” link). Visiting the link shows the card and drives traffic back to the app.

## Files

- **Types**: `lib/draft-sharing/types.ts`, `lib/draft-sharing/shareUrls.ts`
- **Components**: `components/draft-sharing/DraftShareCard.tsx`, `DraftShareBar.tsx`, `DraftShareModal.tsx`, `DraftSharePageContent.tsx`
- **API**: `app/api/share/draft/route.ts`
- **Share page**: `app/share/[shareId]/page.tsx` (draft branch)
- **Integration**: `components/rankings/DraftGradesSection.tsx` (Share button + `DraftShareModal`)

## Usage

- **From Draft Grades section**: Ensure draft grades exist for the league/season, then click **Share** → choose variant → use Download image and share links/copy.
- **Share link**: Use the returned `shareUrl` (e.g. `https://yoursite.com/share/xxx`). Recipients see the card and can click through to the app.

## Deliverable summary

- **Draft share system**: Draft grades, team rankings, and winner of draft as shareable cards.
- **Output**: Image (card PNG) + link back to app (`/share/{id}`).
- **Share destinations**: Download image, copy link, X, Reddit, copy caption for Instagram/Discord.
