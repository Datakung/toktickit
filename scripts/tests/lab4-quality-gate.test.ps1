# Exercise the actual parsed production step/finalization code, not a copy.
# No database, Docker, product commands or repository evidence files are used.
$ErrorActionPreference = 'Stop'
$taskGatePath = Join-Path $PSScriptRoot '../lab4-quality-gate.ps1'
$taskTokens = $null
$taskParseErrors = $null
$taskGateAst = [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path -LiteralPath $taskGatePath).Path, [ref]$taskTokens, [ref]$taskParseErrors)
if ($taskParseErrors.Count) { throw 'Quality gate must parse before its regression checks can run.' }
$taskMainTry = @($taskGateAst.EndBlock.Statements | Where-Object {
    $_ -is [System.Management.Automation.Language.TryStatementAst]
})[-1]
$taskStepFunction = $taskGateAst.FindAll({ param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-QualityStep'
}, $false)[0]
if (-not $taskMainTry.Finally -or -not $taskStepFunction) { throw 'Production quality-gate blocks were not found.' }
$taskStatusStatement = $taskMainTry.Body.Statements[-1].Extent.Text
if ($taskStatusStatement -notmatch '^\$taskManifest\.status\s*=') { throw 'Main-check status assignment must be tested, not guessed.' }
$taskStepBlock = [scriptblock]::Create($taskStepFunction.Extent.Text)
$taskStatusBlock = [scriptblock]::Create($taskStatusStatement)
$taskFinalText = $taskMainTry.Finally.Extent.Text
$taskFinalBlock = [scriptblock]::Create($taskFinalText.Substring(1, $taskFinalText.Length - 2))
$taskTempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\', '/')
$taskTestRoot = Join-Path $taskTempParent ('toktickit-gate-regression-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $taskTestRoot | Out-Null
$taskPriorSnapshotMode = $env:TOKTICKIT_TEST_GATE_SNAPSHOT
$taskOriginalLocation = (Get-Location).Path
$taskCases = @(
    @{ name = 'matching final snapshot completes passing checks'; mode = 'success'; expected = 'passed'; throws = $false; exit = 0 },
    @{ name = 'external final snapshot failure cannot claim passed'; mode = 'exit-failure'; expected = 'failed-development-verification'; throws = $true; exit = 1 },
    @{ name = 'unreadable final snapshot log cannot claim passed'; mode = 'read-failure'; expected = 'failed-development-verification'; throws = $true; exit = 0 },
    @{ name = 'invalid final fingerprint cannot claim passed'; mode = 'invalid-output'; expected = 'failed-development-verification'; throws = $true; exit = 0 },
    @{ name = 'different final fingerprint records changed development state'; mode = 'different-output'; expected = 'failed-development-state-changed'; throws = $true; exit = 0 },
    @{ name = 'missing baseline cannot claim preservation'; mode = 'success'; noBaseline = $true; expected = 'failed-development-verification'; throws = $true; exit = 0 },
    @{ name = 'matching snapshot does not erase an earlier step failure'; mode = 'success'; earlierFailure = $true; expected = 'failed'; throws = $false; exit = 0 },
    @{ name = 'snapshot exit failure retains an earlier step failure'; mode = 'exit-failure'; earlierFailure = $true; expected = 'failed'; throws = $true; exit = 1 },
    @{ name = 'snapshot read failure retains an earlier step failure'; mode = 'read-failure'; earlierFailure = $true; expected = 'failed'; throws = $true; exit = 0 },
    @{ name = 'changed state retains an earlier step failure'; mode = 'different-output'; earlierFailure = $true; expected = 'failed'; throws = $true; exit = 0 }
)
$taskResults = @()
try {
    foreach ($taskCase in $taskCases) {
        $taskCaseResult = & {
            $taskRepoRoot = Join-Path $taskTestRoot ([guid]::NewGuid().ToString('N'))
            $taskEvidenceRoot = Join-Path $taskRepoRoot 'evidence'
            $taskFixtureBin = Join-Path $taskRepoRoot 'server/node_modules/.bin'
            New-Item -ItemType Directory -Path $taskEvidenceRoot, $taskFixtureBin -Force | Out-Null
            Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'fixtures/snapshot.cmd') -Destination (Join-Path $taskFixtureBin 'tsx.cmd')
            $taskManifest = [ordered]@{ status = 'running'; steps = @() }
            if (-not $taskCase.noBaseline) { $taskManifest.developmentBefore = 'a' * 64 }
            . $taskStepBlock
            . $taskStatusBlock
            if ($taskCase.earlierFailure) {
                $taskManifest.status = 'failed'
                $taskManifest.steps += [ordered]@{ name = 'server-tests'; exitCode = 7; seconds = 0 }
            }
            # Only the final log read is fault-injected. The real production step
            # executes the fixture as an external .cmd and retains its exit code.
            function Get-Content {
                param([string]$Path, [switch]$Raw)
                if ($taskCase.mode -eq 'read-failure' -and $Path -eq (Join-Path $taskEvidenceRoot 'development-after.log')) {
                    throw 'Deliberate final snapshot log-read failure.'
                }
                Microsoft.PowerShell.Management\Get-Content @PSBoundParameters
            }
            $env:TOKTICKIT_TEST_GATE_SNAPSHOT = $taskCase.mode
            $taskThrown = $false
            Push-Location $taskRepoRoot
            try { . $taskFinalBlock | Out-Null } catch { $taskThrown = $true }
            $taskRetained = Microsoft.PowerShell.Management\Get-Content -LiteralPath (Join-Path $taskEvidenceRoot 'manifest.json') -Raw | ConvertFrom-Json
            $taskProblems = @()
            if ($taskRetained.status -ne $taskCase.expected) { $taskProblems += "status $($taskRetained.status), expected $($taskCase.expected)" }
            if ($taskThrown -ne $taskCase.throws) { $taskProblems += 'incorrect thrown-error result' }
            if ($taskRetained.steps[-1].name -ne 'development-after' -or $taskRetained.steps[-1].exitCode -ne $taskCase.exit) { $taskProblems += 'final exit code not retained' }
            if (-not $taskRetained.finishedAtUtc) { $taskProblems += 'completion timestamp not retained' }
            if ($taskCase.earlierFailure -and ($taskRetained.steps[0].name -ne 'server-tests' -or $taskRetained.steps[0].exitCode -ne 7)) { $taskProblems += 'earlier failure not retained' }
            if ($taskCase.mode -in @('exit-failure', 'read-failure') -and $taskRetained.developmentAfter) { $taskProblems += 'invented final fingerprint' }
            if ($taskCase.expected -eq 'passed' -and $taskRetained.developmentBefore -ne $taskRetained.developmentAfter) { $taskProblems += 'passed without matching fingerprints' }
            $taskExpectedPreservation = $taskCase.mode -eq 'success' -and -not $taskCase.noBaseline
            if ($taskRetained.preservationVerified -ne $taskExpectedPreservation) { $taskProblems += 'incorrect preservation verification flag' }
            if ((Get-Location).Path -ne $taskOriginalLocation) { $taskProblems += 'production finalization did not restore location' }
            [ordered]@{ name = $taskCase.name; passed = $taskProblems.Count -eq 0; problems = @($taskProblems); retainedStatus = $taskRetained.status }
        }
        $taskResults += $taskCaseResult
        $taskLabel = if ($taskCaseResult.passed) { 'PASS' } else { 'FAIL' }
        Write-Output "$taskLabel $($taskCase.name) [$($taskCaseResult.retainedStatus)]"
        if (-not $taskCaseResult.passed) { Write-Output ($taskCaseResult.problems -join '; ') }
    }
    $taskFailed = @($taskResults | Where-Object { -not $_.passed })
    Write-Output "$($taskResults.Count - $taskFailed.Count)/$($taskResults.Count) quality-gate finalization regressions passed. No database or repository evidence changed."
    if ($taskFailed.Count) { throw 'Quality-gate finalization regression failed.' }
} finally {
    $env:TOKTICKIT_TEST_GATE_SNAPSHOT = $taskPriorSnapshotMode
    Set-Location -LiteralPath $taskOriginalLocation
    # Delete only the resolved unique OS-temp child owned by this harness.
    $taskResolvedTestRoot = (Resolve-Path -LiteralPath $taskTestRoot).Path
    if ([System.IO.Path]::GetDirectoryName($taskResolvedTestRoot) -ne $taskTempParent -or
        -not [System.IO.Path]::GetFileName($taskResolvedTestRoot).StartsWith('toktickit-gate-regression-')) {
        throw 'Unsafe gate-regression cleanup target.'
    }
    Remove-Item -LiteralPath $taskResolvedTestRoot -Recurse -Force
}
