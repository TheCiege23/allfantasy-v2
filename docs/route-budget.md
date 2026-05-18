# Route Budget Audit

AllFantasy runs close to Vercel's 2048 route limit, so new feature work should reuse existing route surfaces whenever related actions share the same auth and ownership model.

Run the advisory audit with:

```bash
npm run route:audit
```

The report includes:

- source App Router page count
- source App Router API handler count
- `vercel.json` cron/route signal count
- top route-heavy folders
- suspicious diagnostic, test, dev, legacy, health, internal, and admin-only route names
- generated `.next-build-fix*` / `.next-build-disabled-routes` folder detection
- route risk level: green under 1900, yellow from 1900 to 2020, red above 2020

## Consolidation Rule

World Cup chat features must use the consolidated route:

```text
/api/brackets/world-cup/[challengeId]/chat?action=...
```

Do not add nested World Cup chat feature route files such as:

```text
/api/brackets/world-cup/[challengeId]/chat/gifs
/api/brackets/world-cup/[challengeId]/chat/upload-image
/api/brackets/world-cup/[challengeId]/notification-preferences
/api/brackets/world-cup/[challengeId]/chat/[messageId]/poll-vote
```

Use action dispatch in `app/api/brackets/world-cup/[challengeId]/chat/route.ts` and keep business logic in helper modules.

## Generated Folders

Never stage generated build folders:

```text
.next-build-fix*
.next-build-disabled-routes
.claude/worktrees
```

If Vercel reports another route-limit failure, run the audit before adding new route exclusions or feature routes.
