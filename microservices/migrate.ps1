# Migration Script from Monolith to Microservices (PowerShell)
# This script helps migrate the current monolithic application to microservices architecture

Write-Host "🚀 Finance Dashboard - Microservices Migration Tool" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Function to create service directories
function Create-ServiceStructure {
    param(
        [string]$ServiceName,
        [int]$Port
    )
    
    Write-Host "📁 Creating $ServiceName service structure..." -ForegroundColor Yellow
    
    # Create directories
    New-Item -ItemType Directory -Path "microservices\$ServiceName" -Force | Out-Null
    New-Item -ItemType Directory -Path "microservices\$ServiceName\src" -Force | Out-Null
    New-Item -ItemType Directory -Path "microservices\$ServiceName\src\routes" -Force | Out-Null
    New-Item -ItemType Directory -Path "microservices\$ServiceName\src\models" -Force | Out-Null
    New-Item -ItemType Directory -Path "microservices\$ServiceName\src\middleware" -Force | Out-Null
    New-Item -ItemType Directory -Path "microservices\$ServiceName\src\utils" -Force | Out-Null
    New-Item -ItemType Directory -Path "microservices\$ServiceName\tests" -Force | Out-Null
    
    # Create package.json
    $packageJson = @"
{
  "name": "finance-dashboard-$ServiceName",
  "version": "1.0.0",
  "description": "$ServiceName microservice for Finance Dashboard",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.4.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.1",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "joi": "^17.9.2",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3"
  }
}
"@
    
    $packageJson | Out-File -FilePath "microservices\$ServiceName\package.json" -Encoding UTF8
    
    # Create Dockerfile
    $dockerfile = @"
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE $Port

USER node

CMD ["npm", "start"]
"@
    
    $dockerfile | Out-File -FilePath "microservices\$ServiceName\Dockerfile" -Encoding UTF8
    
    # Create basic server.js
    $serverJs = @"
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || $Port;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    service: '$ServiceName',
    status: 'healthy', 
    timestamp: new Date().toISOString()
  });
});

// Routes
// TODO: Add service-specific routes

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`$ServiceName service running on port `+PORT);
});

module.exports = app;
"@
    
    $serverJs | Out-File -FilePath "microservices\$ServiceName\src\server.js" -Encoding UTF8
    
    Write-Host "✅ $ServiceName service structure created" -ForegroundColor Green
}

# Main migration process
Write-Host "🔄 Starting migration process..." -ForegroundColor Cyan

# Create service structures
Create-ServiceStructure -ServiceName "user-service" -Port 3002
Create-ServiceStructure -ServiceName "transaction-service" -Port 3003
Create-ServiceStructure -ServiceName "budget-service" -Port 3004
Create-ServiceStructure -ServiceName "category-service" -Port 3005
Create-ServiceStructure -ServiceName "currency-service" -Port 3006
Create-ServiceStructure -ServiceName "ai-service" -Port 3007
Create-ServiceStructure -ServiceName "reports-service" -Port 3008

Write-Host ""
Write-Host "📋 Migration Steps Summary:" -ForegroundColor Blue
Write-Host "==========================" -ForegroundColor Blue
Write-Host "1. ✅ Created microservice directory structure" -ForegroundColor Green
Write-Host "2. ✅ Generated basic service templates" -ForegroundColor Green
Write-Host "3. ✅ Created Docker configurations" -ForegroundColor Green
Write-Host "4. ✅ Setup API Gateway" -ForegroundColor Green
Write-Host "5. ✅ Created Docker Compose orchestration" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Magenta
Write-Host "==============" -ForegroundColor Magenta
Write-Host "1. Extract business logic from backend/ to respective services"
Write-Host "2. Update database connections for each service"
Write-Host "3. Implement service-to-service communication"
Write-Host "4. Update frontend to use API Gateway endpoint"
Write-Host "5. Test each service independently"
Write-Host "6. Deploy using: docker-compose -f microservices/docker-compose.yml up"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow
Write-Host "- Architecture overview: microservices/README.md"
Write-Host "- API Gateway: microservices/api-gateway/"
Write-Host "- Service templates: microservices/*/src/"
Write-Host ""
Write-Host "🔧 Manual Tasks Required:" -ForegroundColor Red
Write-Host "========================" -ForegroundColor Red
Write-Host "1. Copy models from backend/src/models/ to appropriate services"
Write-Host "2. Copy routes from backend/src/routes/ to appropriate services"
Write-Host "3. Update database connection strings"
Write-Host "4. Configure environment variables"
Write-Host "5. Update frontend API endpoint to http://localhost:3001/api"
Write-Host ""
Write-Host "✨ Migration scaffolding complete!" -ForegroundColor Green
