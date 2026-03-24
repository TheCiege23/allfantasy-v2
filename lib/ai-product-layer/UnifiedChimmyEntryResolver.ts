/**
 * UnifiedChimmyEntryResolver — single source of truth for all Chimmy entry points.
 * Chimmy is the face of the AI layer; every product route to chat goes through here.
 */

import type { ChimmyEntry } from './types';
import { buildAIChatHref } from '@/lib/chimmy-chat';

const CHAT_BASE = buildAIChatHref();
const CHIMMY_LANDING = '/chimmy';
const LEGACY_CHAT = '/legacy?tab=chat';

/**
 * Base href for opening AI chat (primary surface: af-legacy chat tab).
 */
export function getChimmyChatHref(): string {
  return CHAT_BASE;
}

/**
 * Chimmy landing page (marketing/onboarding).
 */
export function getChimmyLandingHref(): string {
  return CHIMMY_LANDING;
}

/**
 * Chat with optional prompt prefill (for tool-to-Chimmy routing).
 * Uses af-legacy so prompt param is read and prefilled.
 */
export function getChimmyChatHrefWithPrompt(prompt: string): string {
  if (!prompt?.trim()) return CHAT_BASE;
  return buildAIChatHref({ prompt });
}

/**
 * All canonical Chimmy entries for nav, quick actions, and dashboard.
 */
export function getUnifiedChimmyEntries(): ChimmyEntry[] {
  return [
    { href: CHAT_BASE, label: 'AI Chat' },
    { href: CHIMMY_LANDING, label: 'Meet Chimmy' },
    { href: LEGACY_CHAT, label: 'Legacy AI Chat' },
  ];
}

/**
 * Primary entry for "Ask Chimmy" / "Open AI Chat" (used in top bar, right rail, tool hub).
 */
export function getPrimaryChimmyEntry(): ChimmyEntry {
  return { href: CHAT_BASE, label: 'Ask Chimmy' };
}
