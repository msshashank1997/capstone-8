const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const currencyService = require('../services/currencyService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// @route   GET /api/transactions
// @desc    Get user's transactions with filtering and pagination
// @access  Public
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('status')
    .optional()
    .isIn(['completed', 'pending', 'cancelled'])
    .withMessage('Invalid status'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search term too long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      type,
      category,
      startDate,
      endDate,
      status = 'completed',
      search,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { merchant: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('category', 'name icon color')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        },
        filters: {
          type,
          category,
          startDate,
          endDate,
          status,
          search
        }
      }
    });
  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get a specific transaction
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('category', 'name icon color');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Get similar transactions
    const similarTransactions = await transaction.getSimilarTransactions(3);

    res.json({
      success: true,
      data: {
        transaction,
        similarTransactions
      }
    });
  } catch (error) {
    logger.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction'
    });
  }
});

// @route   POST /api/transactions
// @desc    Create a new transaction
// @access  Public
router.post('/', [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description is required and must be less than 500 characters'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('paymentMethod')
    .isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'digital_wallet', 'other'])
    .withMessage('Invalid payment method'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('originalAmount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Original amount must be greater than 0'),
  body('originalCurrency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Original currency must be a 3-letter code'),
  body('exchangeRate')
    .optional()
    .isFloat({ min: 0.001 })
    .withMessage('Exchange rate must be greater than 0'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  body('merchant')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Merchant name must be less than 200 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Verify category belongs to user or is a system category
    const category = await Category.findOne({
      _id: req.body.category,
      $or: [
        { userId: req.user._id },
        { isSystemCategory: true }
      ],
      isActive: true
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // Handle currency conversion
    const {
      amount,
      currency = 'USD',
      originalAmount,
      originalCurrency,
      exchangeRate
    } = req.body;

    let finalAmount = amount;
    let finalExchangeRate = exchangeRate || 1;
    let finalOriginalAmount = originalAmount || amount;
    let finalOriginalCurrency = originalCurrency || currency;

    // Convert to USD if different currency
    if (currency !== 'USD') {
      try {
        const conversion = await currencyService.convertCurrency(amount, currency, 'USD');
        finalAmount = conversion.convertedAmount;
        finalExchangeRate = conversion.exchangeRate;
        finalOriginalAmount = amount;
        finalOriginalCurrency = currency;
      } catch (error) {
        console.warn('Currency conversion failed, using provided values:', error.message);
        finalAmount = exchangeRate ? (amount / exchangeRate) : amount;
      }
    }

    // Create transaction with currency data
    const transactionData = {
      ...req.body,
      amount: finalAmount,
      currency: 'USD', // Always store in USD
      exchangeRate: finalExchangeRate,
      originalAmount: finalOriginalAmount,
      originalCurrency: finalOriginalCurrency,
      userId: req.user._id
    };

    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Update category usage
    await category.updateUsage();

    // Update related budgets
    if (req.body.type === 'expense') {
      const budgets = await Budget.find({
        userId: req.user._id,
        isActive: true,
        'categories.category': req.body.category,
        startDate: { $lte: new Date(req.body.date) },
        endDate: { $gte: new Date(req.body.date) }
      });

      // Update each affected budget
      for (const budget of budgets) {
        await budget.updateSpending();
        
        // Check for alerts
        const alerts = budget.checkAlerts();
        if (alerts.length > 0) {
          // Here you could send notifications
          logger.info(`Budget alerts triggered for user ${req.user.email}:`, alerts);
        }
      }
    }

    // Populate category for response
    await transaction.populate('category', 'name icon color');

    logger.info(`Transaction created for user ${req.user.email}: ${transaction.type} $${transaction.amount}`);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction'
    });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update a transaction
// @access  Private
router.put('/:id', [

  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Valid date is required'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'digital_wallet', 'other'])
    .withMessage('Invalid payment method')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Find transaction
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // If category is being updated, verify it
    if (req.body.category) {
      const category = await Category.findOne({
        _id: req.body.category,
        $or: [
          { userId: req.user._id },
          { isSystemCategory: true }
        ],
        isActive: true
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }
    }

    // Store old values for budget updates
    const oldCategory = transaction.category;
    const oldAmount = transaction.amount;
    const oldType = transaction.type;
    const oldDate = transaction.date;

    // Update transaction
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        transaction[key] = req.body[key];
      }
    });

    await transaction.save();

    // Update budgets if expense-related fields changed
    if (oldType === 'expense' || transaction.type === 'expense') {
      const affectedCategories = [oldCategory, transaction.category].filter(Boolean);
      
      for (const categoryId of affectedCategories) {
        const budgets = await Budget.find({
          userId: req.user._id,
          isActive: true,
          'categories.category': categoryId
        });

        for (const budget of budgets) {
          await budget.updateSpending();
        }
      }
    }

    // Populate category for response
    await transaction.populate('category', 'name icon color');

    logger.info(`Transaction updated for user ${req.user.email}: ${transaction._id}`);

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction'
    });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Store transaction details for budget updates
    const categoryId = transaction.category;
    const isExpense = transaction.type === 'expense';

    // Delete transaction
    await Transaction.findByIdAndDelete(req.params.id);

    // Update affected budgets
    if (isExpense) {
      const budgets = await Budget.find({
        userId: req.user._id,
        isActive: true,
        'categories.category': categoryId
      });

      for (const budget of budgets) {
        await budget.updateSpending();
      }
    }

    logger.info(`Transaction deleted for user ${req.user.email}: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    logger.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction'
    });
  }
});

// @route   GET /api/transactions/summary/:period
// @desc    Get transaction summary for a period
// @access  Private
router.get('/summary/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const validPeriods = ['week', 'month', 'quarter', 'year'];
    
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Use: week, month, quarter, or year'
      });
    }

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get summary data
    const [totalSummary, categoryBreakdown, monthlyTrends] = await Promise.all([
      Transaction.getUserSummary(req.user._id, startDate, now),
      Transaction.getSpendingByCategory(req.user._id, startDate, now),
      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            date: { $gte: startDate, $lte: now },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              type: '$type'
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ])
    ]);

    // Calculate net amounts
    const income = totalSummary.find(s => s._id === 'income')?.total || 0;
    const expenses = totalSummary.find(s => s._id === 'expense')?.total || 0;
    const netAmount = income - expenses;

    res.json({
      success: true,
      data: {
        summary: {
          period,
          startDate,
          endDate: now,
          income,
          expenses,
          netAmount,
          savingsRate: income > 0 ? ((netAmount / income) * 100).toFixed(2) : 0
        },
        categoryBreakdown,
        monthlyTrends,
        insights: {
          topExpenseCategory: categoryBreakdown[0]?.categoryName || null,
          averageDaily: expenses / Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)),
          transactionCount: totalSummary.reduce((acc, s) => acc + s.count, 0)
        }
      }
    });
  } catch (error) {
    logger.error('Get transaction summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction summary'
    });
  }
});

// @route   POST /api/transactions/bulk-import
// @desc    Import transactions from CSV file
// @access  Private
router.post('/bulk-import', [upload.single('csvFile')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    const transactions = [];
    const errors = [];
    let lineNumber = 1;

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;
        try {
          // Expected CSV format: date,amount,type,description,category,paymentMethod
          const transaction = {
            date: new Date(row.date),
            amount: parseFloat(row.amount),
            type: row.type?.toLowerCase(),
            description: row.description?.trim(),
            category: row.category?.trim(),
            paymentMethod: row.paymentMethod?.toLowerCase() || 'other',
            userId: req.user._id,
            importSource: 'csv',
            importBatch: req.file.filename
          };

          // Basic validation
          if (!transaction.date || isNaN(transaction.date.getTime())) {
            errors.push(`Line ${lineNumber}: Invalid date`);
            return;
          }
          if (!transaction.amount || transaction.amount <= 0) {
            errors.push(`Line ${lineNumber}: Invalid amount`);
            return;
          }
          if (!['income', 'expense'].includes(transaction.type)) {
            errors.push(`Line ${lineNumber}: Invalid type (must be income or expense)`);
            return;
          }
          if (!transaction.description) {
            errors.push(`Line ${lineNumber}: Description is required`);
            return;
          }

          transactions.push(transaction);
        } catch (error) {
          errors.push(`Line ${lineNumber}: ${error.message}`);
        }
      })
      .on('end', async () => {
        try {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          if (errors.length > 0) {
            return res.status(400).json({
              success: false,
              message: 'CSV validation errors',
              errors: errors.slice(0, 10), // Limit error messages
              totalErrors: errors.length
            });
          }

          if (transactions.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'No valid transactions found in CSV'
            });
          }

          // Get user's categories for mapping
          const categories = await Category.find({
            $or: [
              { userId: req.user._id },
              { isSystemCategory: true }
            ],
            isActive: true
          });

          // Map category names to IDs
          const categoryMap = {};
          categories.forEach(cat => {
            categoryMap[cat.name.toLowerCase()] = cat._id;
          });

          // Process transactions and map categories
          const processedTransactions = [];
          const unmappedCategories = new Set();

          for (const transaction of transactions) {
            const categoryId = categoryMap[transaction.category?.toLowerCase()];
            if (categoryId) {
              transaction.category = categoryId;
              processedTransactions.push(transaction);
            } else {
              unmappedCategories.add(transaction.category);
            }
          }

          // Insert valid transactions
          let insertedCount = 0;
          if (processedTransactions.length > 0) {
            const result = await Transaction.insertMany(processedTransactions, { ordered: false });
            insertedCount = result.length;
          }

          logger.info(`CSV import completed for user ${req.user.email}: ${insertedCount} transactions imported`);

          res.json({
            success: true,
            message: 'CSV import completed',
            data: {
              imported: insertedCount,
              total: transactions.length,
              skipped: transactions.length - insertedCount,
              unmappedCategories: Array.from(unmappedCategories)
            }
          });
        } catch (importError) {
          logger.error('CSV import error:', importError);
          res.status(500).json({
            success: false,
            message: 'Failed to import transactions'
          });
        }
      })
      .on('error', (error) => {
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        logger.error('CSV parsing error:', error);
        res.status(400).json({
          success: false,
          message: 'Failed to parse CSV file'
        });
      });
  } catch (error) {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    logger.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk import'
    });
  }
});

module.exports = router;
