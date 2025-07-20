import React from 'react';
import { motion } from 'framer-motion';

const Budgets = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage your budgets
          </p>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Budget Management Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This feature is under development. You'll be able to create, track, and manage your budgets here.
        </p>
      </motion.div>
    </div>
  );
};

export default Budgets;
