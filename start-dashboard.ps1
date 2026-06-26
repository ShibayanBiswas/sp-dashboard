$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

function Find-Node {
  $candidates = @(
    "node",
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\node\node.exe"
  )
  foreach ($candidate in $candidates) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
      return (Get-Command $candidate).Source
    }
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  $portableDirs = Get-ChildItem (Join-Path $projectRoot ".tools") -Directory -Filter "node-v*" -ErrorAction SilentlyContinue
  if ($portableDirs) {
    $portableNode = Join-Path $portableDirs[0].FullName "node.exe"
    if (Test-Path $portableNode) {
      return $portableNode
    }
  }

  return $null
}

function Find-Python {
  foreach ($cmd in @("python", "py", "python3")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
      return $cmd
    }
  }
  return $null
}

$nodePath = Find-Node
if (-not $nodePath) {
  Write-Host "Node.js is not installed or not on PATH."
  Write-Host "Install Node.js LTS, reopen the terminal, then run this script again."
  exit 1
}

$npmPath = Join-Path (Split-Path $nodePath) "npm.cmd"
if (-not (Test-Path $npmPath)) {
  $npmPath = "npm"
}

if (-not (Test-Path ".\node_modules")) {
  Write-Host "Installing Node dependencies..."
  & $npmPath install
}

$pythonCmd = Find-Python
if ($pythonCmd) {
  $reqFile = ".\backend\python\requirements.txt"
  if (Test-Path $reqFile) {
    Write-Host "Starting Python analytics API on http://127.0.0.1:8000 ..."
    Start-Process -FilePath $pythonCmd -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory (Join-Path $projectRoot "backend\python") -WindowStyle Minimized
  }
} else {
  Write-Host "Python not found — pivot tables will use Node fallback only."
}

$env:PYTHON_API_URL = "http://127.0.0.1:8000"
Write-Host "Starting React frontend (Next.js) on http://localhost:3000 ..."
Write-Host "Backend APIs: Node /api/*  |  Python http://127.0.0.1:8000  |  Internal appendix /api/internal/appendix"
& $npmPath run dev
