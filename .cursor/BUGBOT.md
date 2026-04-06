# Bugbot review rules (AllFantasy)

Focus on **real functional bugs** over style or formatting.

## Prioritize

- **Null/undefined handling** — optional chains, missing guards before property access, empty arrays/objects.
- **Async/concurrency** — race conditions, stale closures, double submits, missing `await`, fire-and-forget errors.
- **Accidental mutation** — shared objects, React state, draft/engine state updated in place.
- **Authorization and permissions** — league roles (commissioner / co-commissioner), draft access (`canAccessLeagueDraft`, roster ownership), entitlement gates; never trust `leagueId` / `draftId` from the client without server checks.
- **API contract changes** — breaking response shapes, renamed fields, status codes; consumers in `app/` and hooks.
- **Missing validation** — body/query params, IDs, sport values; use `lib/sport-scope.ts` (`isSupportedSport`, `normalizeToSupportedSport`) instead of hardcoding one sport.
- **Incorrect error handling** — swallowed errors, wrong HTTP status, unhandled promise rejections in route handlers.
- **Risky database writes** — deletes, cascades, transactions missing where multiple rows must stay consistent (e.g. draft picks + asset pool).

## Frontend

- Stale UI state after mutations; loading and error boundaries; empty/error states for lists and tools.
- Mobile vs desktop assumptions; broken navigation or dead CTAs.

## Backend

- Unsafe assumptions about Prisma rows existing; missing `404`/`403` when resources are missing or forbidden.
- Retries/timeouts for external providers; graceful degradation when keys or providers are missing (no dead provider buttons per product rules).

## Sports-related features

- Platform-wide lists must include all supported sports from **`lib/sport-scope.ts`** (`SUPPORTED_SPORTS`, `DEFAULT_SPORT`) — do not silently restrict to NFL-only unless the feature is explicitly single-sport.

## When to comment

Only when there is a **concrete bug**, **security issue**, or **likely production regression**. Prefer **specific fix suggestions** with file/line context.

## Noise to avoid

- Pure style, naming nitpicks, or refactors that do not fix correctness or security.
