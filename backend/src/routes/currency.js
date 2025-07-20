const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const currencyService = require('../services/currencyService');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Get current exchange rates
router.get('/rates', auth, async (req, res) => {
  try {
    const rates = await currencyService.getExchangeRates();
    
    res.json({
      success: true,
      data: {
        base: 'USD',
        rates,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates'
    });
  }
});

// Get supported currencies
router.get('/supported', auth, async (req, res) => {
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    
    res.json({
      success: true,
      data: currencies
    });
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supported currencies'
    });
  }
});

// Convert currency
router.post('/convert', [
  auth,
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('fromCurrency')
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('From currency must be a 3-letter code'),
  body('toCurrency')
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('To currency must be a 3-letter code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, fromCurrency, toCurrency } = req.body;
    
    const result = await currencyService.convertCurrency(amount, fromCurrency.toUpperCase(), toCurrency.toUpperCase());
    
    res.json({
      success: true,
      data: {
        originalAmount: amount,
        originalCurrency: fromCurrency.toUpperCase(),
        convertedAmount: result.convertedAmount,
        targetCurrency: toCurrency.toUpperCase(),
        exchangeRate: result.exchangeRate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency'
    });
  }
});

// Update user's preferred currency
router.put('/preference', [
  auth,
  body('currency')
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currency } = req.body;
    const uppercaseCurrency = currency.toUpperCase();
    
    // Validate currency is supported
    const supportedCurrencies = await currencyService.getSupportedCurrencies();
    if (!supportedCurrencies.includes(uppercaseCurrency)) {
      return res.status(400).json({
        success: false,
        message: 'Currency not supported'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { currency: uppercaseCurrency },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Currency preference updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          currency: user.currency,
          timezone: user.timezone,
          settings: user.settings
        }
      }
    });
  } catch (error) {
    console.error('Error updating currency preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update currency preference'
    });
  }
});

module.exports = router;
