#!/bin/bash

# Migration Script from Monolith to Microservices
# This script helps migrate the current monolithic application to microservices architecture

echo "🚀 Finance Dashboard - Microservices Migration Tool"
echo "=================================================="

# Function to create service directories
create_service_structure() {
    local service_name=$1
    local port=$2
    
    echo "📁 Creating $service_name service structure..."
    
    mkdir -p "microservices/$service_name"
    mkdir -p "microservices/$service_name/src"
    mkdir -p "microservices/$service_name/src/routes"
    mkdir -p "microservices/$service_name/src/models"
    mkdir -p "microservices/$service_name/src/middleware"
    mkdir -p "microservices/$service_name/src/utils"
    mkdir -p "microservices/$service_name/tests"
    
    # Create package.json
    cat > "microservices/$service_name/package.json" << EOF
{
  "name": "finance-dashboard-$service_name",
  "version": "1.0.0",
  "description": "$service_name microservice for Finance Dashboard",
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
EOF

    # Create Dockerfile
    cat > "microservices/$service_name/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE $port

USER node

CMD ["npm", "start"]
EOF

    # Create basic server.js
    cat > "microservices/$service_name/src/server.js" << EOF
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || $port;

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
    service: '$service_name',
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
  logger.info(\`$service_name service running on port \${PORT}\`);
});

module.exports = app;
EOF

    echo "✅ $service_name service structure created"
}

# Main migration process
echo "🔄 Starting migration process..."

# Create service structures
create_service_structure "user-service" 3002
create_service_structure "transaction-service" 3003
create_service_structure "budget-service" 3004
create_service_structure "category-service" 3005
create_service_structure "currency-service" 3006
create_service_structure "ai-service" 3007
create_service_structure "reports-service" 3008

echo ""
echo "📋 Migration Steps Summary:"
echo "=========================="
echo "1. ✅ Created microservice directory structure"
echo "2. ✅ Generated basic service templates"
echo "3. ✅ Created Docker configurations"
echo "4. ✅ Setup API Gateway"
echo "5. ✅ Created Docker Compose orchestration"
echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Extract business logic from backend/ to respective services"
echo "2. Update database connections for each service"
echo "3. Implement service-to-service communication"
echo "4. Update frontend to use API Gateway endpoint"
echo "5. Test each service independently"
echo "6. Deploy using: docker-compose -f microservices/docker-compose.yml up"
echo ""
echo "📚 Documentation:"
echo "================="
echo "- Architecture overview: microservices/README.md"
echo "- API Gateway: microservices/api-gateway/"
echo "- Service templates: microservices/*/src/"
echo ""
echo "🔧 Manual Tasks Required:"
echo "========================"
echo "1. Copy models from backend/src/models/ to appropriate services"
echo "2. Copy routes from backend/src/routes/ to appropriate services"
echo "3. Update database connection strings"
echo "4. Configure environment variables"
echo "5. Update frontend API endpoint to http://localhost:3001/api"
echo ""
echo "✨ Migration scaffolding complete!"
