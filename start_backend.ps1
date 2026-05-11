# GlobalChain Backend — Quick Start
# Usage: .\start_backend.ps1          (normal start)
# Usage: .\start_backend.ps1 -Reset   (delete DB + reseed before starting)

param([switch]$Reset)

$backend = "globalchain-backend"
$python  = "$backend\venv\Scripts\python.exe"
$uvicorn = "$backend\venv\Scripts\uvicorn.exe"

Write-Host "[GlobalChain] Backend starting from: $backend" -ForegroundColor Cyan

if ($Reset) {
    Write-Host "[GlobalChain] Resetting database..." -ForegroundColor Yellow
    Remove-Item -Force "$backend\globalchain.db" -ErrorAction SilentlyContinue
    # Run seed from the BACKEND directory so sqlite:///./globalchain.db resolves correctly
    Push-Location $backend
    & $python -c "import importlib.util, os, sys; os.chdir(r'$backend'); sys.path.insert(0, os.getcwd()); spec = importlib.util.spec_from_file_location('seed', 'seed_data.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); m.run_seed()"
    Pop-Location
    Write-Host "[GlobalChain] Database reset complete." -ForegroundColor Green
}

Write-Host "[GlobalChain] Starting uvicorn on http://0.0.0.0:8000 ..." -ForegroundColor Cyan
& $uvicorn main:app --host 0.0.0.0 --port 8000 --reload --app-dir $backend
