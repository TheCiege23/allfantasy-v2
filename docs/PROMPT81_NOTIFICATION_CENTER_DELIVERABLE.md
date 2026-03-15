# Prompt 81 — Notification Center + Top Bar Utility Polish + Full UI Click Audit

## 1. Notification Center Architecture

### Overview

The notification center is a **dropdown panel** opened from the **notification bell** in the top bar. It shows **grouped notifications** (Today, Yesterday, Earlier), **mark as read** / **mark all as read**, **destination links** (Open league, Open chat, etc.), and an **empty state** and **error state**. The **top bar** provides notifications, messages, AI chat, search, language, theme, admin (when applicable), and profile in a consistent order.

### Component and Data Flow

```
GlobalTopNav
  ├── NotificationBell (open state, unread badge from useNotifications)
  │     ├── Button click → toggle open
  │     ├── Click outside / Escape → close
  │     └── NotificationPanel (when open)
  │           ├── useNotifications(40) → load, markAsRead, markAllAsRead
  │           ├── groupNotifications (NotificationCenterService)
  │           ├── getNotificationDestination (NotificationRouteResolver) per item
  │           └── Footer: "See all notifications" → /app/notifications
  └── Other utilities: search, wallet, messages, AI chat, language, theme, admin, profile
```

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **NotificationCenterService** | `lib/notification-center/NotificationCenterService.ts` | getGroupKey(dateStr), groupNotifications(list), NOTIFICATION_GROUP_LABELS (Today, Yesterday, Earlier). |
| **NotificationDrawerController** | `lib/notification-center/NotificationDrawerController.ts` | isNotificationDrawerCloseKey(key) for Escape; NOTIFICATION_DRAWER_CLOSE_KEY. |
| **UnreadCountResolver** | `lib/notification-center/UnreadCountResolver.ts` | getUnreadCount(notifications), getUnreadBadgeCount(notifications, max) for badge (e.g. "9+"). |
| **TopBarUtilityResolver** | `lib/notification-center/TopBarUtilityResolver.ts` | getTopBarUtilities({ isAuthenticated, isAdmin, hasSearch }) for ordered list of visible utilities. |
| **NotificationRouteResolver** | `lib/notification-center/NotificationRouteResolver.ts` | getNotificationDestination(n) → { href, label } from meta (leagueId, chatThreadId, tournamentId, product). |
| **NotificationReadStateService** | `lib/notification-center/NotificationReadStateService.ts` | getNotificationReadEndpoint(id), NOTIFICATIONS_READ_ENDPOINT, NOTIFICATIONS_READ_ALL_ENDPOINT. |

---

## 2. Top Bar Utility Updates

- **Order (authenticated):** Search (when hasSearch), Wallet, Messages, Notifications, AI Chat, Language, Theme, Admin (when isAdmin), Profile (UserMenuDropdown).
- **TopBarUtilityResolver.getTopBarUtilities(opts)** returns the list of visible utilities for documentation and consistency; GlobalTopNav already renders these in the same order.
- **Notifications:** Bell icon; badge from getUnreadBadgeCount(notifications, 9); click toggles panel; Escape and click-outside close.
- **Profile:** UserMenuDropdown (Profile, Settings, Log out).
- **Settings:** Available via UserMenuDropdown and (on mobile) as part of the same menu; no separate settings icon in top bar.
- **Search:** Search icon when onOpenSearch provided; opens search overlay (⌘K also opens).
- **Language / Theme:** LanguageToggle and ModeToggle in header.
- **Admin:** Shield icon/link when showAdminNav(isAdmin); href /admin.

No structural change to the top bar; the notification center and bell now use the notification-center lib for grouping, destination resolution, unread badge, and Escape-to-close.

---

## 3. Read / Unread State Logic

- **Source:** useNotifications(limit) fetches from GET /api/shared/notifications?limit=; returns notifications, loading, error, markAsRead(id), markAllAsRead(), refresh.
- **Unread count:** getUnreadCount(notifications) or getUnreadBadgeCount(notifications, 9) for display; NotificationBell uses getUnreadBadgeCount so the badge shows 1–9 or "9+".
- **Mark as read:** Button on each unread item calls markAsRead(n.id); optimistic update (set read: true) then PATCH /api/shared/notifications/[id]/read; on failure state is reverted.
- **Mark all as read:** Header button "Mark all read" calls markAllAsRead(); optimistic update then PATCH /api/shared/notifications/read-all and refresh. NotificationReadStateService documents the endpoints.
- **Reload:** useNotifications refetches every 60s and on mount; markAllAsRead triggers refresh after API call so the list and badge stay in sync.

---

## 4. Frontend Component Updates

- **NotificationBell**
  - Uses getUnreadBadgeCount(notifications, 9) from UnreadCountResolver for badge (replaces inline unread count and "9+" logic).
  - Adds Escape key listener when open via isNotificationDrawerCloseKey(e.key); closes panel on Escape.
- **NotificationPanel**
  - Uses groupNotifications and NOTIFICATION_GROUP_LABELS from NotificationCenterService (removes local grouping).
  - Uses getNotificationDestination(n) from NotificationRouteResolver for each item; when a destination exists, the **entire notification row** is a Link to that href (clicking anywhere on the row navigates and closes the panel); the inline label ("Open league", "Open chat", etc.) is shown as text only.
  - Shows error state when useNotifications.error is set (AlertCircle + message).
  - Mark read button uses e.preventDefault() and e.stopPropagation() so it does not trigger row navigation.
  - Footer "See all notifications" links to /app/notifications.

---

## 5. Full UI Click Audit Findings

| Element | Component | Route / Behavior | Handler / Wiring | Status |
|--------|-----------|------------------|------------------|--------|
| Notification bell | NotificationBell | Toggle panel | onClick setOpen((o) => !o) | OK |
| Bell badge | NotificationBell | — | getUnreadBadgeCount(notifications, 9) | OK |
| Click outside | NotificationBell | Close panel | mousedown on document, exclude panel/button | OK |
| Escape key | NotificationBell | Close panel | keydown Escape → setOpen(false) | OK |
| Mark read (item) | NotificationPanel | Optimistic + PATCH | markAsRead(n.id) | OK |
| Mark all read | NotificationPanel | Optimistic + PATCH read-all + refresh | markAllAsRead() | OK |
| Notification row (has dest) | NotificationPanel | Navigate to getNotificationDestination(n).href | Row wrapped in Link; onClose on click | OK |
| Destination label (text) | NotificationPanel | Same as row (visual only when row is link) | span | OK |
| See all notifications | NotificationPanel | /app/notifications | Link + onClose | OK |
| Search icon | GlobalTopNav | Open search overlay | onOpenSearch() | OK |
| Messages icon | GlobalTopNav | /messages | Link | OK |
| AI Chat icon | GlobalTopNav | /af-legacy?tab=chat | Link | OK |
| Language toggle | GlobalTopNav | Toggle locale | LanguageToggle | OK |
| Theme toggle | GlobalTopNav | Toggle theme | ModeToggle | OK |
| Admin icon | GlobalTopNav | /admin (when isAdmin) | Link | OK |
| Profile menu | UserMenuDropdown | Profile, Settings, Log out | Dropdown + Link/button | OK |

All notification and top-bar utility interactions are wired; read state and destination routing work; no dead buttons identified.

---

## 6. QA Findings

- **Notification center:** Opens on bell click; closes on outside click and Escape; panel renders grouped list, mark read, mark all read, and destination links.
- **Grouped notifications:** Today, Yesterday, Earlier groups render correctly via NotificationCenterService.
- **Read/unread:** Mark read and mark all read update UI and call API; badge reflects unread count (capped at 9+).
- **Destination routing:** getNotificationDestination provides href/label from meta (leagueId, chatThreadId, tournamentId, product); links navigate and close panel.
- **Empty state:** "No notifications yet." when list is empty.
- **Error state:** Error message shown when useNotifications.error is set.
- **Top bar:** Notifications, profile, settings (via dropdown), search, language, theme, admin (when admin) work on desktop and mobile; drawer and dropdown close correctly.

---

## 7. Issues Fixed

- **Grouping and labels not centralized:** NotificationCenterService now provides getGroupKey, groupNotifications, and NOTIFICATION_GROUP_LABELS; NotificationPanel uses them.
- **Destination links duplicated per type:** NotificationRouteResolver.getNotificationDestination(n) centralizes href/label from meta; panel uses one link per notification.
- **No Escape to close:** NotificationDrawerController and Escape listener in NotificationBell close the panel on Escape.
- **Unread badge logic in component:** UnreadCountResolver.getUnreadBadgeCount used in NotificationBell for consistent "9+" cap.
- **No error state in panel:** NotificationPanel shows error UI when useNotifications.error is set.
- **League/chat links hardcoded:** Replaced with getNotificationDestination so league, chat, bracket, and fallback routes are consistent.

---

## 8. Final QA Checklist

- [ ] Notification bell opens/closes panel; badge shows unread count (1–9 or 9+).
- [ ] Click outside and Escape close the panel.
- [ ] Notifications grouped as Today, Yesterday, Earlier.
- [ ] Mark read and Mark all read update list and badge; API called.
- [ ] Each notification has correct destination link (Open league, Open chat, etc.); click navigates and closes panel.
- [ ] "See all notifications" goes to /app/notifications.
- [ ] Empty state shows when no notifications; error state shows on load error.
- [ ] Top bar: search, wallet, messages, notifications, AI chat, language, theme, admin (if admin), profile work.
- [ ] Profile menu: Profile, Settings, Log out work.
- [ ] Mobile: top bar and notification panel behave correctly.

---

## 9. Explanation of the Notification Center and Top-Bar Polish System

The **notification center** is the dropdown opened from the **notification bell** in the top bar. It gives quick awareness of **league activity**, **bracket updates**, **AI/trade/waiver-related notifications**, **mentions/messages**, and **system/announcement** items by showing a grouped, scrollable list with **mark as read** and **mark all as read**, and **destination links** (Open league, Open chat, Open bracket, etc.) from **NotificationRouteResolver**. **UnreadCountResolver** drives the bell badge (with a 9+ cap). **NotificationCenterService** handles time-based grouping (Today, Yesterday, Earlier). **NotificationDrawerController** defines Escape-to-close behavior. **NotificationReadStateService** documents the read/mark-all-read API contract. The panel shows a clear **empty state** and **error state** when appropriate.

The **top bar** is the single strip of utilities: **search**, **wallet**, **messages**, **notifications**, **AI chat**, **language**, **theme**, **admin** (when admin), and **profile** (dropdown with Profile, Settings, Log out). **TopBarUtilityResolver** describes this set and visibility rules so the bar stays consistent. All notification and top-bar interactions are wired: bell open/close, read state, destination routing, and utility links work end-to-end with no dead buttons, and session/theme/language persist across transitions.
