import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CreditCardIcon,
  CalendarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  SwitchHorizontalIcon,
  DatabaseIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import axios from 'axios';
import { formatCurrency } from '../../utils/currencies';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const Dashboard = () => {
  const [dataMode, setDataMode] = useState('demo'); // 'demo' or 'user'
  const [loading, setLoading] = useState(false);
  const [userTransactions, setUserTransactions] = useState([]);
  const [userStats, setUserStats] = useState(null);

  // Demo data
  const demoStats = {
    totalBalance: 25430.50,
    totalIncome: 5200.00,
    totalExpenses: 3250.75,
    savingsRate: 37.5
  };

  const demoTransactions = [
    { id: 1, description: 'Salary Deposit', amount: 5200.00, category: 'Income', date: '2024-01-15', type: 'income' },
    { id: 2, description: 'Grocery Shopping', amount: -125.50, category: 'Food', date: '2024-01-14', type: 'expense' },
    { id: 3, description: 'Electric Bill', amount: -89.75, category: 'Utilities', date: '2024-01-13', type: 'expense' },
    { id: 4, description: 'Coffee Shop', amount: -4.50, category: 'Food', date: '2024-01-12', type: 'expense' },
    { id: 5, description: 'Gas Station', amount: -45.00, category: 'Transportation', date: '2024-01-11', type: 'expense' },
  ];

  // Load user data from backend
  useEffect(() => {
    if (dataMode === 'user') {
      loadUserData();
    }
  }, [dataMode]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load transactions
      const transactionsResponse = await axios.get('/api/transactions?limit=10');
      if (transactionsResponse.data.success) {
        setUserTransactions(transactionsResponse.data.data.transactions);
      }

      // Load summary stats
      const summaryResponse = await axios.get('/api/transactions/summary/month');
      if (summaryResponse.data.success) {
        setUserStats(summaryResponse.data.data.summary);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Fallback to localStorage data
      const savedTransactions = localStorage.getItem('customTransactions');
      if (savedTransactions) {
        const parsed = JSON.parse(savedTransactions);
        setUserTransactions(parsed.slice(0, 10));
        
        // Calculate basic stats from localStorage
        const income = parsed.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const expenses = parsed.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        setUserStats({
          income,
          expenses,
          netAmount: income - expenses,
          savingsRate: income > 0 ? ((income - expenses) / income * 100).toFixed(2) : 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Use demo or user data based on mode
  const stats = dataMode === 'demo' ? demoStats : userStats || demoStats;
  const transactions = dataMode === 'demo' ? demoTransactions : userTransactions;

  // Chart data
  const monthlySpendingData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Expenses',
        data: [2800, 3200, 2900, 3500, 3100, 3250],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Income',
        data: [5000, 5200, 5000, 5300, 5100, 5200],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const categorySpendingData = {
    labels: ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare'],
    datasets: [
      {
        data: [650, 420, 280, 190, 380, 150],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const budgetData = {
    labels: ['Food', 'Transportation', 'Utilities', 'Entertainment'],
    datasets: [
      {
        label: 'Spent',
        data: [650, 420, 280, 190],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        label: 'Budget',
        data: [800, 500, 300, 250],
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back! Here's your financial overview.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Transaction</span>
        </motion.button>
      </div>

      {/* Data Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setDataMode('demo')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              dataMode === 'demo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Demo Data
          </button>
          <button
            onClick={() => setDataMode('user')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              dataMode === 'user'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Your Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${stats.totalBalance.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400 ml-1">+12.5%</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Income</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${stats.totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400 ml-1">+3.2%</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Expenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${stats.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <CreditCardIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400 ml-1">+8.1%</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Savings Rate</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.savingsRate}%
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400 ml-1">+2.3%</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Income vs Expenses
          </h3>
          <div className="h-64">
            <Line data={monthlySpendingData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending by Category
          </h3>
          <div className="h-64">
            <Pie data={categorySpendingData} options={pieOptions} />
          </div>
        </motion.div>
      </div>

      {/* Budget Overview and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Budget Overview
            </h3>
            <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="h-64">
            <Bar data={budgetData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Transactions
            </h3>
            <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center">
              View All
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <CreditCardIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {transaction.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {transaction.category} • {transaction.date}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  transaction.type === 'income' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {transaction.type === 'income' ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200">
            <PlusIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Add Transaction</span>
          </button>
          <button className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200">
            <ChartBarIcon className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">View Reports</span>
          </button>
          <button className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200">
            <CalendarIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Manage Budgets</span>
          </button>
          <button className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200">
            <CreditCardIcon className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">AI Insights</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
