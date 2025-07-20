import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import components
import Navbar from './components/Layout/Navbar';
import { ThemeProvider } from './contexts/ThemeContext';

// Import pages
import Landing from './pages/Landing/Landing';
import Dashboard from './pages/Dashboard/Dashboard';
import Transactions from './pages/Transactions/Transactions';
import Budgets from './pages/Budgets/Budgets';
import Reports from './pages/Reports/Reports';
import AIInsights from './pages/AIInsights/AIInsights';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import CustomTransactions from './pages/CustomTransactions';

// Import global styles
import './styles/globals.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            
            {/* Protected Routes - Now public since authentication was removed */}
            <Route 
              path="/dashboard" 
              element={
                <div className="flex h-screen">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Dashboard />
                    </main>
                  </div>
                </div>
              } 
            />
            <Route 
              path="/transactions" 
              element={
                <div className="flex h-screen">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Transactions />
                    </main>
                  </div>
                </div>
              } 
            />
            <Route 
              path="/budgets" 
              element={
                <div className="flex h-screen">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Budgets />
                    </main>
                  </div>
                </div>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <div className="flex h-screen">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Reports />
                    </main>
                  </div>
                </div>
              } 
            />
            {/* AI Insights route disabled for now */}
            {/* <Route 
              path="/ai-insights" 
              element={
                <div className="flex h-screen">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <AIInsights />
                    </main>
                  </div>
                </div>
              } 
            /> */}
            <Route 
              path="/custom-transactions" 
              element={
                <div className="flex h-screen">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <CustomTransactions />
                    </main>
                  </div>
                </div>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <div className="flex h-screen">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Profile />
                    </main>
                  </div>
                </div>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <div className="flex h-screen">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Settings />
                    </main>
                  </div>
                </div>
              } 
            />
          </Routes>
          
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
