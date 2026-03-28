#!/usr/bin/env node
import { chromium } from "@playwright/test";

const baseUrl = process.env.PERF_BASE_URL ?? "http://127.0.0.1:3000";
const budgets = {
  lcpMs: Number(process.env.PERF_BUDGET_LCP_MS ?? "2800"),
  cls: Number(process.env.PERF_BUDGET_CLS ?? "0.1"),
  inpMs: Number(process.env.PERF_BUDGET_INP_MS ?? "250"),
};

function fmt(value, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return value.toFixed(digits);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const perf = {
      lcp: 0,
      cls: 0,
      inp: 0,
      supportsEventTiming:
        typeof PerformanceObserver !== "undefined" &&
        Array.isArray(PerformanceObserver.supportedEntryTypes) &&
        PerformanceObserver.supportedEntryTypes.includes("event"),
    };

    window.__AF_PERF_BUDGET__ = perf;

    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const last = entries[entries.length - 1];
        if (last && typeof last.startTime === "number") {
          window.__AF_PERF_BUDGET__.lcp = last.startTime;
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}

    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput && typeof entry.value === "number") {
            window.__AF_PERF_BUDGET__.cls += entry.value;
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {}

    if (perf.supportsEventTiming) {
      try {
        const inpObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const duration =
              typeof entry.duration === "number"
                ? entry.duration
                : (entry.processingEnd ?? 0) - (entry.startTime ?? 0);
            if (duration > window.__AF_PERF_BUDGET__.inp) {
              window.__AF_PERF_BUDGET__.inp = duration;
            }
          }
        });
        inpObserver.observe({ type: "event", buffered: true, durationThreshold: 16 });
      } catch {}
    }
  });

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector('[data-testid="landing-hero-headline"]', { timeout: 20_000 });

    const modeToggle = page.locator('button[aria-label$="Mode"]').first();
    if ((await modeToggle.count()) > 0) {
      await modeToggle.click({ timeout: 10_000 });
      await page.waitForTimeout(400);
    }

    // Let buffered observers flush.
    await page.waitForTimeout(800);

    const measured = await page.evaluate(() => window.__AF_PERF_BUDGET__ ?? null);
    if (!measured) {
      throw new Error("Unable to collect performance metrics.");
    }

    const failures = [];
    if (!measured.lcp || measured.lcp > budgets.lcpMs) {
      failures.push(`LCP ${fmt(measured.lcp, 0)}ms exceeds budget ${budgets.lcpMs}ms`);
    }
    if (measured.cls > budgets.cls) {
      failures.push(`CLS ${fmt(measured.cls, 4)} exceeds budget ${budgets.cls}`);
    }
    if (measured.supportsEventTiming && measured.inp > budgets.inpMs) {
      failures.push(`INP ${fmt(measured.inp, 0)}ms exceeds budget ${budgets.inpMs}ms`);
    }

    console.log("Landing Performance Budget Report");
    console.log(`- URL: ${baseUrl}`);
    console.log(`- LCP: ${fmt(measured.lcp, 0)} ms (budget <= ${budgets.lcpMs} ms)`);
    console.log(`- CLS: ${fmt(measured.cls, 4)} (budget <= ${budgets.cls})`);
    if (measured.supportsEventTiming) {
      console.log(`- INP: ${fmt(measured.inp, 0)} ms (budget <= ${budgets.inpMs} ms)`);
    } else {
      console.log("- INP: unsupported in current browser runtime");
    }

    if (failures.length > 0) {
      console.error("Performance budget failures:");
      for (const failure of failures) {
        console.error(`  - ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("All configured performance budgets passed.");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error("[perf-budget] fatal:", error);
  process.exitCode = 1;
});

