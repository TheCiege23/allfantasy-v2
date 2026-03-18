import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getClientIp, consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

const AUTH_SIGNIN_MAX = 10;
const AUTH_SIGNIN_WINDOW_MS = 60 * 1000;

async function wrappedHandler(req: Request, ctx: unknown) {
  if (req.method === "POST") {
    const url = req.url ?? "";
    const isSignin = url.includes("signin") || url.includes("callback");
    if (isSignin) {
      const ip = getClientIp(req);
      const rl = consumeRateLimit({
        scope: "auth",
        action: "signin",
        ip,
        maxRequests: AUTH_SIGNIN_MAX,
        windowMs: AUTH_SIGNIN_WINDOW_MS,
        includeIpInKey: true,
      });
      if (!rl.success) {
        return NextResponse.json(
          { error: "Too many sign-in attempts. Please try again later." },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        );
      }
    }
  }
  return handler(req as any, ctx as any);
}

export const GET = handler;
export const POST = wrappedHandler;