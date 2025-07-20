import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  PlusIcon,
  CalendarIcon,
  CreditCardIcon,
  TagIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { WORLD_CURRENCIES, POPULAR_CURRENCIES, formatCurrency } from '../../utils/currencies';
import axios from 'axios';

const AddTransactionModal = ({ isOpen, onClose, onAddTransaction }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
  });

  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({});
  const [convertedAmount, setConvertedAmount] = useState(null);

  // Fetch exchange rates when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchExchangeRates();
    }
  }, [isOpen]);

  // Convert amount when currency or amount changes
  useEffect(() => {
    if (formData.amount && formData.currency !== 'USD' && exchangeRates[formData.currency]) {
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
    
    const transaction = {
      id: Date.now(),
      description: formData.description,
      amount: formData.type === 'expense' ? -Math.abs(parseFloat(formData.amount)) : Math.abs(parseFloat(formData.amount)),
      category: formData.category,
      date: formData.date,
      type: formData.type,
      currency: formData.currency,
      // Add exchange rate and original amount for database storage
      exchangeRate: exchangeRates[formData.currency] || 1,
      originalAmount: parseFloat(formData.amount),
      originalCurrency: formData.currency,
      convertedAmountUSD: convertedAmount || parseFloat(formData.amount),
    };

    onAddTransaction(transaction);
    
    // Reset form
    setFormData({
      description: '',
      amount: '',
      category: '',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
    });
    
    setConvertedAmount(null);
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

  if (!isOpen) return null;

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
            Add New Transaction
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
                <span className="text-red-600">Expense</span>
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
                <span className="text-green-600">Income</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <CreditCardIcon className="h-4 w-4 inline mr-1" />
              Description
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter transaction description"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                Amount
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {currenciesToShow.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAllCurrencies(!showAllCurrencies)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                {showAllCurrencies ? 'Show Popular Only' : 'Show All Currencies'}
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <TagIcon className="h-4 w-4 inline mr-1" />
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select a category</option>
              {categories[formData.type].map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Preview */}
          {formData.amount && (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">Preview:</p>
              <p className={`font-semibold ${formData.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                {formData.type === 'expense' ? '-' : '+'}{formatCurrency(parseFloat(formData.amount) || 0, formData.currency)}
              </p>
              {convertedAmount && formData.currency !== 'USD' && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>≈ {formData.type === 'expense' ? '-' : '+'}${convertedAmount.toFixed(2)} USD</p>
                  <p className="text-xs">Exchange rate: 1 {formData.currency} = ${(exchangeRates[formData.currency] || 1).toFixed(4)} USD</p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Transaction
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddTransactionModal;
