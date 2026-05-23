# AllFantasy.AI — World Cup Admin / Operator Launch Checklist

**Version:** Beta  
**Last updated:** 2026-05-23  
**Audience:** Operators, engineers, and admins launching the World Cup beta

---

## SECTION 1 — Pre-Launch Env Var Verification

Verify these env vars are set correctly in **both Vercel and Railway** before opening beta access.

### AI Cost Mode
```
AI_COST_MODE=conservative
```
Conservative mode uses caching aggressively and skips expensive models for low-value requests.

### Daily Caps (per user per day)
```
AI_CAP_FREE_CHIMMY_DAILY=3
AI_CAP_FREE_EXPLAIN_DAILY=1
AI_CAP_FREE_COMMISSIONER_BRAIN_DAILY=0

AI_CAP_PRO_CHIMMY_DAILY=30
AI_CAP_PRO_EXPLAIN_DAILY=5
AI_CAP_PRO_COMMISSIONER_BRAIN_DAILY=5

AI_CAP_ADMIN_CHIMMY_DAILY=75
AI_CAP_ADMIN_EXPLAIN_DAILY=20
AI_CAP_ADMIN_COMMISSIONER_BRAIN_DAILY=20
```
> If any var is unset, the code falls back to hardcoded defaults in `lib/ai/aiConfig.ts`. Verify with admin AI monitor (see Section 2).

### Cache TTLs
```
AI_CACHE_TTL_CHIMMY_MINUTES=20
AI_CACHE_TTL_EXPLAIN_HOURS=6
AI_CACHE_TTL_COMMISSIONER_BRAIN_MINUTES=30
AI_CACHE_TTL_SPORTS_SCHEDULE_MINUTES=15
```

### Provider Order
```
AI_PROVIDER_ORDER=openai,deepseek,xai,anthropic
```
Order is left-to-right: primary first, fallbacks last. If a provider key is absent, it is silently skipped.

### Per-Provider Budget (soft ceiling, not hard block)
```
AI_BUDGET_OPENAI_USD=18
AI_BUDGET_ANTHROPIC_USD=10
AI_BUDGET_XAI_USD=0
AI_BUDGET_DEEPSEEK_USD=0
```

### Provider API Keys (must all be present for fallback to work)
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...    (or GROK_API_KEY=...)
DEEPSEEK_API_KEY=sk-...
```
Verify each is non-empty. The admin monitor shows which providers are configured.

---

## SECTION 2 — Admin AI Usage Monitor Pre-Flight

The AI monitor is visible at **`/dashboard`** — admin emails only (`isAdminEmailAllowed` gate).

Pre-launch, verify the panel shows:

- [ ] **Provider status booleans** — openaiConfigured, anthropicConfigured, xaiConfigured, deepseekConfigured — all expected providers show `true`
- [ ] **Provider order** — matches `AI_PROVIDER_ORDER` env var
- [ ] **Cap summary** — shows free/pro/admin caps per feature
- [ ] **Budget health** — shows per-provider USD budget, totalUsd, no unexpected "unknown" values
- [ ] **Cache stats** — shows active SportsDataCache entries for `aic:*` keys
- [ ] **Call telemetry** — ChimmyContextRun entries if table is migrated; "Not tracked yet" if not (fail-safe, non-blocking)
- [ ] **No raw data exposed** — no API keys, no raw emails, no invite codes, no raw user IDs visible anywhere in the panel

---

## SECTION 3 — Route Budget Gate

Run before each deploy:
```bash
node scripts/audit-route-budget.cjs
```

**Current status:** 1899 / 1900 (GREEN — one signal from yellow zone).

**Rule:** Do not add `app/**/page.tsx` or `app/**/route.ts` without first consolidating an existing route.

If the build shows route count ≥ 1900:
- Stop the deploy
- Identify the new route file
- Consolidate behind `?action=` query param or existing handler
- Re-run the script before proceeding

---

## SECTION 4 — Daily Monitoring Routine

### Every morning during beta:

**1. Check OpenAI billing dashboard**
- Total spend vs `AI_BUDGET_OPENAI_USD`
- Any usage spikes (possible abuse or runaway loop)

**2. Check Anthropic console**
- Total spend vs `AI_BUDGET_ANTHROPIC_USD`
- Model fallback usage rate

**3. Check AllFantasy admin AI monitor (`/dashboard`)**
- Cap usage per tier — look for users hitting 0 remaining
- Cache hit rate — if near 0%, TTLs may need adjustment
- Provider status — confirm no providers dropped offline
- Budget health — confirm totalUsd is within tolerance
- Call telemetry — check for high error rates or unusually short responses

**4. Check Vercel runtime logs**
- Filter by `status=500` for `/api/chimmy` and `/api/brackets/world-cup/*/explain`
- Any TypeError patterns = likely Next.js API bug
- Any "Daily cap reached" spikes = consider increasing free cap temporarily

**5. Check failed AI calls (error-level logs)**
```
Status filter: error, fatal
Path filter: /api/chimmy, /api/brackets/world-cup
```

**6. Check user feedback channel**
- New bug reports from beta testers
- Language issues ("AI responded in wrong language")
- Confusing upgrade gates

---

## SECTION 5 — Emergency Playbook

### AI costs spiking
1. Set `AI_COST_MODE=conservative` if not already set
2. Lower free caps: `AI_CAP_FREE_CHIMMY_DAILY=1`
3. Increase cache TTLs: `AI_CACHE_TTL_CHIMMY_MINUTES=60`
4. Redeploy

### Provider offline / all requests failing
1. Remove the failing provider from `AI_PROVIDER_ORDER`
   Example: `AI_PROVIDER_ORDER=anthropic,deepseek`
2. Redeploy (env var change takes effect on cold start)
3. Monitor fallback success in Vercel logs

### Commissioner Brain causing unexpected spend
1. Set `AI_CAP_PRO_COMMISSIONER_BRAIN_DAILY=0` to disable
2. Set `AI_CAP_ADMIN_COMMISSIONER_BRAIN_DAILY=2` for admin-only testing
3. Redeploy

### AI returning errors or wrong content to users
1. Check Vercel logs for the specific error
2. If it's a provider error, route around it via `AI_PROVIDER_ORDER`
3. If it's a prompt/context bug, disable the specific action via cap (set to 0)
4. **Never expose provider names, billing errors, or API error codes to users** — the route handlers normalize all errors to generic messages

### Route budget exceeded
1. Run `node scripts/audit-route-budget.cjs` to identify new route files
2. Delete or consolidate before deploying
3. Do not force-deploy over the limit — Vercel will error at runtime

---

## SECTION 6 — Pre-Beta-Access Gate

Complete this gate before sharing beta access with external testers:

### Infrastructure
- [ ] All env vars in Section 1 verified in Vercel
- [ ] All env vars in Section 1 verified in Railway (if DB runs on Railway)
- [ ] Admin AI monitor shows all configured providers as `true`
- [ ] Route budget shows GREEN (< 1900)
- [ ] Vercel deployment: no 500 errors on latest deploy (`dpl_39RLVb4bDkPCw9oruc8vEy81BHmy` or newer)
- [ ] `npm run build` exits clean locally

### Functional
- [ ] `/brackets` loads without errors
- [ ] `/brackets/world-cup` loads
- [ ] Create pool flow completes
- [ ] Join with invite code works
- [ ] Group Stage picks save
- [ ] Finalize bracket works
- [ ] Review tab + Explain My Bracket visible
- [ ] `/ai-chat` loads and responds
- [ ] Language switch (en → es → zh → fil → vi) takes effect on server-rendered pages
- [ ] Schedule guardrail fires for "what games are on today?" with no hallucinated data
- [ ] Free cap triggers polite 429 message

### Privacy / Security
- [ ] Non-commissioner cannot see Commissioner Brain panel
- [ ] Non-owner cannot access another user's entry explain route (expect 404)
- [ ] Uniqueness card only shows aggregate counts, no raw other-user picks
- [ ] Admin AI monitor shows no raw API keys, emails, or invite codes

### Content
- [ ] Upgrade buttons link to working routes (`/pricing`, `/upgrade`)
- [ ] "Locked" state for Explain My Bracket shows clear Pro description
- [ ] Beta feedback channel configured (email / Discord / Google Form)
- [ ] Beta tester checklist distributed to testers (`docs/world-cup-beta-launch-checklist.md`)

---

## SECTION 7 — Post-Beta Rollout Notes

After beta testing is complete and before public launch:

1. Set beta-appropriate caps (start conservative, raise after load data)
2. Review admin monitor for unexpected usage patterns from beta cohort
3. Raise or lower `AI_BUDGET_*_USD` based on observed spend per provider
4. Address any L1/L2 bugs from beta tester feedback
5. Commissioner Brain language support is deferred — add i18n before public launch to non-English markets
6. Route budget is at 1899/1900 — no new routes before a consolidation pass

---

*Internal document — do not share with beta testers.*
