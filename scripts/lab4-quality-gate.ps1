param([switch]$FinalMain)

$ErrorActionPreference = 'Stop'
$taskRepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskEvidenceRoot = Join-Path $taskRepoRoot 'artifacts/lab-04/quality-gate'
$taskGitArgs = @('-c', "safe.directory=$($taskRepoRoot.Replace('\', '/'))")
$taskRevision = (& git @taskGitArgs -C $taskRepoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot identify the quality-gate revision.' }
$taskBranch = (& git @taskGitArgs -C $taskRepoRoot branch --show-current).Trim()
$taskDirty = [bool](& git @taskGitArgs -C $taskRepoRoot status --porcelain)
if ($FinalMain) {
    if ($taskBranch -ne 'main' -or $taskDirty) { throw 'Final-main evidence requires a clean main checkout.' }
    & git @taskGitArgs -C $taskRepoRoot merge-base --is-ancestor 4660ac61b8609be19bc6d2e057b8516fa7fb74ce HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Main does not yet contain the peer-merged dashboard increment.' }
}
New-Item -ItemType Directory -Path $taskEvidenceRoot -Force | Out-Null
$taskManifest = [ordered]@{
    phase = $(if ($FinalMain) { 'final-main' } else { 'release-candidate' })
    revision = $taskRevision
    branch = $taskBranch
    workingTreeDirtyAtStart = $taskDirty
    startedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
    node = (& node --version)
    status = 'running'
    steps = @()
}

function Invoke-QualityStep {
    param([string]$Name, [string]$Executable, [string[]]$Arguments, [string]$Directory = $taskRepoRoot)
    Push-Location $Directory
    try {
        $taskStepStarted = [DateTimeOffset]::UtcNow
        & $Executable @Arguments 2>&1 | Tee-Object -FilePath (Join-Path $taskEvidenceRoot "$Name.log")
        $taskStepExit = $LASTEXITCODE
        $taskManifest.steps += [ordered]@{
            name = $Name
            exitCode = $taskStepExit
            seconds = [Math]::Round(([DateTimeOffset]::UtcNow - $taskStepStarted).TotalSeconds, 2)
        }
        if ($taskStepExit -ne 0) { throw "$Name failed. Retained output is in the quality-gate directory." }
    } finally { Pop-Location }
}

Push-Location $taskRepoRoot
try {
    Invoke-QualityStep 'development-before' (Join-Path $taskRepoRoot 'server/node_modules/.bin/tsx.cmd') @('tests/development-snapshot.ts') (Join-Path $taskRepoRoot 'server')
    $taskManifest.developmentBefore = (Get-Content (Join-Path $taskEvidenceRoot 'development-before.log') -Raw).Trim()
    if ($taskManifest.developmentBefore -notmatch '^[a-f0-9]{64}$') { throw 'Invalid development baseline fingerprint.' }
    Invoke-QualityStep 'server-tests' 'npm.cmd' @('--prefix', 'server', 'test', '--', '--reporter=default', '--reporter=json', '--outputFile=../artifacts/lab-04/quality-gate/server-results.json')
    Invoke-QualityStep 'client-tests' 'npm.cmd' @('--prefix', 'client', 'test', '--', '--maxWorkers=2', '--reporter=default', '--reporter=json', '--outputFile=../artifacts/lab-04/quality-gate/client-results.json')
    Invoke-QualityStep 'server-build' 'npm.cmd' @('--prefix', 'server', 'run', 'build')
    Invoke-QualityStep 'client-build' 'npm.cmd' @('--prefix', 'client', 'run', 'build')
    Invoke-QualityStep 'prisma-validate' (Join-Path $taskRepoRoot 'server/node_modules/.bin/prisma.cmd') @('validate') (Join-Path $taskRepoRoot 'server')
    foreach ($taskArea in @('server', 'client')) {
        foreach ($taskAuditMode in @('production', 'full')) {
            $taskAuditArgs = @('--prefix', $taskArea, 'audit', '--json')
            if ($taskAuditMode -eq 'production') { $taskAuditArgs += '--omit=dev' }
            Invoke-QualityStep "$taskArea-$taskAuditMode-audit" 'npm.cmd' $taskAuditArgs
        }
    }
    $taskPriorPlaywrightOutput = $env:PLAYWRIGHT_JSON_OUTPUT_NAME
    try {
        $env:PLAYWRIGHT_JSON_OUTPUT_NAME = Join-Path $taskEvidenceRoot 'browser-results.json'
        Invoke-QualityStep 'browser-tests' 'npm.cmd' @('--prefix', 'client', 'run', 'test:e2e:review', '--', '--reporter=list,json', '--retries=0')
    } finally { $env:PLAYWRIGHT_JSON_OUTPUT_NAME = $taskPriorPlaywrightOutput }
    Invoke-QualityStep 'diff-check' 'git' ($taskGitArgs + @('-c', 'core.safecrlf=false', 'diff', '--check'))
    $taskServerResults = Get-Content (Join-Path $taskEvidenceRoot 'server-results.json') -Raw | ConvertFrom-Json
    $taskClientResults = Get-Content (Join-Path $taskEvidenceRoot 'client-results.json') -Raw | ConvertFrom-Json
    $taskBrowserResults = Get-Content (Join-Path $taskEvidenceRoot 'browser-results.json') -Raw | ConvertFrom-Json
    foreach ($taskResults in @($taskServerResults, $taskClientResults)) {
        if (-not $taskResults.success -or $taskResults.numPendingTests -gt 0 -or $taskResults.numTodoTests -gt 0) {
            throw 'A required test did not pass; skipped/todo coverage is not a release pass.'
        }
    }
    if ($taskBrowserResults.stats.unexpected -gt 0 -or $taskBrowserResults.stats.skipped -gt 0 -or $taskBrowserResults.stats.flaky -gt 0) {
        throw 'Browser coverage failed, skipped or needed a retry.'
    }
    $taskManifest.tests = [ordered]@{
        server = $taskServerResults.numPassedTests
        client = $taskClientResults.numPassedTests
        browser = $taskBrowserResults.stats.expected
    }
    $taskManifest.status = 'passed'
} catch {
    $taskManifest.status = 'failed'
    throw
} finally {
    try {
        Invoke-QualityStep 'development-after' (Join-Path $taskRepoRoot 'server/node_modules/.bin/tsx.cmd') @('tests/development-snapshot.ts') (Join-Path $taskRepoRoot 'server')
        $taskManifest.developmentAfter = (Get-Content (Join-Path $taskEvidenceRoot 'development-after.log') -Raw).Trim()
        if ($taskManifest.developmentBefore -ne $taskManifest.developmentAfter) {
            $taskManifest.status = 'failed-development-state-changed'
            throw 'Development database/uploads changed during the gate; do not claim preservation.'
        }
    } finally {
        $taskManifest.finishedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
        $taskManifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskEvidenceRoot 'manifest.json') -Encoding utf8
        Pop-Location
    }
}
