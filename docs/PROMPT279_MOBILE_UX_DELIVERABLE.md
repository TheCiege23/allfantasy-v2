# PROMPT 279 — Mobile-First UX Polish Deliverable

## Objective

Ensure the app feels like a mobile app: spacing, touch targets, scrolling, draft room usability, and chat usability.

---

## 1. Spacing

- **Draft room (mobile):** Content area padding increased from `p-2` to `p-3 sm:p-4` so content isn’t cramped on small screens.
- **Chat:** Header/footer use `py-2.5` and `p-2.5`/`p-3`; message bubbles use `px-2.5 py-2` and `mb-2.5` for clearer separation.
- **Queue:** Panel padding `p-2` → `p-2.5`; list items `px-3 py-2.5` and `space-y-2`.
- **Player panel:** Filter/search row `p-2` → `p-2.5`; sort row `py-1.5` → `py-2`; list area `p-2` → `p-2.5`.
- **Top bar:** Tighter on mobile `px-3 py-2.5`, then `sm:px-4 sm:py-3` on larger screens.

---

## 2. Touch targets (≥44px)

All interactive elements that matter on mobile now use at least **44×44px** tap area and **touch-manipulation** where appropriate:

| Component | Elements updated |
|-----------|------------------|
| **DraftRoomShell** | Tab bar buttons: `min-h-[48px] py-3`, `active:scale-[0.98]`. |
| **DraftChatPanel** | Refresh: `min-h-[44px] min-w-[44px]`. Broadcast: `min-h-[44px] py-2`. Input: `min-h-[44px] py-2.5`. Send: `min-h-[44px] min-w-[44px]`. |
| **QueuePanel** | AI reorder: `min-h-[44px] py-2.5`. Auto-pick / Away labels: `min-h-[44px]` with larger tap area and `w-4 h-4` checkboxes. Queue item “Draft”: `min-h-[44px]`. Remove: `min-h-[44px] min-w-[44px]`. |
| **PlayerPanel** | Search container: `min-h-[44px]`. Position/team/pool selects: `min-h-[44px] py-2`. Sort (ADP/Name): `min-h-[44px] py-2`. My roster toggle: `min-h-[44px] py-2`. Draft/Nominate: `min-h-[44px] min-w-[44px]` (with sm breakpoint for desktop). Add to queue (+): `min-h-[44px] min-w-[44px]`. |
| **DraftTopBar** | Use queue, Trades, **Commissioner**, Pause, Resume, Run AI pick, Reset timer, Undo: all `min-h-[44px]`, `py-2.5` / `px-3`, and `touch-manipulation`. |

---

## 3. Scrolling

- **Draft room (mobile):** Main content uses `overscroll-contain` to avoid scroll chaining; removed invalid arbitrary class.
- **Chat:** Message list `overflow-y-auto` with `overscroll-contain`; mobile `max-h-[280px]`, desktop `sm:max-h-[220px]`.
- **Queue / Player panel:** Scroll areas use `overscroll-contain` for consistent overscroll behavior.

---

## 4. Draft room usability

- **Safe area:** Mobile tab bar uses `safe-area-bottom` (existing utility: `padding-bottom: env(safe-area-inset-bottom)`).
- **Tab bar:** Tabs are `min-h-[48px]`, `py-3`, with `touch-manipulation` and `active:scale-[0.98]`.
- **Queue list:** Rows `min-h-[52px]`, `rounded-xl`, `px-3 py-2.5`; drag handle visually separated; Draft and Remove have 44px targets.
- **Player list:** Draft and “Add to queue” buttons are 44px on mobile; optional `sm:` overrides keep desktop layout compact.

---

## 5. Chat usability

- **Input:** `min-h-[44px]`, `rounded-xl`, `px-3 py-2.5`, `text-sm`, `touch-manipulation`.
- **Send:** Icon-only button `min-h-[44px] min-w-[44px]`, `rounded-xl`.
- **Refresh / Broadcast:** 44px minimum height/width and padding; `aria-label` on Refresh.
- **Messages:** Slightly larger bubbles (`py-2`, `leading-relaxed`); more vertical space between messages.
- **Footer:** Mobile-friendly padding `p-3` on small screens, `sm:p-2.5` on larger.

---

## Files changed

- `app/globals.css` — `html { scroll-behavior: smooth }`; body `-webkit-tap-highlight-color` for a subtle mobile tap feedback.
- `components/app/draft-room/DraftRoomShell.tsx` — Mobile padding, safe-area-bottom, tab touch targets, overscroll.
- `components/app/draft-room/DraftChatPanel.tsx` — Header/footer touch targets, input/send size, message spacing, scroll; footer `p-3 sm:p-2.5` for mobile.
- `components/app/draft-room/QueuePanel.tsx` — Header `py-2.5`; AI reorder and checkboxes, queue row height and actions (Draft, Remove).
- `components/app/draft-room/PlayerPanel.tsx` — Search, filters, **pool filter** `min-h-[44px]` + touch-manipulation; **Use AI ADP** label as 44px touch target with `w-4 h-4` checkbox and `aria-label`.
- `components/app/draft-room/DraftTopBar.tsx` — **Commissioner** button `min-h-[44px]`, `rounded-xl`, `px-3 py-2.5`, `touch-manipulation`; all other action buttons 44px + touch-manipulation.

---

## Reference

- **Touch target size:** WCAG 2.5.5 (Level AAA) suggests at least 44×44 CSS pixels for touch; applied consistently in draft and chat.
- **Safe area:** Uses existing `.safe-area-bottom` in `app/globals.css` for notched devices.
- **Scrolling:** `scroll-behavior: smooth` on `html`; draft/chat scroll areas use `overscroll-contain` to avoid scroll chaining.
- **Tap feedback:** Body uses a subtle cyan `-webkit-tap-highlight-color` so taps feel responsive without a harsh flash.
