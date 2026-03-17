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
} from "lucide-react";
import { SUPPORTED_SPORTS } from "@/lib/sport-scope";
import {
  getCategoriesWithLabels,
  getDefaultTopicHints,
} from "@/lib/automated-blog/BlogTopicPlanner";
import { BLOG_CATEGORY_LABELS } from "@/lib/automated-blog/types";
import type { BlogCategory } from "@/lib/automated-blog/types";

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

export default function AdminBlog() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sportFilter, setSportFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [sport, setSport] = useState<string>(SUPPORTED_SPORTS[0] ?? "NFL");
  const [category, setCategory] = useState<BlogCategory>("weekly_strategy");
  const [topicHint, setTopicHint] = useState("");
  const [generatedDraft, setGeneratedDraft] = useState<DraftContent | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [showSeoPreview, setShowSeoPreview] = useState(false);

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
      if (data.draft) setGeneratedDraft(data.draft);
      else alert(data.error || "Generation failed");
    } catch (e) {
      alert("Request failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAndSave = async () => {
    setSaving(true);
    setGeneratedDraft(null);
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
      if (data.articleId) {
        await fetchArticles();
        setPreviewSlug(data.slug);
      } else {
        alert(data.error || "Failed");
      }
    } catch {
      alert("Request failed");
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
        await fetchArticles();
        setPreviewSlug(data.slug);
      } else {
        alert(data.error || "Save failed");
      }
    } catch {
      alert("Request failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (articleId: string) => {
    setPublishingId(articleId);
    try {
      const res = await fetch(`/api/blog/${articleId}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.ok) await fetchArticles();
      else alert(data.error || "Publish failed");
    } catch {
      alert("Request failed");
    } finally {
      setPublishingId(null);
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
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate preview
          </button>
          <button
            type="button"
            onClick={handleGenerateAndSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate and save draft
          </button>
        </div>

        {generatedDraft && (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <h4 className="text-sm font-medium text-white mb-2">Generated draft</h4>
            <p className="text-sm text-gray-300"><strong>Title:</strong> {generatedDraft.title}</p>
            <p className="text-sm text-gray-400 mt-1"><strong>Slug:</strong> {generatedDraft.slug}</p>
            <button
              type="button"
              onClick={() => setShowSeoPreview(!showSeoPreview)}
              className="mt-2 text-xs text-amber-400 hover:underline"
            >
              {showSeoPreview ? "Hide" : "Show"} SEO preview
            </button>
            {showSeoPreview && (
              <div className="mt-2 rounded border border-white/10 p-2 text-xs text-gray-400">
                <p><strong>SEO Title:</strong> {generatedDraft.seoTitle}</p>
                <p><strong>Meta description:</strong> {generatedDraft.seoDescription}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="mt-3 inline-flex items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:opacity-50"
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
              <li key={a.articleId} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-white/5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">{a.sport} · {BLOG_CATEGORY_LABELS[a.category as BlogCategory] ?? a.category}</p>
                  <p className="font-medium text-white truncate">{a.title}</p>
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
                  >
                    <FileText className="h-3 w-3" /> Edit
                  </Link>
                  <Link
                    href={`/blog/${a.slug}${a.publishStatus !== "published" ? "?preview=1" : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-xs text-white hover:bg-white/10"
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </Link>
                  {a.publishStatus === "draft" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(a.articleId)}
                      disabled={publishingId === a.articleId}
                      className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {publishingId === a.articleId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Publish
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {previewSlug && (
        <p className="text-sm text-gray-400">
          Preview: <Link href={`/blog/${previewSlug}`} className="text-amber-400 hover:underline">/blog/{previewSlug}</Link>
          {" "}(add ?preview=1 for drafts)
        </p>
      )}
    </div>
  );
}
