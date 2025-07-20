import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import AddTransactionModal from '../components/Modals/AddTransactionModal';
import EditTransactionModal from '../components/Modals/EditTransactionModal';
import TransactionCharts from '../components/D3Visualizations/TransactionCharts';
import { formatCurrency, getCurrencySymbol, WORLD_CURRENCIES } from '../utils/currencies';
import axios from 'axios';
import { toast } from 'react-toastify';

const CustomTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [defaultCurrency, setDefaultCurrency] = useState(''); // Persistent currency for new transactions
  const [showCharts, setShowCharts] = useState(false); // Toggle for showing D3 charts
  const [loading, setLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({});

  // Load default currency from localStorage on component mount
  useEffect(() => {
    const savedDefaultCurrency = localStorage.getItem('defaultTransactionCurrency');
    if (savedDefaultCurrency) {
      setDefaultCurrency(savedDefaultCurrency);
    }
  }, []);

  // Save default currency to localStorage when it changes
  useEffect(() => {
    if (defaultCurrency) {
      localStorage.setItem('defaultTransactionCurrency', defaultCurrency);
    }
  }, [defaultCurrency]);

  // Load transactions from backend on component mount
  useEffect(() => {
    loadTransactions();
    fetchExchangeRates();
  }, []);

  // Fetch exchange rates for currency conversion
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

  // Load transactions from backend
  const loadTransactions = async () => {
    try {
      setLoading(true);
      // Try to load from backend first
      const response = await axios.get('/api/transactions?limit=100');
      if (response.data.success) {
        setTransactions(response.data.data.transactions);
        setFilteredTransactions(response.data.data.transactions);
      }
    } catch (error) {
      console.error('Failed to load transactions from backend:', error);
      // Fallback to localStorage
      const savedTransactions = localStorage.getItem('customTransactions');
      if (savedTransactions) {
        const parsed = JSON.parse(savedTransactions);
        // Clean up and ensure all transactions have proper currency data
        const cleanedTransactions = parsed.map(transaction => ({
          ...transaction,
          currency: transaction.currency || transaction.originalCurrency || 'USD',
          originalCurrency: transaction.originalCurrency || transaction.currency || 'USD'
        }));
        setTransactions(cleanedTransactions);
        setFilteredTransactions(cleanedTransactions);
        // Update localStorage with cleaned data
        localStorage.setItem('customTransactions', JSON.stringify(cleanedTransactions));
      }
    } finally {
      setLoading(false);
    }
  };

  // Save transactions to both backend and localStorage
  const saveTransaction = async (transaction) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/transactions', {
        amount: Math.abs(transaction.originalAmount || transaction.amount),
        description: transaction.description,
        category: transaction.category,
        type: transaction.type,
        date: transaction.date,
        currency: transaction.originalCurrency || transaction.currency,
        originalAmount: transaction.originalAmount,
        originalCurrency: transaction.originalCurrency,
        exchangeRate: transaction.exchangeRate,
        paymentMethod: 'other'
      });

      if (response.data.success) {
        await loadTransactions(); // Reload from backend
        toast.success('Transaction saved successfully');
      }
    } catch (error) {
      console.error('Failed to save transaction to backend:', error);
      // Fallback to localStorage only
      setTransactions(prev => [transaction, ...prev]);
      localStorage.setItem('customTransactions', JSON.stringify([transaction, ...transactions]));
      toast.error('Failed to save to database, saved locally only');
    } finally {
      setLoading(false);
    }
  };

  // Save transactions to localStorage whenever transactions change (backup)
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('customTransactions', JSON.stringify(transactions));
    }
  }, [transactions]);

  // Filter and sort transactions
  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(transaction => transaction.category === filterCategory);
    }

    // Currency filter
    if (selectedCurrency !== 'all') {
      filtered = filtered.filter(transaction => transaction.currency === selectedCurrency);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filterType, filterCategory, selectedCurrency, sortBy, sortOrder]);

  const handleAddTransaction = async (transaction) => {
    await saveTransaction(transaction);
  };

  const handleDeleteTransaction = async (id) => {
    try {
      setLoading(true);
      
      // Check if it's a backend transaction (has _id) or local transaction (has id)
      const isBackendTransaction = transactions.find(t => t._id === id);
      
      if (isBackendTransaction) {
        await axios.delete(`/api/transactions/${id}`);
        await loadTransactions(); // Reload from backend
        toast.success('Transaction deleted successfully');
      } else {
        // Local transaction only
        setTransactions(prev => prev.filter(transaction => transaction.id !== id));
        toast.success('Transaction removed from local storage');
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      // Fallback to local deletion
      setTransactions(prev => prev.filter(transaction => transaction.id !== id || transaction._id !== id));
      toast.error('Failed to delete from database, removed locally only');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleUpdateTransaction = async (updatedTransaction) => {
    try {
      setLoading(true);
      
      // Check if it's a backend transaction (has _id) or local transaction (has id)
      const isBackendTransaction = updatedTransaction._id;
      
      if (isBackendTransaction) {
        await axios.put(`/api/transactions/${updatedTransaction._id}`, {
          amount: Math.abs(updatedTransaction.originalAmount || updatedTransaction.amount),
          description: updatedTransaction.description,
          category: updatedTransaction.category,
          type: updatedTransaction.type,
          date: updatedTransaction.date,
          currency: updatedTransaction.originalCurrency || updatedTransaction.currency,
          originalAmount: updatedTransaction.originalAmount,
          originalCurrency: updatedTransaction.originalCurrency,
          exchangeRate: updatedTransaction.exchangeRate,
          paymentMethod: 'other'
        });
        await loadTransactions(); // Reload from backend
        toast.success('Transaction updated successfully');
      } else {
        // Local transaction only
        setTransactions(prev => prev.map(transaction => 
          transaction.id === updatedTransaction.id ? updatedTransaction : transaction
        ));
        toast.success('Transaction updated in local storage');
      }
    } catch (error) {
      console.error('Failed to update transaction:', error);
      // Fallback to local update
      setTransactions(prev => prev.map(transaction => 
        (transaction.id === updatedTransaction.id || transaction._id === updatedTransaction._id) 
          ? updatedTransaction : transaction
      ));
      toast.error('Failed to update in database, updated locally only');
    } finally {
      setLoading(false);
      setIsEditModalOpen(false);
      setEditingTransaction(null);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(transactions.map(t => t.category))];
    return categories.sort();
  };

  const getUniqueCurrencies = () => {
    const currencies = [...new Set(transactions.map(t => t.currency))];
    return currencies.sort();
  };

  const getTotalByType = (type) => {
    return filteredTransactions
      .filter(t => t.type === type)
      .reduce((sum, t) => {
        // Use original amount and currency for display
        const amount = Math.abs(t.originalAmount || t.amount);
        if (selectedCurrency === 'all' || selectedCurrency === (t.originalCurrency || t.currency)) {
          return sum + amount;
        }
        // Convert to selected currency if different
        if (exchangeRates[selectedCurrency] && (t.originalCurrency || t.currency) !== selectedCurrency) {
          const usdAmount = amount / (exchangeRates[t.originalCurrency || t.currency] || 1);
          const convertedAmount = usdAmount * exchangeRates[selectedCurrency];
          return sum + convertedAmount;
        }
        return sum + amount;
      }, 0);
  };

  const getAvailableBalance = () => {
    const totalIncome = getTotalByType('income');
    const totalExpenses = getTotalByType('expense');
    return totalIncome - totalExpenses;
  };

  const formatTransactionAmount = (transaction) => {
    const originalAmount = Math.abs(transaction.originalAmount || transaction.amount);
    const originalCurrency = transaction.originalCurrency || transaction.currency || 'USD';
    
    // If showing all transactions or specific currency matches
    if (selectedCurrency === 'all' || selectedCurrency === originalCurrency) {
      return formatCurrency(originalAmount, originalCurrency);
    }
    
    // Convert and display in selected currency
    if (exchangeRates[selectedCurrency] && exchangeRates[originalCurrency]) {
      const usdAmount = originalAmount / exchangeRates[originalCurrency];
      const convertedAmount = usdAmount * exchangeRates[selectedCurrency];
      return formatCurrency(convertedAmount, selectedCurrency);
    }
    
    // Fallback to original currency
    return formatCurrency(originalAmount, originalCurrency);
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ChevronDownIcon className="h-4 w-4 text-gray-400" />;
    return sortOrder === 'asc' ? 
      <ChevronUpIcon className="h-4 w-4 text-blue-600" /> : 
      <ChevronDownIcon className="h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Custom Transactions
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Add and manage your custom transaction data
          </p>
        </div>

        {/* Default Currency Selector */}
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default Currency for New Transactions:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="block w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">Select Currency</option>
                  {WORLD_CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
                {defaultCurrency && (
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded">
                    {getCurrencySymbol(defaultCurrency)} {defaultCurrency}
                  </span>
                )}
              </div>
            </div>
            {defaultCurrency && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                All new transactions will use <strong>{defaultCurrency}</strong> by default. You can change this currency for individual transactions if needed.
              </p>
            )}
          </motion.div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</p>
                <p className="text-2xl font-semibold text-green-600">
                  {selectedCurrency === 'all' ? '$' : getCurrencySymbol(selectedCurrency)}{getTotalByType('income').toFixed(2)}
                  {selectedCurrency !== 'all' && ` ${selectedCurrency}`}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-semibold text-red-600">
                  {selectedCurrency === 'all' ? '$' : getCurrencySymbol(selectedCurrency)}{getTotalByType('expense').toFixed(2)}
                  {selectedCurrency !== 'all' && ` ${selectedCurrency}`}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${getAvailableBalance() >= 0 ? 'bg-blue-100 dark:bg-blue-800' : 'bg-orange-100 dark:bg-orange-800'}`}>
                <ScaleIcon className={`h-6 w-6 ${getAvailableBalance() >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Balance</p>
                <p className={`text-2xl font-semibold ${getAvailableBalance() >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {selectedCurrency === 'all' ? '$' : getCurrencySymbol(selectedCurrency)}{Math.abs(getAvailableBalance()).toFixed(2)}
                  {selectedCurrency !== 'all' && ` ${selectedCurrency}`}
                  {getAvailableBalance() < 0 && ' (Deficit)'}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {filteredTransactions.length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center space-x-4">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="all">All Currencies</option>
                  {getUniqueCurrencies().map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Transaction
                </button>

                <button
                  onClick={() => setShowCharts(!showCharts)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  {showCharts ? 'Hide Charts' : 'Show Charts'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* D3.js Data Visualizations */}
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <TransactionCharts 
              transactions={filteredTransactions}
              selectedCurrency={selectedCurrency}
              exchangeRates={exchangeRates}
            />
          </motion.div>
        )}

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date
                      <SortIcon field="date" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center">
                      Description
                      <SortIcon field="description" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Category
                      <SortIcon field="category" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center">
                      Amount
                      <SortIcon field="amount" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center">
                        <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No transactions found</p>
                        <p className="text-sm">Get started by adding your first transaction</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {transaction.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : ''}
                          {formatTransactionAmount(transaction)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            disabled={loading}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                            title="Edit transaction"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction._id || transaction.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title="Delete transaction"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Transaction Modal */}
        <AddTransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddTransaction={handleAddTransaction}
          defaultCurrency={defaultCurrency}
        />

        {/* Edit Transaction Modal */}
        <EditTransactionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTransaction(null);
          }}
          onUpdateTransaction={handleUpdateTransaction}
          transaction={editingTransaction}
          defaultCurrency={defaultCurrency}
        />
      </div>
    </div>
  );
};

export default CustomTransactions;
