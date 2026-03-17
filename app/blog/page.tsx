import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

const BASE = "https://allfantasy.ai"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Fantasy Sports Blog – Strategy, Waiver Wire & Rankings | AllFantasy",
  description:
    "Fantasy sports blog: weekly strategy, waiver wire, trade value, draft prep, matchup previews, and ranking updates for NFL, NBA, MLB, NHL, NCAA, and Soccer.",
  alternates: { canonical: `${BASE}/blog` },
  openGraph: {
    title: "Fantasy Sports Blog | AllFantasy",
    description: "Strategy, waiver wire, draft prep, and rankings for fantasy football, basketball, baseball, hockey, and more.",
    url: `${BASE}/blog`,
    type: "website",
  },
  robots: { index: true, follow: true },
}

export default async function BlogIndexPage() {
  const articles = await prisma.blogArticle.findMany({
    where: { publishStatus: "published" },
    orderBy: { publishedAt: "desc" },
    take: 50,
  })

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Fantasy Sports Blog</h1>
          <p className="mt-2 text-gray-400">
            Strategy, waiver wire, draft prep, and rankings for NFL, NBA, MLB, NHL, NCAA, and Soccer.
          </p>
        </header>
        <ul className="space-y-6">
          {articles.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
              No articles yet. Check back soon.
            </li>
          ) : (
            articles.map((a) => (
              <li key={a.articleId}>
                <Link
                  href={`/blog/${a.slug}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
                >
                  <span className="text-xs uppercase text-gray-500">{a.sport} · {a.category.replace(/_/g, " ")}</span>
                  <h2 className="mt-1 text-lg font-semibold">{a.title}</h2>
                  {a.excerpt && <p className="mt-1 text-sm text-gray-400 line-clamp-2">{a.excerpt}</p>}
                  <time className="mt-2 block text-xs text-gray-500">
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}
                  </time>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  )
}
