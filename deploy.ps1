# Finance Dashboard Docker Deployment Script (PowerShell)

Write-Host "🚀 Finance Dashboard - Docker Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Function to check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        Write-Host "✅ Docker is running" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
        exit 1
    }
}

# Function to check if Docker Compose is available
function Test-DockerCompose {
    $composeAvailable = $false
    
    try {
        docker-compose --version | Out-Null
        $composeAvailable = $true
    }
    catch {
        try {
            docker compose version | Out-Null
            $composeAvailable = $true
        }
        catch {
            Write-Host "❌ Docker Compose is not installed. Please install Docker Compose and try again." -ForegroundColor Red
            exit 1
        }
    }
    
    if ($composeAvailable) {
        Write-Host "✅ Docker Compose is available" -ForegroundColor Green
    }
}

# Function to create .env file if it doesn't exist
function Initialize-Environment {
    if (-not (Test-Path ".env")) {
        Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "⚠️  Please edit .env file with your actual configuration values" -ForegroundColor Yellow
        Write-Host "   - Update JWT_SECRET with a secure random string" -ForegroundColor Yellow
        Write-Host "   - Add your EXCHANGE_RATE_API_KEY" -ForegroundColor Yellow
        Write-Host "   - Configure Azure OpenAI credentials if needed" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to continue after updating .env file"
    }
    else {
        Write-Host "✅ .env file exists" -ForegroundColor Green
    }
}

# Function to deploy development environment
function Deploy-Development {
    Write-Host "🔧 Deploying Development Environment..." -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    
    Write-Host "🏗️  Building and starting services..." -ForegroundColor Yellow
    docker-compose down --remove-orphans
    docker-compose up --build -d
    
    Write-Host ""
    Write-Host "🎉 Development deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access your application:" -ForegroundColor Blue
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
    Write-Host "   With Nginx: http://localhost" -ForegroundColor White
    Write-Host "   MongoDB: localhost:27017" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Check logs with:" -ForegroundColor Blue
    Write-Host "   docker-compose logs -f [service-name]" -ForegroundColor White
}

# Function to deploy production environment
function Deploy-Production {
    Write-Host "🏭 Deploying Production Environment..." -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    
    Write-Host "🏗️  Building and starting production services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    docker-compose -f docker-compose.prod.yml up --build -d
    
    Write-Host ""
    Write-Host "🎉 Production deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access your application:" -ForegroundColor Blue
    Write-Host "   Application: http://localhost" -ForegroundColor White
    Write-Host "   MongoDB: localhost:27017" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Check logs with:" -ForegroundColor Blue
    Write-Host "   docker-compose -f docker-compose.prod.yml logs -f [service-name]" -ForegroundColor White
}

# Function to deploy microservices
function Deploy-Microservices {
    Write-Host "🏗️  Deploying Microservices Architecture..." -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    Set-Location microservices
    Write-Host "🏗️  Building and starting microservices..." -ForegroundColor Yellow
    docker-compose down --remove-orphans
    docker-compose up --build -d
    
    Write-Host ""
    Write-Host "🎉 Microservices deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access your application:" -ForegroundColor Blue
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   API Gateway: http://localhost:3001" -ForegroundColor White
    Write-Host "   With Nginx: http://localhost" -ForegroundColor White
    Write-Host "   Individual Services: http://localhost:3002-3008" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Check logs with:" -ForegroundColor Blue
    Write-Host "   docker-compose logs -f [service-name]" -ForegroundColor White
    
    Set-Location ..
}

# Function to show service status
function Show-Status {
    Write-Host "📊 Service Status:" -ForegroundColor Blue
    Write-Host "==================" -ForegroundColor Blue
    docker-compose ps
    Write-Host ""
    Write-Host "💾 Volume Usage:" -ForegroundColor Blue
    Write-Host "===============" -ForegroundColor Blue
    docker volume ls | Select-String "capstone"
    Write-Host ""
    Write-Host "🌐 Network Info:" -ForegroundColor Blue
    Write-Host "===============" -ForegroundColor Blue
    docker network ls | Select-String "capstone"
}

# Function to cleanup
function Remove-All {
    Write-Host "🧹 Cleaning up Docker resources..." -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Yellow
    
    $response = Read-Host "This will stop and remove all containers, volumes, and networks. Continue? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        docker-compose down --remove-orphans --volumes
        docker-compose -f docker-compose.prod.yml down --remove-orphans --volumes 2>$null
        Set-Location microservices
        docker-compose down --remove-orphans --volumes 2>$null
        Set-Location ..
        
        Write-Host "🗑️  Removing unused Docker resources..." -ForegroundColor Yellow
        docker system prune -f
        
        Write-Host "✅ Cleanup complete!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    }
}

# Function to show menu
function Show-Menu {
    Write-Host ""
    Write-Host "Please select deployment option:" -ForegroundColor Magenta
    Write-Host "1) Development Environment (Hot reload, debug mode)" -ForegroundColor White
    Write-Host "2) Production Environment (Optimized builds)" -ForegroundColor White
    Write-Host "3) Microservices Architecture (7 separate services)" -ForegroundColor White
    Write-Host "4) Show Service Status" -ForegroundColor White
    Write-Host "5) Cleanup All Resources" -ForegroundColor White
    Write-Host "6) Exit" -ForegroundColor White
    Write-Host ""
}

# Pre-deployment checks
Test-Docker
Test-DockerCompose
Initialize-Environment

# Main deployment loop
do {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-6)"
    
    switch ($choice) {
        "1" { Deploy-Development }
        "2" { Deploy-Production }
        "3" { Deploy-Microservices }
        "4" { Show-Status }
        "5" { Remove-All }
        "6" { 
            Write-Host "👋 Goodbye!" -ForegroundColor Green
            exit 0 
        }
        default { 
            Write-Host "❌ Invalid option. Please try again." -ForegroundColor Red 
        }
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
} while ($true)
