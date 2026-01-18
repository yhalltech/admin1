$query = @'
{
  adminLogin(username: "testadmin", password: "admin123") {
    success
    message
    admin {
      id
      username
      email
    }
  }
}
'@

$body = @{
    query = $query
} | ConvertTo-Json

Write-Host "Testing admin login..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/graphql" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}