const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

function readProcessCommandLine(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return null

  if (process.platform === 'win32') {
    try {
      const { spawnSync } = require('child_process')
      const psScript = [
        `$p = Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\" | Select-Object -First 1 CommandLine`,
        "if ($p -and $p.CommandLine) { Write-Output $p.CommandLine }",
      ].join('; ')
      const result = spawnSync('powershell', ['-NoProfile', '-Command', psScript], {
        encoding: 'utf8',
      })
      const output = String(result.stdout || '').trim()
      return output.length > 0 ? output : null
    } catch {
      return null
    }
  }

  try {
    const { spawnSync } = require('child_process')
    const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf8',
    })
    const output = String(result.stdout || '').trim()
    return output.length > 0 ? output : null
  } catch {
    return null
  }
}

function isValidBuildOwnerCommand(commandLine) {
  if (!commandLine) return false
  const normalized = String(commandLine).toLowerCase()
  return (
    normalized.includes('scripts/vercel-next-build.cjs') ||
    (normalized.includes('next') && normalized.includes('dist') && normalized.includes('bin') && normalized.includes('build'))
  )
}

const repoRoot = process.cwd()
const backupRoot = path.join(repoRoot, '.next-build-disabled-routes')
const nextBuildDir = path.join(repoRoot, '.next')
const nextStaticDir = path.join(nextBuildDir, 'static')
const buildLockPath = path.join(repoRoot, '.next-build.lock')
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
  // Keep non-core diagnostic/dev surfaces out of production route budget.
  path.join('app', 'admin'),
  path.join('app', 'api', 'admin'),
  path.join('app', 'api', 'cron'),
  path.join('app', 'api', 'audio-metadata'),
  path.join('app', 'ai-lab'),
  path.join('app', 'lab'),
  path.join('app', 'bracket-review'),
  path.join('app', 'createor'),
  path.join('app', 'manifest.experimental.webmanifest'),
]

const movedFiles = []
let cleanedUp = false
let lockHeld = false
const shouldPruneNonProdRoutes = process.env.AF_PRUNE_NON_PROD_ROUTES === '1'
const filesToKeep = new Set([
  path.join('app', 'api', 'cron', '_auth.ts').replace(/\\/g, '/'),
])

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

function tryAcquireBuildLock() {
  const lockPayload = `${process.pid}\n${new Date().toISOString()}\n`

  try {
    fs.writeFileSync(buildLockPath, lockPayload, { flag: 'wx' })
    lockHeld = true
    return true
  } catch (error) {
    if (!error || error.code !== 'EEXIST') {
      throw error
    }
  }

  try {
    const existing = fs.readFileSync(buildLockPath, 'utf8')
    const pid = Number.parseInt(String(existing).split(/\r?\n/)[0], 10)

    if (Number.isFinite(pid) && pid > 0) {
      try {
        process.kill(pid, 0)
        const commandLine = readProcessCommandLine(pid)
        if (isValidBuildOwnerCommand(commandLine)) {
          console.error(`[vercel-next-build] Another build is already running (pid ${pid}). Refusing concurrent execution.`)
          return false
        }
        console.warn(
          `[vercel-next-build] Clearing stale build lock owned by non-build process (pid ${pid}${
            commandLine ? `: ${commandLine}` : ''
          }).`
        )
      } catch {
        // Stale lock; remove below.
      }
    } else {
      console.warn('[vercel-next-build] Clearing stale build lock with invalid pid payload.')
    }

    fs.rmSync(buildLockPath, { force: true })
    fs.writeFileSync(buildLockPath, lockPayload, { flag: 'wx' })
    lockHeld = true
    return true
  } catch (error) {
    console.error('[vercel-next-build] Failed to validate existing build lock:', error)
    return false
  }
}

function releaseBuildLock() {
  if (!lockHeld) return
  lockHeld = false
  fs.rmSync(buildLockPath, { force: true })
}

function movePath(fromPath, toPath) {
  ensureDir(path.dirname(toPath))
  fs.renameSync(fromPath, toPath)
}

function collectFilesUnderDir(rootPath) {
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
      discovered.push(absolutePath)
    }
  }

  return discovered
}

function disableNonProdRoutes() {
  fs.rmSync(backupRoot, { recursive: true, force: true })

  for (const relativePath of routeDirsToDisable) {
    const sourcePath = path.join(repoRoot, relativePath)
    const routeFiles = collectFilesUnderDir(sourcePath)
    if (routeFiles.length === 0) continue

    for (const routeFile of routeFiles) {
      const relativeFile = path.relative(repoRoot, routeFile)
      const normalizedRelativeFile = relativeFile.replace(/\\/g, '/')
      if (filesToKeep.has(normalizedRelativeFile)) {
        continue
      }
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

function patchNextClientSsgManifestWrite() {
  const nextBuildIndexPath = path.join(repoRoot, 'node_modules', 'next', 'dist', 'build', 'index.js')
  if (!fs.existsSync(nextBuildIndexPath)) return

  const source = fs.readFileSync(nextBuildIndexPath, 'utf8')
  const marker = '__AF_SSG_DIR_PATCH__'
  if (source.includes(marker)) {
    console.log('[vercel-next-build] Next SSG manifest dir patch already current')
    return
  }

  const original =
    '    const clientSsgManifestContent = `self.__SSG_MANIFEST=${(0, _devalue.default)(ssgPages)};self.__SSG_MANIFEST_CB&&self.__SSG_MANIFEST_CB()`;\n    await writeFileUtf8(_path.default.join(distDir, _constants1.CLIENT_STATIC_FILES_PATH, buildId, "_ssgManifest.js"), clientSsgManifestContent);'
  const replacement =
    '    const clientSsgManifestContent = `self.__SSG_MANIFEST=${(0, _devalue.default)(ssgPages)};self.__SSG_MANIFEST_CB&&self.__SSG_MANIFEST_CB()`;\n    const clientSsgManifestPath = _path.default.join(distDir, _constants1.CLIENT_STATIC_FILES_PATH, buildId, "_ssgManifest.js");\n    await _fs.promises.mkdir(_path.default.dirname(clientSsgManifestPath), {\n        recursive: true\n    });\n    await writeFileUtf8(clientSsgManifestPath, clientSsgManifestContent); // __AF_SSG_DIR_PATCH__'

  if (!source.includes(original)) {
    console.warn('[vercel-next-build] Skipped Next SSG manifest dir patch; upstream build index shape changed.')
    return
  }

  fs.writeFileSync(nextBuildIndexPath, source.replace(original, replacement))
  console.log('[vercel-next-build] Patched Next SSG manifest directory creation')
}

function run() {
  if (!tryAcquireBuildLock()) {
    process.exit(1)
  }

  // Avoid stale build-manifest/chunk issues in cached CI environments.
  fs.rmSync(nextBuildDir, { recursive: true, force: true })
  ensureDir(nextBuildDir)
  ensureDir(nextStaticDir)
  patchNextManifestMergeRace()
  patchNextClientSsgManifestWrite()
  if (shouldPruneNonProdRoutes) {
    disableNonProdRoutes()
  } else {
    console.log('[vercel-next-build] Skipping non-prod route pruning (set AF_PRUNE_NON_PROD_ROUTES=1 to enable)')
  }

  const nextArgs = process.argv.slice(2)
  const nextBin = path.join(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
  let child
  const childEnv = {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS?.includes('--max-old-space-size=')
      ? process.env.NODE_OPTIONS
      : [process.env.NODE_OPTIONS, '--max-old-space-size=14336'].filter(Boolean).join(' '),
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
    releaseBuildLock()
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
