const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const repoRoot = process.cwd()
const backupRoot = path.join(repoRoot, '.next-build-disabled-routes')
const nextBuildDir = path.join(repoRoot, '.next')
const nextPagesManifestPluginPath = path.join(
  repoRoot,
  'node_modules',
  'next',
  'dist',
  'build',
  'webpack',
  'plugins',
  'pages-manifest-plugin.js'
)
const routeDirsToDisable = [
  path.join('app', 'e2e'),
  path.join('app', 'tools', 'social-share-engine-harness'),
  path.join('app', 'tools', 'public-league-discovery-harness'),
]

const ROUTE_ENTRY_BASENAMES = new Set([
  'page.tsx',
  'page.ts',
  'route.ts',
  'route.js',
  'layout.tsx',
  'layout.ts',
  'loading.tsx',
  'loading.ts',
  'default.tsx',
  'default.ts',
])

const movedFiles = []
let cleanedUp = false

function directoryExists(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory()
  } catch {
    return false
  }
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true })
}

function movePath(fromPath, toPath) {
  ensureDir(path.dirname(toPath))
  fs.renameSync(fromPath, toPath)
}

function collectRouteEntryFiles(rootPath) {
  if (!directoryExists(rootPath)) return []
  const discovered = []
  const stack = [rootPath]

  while (stack.length > 0) {
    const currentPath = stack.pop()
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolutePath)
        continue
      }
      if (ROUTE_ENTRY_BASENAMES.has(entry.name)) {
        discovered.push(absolutePath)
      }
    }
  }

  return discovered
}

function disableNonProdRoutes() {
  fs.rmSync(backupRoot, { recursive: true, force: true })

  for (const relativePath of routeDirsToDisable) {
    const sourcePath = path.join(repoRoot, relativePath)
    const routeFiles = collectRouteEntryFiles(sourcePath)
    if (routeFiles.length === 0) continue

    for (const routeFile of routeFiles) {
      const relativeFile = path.relative(repoRoot, routeFile)
      const backupPath = path.join(backupRoot, relativeFile.replace(/[\\/]/g, '__'))
      movePath(routeFile, backupPath)
      movedFiles.push({ routeFile, backupPath, relativeFile })
      console.log(`[vercel-next-build] Temporarily excluded ${relativeFile}`)
    }
  }
}

function restoreNonProdRoutes() {
  if (cleanedUp) return
  cleanedUp = true

  for (const entry of movedFiles.reverse()) {
    if (!fs.existsSync(entry.backupPath)) continue
    movePath(entry.backupPath, entry.routeFile)
    console.log(`[vercel-next-build] Restored ${entry.relativeFile}`)
  }

  fs.rmSync(backupRoot, { recursive: true, force: true })
}

function patchNextManifestMergeRace() {
  if (!fs.existsSync(nextPagesManifestPluginPath)) return

  const source = fs.readFileSync(nextPagesManifestPluginPath, 'utf8')
  const original = `        const writeMergedManifest = async (manifestPath, entries)=>{\n            await _promises.default.mkdir(_path.default.dirname(manifestPath), {\n                recursive: true\n            });\n            await _promises.default.writeFile(manifestPath, JSON.stringify({\n                ...await _promises.default.readFile(manifestPath, "utf8").then((res)=>JSON.parse(res)).catch(()=>({})),\n                ...entries\n            }, null, 2));\n        };`

  const oldPatched = `        const writeMergedManifest = async (manifestPath, entries)=>{\n            const lockPath = manifestPath + ".lock";\n            const acquireManifestLock = async ()=>{\n                for(let attempt = 0; attempt < 400; attempt++){\n                    try {\n                        return await _promises.default.open(lockPath, "wx");\n                    } catch (error) {\n                        if (!error || error.code !== "EEXIST") throw error;\n                        await new Promise((resolve)=>setTimeout(resolve, 25));\n                    }\n                }\n                throw new Error("__AF_MANIFEST_LOCK_PATCH__: timed out acquiring Next manifest lock for " + manifestPath);\n            };\n            const lockHandle = await acquireManifestLock();\n            try {\n                await _promises.default.mkdir(_path.default.dirname(manifestPath), {\n                    recursive: true\n                });\n                await _promises.default.writeFile(manifestPath, JSON.stringify({\n                    ...await _promises.default.readFile(manifestPath, "utf8").then((res)=>JSON.parse(res)).catch(()=>({})),\n                    ...entries\n                }, null, 2));\n            } finally {\n                await lockHandle.close().catch(()=>{});\n                await _promises.default.unlink(lockPath).catch(()=>{});\n            }\n        };`

  const replacement = `        const writeMergedManifest = async (manifestPath, entries)=>{\n            await _promises.default.mkdir(_path.default.dirname(manifestPath), {\n                recursive: true\n            });\n            const lockPath = manifestPath + ".lock";\n            const acquireManifestLock = async ()=>{\n                for(let attempt = 0; attempt < 400; attempt++){\n                    try {\n                        return await _promises.default.open(lockPath, "wx");\n                    } catch (error) {\n                        if (!error || error.code !== "EEXIST") throw error;\n                        await new Promise((resolve)=>setTimeout(resolve, 25));\n                    }\n                }\n                throw new Error("__AF_MANIFEST_LOCK_PATCH__: timed out acquiring Next manifest lock for " + manifestPath);\n            };\n            const lockHandle = await acquireManifestLock();\n            try {\n                await _promises.default.writeFile(manifestPath, JSON.stringify({\n                    ...await _promises.default.readFile(manifestPath, "utf8").then((res)=>JSON.parse(res)).catch(()=>({})),\n                    ...entries\n                }, null, 2));\n            } finally {\n                await lockHandle.close().catch(()=>{});\n                await _promises.default.unlink(lockPath).catch(()=>{});\n            }\n        };`

  let patched = source
  if (patched.includes(oldPatched)) {
    patched = patched.replace(oldPatched, replacement)
  } else if (patched.includes(original)) {
    patched = patched.replace(original, replacement)
  } else if (patched.includes('__AF_MANIFEST_LOCK_PATCH__')) {
    console.log('[vercel-next-build] Next pages-manifest-plugin manifest lock patch already current')
    return
  } else {
    console.warn('[vercel-next-build] Skipped Next manifest race patch; upstream plugin shape changed.')
    return
  }

  fs.writeFileSync(nextPagesManifestPluginPath, patched)
  console.log('[vercel-next-build] Patched Next pages-manifest-plugin manifest merge race')
}

function run() {
  // Avoid stale build-manifest/chunk issues in cached CI environments.
  fs.rmSync(nextBuildDir, { recursive: true, force: true })
  patchNextManifestMergeRace()
  disableNonProdRoutes()

  const nextArgs = process.argv.slice(2)
  const nextBin = path.join(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
  let child
  const childEnv = {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS?.includes('--max-old-space-size=')
      ? process.env.NODE_OPTIONS
      : [process.env.NODE_OPTIONS, '--max-old-space-size=8192'].filter(Boolean).join(' '),
  }

  try {
    child = spawn(process.execPath, [nextBin, 'build', ...nextArgs], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: childEnv,
    })
  } catch (error) {
    console.error('[vercel-next-build] Failed to start next build:', error)
    restoreNonProdRoutes()
    process.exit(1)
  }

  const shutdown = (code) => {
    restoreNonProdRoutes()
    process.exit(code)
  }

  process.on('SIGINT', () => {
    child.kill('SIGINT')
    shutdown(130)
  })

  process.on('SIGTERM', () => {
    child.kill('SIGTERM')
    shutdown(143)
  })

  child.on('close', (code, signal) => {
    if ((code ?? 0) !== 0 || signal) {
      console.error(
        `[vercel-next-build] next build exited with code ${code ?? 'null'} and signal ${signal ?? 'none'}`
      )
    }
    shutdown(code ?? 1)
  })

  child.on('error', (error) => {
    console.error('[vercel-next-build] Failed to start next build:', error)
    shutdown(1)
  })
}

run()
