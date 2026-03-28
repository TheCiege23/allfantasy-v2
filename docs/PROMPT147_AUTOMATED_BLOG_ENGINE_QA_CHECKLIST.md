# PROMPT 147 — AllFantasy Automated Blog Engine — QA Checklist

## Overview

Automated blog engine that converts fantasy insights into SEO-friendly blog drafts. Multi-provider: DeepSeek (outline, stat sanity), xAI (narrative angles, social hook), OpenAI (final blog writing). Draft / preview / publish lifecycle with SEO fields and internal link suggestions.

---

## Schema

- **BlogArticle**: Canonical article row used by public rendering and publish lifecycle.
- **BlogDraft**: Dedicated draft-state model preserving editable draft content and draft lifecycle state.
- **BlogPublishLog**: Publish/schedule/unpublish/save lifecycle logs.

---

## Implementation Summary

| Area | Location | Notes |
|------|----------|--------|
| Types | `lib/automated-blog/types.ts` | BLOG_CATEGORIES + creator_recap, player_trend_feature; CONTENT_TYPE_PROMPTS |
| BlogGenerationService | `lib/automated-blog/BlogGenerationService.ts` | DeepSeek outline → xAI angles → OpenAI final; fallback OpenAI-only |
| BlogContentGenerator | `lib/automated-blog/BlogContentGenerator.ts` | Calls generateBlogDraftMultiProvider then OpenAI-only fallback |
| Draft workflow | `lib/automated-blog/BlogDraftWorkflowService.ts` | createDraft, updateDraft |
| Publish | `lib/automated-blog/BlogPublishService.ts` | publishArticle, scheduleArticle |
| SEO | `lib/automated-blog/BlogSEOMetadataBuilder.ts` | buildBlogSEO |
| Internal links | `lib/automated-blog/InternalLinkSuggestionService.ts` | suggestInternalLinks; creator_recap, player_trend_feature relevance |
| Generate API | `app/api/blog/generate/route.ts` | POST sport, category, topicHint → draft (uses multi-provider) |
| Generate-and-save | `app/api/blog/generate-and-save/route.ts` | POST → create draft in DB |
| Article API | `app/api/blog/[articleId]/route.ts` | GET one, PATCH draft fields |
| Internal links API | `app/api/blog/[articleId]/internal-links/route.ts` | GET suggestions |
| Publish API | `app/api/blog/[articleId]/publish/route.ts` | POST publish |
| BlogPreviewPage | `app/blog/[slug]/page.tsx` | Public article; ?preview=1 for drafts |
| BlogEditor | `app/blog/draft/[articleId]/page.tsx` | Edit / Preview tabs, form, SEOFields, InternalLinkSuggestionPanel, Save, Publish |
| SEOFields | `components/blog/SEOFields.tsx` | seoTitle, seoDescription, tags |
| InternalLinkSuggestionPanel | `components/blog/InternalLinkSuggestionPanel.tsx` | Fetches and displays internal link suggestions |
| Admin list | `app/admin/components/AdminBlog.tsx` | Generate, Generate and save, Edit (→ draft page), Preview, Publish |

---

## Content Types (categories)

- Waiver articles → waiver_wire  
- Trade articles → trade_value  
- Rankings articles → ranking_updates  
- Matchup previews → matchup_preview  
- Recap stories → playoff_recap  
- Creator recaps → creator_recap  
- Player trend features → player_trend_feature  
- Strategy articles → weekly_strategy  

Supported sports: NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (lib/sport-scope).

---

## Mandatory Click Audit

- [x] **Generate draft button works**  
  In Admin Blog, "Generate preview" calls POST /api/blog/generate; "Generate and save draft" calls POST /api/blog/generate-and-save. Both use multi-provider when available (DeepSeek → xAI → OpenAI) with fallback to OpenAI-only. Result: draft in response or new article in list.

- [x] **Preview tab works**  
  On /blog/draft/[articleId], "Preview" tab shows live preview of title, excerpt, and body (markdown rendered). No dead tab.

- [x] **Edit tab works**  
  "Edit" tab shows form: title, slug, excerpt, body (textarea), SEOFields (seoTitle, seoDescription, tags). All fields editable.

- [x] **Save draft works**  
  "Save draft" sends PATCH /api/blog/[articleId] with current form values. Success toast and refetch; SEO field edits are included and persist.

- [x] **Publish action works**  
  "Publish" (only for drafts) calls POST /api/blog/[articleId]/publish. Article moves to published; publish log created.

- [x] **SEO field edits persist**  
  After editing seoTitle, seoDescription, or tags and saving, GET /api/blog/[articleId] returns updated values. Preview and public page use stored SEO when applicable.

- [x] **No dead CMS-style controls**  
  Every button has a clear action: Generate preview, Generate and save draft, Save draft, Publish, Edit, Preview. No placeholder or disabled-without-reason controls.

---

## Backend Requirements

- **Preserve unpublished drafts**: Draft edits are persisted in `BlogDraft`; public index excludes drafts and `/blog/[slug]` only exposes drafts with `?preview=1`.
- **SEO metadata support**: seoTitle, seoDescription, tags on BlogArticle; buildBlogSEO for canonical, OG, keywords.
- **Category / sport-aware tagging**: category and sport on BlogArticle; InternalLinkSuggestionService uses category and body for suggestions.
- **Internal link suggestions**: GET /api/blog/[articleId]/internal-links returns suggestInternalLinks(article).
- **Graceful fallback if provider unavailable**: generateBlogDraft tries multi-provider first; on failure or missing provider, falls back to OpenAI-only in BlogContentGenerator.

---

## Provider Roles

- **OpenAI**: Final blog writing, structure, headline/subhead quality, readability (runOpenAIFinal in BlogGenerationService).
- **DeepSeek**: Structured outline from facts, stat sanity, ordering suggestions (runDeepSeekOutline).
- **xAI**: Narrative energy, angle ideas, social hook framing (runXaiAngles).

---

## Files Touched / Added

- `prisma/schema.prisma` (BlogDraft model + BlogArticle draft relation)
- `prisma/migrations/20260327190000_add_blog_drafts/migration.sql` (blog draft schema migration)
- `lib/automated-blog/types.ts` (creator_recap, player_trend_feature + prompts)
- `lib/automated-blog/BlogTopicPlanner.ts` (hints for new categories)
- `lib/automated-blog/BlogGenerationService.ts` (new)
- `lib/automated-blog/BlogContentGenerator.ts` (multi-provider + OpenAI + deterministic fallback)
- `lib/automated-blog/BlogDraftWorkflowService.ts` (persist/reconcile BlogDraft records)
- `lib/automated-blog/BlogPublishService.ts` (sync draft lifecycle status with publish actions)
- `lib/automated-blog/InternalLinkSuggestionService.ts` (creator_recap, player_trend_feature)
- `lib/automated-blog/index.ts` (export BlogGenerationService)
- `app/api/blog/generate/route.ts` (provider status + degraded mode in response)
- `app/api/blog/[articleId]/route.ts` (read/write draft-state from BlogDraft)
- `app/api/blog/[articleId]/internal-links/route.ts` (new)
- `app/blog/draft/[articleId]/page.tsx` (new — BlogEditor with Preview/Edit, SEOFields, InternalLinkSuggestionPanel)
- `components/blog/SEOFields.tsx` (new)
- `components/blog/InternalLinkSuggestionPanel.tsx` (new)
- `components/blog/index.ts` (new)
- `app/admin/components/AdminBlog.tsx` (Edit link to draft page, Preview link)
- `docs/PROMPT147_AUTOMATED_BLOG_ENGINE_QA_CHECKLIST.md` (this file)
