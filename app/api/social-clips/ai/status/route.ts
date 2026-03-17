/**
 * AI Social Clip — provider availability (PROMPT 146 / 151).
 * Uses centralized provider-config; frontend-safe (no secrets).
 */

import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/provider-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getProviderStatus();
  return NextResponse.json({
    xai: status.xai,
    openai: status.openai,
    deepseek: status.deepseek,
    anyAvailable: status.anyAi,
  });
}
