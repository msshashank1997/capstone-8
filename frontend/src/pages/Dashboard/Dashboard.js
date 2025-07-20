import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ServerStackIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
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
import { formatCurrency, getCurrencySymbol, WORLD_CURRENCIES } from '../../utils/currencies';

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [displayCurrency, setDisplayCurrency] = useState('USD'); // Currency for display
  const [exchangeRates, setExchangeRates] = useState({});
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    savingsRate: 0
  });
  const [chartData, setChartData] = useState({
    monthlyTrends: [],
    categoryBreakdown: []
  });

  // Load display currency from localStorage on component mount
  useEffect(() => {
    const savedDisplayCurrency = localStorage.getItem('dashboardDisplayCurrency');
    if (savedDisplayCurrency) {
      setDisplayCurrency(savedDisplayCurrency);
    }
  }, []);

  // Save display currency to localStorage when it changes
  useEffect(() => {
    if (displayCurrency) {
      localStorage.setItem('dashboardDisplayCurrency', displayCurrency);
    }
  }, [displayCurrency]);

  // Fetch exchange rates
  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const fetchExchangeRates = async () => {
    try {
      const response = await axios.get('/api/currency/rates');
      if (response.data.success) {
        setExchangeRates(response.data.data.rates);
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    }
  };

  // Convert amount to display currency
  const convertToDisplayCurrency = (amount, fromCurrency) => {
    if (!amount || fromCurrency === displayCurrency) return amount;
    
    if (exchangeRates[fromCurrency] && exchangeRates[displayCurrency]) {
      // Convert from original currency to USD, then to display currency
      const usdAmount = amount / exchangeRates[fromCurrency];
      return usdAmount * exchangeRates[displayCurrency];
    }
    
    return amount; // Fallback to original amount if rates not available
  };

  // Load user data from backend on component mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Recalculate stats when display currency or exchange rates change
  useEffect(() => {
    if (transactions.length > 0 && Object.keys(exchangeRates).length > 0) {
      calculateStatsInDisplayCurrency();
    }
  }, [displayCurrency, exchangeRates, transactions]);

  const calculateStatsInDisplayCurrency = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });
    
    const income = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const amount = Math.abs(t.originalAmount || t.amount || 0);
        const currency = t.originalCurrency || t.currency || 'USD';
        const convertedAmount = convertToDisplayCurrency(amount, currency);
        return sum + convertedAmount;
      }, 0);
    
    const expenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const amount = Math.abs(t.originalAmount || t.amount || 0);
        const currency = t.originalCurrency || t.currency || 'USD';
        const convertedAmount = convertToDisplayCurrency(amount, currency);
        return sum + convertedAmount;
      }, 0);
    
    // Calculate overall balance from all transactions
    const totalBalance = transactions.reduce((sum, t) => {
      const amount = Math.abs(t.originalAmount || t.amount || 0);
      const currency = t.originalCurrency || t.currency || 'USD';
      const convertedAmount = convertToDisplayCurrency(amount, currency);
      return t.type === 'income' ? sum + convertedAmount : sum - convertedAmount;
    }, 0);
    
    setStats({
      totalIncome: income,
      totalExpenses: expenses,
      totalBalance: totalBalance,
      savingsRate: income > 0 ? ((income - expenses) / income * 100).toFixed(2) : 0
    });
  };

  // Reload data when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserData();
      }
    };

    const handleFocus = () => {
      loadUserData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load transactions
      const transactionsResponse = await axios.get('/api/transactions?limit=10');
      if (transactionsResponse.data.success) {
        setTransactions(transactionsResponse.data.data.transactions);
      }

      // Load summary stats
      const summaryResponse = await axios.get('/api/transactions/summary/month');
      if (summaryResponse.data.success) {
        const backendStats = summaryResponse.data.data.summary;
        const { categoryBreakdown = [], monthlyTrends = [] } = summaryResponse.data.data;
        
        // Map backend response to frontend state
        setStats({
          totalIncome: backendStats.income || 0,
          totalExpenses: backendStats.expenses || 0,
          totalBalance: backendStats.netAmount || 0,
          savingsRate: parseFloat(backendStats.savingsRate) || 0
        });

        // Set chart data from backend
        setChartData({
          monthlyTrends,
          categoryBreakdown
        });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Fallback to localStorage data for accurate balance calculation
      const savedTransactions = localStorage.getItem('customTransactions');
      if (savedTransactions) {
        try {
          const parsed = JSON.parse(savedTransactions);
          setTransactions(parsed.slice(0, 10));
          
          // The stats will be calculated by the useEffect when transactions change
          // This ensures currency conversion is applied consistently
        } catch (parseError) {
          console.error('Failed to parse localStorage data:', parseError);
          // Set empty stats if parsing fails
          setStats({
            totalIncome: 0,
            totalExpenses: 0,
            totalBalance: 0,
            savingsRate: 0
          });
        }
      } else {
        // No localStorage data, set empty stats
        setStats({
          totalIncome: 0,
          totalExpenses: 0,
          totalBalance: 0,
          savingsRate: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadUserData}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 disabled:opacity-50"
          >
            <ServerStackIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/custom-transactions')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Transaction</span>
          </motion.button>
        </div>
      </div>

      {/* Currency Display Selector */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Display Currency:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="block w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                {WORLD_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded">
                {getCurrencySymbol(displayCurrency)} {displayCurrency}
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            All amounts will be displayed in <strong>{displayCurrency}</strong>. This affects totals, income, expenses, and balance calculations.
          </p>
        </motion.div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading your data...</span>
        </div>
      )}

      {/* Stats Grid */}
      {!loading && (
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
                {getCurrencySymbol(displayCurrency)}{(stats.totalBalance || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} {displayCurrency}
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
                {getCurrencySymbol(displayCurrency)}{(stats.totalIncome || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} {displayCurrency}
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
                {getCurrencySymbol(displayCurrency)}{(stats.totalExpenses || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} {displayCurrency}
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
      )}

      {/* Charts Grid */}
      {!loading && (
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
      )}

      {/* Budget Overview and Recent Transactions */}
      {!loading && (
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
            <button 
              onClick={() => navigate('/custom-transactions')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
            >
              View All
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction, index) => (
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
                      {transaction.category} • {new Date(transaction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  transaction.type === 'income' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {getCurrencySymbol(displayCurrency)}{(() => {
                    const amount = Math.abs(transaction.originalAmount || transaction.amount || 0);
                    const currency = transaction.originalCurrency || transaction.currency || 'USD';
                    const convertedAmount = convertToDisplayCurrency(amount, currency);
                    return convertedAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });
                  })()} {displayCurrency}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      )}

      {/* Quick Actions */}
      {!loading && (
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
          <button 
            onClick={() => navigate('/custom-transactions')}
            className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <PlusIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Add Transaction</span>
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <ChartBarIcon className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">View Reports</span>
          </button>
          <button 
            onClick={() => navigate('/budgets')}
            className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <CalendarIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Manage Budgets</span>
          </button>
          <button 
            onClick={() => navigate('/ai-insights')}
            className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <CreditCardIcon className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">AI Insights</span>
          </button>
        </div>
      </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
