'use strict'

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = process.cwd()
const cssDir = path.join(repoRoot, '.next', 'static', 'css')
const manifestPath = path.join(repoRoot, '.next', 'app-build-manifest.json')

if (!fs.existsSync(manifestPath)) {
  console.error('[railway-verify] .next/app-build-manifest.json was not produced')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const pages = manifest.pages || manifest
const layoutAssets = pages['/layout'] || []
const layoutCss = layoutAssets.filter((asset) => asset.includes('.css'))

if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir).filter((name) => name.endsWith('.css'))
  console.log(`[railway-verify] CSS files: ${cssFiles.length}`)
  cssFiles.slice(0, 10).forEach((name) => {
    const size = fs.statSync(path.join(cssDir, name)).size
    console.log(`[railway-verify] ${name} ${size} bytes`)
  })
} else {
  console.warn('[railway-verify] .next/static/css is missing')
}

console.log(`[railway-verify] /layout CSS assets: ${layoutCss.length}`)
layoutCss.forEach((asset) => console.log(`[railway-verify] /layout -> ${asset}`))

if (layoutCss.length === 0) {
  console.error('[railway-verify] Railway build produced no layout CSS')
  process.exit(1)
}
