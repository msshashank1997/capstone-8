import React from 'react';
import { motion } from 'framer-motion';

const AIInsights = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Get AI-powered financial insights and recommendations
          </p>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          AI Insights Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This feature is under development. You'll get personalized financial insights powered by Azure OpenAI here.
        </p>
      </motion.div>
    </div>
  );
};

export default AIInsights;
