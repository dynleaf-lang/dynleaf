import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './utils/notify';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { SocketProvider } from './context/SocketContext';
import { POSProvider } from './context/POSContext';
import { ShiftProvider } from './context/ShiftContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';

// Components
import Login from './components/auth/Login';
import POSDashboard from './components/dashboard/POSDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SessionManager from './components/auth/SessionManager';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CurrencyProvider>
          <SocketProvider>
            <POSProvider>
              <ShiftProvider>
              <CartProvider>
                <OrderProvider>
                <div className="App">
                  <SessionManager />
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
                  <Toaster />
                </div>
                </OrderProvider>
              </CartProvider>
              </ShiftProvider>
            </POSProvider>
          </SocketProvider>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
