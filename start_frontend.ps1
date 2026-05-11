$frontend = "globalchain-frontend"
Push-Location $frontend
npm run dev -- --host 0.0.0.0 --port 3000
Pop-Location
