import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import SocketProvider from './context/SocketContext';
import OrderProvider from './context/OrderContext';
import ChefLogin from './components/auth/ChefLogin';
import KitchenDashboard from './components/dashboard/KitchenDashboard';
import OrderStatusScreen from './components/status/OrderStatusScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <OrderProvider>
          <Router>
            <div className="app">
              <Routes>
                {/* Chef Login Route */}
                <Route path="/login" element={<ChefLogin />} />
                
                {/* Kitchen Dashboard - Protected Route */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute requiredRole="Chef">
                      <KitchenDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Public Order Status Screen for Customers */}
                <Route path="/status" element={<OrderStatusScreen />} />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </Router>
        </OrderProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
