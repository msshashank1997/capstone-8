const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Category Type
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense', 'both'],
    index: true
  },
  
  // Visual Representation
  icon: {
    type: String,
    trim: true,
    maxlength: 50,
    default: 'category'
  },
  color: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color'],
    default: '#6c757d'
  },
  
  // Hierarchy
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  
  // User and System Categories
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for system categories
    index: true
  },
  isSystemCategory: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Predefined Subcategories
  subcategories: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50
    }
  }],
  
  // Budget Integration
  budgetEnabled: {
    type: Boolean,
    default: true
  },
  defaultBudgetAmount: {
    type: Number,
    min: 0,
    default: null
  },
  
  // AI and Analytics
  keywords: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  autoCategorizationRules: [{
    field: {
      type: String,
      enum: ['description', 'merchant', 'amount_range']
    },
    operator: {
      type: String,
      enum: ['contains', 'equals', 'starts_with', 'ends_with', 'between']
    },
    value: mongoose.Schema.Types.Mixed,
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    }
  }],
  
  // Usage Statistics
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsed: {
    type: Date,
    default: null
  },
  
  // Status and Ordering
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // Audit Fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
categorySchema.index({ userId: 1, type: 1, isActive: 1 });
categorySchema.index({ isSystemCategory: 1, type: 1, isActive: 1 });
categorySchema.index({ parentCategory: 1, level: 1 });

// Virtual for full path (for hierarchical categories)
categorySchema.virtual('fullPath').get(function() {
  // This would need to be populated with parent category info
  return this.name;
});

// Virtual for subcategory count
categorySchema.virtual('subcategoryCount').get(function() {
  return this.subcategories ? this.subcategories.length : 0;
});

// Pre-save middleware
categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Automatically set level based on parent
  if (this.parentCategory && this.level === 0) {
    // This would need to be enhanced to properly calculate level
    this.level = 1;
  }
  
  next();
});

// Static method to get user categories with hierarchy
categorySchema.statics.getUserCategoriesWithHierarchy = async function(userId) {
  // Get both user categories and system categories
  const categories = await this.find({
    $or: [
      { userId: userId, isActive: true },
      { isSystemCategory: true, isActive: true }
    ]
  })
  .populate('parentCategory')
  .sort({ level: 1, sortOrder: 1, name: 1 });
  
  // Build hierarchy
  const categoryMap = new Map();
  const rootCategories = [];
  
  categories.forEach(cat => {
    categoryMap.set(cat._id.toString(), { ...cat.toObject(), children: [] });
  });
  
  categories.forEach(cat => {
    const categoryData = categoryMap.get(cat._id.toString());
    if (cat.parentCategory) {
      const parent = categoryMap.get(cat.parentCategory._id.toString());
      if (parent) {
        parent.children.push(categoryData);
      }
    } else {
      rootCategories.push(categoryData);
    }
  });
  
  return rootCategories;
};

// Static method to get spending analysis by category
categorySchema.statics.getSpendingAnalysis = async function(userId, startDate, endDate) {
  const pipeline = [
    {
      $lookup: {
        from: 'transactions',
        let: { categoryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$category', '$$categoryId'] },
              userId: new mongoose.Types.ObjectId(userId),
              type: 'expense',
              status: 'completed',
              date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
              }
            }
          }
        ],
        as: 'transactions'
      }
    },
    {
      $addFields: {
        totalSpent: { $sum: '$transactions.amount' },
        transactionCount: { $size: '$transactions' },
        avgTransaction: { $avg: '$transactions.amount' }
      }
    },
    {
      $match: {
        $or: [
          { userId: new mongoose.Types.ObjectId(userId) },
          { isSystemCategory: true }
        ],
        isActive: true,
        type: { $in: ['expense', 'both'] }
      }
    },
    {
      $sort: { totalSpent: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Instance method to update usage statistics
categorySchema.methods.updateUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model('Category', categorySchema);
