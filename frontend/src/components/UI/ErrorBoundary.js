import React from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true,
    });

    // Here you could send the error to a logging service
    // Example: logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null 
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              {/* Error Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  We're sorry, but something unexpected happened. Please try again.
                </p>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Reload Page
                  </button>
                </div>

                {/* Error Details (Development Only) */}
                {isDevelopment && error && (
                  <motion.details
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 text-left"
                  >
                    <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2">
                      View Error Details
                    </summary>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 text-xs overflow-auto max-h-40">
                      <div className="mb-2">
                        <strong className="text-red-600 dark:text-red-400">Error:</strong>
                        <pre className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {error.toString()}
                        </pre>
                      </div>
                      {errorInfo && (
                        <div>
                          <strong className="text-red-600 dark:text-red-400">Stack Trace:</strong>
                          <pre className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </motion.details>
                )}

                {/* Support Information */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If this problem persists, please{' '}
                    <a
                      href="mailto:support@financedashboard.com"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      contact support
                    </a>
                    {' '}with the error details.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fallback component for React.Suspense
export const SuspenseFallback = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">{message}</p>
      </motion.div>
    </div>
  );
};

// Hook for handling async errors in functional components
export const useErrorHandler = () => {
  return (error, errorInfo) => {
    console.error('Async error caught:', error, errorInfo);
    
    // You could integrate with error reporting services here
    // Example: reportError(error, errorInfo);
    
    // For now, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', { error, errorInfo });
    }
  };
};

// Error display component for controlled error states
export const ErrorDisplay = ({ 
  error, 
  onRetry, 
  title = 'Something went wrong',
  description = 'An error occurred while processing your request.',
  showRetry = true,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center p-6 ${className}`}
    >
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        {error?.message || description}
      </p>
      
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Try Again
        </button>
      )}
    </motion.div>
  );
};

// Network error component
export const NetworkError = ({ onRetry }) => {
  return (
    <ErrorDisplay
      title="Connection Problem"
      description="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
};

// Not found error component
export const NotFoundError = ({ resource = 'page', onGoBack }) => {
  return (
    <ErrorDisplay
      title={`${resource.charAt(0).toUpperCase() + resource.slice(1)} Not Found`}
      description={`The ${resource} you're looking for doesn't exist or has been moved.`}
      onRetry={onGoBack}
      showRetry={!!onGoBack}
    />
  );
};

export default ErrorBoundary;
