"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  FileText,
  Eye,
  Save,
  Send,
  Sparkles,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { SUPPORTED_SPORTS } from "@/lib/sport-scope";
import {
  getCategoriesWithLabels,
  getDefaultTopicHints,
} from "@/lib/automated-blog/BlogTopicPlanner";
import { BLOG_CATEGORY_LABELS } from "@/lib/automated-blog/types";
import type { BlogCategory } from "@/lib/automated-blog/types";
import { toast } from "sonner";

type ArticleSummary = {
  articleId: string;
  title: string;
  slug: string;
  sport: string;
  category: string;
  excerpt: string | null;
  publishStatus: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DraftContent = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
};

type GeneratedSEO = {
  title: string;
  description: string;
  canonical: string;
};

type GeneratedInternalLink = {
  anchor: string;
  href: string;
  reason?: string;
};

type BlogProviderStatus = {
  openai: boolean;
  deepseek: boolean;
  xai: boolean;
};

export default function AdminBlog() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sportFilter, setSportFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleAtByArticleId, setScheduleAtByArticleId] = useState<Record<string, string>>({});
  const [sport, setSport] = useState<string>(SUPPORTED_SPORTS[0] ?? "NFL");
  const [category, setCategory] = useState<BlogCategory>("weekly_strategy");
  const [topicHint, setTopicHint] = useState("");
  const [generatedDraft, setGeneratedDraft] = useState<DraftContent | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [showSeoPreview, setShowSeoPreview] = useState(false);
  const [showGeneratedBodyPreview, setShowGeneratedBodyPreview] = useState(false);
  const [generatedSeo, setGeneratedSeo] = useState<GeneratedSEO | null>(null);
  const [generatedInternalLinks, setGeneratedInternalLinks] = useState<GeneratedInternalLink[]>([]);
  const [providerStatus, setProviderStatus] = useState<BlogProviderStatus | null>(null);
  const [degradedMode, setDegradedMode] = useState(false);

  const categoriesWithLabels = getCategoriesWithLabels();
  const topicHints = getDefaultTopicHints(category, sport);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (sportFilter) params.set("sport", sportFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/blog?${params}`);
      const data = await res.json();
      if (data.articles) setArticles(data.articles);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sportFilter, categoryFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedDraft(null);
    setGeneratedSeo(null);
    setGeneratedInternalLinks([]);
    setShowGeneratedBodyPreview(false);
    setDegradedMode(false);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          category,
          topicHint: (topicHint || topicHints[0]) ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.providerStatus && typeof data.providerStatus === "object") {
        setProviderStatus({
          openai: Boolean(data.providerStatus.openai),
          deepseek: Boolean(data.providerStatus.deepseek),
          xai: Boolean(data.providerStatus.xai),
        });
      } else {
        setProviderStatus(null);
      }
      setDegradedMode(Boolean(data.degradedMode));
      if (data.draft) {
        setGeneratedDraft(data.draft);
        if (data.seo && typeof data.seo === "object") {
          setGeneratedSeo({
            title: String(data.seo.title ?? ""),
            description: String(data.seo.description ?? ""),
            canonical: String(data.seo.canonical ?? ""),
          });
        }
        if (Array.isArray(data.internalLinks)) {
          setGeneratedInternalLinks(
            data.internalLinks
              .filter((entry: unknown): entry is GeneratedInternalLink => !!entry && typeof entry === "object")
              .map((entry: GeneratedInternalLink) => ({
                anchor: String(entry.anchor ?? ""),
                href: String(entry.href ?? ""),
                reason: typeof entry.reason === "string" ? entry.reason : undefined,
              }))
          );
        }
      }
      else toast.error(data.error || "Generation failed");
    } catch (e) {
      toast.error("Request failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAndSave = async () => {
    setSaving(true);
    setGeneratedDraft(null);
    setGeneratedSeo(null);
    setGeneratedInternalLinks([]);
    setShowGeneratedBodyPreview(false);
    setDegradedMode(false);
    try {
      const res = await fetch("/api/blog/generate-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          category,
          topicHint: (topicHint || topicHints[0]) ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.providerStatus && typeof data.providerStatus === "object") {
        setProviderStatus({
          openai: Boolean(data.providerStatus.openai),
          deepseek: Boolean(data.providerStatus.deepseek),
          xai: Boolean(data.providerStatus.xai),
        });
      } else {
        setProviderStatus(null);
      }
      if (data.articleId) {
        await fetchArticles();
        setPreviewSlug(data.slug);
        toast.success("Draft generated and saved");
      } else {
        toast.error(data.error || "Failed");
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedDraft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          category,
          draft: generatedDraft,
        }),
      });
      const data = await res.json();
      if (data.articleId) {
        setGeneratedDraft(null);
        setGeneratedSeo(null);
        setGeneratedInternalLinks([]);
        await fetchArticles();
        setPreviewSlug(data.slug);
        toast.success("Draft saved");
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (articleId: string) => {
    setPublishingId(articleId);
    try {
      const res = await fetch(`/api/blog/${articleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchArticles();
        toast.success("Published");
      } else toast.error(data.error || "Publish failed");
    } catch {
      toast.error("Request failed");
    } finally {
      setPublishingId(null);
    }
  };

  const handleSchedule = async (articleId: string) => {
    const scheduledAt = scheduleAtByArticleId[articleId];
    if (!scheduledAt) {
      toast.error("Select a schedule date/time first");
      return;
    }
    setSchedulingId(articleId);
    try {
      const res = await fetch(`/api/blog/${articleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", scheduledAt }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchArticles();
        toast.success("Article scheduled");
      } else toast.error(data.error || "Schedule failed");
    } catch {
      toast.error("Request failed");
    } finally {
      setSchedulingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Blog</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage SEO blog posts</p>
        </div>
        <button
          type="button"
          onClick={() => fetchArticles()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
          data-testid="admin-blog-refresh-button"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Generate section */}
      <div className="rounded-2xl border border-white/10 bg-gray-800/30 backdrop-blur p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Generate article</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Sport</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white"
              data-testid="admin-blog-sport-selector"
            >
              {SUPPORTED_SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BlogCategory)}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white"
              data-testid="admin-blog-category-selector"
            >
              {categoriesWithLabels.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">Topic hint (optional)</label>
          <select
            value={topicHint}
            onChange={(e) => setTopicHint(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white"
            data-testid="admin-blog-topic-selector"
          >
            <option value="">— Select or leave blank —</option>
            {topicHints.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            data-testid="admin-blog-generate-article-button"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate preview
          </button>
          <button
            type="button"
            onClick={handleGenerateAndSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            data-testid="admin-blog-generate-and-save-button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate and save draft
          </button>
        </div>
        {providerStatus && (
          <p className="mt-2 text-xs text-zinc-400" data-testid="admin-blog-provider-status">
            Providers — OpenAI: {providerStatus.openai ? "on" : "off"} · DeepSeek: {providerStatus.deepseek ? "on" : "off"} · xAI: {providerStatus.xai ? "on" : "off"}
          </p>
        )}
        {degradedMode && (
          <p className="mt-1 text-xs text-amber-300" data-testid="admin-blog-provider-fallback-message">
            Running in fallback mode due to provider availability. Draft remains editable before publish.
          </p>
        )}

        {generatedDraft && (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <h4 className="text-sm font-medium text-white mb-2">Generated draft</h4>
            <p className="text-sm text-gray-300"><strong>Title:</strong> {generatedDraft.title}</p>
            <p className="text-sm text-gray-400 mt-1"><strong>Slug:</strong> {generatedDraft.slug}</p>
            <p className="text-xs text-gray-500 mt-1" data-testid="admin-blog-slug-preview">
              Preview URL: /blog/{generatedDraft.slug}
            </p>
            <button
              type="button"
              onClick={() => setShowGeneratedBodyPreview((value) => !value)}
              className="mt-2 text-xs text-cyan-400 hover:underline"
              data-testid="admin-blog-preview-article-button"
            >
              {showGeneratedBodyPreview ? "Hide" : "Show"} article preview
            </button>
            {showGeneratedBodyPreview && (
              <div
                className="mt-2 max-h-56 overflow-auto rounded border border-white/10 p-2 text-xs text-gray-300 whitespace-pre-wrap"
                data-testid="admin-blog-article-preview-panel"
              >
                {generatedDraft.body}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowSeoPreview(!showSeoPreview)}
              className="mt-2 text-xs text-amber-400 hover:underline"
              data-testid="admin-blog-seo-preview-toggle"
            >
              {showSeoPreview ? "Hide" : "Show"} SEO preview
            </button>
            {showSeoPreview && (
              <div className="mt-2 rounded border border-white/10 p-2 text-xs text-gray-400" data-testid="admin-blog-seo-preview-panel">
                <p><strong>SEO Title:</strong> {generatedDraft.seoTitle}</p>
                <p><strong>Meta description:</strong> {generatedDraft.seoDescription}</p>
                {generatedSeo ? (
                  <>
                    <p><strong>Canonical:</strong> {generatedSeo.canonical}</p>
                    <p><strong>SEO title (built):</strong> {generatedSeo.title}</p>
                    <p><strong>SEO description (built):</strong> {generatedSeo.description}</p>
                  </>
                ) : null}
              </div>
            )}
            {generatedInternalLinks.length > 0 ? (
              <div className="mt-2 rounded border border-white/10 p-2 text-xs text-gray-400" data-testid="admin-blog-internal-link-preview-panel">
                <p className="mb-1 text-white/80">Internal link suggestions</p>
                <ul className="space-y-1">
                  {generatedInternalLinks.slice(0, 6).map((link, idx) => (
                    <li key={`${link.href}-${idx}`}>
                      <span className="text-cyan-300">{link.anchor}</span> → {link.href}
                      {link.reason ? ` (${link.reason})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="mt-3 inline-flex items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:opacity-50"
              data-testid="admin-blog-save-draft-button"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save as draft
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/20 bg-gray-800/50 px-3 py-1.5 text-sm text-white"
          data-testid="admin-blog-status-filter"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="rounded-lg border border-white/20 bg-gray-800/50 px-3 py-1.5 text-sm text-white"
          data-testid="admin-blog-sport-filter"
        >
          <option value="">All sports</option>
          {SUPPORTED_SPORTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-white/20 bg-gray-800/50 px-3 py-1.5 text-sm text-white"
          data-testid="admin-blog-category-filter"
        >
          <option value="">All categories</option>
          {categoriesWithLabels.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Article list */}
      <div className="rounded-2xl border border-white/10 bg-gray-800/30 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No articles match the filters.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {articles.map((a) => (
              <li
                key={a.articleId}
                className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-white/5"
                data-testid={`admin-blog-article-card-${a.articleId}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">{a.sport} · {BLOG_CATEGORY_LABELS[a.category as BlogCategory] ?? a.category}</p>
                  <Link
                    href={`/blog/${a.slug}${a.publishStatus !== "published" ? "?preview=1" : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white truncate hover:underline"
                    data-testid={`admin-blog-article-card-click-${a.articleId}`}
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-gray-400 truncate">/{a.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    a.publishStatus === "published" ? "bg-emerald-500/20 text-emerald-300" :
                    a.publishStatus === "scheduled" ? "bg-amber-500/20 text-amber-300" :
                    "bg-gray-500/20 text-gray-300"
                  }`}>
                    {a.publishStatus}
                  </span>
                  <Link
                    href={`/blog/draft/${a.articleId}`}
                    className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-xs text-white hover:bg-white/10"
                    data-testid={`admin-blog-edit-draft-button-${a.articleId}`}
                  >
                    <FileText className="h-3 w-3" /> Edit
                  </Link>
                  <Link
                    href={`/blog/${a.slug}${a.publishStatus !== "published" ? "?preview=1" : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-xs text-white hover:bg-white/10"
                    data-testid={`admin-blog-preview-link-button-${a.articleId}`}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </Link>
                  {a.publishStatus === "draft" && (
                    <>
                      <input
                        type="datetime-local"
                        value={scheduleAtByArticleId[a.articleId] ?? ""}
                        onChange={(event) =>
                          setScheduleAtByArticleId((prev) => ({
                            ...prev,
                            [a.articleId]: event.target.value,
                          }))
                        }
                        className="hidden rounded border border-white/20 bg-black/30 px-2 py-1 text-[11px] text-white lg:block"
                        data-testid={`admin-blog-schedule-input-${a.articleId}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSchedule(a.articleId)}
                        disabled={schedulingId === a.articleId}
                        className="hidden items-center gap-1 rounded border border-amber-500/40 bg-amber-500/20 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/30 disabled:opacity-50 lg:inline-flex"
                        data-testid={`admin-blog-schedule-publish-button-${a.articleId}`}
                      >
                        {schedulingId === a.articleId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarClock className="h-3 w-3" />}
                        Schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublish(a.articleId)}
                        disabled={publishingId === a.articleId}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                        data-testid={`admin-blog-publish-button-${a.articleId}`}
                      >
                        {publishingId === a.articleId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`/blog/${a.slug}?preview=1`, "_blank", "noopener,noreferrer")}
                        className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-xs text-white hover:bg-white/10 lg:hidden"
                        data-testid={`admin-blog-mobile-preview-action-${a.articleId}`}
                      >
                        <Eye className="h-3 w-3" />
                        Mobile preview
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {previewSlug && (
        <p className="text-sm text-gray-400" data-testid="admin-blog-generated-slug-preview-link">
          Preview: <Link href={`/blog/${previewSlug}`} className="text-amber-400 hover:underline">/blog/{previewSlug}</Link>
          {" "}(add ?preview=1 for drafts)
        </p>
      )}
    </div>
  );
}
