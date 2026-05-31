import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

describe('railway patch app-build-manifest', () => {
  it('injects CSS assets into /layout when missing', () => {
    const fixtureRoot = path.join(process.cwd(), '.tmp-railway-manifest-fixture')
    const distDir = path.join(fixtureRoot, '.next')
    const cssDir = path.join(distDir, 'static', 'css')
    const manifestPath = path.join(distDir, 'app-build-manifest.json')

    fs.rmSync(fixtureRoot, { recursive: true, force: true })
    fs.mkdirSync(cssDir, { recursive: true })
    fs.writeFileSync(path.join(cssDir, 'abc123.css'), 'body{color:red}')
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          pages: {
            '/layout': [
              'static/chunks/webpack.js',
              'static/chunks/main-app.js',
              'static/chunks/app/layout.js',
            ],
          },
        },
        null,
        2,
      ),
    )

    execSync('node scripts/railway-patch-app-build-manifest.cjs', {
      cwd: process.cwd(),
      env: { ...process.env, AF_NEXT_DIST_DIR: path.relative(process.cwd(), distDir) },
      stdio: 'pipe',
    })

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    expect(manifest.pages['/layout']).toContain('static/css/abc123.css')
    fs.rmSync(fixtureRoot, { recursive: true, force: true })
  })
})
