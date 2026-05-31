'use strict'

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = process.cwd()
const isRailway = !!(
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_SERVICE_ID
)
const distDir = process.env.AF_NEXT_DIST_DIR || (isRailway ? '.next-railway' : '.next')
const cssDir = path.join(repoRoot, distDir, 'static', 'css')
const manifestPath = path.join(repoRoot, distDir, 'app-build-manifest.json')
const serverAppDir = path.join(repoRoot, distDir, 'server', 'app')

const MIN_TOTAL_CSS_BYTES = 8_000

function walkFiles(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(entryPath, predicate, results)
      continue
    }
    if (predicate(entryPath)) results.push(entryPath)
  }

  return results
}

function readClientReferenceManifest(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const match = source.match(
    /globalThis\.__RSC_MANIFEST\["(?:\\.|[^"\\])+"\]=(\{.*\});?$/s,
  )
  if (!match) {
    throw new Error(`could not read client reference manifest payload in ${filePath}`)
  }
  return JSON.parse(match[1])
}

function isRootLayoutEntry(entryKey) {
  return /(?:^|[\\/])app[\\/]layout$/.test(entryKey)
}

if (!fs.existsSync(manifestPath)) {
  console.error(`[railway-verify] ${distDir}/app-build-manifest.json was not produced`)
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
  console.error(`[railway-verify] ${distDir}/static/css is missing`)
  process.exit(1)
}

const totalCssBytes = cssFiles.reduce(
  (sum, name) => sum + fs.statSync(path.join(cssDir, name)).size,
  0,
)

console.log(`[railway-verify] /layout CSS assets: ${layoutCss.length}`)
layoutCss.forEach((asset) => console.log(`[railway-verify] /layout -> ${asset}`))
console.log(`[railway-verify] total CSS bytes: ${totalCssBytes}`)

const railwayStylesPath = path.join(repoRoot, 'public', 'railway-styles.css')
if (fs.existsSync(railwayStylesPath)) {
  const railwayStylesBytes = fs.statSync(railwayStylesPath).size
  console.log(`[railway-verify] public/railway-styles.css: ${railwayStylesBytes} bytes`)
  if (railwayStylesBytes < 100_000) {
    console.error('[railway-verify] BLOCKED: public/railway-styles.css is too small for Railway styling')
    process.exit(1)
  }
} else if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
  console.error('[railway-verify] BLOCKED: public/railway-styles.css missing on Railway build')
  process.exit(1)
}

if (layoutCss.length === 0) {
  console.error('[railway-verify] BLOCKED: /layout has no CSS assets in app-build-manifest.json')
  process.exit(1)
}

const clientReferenceFiles = walkFiles(
  serverAppDir,
  (filePath) => filePath.endsWith('_client-reference-manifest.js'),
)

if (clientReferenceFiles.length === 0) {
  console.error(`[railway-verify] BLOCKED: no client reference manifests under ${distDir}/server/app`)
  process.exit(1)
}

let clientReferenceManifestsWithLayoutCss = 0
const clientReferenceManifestsMissingLayoutCss = []

for (const filePath of clientReferenceFiles) {
  const clientReferenceManifest = readClientReferenceManifest(filePath)
  const entryCSSFiles = clientReferenceManifest.entryCSSFiles || {}
  const layoutCssEntries = Object.entries(entryCSSFiles)
    .filter(([entryKey]) => isRootLayoutEntry(entryKey))
    .flatMap(([, files]) => (Array.isArray(files) ? files : []))
    .filter((asset) => String(asset).endsWith('.css'))

  if (layoutCssEntries.length > 0) {
    clientReferenceManifestsWithLayoutCss += 1
  } else {
    clientReferenceManifestsMissingLayoutCss.push(path.relative(repoRoot, filePath))
  }
}

console.log(
  `[railway-verify] client reference manifests with layout CSS: ${clientReferenceManifestsWithLayoutCss}/${clientReferenceFiles.length}`,
)

if (clientReferenceManifestsWithLayoutCss === 0) {
  console.error('[railway-verify] BLOCKED: client reference manifests have no root layout CSS assets')
  process.exit(1)
}

if (clientReferenceManifestsMissingLayoutCss.length > 0) {
  console.error('[railway-verify] BLOCKED: some client reference manifests are missing root layout CSS')
  clientReferenceManifestsMissingLayoutCss.slice(0, 20).forEach((filePath) => {
    console.error(`[railway-verify] missing layout CSS -> ${filePath}`)
  })
  process.exit(1)
}

if (totalCssBytes < MIN_TOTAL_CSS_BYTES) {
  console.error(
    `[railway-verify] BLOCKED: total CSS (${totalCssBytes} bytes) is below ${MIN_TOTAL_CSS_BYTES}`,
  )
  process.exit(1)
}

if (totalCssBytes < 100_000) {
  console.warn(
    `[railway-verify] WARNING: total CSS (${totalCssBytes} bytes) is below 100KB — styling may be incomplete`,
  )
}

console.log('[railway-verify] ✓ layout CSS present — safe to deploy')
