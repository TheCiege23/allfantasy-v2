#!/usr/bin/env node
/**
 * Count Next.js App Router route files.
 *
 * Vercel counts generated routes toward its 2048 limit. This script reports
 * route/page/layout totals and the biggest route clusters so we can identify
 * consolidation targets before production builds fail.
 *
 * Usage: node scripts/count-next-routes.cjs
 */

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const appDir = path.join(root, 'app')
const ROUTE_FILE_RE = /^(route)\.(ts|tsx|js|jsx)$/
const PAGE_FILE_RE = /^(page)\.(ts|tsx|js|jsx|mdx)$/
const LAYOUT_FILE_RE = /^(layout)\.(ts|tsx|js|jsx)$/

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
    } else if (entry.isFile()) {
      out.push(full)
    }
  }
  return out
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/')
}

function inc(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function top(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
}

function printTop(title, rows) {
  console.log(`\n${title}`)
  for (const [name, count] of rows) {
    console.log(`${String(count).padStart(5)}  ${name}`)
  }
}

if (!fs.existsSync(appDir)) {
  console.error(`No app directory found at ${appDir}`)
  process.exit(1)
}

const files = walk(appDir)
const routeFiles = files.filter((file) => ROUTE_FILE_RE.test(path.basename(file)))
const pageFiles = files.filter((file) => PAGE_FILE_RE.test(path.basename(file)))
const layoutFiles = files.filter((file) => LAYOUT_FILE_RE.test(path.basename(file)))

const dirCounts = new Map()
const apiClusterCounts = new Map()
const routeFamilyCounts = new Map()

for (const file of routeFiles) {
  const relative = rel(file)
  const dir = path.dirname(relative)
  inc(dirCounts, dir)

  const parts = dir.split('/')
  for (let depth = 2; depth <= Math.min(parts.length, 6); depth += 1) {
    inc(routeFamilyCounts, parts.slice(0, depth).join('/'))
  }

  if (relative.startsWith('app/api/')) {
    const apiParts = parts.slice(0, 5)
    inc(apiClusterCounts, apiParts.join('/'))
  }
}

console.log('Next app route file count')
console.log(`route.ts files: ${routeFiles.length}`)
console.log(`page.tsx files: ${pageFiles.length}`)
console.log(`layout.tsx files: ${layoutFiles.length}`)
console.log(`route + page files: ${routeFiles.length + pageFiles.length}`)

printTop('Top route directories', top(dirCounts, 40))
printTop('Top API clusters', top(apiClusterCounts, 40))
printTop('Top route families by prefix', top(routeFamilyCounts, 60))
