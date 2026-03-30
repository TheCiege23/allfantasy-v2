import { withApiUsage } from "@/lib/telemetry/usage"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function safeStr(v: unknown, max = 500) {
  const s = typeof v === "string" ? v : "";
  return s.length > max ? s.slice(0, max) : s;
}

function sanitizeMeta(value: unknown): Record<string, unknown> | unknown[] | null {
  if (!value || typeof value !== "object") return null;
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) return null;
    if (serialized.length <= 10_000) {
      return JSON.parse(serialized) as Record<string, unknown> | unknown[];
    }
    return {
      _truncated: true,
      _approxSize: serialized.length,
    };
  } catch {
    return null;
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

    const sessionId = safeStr(body?.sessionId, 128) || null;
    const path = safeStr(body?.path, 500) || null;
    const referrer = safeStr(body?.referrer, 500) || null;
    const userAgent = safeStr(req.headers.get("user-agent"), 500) || null;

    const toolKey = safeStr(body?.toolKey, 128) || null;
    const userId = safeStr(body?.userId, 128) || safeStr(session?.user?.id, 128) || null;

    const meta = sanitizeMeta(body?.meta);

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
