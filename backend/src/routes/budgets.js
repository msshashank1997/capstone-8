const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/budgets
// @desc    Get user's budgets
// @access  Private
router.get('/', [

  query('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean'),
  query('period')
    .optional()
    .isIn(['weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
    .withMessage('Invalid period')
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

    const { active, period } = req.query;
    
    // Build query
    const query = { userId: req.user._id };
    if (active !== undefined) query.isActive = active === 'true';
    if (period) query.period = period;

    const budgets = await Budget.find(query)
      .populate('categories.category', 'name icon color')
      .sort({ createdAt: -1 });

    // Update spending for each budget
    for (const budget of budgets) {
      if (budget.isActive) {
        await budget.updateSpending();
      }
    }

    res.json({
      success: true,
      data: budgets
    });
  } catch (error) {
    logger.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve budgets'
    });
  }
});

// @route   GET /api/budgets/active
// @desc    Get user's active budgets for current period
// @access  Private
router.get('/active', async (req, res) => {
  try {
    const budgets = await Budget.getActiveBudgets(req.user._id);
    
    // Update spending and check alerts for each budget
    const budgetsWithAlerts = [];
    
    for (const budget of budgets) {
      await budget.updateSpending();
      const alerts = budget.checkAlerts();
      
      budgetsWithAlerts.push({
        ...budget.toObject(),
        hasAlerts: alerts.length > 0,
        alerts: alerts
      });
    }

    res.json({
      success: true,
      data: budgetsWithAlerts
    });
  } catch (error) {
    logger.error('Get active budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active budgets'
    });
  }
});

// @route   GET /api/budgets/:id
// @desc    Get a specific budget
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('categories.category', 'name icon color');

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Update spending
    await budget.updateSpending();

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    logger.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve budget'
    });
  }
});

// @route   POST /api/budgets
// @desc    Create a new budget
// @access  Private
router.post('/', [

  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Budget name is required and must be less than 200 characters'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Budget amount must be a positive number'),
  body('period')
    .isIn(['weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
    .withMessage('Invalid budget period'),
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('categories')
    .isArray({ min: 1 })
    .withMessage('At least one category is required'),
  body('categories.*.category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('categories.*.allocation')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Allocation must be between 0 and 100')
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

    const { startDate, endDate, categories } = req.body;

    // Validate date range
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Verify all categories exist and belong to user or are system categories
    const categoryIds = categories.map(cat => cat.category);
    const validCategories = await Category.find({
      _id: { $in: categoryIds },
      $or: [
        { userId: req.user._id },
        { isSystemCategory: true }
      ],
      isActive: true
    });

    if (validCategories.length !== categoryIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more invalid categories'
      });
    }

    // Validate allocation percentages sum to 100% (if provided)
    const totalAllocation = categories.reduce((sum, cat) => {
      return sum + (cat.allocation || 100);
    }, 0);

    if (categories.length > 1 && Math.abs(totalAllocation - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Category allocations must sum to 100%'
      });
    }

    // Create budget
    const budgetData = {
      ...req.body,
      userId: req.user._id
    };

    const budget = new Budget(budgetData);
    await budget.save();

    // Populate categories for response
    await budget.populate('categories.category', 'name icon color');

    logger.info(`Budget created for user ${req.user.email}: ${budget.name}`);

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: budget
    });
  } catch (error) {
    logger.error('Create budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create budget'
    });
  }
});

// @route   PUT /api/budgets/:id
// @desc    Update a budget
// @access  Private
router.put('/:id', [

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Budget name must be less than 200 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget amount must be a positive number'),
  body('period')
    .optional()
    .isIn(['weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
    .withMessage('Invalid budget period'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('categories')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one category is required'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
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

    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Validate date range if dates are being updated
    if (req.body.startDate || req.body.endDate) {
      const startDate = new Date(req.body.startDate || budget.startDate);
      const endDate = new Date(req.body.endDate || budget.endDate);
      
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Validate categories if being updated
    if (req.body.categories) {
      const categoryIds = req.body.categories.map(cat => cat.category);
      const validCategories = await Category.find({
        _id: { $in: categoryIds },
        $or: [
          { userId: req.user._id },
          { isSystemCategory: true }
        ],
        isActive: true
      });

      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more invalid categories'
        });
      }

      // Validate allocation percentages
      const totalAllocation = req.body.categories.reduce((sum, cat) => {
        return sum + (cat.allocation || 100);
      }, 0);

      if (req.body.categories.length > 1 && Math.abs(totalAllocation - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'Category allocations must sum to 100%'
        });
      }
    }

    // Update budget
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        budget[key] = req.body[key];
      }
    });

    await budget.save();

    // Recalculate spending if categories or dates changed
    if (req.body.categories || req.body.startDate || req.body.endDate) {
      await budget.updateSpending();
    }

    // Populate categories for response
    await budget.populate('categories.category', 'name icon color');

    logger.info(`Budget updated for user ${req.user.email}: ${budget._id}`);

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: budget
    });
  } catch (error) {
    logger.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget'
    });
  }
});

// @route   DELETE /api/budgets/:id
// @desc    Delete a budget
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    await Budget.findByIdAndDelete(req.params.id);

    logger.info(`Budget deleted for user ${req.user.email}: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    logger.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget'
    });
  }
});

// @route   GET /api/budgets/:id/performance
// @desc    Get budget performance analysis
// @access  Private
router.get('/:id/performance', async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('categories.category', 'name icon color');

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Update current spending
    await budget.updateSpending();

    // Calculate performance metrics
    const utilizationPercentage = budget.utilizationPercentage;
    const remainingDays = Math.max(0, Math.ceil((budget.endDate - new Date()) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.ceil((budget.endDate - budget.startDate) / (1000 * 60 * 60 * 24));
    const elapsedDays = totalDays - remainingDays;
    const expectedSpending = (elapsedDays / totalDays) * budget.amount;
    const variance = budget.currentPeriod.spent - expectedSpending;
    const projectedSpending = remainingDays > 0 ? 
      (budget.currentPeriod.spent / elapsedDays) * totalDays : 
      budget.currentPeriod.spent;

    const performance = {
      budget: budget,
      metrics: {
        utilizationPercentage,
        remainingAmount: budget.remainingAmount,
        overBudgetAmount: budget.overBudgetAmount,
        variance,
        variancePercentage: expectedSpending > 0 ? (variance / expectedSpending) * 100 : 0,
        projectedSpending,
        projectedOverrun: Math.max(0, projectedSpending - budget.amount),
        dailySpendingRate: elapsedDays > 0 ? budget.currentPeriod.spent / elapsedDays : 0,
        recommendedDailySpending: remainingDays > 0 ? budget.remainingAmount / remainingDays : 0
      },
      timeline: {
        totalDays,
        elapsedDays,
        remainingDays,
        progressPercentage: (elapsedDays / totalDays) * 100
      },
      status: budget.status,
      alerts: budget.checkAlerts()
    };

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Get budget performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get budget performance'
    });
  }
});

// @route   POST /api/budgets/:id/alerts/test
// @desc    Test budget alerts
// @access  Private
router.post('/:id/alerts/test', async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Reset alert notifications for testing
    budget.alerts.thresholds.forEach(threshold => {
      threshold.notified = false;
      threshold.lastNotified = null;
    });

    await budget.save();

    // Check alerts
    const alerts = budget.checkAlerts();

    res.json({
      success: true,
      message: 'Alert test completed',
      data: {
        alertsTriggered: alerts.length,
        alerts: alerts,
        currentUtilization: budget.utilizationPercentage
      }
    });
  } catch (error) {
    logger.error('Test budget alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test budget alerts'
    });
  }
});

// @route   GET /api/budgets/performance/overview
// @desc    Get budget performance overview for all user budgets
// @access  Private
router.get('/performance/overview', async (req, res) => {
  try {
    const performance = await Budget.getBudgetPerformance(req.user._id);
    
    // Calculate overall statistics
    const totalBudgets = performance.length;
    const onTrackBudgets = performance.filter(b => b.status === 'on-track').length;
    const warningBudgets = performance.filter(b => b.status === 'warning').length;
    const criticalBudgets = performance.filter(b => b.status === 'critical').length;
    const overBudget = performance.filter(b => b.status === 'over-budget').length;

    const totalBudgetAmount = performance.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = performance.reduce((sum, b) => sum + b.currentPeriod.spent, 0);
    const averageUtilization = totalBudgets > 0 ? 
      performance.reduce((sum, b) => sum + b.utilizationPercentage, 0) / totalBudgets : 0;

    res.json({
      success: true,
      data: {
        budgets: performance,
        summary: {
          totalBudgets,
          totalBudgetAmount,
          totalSpent,
          totalRemaining: totalBudgetAmount - totalSpent,
          averageUtilization: Math.round(averageUtilization),
          statusBreakdown: {
            onTrack: onTrackBudgets,
            warning: warningBudgets,
            critical: criticalBudgets,
            overBudget
          }
        }
      }
    });
  } catch (error) {
    logger.error('Get budget performance overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get budget performance overview'
    });
  }
});

module.exports = router;
