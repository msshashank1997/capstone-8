import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  CalendarIcon,
  CreditCardIcon,
  TagIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { WORLD_CURRENCIES, POPULAR_CURRENCIES, formatCurrency } from '../../utils/currencies';
import axios from 'axios';

const EditTransactionModal = ({ isOpen, onClose, onUpdateTransaction, transaction, defaultCurrency = '' }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    currency: '',
  });

  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({});
  const [convertedAmount, setConvertedAmount] = useState(null);

  // Populate form with transaction data when modal opens
  useEffect(() => {
    if (isOpen && transaction) {
      setFormData({
        description: transaction.description || '',
        amount: Math.abs(transaction.originalAmount || transaction.amount || 0).toString(),
        category: transaction.category || '',
        type: transaction.type || 'expense',
        date: transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
        currency: transaction.originalCurrency || transaction.currency || '',
      });
      fetchExchangeRates();
    }
  }, [isOpen, transaction]);

  // Convert amount when currency or amount changes
  useEffect(() => {
    if (formData.amount && formData.currency && formData.currency !== 'USD' && exchangeRates[formData.currency]) {
      convertCurrency();
    } else {
      setConvertedAmount(null);
    }
  }, [formData.amount, formData.currency, exchangeRates]);

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

  const convertCurrency = async () => {
    if (!formData.amount || formData.currency === 'USD') return;
    
    try {
      const response = await axios.post('/api/currency/convert', {
        amount: parseFloat(formData.amount),
        fromCurrency: formData.currency,
        toCurrency: 'USD'
      });
      
      if (response.data.success) {
        setConvertedAmount(response.data.data.convertedAmount);
      }
    } catch (error) {
      console.error('Failed to convert currency:', error);
    }
  };

  const categories = {
    expense: [
      'Food & Dining',
      'Shopping',
      'Transportation',
      'Bills & Utilities',
      'Healthcare',
      'Entertainment',
      'Travel',
      'Education',
      'Insurance',
      'Investment',
      'EMI',
      'Other'
    ],
    income: [
      'Salary',
      'Freelance',
      'Investment',
      'Business',
      'Gift',
      'Bonus',
      'Other'
    ]
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Ensure currency is selected
    if (!formData.currency) {
      alert('Please select a currency');
      return;
    }
    
    const updatedTransaction = {
      ...transaction,
      description: formData.description,
      amount: formData.type === 'expense' ? -Math.abs(parseFloat(formData.amount)) : Math.abs(parseFloat(formData.amount)),
      category: formData.category,
      date: formData.date,
      type: formData.type,
      currency: formData.currency,
      exchangeRate: exchangeRates[formData.currency] || 1,
      originalAmount: parseFloat(formData.amount),
      originalCurrency: formData.currency,
      convertedAmountUSD: convertedAmount || parseFloat(formData.amount),
    };

    onUpdateTransaction(updatedTransaction);
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const currenciesToShow = showAllCurrencies ? WORLD_CURRENCIES : 
    WORLD_CURRENCIES.filter(currency => POPULAR_CURRENCIES.includes(currency.code));

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Transaction
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transaction Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={formData.type === 'expense'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <CreditCardIcon className="h-5 w-5 text-red-500 mr-1" />
                <span className="text-gray-700 dark:text-gray-300">Expense</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={formData.type === 'income'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <PlusIcon className="h-5 w-5 text-green-500 mr-1" />
                <span className="text-gray-700 dark:text-gray-300">Income</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter transaction description"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <div className="relative">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a currency</option>
                {currenciesToShow.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Show all currencies toggle */}
          <button
            type="button"
            onClick={() => setShowAllCurrencies(!showAllCurrencies)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showAllCurrencies ? 'Show popular currencies only' : 'Show all currencies'}
          </button>

          {/* Currency Conversion Display */}
          {convertedAmount && formData.currency !== 'USD' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {formatCurrency(parseFloat(formData.amount), formData.currency)} = {formatCurrency(convertedAmount, 'USD')}
              </p>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="relative">
              <TagIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select a category</option>
                {categories[formData.type].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <div className="relative">
              <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PencilIcon className="h-4 w-4 inline mr-1" />
              Update Transaction
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditTransactionModal;
