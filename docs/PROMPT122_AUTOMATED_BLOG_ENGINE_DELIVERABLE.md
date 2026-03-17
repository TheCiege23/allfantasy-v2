# Prompt 122 — Automated Blog Creation Engine + SEO + Full UI Click Audit

## 1. Automated blog architecture

- **Database**
  - **BlogArticle**: `articleId`, `title`, `slug`, `sport`, `category`, `excerpt`, `body`, `seoTitle`, `seoDescription`, `tags` (JSON), `publishStatus`, `publishedAt`, `createdAt`, `updatedAt`. Indexes on `publishStatus`, `sport`, `category`, `publishedAt`, `createdAt`. Unique on `slug`.
  - **BlogPublishLog**: `publishId`, `articleId`, `actionType`, `status`, `createdAt`. FK to `BlogArticle` with cascade delete.
- **Library** (`lib/automated-blog/`)
  - **BlogTopicPlanner**: topic hints, categories, supported sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer via `lib/sport-scope.ts`).
  - **BlogContentGenerator**: AI draft generation (OpenAI JSON) for title, slug, excerpt, body, seoTitle, seoDescription, tags; sport- and category-aware.
  - **BlogSEOMetadataBuilder**: SEO title/description/canonical, OG fields, optional heading-structure suggestion.
  - **InternalLinkSuggestionService**: suggestions to tool and sport landing pages using `lib/seo-landing/config.ts`.
  - **BlogDraftWorkflowService**: create draft, update draft (title, slug, excerpt, body, SEO, tags).
  - **BlogPublishService**: publish now, schedule (optional), unpublish; writes **BlogPublishLog**.
  - **AutomatedBlogEngine**: orchestrates generate-and-save, SEO for article, internal link suggestions.
- **APIs**
  - `GET /api/blog` — list (query: `status`, `sport`, `category`, `limit`).
  - `POST /api/blog/generate` — generate draft JSON (no save). Body: `sport`, `category`, `topicHint?`.
  - `POST /api/blog/generate-and-save` — generate and save as draft. Body: `sport`, `category`, `topicHint?`.
  - `POST /api/blog` — create draft from body. Body: `sport`, `category`, `draft` (title, slug, excerpt, body, seoTitle, seoDescription, tags).
  - `GET /api/blog/[articleId]` — get one by id.
  - `GET /api/blog/slug/[slug]` — get by slug; `?preview=1` returns drafts.
  - `PATCH /api/blog/[articleId]` — update draft.
  - `POST /api/blog/[articleId]/publish` — publish now.
- **Public**
  - `app/blog/page.tsx` — blog index (published only); SEO metadata, canonical.
  - `app/blog/[slug]/page.tsx` — article page; `?preview=1` shows drafts; `generateMetadata` + `buildBlogSEO`.
- **Admin**
  - `app/admin/components/AdminBlog.tsx` — CMS: generate (preview + save), sport/category/topic selectors, list with filters (status, sport, category), preview/open, publish, refresh, SEO preview toggle.
- **SEO**
  - Sitemap: `app/sitemap.xml/route.ts` includes `/blog` and all published `/blog/[slug]` with `lastmod`.

## 2. Content generation workflow design

1. **Topic/sport selection**  
   User picks sport (from SUPPORTED_SPORTS) and category (weekly_strategy, waiver_wire, trade_value, draft_prep, matchup_preview, bracket_strategy, playoff_recap, ranking_updates, sport_trends, ai_explainer, tool_landing). Optional topic hint from **BlogTopicPlanner** defaults.

2. **Generate**
   - **Generate preview**: `POST /api/blog/generate` → returns `draft` (title, slug, excerpt, body, seoTitle, seoDescription, tags). UI shows draft + “Save as draft” and “Show SEO preview”.
   - **Generate and save**: `POST /api/blog/generate-and-save` → creates draft in DB, returns `articleId`, `slug`; list refreshes.

3. **Save draft**  
   If user chose “Generate preview”, “Save as draft” sends `POST /api/blog` with `sport`, `category`, `draft`. New article appears in list.

4. **Preview**  
   List row “Preview” opens `/blog/[slug]` (drafts: `/blog/[slug]?preview=1`). Article page uses Prisma; when `preview=1`, draft articles are shown.

5. **Edit**  
   Draft fields can be updated via `PATCH /api/blog/[articleId]` (title, slug, excerpt, body, seoTitle, seoDescription, tags). Admin UI currently exposes “Generate” + “Save as draft”; full inline edit of existing draft can be added later.

6. **Publish**  
   “Publish” button on draft row calls `POST /api/blog/[articleId]/publish`. Status becomes `published`, `publishedAt` set, **BlogPublishLog** entry created.

7. **Schedule**  
   Backend supports **BlogPublishService.scheduleArticle**; no schedule UI in admin yet (future-ready).

## 3. SEO / blog metadata design

- **Per-article**
  - **BlogSEOMetadataBuilder.buildBlogSEO** builds: `title` (article title | “AllFantasy Blog”), `description` (excerpt/body slice ≤160), `canonical` (`https://allfantasy.ai/blog/[slug]`), `ogTitle`, `ogDescription`, `keywords` (fantasy sports, sport, category, AllFantasy).
- **Blog index**
  - Static metadata: title “Fantasy Sports Blog – Strategy, Waiver Wire & Rankings | AllFantasy”, description, canonical `/blog`, OG/twitter.
- **Article page**
  - `generateMetadata` uses `buildBlogSEO`; Next.js metadata includes `alternates.canonical`, `openGraph`, `twitter`, `robots: { index, follow }`.
- **Internal linking**
  - **InternalLinkSuggestionService** suggests links to `/sports/[sportSlug]`, `/tools/[toolSlug]`, `/blog` from article sport/category/body. Used by engine; can be surfaced in CMS or injected into body in a future iteration.
- **Sitemap**
  - `/blog` and all published `/blog/[slug]` with `lastmod` from `updatedAt`.

## 4. Backend article workflow updates

- **Prisma**
  - Added **BlogArticle** and **BlogPublishLog**; migration `20260342000000_add_automated_blog_engine/migration.sql`.
- **Draft lifecycle**
  - Create: **BlogDraftWorkflowService.createDraft** (unique slug with timestamp suffix on conflict).
  - Update: **BlogDraftWorkflowService.updateDraft** (only when `publishStatus === 'draft'`).
- **Publish lifecycle**
  - **BlogPublishService.publishArticle**: set `publishStatus = 'published'`, `publishedAt = now()`, append **BlogPublishLog**.
  - **BlogPublishService.scheduleArticle**: set `publishStatus = 'scheduled'`, `publishedAt = scheduledAt`; log entry.
  - **BlogPublishService.unpublishArticle**: set back to draft, clear `publishedAt`; log.
- **APIs**
  - All blog routes implemented as above; list uses Prisma filters; slug endpoint returns 404 for draft unless `?preview=1`.

## 5. Frontend blog / CMS-style updates

- **Public**
  - **Blog index** (`/blog`): server component, lists published articles with link to `/blog/[slug]`, sport/category and date.
  - **Article** (`/blog/[slug]`): server component; supports `?preview=1` to show drafts; metadata via **buildBlogSEO**; simple markdown-style rendering (headings, bold).
- **Admin**
  - **AdminBlog**: sport dropdown (SUPPORTED_SPORTS), category dropdown (all BLOG_CATEGORIES), optional topic hint dropdown (from **getDefaultTopicHints**).
  - Buttons: “Generate preview” → shows draft + SEO preview toggle + “Save as draft”; “Generate and save draft” → one-shot create and refresh list.
  - Filters: status, sport, category; list shows title, slug, status, “Preview”, “Publish” (drafts only).
  - “Refresh” reloads list. Preview link uses `/blog/[slug]?preview=1` for drafts.

## 6. Full UI click audit findings

| Element | Component / Route | Handler | State / Backend | Status |
|--------|-------------------|--------|-----------------|--------|
| Generate preview | AdminBlog | `handleGenerate` | `POST /api/blog/generate`, sets `generatedDraft` | Wired |
| Generate and save draft | AdminBlog | `handleGenerateAndSave` | `POST /api/blog/generate-and-save`, then `fetchArticles` | Wired |
| Sport selector | AdminBlog | `setSport` | Local state; used in generate requests | Wired |
| Category selector | AdminBlog | `setCategory` | Local state; used in generate requests | Wired |
| Topic hint | AdminBlog | `setTopicHint` | Local state; sent as `topicHint` | Wired |
| Save as draft (from preview) | AdminBlog | `handleSaveDraft` | `POST /api/blog` with `draft`, then refresh | Wired |
| Show SEO preview | AdminBlog | `setShowSeoPreview` | Toggle; shows seoTitle, seoDescription | Wired |
| Refresh | AdminBlog | `fetchArticles` | `GET /api/blog` with filters | Wired |
| Status filter | AdminBlog | `setStatusFilter` | Triggers `fetchArticles` | Wired |
| Sport filter | AdminBlog | `setSportFilter` | Triggers `fetchArticles` | Wired |
| Category filter | AdminBlog | `setCategoryFilter` | Triggers `fetchArticles` | Wired |
| Article row – Preview | AdminBlog | Link | `/blog/[slug]` or `?preview=1` for drafts | Wired |
| Article row – Publish | AdminBlog | `handlePublish(articleId)` | `POST /api/blog/[articleId]/publish`, then refresh | Wired |
| Blog index – article card | blog/page.tsx | Link | `/blog/[slug]` | Wired |
| Article page – Back to Blog | blog/[slug]/page.tsx | Link | `/blog` | Wired |

**Not implemented (optional / future)**  
- Edit draft button (open inline/modal and PATCH): backend supports PATCH; UI could add “Edit” opening a form with current article from GET /api/blog/[articleId].  
- Schedule publish: backend has `scheduleArticle`; no date picker in admin yet.  
- Slug preview in CMS: generated draft shows slug in “Generated draft” block; no separate slug editor for existing draft.  
- Mobile-specific article preview actions: same buttons; layout is responsive.

## 7. QA findings

- **Article generation**: Uses OpenAI; depends on `OPENAI_API_KEY` (or `AI_INTEGRATIONS_OPENAI_API_KEY`). If key missing, generation fails gracefully (API returns 500 / “Generation failed”).
- **Draft save**: POST /api/blog with valid `sport`, `category`, `draft` creates row; slug uniquified on conflict.
- **Preview**: `/blog/[slug]?preview=1` correctly shows draft content when article is draft.
- **Publish**: POST publish sets status and publishedAt; list and public index show published only (without preview).
- **SEO metadata**: buildBlogSEO used in article generateMetadata; canonical and OG set.
- **Blog cards and routes**: Index lists published; cards link to `/blog/[slug]`. Article page 404s for draft without preview.
- **Sport/category filters**: Admin list and API accept status, sport, category; list refreshes when filters change.
- **Prisma generate**: Schema has **BlogArticle** and **BlogPublishLog**. If Prisma generate fails for unrelated schema issues (e.g. existing ReferralEvent relation), run migration SQL manually: `prisma migrate deploy` or execute `prisma/migrations/20260342000000_add_automated_blog_engine/migration.sql` against the DB.

## 8. Issues fixed

- **AdminBlog**: Replaced “Coming soon” with full CMS (generate, save, list, filters, preview, publish).
- **Preview for drafts**: Article page accepts `?preview=1` and shows draft articles; admin Preview link uses it for drafts.
- **Duplicate Open link**: Removed redundant “API”/“Open” link; kept single Preview link to `/blog/[slug]`.
- **Sitemap**: Added `/blog` and dynamic published blog slugs with lastmod.
- **createDraft API**: POST /api/blog expects `draft` object (not generate-and-save); fixed to use **createDraft** with body.draft.
- **Generate-and-save**: Implemented as separate route so admin can choose “preview first” or “generate and save in one step”.

## 9. Final QA checklist

- [ ] Run DB migration for BlogArticle and BlogPublishLog (or apply SQL manually if Prisma generate fails).
- [ ] Set OpenAI API key; test “Generate preview” and “Generate and save draft” in Admin → Blog.
- [ ] Verify “Save as draft” after generate preview creates an article and list refreshes.
- [ ] Verify “Preview” opens `/blog/[slug]` (with `?preview=1` for drafts) and content renders.
- [ ] Verify “Publish” on a draft updates status and article appears on public `/blog` index.
- [ ] Verify blog index shows only published articles; filters in admin work (status, sport, category).
- [ ] Check article page `<title>` and meta description (and canonical) for a published post.
- [ ] Check sitemap.xml includes `/blog` and `/blog/[slug]` for published articles.
- [ ] Test all seven sports in sport selector (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).
- [ ] Confirm no dead buttons: every AdminBlog button has a handler and correct API/route.

## 10. Explanation of the automated blog creation system

The system produces **fantasy-sports SEO blog content** (weekly strategy, waiver wire, trade value, draft prep, matchup preview, bracket strategy, playoff recap, ranking updates, sport trends, AI explainer, tool landing) to improve SEO, internal linking, tool discovery, and engagement.

**Flow:**

1. **Topic/sport**  
   User selects sport (all seven supported) and category. Optional topic hint narrows the AI prompt.

2. **Generation**  
   **BlogContentGenerator** calls OpenAI (JSON mode) with category-specific system prompts and sport + topic. Output is normalized into title, slug, excerpt, body, seoTitle, seoDescription, tags.

3. **Draft**  
   Content is either shown in the CMS for review and “Save as draft”, or saved immediately via “Generate and save draft”. **BlogDraftWorkflowService** creates the row (slug uniquified if needed). **BlogSEOMetadataBuilder** and **InternalLinkSuggestionService** support SEO and internal links (tools/sports/blog index).

4. **Preview**  
   User can open the article at `/blog/[slug]`; drafts are visible with `?preview=1`.

5. **Publish**  
   “Publish” calls **BlogPublishService.publishArticle**, which sets `publishStatus` and `publishedAt` and logs to **BlogPublishLog**. The article then appears on the public blog index and in the sitemap.

**SEO:** Clean URLs (`/blog/[slug]`), per-article metadata and canonical, sitemap inclusion, and internal link suggestions to tools and sport pages. **Future:** Schedule publish (backend ready), optional manual edit step, and editorial review workflow.
