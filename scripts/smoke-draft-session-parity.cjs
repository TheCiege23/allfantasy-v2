#!/usr/bin/env node

/**
 * Draft session canonical parity smoke check.
 *
 * Usage:
 *   node scripts/smoke-draft-session-parity.cjs --baseUrl=http://127.0.0.1:3101 --leagueId=<league-id> [--cookie="name=value; ..."]
 */

function getArg(name) {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return undefined;
}

function toBool(value) {
  return value === true;
}

function printUsageAndExit() {
  console.error("Usage: node scripts/smoke-draft-session-parity.cjs --baseUrl=<url> --leagueId=<league-id> [--cookie=\"name=value; ...\"]");
  process.exitCode = 2;
}

async function fetchJson(url, cookieHeader) {
  const headers = {
    Accept: "application/json",
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  const bodyText = await response.text();

  let parsed = null;
  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = null;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    bodyText,
    json: parsed,
  };
}

(async function main() {
  const baseUrlRaw = getArg("baseUrl");
  const leagueId = getArg("leagueId");
  const cookie = getArg("cookie");

  if (!baseUrlRaw || !leagueId) {
    printUsageAndExit();
    return;
  }

  const baseUrl = baseUrlRaw.replace(/\/+$/, "");
  const basePath = `/api/leagues/${encodeURIComponent(leagueId)}/draft/session`;
  const baseSessionUrl = `${baseUrl}${basePath}`;
  const debugSessionUrl = `${baseSessionUrl}?includeCanonicalDraftState=1`;

  console.log("Draft Session Parity Smoke");
  console.log(`baseUrl=${baseUrl}`);
  console.log(`leagueId=${leagueId}`);
  console.log(`cookieProvided=${cookie ? "yes" : "no"}`);

  let baseRes;
  let debugRes;

  try {
    baseRes = await fetchJson(baseSessionUrl, cookie);
    debugRes = await fetchJson(debugSessionUrl, cookie);
  } catch (error) {
    console.error("Request failure:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  console.log(`baseStatus=${baseRes.status}`);
  console.log(`debugStatus=${debugRes.status}`);

  if (baseRes.status === 500 || debugRes.status === 500) {
    console.error("Failure: one or both endpoints returned 500.");
    process.exitCode = 1;
    return;
  }

  const unauthenticated = (baseRes.status === 401 || debugRes.status === 401) && (!baseRes.ok || !debugRes.ok);
  if (unauthenticated) {
    console.error("Authenticated session required. Pass --cookie or run from an authenticated browser context.");
    process.exitCode = 1;
    return;
  }

  if (!baseRes.ok || !debugRes.ok) {
    console.error("Failure: expected both endpoints to return 200.");
    if (baseRes.bodyText) console.error(`baseBody=${baseRes.bodyText}`);
    if (debugRes.bodyText) console.error(`debugBody=${debugRes.bodyText}`);
    process.exitCode = 1;
    return;
  }

  const parity = debugRes.json && debugRes.json.canonicalDraftStateParity;
  if (!parity || typeof parity !== "object") {
    console.error("Failure: debug response is missing canonicalDraftStateParity.");
    process.exitCode = 1;
    return;
  }

  const statusMatches = toBool(parity.statusMatches);
  const currentPickMatches = toBool(parity.currentPickMatches);
  const picksMadeMatches = toBool(parity.picksMadeMatches);

  console.log("canonicalDraftStateParity:");
  console.log(`  statusMatches=${statusMatches}`);
  console.log(`  currentPickMatches=${currentPickMatches}`);
  console.log(`  picksMadeMatches=${picksMadeMatches}`);

  if (!statusMatches || !currentPickMatches || !picksMadeMatches) {
    console.error("Failure: one or more parity flags are false.");
    process.exitCode = 1;
    return;
  }

  console.log("Success: all canonical draft state parity flags are true.");
  process.exitCode = 0;
})();
