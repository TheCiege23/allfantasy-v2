# PROMPT 325 — Mobile and Browser QA

## Objective

Ensure compatibility across target devices and browsers: **iPhone**, **Android**, **Chrome**, **Safari**.

---

## Target Environments

| Platform   | Browsers        | Notes                          |
|-----------|-----------------|---------------------------------|
| iPhone    | Safari, Chrome  | Notch/safe-area, dynamic chrome |
| Android   | Chrome, Samsung | Various viewport behaviors      |
| Desktop   | Chrome, Safari  | Baseline layout                 |

---

## What Was Checked (Code & Config)

- **Viewport:** `app/layout.tsx` — `viewport` export, scale, `viewportFit`.
- **Global styles:** `app/globals.css` — body min-height, tap highlight, safe-area, scrollbar, backdrop.
- **Mobile UI:** Bottom tab bar, sticky AI actions, responsive nav, draft shell — use of `safe-area-bottom` and full-height layout.
- **Chat / full-height panels:** Chimmy chat and shell use fixed heights based on viewport; checked for 100vh vs dynamic chrome (Safari/Android).

---

## Compatibility Fixes Applied

### 1. Viewport — allow zoom (accessibility)

- **File:** `app/layout.tsx`
- **Change:** `maximumScale: 1` → `maximumScale: 5`
- **Reason:** Allows user zoom for accessibility (WCAG). No longer pins zoom on iPhone/Android.

### 2. Body and full-height layout — mobile viewport

- **File:** `app/globals.css`
- **Body:** `min-height: 100vh` kept, added `min-height: 100dvh` so supported browsers use the dynamic viewport (avoids address-bar jump on Safari/Chrome mobile).
- **New utility:** `.h-fill-dynamic` — `height: calc(100vh - 180px)` with `height: calc(100dvh - 180px)` for full-height panels.
- **New utility:** `.touch-scroll` — `-webkit-overflow-scrolling: touch` for smoother overflow scrolling on iOS.

### 3. Chimmy chat panels — dynamic height + touch scroll

- **Files:** `app/components/ChimmyChat.tsx`, `components/chimmy/ChimmyChatShell.tsx`
- **Change:** Replaced fixed `h-[calc(100vh-180px)]` with class `h-fill-dynamic` and added `touch-scroll` where appropriate.
- **Reason:** Better behavior when mobile browser chrome (address bar) shows/hides; smoother scrolling on iOS.

### 4. Safe-area utilities

- **File:** `app/globals.css`
- **Existing:** `.safe-area-bottom` — already used by bottom tab bar, draft shell, etc.
- **New:** `.safe-area-top` — `padding-top: env(safe-area-inset-top, 0px)` for fixed/sticky top bars on notched devices.

---

## Already in Place (No Change)

- `viewportFit: 'cover'` and safe-area usage in key components.
- `-webkit-tap-highlight-color` on body.
- `-webkit-backdrop-filter` for glass panels.
- `.no-scrollbar` / `.scrollbar-hide` for custom scroll areas.
- Mobile media query at 640px for typography/radius.

---

## Follow-Up Recommendations

1. **Manual test checklist (when devices available)**  
   - iPhone Safari: home, draft, Chimmy chat, bottom nav, notch/safe-area.  
   - Android Chrome: same flows.  
   - Chrome/Safari desktop: layout and zoom.

2. **Optional:** Add `overflow-x: hidden` only to specific content wrappers if horizontal scroll appears on narrow viewports (avoid on `html`/`body` if possible, for accessibility).

3. **Optional:** If iOS zooms on input focus, ensure form inputs use at least 16px font size on mobile (already 16px in `:root` at 640px).

4. **Rollout:** Consider applying `h-fill-dynamic` to other full-height UIs (e.g. LeagueChatDock, af-legacy mock fullscreen) if similar layout issues appear on mobile.

---

## Deliverable Summary

- **Viewport:** Zoom allowed (`maximumScale: 5`).
- **Layout:** Body and full-height panels use `100dvh` where supported; `.h-fill-dynamic` and `.touch-scroll` added.
- **Safe-area:** `.safe-area-top` added; `.safe-area-bottom` unchanged.
- **Components:** ChimmyChat and ChimmyChatShell updated to use new height and touch-scroll utilities.

These updates improve compatibility on **iPhone**, **Android**, **Chrome**, and **Safari** and address layout and UX issues related to viewport scale, dynamic chrome, and safe areas.
