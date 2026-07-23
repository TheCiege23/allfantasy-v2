import { withApiUsage } from "@/lib/telemetry/usage"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { readAttributionFromCookieHeader } from "@/lib/analytics/attributionCookies";
import { touchToMeta } from "@/lib/analytics/attribution";

function safeStr(v: unknown, max = 500) {
  const s = typeof v === "string" ? v : "";
  return s.length > max ? s.slice(0, max) : s;
}

function sanitizeMeta(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) return undefined;
    if (serialized.length <= 10_000) {
      return JSON.parse(serialized) as Prisma.InputJsonValue;
    }
    return {
      _truncated: true,
      _approxSize: serialized.length,
    } as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

export const POST = withApiUsage({ endpoint: "/api/analytics/track", tool: "AnalyticsTrack" })(async (req: Request) => {
  try {
    const body = await req.json().catch(() => null);
    const session = (await getServerSession(authOptions as any).catch(() => null)) as
      | { user?: { id?: string } }
      | null;

    const event = safeStr(body?.event, 64).trim();
    // Fail soft: malformed/partial beacons should not surface as API failures.
    if (!event) return NextResponse.json({ ok: true, dropped: true, reason: "missing_event" });

    // Attribution is read from httpOnly cookies set server-side in middleware, never from
    // the request body — the client cannot claim a campaign it did not arrive through.
    const attribution = readAttributionFromCookieHeader(req.headers.get("cookie"));

    // Prefer the server-set anonymous id. The client's `af_session_id` lives in
    // localStorage, so it is absent across OAuth redirects and cannot correlate the
    // pre-auth journey; it is kept only as a fallback for clients with cookies disabled.
    const sessionId = attribution.anonId || safeStr(body?.sessionId, 128) || null;
    const path = safeStr(body?.path, 500) || null;
    const referrer = safeStr(body?.referrer, 500) || null;
    const userAgent = safeStr(req.headers.get("user-agent"), 500) || null;

    const toolKey = safeStr(body?.toolKey, 128) || null;
    // SECURITY / DATA TRUTH: userId comes from the server session ONLY.
    //
    // This previously read `body.userId || session.user.id`, letting the *client* choose
    // which user an event was attributed to — and taking precedence over the real session.
    // Any anonymous caller could POST arbitrary events attributed to any user id, which
    // silently corrupts every admin funnel metric derived from AnalyticsEvent (signups,
    // activations, conversions) with no way to tell fabricated rows from real ones.
    // No caller in this repo sends body.userId, so nothing legitimate depended on it.
    const userId = safeStr(session?.user?.id, 128) || null;

    const clientMeta = sanitizeMeta(body?.meta);
    // Server-derived attribution is spread LAST so a client-supplied meta key can never
    // shadow it. Absent cookies contribute nothing rather than a fabricated "direct".
    const meta = {
      ...(clientMeta && typeof clientMeta === "object" ? clientMeta : {}),
      ...(attribution.firstTouch ? touchToMeta(attribution.firstTouch, "first") : {}),
      ...(attribution.latestTouch ? touchToMeta(attribution.latestTouch, "latest") : {}),
    } as Prisma.InputJsonValue;

    await prisma.analyticsEvent.create({
      data: {
        event,
        sessionId,
        path,
        referrer,
        userAgent,
        toolKey,
        userId,
        meta,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
})
