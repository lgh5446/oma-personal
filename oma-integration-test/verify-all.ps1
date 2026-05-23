# OMA 3-Vendor Integration Verification Script

Write-Host "=== OMA 3-Vendor Integration Verification ===" -ForegroundColor Cyan

$resultsDir = "C:\Users\user\AI_Orchestra_Lab\projects\oma-integration-test\results"
if (-not (Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir | Out-Null
}

# Step 1: Run OMA Doctor to verify skills installation
Write-Host "`n--- Step 1: OMA Doctor Check ---" -ForegroundColor Yellow
$doctorResult = oma doctor
Write-Host $doctorResult

# Step 2: Spawn Docs Agent (Google/Gemini model fallback via Claude CLI)
Write-Host "`n--- Step 2: Spawn Docs Agent (Claude CLI) ---" -ForegroundColor Yellow
$docsSess = "sess-docs-$(Get-Random)"
$docsCmd = "oma agent:spawn docs 'Create a file named test_docs_report.md inside results directory stating that OMA docs verification is successful' $docsSess -w C:\Users\user\AI_Orchestra_Lab\projects\oma-integration-test -m claude"
Write-Host "Running: $docsCmd"
$docsResult = Invoke-Expression $docsCmd
Write-Host $docsResult

# Step 3: Spawn Backend Agent (OpenAI/GPT-5.5 model via Codex CLI)
Write-Host "`n--- Step 3: Spawn Backend Agent (Codex CLI) ---" -ForegroundColor Yellow
$backendSess = "sess-backend-$(Get-Random)"
$backendCmd = "oma agent:spawn backend 'Add CORS middleware to server.js and sanitize route inputs in routes.js to fix the CORS and validation bugs' $backendSess -w C:\Users\user\AI_Orchestra_Lab\projects\oma-integration-test -m codex"
Write-Host "Running: $backendCmd"
$backendResult = Invoke-Expression $backendCmd
Write-Host $backendResult

# Step 4: Run Docker Compose Integration Tests
Write-Host "`n--- Step 4: Run Docker Integration Tests ---" -ForegroundColor Yellow
cd C:\Users\user\AI_Orchestra_Lab\projects\oma-integration-test
docker compose run test-runner

# Step 5: Run OMA Verify
Write-Host "`n--- Step 5: Run OMA Verify ---" -ForegroundColor Yellow
$verifyBackend = oma verify backend -w C:\Users\user\AI_Orchestra_Lab\projects\oma-integration-test
Write-Host $verifyBackend
$verifyQA = oma verify qa -w C:\Users\user\AI_Orchestra_Lab\projects\oma-integration-test
Write-Host $verifyQA

Write-Host "`n=== Verification Completed ===" -ForegroundColor Green
