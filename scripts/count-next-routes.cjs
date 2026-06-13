#!/usr/bin/env node
/**
 * Count Next.js App Router route files.
 *
 * Vercel counts each generated route (route.ts / page.tsx) toward its 2048 limit.
 * This script reports totals and the biggest route clusters so we can find
 * consolidation targets.
 *
 * Usage: node scripts/count-next-routes.cjs
 */
const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(process.cwd(), 'app');

/** @type {{file:string, kind:string}[]} */
const routeFiles = [];

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile()) {
      if (/^route\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        routeFiles.push({ file: full, kind: 'route' });
      } else if (/^page\.(ts|tsx|js|jsx|mdx)$/.test(entry.name)) {
        routeFiles.push({ file: full, kind: 'page' });
      }
    }
  }
}

if (!fs.existsSync(APP_DIR)) {
  console.error(`No app directory found at ${APP_DIR}`);
  process.exit(1);
}

walk(APP_DIR);

const routeCount = routeFiles.filter((r) => r.kind === 'route').length;
const pageCount = routeFiles.filter((r) => r.kind === 'page').length;
const total = routeFiles.length;

// Group by parent directory to find clusters.
const byDir = new Map();
for (const r of routeFiles) {
  const rel = path.relative(process.cwd(), path.dirname(r.file));
  byDir.set(rel, (byDir.get(rel) || 0) + 1);
}

// Group by top-level cluster (first 4 segments under app/api or app).
const byCluster = new Map();
for (const r of routeFiles) {
  const rel = path.relative(APP_DIR, r.file).split(path.sep);
  const cluster = rel.slice(0, Math.min(4, rel.length - 1)).join('/') || '(root)';
  byCluster.set(cluster, (byCluster.get(cluster) || 0) + 1);
}

function topN(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

console.log('='.repeat(60));
console.log('Next.js App Router route count');
console.log('='.repeat(60));
console.log(`Total route files:   ${total}`);
console.log(`  route.ts:          ${routeCount}`);
console.log(`  page.tsx:          ${pageCount}`);
console.log('');
console.log('Top 30 clusters (by first 4 path segments under app/):');
for (const [cluster, count] of topN(byCluster, 30)) {
  console.log(`  ${String(count).padStart(4)}  app/${cluster}`);
}
console.log('');
console.log('Top 25 leaf directories by route file count:');
for (const [dir, count] of topN(byDir, 25)) {
  console.log(`  ${String(count).padStart(3)}  ${dir}`);
}
