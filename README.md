# Personal Finance Dashboard - Microservice Architecture

A comprehensive personal finance management application built with a microservice architecture, featuring React frontend, Node.js backend, MongoDB database, and Docker orchestration with 150+ world currencies support.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │  Nginx Proxy    │
                    │  (Optional)     │
                    │  Port: 80/443   │
                    └─────────────────┘
```

## 🚀 Features

### ✅ **Core Features**
- **Custom Transaction Management**: Add, edit, delete, and categorize transactions
- **Multi-Currency Support**: 150+ world currencies in ascending order (AED → ZWL)
- **Real-time Dashboard**: Interactive charts and financial summaries
- **Budget Tracking**: Set and monitor spending budgets  
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Toggle between themes
- **AI Features Disabled**: Focus on custom data management

### ✅ **Technical Features**
- **Microservice Architecture**: Scalable, maintainable service separation
- **Docker Containerization**: Easy deployment and environment consistency
- **API-First Design**: RESTful API with comprehensive endpoints
- **Data Persistence**: MongoDB with proper indexing and validation
- **Security**: Input validation, error handling, CORS protection
- **Modern Stack**: React 18, Node.js 18, MongoDB 7.0

## 📦 Project Structure

```
capstone-8/
├── frontend/                 # React.js Frontend Service
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Currency utilities & helpers
│   │   ├── contexts/       # React contexts (theme, etc.)
│   │   └── styles/         # CSS styles
│   ├── public/             # Static assets
│   ├── Dockerfile          # Frontend container config
│   └── package.json        # Frontend dependencies
├── backend/                 # Node.js Backend Service
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API route definitions
│   │   ├── middleware/     # Custom middleware
│   │   └── utils/          # Backend utilities
│   ├── Dockerfile          # Backend container config
│   └── package.json        # Backend dependencies
├── mongodb/                # Database Configuration
│   └── init/              # Database initialization scripts
├── nginx/                  # Reverse Proxy Configuration
│   └── nginx.conf         # Nginx configuration
├── docker-compose.yml      # Production orchestration
├── docker-compose.override.yml # Development overrides
├── package.json           # Root package.json for scripts
└── README.md              # This file
```
- **Budget Management**: Create, track, and monitor budgets with real-time alerts
- **Category Management**: Organize transactions with custom categories and subcategories
- **Financial Reports**: Comprehensive reporting with trends and insights

### AI-Powered Features
- **Smart Categorization**: Automatic transaction categorization using Azure OpenAI
- **Financial Insights**: AI-generated spending analysis and recommendations
- **Budget Optimization**: Intelligent suggestions for budget improvements
- **Trend Analysis**: AI-powered financial trend predictions

### Advanced Features
- **Data Import/Export**: CSV import for transactions and full data export
- **Real-time Notifications**: Budget alerts and spending notifications
- **Responsive Design**: Mobile-first design with PWA capabilities
- **Security**: JWT authentication, rate limiting, and comprehensive validation

## 🛠 Technology Stack

### Frontend
- **React.js**: Modern UI library with hooks and functional components
- **Chart.js**: Interactive charts and data visualization
- **Material-UI / Tailwind CSS**: Responsive and modern design system
- **Axios**: HTTP client for API communication
- **React Router**: Client-side routing

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework with comprehensive middleware
- **MongoDB**: NoSQL database with Mongoose ODM
- **Passport.js**: Authentication middleware with OAuth strategies
- **JWT**: Secure token-based authentication

### AI & Cloud Services
- **Azure OpenAI**: GPT-4 integration for financial insights
- **Azure Managed Identity**: Secure service-to-service authentication
- **Winston**: Comprehensive logging system

### DevOps & Security
- **Helmet.js**: Security headers and protection
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data validation with Joi

## 📁 Project Structure

```
capstone-8/
├── backend/                    # Node.js backend application
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   │   └── passport.js    # Authentication strategies
│   │   ├── middleware/        # Custom middleware
│   │   │   ├── auth.js       # Authentication middleware
│   │   │   └── errorHandler.js # Global error handling
│   │   ├── models/           # MongoDB data models
│   │   │   ├── User.js       # User model with authentication
│   │   │   ├── Transaction.js # Transaction model
│   │   │   ├── Category.js   # Category model
│   │   │   └── Budget.js     # Budget model
│   │   ├── routes/           # API route handlers
│   │   │   ├── auth.js       # Authentication routes
│   │   │   ├── transactions.js # Transaction CRUD
│   │   │   ├── budgets.js    # Budget management
│   │   │   ├── categories.js # Category management
│   │   │   ├── ai.js         # AI-powered insights
│   │   │   └── reports.js    # Financial reporting
│   │   ├── services/         # Business logic services
│   │   │   └── azureOpenAI.js # Azure OpenAI integration
│   │   ├── utils/            # Utility functions
│   │   │   └── logger.js     # Winston logging configuration
│   │   └── server.js         # Main application entry point
│   └── package.json          # Backend dependencies
├── frontend/                  # React.js frontend application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   └── App.js           # Main React application
│   └── package.json         # Frontend dependencies
├── docs/                     # Documentation
├── .env.example             # Environment variables template
└── README.md               # Project documentation
## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Azure OpenAI service (optional for AI features)
- Google/GitHub OAuth applications (for social login)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd capstone-8
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration values
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

6. **Start the development servers**
   ```bash
   # Terminal 1 - Backend server
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend server
   cd frontend
   npm start
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api/docs

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/finance-dashboard

# Authentication
JWT_SECRET=your-super-secret-jwt-key
OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Server
PORT=3001
CLIENT_URL=http://localhost:3000
```

### OAuth Setup

1. **Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`

2. **GitHub OAuth**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App
   - Set authorization callback URL: `http://localhost:3001/api/auth/github/callback`

### Azure OpenAI Setup

1. Create an Azure OpenAI resource in Azure Portal
2. Deploy a GPT-4 or GPT-3.5-turbo model
3. Get the endpoint and API key from the resource
4. Configure managed identity for production deployments

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth
- `POST /api/auth/logout` - User logout

### Transaction Endpoints
- `GET /api/transactions` - Get user transactions (with filtering)
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/import` - Import CSV transactions

### Budget Endpoints
- `GET /api/budgets` - Get user budgets
- `POST /api/budgets` - Create new budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget
- `GET /api/budgets/:id/performance` - Get budget performance

### AI Endpoints
- `POST /api/ai/insights` - Get financial insights
- `POST /api/ai/categorize` - Categorize transaction
- `POST /api/ai/budget-optimization` - Get budget suggestions
- `GET /api/ai/health` - Check AI service health

## 🔒 Security Features

- **Authentication**: JWT-based authentication with OAuth support
- **Authorization**: Role-based access control and resource ownership
- **Input Validation**: Comprehensive validation using Joi schemas
- **Rate Limiting**: Protection against API abuse
- **CORS**: Configured cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **Password Hashing**: Bcrypt for secure password storage

## 📈 Performance & Monitoring

- **Logging**: Structured logging with Winston
- **Error Handling**: Comprehensive error management
- **Caching**: Redis caching for improved performance
- **Database Indexing**: Optimized MongoDB queries
- **File Upload**: Secure file handling with size limits

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

## 🚀 Deployment

### Production Deployment

1. **Set production environment variables**
2. **Build frontend for production**
   ```bash
   cd frontend
   npm run build
   ```
3. **Deploy to Azure/AWS/Docker**
4. **Configure managed identity for Azure OpenAI**
5. **Set up monitoring and logging**

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api/docs`

## � Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes and updates.

---

**Built with ❤️ using modern web technologies and AI-powered insights**
- Node.js (v18+)
- MongoDB (local or Atlas)
- Azure account (for AI features)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd capstone-8
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Servers**
   ```bash
   # Backend (port 3001)
   cd backend
   npm run dev
   
   # Frontend (port 3000)
   cd frontend
   npm start
   ```

## 🔐 Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/finance-dashboard
MONGODB_TEST_URI=mongodb://localhost:27017/finance-dashboard-test

# Authentication
JWT_SECRET=your-jwt-secret
OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
OAUTH_GITHUB_CLIENT_ID=your-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=your-github-client-secret

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=your-azure-openai-endpoint
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

## 🏗 Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests
- `npm run build` - Build for production
- `npm start` - Start production server

**Frontend:**
- `npm start` - Start development server
- `npm test` - Run tests
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App

### API Documentation

The API follows RESTful conventions. Key endpoints:

- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user
- `GET /api/transactions` - Get user transactions
- `POST /api/transactions` - Create transaction
- `GET /api/budgets` - Get user budgets
- `POST /api/ai/recommendations` - Get AI insights

## 🚀 Deployment

### Azure Deployment

1. **Install Azure CLI and azd**
   ```bash
   # Install Azure Developer CLI
   winget install microsoft.azd
   ```

2. **Login and Deploy**
   ```bash
   azd auth login
   azd up
   ```

### Manual Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   npm run build
   # Deploy to your hosting platform
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Chart.js for beautiful data visualizations
- Azure OpenAI for AI capabilities
- MongoDB for flexible data storage
- React.js community for excellent documentation
