import { withApiUsage } from "@/lib/telemetry/usage"
import { NextResponse } from "next/server";
import { getNflState } from "@/lib/sleeper-client";

export const dynamic = 'force-dynamic';

async function checkApiHealth(key: string): Promise<{ status: string; latency?: number }> {
  const endpoints: Record<string, string> = {
    mfl: "https://api.myfantasyleague.com/2024/export",
    fantrax: "https://www.fantrax.com",
    fantasycalc: "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&numTeams=12&ppr=1",
    thesportsdb: "https://www.thesportsdb.com/api/v1/json/3/all_leagues.php",
    theaudiodb: "https://www.theaudiodb.com/api/v1/json/2/album.php?i=112024",
    openai: "https://api.openai.com/v1/models",
    grok: "https://api.x.ai/v1/models",
  };

  if (key === "sleeper") {
    const start = Date.now();
    const state = await getNflState();
    if (!state) return { status: "unreachable" };
    return { status: "active", latency: Date.now() - start };
  }

  if (key === "yahoo" || key === "espn") {
    return { status: "ingestion-managed" };
  }

  const url = endpoints[key];
  if (!url) return { status: "unknown" };

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "AllFantasy-API-Check/1.0",
      },
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (res.ok || res.status === 401 || res.status === 403 || res.status === 404) {
      return { status: "active", latency };
    }
    return { status: `error-${res.status}`, latency };
  } catch (e: any) {
    if (e.name === "AbortError") {
      return { status: "timeout" };
    }
    return { status: "unreachable" };
  }
}

const estimatedCallsPerHour: Record<string, number> = {
  sleeper: 120,
  yahoo: 25,
  mfl: 10,
  fantrax: 5,
  fantasycalc: 80,
  thesportsdb: 40,
  theaudiodb: 20,
  espn: 15,
  openai: 200,
  grok: 50,
};

export const GET = withApiUsage({ endpoint: "/api/admin/api-status", tool: "AdminApiStatus" })(async () => {
  try {
    const apiKeys = ["sleeper", "yahoo", "mfl", "fantrax", "fantasycalc", "thesportsdb", "theaudiodb", "espn", "openai", "grok"];

    const healthResults = await Promise.all(
      apiKeys.map(key => checkApiHealth(key))
    );

    const now = new Date().toISOString();
    const status: Record<string, { status: string; callsPerHour: number; lastCheck: string; latency?: number }> = {};

    apiKeys.forEach((key, index) => {
      const health = healthResults[index];
      status[key] = {
        status: health.status,
        callsPerHour: estimatedCallsPerHour[key] || 0,
        lastCheck: now,
        latency: health.latency,
      };
    });

    return NextResponse.json({
      ok: true,
      timestamp: now,
      status,
    });
  } catch (error: any) {
    console.error("API status check failed:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to check API status" },
      { status: 500 }
    );
  }
})
