param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Prompt,

    [switch]$AllowEdits,

    [ValidateSet('low', 'medium', 'high')]
    [string]$Effort = 'medium',

    [decimal]$MaxBudgetUsd = 1.00,

    [ValidatePattern('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')]
    [string]$Resume
)

$ErrorActionPreference = 'Stop'

$claudeCommand = Get-Command claude -ErrorAction SilentlyContinue
if ($claudeCommand) {
    $claudeExe = $claudeCommand.Source
} else {
    $extensionRoot = Join-Path $env:USERPROFILE '.vscode\extensions'
    $claudeExe = Get-ChildItem -LiteralPath $extensionRoot -Directory -Filter 'anthropic.claude-code-*' |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName 'resources\native-binary\claude.exe' } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
}

if (-not $claudeExe) {
    throw 'Claude Code was not found. Install it or add claude.exe to PATH.'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$originalLocation = Get-Location
$overrideNames = @(
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_BASE_URL',
    'CLAUDE_CODE_USE_BEDROCK',
    'CLAUDE_CODE_USE_VERTEX',
    'CLAUDE_CODE_USE_FOUNDRY'
)
$savedOverrides = @{}
foreach ($name in $overrideNames) {
    $savedOverrides[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
}

try {
    Set-Location -LiteralPath $projectRoot

    $auth = (& $claudeExe auth status | ConvertFrom-Json)
    if (-not $auth.loggedIn -or $auth.authMethod -ne 'claude.ai' -or $auth.apiProvider -ne 'firstParty') {
        throw 'Claude Code is not signed in through a claude.ai plan. Run: claude auth login'
    }
    if ($auth.subscriptionType -ne 'max') {
        throw "This Fable launcher requires a Max plan. Detected: $($auth.subscriptionType)"
    }

    $workerTools = @('Read', 'Glob', 'Grep')
    if ($AllowEdits) { $workerTools += @('Edit', 'Write') }

    $agents = @{
        coder = @{
        description = 'Use for normal implementation work after the orchestrator has given a precise task.'
        prompt = 'Implement only the assigned task. Inspect before editing, preserve unrelated work, run focused checks, and report changed files and proof.'
        tools = $workerTools
        model = 'claude-sonnet-5'
        }
        small = @{
        description = 'Use for tiny inspections, narrow edits, and simple verification.'
        prompt = 'Handle only the small assigned task. Be concise, preserve unrelated work, and provide direct evidence.'
        tools = $workerTools
        model = 'claude-haiku-4-5'
        }
    } | ConvertTo-Json -Compress -Depth 5

    $tools = 'Agent,Read,Glob,Grep'
    $permissionMode = 'dontAsk'
    if ($AllowEdits) {
        $tools = 'Agent,Read,Glob,Grep,Edit,Write'
        $permissionMode = 'acceptEdits'
    }

    $orchestratorPrompt = 'Act as the concise implementation orchestrator. Delegate normal coding to coder and tiny inspections or edits to small. Do not use other agents or models. Review worker output and return direct evidence. Read design-concepts/CLAUDE-DESIGN-BRIEF.md before implementation when it exists. Never deploy, publish, delete data, rotate secrets, or change production. Preserve unrelated work.'
    $settings = Join-Path $PSScriptRoot 'claude-safe-settings.json'
    $claudeArgs = @(
        '-p', '--model', 'claude-fable-5', '--agents', $agents,
        '--append-system-prompt', $orchestratorPrompt,
        '--settings', $settings,
        '--output-format', 'json', '--restricted', '--safe-mode',
        '--strict-mcp-config', '--tools', $tools,
        '--permission-mode', $permissionMode, '--permission-prompts', 'none',
        '--effort', $Effort, '--max-budget-usd', $MaxBudgetUsd
    )
    if ($Resume) { $claudeArgs += @('--resume', $Resume) }
    $claudeArgs += $Prompt

    & $claudeExe @claudeArgs
    $claudeExitCode = $LASTEXITCODE
} finally {
    Set-Location -LiteralPath $originalLocation
    foreach ($name in $overrideNames) {
        [Environment]::SetEnvironmentVariable($name, $savedOverrides[$name], 'Process')
    }
}

exit $claudeExitCode
