const express = require('express');
const { query, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard summary data
// @access  Private
router.get('/dashboard', [

  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
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

    const { period = 'month' } = req.query;
    
    // Calculate date ranges
    const now = new Date();
    const currentPeriodStart = new Date();
    const previousPeriodStart = new Date();
    const previousPeriodEnd = new Date();

    switch (period) {
      case 'week':
        currentPeriodStart.setDate(now.getDate() - 7);
        previousPeriodStart.setDate(now.getDate() - 14);
        previousPeriodEnd.setDate(now.getDate() - 7);
        break;
      case 'month':
        currentPeriodStart.setMonth(now.getMonth() - 1);
        previousPeriodStart.setMonth(now.getMonth() - 2);
        previousPeriodEnd.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        currentPeriodStart.setMonth(now.getMonth() - 3);
        previousPeriodStart.setMonth(now.getMonth() - 6);
        previousPeriodEnd.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        currentPeriodStart.setFullYear(now.getFullYear() - 1);
        previousPeriodStart.setFullYear(now.getFullYear() - 2);
        previousPeriodEnd.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get current period data
    const [currentSummary, previousSummary, categorySpending, recentTransactions, activeBudgets] = await Promise.all([
      // Current period summary
      Transaction.getUserSummary(req.user._id, currentPeriodStart, now),
      
      // Previous period summary for comparison
      Transaction.getUserSummary(req.user._id, previousPeriodStart, previousPeriodEnd),
      
      // Category spending breakdown
      Transaction.getSpendingByCategory(req.user._id, currentPeriodStart, now),
      
      // Recent transactions
      Transaction.find({
        userId: req.user._id,
        status: 'completed'
      })
      .populate('category', 'name icon color')
      .sort({ date: -1 })
      .limit(5),
      
      // Active budgets
      Budget.getActiveBudgets(req.user._id)
    ]);

    // Process current period data
    const currentIncome = currentSummary.find(s => s._id === 'income')?.total || 0;
    const currentExpenses = currentSummary.find(s => s._id === 'expense')?.total || 0;
    const currentNet = currentIncome - currentExpenses;

    // Process previous period data
    const previousIncome = previousSummary.find(s => s._id === 'income')?.total || 0;
    const previousExpenses = previousSummary.find(s => s._id === 'expense')?.total || 0;
    const previousNet = previousIncome - previousExpenses;

    // Calculate percentage changes
    const incomeChange = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0;
    const expenseChange = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    const netChange = previousNet !== 0 ? ((currentNet - previousNet) / Math.abs(previousNet)) * 100 : 0;

    // Update budget spending and get status
    const budgetSummary = {
      total: activeBudgets.length,
      onTrack: 0,
      warning: 0,
      critical: 0,
      overBudget: 0,
      totalBudgeted: 0,
      totalSpent: 0
    };

    for (const budget of activeBudgets) {
      await budget.updateSpending();
      budgetSummary.totalBudgeted += budget.amount;
      budgetSummary.totalSpent += budget.currentPeriod.spent;
      
      const status = budget.status;
      budgetSummary[status === 'on-track' ? 'onTrack' : status]++;
    }

    // Calculate savings rate
    const savingsRate = currentIncome > 0 ? ((currentNet / currentIncome) * 100).toFixed(2) : 0;

    const dashboardData = {
      period: {
        label: period,
        start: currentPeriodStart,
        end: now
      },
      summary: {
        income: {
          current: currentIncome,
          previous: previousIncome,
          change: incomeChange,
          trend: incomeChange > 0 ? 'up' : incomeChange < 0 ? 'down' : 'stable'
        },
        expenses: {
          current: currentExpenses,
          previous: previousExpenses,
          change: expenseChange,
          trend: expenseChange > 0 ? 'up' : expenseChange < 0 ? 'down' : 'stable'
        },
        net: {
          current: currentNet,
          previous: previousNet,
          change: netChange,
          trend: netChange > 0 ? 'up' : netChange < 0 ? 'down' : 'stable'
        },
        savingsRate: parseFloat(savingsRate)
      },
      categoryBreakdown: categorySpending.slice(0, 5), // Top 5 categories
      recentTransactions,
      budgets: budgetSummary,
      insights: {
        topSpendingCategory: categorySpending[0]?.categoryName || null,
        dailyAverageSpending: currentExpenses / Math.ceil((now - currentPeriodStart) / (1000 * 60 * 60 * 24)),
        transactionCount: currentSummary.reduce((acc, s) => acc + (s.count || 0), 0),
        budgetUtilization: budgetSummary.totalBudgeted > 0 ? 
          ((budgetSummary.totalSpent / budgetSummary.totalBudgeted) * 100).toFixed(2) : 0
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Dashboard report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard report'
    });
  }
});

// @route   GET /api/reports/spending-trends
// @desc    Get spending trends over time
// @access  Private
router.get('/spending-trends', [

  query('period')
    .optional()
    .isIn(['6m', '12m', '24m'])
    .withMessage('Period must be 6m, 12m, or 24m'),
  query('groupBy')
    .optional()
    .isIn(['month', 'quarter'])
    .withMessage('GroupBy must be month or quarter')
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

    const { period = '12m', groupBy = 'month' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '12m':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case '24m':
        startDate.setFullYear(endDate.getFullYear() - 2);
        break;
    }

    // Build aggregation pipeline
    const groupStage = groupBy === 'quarter' ? {
      year: { $year: '$date' },
      quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } }
    } : {
      year: { $year: '$date' },
      month: { $month: '$date' }
    };

    const trends = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            ...groupStage,
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            [groupBy]: groupBy === 'quarter' ? '$_id.quarter' : '$_id.month'
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
          },
          incomeCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$count', 0]
            }
          },
          expenseCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$count', 0]
            }
          }
        }
      },
      {
        $addFields: {
          net: { $subtract: ['$income', '$expenses'] },
          savingsRate: {
            $cond: [
              { $gt: ['$income', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$income', '$expenses'] }, '$income'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { '_id.year': 1, [`_id.${groupBy}`]: 1 }
      }
    ]);

    // Format the data
    const formattedTrends = trends.map(item => ({
      period: groupBy === 'quarter' ? 
        `${item._id.year}-Q${item._id.quarter}` : 
        `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      year: item._id.year,
      [groupBy]: item._id[groupBy],
      income: item.income,
      expenses: item.expenses,
      net: item.net,
      savingsRate: Math.round(item.savingsRate * 100) / 100,
      transactionCount: item.incomeCount + item.expenseCount
    }));

    // Calculate trend analysis
    const analysis = {
      totalPeriods: formattedTrends.length,
      averageIncome: formattedTrends.reduce((sum, t) => sum + t.income, 0) / formattedTrends.length,
      averageExpenses: formattedTrends.reduce((sum, t) => sum + t.expenses, 0) / formattedTrends.length,
      averageSavingsRate: formattedTrends.reduce((sum, t) => sum + t.savingsRate, 0) / formattedTrends.length,
      trend: formattedTrends.length >= 2 ? {
        income: formattedTrends[formattedTrends.length - 1].income > formattedTrends[0].income ? 'increasing' : 'decreasing',
        expenses: formattedTrends[formattedTrends.length - 1].expenses > formattedTrends[0].expenses ? 'increasing' : 'decreasing',
        savingsRate: formattedTrends[formattedTrends.length - 1].savingsRate > formattedTrends[0].savingsRate ? 'improving' : 'declining'
      } : null
    };

    res.json({
      success: true,
      data: {
        period: {
          range: period,
          groupBy,
          start: startDate,
          end: endDate
        },
        trends: formattedTrends,
        analysis
      }
    });
  } catch (error) {
    logger.error('Spending trends report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate spending trends report'
    });
  }
});

// @route   GET /api/reports/category-analysis
// @desc    Get detailed category spending analysis
// @access  Private
router.get('/category-analysis', [

  query('period')
    .optional()
    .isIn(['3m', '6m', '12m'])
    .withMessage('Period must be 3m, 6m, or 12m'),
  query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense')
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

    const { period = '6m', type = 'expense' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
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

    const categoryAnalysis = await Category.getSpendingAnalysis(req.user._id, startDate, endDate);
    
    // Filter by type and add additional calculations
    const filteredAnalysis = categoryAnalysis
      .filter(cat => cat.type === type || cat.type === 'both')
      .map(cat => {
        const monthsDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
        return {
          ...cat,
          monthlyAverage: cat.totalSpent / monthsDiff,
          percentage: 0, // Will be calculated after we have total
          trend: cat.transactionCount > 0 ? 'active' : 'inactive'
        };
      });

    // Calculate total and percentages
    const totalSpent = filteredAnalysis.reduce((sum, cat) => sum + cat.totalSpent, 0);
    filteredAnalysis.forEach(cat => {
      cat.percentage = totalSpent > 0 ? ((cat.totalSpent / totalSpent) * 100).toFixed(2) : 0;
    });

    // Sort by total spent (descending)
    filteredAnalysis.sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({
      success: true,
      data: {
        period: {
          range: period,
          start: startDate,
          end: endDate
        },
        type,
        categories: filteredAnalysis,
        summary: {
          totalCategories: filteredAnalysis.length,
          totalSpent,
          activeCategories: filteredAnalysis.filter(cat => cat.transactionCount > 0).length,
          topCategory: filteredAnalysis[0]?.name || null,
          averagePerCategory: filteredAnalysis.length > 0 ? totalSpent / filteredAnalysis.length : 0
        }
      }
    });
  } catch (error) {
    logger.error('Category analysis report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate category analysis report'
    });
  }
});

// @route   GET /api/reports/budget-performance
// @desc    Get budget performance report
// @access  Private
router.get('/budget-performance', async (req, res) => {
  try {
    const { period = 'current' } = req.query;
    
    let budgets;
    if (period === 'current') {
      budgets = await Budget.getActiveBudgets(req.user._id);
    } else {
      // Get all budgets for historical analysis
      budgets = await Budget.find({
        userId: req.user._id,
        isActive: true
      }).populate('categories.category', 'name icon color');
    }

    // Update spending for each budget and collect performance data
    const performanceData = [];
    
    for (const budget of budgets) {
      await budget.updateSpending();
      
      const performance = {
        budget: {
          _id: budget._id,
          name: budget.name,
          amount: budget.amount,
          period: budget.period,
          startDate: budget.startDate,
          endDate: budget.endDate
        },
        spending: {
          total: budget.currentPeriod.spent,
          remaining: budget.remainingAmount,
          utilizationPercentage: budget.utilizationPercentage,
          transactionCount: budget.currentPeriod.transactionCount
        },
        status: budget.status,
        alerts: budget.checkAlerts(),
        categories: budget.categories.map(cat => ({
          category: cat.category,
          allocation: cat.allocation
        }))
      };

      // Calculate time-based metrics
      const now = new Date();
      const totalDays = Math.ceil((budget.endDate - budget.startDate) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.max(0, Math.ceil((now - budget.startDate) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, Math.ceil((budget.endDate - now) / (1000 * 60 * 60 * 24)));
      
      performance.timeline = {
        totalDays,
        elapsedDays,
        remainingDays,
        progressPercentage: Math.min(100, (elapsedDays / totalDays) * 100)
      };

      // Calculate projected spending
      if (elapsedDays > 0) {
        const dailySpendingRate = budget.currentPeriod.spent / elapsedDays;
        performance.projections = {
          projectedTotal: dailySpendingRate * totalDays,
          projectedOverrun: Math.max(0, (dailySpendingRate * totalDays) - budget.amount),
          recommendedDailySpending: remainingDays > 0 ? budget.remainingAmount / remainingDays : 0
        };
      }

      performanceData.push(performance);
    }

    // Calculate overall statistics
    const summary = {
      totalBudgets: performanceData.length,
      totalBudgetAmount: performanceData.reduce((sum, p) => sum + p.budget.amount, 0),
      totalSpent: performanceData.reduce((sum, p) => sum + p.spending.total, 0),
      averageUtilization: performanceData.length > 0 ? 
        performanceData.reduce((sum, p) => sum + p.spending.utilizationPercentage, 0) / performanceData.length : 0,
      statusBreakdown: {
        onTrack: performanceData.filter(p => p.status === 'on-track').length,
        warning: performanceData.filter(p => p.status === 'warning').length,
        critical: performanceData.filter(p => p.status === 'critical').length,
        overBudget: performanceData.filter(p => p.status === 'over-budget').length
      },
      activeAlerts: performanceData.reduce((sum, p) => sum + p.alerts.length, 0)
    };

    res.json({
      success: true,
      data: {
        period,
        budgets: performanceData,
        summary
      }
    });
  } catch (error) {
    logger.error('Budget performance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate budget performance report'
    });
  }
});

// @route   GET /api/reports/export
// @desc    Export financial data to CSV
// @access  Private
router.get('/export', [

  query('type')
    .isIn(['transactions', 'budgets', 'categories'])
    .withMessage('Type must be transactions, budgets, or categories'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date')
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

    const { type, startDate, endDate } = req.query;
    
    // Set default date range if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());

    let csvData = '';
    let filename = '';

    switch (type) {
      case 'transactions':
        const transactions = await Transaction.find({
          userId: req.user._id,
          date: { $gte: start, $lte: end },
          status: 'completed'
        }).populate('category', 'name').sort({ date: -1 });

        csvData = 'Date,Type,Amount,Category,Description,Payment Method,Merchant,Notes\n';
        csvData += transactions.map(t => [
          t.date.toISOString().split('T')[0],
          t.type,
          t.amount,
          t.category?.name || 'Uncategorized',
          `"${t.description.replace(/"/g, '""')}"`,
          t.paymentMethod,
          t.merchant || '',
          `"${(t.notes || '').replace(/"/g, '""')}"`
        ].join(',')).join('\n');
        
        filename = `transactions_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`;
        break;

      case 'budgets':
        const budgets = await Budget.find({
          userId: req.user._id,
          $or: [
            { startDate: { $gte: start, $lte: end } },
            { endDate: { $gte: start, $lte: end } },
            { startDate: { $lte: start }, endDate: { $gte: end } }
          ]
        }).populate('categories.category', 'name');

        csvData = 'Name,Amount,Period,Start Date,End Date,Spent,Remaining,Utilization %,Status\n';
        csvData += budgets.map(b => [
          `"${b.name.replace(/"/g, '""')}"`,
          b.amount,
          b.period,
          b.startDate.toISOString().split('T')[0],
          b.endDate.toISOString().split('T')[0],
          b.currentPeriod.spent,
          b.remainingAmount,
          b.utilizationPercentage,
          b.status
        ].join(',')).join('\n');
        
        filename = `budgets_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`;
        break;

      case 'categories':
        const categories = await Category.find({
          $or: [
            { userId: req.user._id },
            { isSystemCategory: true }
          ],
          isActive: true
        });

        csvData = 'Name,Type,Description,Usage Count,Last Used,Created At\n';
        csvData += categories.map(c => [
          `"${c.name.replace(/"/g, '""')}"`,
          c.type,
          `"${(c.description || '').replace(/"/g, '""')}"`,
          c.usageCount,
          c.lastUsed ? c.lastUsed.toISOString().split('T')[0] : '',
          c.createdAt.toISOString().split('T')[0]
        ].join(',')).join('\n');
        
        filename = `categories_${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);

    logger.info(`Data exported for user ${req.user.email}: ${type}`);
  } catch (error) {
    logger.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
});

module.exports = router;
