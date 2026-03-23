# Profile Click Audit

- Base URL: `http://127.0.0.1:3000`
- Generated account: `qa_1774240157722@example.com`

| Interaction | Expected | Actual | Status | Screenshot |
|---|---|---|---|---|
| Authentication | User is authenticated for profile click audit | Authenticated using generated account qa_1774240157722@example.com | PASS | artifacts\profile-click-audit-1774240157722\01-authentication.png |
| Dashboard to Profile entry point | A visible profile entry routes to /profile | Profile link present and routed to /profile | PASS | artifacts\profile-click-audit-1774240157722\02-dashboard-to-profile-entry-point.png |
| Profile load identity | Identity card and profile header load | Profile page loaded | PASS | artifacts\profile-click-audit-1774240157722\03-profile-load-identity.png |
| Edit profile open | Edit button reveals editable profile form | Edit form opened | PASS | artifacts\profile-click-audit-1774240157722\04-edit-profile-open.png |
| Display/Bio/Sports save | Profile edits persist after save and reload | Display name and bio persisted after save and reload | PASS | artifacts\profile-click-audit-1774240157722\05-display-bio-sports-save.png |
| Avatar preset selection save | Preset selection is clickable and save succeeds | Avatar preset click and save completed | PASS | artifacts\profile-click-audit-1774240157722\06-avatar-preset-selection-save.png |
| Upload image button filechooser | Upload image click opens file chooser event | Upload button wired to file chooser | PASS | artifacts\profile-click-audit-1774240157722\07-upload-image-button-filechooser.png |
| Cancel edit restores persisted state | Cancel discards unsaved draft changes | Cancel restored persisted display name | PASS | artifacts\profile-click-audit-1774240157722\08-cancel-edit-restores-persisted-state.png |
| Quick link: Sports App | Sports App quick link routes into app shell | Navigated to http://127.0.0.1:3000/app/home | PASS | artifacts\profile-click-audit-1774240157722\09-quick-link-sports-app.png |
| Quick link: Profile & settings | Profile & settings quick link opens /settings | Navigated to http://127.0.0.1:3000/settings | PASS | artifacts\profile-click-audit-1774240157722\10-quick-link-profile-settings.png |
| Settings tab preferences deep link | Language/timezone/theme quick link opens settings preferences tab | Opened preferences tab route | PASS | artifacts\profile-click-audit-1774240157722\11-settings-tab-preferences-deep-link.png |
| Quick link: View public profile | Own public profile quick link routes to /profile/{username} | Navigated to http://127.0.0.1:3000/profile/qa_profile_1774240157722 | PASS | artifacts\profile-click-audit-1774240157722\12-quick-link-view-public-profile.png |
| Back link from profile page | Back control returns to dashboard | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: /back to dashboard/i })
    - locator resolved to <a href="/dashboard" class="inline-flex text-xs font-medium mode-muted hover:underline">← Back to dashboard</a>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action
    - click action done
    - waiting for scheduled navigations to finish
    - navigated to "http://127.0.0.1:3000/profile"
 | FAIL | artifacts\profile-click-audit-1774240157722\13-back-link-from-profile-page-failure.png |
| Public profile (own username) | Own public route still renders profile page successfully | Own /profile/[username] route loaded | PASS | artifacts\profile-click-audit-1774240157722\14-public-profile-own-username.png |
| Public profile not-found handling | Unknown username shows not-found state | Not-found state rendered | PASS | artifacts\profile-click-audit-1774240157722\15-public-profile-not-found-handling.png |
| HomeTopNav profile link | Authenticated home top-nav profile link navigates to /profile | Top-nav profile link works | PASS | artifacts\profile-click-audit-1774240157722\16-hometopnav-profile-link.png |
| Settings modal open + tab switches | Settings icon opens modal and tabs are interactive | Modal and tab interactions work | PASS | artifacts\profile-click-audit-1774240157722\17-settings-modal-open-tab-switches.png |
| Settings modal deep link closes modal | Clicking modal deep link navigates and closes overlay | Modal closed on route navigation | PASS | artifacts\profile-click-audit-1774240157722\18-settings-modal-deep-link-closes-modal.png |
| User menu dropdown links (if visible) | User menu opens and profile/settings links navigate correctly | page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================ | FAIL | artifacts\profile-click-audit-1774240157722\19-user-menu-dropdown-links-if-visible-failure.png |
| Mobile bottom tab: Profile | Profile bottom tab works on mobile viewport | Mobile profile tab navigated to /profile | PASS | artifacts\profile-click-audit-1774240157722\20-mobile-bottom-tab-profile.png |
| Mobile sports tab active state | Sports tab is active on sports routes | Sports destination route does not render mobile bottom tabs in this shell context | BLOCKED | artifacts\profile-click-audit-1774240157722\21-mobile-sports-tab-active-state-blocked.png |

Summary: 18 passed, 2 failed, 1 blocked (total 21).