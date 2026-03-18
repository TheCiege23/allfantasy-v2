# PROMPT 281 — Admin and Moderation System Deliverable

## Objective

Control the platform via admin tools: ban users, delete leagues, view reports, monitor AI usage, and audit logs.

---

## Delivered Features

### 1. Ban users (existing + audit)

- **Where:** Admin → **Moderation** tab.
- **Flow:** Reported users list → **Ban** or **Mute**; Banned/Muted sections → **Unban** / **Unmute**.
- **API:** `POST /api/admin/moderation/users/[userId]/action` with `{ actionType: "ban" | "mute", reason?, expiresAt? }`; `DELETE .../users/[userId]/ban` and `.../mute` for removal.
- **Audit:** Each ban/mute is now written to the admin audit log (action `ban_user` or `mute_user`).

### 2. Delete leagues

- **Where:** Admin → **Leagues** tab → league table (when viewing “Largest”, “Recent”, or “Flagged”) → **Delete** per row in the Actions column.
- **Flow:** Click **Delete** → confirmation modal (“Delete league? This cannot be undone.”) → confirm → `DELETE /api/admin/leagues/[leagueId]` → list refreshes; action is audit-logged.
- **API:** `DELETE /api/admin/leagues/[leagueId]` (admin-only). Deletion cascades via Prisma (rosters, draft sessions, etc.). Response: `{ ok: true, message: "League deleted" }`.

### 3. View reports (existing)

- **Where:** Admin → **Moderation** tab.
- **Content:** Reported content (messages) and reported users; resolve/dismiss and view details.
- **API:** `GET /api/admin/dashboard/moderation`; `PATCH /api/admin/moderation/reports/message/[reportId]` and `.../reports/user/[reportId]` for resolve/dismiss.

### 4. Monitor AI usage

- **Where:** Admin → **Tools** tab → **“AI usage (7d)”** section.
- **Content:** Total AI-related API calls in the last 7 days and top AI tools/endpoints by request count. Data is loaded on Tools tab mount via `GET /api/admin/usage/ai?days=7&topN=10`.
- **API:** `GET /api/admin/usage/ai?days=7&topN=10` (admin-only). Filters `ApiUsageRollup` by tool/endpoint patterns (e.g. `/ai/`, Chimmy, waiver-ai, orchestrate, ai-adp, coach, meta-analysis, draft/ai-pick, trade/ai-decision).

### 5. Audit logs

- **Where:** Admin → **Audit** tab (URL: `?tab=audit`; "audit" is in the allowed tab list so the tab is reachable).
- **Content:** Table of recent admin actions: time, admin user id, action, target type/id, optional details. Actions include `ban_user`, `mute_user`, `moderation_action`, `delete_league`.
- **API:** `GET /api/admin/audit?limit=100&since=<ISO date>` (admin-only).
- **Persistence:** Prisma model `AdminAuditLog` (id, adminUserId, action, targetType, targetId, details Json, createdAt). Run `npx prisma db push` or add a migration so the table exists.

---

## Key Files and Routes

| Area | Path |
|------|------|
| Admin layout & tabs | `app/admin/components/AdminLayout.tsx`, `app/admin/page.tsx` |
| Moderation UI | `app/admin/components/AdminModerationPanel.tsx` |
| League overview + delete | `app/admin/components/AdminLeagueOverview.tsx` |
| Audit panel | `app/admin/components/AdminAuditPanel.tsx` |
| Tools + AI usage section | `app/admin/components/AdminTools.tsx` |
| Delete league API | `app/api/admin/leagues/[leagueId]/route.ts` (DELETE) |
| Audit read API | `app/api/admin/audit/route.ts` (GET) |
| Audit write + read helpers | `lib/admin-audit.ts` |
| Moderation action (ban/mute) + audit | `app/api/admin/moderation/users/[userId]/action/route.ts` |
| AI usage API | `app/api/admin/usage/ai/route.ts` (GET) |
| Admin auth | `lib/adminAuth.ts` (requireAdmin) |
| Schema | `prisma/schema.prisma` (AdminAuditLog, PlatformModerationAction, League, ApiUsageRollup) |

---

## Applying the audit table

If the `admin_audit_log` table does not exist yet:

```bash
npx prisma db push
```

Or create and run a migration (if your project uses migrations):

```bash
npx prisma migrate dev --name add_admin_audit_log
```

---

## Summary

- **Ban users:** Moderation panel + APIs; actions logged to audit.
- **Delete leagues:** DELETE API and **Delete** button per row in League Overview (with confirmation modal).
- **View reports:** Moderation panel (reported content, reported users, resolve/dismiss).
- **Monitor AI usage:** **AI usage (7d)** section in Tools tab; data loaded from `GET /api/admin/usage/ai` on tab load.
- **Audit logs:** `AdminAuditLog` model, `lib/admin-audit.ts`, `GET /api/admin/audit`, and **Audit** tab (`?tab=audit` in allowed list) with `AdminAuditPanel`.
