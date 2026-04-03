# Cursor Prompt — Settings Page Redesign

## Context
AllFantasy.ai — Next.js 14, Supabase auth, Vercel Blob.
File: `app/settings/page.tsx` and any child components in `app/settings/components/`

---

## What to Remove
- Remove the top hero/nav bar (the old AllFantasy.ai header with Home, WebApp, Bracket, Legacy links)
- Remove the Notifications sidebar panel (right side)
- Remove the AI Quick Ask sidebar panel (right side)
- Remove the Wallet Summary sidebar panel (right side)
- Remove any legacy branding or nav elements

---

## What to Keep and Rebuild

### Page Shell
- Dark navy background matching the rest of allfantasy-v2 (`#0d1117`)
- Single top bar with:
  - 🏠 Home button (lucide-react `Home` icon + "Home" label) — left side — navigates to `/dashboard` using Next.js router
  - "Settings" page title — centered or left after the Home button
- Left sidebar nav (keep the existing sections, just restyle to match the app)
- Main content area (center)
- No right sidebar at all

---

## Left Sidebar Nav Items
Style: dark card panel, each item is a clickable row with icon + label. Active item highlighted with accent color border-left. Items:

1. 👤 Profile
2. 🎛 Preferences  
3. 🔒 Security
4. 🔔 Notifications
5. 🔗 Connected Accounts
6. 🎁 Referrals
7. 📥 Legacy Import
8. 📄 Legal & Agreements
9. 🗑 Account

---

## Profile Section (default active)

**Header:** "Profile" title + subtitle "How you appear across AllFantasy"

**Avatar area:**
- Current avatar displayed as circle (48px)
- "Upload image" button — uses Vercel Blob via `/api/chat/upload` route with `access: 'public'`
- Avatar grid — 20 preset emoji/icon avatar options (keep existing options from old page)
- Selected avatar highlighted with accent border
- Avatar choice stored in Supabase `profiles` table (`avatar_url` field)

**Display name:**
- Text input pre-filled with current display name from Supabase
- Username shown below as read-only ("Username (read-only)")

**Save profile / Cancel changes buttons**

---

## Preferences Section
- Theme toggle: Dark / Light / System
- Language selector (keep existing)
- Default sport selector (NFL / NBA / MLB / NHL / Soccer)
- Time zone selector
- All stored in Supabase `user_preferences` table

---

## Security Section
- Change password form (current password + new password + confirm)
- Two-factor authentication toggle
- Active sessions list with "Sign out all devices" button
- All via Supabase Auth

---

## Notifications Section
Toggle switches for:
- Trade offers
- Waiver claims
- Injury alerts
- Scoring updates
- League chat mentions
- Chimmy AI weekly recap
- Commissioner announcements
- Email notifications toggle (master)
- Push notifications toggle (master)
Stored in Supabase `user_notification_prefs`

---

## Connected Accounts Section
- Sleeper account connection status + connect/disconnect button
- ESPN account (coming soon — grayed out)
- Yahoo Fantasy (coming soon — grayed out)
- ElevenLabs voice (admin only — hidden unless user is admin)

---

## Referrals Section
- User's referral code displayed with copy button
- Number of referrals made
- Referral rewards earned
- Referral link: `https://allfantasy.ai/ref/{code}`

---

## Legacy Import Section
- Import from ESPN, Yahoo, Sleeper (existing functionality — keep as-is, just restyle)

---

## Legal & Agreements Section
- Terms of Service link
- Privacy Policy link
- Cookie Policy link
- "I agree to terms" confirmation with date accepted

---

## Account Section
- Account created date
- Current plan badge (Free / Pro)
- "Delete Account" button — red, opens confirmation dialog, requires typing "DELETE" to confirm

---

## Implementation Notes
- Page is at `app/settings/page.tsx` — do not create a new route
- Use Supabase client to read/write all user data
- All sections are shown/hidden by clicking the left sidebar nav — no page navigation, SPA-style
- Fully responsive — sidebar collapses to a top tab bar on mobile
- Use lucide-react for all icons
- Use Tailwind for all styling matching the dark navy theme of allfantasy-v2
