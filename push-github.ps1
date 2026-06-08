# 齐静春.skill — push to GitHub
# Run from this directory after: gh auth login

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "Install GitHub CLI: https://cli.github.com/"
    exit 1
}

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Run first: gh auth login"
    exit 1
}

$repo = "qijingchun-skill"
$exists = gh repo view $repo 2>$null
if ($LASTEXITCODE -ne 0) {
    gh repo create $repo `
        --public `
        --description "齐静春文风与经义思辨技能包 · OpenClaw/mClaw skill" `
        --source . `
        --remote origin `
        --push
} else {
    git branch -M main
    git push -u origin main
}

Write-Host ""
Write-Host "Done. Install URL:"
gh repo view --json url -q .url
Write-Host ""
Write-Host "Send to mClaw:"
Write-Host "安装 skill：$(gh repo view --json url -q .url)"
