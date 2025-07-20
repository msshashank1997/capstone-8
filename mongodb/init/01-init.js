// MongoDB initialization script
db = db.getSiblingDB('finance_dashboard');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        firstName: {
          bsonType: 'string',
          minLength: 1
        },
        lastName: {
          bsonType: 'string',
          minLength: 1
        },
        preferences: {
          bsonType: 'object',
          properties: {
            currency: {
              bsonType: 'string',
              pattern: '^[A-Z]{3}$'
            },
            theme: {
              bsonType: 'string',
              enum: ['light', 'dark', 'auto']
            },
            language: {
              bsonType: 'string'
            }
          }
        }
      }
    }
  }
});

db.createCollection('transactions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'amount', 'description', 'category', 'date', 'type'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        amount: {
          bsonType: 'number'
        },
        description: {
          bsonType: 'string',
          minLength: 1
        },
        category: {
          bsonType: 'string',
          minLength: 1
        },
        date: {
          bsonType: 'date'
        },
        type: {
          bsonType: 'string',
          enum: ['income', 'expense']
        },
        currency: {
          bsonType: 'string',
          pattern: '^[A-Z]{3}$'
        }
      }
    }
  }
});

db.createCollection('budgets', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'category', 'amount', 'period'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        category: {
          bsonType: 'string',
          minLength: 1
        },
        amount: {
          bsonType: 'number',
          minimum: 0
        },
        period: {
          bsonType: 'string',
          enum: ['weekly', 'monthly', 'yearly']
        },
        currency: {
          bsonType: 'string',
          pattern: '^[A-Z]{3}$'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ 'email': 1 }, { unique: true });
db.transactions.createIndex({ 'userId': 1, 'date': -1 });
db.transactions.createIndex({ 'category': 1 });
db.transactions.createIndex({ 'type': 1 });
db.budgets.createIndex({ 'userId': 1, 'category': 1 });

// Insert sample data for development
const sampleUser = {
  email: 'demo@example.com',
  password: '$2a$10$rQJ2UwDzMYAoLGPfEQ1vFu1mG0fGZXXkG2LGXeYcHxPQGpGLHG9GG', // hashed 'password123'
  firstName: 'Demo',
  lastName: 'User',
  preferences: {
    currency: 'USD',
    theme: 'light',
    language: 'en'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

const userId = db.users.insertOne(sampleUser).insertedId;

// Sample transactions
const sampleTransactions = [
  {
    userId: userId,
    amount: 5000,
    description: 'Monthly Salary',
    category: 'Salary',
    date: new Date('2024-01-01'),
    type: 'income',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: userId,
    amount: -1200,
    description: 'Rent Payment',
    category: 'Housing',
    date: new Date('2024-01-02'),
    type: 'expense',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: userId,
    amount: -300,
    description: 'Groceries',
    category: 'Food & Dining',
    date: new Date('2024-01-03'),
    type: 'expense',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

db.transactions.insertMany(sampleTransactions);

// Sample budgets
const sampleBudgets = [
  {
    userId: userId,
    category: 'Food & Dining',
    amount: 500,
    period: 'monthly',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: userId,
    category: 'Transportation',
    amount: 200,
    period: 'monthly',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

db.budgets.insertMany(sampleBudgets);

print('Database initialized successfully with sample data');
