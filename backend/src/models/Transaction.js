const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Transaction Details
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  exchangeRate: {
    type: Number,
    default: 1,
    min: [0.001, 'Exchange rate must be greater than 0']
  },
  originalAmount: {
    type: Number,
    default: null
  },
  originalCurrency: {
    type: String,
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense'],
    index: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Description and Notes
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Date and Time
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Payment Information
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'digital_wallet', 'other']
  },
  account: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Location and Context
  location: {
    name: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  merchant: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // Recurring Transaction Info
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringTransaction',
    default: null
  },
  
  // Attachments and Receipts
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tags for better organization
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  
  // Status and Flags
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // Import Information
  importSource: {
    type: String,
    enum: ['manual', 'csv', 'bank_api', 'receipt_scan'],
    default: 'manual'
  },
  importBatch: {
    type: String,
    default: null
  },
  originalData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Audit Fields
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
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

// Compound indexes for better query performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, status: 1, date: -1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return this.amount.toFixed(2);
});

// Virtual for month/year for aggregation
transactionSchema.virtual('monthYear').get(function() {
  const date = new Date(this.date);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
});

// Pre-save middleware to update updatedAt
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get user's transaction summary
transactionSchema.statics.getUserSummary = async function(userId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get spending by category
transactionSchema.statics.getSpendingByCategory = async function(userId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        status: 'completed'
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
        _id: '$category',
        categoryName: { $first: '$categoryInfo.name' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $sort: { total: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Instance method to get similar transactions
transactionSchema.methods.getSimilarTransactions = function(limit = 5) {
  return this.constructor.find({
    userId: this.userId,
    category: this.category,
    _id: { $ne: this._id }
  })
  .sort({ date: -1 })
  .limit(limit)
  .populate('category');
};

module.exports = mongoose.model('Transaction', transactionSchema);
