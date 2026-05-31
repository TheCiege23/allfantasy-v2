'use strict'

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = process.cwd()
const distDir = process.env.AF_NEXT_DIST_DIR || '.next'
const cssDir = path.join(repoRoot, distDir, 'static', 'css')
const manifestPath = path.join(repoRoot, distDir, 'app-build-manifest.json')

const MIN_LAYOUT_CSS_BYTES = 32_000
const MIN_TOTAL_CSS_BYTES = 48_000

if (!fs.existsSync(manifestPath)) {
  console.error('[railway-verify] .next/app-build-manifest.json was not produced')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const pages = manifest.pages || manifest
const layoutAssets = pages['/layout'] || []
const layoutCss = layoutAssets.filter((asset) => String(asset).includes('.css'))

let cssFiles = []
if (fs.existsSync(cssDir)) {
  cssFiles = fs.readdirSync(cssDir).filter((name) => name.endsWith('.css'))
  console.log(`[railway-verify] CSS files: ${cssFiles.length}`)
  cssFiles.slice(0, 10).forEach((name) => {
    const size = fs.statSync(path.join(cssDir, name)).size
    console.log(`[railway-verify] ${name} ${size} bytes`)
  })
} else {
  console.error('[railway-verify] .next/static/css is missing')
  process.exit(1)
}

const totalCssBytes = cssFiles.reduce(
  (sum, name) => sum + fs.statSync(path.join(cssDir, name)).size,
  0,
)

console.log(`[railway-verify] /layout CSS assets: ${layoutCss.length}`)
layoutCss.forEach((asset) => console.log(`[railway-verify] /layout -> ${asset}`))
console.log(`[railway-verify] total CSS bytes: ${totalCssBytes}`)

if (layoutCss.length === 0) {
  console.error('[railway-verify] BLOCKED: /layout has no CSS assets in app-build-manifest.json')
  process.exit(1)
}

if (totalCssBytes < MIN_TOTAL_CSS_BYTES) {
  console.error(
    `[railway-verify] BLOCKED: total CSS (${totalCssBytes} bytes) is below ${MIN_TOTAL_CSS_BYTES}`,
  )
  process.exit(1)
}

const largestCss = cssFiles
  .map((name) => ({ name, size: fs.statSync(path.join(cssDir, name)).size }))
  .sort((a, b) => b.size - a.size)[0]

if (!largestCss || largestCss.size < MIN_LAYOUT_CSS_BYTES) {
  console.warn(
    `[railway-verify] WARNING: largest CSS file is ${largestCss?.size ?? 0} bytes (expected ≥ ${MIN_LAYOUT_CSS_BYTES})`,
  )
}

console.log('[railway-verify] ✓ layout CSS present — safe to deploy')
