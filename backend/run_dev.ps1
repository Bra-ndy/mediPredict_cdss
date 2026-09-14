# Development run script
$env:FLASK_CONFIG = "development"
$env:FLASK_ENV = "development"
$env:FLASK_APP = "app.py"

Write-Host " Starting MediPredict Backend in DEVELOPMENT mode..." -ForegroundColor Green
Write-Host " Configuration: Development" -ForegroundColor Yellow
Write-Host " URL: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""

python app.py
