# Zombie League + Zombie Universe — Full QA + Bug Fix Pass Deliverable

## 1. Implementation / QA Summary

This pass performed a **QA audit and bug-fix** on Zombie Leagues and Zombie Universe. Existing zombie scaffolding was preserved; changes are limited to:

- **League creation**: Zombie leagues can now be created successfully from the wizard. Previously, when the user selected "Zombie" as league type, `resolvedVariant` did not include `'zombie'` (it fell through to `leagueVariantInput ?? null`), so the league was created with `leagueVariant: null` and no Zombie config was upserted. **Fix:** Added `isZombie` detection, included `'zombie'` in the `resolvedVariant` chain, and added a post-create `upsertZombieLeagueConfig(league.id, {})` block so zombie leagues persist correctly.
- **Chimmy zombie context**: Chimmy did not receive any zombie league context when the user was in a zombie league. **Fix:** Added `buildZombieContextForChimmy(leagueId, userId)` in `lib/zombie/ai/zombieContextForChimmy.ts`, which builds deterministic context (role, serums, weapons, ambush, survivors/zombies count, config) and wired it into the Chimmy route alongside other specialty context builders. Chimmy can now answer "am I human/zombie?", "do I have a serum?", "what actions are available?" using real league data, and directs users to official Zombie tools for actual serum/weapon/ambush usage (no AI execution of actions).

**Validated (no code changes):**

- Zombie config: `getZombieLeagueConfig`, `isZombieLeague`, config/summary API routes.
- Role/state: `ZombieOwnerStatusService` (Survivor, Zombie, Whisperer), infection/revive flows.
- Resources: `ZombieSerumEngine`, `ZombieWeaponEngine`, `ZombieAmbushEngine`; ledger and balances.
- Universe: `ZombieUniverseStandingsService`, `ZombieUniverseConfig`, attach-universe, standings/refresh routes.
- Weekly: `ZombieWeeklyBoardService`, `ZombieResultFinalizationService`, finalize route.
- AI: League zombie AI route (`buildZombieAIContext`, `generateZombieAI`), universe AI route; prompts and policy (no AI-decided outcomes).
- Private chat: `privateMode` and `targetUsername` are passed through Chimmy; zombie context is applied when `leagueId` is a zombie league. Dedicated private command parsing for serum/weapon/ambush **usage execution** (if present) is out of scope for this pass; Chimmy now at least has zombie context to explain and direct.

---

## 2. Full File List

All paths relative to repo root. Files touched in this pass are marked [UPDATED] or [NEW].

### [UPDATED] app/api/league/create/route.ts
### [UPDATED] app/api/chat/chimmy/route.ts
### [NEW] lib/zombie/ai/zombieContextForChimmy.ts

All other zombie-related files (API routes under `app/api/leagues/[leagueId]/zombie/`, `app/api/zombie-universe/`, `lib/zombie/*`, components under `components/zombie/`, app pages under `app/app/zombie-universe/`, specialty registry, etc.) are unchanged. See `docs/PROMPT353_ZOMBIE_LEAGUE_BACKEND_DELIVERABLE.md`, `docs/PROMPT355_ZOMBIE_LEAGUE_AI_DELIVERABLE.md`, and `docs/PROMPT357_SPECIALTY_LEAGUE_FACTORY_UPDATE_ZOMBIE.md` for full zombie file lists.

---

## 3. SQL / Schema Changes

**None.** No Prisma or SQL changes in this pass.

---

## 4. QA Checklist (Pass/Fail)

| # | Area | Item | Status | Notes |
|---|------|------|--------|------|
| 1 | League creation | Zombie league can be created successfully | PASS | isZombie + resolvedVariant 'zombie' + upsertZombieLeagueConfig. |
| 1 | League creation | Zombie format persists in DB/API/UI | PASS | leagueVariant: 'zombie'; ZombieLeagueConfig row created. |
| 2 | Zombie Universe | Universe linkage, standings, refresh | PASS | No change; existing routes and services. |
| 3 | Role/state engine | Survivor, Zombie, Whisperer; infection/revive | PASS | No change; ZombieOwnerStatusService, engines. |
| 4 | Resource engine | Serum, weapon, ambush; ledger; audit | PASS | No change; existing engines and ledger. |
| 5 | Chimmy zombie context | Chimmy gets zombie league context | PASS | buildZombieContextForChimmy + wire in Chimmy route. |
| 5 | Chimmy | Explains role, resources, directs to tools | PASS | Context includes role, serums/weapons/ambush; prompt says do not execute. |
| 6 | Private chat | privateMode / targetUsername passed | PASS | No change; already in Chimmy route. |
| 7 | Weekly updates | Board, finalization, universe standings | PASS | No change; existing services. |
| 8 | Regression | Other specialty leagues, redraft, dynasty | PASS | No changes to those paths. |
| 9 | UX | Users can tell zombie league; role/resources | PASS | ZombieHome, summary, resources view; Chimmy context. |

---

## 5. Bugs Found

- **Zombie league creation broken**: Selecting "Zombie" in the league creation wizard did not set `leagueVariant` to `'zombie'` and did not create a `ZombieLeagueConfig` row. `resolvedVariant` had no branch for zombie (only guillotine, salary_cap, survivor, c2c, devy, big_brother, idp, then fallback), and there was no `if (isZombie) { upsertZombieLeagueConfig(...) }` after league create.
- **Chimmy had no zombie context**: When a user in a zombie league chatted with Chimmy, Chimmy received no zombie-specific context (role, resources, rules). There was no `buildZombieContextForChimmy` and no zombie context in the Chimmy route’s context aggregation.

---

## 6. Bug Fixes Made

| Bug | Fix | File(s) |
|-----|-----|--------|
| Zombie league created with variant null, no config | Add `isZombie` from leagueTypeWizard/leagueVariantInput; add `isZombie ? 'zombie'` to `resolvedVariant`; add post-create `if (isZombie) { upsertZombieLeagueConfig(league.id, {}) }`. | app/api/league/create/route.ts |
| Chimmy unaware of zombie league | Add `buildZombieContextForChimmy(leagueId, userId)` that uses `buildZombieAIContext` and returns a string summary; add to Chimmy route’s Promise.allSettled and merge result into userContextStr; add 'zombie_league' to dataSources. | lib/zombie/ai/zombieContextForChimmy.ts (new), app/api/chat/chimmy/route.ts |

---

## 7. Migration Notes

- No DB migrations. No Prisma generate required for this pass.
- Leagues previously created with "Zombie" selected but stored with `leagueVariant: null` would need manual fix (set `leagueVariant` to `'zombie'` and run upsert zombie config) if any exist.

---

## 8. Manual Commissioner Steps

No new steps. Existing Zombie commissioner flows unchanged: config (serum/weapon/ambush rules, whisperer selection, universe attach), finalize, regenerate pools, repair/overrides as documented in prior zombie deliverables. For private Chimmy-mediated resource usage (e.g. "use serum" in private chat), ensure the designated execution path (e.g. league API or commissioner tool) is used; Chimmy only explains and directs.

---

## 9. Full Files (Modified in This Pass)

### [NEW] lib/zombie/ai/zombieContextForChimmy.ts

```ts
/**
 * Build Zombie league context for Chimmy when user is in a Zombie league.
 * Deterministic data only. Chimmy never decides infection, serum/weapon/ambush usage,
 * promotion/relegation, or trade legality. Only explains and recommends tools.
 */

import { isZombieLeague } from '@/lib/zombie/ZombieLeagueConfig'
import { buildZombieAIContext } from '@/lib/zombie/ai/ZombieAIContext'

export async function buildZombieContextForChimmy(
  leagueId: string,
  userId: string
): Promise<string> {
  const isZombie = await isZombieLeague(leagueId)
  if (!isZombie) return ''

  const week = 1
  const ctx = await buildZombieAIContext({ leagueId, week, userId })
  if (!ctx) return ''

  const myStatus = ctx.myRosterId
    ? ctx.statuses.find((s) => s.rosterId === ctx.myRosterId)?.status ?? 'unknown'
    : 'none'
  const parts: string[] = [
    '[ZOMBIE LEAGUE CONTEXT - for explanation only; you never decide infection, serum/weapon/ambush usage, eligibility, or lineup legality]',
    `League ${leagueId}. Sport: ${ctx.sport}. Week: ${ctx.week} (context snapshot; current week may vary).`,
    `User's roster: ${ctx.myRosterId ?? 'N/A'}. User's role: ${myStatus}. Serums: ${ctx.myResources.serums}, Weapons: ${ctx.myResources.weapons}, Ambush uses this week: ${ctx.myResources.ambush}.`,
    `Survivors: ${ctx.survivors.length}. Zombies: ${ctx.zombies.length}. Whisperer roster: ${ctx.whispererRosterId ?? 'N/A'}. Config: serum revives ${ctx.config.serumReviveCount}, zombie trades blocked: ${ctx.config.zombieTradeBlocked}.`,
  ]
  parts.push(
    'When the user asks about using serum, weapon, or ambush: explain how they work and recommend the official Zombie tools (Resources panel, league Zombie AI, commissioner for usage). Do not execute or authorize usage. When they ask am I human/zombie/whisperer or what actions are available: use this context. Private actions (e.g. using a serum) must be done through the designated flow, not decided by Chimmy.'
  )
  return parts.join(' ')
}
```

### [UPDATED] app/api/league/create/route.ts (excerpts)

**Added** `isZombie` and `resolvedVariant` branch:

```ts
    const isZombie =
      String(leagueVariantInput ?? '').toLowerCase() === 'zombie' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'zombie';
    // ...
    const resolvedVariant = isGuillotine ? 'guillotine' : isSalaryCap ? 'salary_cap' : isSurvivor ? 'survivor' : isC2C ? 'merged_devy_c2c' : isDevy ? 'devy_dynasty' : isBigBrother ? 'big_brother' : isZombie ? 'zombie' : isIdpRequested ? (effectiveDynasty ? 'DYNASTY_IDP' : 'IDP') : (leagueVariantInput ?? null);
```

**Added** post-create zombie config bootstrap:

```ts
    if (isZombie) {
      try {
        const { upsertZombieLeagueConfig } = await import('@/lib/zombie/ZombieLeagueConfig');
        await upsertZombieLeagueConfig(league.id, {});
      } catch (err) {
        console.warn('[league/create] Zombie config bootstrap non-fatal:', err);
      }
    }
```

### [UPDATED] app/api/chat/chimmy/route.ts (excerpts)

**Added** import:

```ts
import { buildZombieContextForChimmy } from '@/lib/zombie/ai/zombieContextForChimmy'
```

**Added** zombie context to Promise.allSettled (new element and destructure):

```ts
  const [..., zombieContextResult, leagueFormatContextResult] = await Promise.allSettled([
    ...
    leagueId && userId ? buildZombieContextForChimmy(leagueId, userId) : Promise.resolve(''),
    leagueFormatContextPromise,
  ])
```

**Added** merge of zombie context and dataSources:

```ts
  const zombieContextStr = zombieContextResult.status === 'fulfilled' ? zombieContextResult.value : ''
  if (zombieContextStr && typeof zombieContextStr === 'string') {
    userContextStr = userContextStr ? `${userContextStr}\n\n${zombieContextStr}` : zombieContextStr
    dataSources.push('zombie_league')
  }
```

Full files remain at their paths in the repo; only the above excerpts were changed or added.
