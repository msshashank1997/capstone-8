const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3001;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/api-gateway.log' }),
    new winston.transports.Console()
  ]
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      'user-service': 'up',
      'transaction-service': 'up',
      'budget-service': 'up',
      'category-service': 'up',
      'currency-service': 'up',
      'ai-service': 'up',
      'reports-service': 'up'
    }
  });
});

// Service routes configuration
const services = {
  '/api/auth': {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '/auth' }
  },
  '/api/transactions': {
    target: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/transactions': '/transactions' }
  },
  '/api/budgets': {
    target: process.env.BUDGET_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/budgets': '/budgets' }
  },
  '/api/categories': {
    target: process.env.CATEGORY_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/categories': '/categories' }
  },
  '/api/currency': {
    target: process.env.CURRENCY_SERVICE_URL || 'http://localhost:3006',
    changeOrigin: true,
    pathRewrite: { '^/api/currency': '/currency' }
  },
  '/api/ai': {
    target: process.env.AI_SERVICE_URL || 'http://localhost:3007',
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '/ai' }
  },
  '/api/reports': {
    target: process.env.REPORTS_SERVICE_URL || 'http://localhost:3008',
    changeOrigin: true,
    pathRewrite: { '^/api/reports': '/reports' }
  }
};

// Create proxy middleware for each service
Object.keys(services).forEach(route => {
  const config = services[route];
  
  app.use(route, createProxyMiddleware({
    ...config,
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${route}: ${err.message}`);
      res.status(500).json({ 
        error: 'Service temporarily unavailable',
        service: route,
        timestamp: new Date().toISOString()
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      logger.info(`Proxying ${req.method} ${req.path} to ${config.target}`);
    }
  }));
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info('Service routes configured:', Object.keys(services));
});

module.exports = app;
