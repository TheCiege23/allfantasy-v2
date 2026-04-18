// app/api/start-sit/chimmy/route.js
// POST /api/start-sit/chimmy
// Body: { messages: [], context: { sport, leagueName, lens, format, week, roster, injuries, weather, matchups } }
//
// AI CASCADE (server-side): OpenAI GPT-4o → Deepseek → Grok → Anthropic Claude

import { NextResponse } from "next/server";

const AI = {
  openai:    { url: "https://api.openai.com/v1/chat/completions",  key: process.env.OPENAI_API_KEY,    model: "gpt-4o"               },
  deepseek:  { url: "https://api.deepseek.com/chat/completions",   key: process.env.DEEPSEEK_API_KEY,  model: "deepseek-chat"        },
  grok:      { url: "https://api.x.ai/v1/chat/completions",        key: process.env.GROK_API_KEY,      model: "grok-2-latest"        },
  anthropic: { url: "https://api.anthropic.com/v1/messages",       key: process.env.ANTHROPIC_API_KEY, model: "claude-sonnet-4-20250514" },
};

function buildSystemPrompt(ctx) {
  const { sport = "nfl", leagueName = "Your League", lens = "balanced", format = "PPR", week = "current", roster = [], injuries = [], weather = [], matchups = [] } = ctx;

  const lensGuide = {
    balanced: "Maximize projected points — pure expected value.",
    safe:     "Prioritize floor/consistency. Avoid boom-or-bust volatility.",
    upside:   "Target ceiling plays. Prefer high-risk, high-reward options.",
  }[lens] ?? "Maximize projected points.";

  return `You are Chimmy, the AI fantasy sports advisor for AllFantasy — the premier fantasy sports platform. You are sharp, confident, and give specific data-backed START/SIT recommendations.

CONTEXT:
Sport: ${sport.toUpperCase()} | League: ${leagueName} | Week: ${week} | Format: ${format}
Decision Lens: ${lens.toUpperCase()} — ${lensGuide}

LIVE ROSTER DATA:
${roster.map(p => `${p.name} (${p.position}, ${p.team} vs ${p.opponent}): proj=${p.projected}pts, floor=${p.floor}, ceil=${p.ceiling}, conf=${p.confidence}%, status=${p.status}, trend=${p.trend}, matchup=#${p.matchupRank}`).join("\n") || "No roster loaded."}

LIVE INJURY/NEWS:
${injuries.map(n => `[${n.severity?.toUpperCase()}] ${n.player}: ${n.text} (${n.source}, ${n.time})`).join("\n") || "No injury updates."}

LIVE WEATHER:
${weather.map(w => `${w.game}: ${w.temp}, ${w.wind} wind — impact: ${w.impact} — ${w.venue}`).join("\n") || "No weather data."}

MATCHUP INTELLIGENCE:
${matchups.map(m => `${m.position}: ${m.rankLabel} — ${m.opponent}`).join("\n") || "No matchup data."}

RULES:
- Give direct START/SIT/FLEX calls with clear data-backed reasoning
- Reference player names, exact projection numbers, and matchup ranks from the data above
- Actively flag injuries that affect decisions
- Apply the active Decision Lens to all recommendations
- Keep responses concise but complete — use line breaks for readability
- Never hedge without data to support it`;
}

async function callOpenAI(messages, systemPrompt) {
  const { url, key, model } = AI.openai;
  if (!key) throw new Error("No OpenAI key");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: "system", content: systemPrompt }, ...messages] }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function callDeepseek(messages, systemPrompt) {
  const { url, key, model } = AI.deepseek;
  if (!key) throw new Error("No Deepseek key");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: "system", content: systemPrompt }, ...messages] }),
  });
  if (!res.ok) throw new Error(`Deepseek ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function callGrok(messages, systemPrompt) {
  const { url, key, model } = AI.grok;
  if (!key) throw new Error("No Grok key");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: "system", content: systemPrompt }, ...messages] }),
  });
  if (!res.ok) throw new Error(`Grok ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function callAnthropic(messages, systemPrompt) {
  const { url, key, model } = AI.anthropic;
  if (!key) throw new Error("No Anthropic key");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 500, system: systemPrompt, messages }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages = [], context = {} } = body;

    const systemPrompt = buildSystemPrompt(context);
    const aiMessages = messages.map((m) => ({
      role:    m.role === "chimmy" ? "assistant" : m.role,
      content: m.content,
    }));

    const cascade = [
      () => callOpenAI(aiMessages, systemPrompt),
      () => callDeepseek(aiMessages, systemPrompt),
      () => callGrok(aiMessages, systemPrompt),
      () => callAnthropic(aiMessages, systemPrompt),
    ];

    for (const fn of cascade) {
      try {
        const reply = await fn();
        if (reply?.length > 10) {
          return NextResponse.json({ reply });
        }
      } catch (err) {
        console.warn("[chimmy cascade]", err.message);
      }
    }

    // Offline fallback using roster data
    const { roster = [], injuries = [], lens = "balanced" } = context;
    const sorted  = [...roster].sort((a, b) => lens === "safe" ? b.floor - a.floor : lens === "upside" ? b.ceiling - a.ceiling : b.projected - a.projected);
    const starts  = sorted.slice(0, 3).map((p) => p.name).join(", ");
    const sits    = sorted.slice(-2).map((p) => p.name).join(", ");
    const risky   = injuries.filter((n) => n.severity === "high").map((n) => n.player);
    let fallback  = `Based on live projection data (${lens} lens):\n\n✅ START: ${starts}\n❌ SIT: ${sits}`;
    if (risky.length) fallback += `\n⚠ INJURY WATCH: ${risky.join(", ")} — check status before lock`;
    fallback += "\n\n(AI providers temporarily unavailable — offline analysis from live data)";

    return NextResponse.json({ reply: fallback });
  } catch (err) {
    console.error("[/api/start-sit/chimmy]", err);
    return NextResponse.json({ error: "Chimmy is unavailable" }, { status: 500 });
  }
}
