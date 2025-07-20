const { OpenAIApi } = require('@azure/openai');
const { DefaultAzureCredential } = require('@azure/identity');
const logger = require('../utils/logger');

class AzureOpenAIService {
  constructor() {
    this.client = null;
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    this.initialized = false;
    
    this.initializeClient();
  }

  /**
   * Initialize Azure OpenAI client with managed identity (preferred) or API key
   */
  async initializeClient() {
    try {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      
      if (!endpoint) {
        logger.warn('Azure OpenAI endpoint not configured');
        return;
      }

      // Use managed identity when available (recommended for production)
      if (process.env.AZURE_CLIENT_ID || process.env.MSI_ENDPOINT) {
        logger.info('Initializing Azure OpenAI with Managed Identity');
        const credential = new DefaultAzureCredential();
        
        this.client = new OpenAIApi(endpoint, credential);
      } else if (process.env.AZURE_OPENAI_API_KEY) {
        // Fallback to API key for development
        logger.info('Initializing Azure OpenAI with API Key');
        const { AzureKeyCredential } = require('@azure/core-auth');
        const credential = new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY);
        
        this.client = new OpenAIApi(endpoint, credential);
      } else {
        logger.warn('No Azure OpenAI credentials configured');
        return;
      }

      this.initialized = true;
      logger.info('Azure OpenAI service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Azure OpenAI service:', error);
      this.initialized = false;
    }
  }

  /**
   * Check if the service is available
   */
  isAvailable() {
    return this.initialized && this.client && this.deploymentName;
  }

  /**
   * Generate financial insights and recommendations
   */
  async generateFinancialInsights(userData) {
    if (!this.isAvailable()) {
      throw new Error('Azure OpenAI service not available');
    }

    try {
      const prompt = this.buildFinancialInsightsPrompt(userData);
      
      const response = await this.client.getChatCompletions(
        this.deploymentName,
        {
          messages: [
            {
              role: 'system',
              content: `You are a professional financial advisor AI assistant. Provide personalized, actionable financial advice based on the user's spending patterns, budget adherence, and financial goals. 
              
              Guidelines:
              - Be encouraging and supportive
              - Provide specific, actionable recommendations
              - Include relevant financial tips and best practices
              - Use clear, jargon-free language
              - Focus on practical improvements
              - Consider the user's financial situation and goals
              - Maintain user privacy and data security
              
              Respond in JSON format with the following structure:
              {
                "insights": [
                  {
                    "category": "spending_analysis|budget_performance|savings_opportunities|financial_health",
                    "title": "Insight title",
                    "description": "Detailed explanation",
                    "severity": "low|medium|high",
                    "actionable": true/false
                  }
                ],
                "recommendations": [
                  {
                    "type": "budget_adjustment|spending_reduction|savings_goal|investment|debt_management",
                    "title": "Recommendation title",
                    "description": "Detailed recommendation",
                    "priority": "low|medium|high",
                    "estimatedImpact": "dollar amount or percentage",
                    "timeframe": "immediate|short_term|long_term"
                  }
                ],
                "summary": {
                  "overallScore": "number from 1-100",
                  "keyMessage": "Main takeaway message",
                  "nextSteps": ["step1", "step2", "step3"]
                }
              }`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          maxTokens: 1500,
          temperature: 0.7,
          topP: 0.95
        }
      );

      const aiResponse = response.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from Azure OpenAI');
      }

      try {
        return JSON.parse(aiResponse);
      } catch (parseError) {
        logger.error('Failed to parse AI response as JSON:', parseError);
        
        // Return a fallback structured response
        return {
          insights: [{
            category: 'financial_health',
            title: 'AI Analysis Available',
            description: aiResponse.substring(0, 500),
            severity: 'medium',
            actionable: true
          }],
          recommendations: [{
            type: 'budget_adjustment',
            title: 'Review Financial Data',
            description: 'Based on your financial data, consider reviewing your spending patterns and budget allocations.',
            priority: 'medium',
            estimatedImpact: 'Varies',
            timeframe: 'short_term'
          }],
          summary: {
            overallScore: 75,
            keyMessage: 'Continue monitoring your financial health regularly.',
            nextSteps: ['Review monthly spending', 'Update budget categories', 'Set savings goals']
          }
        };
      }
    } catch (error) {
      logger.error('Error generating financial insights:', error);
      throw new Error('Failed to generate financial insights');
    }
  }

  /**
   * Generate budget optimization suggestions
   */
  async generateBudgetOptimization(budgetData, spendingData) {
    if (!this.isAvailable()) {
      throw new Error('Azure OpenAI service not available');
    }

    try {
      const prompt = this.buildBudgetOptimizationPrompt(budgetData, spendingData);
      
      const response = await this.client.getChatCompletions(
        this.deploymentName,
        {
          messages: [
            {
              role: 'system',
              content: `You are an expert budget optimization AI. Analyze budget vs actual spending data and provide specific optimization recommendations.
              
              Respond in JSON format:
              {
                "optimizations": [
                  {
                    "category": "category name",
                    "currentBudget": amount,
                    "suggestedBudget": amount,
                    "reasoning": "explanation",
                    "impact": "positive/negative/neutral"
                  }
                ],
                "savings": {
                  "totalPotential": amount,
                  "monthlyReduction": amount,
                  "confidence": "high|medium|low"
                },
                "recommendations": ["recommendation1", "recommendation2"]
              }`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          maxTokens: 1000,
          temperature: 0.6
        }
      );

      const aiResponse = response.choices[0]?.message?.content;
      return JSON.parse(aiResponse);
    } catch (error) {
      logger.error('Error generating budget optimization:', error);
      throw new Error('Failed to generate budget optimization');
    }
  }

  /**
   * Categorize transaction automatically
   */
  async categorizeTransaction(transactionDescription, amount, merchant = null) {
    if (!this.isAvailable()) {
      return null; // Return null if service not available, let manual categorization handle it
    }

    try {
      const prompt = `Categorize this transaction:
      Description: ${transactionDescription}
      Amount: $${amount}
      ${merchant ? `Merchant: ${merchant}` : ''}
      
      Choose from these categories: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Travel, Groceries, Gas, Other.
      
      Respond with only the category name.`;

      const response = await this.client.getChatCompletions(
        this.deploymentName,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a transaction categorization AI. Respond with only the most appropriate category name.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          maxTokens: 50,
          temperature: 0.3
        }
      );

      const category = response.choices[0]?.message?.content?.trim();
      return category;
    } catch (error) {
      logger.error('Error categorizing transaction:', error);
      return null;
    }
  }

  /**
   * Build prompt for financial insights
   */
  buildFinancialInsightsPrompt(userData) {
    const {
      user,
      transactions = [],
      budgets = [],
      monthlySpending = {},
      categorySpending = {},
      financialGoals = {}
    } = userData;

    return `Analyze this user's financial data and provide personalized insights:

    USER PROFILE:
    - Name: ${user.firstName} ${user.lastName}
    - Currency: ${user.currency}
    - Member since: ${user.createdAt}

    RECENT TRANSACTIONS (${transactions.length} transactions):
    ${transactions.slice(0, 10).map(t => 
      `- ${t.date}: ${t.type} $${t.amount} - ${t.description} (${t.category})`
    ).join('\n')}

    MONTHLY SPENDING SUMMARY:
    ${Object.entries(monthlySpending).map(([month, data]) => 
      `- ${month}: Income $${data.income || 0}, Expenses $${data.expenses || 0}, Net: $${(data.income || 0) - (data.expenses || 0)}`
    ).join('\n')}

    SPENDING BY CATEGORY:
    ${Object.entries(categorySpending).map(([category, amount]) => 
      `- ${category}: $${amount}`
    ).join('\n')}

    ACTIVE BUDGETS:
    ${budgets.map(b => 
      `- ${b.name}: $${b.currentPeriod.spent}/$${b.amount} (${Math.round((b.currentPeriod.spent / b.amount) * 100)}% used)`
    ).join('\n')}

    FINANCIAL GOALS:
    ${Object.entries(financialGoals).map(([goal, target]) => 
      `- ${goal}: $${target}`
    ).join('\n')}

    Please provide comprehensive financial insights and actionable recommendations.`;
  }

  /**
   * Build prompt for budget optimization
   */
  buildBudgetOptimizationPrompt(budgetData, spendingData) {
    return `Optimize these budgets based on actual spending patterns:

    BUDGET DATA:
    ${budgetData.map(b => 
      `- ${b.name}: Budgeted $${b.amount}, Spent $${b.currentPeriod.spent}, Remaining $${b.amount - b.currentPeriod.spent}`
    ).join('\n')}

    SPENDING PATTERNS:
    ${Object.entries(spendingData).map(([category, data]) => 
      `- ${category}: Average $${data.average}, Trend: ${data.trend}`
    ).join('\n')}

    Provide specific budget optimization recommendations.`;
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return {
        status: 'unavailable',
        message: 'Azure OpenAI service not configured'
      };
    }

    try {
      // Simple test request
      const response = await this.client.getChatCompletions(
        this.deploymentName,
        {
          messages: [{
            role: 'user',
            content: 'Respond with "OK" if you can read this message.'
          }],
          maxTokens: 10
        }
      );

      return {
        status: 'healthy',
        message: 'Service operational',
        response: response.choices[0]?.message?.content
      };
    } catch (error) {
      logger.error('Azure OpenAI health check failed:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new AzureOpenAIService();
