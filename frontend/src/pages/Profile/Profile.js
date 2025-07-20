import React from 'react';
import { motion } from 'framer-motion';

const Profile = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account profile and preferences
          </p>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Profile Management Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This feature is under development. You'll be able to manage your profile and preferences here.
        </p>
      </motion.div>
    </div>
  );
};

export default Profile;
