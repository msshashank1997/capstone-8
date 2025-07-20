const axios = require('axios');
const NodeCache = require('node-cache');

// Cache exchange rates for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

class CurrencyService {
  constructor() {
    this.baseCurrency = 'USD';
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY;
    this.fallbackRates = {
      'USD': 1,
      'EUR': 0.85,
      'GBP': 0.73,
      'CAD': 1.35,
      'AUD': 1.50,
      'INR': 83.25,
      'JPY': 149.50,
      'CNY': 7.25
    };
  }

  async getExchangeRates() {
    const cacheKey = 'exchange_rates';
    let rates = cache.get(cacheKey);
    
    if (rates) {
      return rates;
    }

    try {
      // Using free exchangerate-api.com service
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${this.baseCurrency}`, {
        timeout: 5000
      });
      
      rates = response.data.rates;
      cache.set(cacheKey, rates);
      return rates;
    } catch (error) {
      console.warn('Failed to fetch exchange rates, using fallback:', error.message);
      return this.fallbackRates;
    }
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, exchangeRate: 1 };
    }

    const rates = await this.getExchangeRates();
    
    // Convert to USD first, then to target currency
    let usdAmount = amount;
    if (fromCurrency !== 'USD') {
      usdAmount = amount / rates[fromCurrency];
    }
    
    let convertedAmount = usdAmount;
    if (toCurrency !== 'USD') {
      convertedAmount = usdAmount * rates[toCurrency];
    }
    
    const exchangeRate = rates[toCurrency] / rates[fromCurrency];
    
    return {
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      exchangeRate: Math.round(exchangeRate * 10000) / 10000
    };
  }

  async getSupportedCurrencies() {
    const rates = await this.getExchangeRates();
    return Object.keys(rates).sort();
  }

  formatCurrency(amount, currency) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }
}

module.exports = new CurrencyService();
