"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Eye, Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOFields } from "@/components/blog/SEOFields";
import { InternalLinkSuggestionPanel } from "@/components/blog/InternalLinkSuggestionPanel";
import { BLOG_CATEGORY_LABELS } from "@/lib/automated-blog/types";
import type { BlogCategory } from "@/lib/automated-blog/types";
import { toast } from "sonner";

type Article = {
  articleId: string;
  title: string;
  slug: string;
  sport: string;
  category: string;
  excerpt: string | null;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  publishStatus: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function BlogDraftEditorPage() {
  const params = useParams<{ articleId: string }>();
  const router = useRouter();
  const articleId = params?.articleId ?? "";
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"preview" | "edit">("edit");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const fetchArticle = useCallback(() => {
    if (!articleId) return;
    setLoading(true);
    fetch(`/api/blog/${encodeURIComponent(articleId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        const a = data.article;
        setArticle(a);
        setTitle(a.title ?? "");
        setSlug(a.slug ?? "");
        setExcerpt(a.excerpt ?? "");
        setBody(a.body ?? "");
        setSeoTitle(a.seoTitle ?? a.title ?? "");
        setSeoDescription(a.seoDescription ?? a.excerpt ?? "");
        setTags(Array.isArray(a.tags) ? a.tags : []);
      })
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [articleId]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const handleSaveDraft = () => {
    setSaving(true);
    fetch(`/api/blog/${encodeURIComponent(articleId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        excerpt,
        body,
        seoTitle,
        seoDescription,
        tags,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.article) {
          setArticle(data.article);
          toast.success("Draft saved");
        } else if (data.ok) {
          toast.success("Draft saved");
          fetchArticle();
        } else toast.error(data.error ?? "Save failed");
      })
      .catch(() => toast.error("Save failed"))
      .finally(() => setSaving(false));
  };

  const handlePublish = () => {
    setPublishing(true);
    fetch(`/api/blog/${encodeURIComponent(articleId)}/publish`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          toast.success("Published");
          fetchArticle();
        } else toast.error(data.error ?? "Publish failed");
      })
      .catch(() => toast.error("Publish failed"))
      .finally(() => setPublishing(false));
  };

  if (loading && !article) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-950 text-white px-4 py-10">
        <p className="text-zinc-400">Article not found.</p>
        <Link href="/admin" className="mt-2 inline-block text-cyan-400 hover:underline">
          Back to admin
        </Link>
      </div>
    );
  }

  const isDraft = article.publishStatus === "draft";
  const bodyHtml =
    (tab === "preview" ? body : article.body)
      .split("\n")
      .map((line: string) => {
        if (/^###\s/.test(line)) return `<h3 class="text-lg font-semibold mt-6 mb-2">${line.slice(4)}</h3>`;
        if (/^##\s/.test(line)) return `<h2 class="text-xl font-semibold mt-8 mb-2">${line.slice(3)}</h2>`;
        if (/^#\s/.test(line)) return `<h1 class="text-2xl font-bold mt-6 mb-2">${line.slice(2)}</h1>`;
        if (line.trim()) return `<p class="mb-3">${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
        return "";
      })
      .filter(Boolean)
      .join("\n");

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant={tab === "edit" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("edit")}
              className="gap-1"
            >
              <FileText className="h-4 w-4" /> Edit
            </Button>
            <Button
              variant={tab === "preview" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("preview")}
              className="gap-1"
            >
              <Eye className="h-4 w-4" /> Preview
            </Button>
          </div>
        </div>

        <header className="mb-6">
          <span className="text-xs uppercase text-gray-500">
            {article.sport} · {BLOG_CATEGORY_LABELS[article.category as BlogCategory] ?? article.category}
          </span>
          <h1 className="mt-1 text-2xl font-bold">
            {title || article.title}
          </h1>
          {article.publishStatus !== "draft" && (
            <span className="mt-2 inline-block rounded px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300">
              {article.publishStatus}
            </span>
          )}
        </header>

        {tab === "preview" ? (
          <div className="space-y-6">
            {(excerpt || article.excerpt) && (
              <p className="text-gray-400">{excerpt || article.excerpt}</p>
            )}
            <div
              className="blog-body prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Slug</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Excerpt</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Body (markdown)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={14}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white font-mono text-sm"
                />
              </div>
              <SEOFields
                seoTitle={seoTitle}
                seoDescription={seoDescription}
                tags={tags}
                onChange={({ seoTitle: s, seoDescription: d, tags: t }) => {
                  setSeoTitle(s);
                  setSeoDescription(d);
                  setTags(t);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save draft
                </Button>
                {isDraft && (
                  <Button
                    variant="default"
                    onClick={handlePublish}
                    disabled={publishing}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Publish
                  </Button>
                )}
              </div>
            </div>
            <div>
              <InternalLinkSuggestionPanel articleId={articleId} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
