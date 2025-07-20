const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Budget Amount and Period
  amount: {
    type: Number,
    required: true,
    min: [0, 'Budget amount must be positive']
  },
  period: {
    type: String,
    required: true,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
    index: true
  },
  
  // Date Range (for custom periods or specific timeframes)
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Category Association
  categories: [{
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    allocation: {
      type: Number,
      min: 0,
      max: 100,
      default: 100 // Percentage of budget allocated to this category
    }
  }],
  
  // Budget Type
  type: {
    type: String,
    required: true,
    enum: ['expense', 'income', 'savings'],
    default: 'expense'
  },
  
  // Rollover Settings
  rolloverEnabled: {
    type: Boolean,
    default: false
  },
  rolloverAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxRolloverPercentage: {
    type: Number,
    default: 20,
    min: 0,
    max: 100
  },
  
  // Alert Settings
  alerts: {
    enabled: {
      type: Boolean,
      default: true
    },
    thresholds: [{
      percentage: {
        type: Number,
        required: true,
        min: 1,
        max: 100
      },
      type: {
        type: String,
        enum: ['warning', 'critical'],
        required: true
      },
      notified: {
        type: Boolean,
        default: false
      },
      lastNotified: {
        type: Date,
        default: null
      }
    }],
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    }
  },
  
  // Current Period Tracking
  currentPeriod: {
    spent: {
      type: Number,
      default: 0,
      min: 0
    },
    remaining: {
      type: Number,
      default: 0
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    },
    transactionCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Historical Data
  history: [{
    period: {
      startDate: Date,
      endDate: Date
    },
    budgetAmount: Number,
    actualSpent: Number,
    variance: Number,
    variancePercentage: Number,
    transactionCount: Number,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Goals and Targets
  goals: {
    targetSavings: {
      type: Number,
      min: 0,
      default: null
    },
    reduceSpendingBy: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: null
      },
      amount: {
        type: Number,
        min: 0,
        default: null
      }
    },
    achieveBy: {
      type: Date,
      default: null
    }
  },
  
  // Status and Settings
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  
  // AI Suggestions
  aiSuggestions: {
    enabled: {
      type: Boolean,
      default: true
    },
    lastSuggestion: {
      type: Date,
      default: null
    },
    suggestions: [{
      type: {
        type: String,
        enum: ['increase', 'decrease', 'reallocate', 'optimize']
      },
      message: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      applied: {
        type: Boolean,
        default: false
      }
    }]
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
budgetSchema.index({ userId: 1, isActive: 1, period: 1 });
budgetSchema.index({ userId: 1, startDate: 1, endDate: 1 });
budgetSchema.index({ 'categories.category': 1 });

// Virtual for budget utilization percentage
budgetSchema.virtual('utilizationPercentage').get(function() {
  if (this.amount === 0) return 0;
  return Math.round((this.currentPeriod.spent / this.amount) * 100);
});

// Virtual for remaining amount
budgetSchema.virtual('remainingAmount').get(function() {
  return Math.max(0, this.amount - this.currentPeriod.spent);
});

// Virtual for over-budget amount
budgetSchema.virtual('overBudgetAmount').get(function() {
  return Math.max(0, this.currentPeriod.spent - this.amount);
});

// Virtual for status
budgetSchema.virtual('status').get(function() {
  const utilization = this.utilizationPercentage;
  if (utilization >= 100) return 'over-budget';
  if (utilization >= 90) return 'critical';
  if (utilization >= 75) return 'warning';
  return 'on-track';
});

// Pre-save middleware
budgetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate remaining amount
  this.currentPeriod.remaining = this.amount - this.currentPeriod.spent;
  
  // Reset alert notifications if budget is modified
  if (this.isModified('amount') || this.isModified('alerts.thresholds')) {
    this.alerts.thresholds.forEach(threshold => {
      threshold.notified = false;
      threshold.lastNotified = null;
    });
  }
  
  next();
});

// Static method to get user's active budgets
budgetSchema.statics.getActiveBudgets = function(userId) {
  const now = new Date();
  return this.find({
    userId: userId,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
  .populate('categories.category')
  .sort({ createdAt: -1 });
};

// Static method to calculate budget performance
budgetSchema.statics.getBudgetPerformance = async function(userId, period = 'monthly') {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'weekly':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarterly':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: startDate }
      }
    },
    {
      $addFields: {
        utilizationPercentage: {
          $cond: [
            { $eq: ['$amount', 0] },
            0,
            { $multiply: [{ $divide: ['$currentPeriod.spent', '$amount'] }, 100] }
          ]
        },
        variance: { $subtract: ['$amount', '$currentPeriod.spent'] },
        status: {
          $switch: {
            branches: [
              {
                case: { $gte: [{ $divide: ['$currentPeriod.spent', '$amount'] }, 1] },
                then: 'over-budget'
              },
              {
                case: { $gte: [{ $divide: ['$currentPeriod.spent', '$amount'] }, 0.9] },
                then: 'critical'
              },
              {
                case: { $gte: [{ $divide: ['$currentPeriod.spent', '$amount'] }, 0.75] },
                then: 'warning'
              }
            ],
            default: 'on-track'
          }
        }
      }
    },
    {
      $sort: { utilizationPercentage: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Instance method to update current period spending
budgetSchema.methods.updateSpending = async function() {
  const Transaction = mongoose.model('Transaction');
  
  // Calculate total spending for this budget's categories in the current period
  const categoryIds = this.categories.map(cat => cat.category);
  
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: this.userId,
        category: { $in: categoryIds },
        type: 'expense',
        status: 'completed',
        date: {
          $gte: this.startDate,
          $lte: this.endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);
  
  if (result.length > 0) {
    this.currentPeriod.spent = result[0].totalSpent;
    this.currentPeriod.transactionCount = result[0].transactionCount;
  } else {
    this.currentPeriod.spent = 0;
    this.currentPeriod.transactionCount = 0;
  }
  
  this.currentPeriod.remaining = this.amount - this.currentPeriod.spent;
  this.currentPeriod.lastCalculated = new Date();
  
  return this.save();
};

// Instance method to check and trigger alerts
budgetSchema.methods.checkAlerts = function() {
  if (!this.alerts.enabled) return [];
  
  const utilizationPercentage = this.utilizationPercentage;
  const triggeredAlerts = [];
  
  this.alerts.thresholds.forEach(threshold => {
    if (utilizationPercentage >= threshold.percentage && !threshold.notified) {
      triggeredAlerts.push({
        budgetId: this._id,
        budgetName: this.name,
        threshold: threshold.percentage,
        type: threshold.type,
        currentUtilization: utilizationPercentage,
        amount: this.amount,
        spent: this.currentPeriod.spent,
        remaining: this.remainingAmount
      });
      
      threshold.notified = true;
      threshold.lastNotified = new Date();
    }
  });
  
  if (triggeredAlerts.length > 0) {
    this.save();
  }
  
  return triggeredAlerts;
};

module.exports = mongoose.model('Budget', budgetSchema);
