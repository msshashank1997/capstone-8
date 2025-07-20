const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get user's categories and system categories
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { type, includeSystem = 'true' } = req.query;
    
    // Build query
    const query = {
      isActive: true
    };

    if (type && ['income', 'expense', 'both'].includes(type)) {
      query.type = { $in: [type, 'both'] };
    }

    // Include user categories and optionally system categories
    const orConditions = [{ userId: req.user._id }];
    if (includeSystem === 'true') {
      orConditions.push({ isSystemCategory: true });
    }
    query.$or = orConditions;

    const categories = await Category.find(query)
      .populate('parentCategory', 'name')
      .sort({ level: 1, sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories'
    });
  }
});

// @route   GET /api/categories/hierarchy
// @desc    Get categories with hierarchical structure
// @access  Private
router.get('/hierarchy', async (req, res) => {
  try {
    const { type } = req.query;
    
    const hierarchicalCategories = await Category.getUserCategoriesWithHierarchy(req.user._id);
    
    // Filter by type if specified
    let filteredCategories = hierarchicalCategories;
    if (type && ['income', 'expense', 'both'].includes(type)) {
      filteredCategories = hierarchicalCategories.filter(cat => 
        cat.type === type || cat.type === 'both'
      );
    }

    res.json({
      success: true,
      data: filteredCategories
    });
  } catch (error) {
    logger.error('Get category hierarchy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category hierarchy'
    });
  }
});

// @route   GET /api/categories/:id
// @desc    Get a specific category
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { isSystemCategory: true }
      ],
      isActive: true
    }).populate('parentCategory', 'name icon color');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category'
    });
  }
});

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private
router.post('/', [

  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name is required and must be less than 100 characters'),
  body('type')
    .isIn(['income', 'expense', 'both'])
    .withMessage('Type must be income, expense, or both'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon must be less than 50 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color'),
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID')
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

    // Check if category name already exists for this user
    const existingCategory = await Category.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
      isActive: true
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Validate parent category if provided
    if (req.body.parentCategory) {
      const parentCategory = await Category.findOne({
        _id: req.body.parentCategory,
        $or: [
          { userId: req.user._id },
          { isSystemCategory: true }
        ],
        isActive: true
      });

      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent category'
        });
      }

      // Prevent creating subcategories more than 3 levels deep
      if (parentCategory.level >= 2) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create subcategories more than 3 levels deep'
        });
      }
    }

    // Create category
    const categoryData = {
      ...req.body,
      userId: req.user._id,
      level: req.body.parentCategory ? 1 : 0 // Will be properly calculated in pre-save hook
    };

    const category = new Category(categoryData);
    await category.save();

    logger.info(`Category created for user ${req.user.email}: ${category.name}`);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    logger.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private
router.put('/:id', [

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be less than 100 characters'),
  body('type')
    .optional()
    .isIn(['income', 'expense', 'both'])
    .withMessage('Type must be income, expense, or both'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon must be less than 50 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color'),
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

    // Find category - only user categories can be updated
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isSystemCategory: false
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or cannot be modified'
      });
    }

    // Check if new name conflicts with existing categories
    if (req.body.name && req.body.name !== category.name) {
      const existingCategory = await Category.findOne({
        userId: req.user._id,
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        _id: { $ne: category._id },
        isActive: true
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Update category
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        category[key] = req.body[key];
      }
    });

    await category.save();

    logger.info(`Category updated for user ${req.user.email}: ${category._id}`);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    logger.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category (soft delete)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    // Find category - only user categories can be deleted
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isSystemCategory: false
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or cannot be deleted'
      });
    }

    // Check if category is being used in transactions
    const Transaction = require('../models/Transaction');
    const transactionCount = await Transaction.countDocuments({
      userId: req.user._id,
      category: category._id,
      status: 'completed'
    });

    if (transactionCount > 0) {
      // Soft delete - deactivate instead of removing
      category.isActive = false;
      await category.save();

      return res.json({
        success: true,
        message: `Category deactivated (${transactionCount} transactions reference this category)`
      });
    }

    // Check if category is being used in budgets
    const Budget = require('../models/Budget');
    const budgetCount = await Budget.countDocuments({
      userId: req.user._id,
      'categories.category': category._id,
      isActive: true
    });

    if (budgetCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category - it is referenced in ${budgetCount} active budget(s)`
      });
    }

    // Hard delete if no references
    await Category.findByIdAndDelete(req.params.id);

    logger.info(`Category deleted for user ${req.user.email}: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
});

// @route   GET /api/categories/:id/spending-analysis
// @desc    Get spending analysis for a category
// @access  Private
router.get('/:id/spending-analysis', async (req, res) => {
  try {
    const { period = '12m' } = req.query;
    
    const category = await Category.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { isSystemCategory: true }
      ],
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
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
      default:
        startDate.setMonth(endDate.getMonth() - 3);
    }

    // Get spending analysis
    const Transaction = require('../models/Transaction');
    
    const [monthlySpending, totalStats] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            category: category._id,
            type: 'expense',
            status: 'completed',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            average: { $avg: '$amount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]),
      
      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            category: category._id,
            type: 'expense',
            status: 'completed',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            averageTransaction: { $avg: '$amount' },
            minTransaction: { $min: '$amount' },
            maxTransaction: { $max: '$amount' }
          }
        }
      ])
    ]);

    const stats = totalStats[0] || {
      totalSpent: 0,
      transactionCount: 0,
      averageTransaction: 0,
      minTransaction: 0,
      maxTransaction: 0
    };

    // Format monthly data
    const monthlyData = monthlySpending.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      total: item.total,
      count: item.count,
      average: item.average
    }));

    res.json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name,
          icon: category.icon,
          color: category.color
        },
        period: {
          start: startDate,
          end: endDate,
          label: period
        },
        summary: stats,
        monthlyBreakdown: monthlyData,
        insights: {
          averageMonthly: monthlyData.length > 0 ? 
            monthlyData.reduce((sum, m) => sum + m.total, 0) / monthlyData.length : 0,
          trend: monthlyData.length >= 2 ? 
            (monthlyData[monthlyData.length - 1].total > monthlyData[0].total ? 'increasing' : 'decreasing') : 'stable',
          mostActiveMonth: monthlyData.length > 0 ? 
            monthlyData.reduce((max, m) => m.total > max.total ? m : max, monthlyData[0]) : null
        }
      }
    });
  } catch (error) {
    logger.error('Get category spending analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category spending analysis'
    });
  }
});

// @route   POST /api/categories/initialize-defaults
// @desc    Initialize default system categories for new users
// @access  Private
router.post('/initialize-defaults', async (req, res) => {
  try {
    // Check if user already has categories
    const existingCategories = await Category.countDocuments({ userId: req.user._id });
    
    if (existingCategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already has categories'
      });
    }

    // Default categories to create for new users
    const defaultCategories = [
      // Expense Categories
      { name: 'Food & Dining', type: 'expense', icon: 'restaurant', color: '#FF6B6B' },
      { name: 'Groceries', type: 'expense', icon: 'shopping_cart', color: '#4ECDC4' },
      { name: 'Transportation', type: 'expense', icon: 'directions_car', color: '#45B7D1' },
      { name: 'Gas', type: 'expense', icon: 'local_gas_station', color: '#96CEB4' },
      { name: 'Shopping', type: 'expense', icon: 'shopping_bag', color: '#FFEAA7' },
      { name: 'Entertainment', type: 'expense', icon: 'movie', color: '#DDA0DD' },
      { name: 'Bills & Utilities', type: 'expense', icon: 'receipt', color: '#98D8C8' },
      { name: 'Healthcare', type: 'expense', icon: 'local_hospital', color: '#F7DC6F' },
      { name: 'Education', type: 'expense', icon: 'school', color: '#BB8FCE' },
      { name: 'Travel', type: 'expense', icon: 'flight', color: '#85C1E9' },
      
      // Income Categories
      { name: 'Salary', type: 'income', icon: 'work', color: '#2ECC71' },
      { name: 'Freelance', type: 'income', icon: 'business_center', color: '#27AE60' },
      { name: 'Investment', type: 'income', icon: 'trending_up', color: '#229954' },
      { name: 'Other Income', type: 'income', icon: 'attach_money', color: '#1E8449' }
    ];

    const userCategories = defaultCategories.map(cat => ({
      ...cat,
      userId: req.user._id,
      isSystemCategory: false
    }));

    await Category.insertMany(userCategories);

    logger.info(`Default categories initialized for user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Default categories created successfully',
      data: {
        categoriesCreated: userCategories.length
      }
    });
  } catch (error) {
    logger.error('Initialize default categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize default categories'
    });
  }
});

module.exports = router;
