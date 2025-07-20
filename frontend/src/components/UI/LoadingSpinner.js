import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  className = '',
  text = '',
  overlay = false,
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    white: 'text-white',
  };

  const SpinnerComponent = () => (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <motion.div
        className={clsx(
          'animate-spin rounded-full border-2 border-current border-t-transparent',
          sizeClasses[size],
          colorClasses[color]
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      {text && (
        <motion.p
          className={clsx(
            'mt-2 text-sm font-medium',
            colorClasses[color]
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <SpinnerComponent />
        </motion.div>
      </motion.div>
    );
  }

  return <SpinnerComponent />;
};

// Skeleton loading component
export const SkeletonLoader = ({ 
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded',
  animated = true,
}) => {
  return (
    <div
      className={clsx(
        'bg-gray-200 dark:bg-gray-700',
        width,
        height,
        rounded,
        animated && 'animate-pulse',
        className
      )}
    />
  );
};

// Button loading component
export const ButtonLoader = ({ size = 'small', className = '' }) => {
  return (
    <LoadingSpinner
      size={size}
      color="white"
      className={clsx('mr-2', className)}
    />
  );
};

// Page loading component
export const PageLoader = ({ text = 'Loading...' }) => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner
        size="large"
        color="primary"
        text={text}
      />
    </div>
  );
};

// Card loading skeleton
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={clsx('card space-y-4', className)}>
      <div className="space-y-2">
        <SkeletonLoader height="h-6" width="w-3/4" />
        <SkeletonLoader height="h-4" width="w-1/2" />
      </div>
      <div className="space-y-2">
        <SkeletonLoader height="h-4" />
        <SkeletonLoader height="h-4" width="w-5/6" />
        <SkeletonLoader height="h-4" width="w-4/6" />
      </div>
    </div>
  );
};

// Table loading skeleton
export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonLoader key={index} height="h-4" width="w-20" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="grid gap-4" 
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} height="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Chart loading skeleton
export const ChartSkeleton = ({ className = '' }) => {
  return (
    <div className={clsx('space-y-4', className)}>
      <div className="flex justify-between">
        <SkeletonLoader height="h-6" width="w-32" />
        <SkeletonLoader height="h-4" width="w-20" />
      </div>
      <div className="flex items-end space-x-2" style={{ height: '200px' }}>
        {Array.from({ length: 12 }).map((_, index) => (
          <SkeletonLoader
            key={index}
            width="flex-1"
            height={`h-${Math.floor(Math.random() * 40) + 10}`}
            rounded="rounded-t"
          />
        ))}
      </div>
    </div>
  );
};

// List loading skeleton
export const ListSkeleton = ({ items = 5, className = '' }) => {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          <SkeletonLoader width="w-10" height="h-10" rounded="rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonLoader height="h-4" width="w-3/4" />
            <SkeletonLoader height="h-3" width="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Dashboard stats skeleton
export const StatsSkeleton = ({ cards = 4, className = '' }) => {
  return (
    <div className={clsx('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="card">
          <div className="flex items-center">
            <div className="flex-1">
              <SkeletonLoader height="h-4" width="w-20" className="mb-2" />
              <SkeletonLoader height="h-8" width="w-16" />
            </div>
            <SkeletonLoader width="w-12" height="h-12" rounded="rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSpinner;
