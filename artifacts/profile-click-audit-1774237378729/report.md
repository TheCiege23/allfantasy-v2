# Profile Click Audit

- Base URL: `http://127.0.0.1:3000`
- Generated account: `qa_1774237378729@example.com`

| Interaction | Expected | Actual | Status | Screenshot |
|---|---|---|---|---|
| Authentication | User is authenticated for profile click audit | Authenticated using generated account qa_1774237378729@example.com | PASS | artifacts\profile-click-audit-1774237378729\01-authentication.png |
| Dashboard to Profile entry point | A visible profile entry routes to /profile | Profile link present and routed to /profile | PASS | artifacts\profile-click-audit-1774237378729\02-dashboard-to-profile-entry-point.png |
| Profile load identity | Identity card and profile header load | locator.waitFor: Timeout 8000ms exceeded.
Call log:
  - waiting for getByRole('heading', { name: /profile/i }).first() to be visible
 | FAIL | artifacts\profile-click-audit-1774237378729\03-profile-load-identity-failure.png |
| Edit profile open | Edit button reveals editable profile form | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^edit$/i }).first()
 | FAIL | artifacts\profile-click-audit-1774237378729\04-edit-profile-open-failure.png |
| Display/Bio/Sports save | Profile edits persist after save and reload | locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="Your display name"]')
 | FAIL | artifacts\profile-click-audit-1774237378729\05-display-bio-sports-save-failure.png |
| Avatar preset selection save | Preset selection is clickable and save succeeds | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^edit$/i }).first()
 | FAIL | artifacts\profile-click-audit-1774237378729\06-avatar-preset-selection-save-failure.png |
| Upload image button filechooser | Upload image click opens file chooser event | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^edit$/i }).first()
 | FAIL | artifacts\profile-click-audit-1774237378729\07-upload-image-button-filechooser-failure.png |
| Cancel edit restores persisted state | Cancel discards unsaved draft changes | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^edit$/i }).first()
 | FAIL | artifacts\profile-click-audit-1774237378729\08-cancel-edit-restores-persisted-state-failure.png |
| Quick link: Sports App | Sports App quick link routes into app shell | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Sports App' }).first()
 | FAIL | artifacts\profile-click-audit-1774237378729\09-quick-link-sports-app-failure.png |
| Quick link: Profile & settings | Profile & settings quick link opens /settings | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Profile & settings' }).first()
 | FAIL | artifacts\profile-click-audit-1774237378729\10-quick-link-profile-settings-failure.png |
| Settings tab preferences deep link | Language/timezone/theme quick link opens settings preferences tab | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Language, timezone, theme' }).first()
 | FAIL | artifacts\profile-click-audit-1774237378729\11-settings-tab-preferences-deep-link-failure.png |
| Quick link: View public profile | Own public profile quick link routes to /profile/{username} | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'View public profile' }).first()
 | FAIL | artifacts\profile-click-audit-1774237378729\12-quick-link-view-public-profile-failure.png |
| Back link from profile page | Back control returns to dashboard | Back link routed to dashboard | PASS | artifacts\profile-click-audit-1774237378729\13-back-link-from-profile-page.png |
| Public profile (own username) | Own public route still renders profile page successfully | Could not resolve current username from profile page | FAIL | artifacts\profile-click-audit-1774237378729\14-public-profile-own-username-failure.png |
| Public profile not-found handling | Unknown username shows not-found state | locator.waitFor: Timeout 10000ms exceeded.
Call log:
  - waiting for getByText(/profile not found/i) to be visible
 | FAIL | artifacts\profile-click-audit-1774237378729\15-public-profile-not-found-handling-failure.png |
| HomeTopNav profile link | Authenticated home top-nav profile link navigates to /profile | Top-nav profile link works | PASS | artifacts\profile-click-audit-1774237378729\16-hometopnav-profile-link.png |
| Settings modal open + tab switches | Settings icon opens modal and tabs are interactive | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Notifications' }).first()
    - locator resolved to <button type="button" title="Notifications" aria-expanded="false" aria-label="Notifications" class="relative rounded-lg border p-2 transition">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center px-3">…</div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center px-3">…</div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center px-3">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms
 | FAIL | artifacts\profile-click-audit-1774237378729\17-settings-modal-open-tab-switches-failure.png |
| Settings modal deep link closes modal | Clicking modal deep link navigates and closes overlay | locator.click: Error: strict mode violation: getByRole('button', { name: 'Notifications' }) resolved to 2 elements:
    1) <button type="button" title="Notifications" aria-expanded="false" aria-label="Notifications" class="relative rounded-lg border p-2 transition">…</button> aka getByLabel('Notifications', { exact: true })
    2) <button type="button" class="flex w-full items-center gap-2 px-4 py-3 text-left whitespace-nowrap">…</button> aka getByRole('list').getByRole('button', { name: 'Notifications' })

Call log:
  - waiting for getByRole('button', { name: 'Notifications' })
 | FAIL | artifacts\profile-click-audit-1774237378729\18-settings-modal-deep-link-closes-modal-failure.png |
| User menu dropdown links (if visible) | User menu opens and profile/settings links navigate correctly | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('menuitem', { name: /^profile$/i })
 | FAIL | artifacts\profile-click-audit-1774237378729\19-user-menu-dropdown-links-if-visible-failure.png |
| Mobile bottom tab: Profile | Profile bottom tab works on mobile viewport | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('nav a[href="/profile"]').last()
    - locator resolved to <a href="/profile" class="group relative flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-semibold transition duration-150 active:scale-95 text-slate-300 hover:bg-slate-800/70">…</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button title="AF Legacy Mode" aria-label="AF Legacy Mode" class="rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur"> </button> from <div class="fixed bottom-4 right-4 z-40">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button title="AF Legacy Mode" aria-label="AF Legacy Mode" class="rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur"> </button> from <div class="fixed bottom-4 right-4 z-40">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button title="AF Legacy Mode" aria-label="AF Legacy Mode" class="rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur">AF Legacy</button> from <div class="fixed bottom-4 right-4 z-40">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
 | FAIL | artifacts\profile-click-audit-1774237378729\20-mobile-bottom-tab-profile-failure.png |
| Mobile sports tab active state | Sports tab is active on sports routes | locator.waitFor: Timeout 10000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: /^sports$/i }).first() to be visible
 | FAIL | artifacts\profile-click-audit-1774237378729\21-mobile-sports-tab-active-state-failure.png |

Summary: 4 passed, 17 failed, 0 blocked (total 21).