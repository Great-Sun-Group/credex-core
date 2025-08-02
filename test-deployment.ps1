# Test deployment script
$deployToken = "0c1dRIcfqjV3fNQfa92ZzDkpl9nP44hjeM1iKdVN0GYICnisZuF98Cs3D3Kwh4r1"

$body = @{
    service = "credex-core"
    deploy_token = $deployToken
    branch = "prod"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "x-request-id" = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
}

Write-Host "Testing deployment API..."
Write-Host "Endpoint: http://localhost:4000/api/deploy-core"
Write-Host "Request ID: $($headers['x-request-id'])"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/deploy-core" -Method POST -Headers $headers -Body $body
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
