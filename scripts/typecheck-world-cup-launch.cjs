const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const ts = require('typescript')

const repoRoot = process.cwd()
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'af-wc-launch-types-'))
const ambientTypesPath = path.join(tempDir, 'ambient.d.ts')

const rootFiles = [
  path.join(repoRoot, 'app', 'api', 'brackets', 'world-cup', '_utils.ts'),
  path.join(repoRoot, 'app', 'api', 'brackets', 'world-cup', 'create', 'route.ts'),
  path.join(repoRoot, 'app', 'api', 'brackets', 'world-cup', '[[...path]]', 'route.ts'),
]

const ambientTypes = `
declare module '@/lib/adminAuth' {
  export function isAdminEmailAllowed(email?: string | null): boolean
  export function isAuthorizedRequest(request: Request): boolean
}
declare module '@/lib/prisma' {
  export const prisma: any
}
declare module '@/lib/auth' {
  export const authOptions: any
}
declare module '@/lib/auth/resolve-auth-secret' {
  export function resolveAuthSecret(): string | undefined
}
declare module '@/lib/world-cup' {
  export function createWorldCupBracketChallenge(input: any): Promise<any>
  export function createAdditionalWorldCupInvite(input: any): Promise<any>
  export function getWorldCupChallengeByInvite(inviteCode: string): Promise<any>
  export function getWorldCupChallengeView(input: any): Promise<any>
  export function joinWorldCupChallengeByInvite(input: any): Promise<any>
  export function getWorldCupChallengeIntegrityReport(challengeId: string): Promise<any>
  export function recalculateWorldCupChallenge(challengeId: string): Promise<any>
  export function saveWorldCupPicks(input: any): Promise<any>
  export function syncAllOpenWorldCupChallenges(): Promise<any>
  export function syncWorldCupChallenge(challengeId: string): Promise<any>
  export function updateWorldCupChallengeSettings(input: any): Promise<any>
  export function userCanManageWorldCupChallenge(input: any): boolean
}
declare module '@/lib/world-cup/worldCupDataProvider' {
  export class WorldCupProviderConfigError extends Error {
    provider: any
    constructor(provider: any, message: string)
  }
}
declare module '@/lib/world-cup/worldCupSimulationService' {
  export function getWorldCupSimulationAccessState(challengeId: string): Promise<any>
  export function isWorldCupSimulationAllowed(input: any): { allowed: boolean; reason?: string }
  export function loadWorldCupTestFixtures(challengeId: string, options?: any): Promise<any>
  export function resetWorldCupSimulation(input: any): Promise<any>
  export function simulateWorldCupMatchResult(input: any): Promise<any>
  export function simulateWorldCupRound(input: any): Promise<any>
  export function simulateWorldCupTournament(input: any): Promise<any>
}
declare module '@/lib/world-cup/worldCupGroupStageResultService' {
  export function syncWorldCupProviderGroupStandings(input: any): Promise<any>
}
declare module '@/lib/world-cup/worldCupDataSyncService' {
  export function syncWorldCupFixtures(input: any): Promise<any>
  export function syncWorldCupLiveScores(input: any): Promise<any>
}
declare module '@/lib/world-cup/worldCupNotifications' {
  export function notifyWorldCupLeaderboardUpdated(input: any): Promise<any>
  export function notifyWorldCupResultsUpdated(input: any): Promise<any>
}
declare module '@/lib/world-cup/worldCupDiagnosticsService' {
  export function runWorldCupDiagnostics(): Promise<any>
}
`

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  if (!diagnostic.file || diagnostic.start == null) return message
  const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
  const fileName = path.relative(repoRoot, diagnostic.file.fileName)
  return `${fileName}(${pos.line + 1},${pos.character + 1}): ${message}`
}

function main() {
  fs.writeFileSync(ambientTypesPath, ambientTypes, 'utf8')

  const program = ts.createProgram({
    rootNames: [ambientTypesPath, ...rootFiles],
    options: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.esnext.d.ts'],
      jsx: ts.JsxEmit.Preserve,
      esModuleInterop: true,
      resolveJsonModule: true,
      isolatedModules: true,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      baseUrl: repoRoot,
      paths: {},
      types: ['node'],
    },
  })

  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length > 0) {
    console.error('[world-cup-launch-typecheck] failed')
    for (const diagnostic of diagnostics) {
      console.error(formatDiagnostic(diagnostic))
    }
    process.exit(1)
  }

  const buildScript = path.join(repoRoot, 'scripts', 'vercel-next-build.cjs')
  const syntax = spawnSync(process.execPath, ['--check', buildScript], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  if (syntax.status !== 0) {
    process.exit(syntax.status ?? 1)
  }

  console.log('[world-cup-launch-typecheck] passed')
}

try {
  main()
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
