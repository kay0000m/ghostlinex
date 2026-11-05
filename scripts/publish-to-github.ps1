# One-time: publish Ghostline to GitHub (Windows)
# Prereq: GitHub Desktop (https://desktop.github.com/) OR Git + GitHub CLI on PATH

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Resolve-Git {
  if (Get-Command git -ErrorAction SilentlyContinue) { return "git" }
  $paths = @(
    "${env:ProgramFiles}\Git\bin\git.exe",
    "${env:ProgramFiles(x86)}\Git\bin\git.exe",
    "${env:LocalAppData}\GitHubDesktop\app-*\resources\app\git\cmd\git.exe"
  )
  foreach ($p in $paths) {
    if ($p -like '*`**') {
      $resolved = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($resolved) { return $resolved.FullName }
    } elseif (Test-Path $p) { return $p }
  }
  throw "Git not found. Install GitHub Desktop or Git for Windows, then re-run this script."
}

$git = Resolve-Git
Write-Host "Using git: $git"

if (-not (Test-Path ".git")) {
  & $git init -b main
}

& $git add -A
$status = & $git status --porcelain
if (-not $status) {
  Write-Host "Nothing to commit."
} else {
  & $git commit -m @"
Ship Ghostline free studio: seeds, polish, manual voices without xAI.

Friends can clone and run npm install --legacy-peer-deps && npm run dev with no .env.
"@
}

if (Get-Command gh -ErrorAction SilentlyContinue) {
  $remote = & $git remote get-url origin 2>$null
  if (-not $remote) {
    Write-Host "Creating GitHub repo (public) and pushing..."
    gh repo create ghostline --public --source=. --remote=origin --push
    gh repo view --web
    exit 0
  }
  & $git push -u origin main
  Write-Host "Pushed to origin."
  exit 0
}

Write-Host @"

Git commit is ready. No 'gh' CLI — finish with GitHub Desktop:

1. Open GitHub Desktop → File → Add local repository → $Root
2. Click "Publish repository" (name: ghostline, keep unchecked if you want private)
3. Share the clone URL with your friend

Friend setup:
  git clone <your-url>
  cd ghostline
  npm install --legacy-peer-deps
  npm run dev

No .env or Grok key required.
"@
