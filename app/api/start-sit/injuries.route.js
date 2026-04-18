// app/api/start-sit/injuries/route.js
// GET /api/start-sit/injuries?sport=nfl
//
// CASCADE: X/Grok API → News API → OpenAI web search → Rolling Insights → demo

import { NextResponse } from "next/server";
import { timedFetch, timeAgo, getDemoInjuries } from "@/lib/startSit/shared";

const KEYS = {
  x:       process.env.X_BEARER_TOKEN,
  grok:    process.env.GROK_API_KEY,
  newsApi: process.env.NEWS_API_KEY,
  openai:  process.env.OPENAI_API_KEY,
  rolling: process.env.ROLLING_INSIGHTS_KEY,
};

// ─── X / Twitter API v2 ────────────────────────────────────────────────────────
async function fromX(sport) {
  if (!KEYS.x) throw new Error("No X bearer token");
  const q = encodeURIComponent(
    `(${sport} fantasy injury OR questionable OR "ruled out" OR doubtful) lang:en -is:retweet`
  );
  const data = await timedFetch(
    `https://api.twitter.com/2/tweets/search/recent?query=${q}&max_results=15&tweet.fields=created_at,author_id&expansions=author_id&user.fields=name,username`,
    { headers: { Authorization: `Bearer ${KEYS.x}` } }
  );
  return (data.data ?? []).map((t) => {
    const user = data.includes?.users?.find((u) => u.id === t.author_id);
    return {
      player:   extractName(t.text),
      severity: /out|ruled\s?out|\bir\b/i.test(t.text) ? "high" : /questionable|limited/i.test(t.text) ? "mid" : "low",
      text:     t.text.replace(/https?:\/\/\S+/g, "").trim().slice(0, 200),
      source:   `X/@${user?.username ?? "NFL"}`,
      time:     timeAgo(t.created_at),
    };
  });
}

// ─── Grok API (xAI) ───────────────────────────────────────────────────────────
async function fromGrok(sport) {
  if (!KEYS.grok) throw new Error("No Grok key");
  const data = await timedFetch(
    "https://api.x.ai/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEYS.grok}` },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [{
          role: "user",
          content: `List the 8 most important ${sport.toUpperCase()} fantasy football injury and news updates from the last 24 hours. Sources: ESPN, Rotowire, NFL.com, Twitter/X. Return ONLY valid JSON with this structure, no markdown: {"injuries":[{"player":"Name","status":"Active|Questionable|Doubtful|Out","text":"detail under 180 chars","source":"source name","severity":"high|mid|low"}]}`,
        }],
      }),
    }
  );
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed  = JSON.parse(content.replace(/```json|```/g, "").trim());
  return (parsed.injuries ?? []).map((n) => ({ ...n, time: "< 1h ago" }));
}

// ─── News API ─────────────────────────────────────────────────────────────────
async function fromNewsApi(sport) {
  if (!KEYS.newsApi) throw new Error("No News API key");
  const q = encodeURIComponent(`${sport} fantasy football injury update questionable`);
  const data = await timedFetch(
    `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&pageSize=10&language=en`,
    { headers: { "X-Api-Key": KEYS.newsApi } }
  );
  return (data.articles ?? []).slice(0, 6).map((a) => ({
    player:   extractName(a.title),
    severity: /out|ruled\s?out/i.test(a.title) ? "high" : /questionable/i.test(a.title) ? "mid" : "low",
    text:     (a.description ?? a.title ?? "").slice(0, 200),
    source:   a.source?.name ?? "News API",
    time:     timeAgo(a.publishedAt),
  }));
}

// ─── OpenAI web search (GPT-4o with browsing) ─────────────────────────────────
async function fromOpenAISearch(sport) {
  if (!KEYS.openai) throw new Error("No OpenAI key");
  const data = await timedFetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEYS.openai}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: `Search the web for today's most important ${sport.toUpperCase()} fantasy football injury and news updates from ESPN, Bleacher Report, Rotowire, NFL.com, and Yahoo Sports. Return ONLY this JSON structure, no markdown: [{"player":"Name","status":"Questionable|Out|Active","text":"under 180 chars","source":"outlet name","severity":"high|mid|low"}]`,
        }],
        tools: [{ type: "function", function: { name: "web_search", description: "Search the web for current sports news", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }],
      }),
    }
  );
  const content = data.choices?.[0]?.message?.content ?? "[]";
  const parsed  = JSON.parse(content.replace(/```json|```/g, "").trim());
  return (Array.isArray(parsed) ? parsed : parsed.injuries ?? []).map((n) => ({ ...n, time: "Recent" }));
}

// ─── Rolling Insights news feed ────────────────────────────────────────────────
async function fromRollingInsights(sport) {
  if (!KEYS.rolling) throw new Error("No Rolling Insights key");
  const data = await timedFetch(
    `https://api.rollinginsights.com/v1/news/${sport}?limit=8`,
    { headers: { "X-API-Key": KEYS.rolling } }
  );
  return (data.news ?? data.items ?? []).map((n) => ({
    player:   n.player ?? n.playerName ?? "Player",
    severity: n.severity ?? (n.injuryStatus === "Out" ? "high" : n.injuryStatus === "Questionable" ? "mid" : "low"),
    text:     (n.headline ?? n.text ?? "").slice(0, 200),
    source:   "Rolling Insights",
    time:     timeAgo(n.publishedAt ?? n.date),
  }));
}

function extractName(text) {
  const m = text.match(/\b([A-Z][a-z]+\.?\s(?:Mc|Mac|De|La|Le)?[A-Z][a-z]+)\b/);
  return m?.[1] ?? "Unknown Player";
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport") ?? "nfl";

  const cascade = [
    () => fromX(sport),
    () => fromGrok(sport),
    () => fromNewsApi(sport),
    () => fromOpenAISearch(sport),
    () => fromRollingInsights(sport),
  ];

  const results = [];
  for (const fn of cascade) {
    try {
      const items = await fn();
      if (items?.length) {
        results.push(...items);
        if (results.length >= 8) break;
      }
    } catch (err) {
      console.warn("[injuries cascade]", err.message);
    }
  }

  const final = results.length > 0
    ? results.slice(0, 10)
    : getDemoInjuries();

  return NextResponse.json(
    { injuries: final },
    { headers: { "Cache-Control": "s-maxage=180, stale-while-revalidate=300" } }
  );
}
