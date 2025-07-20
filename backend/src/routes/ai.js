const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const azureOpenAIService = require('../services/azureOpenAI');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/ai/health
// @desc    Check AI service health
// @access  Private
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await azureOpenAIService.healthCheck();
    
    res.json({
      success: true,
      aiService: healthStatus
    });
  } catch (error) {
    logger.error('AI health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check AI service health'
    });
  }
});

// @route   POST /api/ai/insights
// @desc    Get AI-powered financial insights and recommendations
// @access  Private
router.post('/insights', [

  body('timeframe')
    .optional()
    .isIn(['1m', '3m', '6m', '12m'])
    .withMessage('Invalid timeframe. Use 1m, 3m, 6m, or 12m'),
  body('includeGoals')
    .optional()
    .isBoolean()
    .withMessage('includeGoals must be a boolean')
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

    const { timeframe = '3m', includeGoals = true } = req.body;
    const userId = req.user._id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '1m':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '12m':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Gather user financial data
    const [transactions, budgets, categorySpending] = await Promise.all([
      // Recent transactions
      Transaction.find({
        userId,
        date: { $gte: startDate, $lte: endDate },
        status: 'completed'
      })
      .populate('category')
      .sort({ date: -1 })
      .limit(50),

      // Active budgets
      Budget.find({
        userId,
        isActive: true,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      })
      .populate('categories.category'),

      // Category spending analysis
      Transaction.getSpendingByCategory(userId, startDate, endDate)
    ]);

    // Calculate monthly spending summary
    const monthlySpending = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: startDate, $lte: endDate },
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
          total: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
            }
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);

    // Format monthly spending data
    const monthlySpendingFormatted = {};
    monthlySpending.forEach(item => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      monthlySpendingFormatted[key] = {
        income: item.income,
        expenses: item.expenses
      };
    });

    // Format category spending data
    const categorySpendingFormatted = {};
    categorySpending.forEach(item => {
      categorySpendingFormatted[item.categoryName] = item.total;
    });

    // Prepare user data for AI analysis
    const userData = {
      user: req.user,
      transactions: transactions.map(t => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: t.category?.name || 'Uncategorized'
      })),
      budgets: budgets.map(b => ({
        name: b.name,
        amount: b.amount,
        currentPeriod: b.currentPeriod,
        utilizationPercentage: b.utilizationPercentage
      })),
      monthlySpending: monthlySpendingFormatted,
      categorySpending: categorySpendingFormatted,
      financialGoals: includeGoals ? req.user.settings?.financialGoals || {} : {}
    };

    // Generate AI insights
    const insights = await azureOpenAIService.generateFinancialInsights(userData);

    // Log the AI request for analytics
    logger.info(`AI insights generated for user ${req.user.email}, timeframe: ${timeframe}`);

    res.json({
      success: true,
      data: {
        insights,
        metadata: {
          timeframe,
          dataPoints: {
            transactions: transactions.length,
            budgets: budgets.length,
            categories: categorySpending.length
          },
          generatedAt: new Date()
        }
      }
    });
  } catch (error) {
    logger.error('AI insights generation error:', error);
    
    if (error.message.includes('not available')) {
      return res.status(503).json({
        success: false,
        message: 'AI service is currently unavailable',
        fallback: {
          insights: [{
            category: 'system',
            title: 'AI Service Unavailable',
            description: 'AI-powered insights are temporarily unavailable. Please check your spending patterns manually.',
            severity: 'low',
            actionable: false
          }],
          recommendations: [{
            type: 'manual_review',
            title: 'Manual Financial Review',
            description: 'Review your recent transactions and budget performance manually.',
            priority: 'medium',
            estimatedImpact: 'N/A',
            timeframe: 'immediate'
          }],
          summary: {
            overallScore: 75,
            keyMessage: 'Continue monitoring your finances regularly.',
            nextSteps: ['Review transactions', 'Check budget status', 'Plan next month']
          }
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate financial insights'
    });
  }
});

// @route   POST /api/ai/budget-optimization
// @desc    Get AI-powered budget optimization suggestions
// @access  Private
router.post('/budget-optimization', async (req, res) => {
  try {
    const userId = req.user._id;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 3); // Last 3 months

    // Get current budgets
    const budgets = await Budget.find({
      userId,
      isActive: true
    }).populate('categories.category');

    if (budgets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active budgets found. Create budgets first to get optimization suggestions.'
      });
    }

    // Get spending patterns by category
    const spendingPatterns = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          type: 'expense',
          status: 'completed',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $group: {
          _id: '$categoryInfo.name',
          amounts: { $push: '$amount' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      {
        $addFields: {
          trend: {
            $cond: [
              { $gte: ['$average', 100] },
              'increasing',
              'stable'
            ]
          }
        }
      }
    ]);

    // Format data for AI analysis
    const budgetData = budgets.map(b => ({
      name: b.name,
      amount: b.amount,
      currentPeriod: b.currentPeriod,
      categories: b.categories.map(cat => cat.category?.name).filter(Boolean)
    }));

    const spendingData = {};
    spendingPatterns.forEach(pattern => {
      spendingData[pattern._id] = {
        total: pattern.total,
        average: pattern.average,
        count: pattern.count,
        trend: pattern.trend
      };
    });

    // Generate optimization suggestions
    const optimization = await azureOpenAIService.generateBudgetOptimization(budgetData, spendingData);

    logger.info(`Budget optimization generated for user ${req.user.email}`);

    res.json({
      success: true,
      data: {
        optimization,
        metadata: {
          budgetsAnalyzed: budgets.length,
          categoriesAnalyzed: spendingPatterns.length,
          analysisPeriod: {
            start: startDate,
            end: endDate
          },
          generatedAt: new Date()
        }
      }
    });
  } catch (error) {
    logger.error('Budget optimization error:', error);
    
    if (error.message.includes('not available')) {
      return res.status(503).json({
        success: false,
        message: 'AI service is currently unavailable'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate budget optimization'
    });
  }
});

// @route   POST /api/ai/categorize-transaction
// @desc    Auto-categorize a transaction using AI
// @access  Private
router.post('/categorize-transaction', [

  body('description')
    .notEmpty()
    .trim()
    .withMessage('Transaction description is required'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number'),
  body('merchant')
    .optional()
    .trim()
    .withMessage('Merchant must be a string')
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

    const { description, amount, merchant } = req.body;

    // Try AI categorization
    const suggestedCategory = await azureOpenAIService.categorizeTransaction(
      description,
      amount,
      merchant
    );

    // Get available categories for the user
    const categories = await Category.find({
      $or: [
        { userId: req.user._id, isActive: true },
        { isSystemCategory: true, isActive: true }
      ],
      type: { $in: ['expense', 'both'] }
    });

    // Find matching category
    let matchedCategory = null;
    if (suggestedCategory) {
      matchedCategory = categories.find(cat => 
        cat.name.toLowerCase().includes(suggestedCategory.toLowerCase()) ||
        suggestedCategory.toLowerCase().includes(cat.name.toLowerCase())
      );
    }

    res.json({
      success: true,
      data: {
        suggestedCategory,
        matchedCategory: matchedCategory ? {
          _id: matchedCategory._id,
          name: matchedCategory.name,
          icon: matchedCategory.icon,
          color: matchedCategory.color
        } : null,
        confidence: suggestedCategory ? 'medium' : 'low',
        availableCategories: categories.map(cat => ({
          _id: cat._id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color
        }))
      }
    });
  } catch (error) {
    logger.error('Transaction categorization error:', error);
    
    // Return available categories as fallback
    try {
      const categories = await Category.find({
        $or: [
          { userId: req.user._id, isActive: true },
          { isSystemCategory: true, isActive: true }
        ],
        type: { $in: ['expense', 'both'] }
      });

      res.json({
        success: true,
        data: {
          suggestedCategory: null,
          matchedCategory: null,
          confidence: 'low',
          availableCategories: categories.map(cat => ({
            _id: cat._id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color
          })),
          message: 'AI categorization unavailable, showing manual options'
        }
      });
    } catch (fallbackError) {
      logger.error('Fallback categorization error:', fallbackError);
      res.status(500).json({
        success: false,
        message: 'Failed to categorize transaction'
      });
    }
  }
});

// @route   GET /api/ai/capabilities
// @desc    Get AI service capabilities and status
// @access  Private
router.get('/capabilities', async (req, res) => {
  try {
    const isAvailable = azureOpenAIService.isAvailable();
    
    res.json({
      success: true,
      data: {
        available: isAvailable,
        features: {
          financialInsights: isAvailable,
          budgetOptimization: isAvailable,
          transactionCategorization: isAvailable,
          spendingAnalysis: isAvailable
        },
        limits: {
          maxTransactionsAnalyzed: 50,
          maxBudgetsOptimized: 10,
          cooldownPeriod: '1 minute'
        },
        status: isAvailable ? 'operational' : 'unavailable'
      }
    });
  } catch (error) {
    logger.error('AI capabilities check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check AI capabilities'
    });
  }
});

module.exports = router;
