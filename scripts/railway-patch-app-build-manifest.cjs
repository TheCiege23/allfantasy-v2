'use strict'

/**
 * Railway / Linux builds sometimes emit CSS files under .next/static/css while
 * app-build-manifest.json lists zero CSS assets for /layout. Next then serves
 * HTML with scripts but no <link rel="stylesheet"> tags — the site looks bare.
 *
 * This post-build patch attaches every built CSS file to /layout (and to any
 * page entry that inherited layout chunks but lost the CSS references).
 */

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = process.cwd()
const isRailway = !!(
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_SERVICE_ID
)
const distDir = process.env.AF_NEXT_DIST_DIR || (isRailway ? '.next-railway' : '.next')
const manifestPath = path.join(repoRoot, distDir, 'app-build-manifest.json')
const cssDir = path.join(repoRoot, distDir, 'static', 'css')

function readCssAssets() {
  if (!fs.existsSync(cssDir)) return []
  return fs
    .readdirSync(cssDir)
    .filter((name) => name.endsWith('.css'))
    .sort()
    .map((name) => `static/css/${name}`)
}

function insertCssIntoAssets(assets, cssAssets) {
  if (!Array.isArray(assets) || cssAssets.length === 0) return assets

  const withoutCss = assets.filter((asset) => !String(asset).includes('.css'))
  const mainAppIdx = withoutCss.findIndex((asset) => String(asset).includes('main-app'))
  const layoutJsIdx = withoutCss.findIndex((asset) => String(asset).includes('app/layout'))

  let insertAt = layoutJsIdx > -1 ? layoutJsIdx : withoutCss.length
  if (mainAppIdx > -1 && insertAt <= mainAppIdx) {
    insertAt = mainAppIdx + 1
  }

  const next = [...withoutCss]
  next.splice(insertAt, 0, ...cssAssets)
  return next
}

function patchManifest() {
  if (!fs.existsSync(manifestPath)) {
    console.error('[railway-patch-manifest] missing app-build-manifest.json')
    process.exit(1)
  }

  const cssAssets = readCssAssets()
  if (cssAssets.length === 0) {
    console.error('[railway-patch-manifest] no CSS files under .next/static/css')
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const pages = manifest.pages || manifest
  const layoutKey = '/layout'
  const layoutAssets = pages[layoutKey] || []
  const layoutCssBefore = layoutAssets.filter((asset) => String(asset).includes('.css'))

  if (layoutCssBefore.length === 0) {
    pages[layoutKey] = insertCssIntoAssets(layoutAssets, cssAssets)
    console.log(
      `[railway-patch-manifest] injected ${cssAssets.length} CSS asset(s) into ${layoutKey}`,
    )
  } else {
    console.log(`[railway-patch-manifest] ${layoutKey} already lists ${layoutCssBefore.length} CSS asset(s)`)
  }

  let patchedPages = 0
  for (const [pageKey, assets] of Object.entries(pages)) {
    if (pageKey === layoutKey || !Array.isArray(assets)) continue
    const hasLayoutJs = assets.some((asset) => String(asset).includes('app/layout'))
    const hasCss = assets.some((asset) => String(asset).includes('.css'))
    if (hasLayoutJs && !hasCss) {
      pages[pageKey] = insertCssIntoAssets(assets, cssAssets)
      patchedPages += 1
    }
  }

  if (patchedPages > 0) {
    console.log(`[railway-patch-manifest] patched ${patchedPages} page entries missing CSS`)
  }

  manifest.pages = pages
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const layoutCssAfter = (pages[layoutKey] || []).filter((asset) => String(asset).includes('.css'))
  if (layoutCssAfter.length === 0) {
    console.error('[railway-patch-manifest] /layout still has no CSS assets after patch')
    process.exit(1)
  }

  console.log(`[railway-patch-manifest] ✓ /layout CSS assets: ${layoutCssAfter.length}`)
}

patchManifest()
