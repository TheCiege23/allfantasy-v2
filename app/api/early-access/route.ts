import { withApiUsage } from "@/lib/telemetry/usage";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSchema, sanitizeString } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { getResendClient } from "@/lib/resend-client";
import { getEarlyAccessWelcomeEmailV2 } from "@/lib/email-templates/early-access-welcome";
import { getBaseUrl } from "@/lib/get-base-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = (process.env.EARLY_ACCESS_SYNC_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const isAllowed = origin && allowed.includes(origin);

  if (!isAllowed || !origin) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-early-access-sync-secret",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export const POST = withApiUsage({
  endpoint: "/api/early-access",
  tool: "EarlyAccess",
})(async (request: NextRequest) => {
  const ip = getIp(request);
  const userAgent = request.headers.get("user-agent") || undefined;
  const referrer = request.headers.get("referer") || undefined;
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const syncSecretHeader = request.headers.get("x-early-access-sync-secret");
  const syncSecretEnv = (process.env.EARLY_ACCESS_SYNC_SECRET || "").trim();
  const isSyncAttempt = Boolean(syncSecretHeader);
  const isValidSync = isSyncAttempt && syncSecretEnv && syncSecretHeader === syncSecretEnv;

  try {
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          email?: string;
          name?: string;
          source?: string;
          utm_source?: string;
          utm_medium?: string;
          utm_campaign?: string;
          utm_content?: string;
          utm_term?: string;
          referrer?: string;
          suppressEmail?: boolean;
        }
      | null;

    const result = emailSchema.safeParse({ email: body?.email });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid email" },
        { status: 400, headers: corsHeaders }
      );
    }

    const email = sanitizeString(result.data.email).toLowerCase();
    const signupName =
      typeof body?.name === "string"
        ? sanitizeString(body.name).slice(0, 100)
        : null;

    const incomingSourceRaw =
      typeof body?.source === "string" ? body.source : undefined;
    const source = sanitizeString(incomingSourceRaw || "allfantasy.ai");

    const utmSource =
      typeof body?.utm_source === "string"
        ? sanitizeString(body.utm_source)
        : null;
    const utmMedium =
      typeof body?.utm_medium === "string"
        ? sanitizeString(body.utm_medium)
        : null;
    const utmCampaign =
      typeof body?.utm_campaign === "string"
        ? sanitizeString(body.utm_campaign)
        : null;
    const utmContent =
      typeof body?.utm_content === "string"
        ? sanitizeString(body.utm_content)
        : null;
    const utmTerm =
      typeof body?.utm_term === "string"
        ? sanitizeString(body.utm_term)
        : null;
    const pageReferrer =
      typeof body?.referrer === "string"
        ? sanitizeString(body.referrer)
        : null;

    const suppressEmail =
      body?.suppressEmail === true ||
      (isValidSync && source === "allfantasysportsapp.net");

    const effectiveSource = isValidSync ? source : "allfantasy.ai";

    if (isSyncAttempt && !isValidSync) {
      await prisma.analyticsEvent.create({
        data: {
          event: "tool_use",
          toolKey: "early_access_sync_rejected",
          path: "/api/early-access",
          userAgent,
          referrer,
          meta: {
            email,
            ip,
            origin: origin || null,
            reason: !syncSecretEnv
              ? "missing_server_secret"
              : "invalid_header_secret",
          },
        },
      });

      return NextResponse.json(
        { error: "Unauthorized sync request." },
        { status: 401, headers: corsHeaders }
      );
    }

    const existing = await prisma.earlyAccessSignup.findUnique({
      where: { email },
      select: { email: true, createdAt: true },
    });

    if (existing) {
      await prisma.analyticsEvent.create({
        data: {
          event: "signup",
          path: "/api/early-access",
          userAgent,
          referrer,
          toolKey: isValidSync ? "early_access_sync" : "early_access_signup",
          meta: {
            email,
            ip,
            alreadyExists: true,
            source: effectiveSource,
          },
        },
      });

      return NextResponse.json(
        { ok: true, alreadyExists: true, emailSent: false },
        { headers: corsHeaders }
      );
    }

    await prisma.earlyAccessSignup.create({
      data: {
        email,
        name: signupName,
        source: effectiveSource,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        referrer: pageReferrer,
      },
    });

    await prisma.analyticsEvent.create({
      data: {
        event: "signup",
        path: "/api/early-access",
        userAgent,
        referrer,
        toolKey: isValidSync ? "early_access_sync" : "early_access_signup",
        meta: {
          email,
          ip,
          alreadyExists: false,
          source: effectiveSource,
          suppressEmail,
          origin: origin || null,
        },
      },
    });

    try {
      const adSource = utmSource
        ? utmSource.toLowerCase().includes("meta") ||
          utmSource.toLowerCase().includes("facebook") ||
          utmSource.toLowerCase().includes("instagram")
          ? "Meta"
          : utmSource.toLowerCase().includes("google")
          ? "Google"
          : utmSource
        : "Direct";

      const { client: notifClient, fromEmail: notifFrom } = getResendClient();
      const notifFromAddr =
        notifFrom.trim() && !notifFrom.toLowerCase().includes("@gmail.com")
          ? notifFrom
          : "AllFantasy <noreply@allfantasy.ai>";

      await notifClient.emails.send({
        from: notifFromAddr,
        to: "allfantasysportsapp@gmail.com",
        subject: `New Early Access Signup - ${adSource}`,
        html: `<div style="font-family:sans-serif;padding:20px;">
<h2 style="margin:0 0 12px;">New Early Access Signup</h2>
${signupName ? `<p><strong>Name:</strong> ${escapeHtml(signupName)}</p>` : ""}
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Ad Source:</strong> ${escapeHtml(adSource)}</p>
${utmCampaign ? `<p><strong>Campaign:</strong> ${escapeHtml(utmCampaign)}</p>` : ""}
${utmMedium ? `<p><strong>Medium:</strong> ${escapeHtml(utmMedium)}</p>` : ""}
${utmContent ? `<p><strong>Content:</strong> ${escapeHtml(utmContent)}</p>` : ""}
${pageReferrer ? `<p><strong>Referrer:</strong> ${escapeHtml(pageReferrer)}</p>` : ""}
<p><strong>Source Site:</strong> ${escapeHtml(effectiveSource)}</p>
<p style="color:#888;font-size:12px;">Signed up at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
</div>`,
        text: `New Early Access Signup\nEmail: ${email}\nAd Source: ${adSource}\nSource Site: ${effectiveSource}`,
      });
    } catch (notifError) {
      console.error(`[EMAIL] Failed to send admin notification for ${email}:`, notifError);
    }

    let emailSent = false;
    let emailErrorMsg: string | null = null;

    if (!suppressEmail) {
      try {
        const { client, fromEmail } = getResendClient();

        const baseUrl = getBaseUrl();
        const { subject, html, text } = getEarlyAccessWelcomeEmailV2({
          email,
          baseUrl,
        });

        const from =
          fromEmail.trim() && !fromEmail.toLowerCase().includes("@gmail.com")
            ? fromEmail
            : "AllFantasy <noreply@allfantasy.ai>";

        const resp = await client.emails.send({
          from,
          to: email,
          subject,
          html,
          text,
        });

        if ("error" in resp && resp.error) {
          throw new Error(resp.error.message || "Resend send error");
        }

        emailSent = true;

        await prisma.analyticsEvent.create({
          data: {
            event: "tool_use",
            toolKey: "early_access_welcome_email_sent",
            path: "/api/early-access",
            userAgent,
            referrer,
            meta: {
              email,
              from,
              effectiveSource,
              referrer: pageReferrer,
            },
          },
        });
      } catch (emailError) {
        emailErrorMsg = getErrorMessage(emailError);

        await prisma.analyticsEvent.create({
          data: {
            event: "tool_use",
            toolKey: "early_access_welcome_email_failed",
            path: "/api/early-access",
            userAgent,
            referrer,
            meta: {
              email,
              error: emailErrorMsg,
            },
          },
        });
      }
    } else {
      await prisma.analyticsEvent.create({
        data: {
          event: "tool_use",
          toolKey: "early_access_welcome_email_suppressed",
          path: "/api/early-access",
          userAgent,
          referrer,
          meta: {
            email,
            source: effectiveSource,
            reason: "legacy_sync_or_requested",
          },
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        alreadyExists: false,
        emailSent,
        ...(process.env.NODE_ENV !== "production" && emailErrorMsg
          ? { emailError: emailErrorMsg }
          : {}),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Early access error:", error);

    try {
      await prisma.analyticsEvent.create({
        data: {
          event: "tool_use",
          toolKey: "early_access_signup_failed",
          path: "/api/early-access",
          userAgent,
          referrer,
          meta: { ip, error: getErrorMessage(error) },
        },
      });
    } catch {}

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
});