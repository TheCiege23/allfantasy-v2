import { SPORT_SLUGS, TOOL_SLUGS } from '@/lib/seo-landing/config'

export async function GET() {
  const baseUrl = 'https://allfantasy.ai'

  const staticPages = [
    { path: '', priority: '1.0', changefreq: 'weekly' },
    { path: 'app', priority: '0.9', changefreq: 'weekly' },
    { path: 'bracket', priority: '0.9', changefreq: 'weekly' },
    { path: 'brackets', priority: '0.8', changefreq: 'weekly' },
    { path: 'af-legacy', priority: '0.8', changefreq: 'weekly' },
    { path: 'trade-analyzer', priority: '0.8', changefreq: 'weekly' },
    { path: 'mock-draft', priority: '0.7', changefreq: 'weekly' },
    { path: 'waiver-ai', priority: '0.7', changefreq: 'weekly' },
    { path: 'tools-hub', priority: '0.85', changefreq: 'weekly' },
    { path: 'chimmy', priority: '0.8', changefreq: 'weekly' },
    { path: 'zen', priority: '0.6', changefreq: 'weekly' },
    { path: 'meditation', priority: '0.6', changefreq: 'weekly' },
    { path: 'breathing', priority: '0.5', changefreq: 'weekly' },
    { path: 'horoscope', priority: '0.5', changefreq: 'weekly' },
    { path: 'pricing', priority: '0.5', changefreq: 'monthly' },
  ]

  const sportUrls = SPORT_SLUGS.map(
    (slug) => `<url>
    <loc>${baseUrl}/sports/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`
  ).join('\n  ')

  const toolUrls = TOOL_SLUGS.map(
    (slug) => `<url>
    <loc>${baseUrl}/tools/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`
  ).join('\n  ')

  const staticUrls = staticPages
    .map(
      (p) => `<url>
    <loc>${baseUrl}/${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join('\n  ')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}
  ${sportUrls}
  ${toolUrls}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
