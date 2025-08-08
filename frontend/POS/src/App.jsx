import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { SocketProvider } from './context/SocketContext';
import { POSProvider } from './context/POSContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';

// Components
import Login from './components/auth/Login';
import POSDashboard from './components/dashboard/POSDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SessionManager from './components/auth/SessionManager';
import GlobalToast from './components/ui/GlobalToast';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CurrencyProvider>
          <SocketProvider>
            <POSProvider>
              <CartProvider>
                <OrderProvider>
                <div className="App">
                  <SessionManager />
                  <GlobalToast />
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <POSDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                  <Toaster 
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                      },
                    }}
                  />
                </div>
                </OrderProvider>
              </CartProvider>
            </POSProvider>
          </SocketProvider>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
