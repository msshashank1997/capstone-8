const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * Catches all errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous',
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID';
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for field: ${field}`;
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401
    };
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = {
      message,
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = {
      message,
      statusCode: 400
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = {
      message,
      statusCode: 429
    };
  }

  // Azure OpenAI specific errors
  if (err.code === 'insufficient_quota') {
    const message = 'AI service quota exceeded';
    error = {
      message,
      statusCode: 503
    };
  }

  if (err.code === 'rate_limit_exceeded') {
    const message = 'AI service rate limit exceeded';
    error = {
      message,
      statusCode: 429
    };
  }

  // Network/timeout errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    const message = 'Service temporarily unavailable';
    error = {
      message,
      statusCode: 503
    };
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    const message = 'Database connection error';
    error = {
      message,
      statusCode: 503
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't expose internal errors in production
  const response = {
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : message
  };

  // Add error ID for tracking in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    response.errorId = errorId;
    logger.error('Internal Server Error', { errorId, originalError: err.message });
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = {
      name: err.name,
      code: err.code,
      statusCode: err.statusCode
    };
  }

  // Security headers for error responses
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  res.status(statusCode).json(response);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error handler
 */
const handleValidationError = (errors) => {
  const message = errors.map(error => error.msg).join(', ');
  return new AppError(message, 400);
};

/**
 * Database error handler
 */
const handleDatabaseError = (error) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return new AppError(`Duplicate value for field: ${field}`, 400);
  }
  
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map(val => val.message).join(', ');
    return new AppError(message, 400);
  }
  
  if (error.name === 'CastError') {
    return new AppError('Invalid resource ID', 400);
  }
  
  return new AppError('Database operation failed', 500);
};

/**
 * Rate limit error handler
 */
const handleRateLimitError = () => {
  return new AppError('Too many requests, please try again later', 429);
};

/**
 * Authentication error handler
 */
const handleAuthError = (type = 'invalid') => {
  const messages = {
    invalid: 'Invalid authentication credentials',
    expired: 'Authentication token has expired',
    missing: 'Authentication token is required',
    forbidden: 'Insufficient permissions to access this resource'
  };
  
  const statusCodes = {
    invalid: 401,
    expired: 401,
    missing: 401,
    forbidden: 403
  };
  
  return new AppError(messages[type], statusCodes[type]);
};

/**
 * External service error handler
 */
const handleExternalServiceError = (service, originalError) => {
  logger.error(`External service error - ${service}:`, originalError);
  
  if (originalError.code === 'ECONNREFUSED' || originalError.code === 'ETIMEDOUT') {
    return new AppError(`${service} is temporarily unavailable`, 503);
  }
  
  if (originalError.status === 429) {
    return new AppError(`${service} rate limit exceeded`, 429);
  }
  
  if (originalError.status >= 500) {
    return new AppError(`${service} is experiencing issues`, 503);
  }
  
  return new AppError(`${service} request failed`, 400);
};

module.exports = errorHandler;
